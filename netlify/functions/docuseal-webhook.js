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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Verify webhook signature (HMAC-SHA256)
  const webhookSecret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = event.headers['x-docuseal-signature'];
    if (signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(event.body)
        .digest('hex');

      if (signature !== expectedSig) {
        console.error('DocuSeal webhook signature verification failed');
        return { statusCode: 400, body: 'Invalid signature' };
      }
    }
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const eventType = payload.event_type;
  const submissionData = payload.data;

  if (!eventType || !submissionData) {
    console.log('Unrecognized webhook payload:', JSON.stringify(payload).slice(0, 500));
    return { statusCode: 200, body: JSON.stringify({ received: true, skipped: true }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase config');
    return { statusCode: 500, body: 'Server misconfigured' };
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
    return { statusCode: 200, body: JSON.stringify({ received: true, matched: false }) };
  }

  // Handle completion events
  if (eventType === 'form.completed' || eventType === 'submission.completed') {
    const submitter = submissionData.submitters?.[0] || submissionData;

    const updateData = {
      status: 'completed',
      completed_at: submitter.completed_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Get signed document URL
    const documents = submissionData.documents || submitter.documents;
    if (Array.isArray(documents) && documents.length > 0) {
      updateData.documents_url = documents[0].url;
    }

    const { error: updateError } = await supabase
      .from('pro_agreements')
      .update(updateData)
      .eq('id', agreement.id);

    if (updateError) {
      console.error('Failed to update agreement status:', updateError);
    }

    // Slack notification
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `✅ Agreement Signed: ${agreement.pro_name}`,
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: '✅ Pro Agreement Signed!' } },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Pro:* ${agreement.pro_name}` },
                  { type: 'mrkdwn', text: `*Email:* ${agreement.pro_email}` },
                  { type: 'mrkdwn', text: `*Status:* Completed` }
                ]
              }
            ]
          })
        });
      } catch (err) {
        console.error('Slack notification failed (non-fatal):', err.message);
      }
    }
  }

  // Handle viewed events
  if (eventType === 'form.viewed' || eventType === 'submission.viewed') {
    // Only upgrade from 'sent' — don't downgrade from 'completed' or 'opened'
    if (agreement.status === 'sent') {
      await supabase
        .from('pro_agreements')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', agreement.id);
    }
  }

  // Always return 200 to acknowledge receipt
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
