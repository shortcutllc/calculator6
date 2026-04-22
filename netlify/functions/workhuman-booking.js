/**
 * workhuman-booking.js — handle Workhuman Recharge landing page form submissions.
 *
 * 1. Upsert/update workhuman_leads row
 * 2. Send plain-text confirmation email from the sender who last messaged the
 *    lead in the CRM (falls back to Will if no outreach log entry)
 * 3. Post Slack notification for internal team coordination
 *
 * Public endpoint (no auth) — called from the landing page.
 */

import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Map CRM sender_name → email alias
const SENDER_EMAILS = {
  'Will Newton': 'will@getshortcut.co',
  'Jaimie Pritchard': 'jaimie@getshortcut.co',
  'Marc Levitan': 'marc@getshortcut.co',
  'Caren Skutch': 'caren@getshortcut.co',
};
const DEFAULT_SENDER_NAME = 'Will Newton';
const DEFAULT_SENDER_EMAIL = 'will@getshortcut.co';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function findLastOutreachSender(supabase, leadId) {
  if (!leadId) return null;
  const { data } = await supabase
    .from('lead_outreach_log')
    .select('sender_name')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(1);
  return data?.[0]?.sender_name || null;
}

/**
 * Pick the sender for the confirmation email.
 * Priority:
 *   1. lead.assigned_to — the teammate who owns this Tier 1A lead
 *   2. Last person who DMed/emailed them in lead_outreach_log
 *   3. Will Newton (fallback)
 * Always returns a { name, email, source } object; never null.
 */
async function pickSender(supabase, leadId, assignedTo) {
  if (assignedTo && SENDER_EMAILS[assignedTo]) {
    return { name: assignedTo, email: SENDER_EMAILS[assignedTo], source: 'assigned_to' };
  }
  const lastSender = await findLastOutreachSender(supabase, leadId);
  if (lastSender && SENDER_EMAILS[lastSender]) {
    return { name: lastSender, email: SENDER_EMAILS[lastSender], source: 'outreach_log' };
  }
  return { name: DEFAULT_SENDER_NAME, email: DEFAULT_SENDER_EMAIL, source: 'default' };
}

function buildEmail({ firstName, company, senderName }) {
  const firstNameClean = firstName?.trim() || 'there';
  const companyClean = company?.trim() || 'your team';
  const senderFirst = (senderName || DEFAULT_SENDER_NAME).split(' ')[0];

  const text = `Hey ${firstNameClean},

${senderFirst} from Shortcut. Thanks for reserving a spot at our massage lounge — we've got the ${companyClean} team covered.

Workhuman opens up official booking Sunday, so I'll lock in your exact time then and send you a confirmation that same day.

Looking forward to meeting you at the Gratitude Garden. If you want to grab 10 minutes after your session to talk wellness at ${companyClean}, just reply — happy to set it up.

See you in Orlando.

— ${senderFirst}
Shortcut | getshortcut.co`;

  return {
    subject: `Your massage spot at Workhuman — ${senderFirst} from Shortcut`,
    text,
  };
}

async function sendEmail({ to, fromName, fromEmail, subject, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not configured — skipping email');
    return { sent: false, reason: 'no_api_key' };
  }

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      reply_to: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('SendGrid error:', resp.status, err);
    return { sent: false, reason: 'sendgrid_error', status: resp.status };
  }

  return { sent: true };
}

async function postSlack({ name, firstName, company, email, phone, title, employeeCount, preferredDay, currentWellness, openToChat, landingPageUrl, leadId, dbError }) {
  const webhook = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
  if (!webhook) {
    console.warn('SLACK_WEBHOOK_URL_PROPOSALS not configured — skipping slack');
    return { posted: false };
  }

  const crmUrl = 'https://proposals.getshortcut.co/workhuman-leads';
  const chatIcon = openToChat ? '✅' : '⚪';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: dbError
          ? '⚠️ Workhuman booking — DB write FAILED'
          : '🌿 New Workhuman massage booking',
        emoji: true,
      },
    },
    ...(dbError ? [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*⚠ Silent failure — backfill required.* The booking did NOT write to the CRM. Slack + confirmation email still fired.\n*DB op:* ${dbError.op} · *code:* ${dbError.code || 'n/a'}\n*Message:* ${dbError.message || 'unknown'}${dbError.details ? `\n*Details:* ${dbError.details}` : ''}`,
      },
    }] : []),
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Name:*\n${name}` },
        { type: 'mrkdwn', text: `*Company:*\n${company || '—'}` },
        { type: 'mrkdwn', text: `*Title:*\n${title || '—'}` },
        { type: 'mrkdwn', text: `*Employees:*\n${employeeCount || '—'}` },
        { type: 'mrkdwn', text: `*Preferred:*\n${preferredDay || '—'}` },
        { type: 'mrkdwn', text: `*Open to chat:*\n${chatIcon}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Email:* ${email}${phone ? `\n*Phone:* ${phone}` : ''}\n*Current wellness program:* ${currentWellness || '—'}` },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `<${crmUrl}|Open CRM>${landingPageUrl ? ` · <${landingPageUrl}|Their landing page>` : ''}` },
      ],
    },
  ];

  const resp = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks, text: `New Workhuman booking: ${name} @ ${company}` }),
  });

  if (!resp.ok) {
    console.error('Slack webhook error:', resp.status, await resp.text());
    return { posted: false };
  }
  return { posted: true };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      firstName, lastName, email, phone, company, title, employeeCount,
      currentWellness, preferredDay, openToChat, landingPageId, leadId: leadIdFromUrl,
    } = body;

    if (!firstName || !lastName || !email) {
      return json(400, { error: 'firstName, lastName, email required' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase env vars');
      return json(500, { error: 'Server misconfigured' });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const name = `${firstName} ${lastName}`.trim();

    // Look up the lead. Prefer UUID from the landing page URL (trusted source
    // of truth for WHICH lead is booking) and fall back to email match.
    // This guarantees the right assignee owns the confirmation email even
    // when the form email differs from the stored lead email.
    let existing = null;
    if (leadIdFromUrl && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadIdFromUrl)) {
      const { data } = await supabase
        .from('workhuman_leads')
        .select('id, landing_page_url, landing_page_id, assigned_to, email')
        .eq('id', leadIdFromUrl)
        .maybeSingle();
      if (data) existing = data;
    }
    if (!existing) {
      const { data } = await supabase
        .from('workhuman_leads')
        .select('id, landing_page_url, landing_page_id, assigned_to, email')
        .eq('email', email)
        .maybeSingle();
      if (data) existing = data;
    }

    // Map day string → vip_slot_day for CRM column (day_1 / day_2 / day_3)
    const dayMap = {
      'Mon Apr 27': 'day_1',
      'Tue Apr 28': 'day_2',
      'Wed Apr 29': 'day_3',
    };
    let vipSlotDay = null;
    for (const [prefix, v] of Object.entries(dayMap)) {
      if (preferredDay && preferredDay.startsWith(prefix)) { vipSlotDay = v; break; }
    }

    const notes = [
      `Booked via landing page.`,
      `Preferred: ${preferredDay || 'n/a'}.`,
      `Open to 10-min chat: ${openToChat ? 'yes' : 'no'}.`,
      `Current wellness program: ${currentWellness || 'n/a'}.`,
      `Employee count: ${employeeCount || 'n/a'}.`,
    ].join(' ');

    // Mark the lead as vip_booked. If we found them (by UUID or email), UPDATE
    // by id so we don't duplicate rows when the form email differs from the
    // stored lead email. Only upsert by email when we have no existing match.
    // Normalize phone: trim, drop obvious junk. Keep raw formatting — we
    // don't want to silently rewrite what the user typed.
    const phoneClean = (phone || '').trim() || null;

    const mutationPayload = {
      name,
      email,
      company: company || null,
      title: title || null,
      company_size: employeeCount || null,
      outreach_status: 'vip_booked',
      vip_slot_day: vipSlotDay,
      notes,
    };
    // Only touch phone fields if the user supplied one — otherwise we'd
    // overwrite an Apollo-enriched number with null.
    if (phoneClean) {
      mutationPayload.phone = phoneClean;
      mutationPayload.mobile_phone = phoneClean; // self-reported is most likely their cell
      mutationPayload.phone_source = 'self_reported';
      mutationPayload.phone_enriched_at = new Date().toISOString();
    }

    let leadId = existing?.id || null;
    // Capture any DB error so we can (a) surface it in Slack to avoid silent
    // data loss, and (b) return it to the caller so they know the submission
    // was only partially processed.
    let dbError = null;
    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('workhuman_leads')
        .update(mutationPayload)
        .eq('id', existing.id);
      if (updateErr) {
        console.error('[workhuman-booking] Lead update error:', JSON.stringify(updateErr));
        dbError = { op: 'update', id: existing.id, message: updateErr.message, code: updateErr.code, details: updateErr.details };
      }
    } else {
      const { data: upserted, error: upsertErr } = await supabase
        .from('workhuman_leads')
        .upsert(mutationPayload, { onConflict: 'email' })
        .select('id')
        .maybeSingle();
      if (upsertErr) {
        console.error('[workhuman-booking] Lead upsert error:', JSON.stringify(upsertErr));
        dbError = { op: 'upsert', email, message: upsertErr.message, code: upsertErr.code, details: upsertErr.details };
      } else if (upserted?.id) {
        leadId = upserted.id;
      } else {
        // Upsert returned success but no row — unusual, flag it
        console.error('[workhuman-booking] Upsert returned no row for email', email);
        dbError = { op: 'upsert', email, message: 'upsert returned no row', code: 'EMPTY_RESULT' };
      }
    }

    // Determine sender: assigned_to wins > last outreach sender > Will default.
    // This guarantees teammates see confirmation emails come from their own
    // account for every Tier 1A lead they own, even before they've DMed.
    const sender = await pickSender(supabase, leadId, existing?.assigned_to);
    const senderName = sender.name;
    const fromEmail = sender.email;
    console.log(`[workhuman-booking] sender=${senderName} source=${sender.source} leadId=${leadId} assignedTo=${existing?.assigned_to || '(none)'}`);

    // Build + send email
    const { subject, text } = buildEmail({ firstName, company, senderName });
    const emailResult = await sendEmail({
      to: email,
      fromName: senderName,
      fromEmail,
      subject,
      text,
    });

    // Write email_sent_at to the lead row so the CRM can show a timestamp
    // for when the confirmation actually went out. Fire-and-forget; don't
    // block the response if this fails.
    if (emailResult.sent && leadId) {
      const { error: stampErr } = await supabase
        .from('workhuman_leads')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', leadId);
      if (stampErr) {
        console.error('[workhuman-booking] Failed to stamp email_sent_at:', JSON.stringify(stampErr));
      }
    }

    // Slack notification — also surfaces DB write failures so they can't
    // be silent. Header flips to ⚠️ and a backfill-required block is added
    // when dbError is present.
    const slackResult = await postSlack({
      name, firstName, company, email, phone: phoneClean, title, employeeCount,
      preferredDay, currentWellness, openToChat,
      landingPageUrl: existing?.landing_page_url || null,
      leadId,
      dbError,
    });

    // Return a degraded success if DB failed so the frontend knows something
    // went wrong even though Slack + email worked. Status 200 keeps the user
    // flow intact (they still see the thank-you page) but downstream tooling
    // can detect the issue via success=false.
    return json(200, {
      success: !dbError,
      leadId,
      email: emailResult,
      slack: slackResult,
      sender: { name: senderName, email: fromEmail, source: sender.source },
      dbError,
    });
  } catch (err) {
    console.error('workhuman-booking handler error:', err);
    return json(500, { error: err.message || 'Server error' });
  }
};
