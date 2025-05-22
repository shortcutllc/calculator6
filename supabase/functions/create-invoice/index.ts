/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

// @deno-types="npm:@types/stripe@13.7.0"
import Stripe from "npm:stripe@13.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  backoff = INITIAL_BACKOFF
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Operation failed (${MAX_RETRIES - retries + 1}/${MAX_RETRIES} attempts):`, error);
    
    if (retries === 0) throw error;
    
    console.log(`Retrying in ${backoff}ms...`);
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    return retryWithBackoff(
      operation,
      retries - 1,
      backoff * 2
    );
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      throw new Error('Server configuration error: Missing Stripe key');
    }

    // Log request information
    console.log('Received request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const requestData = await req.json();
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    const { proposalData, customerId } = requestData;

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    if (!proposalData || !proposalData.services) {
      throw new Error('Invalid proposal data: services are required');
    }

    // Initialize Stripe with explicit fetch configuration and increased retries
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 5,
      timeout: 30000,
    });

    // Create line items from proposal data
    const lineItems = [];
    
    // Add services from each location
    Object.entries(proposalData.services).forEach(([location, locationData]: [string, any]) => {
      Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
        dateData.services.forEach((service: any) => {
          lineItems.push({
            description: `${service.serviceType} at ${location} on ${date}`,
            amount: Math.round(service.serviceCost * 100), // Convert to cents
            quantity: 1,
          });
        });
      });
    });

    if (lineItems.length === 0) {
      throw new Error('No services found in proposal data');
    }

    console.log('Creating invoice with line items:', lineItems);

    // Create and finalize invoice with retry logic
    const invoice = await retryWithBackoff(async () => {
      try {
        console.log('Creating invoice for customer:', customerId);
        const inv = await stripe.invoices.create({
          customer: customerId,
          collection_method: 'send_invoice',
          days_until_due: 30,
          metadata: {
            proposalId: proposalData.id,
          },
        });

        // Add line items to the invoice
        console.log('Adding line items to invoice:', inv.id);
        for (const item of lineItems) {
          await stripe.invoiceItems.create({
            customer: inv.customer,
            invoice: inv.id,
            description: item.description,
            amount: item.amount,
            currency: 'usd',
          });
        }

        // Send the invoice
        console.log('Sending invoice:', inv.id);
        return await stripe.invoices.sendInvoice(inv.id);
      } catch (stripeError) {
        console.error('Stripe API Error:', {
          type: stripeError.type,
          message: stripeError.message,
          code: stripeError.code,
          decline_code: stripeError.decline_code,
        });
        throw new Error(`Stripe operation failed: ${stripeError.message}`);
      }
    });

    const response = {
      invoiceId: invoice.id,
      invoiceUrl: invoice.hosted_invoice_url
    };

    console.log('Invoice created successfully:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-invoice function:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while creating the invoice';

    const errorResponse = {
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});