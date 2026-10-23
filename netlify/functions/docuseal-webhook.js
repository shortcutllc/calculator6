/**
 * DocuSeal Webhook Handler — Netlify serverless function.
 *
 * Listens for DocuSeal events (form.completed, form.viewed, etc.)
 * and updates local DB + sends Slack notifications.
 *
 * Endpoint: POST /.netlify/functions/docuseal-webhook
 * Configure in DocuSeal Dashboard → Settings → Webhooks
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

async function notifyEventOps(text, blocks) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL_EVENT_OPS;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks })
    });
  } catch (err) {
    console.error('Slack notification failed (non-fatal):', err.message);
  }
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();

  // Verify webhook signature (HMAC-SHA256)
  const webhookSecret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers.get('x-docuseal-signature');
    if (signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSig) {
        console.error('DocuSeal webhook signature verification failed');
        return new Response('Invalid signature', { status: 400 });
      }
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventType = payload.event_type;
  const submissionData = payload.data;

  if (!eventType || !submissionData) {
    console.log('Unrecognized webhook payload:', JSON.stringify(payload).slice(0, 500));
    return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase config');
    return new Response('Server misconfigured', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find agreement by docuseal_submission_id
  const submissionId = submissionData.submission_id || submissionData.id;
  const { data: agreement, error: findError } = await supabase
    .from('pro_agreements')
    .select('id, pro_name, pro_email, status')
    .eq('docuseal_submission_id', submissionId)
    .single();

  if (findError || !agreement) {
    console.log('Agreement not found for submission:', submissionId);
    // Return 200 so DocuSeal doesn't retry
    return new Response(JSON.stringify({ received: true, matched: false }), { status: 200 });
  }

  // Handle completion events
  if (eventType === 'form.completed' || eventType === 'submission.completed') {
    const submitter = submissionData.submitters?.[0] || submissionData;

    const updateData = {
      status: 'completed',
      completed_at: submitter.completed_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Get signed document URLs
    const documents = submissionData.documents || submitter.documents;
    if (Array.isArray(documents) && documents.length > 0) {
      updateData.documents_url = documents[0].url;
      updateData.all_documents_urls = documents.map(doc => ({
        name: doc.name || doc.filename || 'Document',
        url: doc.url
      }));
    }

    const { error: updateError } = await supabase
      .from('pro_agreements')
      .update(updateData)
      .eq('id', agreement.id);

    if (updateError) {
      console.error('Failed to update agreement status:', updateError);
    }

    // Slack notification (event_ops channel)
    await notifyEventOps(`✅ Agreement Signed: ${agreement.pro_name}`, [
      { type: 'header', text: { type: 'plain_text', text: '✅ Pro Agreement Signed!' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Pro:* ${agreement.pro_name}` },
          { type: 'mrkdwn', text: `*Email:* ${agreement.pro_email}` },
          { type: 'mrkdwn', text: `*Status:* Completed` }
        ]
      }
    ]);
  }

  // Handle viewed events
  if (eventType === 'form.viewed' || eventType === 'submission.viewed') {
    // Only upgrade from 'sent' — don't downgrade from 'completed' or 'opened'.
    // Slack notification is gated on this same transition so reopens by the
    // pro don't spam the channel — one ping per agreement.
    if (agreement.status === 'sent') {
      await supabase
        .from('pro_agreements')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', agreement.id);

      await notifyEventOps(`👁️ Agreement Viewed: ${agreement.pro_name}`, [
        { type: 'header', text: { type: 'plain_text', text: '👁️ Pro Agreement Viewed' } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Pro:* ${agreement.pro_name}` },
            { type: 'mrkdwn', text: `*Email:* ${agreement.pro_email}` },
            { type: 'mrkdwn', text: `*Status:* Opened` }
          ]
        }
      ]);
    }
  }

  // Always return 200 to acknowledge receipt
  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
