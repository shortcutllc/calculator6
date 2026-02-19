/**
 * Create Stripe Invoice — Netlify serverless function.
 *
 * POST                    → Create customer + invoice from proposal data
 * POST ?action=sync       → Sync invoice status from Stripe to DB
 *
 * Auth: Supabase JWT in Authorization header (Bearer token)
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// --- CORS ---

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function errorResponse(statusCode, message, code) {
  return jsonResponse(statusCode, { success: false, error: message, code });
}

// --- Auth ---

async function validateAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Authorization required', code: 'AUTH_MISSING' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw { statusCode: 500, message: 'Server misconfigured', code: 'CONFIG_ERROR' };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw { statusCode: 401, message: 'Invalid or expired token', code: 'AUTH_INVALID' };
  }

  return { user, supabase };
}

// --- Helpers ---

const SERVICE_DISPLAY_NAMES = {
  massage: 'Chair Massage',
  facial: 'Facial',
  hair: 'Hair Services',
  nails: 'Nail Services',
  makeup: 'Makeup Services',
  headshot: 'Corporate Headshots',
  'hair-makeup': 'Hair + Makeup',
  'headshot-hair-makeup': 'Hair + Makeup for Headshots',
  mindfulness: 'Mindfulness Session',
  'mindfulness-soles': 'Mindfulness: Soles of the Feet',
  'mindfulness-movement': 'Mindfulness: Movement & Stillness',
  'mindfulness-pro': 'Mindfulness: PRO Practice',
  'mindfulness-cle': 'CLE Ethics: Mindfulness',
  'mindfulness-pro-reactivity': 'Mindfulness: Stepping Out of Reactivity'
};

function formatServiceName(serviceType) {
  return SERVICE_DISPLAY_NAMES[serviceType] ||
    serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'TBD') return dateStr || 'TBD';
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Build Stripe line items from proposal services.
 * Respects pricing options: uses selected option's serviceCost when available.
 */
function buildLineItems(proposalData, pricingOptions, selectedOptions) {
  const lineItems = [];
  const services = proposalData.services || {};

  Object.entries(services).forEach(([location, locationData]) => {
    Object.entries(locationData).forEach(([date, dateData]) => {
      const serviceList = dateData.services || [];

      serviceList.forEach((service, serviceIndex) => {
        // Determine effective cost: check pricing options first
        let effectiveCost = service.serviceCost || 0;

        if (pricingOptions && selectedOptions) {
          const optionKey = `${location}-${date}-${serviceIndex}`;
          const options = pricingOptions[optionKey];
          const selectedIdx = selectedOptions[optionKey];

          if (options && selectedIdx !== undefined && options[selectedIdx]) {
            const selectedOption = options[selectedIdx];
            if (selectedOption.serviceCost != null) {
              effectiveCost = selectedOption.serviceCost;
            }
          }
        }

        const description = `${formatServiceName(service.serviceType)} at ${location} on ${formatDate(date)}`;

        lineItems.push({
          description,
          amount: Math.round(effectiveCost * 100), // cents
          quantity: 1
        });
      });
    });
  });

  return lineItems;
}

// --- Handlers ---

async function handleCreateInvoice(body, stripe, supabase, user) {
  const { proposalId, proposalData, pricingOptions, selectedOptions, clientEmail, clientName, daysUntilDue } = body;

  const resolvedName = clientName || proposalData?.clientName;
  if (!resolvedName) {
    return errorResponse(400, 'Client name is required', 'VALIDATION_ERROR');
  }
  if (!clientEmail) {
    return errorResponse(400, 'Client email is required to send an invoice', 'VALIDATION_ERROR');
  }

  // Step 1: Create Stripe customer
  const customerParams = {
    name: resolvedName,
    email: clientEmail,
    metadata: { proposalId: proposalId || 'unknown' }
  };

  const customer = await stripe.customers.create(customerParams);

  // Step 2: Use pre-built line items if provided, otherwise build from proposal data
  let lineItems;
  if (body.lineItems && Array.isArray(body.lineItems) && body.lineItems.length > 0) {
    lineItems = body.lineItems.map(item => ({
      description: item.description || 'Line item',
      amount: Math.round((item.amount || 0) * 100), // dollars → cents
      quantity: 1
    }));
  } else {
    if (!proposalData?.services) {
      return errorResponse(400, 'proposalData.services is required', 'VALIDATION_ERROR');
    }
    lineItems = buildLineItems(proposalData, pricingOptions, selectedOptions);
  }

  if (lineItems.length === 0) {
    return errorResponse(400, 'No line items to invoice', 'VALIDATION_ERROR');
  }

  const totalCents = lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Step 3: Create invoice
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: daysUntilDue || 30,
    metadata: { proposalId: proposalId || 'unknown' }
  });

  // Step 4: Add line items
  for (const item of lineItems) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      description: item.description,
      amount: item.amount,
      currency: 'usd'
    });
  }

  // Step 5: Finalize and send
  const sentInvoice = await stripe.invoices.sendInvoice(invoice.id);

  // Step 6: Persist to stripe_invoices table
  const { error: insertError } = await supabase
    .from('stripe_invoices')
    .insert({
      proposal_id: proposalId || null,
      stripe_invoice_id: sentInvoice.id,
      stripe_customer_id: customer.id,
      invoice_url: sentInvoice.hosted_invoice_url,
      status: sentInvoice.status || 'sent',
      amount_cents: totalCents,
      client_name: resolvedName,
      created_by_user_id: user.id
    });

  if (insertError) {
    console.error('Failed to save invoice record:', insertError);
    // Non-fatal: invoice was created in Stripe
  }

  // Step 7: Update proposal with stripe_invoice_id
  if (proposalId) {
    const { error: updateError } = await supabase
      .from('proposals')
      .update({ stripe_invoice_id: sentInvoice.id })
      .eq('id', proposalId);

    if (updateError) {
      console.error('Failed to update proposal stripe_invoice_id:', updateError);
    }
  }

  return jsonResponse(200, {
    success: true,
    invoiceId: sentInvoice.id,
    invoiceUrl: sentInvoice.hosted_invoice_url,
    amountCents: totalCents,
    customerId: customer.id,
    status: sentInvoice.status || 'sent'
  });
}

async function handleSyncStatus(body, stripe, supabase) {
  const { stripeInvoiceId } = body;

  if (!stripeInvoiceId) {
    return errorResponse(400, 'stripeInvoiceId is required', 'VALIDATION_ERROR');
  }

  const invoice = await stripe.invoices.retrieve(stripeInvoiceId);

  const { error } = await supabase
    .from('stripe_invoices')
    .update({ status: invoice.status, updated_at: new Date().toISOString() })
    .eq('stripe_invoice_id', stripeInvoiceId);

  if (error) {
    console.error('Failed to update invoice status:', error);
    return errorResponse(500, 'Failed to update status in database', 'DB_ERROR');
  }

  return jsonResponse(200, {
    success: true,
    status: invoice.status,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid
  });
}

// --- Main Handler ---

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  try {
    const { user, supabase } = await validateAuth(event);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return errorResponse(500, 'Stripe not configured', 'CONFIG_ERROR');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      maxNetworkRetries: 3
    });

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');
    }

    const params = event.queryStringParameters || {};

    if (params.action === 'sync') {
      return await handleSyncStatus(body, stripe, supabase);
    }

    return await handleCreateInvoice(body, stripe, supabase, user);
  } catch (err) {
    if (err.statusCode && err.code) {
      return errorResponse(err.statusCode, err.message, err.code);
    }
    console.error('create-stripe-invoice error:', err);
    return errorResponse(500, err.message || 'Internal server error', 'INTERNAL_ERROR');
  }
};
