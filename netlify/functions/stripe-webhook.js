/**
 * Stripe Webhook Handler — Netlify serverless function.
 *
 * Listens for Stripe events (invoice.paid, etc.) and updates
 * local DB + sends Slack notifications.
 *
 * Endpoint: POST /.netlify/functions/stripe-webhook
 * Configure in Stripe Dashboard → Webhooks → Add endpoint
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return new Response('Server misconfigured', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

  // Verify webhook signature against the exact bytes Stripe sent
  const sig = req.headers.get('stripe-signature');
  const rawBody = Buffer.from(await req.arrayBuffer());
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle invoice.paid event
  if (stripeEvent.type === 'invoice.paid') {
    const invoice = stripeEvent.data.object;
    const stripeInvoiceId = invoice.id;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase config');
      return new Response('Server misconfigured', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Update invoice status in DB
    const { data: invoiceRecord, error: updateError } = await supabase
      .from('stripe_invoices')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('stripe_invoice_id', stripeInvoiceId)
      .select('client_name, amount_cents, invoice_url, proposal_id')
      .single();

    if (updateError) {
      console.error('Failed to update invoice status:', updateError);
      // Don't fail the webhook — Stripe will retry
    }

    // Send Slack notification
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
    if (slackWebhookUrl && invoiceRecord) {
      const amount = `$${(invoiceRecord.amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const fields = [
        { type: 'mrkdwn', text: `*Client:* ${invoiceRecord.client_name || 'Unknown'}` },
        { type: 'mrkdwn', text: `*Amount:* ${amount}` }
      ];
      if (invoiceRecord.invoice_url) {
        fields.push({ type: 'mrkdwn', text: `*Invoice:* <${invoiceRecord.invoice_url}|View Invoice>` });
      }
      if (invoiceRecord.proposal_id) {
        fields.push({ type: 'mrkdwn', text: `*Proposal:* <https://proposals.getshortcut.co/proposal/${invoiceRecord.proposal_id}|View Proposal>` });
      }

      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `💰 Invoice Paid: ${invoiceRecord.client_name || 'Unknown Client'}`,
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: '💰 Invoice Paid!' } },
              { type: 'section', fields }
            ]
          })
        });
      } catch (err) {
        console.error('Slack notification failed (non-fatal):', err.message);
      }
    }
  }

  // Always return 200 to acknowledge receipt
  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
