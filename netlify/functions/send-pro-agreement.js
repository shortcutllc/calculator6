/**
 * Send Pro Agreement — Netlify serverless function.
 *
 * POST                  → Create DocuSeal submission, send signing email via SendGrid, save to DB
 * POST ?action=sync     → Fetch submission status from DocuSeal, update DB
 * POST ?action=resend   → Re-send the signing email for an existing agreement
 *
 * Auth: Supabase JWT in Authorization header (Bearer token)
 */

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

// --- Email Templates ---

function getSigningEmailHtml(proName, signingUrl, templateName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #09364f 0%, #0a4a6b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">${templateName}</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">from Shortcut Wellness</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="margin-top: 0;">Hello ${proName},</h2>
          <p>We are excited to work with you! Please review and sign your <strong>${templateName}</strong> to get started.</p>
          <p>Click the button below to review and electronically sign the document:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signingUrl}" style="display: inline-block; background: #09364f; color: #9EFAFF; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
              Review & Sign Document
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; font-size: 13px; color: #0a4a6b;">${signingUrl}</p>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
          <p>Shortcut Wellness | ops@getshortcut.co</p>
          <p>This document was sent securely via DocuSeal.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getSigningEmailText(proName, signingUrl, templateName) {
  return `
Hello ${proName},

We are excited to work with you! Please review and sign your ${templateName} to get started.

Review and sign your document here: ${signingUrl}

If you have any questions, please contact us at ops@getshortcut.co.

Shortcut Wellness
  `.trim();
}

// --- Slack Notification ---

async function notifySlack(text, blocks) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
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

// --- SendGrid Email ---

async function sendEmailViaSendGrid({ to, subject, html, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error('SENDGRID_API_KEY not configured');
    return;
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: process.env.FROM_EMAIL || 'hello@getshortcut.co',
        name: 'Shortcut Wellness'
      },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('SendGrid error:', response.status, errorText);
    throw new Error(`SendGrid failed: ${response.status}`);
  }
}

// --- Handlers ---

async function handleSendAgreement(body, supabase, user) {
  const { templateId, proName, proEmail, sendToClient = true } = body;

  if (!templateId || !proName) {
    return errorResponse(400, 'templateId and proName are required', 'VALIDATION_ERROR');
  }
  if (sendToClient && !proEmail) {
    return errorResponse(400, 'proEmail is required when sending to Pro', 'VALIDATION_ERROR');
  }

  const docusealApiKey = process.env.DOCUSEAL_API_KEY;
  if (!docusealApiKey) {
    return errorResponse(500, 'DocuSeal not configured', 'CONFIG_ERROR');
  }

  // 1. Fetch template
  const { data: template, error: tplError } = await supabase
    .from('pro_agreement_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (tplError || !template) {
    return errorResponse(404, 'Template not found', 'NOT_FOUND');
  }

  // 2. Create DocuSeal submission (send_email: false — we use SendGrid)
  const docusealResponse = await fetch('https://docuseal-production-f0ef.up.railway.app/api/submissions', {
    method: 'POST',
    headers: {
      'X-Auth-Token': docusealApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template_id: template.docuseal_template_id,
      send_email: false,
      submitters: [
        {
          role: 'First Party',
          name: proName,
          email: proEmail || 'placeholder@getshortcut.co'
        }
      ]
    })
  });

  if (!docusealResponse.ok) {
    const errorText = await docusealResponse.text();
    console.error('DocuSeal API error:', errorText);
    return errorResponse(502, 'Failed to create DocuSeal submission', 'DOCUSEAL_ERROR');
  }

  const submissionData = await docusealResponse.json();
  const submitter = Array.isArray(submissionData) ? submissionData[0] : submissionData;
  const submissionId = submitter.submission_id;
  const signingSlug = submitter.slug;
  const signingUrl = `https://proposals.getshortcut.co/sign/${signingSlug}`;
  const docusealSigningUrl = submitter.embed_src || `https://docuseal-production-f0ef.up.railway.app/s/${signingSlug}`;

  // 3. Insert DB row
  const { data: agreement, error: insertError } = await supabase
    .from('pro_agreements')
    .insert({
      template_id: templateId,
      pro_name: proName,
      pro_email: proEmail || '',
      status: sendToClient ? 'sent' : 'pending',
      docuseal_submission_id: submissionId,
      signing_slug: signingSlug,
      signing_url: docusealSigningUrl,
      sent_at: sendToClient ? new Date().toISOString() : null,
      created_by_user_id: user.id
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to save agreement:', insertError);
  }

  // 4. Send email via SendGrid (if sending to client)
  if (sendToClient && proEmail) {
    try {
      await sendEmailViaSendGrid({
        to: proEmail,
        subject: `Action Required: Please sign your ${template.name}`,
        html: getSigningEmailHtml(proName, signingUrl, template.name),
        text: getSigningEmailText(proName, signingUrl, template.name)
      });
    } catch (err) {
      console.error('Email send failed:', err.message);
      // Non-fatal — agreement was created, admin can resend
    }

    // 5. Slack notification
    await notifySlack(`📝 Agreement Sent: ${proName}`, [
      { type: 'header', text: { type: 'plain_text', text: '📝 Pro Agreement Sent' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Pro:* ${proName}` },
          { type: 'mrkdwn', text: `*Email:* ${proEmail}` },
          { type: 'mrkdwn', text: `*Document:* ${template.name}` },
          { type: 'mrkdwn', text: `*Link:* <${signingUrl}|View>` }
        ]
      }
    ]);
  }

  return jsonResponse(200, {
    success: true,
    agreementId: agreement?.id,
    submissionId,
    signingSlug,
    signingUrl,
    sentToClient: sendToClient
  });
}

async function handleSyncStatus(body, supabase) {
  const { agreementId } = body;
  if (!agreementId) {
    return errorResponse(400, 'agreementId is required', 'VALIDATION_ERROR');
  }

  const docusealApiKey = process.env.DOCUSEAL_API_KEY;
  if (!docusealApiKey) {
    return errorResponse(500, 'DocuSeal not configured', 'CONFIG_ERROR');
  }

  const { data: agreement, error } = await supabase
    .from('pro_agreements')
    .select('docuseal_submission_id')
    .eq('id', agreementId)
    .single();

  if (error || !agreement) {
    return errorResponse(404, 'Agreement not found', 'NOT_FOUND');
  }

  const response = await fetch(
    `https://docuseal-production-f0ef.up.railway.app/api/submissions/${agreement.docuseal_submission_id}`,
    { headers: { 'X-Auth-Token': docusealApiKey } }
  );

  if (!response.ok) {
    return errorResponse(502, 'Failed to fetch DocuSeal status', 'DOCUSEAL_ERROR');
  }

  const submission = await response.json();
  const submitters = submission.submitters || [];
  const submitter = submitters[0];
  const docusealStatus = submitter?.status || submission.status || 'pending';

  const updateData = {
    status: docusealStatus,
    updated_at: new Date().toISOString()
  };

  if (docusealStatus === 'completed' && submitter?.completed_at) {
    updateData.completed_at = submitter.completed_at;
  }
  if (docusealStatus === 'opened' && submitter?.opened_at) {
    updateData.opened_at = submitter.opened_at;
  }

  // Get signed documents URL
  const documents = submission.documents || submitter?.documents;
  if (Array.isArray(documents) && documents.length > 0) {
    updateData.documents_url = documents[0].url;
  }

  await supabase
    .from('pro_agreements')
    .update(updateData)
    .eq('id', agreementId);

  return jsonResponse(200, { success: true, status: docusealStatus });
}

async function handleResendEmail(body, supabase) {
  const { agreementId } = body;
  if (!agreementId) {
    return errorResponse(400, 'agreementId is required', 'VALIDATION_ERROR');
  }

  const { data: agreement, error } = await supabase
    .from('pro_agreements')
    .select('*, pro_agreement_templates(name)')
    .eq('id', agreementId)
    .single();

  if (error || !agreement) {
    return errorResponse(404, 'Agreement not found', 'NOT_FOUND');
  }

  if (!agreement.pro_email) {
    return errorResponse(400, 'No email address on this agreement', 'VALIDATION_ERROR');
  }

  const signingUrl = `https://proposals.getshortcut.co/sign/${agreement.signing_slug}`;
  const templateName = agreement.pro_agreement_templates?.name || 'Agreement';

  await sendEmailViaSendGrid({
    to: agreement.pro_email,
    subject: `Reminder: Please sign your ${templateName}`,
    html: getSigningEmailHtml(agreement.pro_name, signingUrl, templateName),
    text: getSigningEmailText(agreement.pro_name, signingUrl, templateName)
  });

  // Update status to sent if still pending
  if (agreement.status === 'pending') {
    await supabase
      .from('pro_agreements')
      .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', agreementId);
  }

  return jsonResponse(200, { success: true });
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

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return errorResponse(400, 'Invalid JSON body', 'VALIDATION_ERROR');
    }

    const params = event.queryStringParameters || {};

    if (params.action === 'sync') {
      return await handleSyncStatus(body, supabase);
    }

    if (params.action === 'resend') {
      return await handleResendEmail(body, supabase);
    }

    return await handleSendAgreement(body, supabase, user);
  } catch (err) {
    if (err.statusCode && err.code) {
      return errorResponse(err.statusCode, err.message, err.code);
    }
    console.error('send-pro-agreement error:', err);
    return errorResponse(500, err.message || 'Internal server error', 'INTERNAL_ERROR');
  }
};
