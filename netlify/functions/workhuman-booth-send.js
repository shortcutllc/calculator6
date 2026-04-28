/**
 * workhuman-booth-send.js
 *
 * Booth day-of trigger button backend. Sends either:
 *   - action: 'no_show_email'   → NO_SHOW_RECOVERY template via SendGrid
 *   - action: 'reminder_sms'    → "your massage is at {time}" SMS via the
 *                                 existing Supabase send-sms edge function
 *
 * Sender attribution:
 *   - Picks the lead's assigned_to teammate's @getshortcut.co alias
 *   - Falls back to last outreach sender, then Will Newton
 *
 * Logs the send to workhuman_signups.team_notes so the booth team can see
 * what's already gone out.
 */
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

const HONORIFIC_RE = /^(Mr|Mrs|Ms|Mx|Dr|Prof|Sir|Madam|Miss|Mister)\.?\s+/i;
function cleanFirstName(name) {
  if (!name) return 'there';
  const stripped = name.replace(HONORIFIC_RE, '').trim();
  return (stripped.split(/\s+/)[0] || 'there').trim();
}

async function pickSender(supabase, leadId, assignedTo) {
  if (assignedTo && SENDER_EMAILS[assignedTo]) {
    return { name: assignedTo, email: SENDER_EMAILS[assignedTo] };
  }
  if (leadId) {
    const { data } = await supabase
      .from('lead_outreach_log')
      .select('sender_name')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(1);
    const last = data?.[0]?.sender_name;
    if (last && SENDER_EMAILS[last]) return { name: last, email: SENDER_EMAILS[last] };
  }
  return { name: DEFAULT_SENDER_NAME, email: DEFAULT_SENDER_EMAIL };
}

function buildNoShowEmail({ firstName, company, senderName }) {
  const fn = cleanFirstName(firstName);
  const co = (company || '').trim() || 'your team';
  const senderFirst = senderName.split(' ')[0];

  const text = `Hey ${fn},

Sorry we missed you at the Zen Zone today. We'd still love to host you for a complimentary massage and chat for a few minutes about what wellness could look like at ${co}.

The lounge is open tomorrow and Wednesday in the Gratitude Garden. Stop by or reply here and we'll do our best to hold a slot for you.

${senderFirst}
Shortcut | getshortcut.co`;

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#222;line-height:1.55;max-width:560px">
<p style="margin:0 0 14px">Hey ${fn},</p>
<p style="margin:0 0 14px">Sorry we missed you at the Zen Zone today. We'd still love to host you for a complimentary massage and chat for a few minutes about what wellness could look like at ${co}.</p>
<p style="margin:0 0 14px">The lounge is open tomorrow and Wednesday in the Gratitude Garden. Stop by or reply here and we'll do our best to hold a slot for you.</p>
<p style="margin:0 0 14px">${senderFirst}<br>Shortcut | getshortcut.co</p>
</div>`;

  const subject = 'Workhuman Massage Appointment - Sorry we missed you!';
  return { subject, text, html };
}

function buildReminderSMS({ firstName, daySlug, time, senderName }) {
  const fn = cleanFirstName(firstName);
  const senderFirst = (senderName || DEFAULT_SENDER_NAME).split(' ')[0];

  // daySlug like "Mon Apr 27" or "Tue Apr 28"
  const dayMap = {
    'Mon Apr 27': 'today',
    'Tue Apr 28': 'today',
    'Wed Apr 29': 'today',
  };
  // Default to a friendly day reference if the label isn't a recognized one
  let dayRef = dayMap[daySlug || ''] || (daySlug ? daySlug : 'today');
  // If today === the day_label, say "today"; otherwise say the label
  // (We can't easily know "today" server-side without timezone setup, so
  // keep the raw label when it's not one of the three event days.)

  const timePart = time ? ` at ${time}` : '';
  return `Good morning ${fn}! Just a reminder of your complimentary chair massage with Shortcut${timePart} ${dayRef === 'today' ? 'today' : `on ${dayRef}`} in the Gratitude Garden at Workhuman Live. See you soon!\n\n— ${senderFirst}, Shortcut`;
}

async function sendEmailViaSendGrid({ to, fromName, fromEmail, subject, text, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { sent: false, reason: 'no_api_key' };
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      reply_to: { email: fromEmail, name: fromName },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });
  if (!r.ok) return { sent: false, reason: 'sendgrid_error', status: r.status, body: await r.text() };
  return { sent: true };
}

/**
 * Send SMS through the existing Supabase `send-sms` edge function. That
 * function already has Twilio creds wired up (Deno env) — Netlify functions
 * don't have Twilio creds, so reusing the edge function is simpler than
 * duplicating env vars across two infras. Same path the headshots flow uses.
 */
async function sendSMSViaTwilio({ to, message }) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl) return { sent: false, reason: 'supabase_url_missing' };
  // Edge functions accept the anon key OR the service role; either works.
  const authKey = anonKey || serviceKey;
  if (!authKey) return { sent: false, reason: 'supabase_key_missing' };

  const r = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authKey}`,
      apikey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, message }),
  });
  if (!r.ok) {
    const body = await r.text();
    return { sent: false, reason: 'edge_fn_error', status: r.status, body };
  }
  const data = await r.json().catch(() => ({}));
  if (!data?.success) return { sent: false, reason: 'send_sms_failed', body: JSON.stringify(data) };
  return { sent: true };
}

async function appendNote(supabase, signupId, line) {
  const { data: row } = await supabase
    .from('workhuman_signups')
    .select('team_notes')
    .eq('id', signupId)
    .maybeSingle();
  const existing = row?.team_notes || '';
  const stamp = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const newLine = `[${stamp}] ${line}`;
  const merged = existing ? `${newLine}\n${existing}` : newLine;
  await supabase.from('workhuman_signups').update({ team_notes: merged }).eq('id', signupId);
}

/**
 * Process one signup. Returns { ok, error?, from? }.
 * Shared between single-send and bulk paths.
 */
async function processSend(supabase, signupId, action) {
  const { data: signup, error: sErr } = await supabase
    .from('workhuman_signups')
    .select('id, full_name, first_name, email, phone, company, day_label, time_slot, matched_lead_id')
    .eq('id', signupId)
    .maybeSingle();
  if (sErr || !signup) return { ok: false, signupId, error: 'signup not found' };

  let lead = null;
  if (signup.matched_lead_id) {
    const { data } = await supabase
      .from('workhuman_leads')
      .select('id, name, company, assigned_to, phone, mobile_phone')
      .eq('id', signup.matched_lead_id)
      .maybeSingle();
    lead = data;
  }

  const sender = await pickSender(supabase, lead?.id, lead?.assigned_to);
  const firstName = cleanFirstName(signup.first_name || signup.full_name || lead?.name);
  const company = lead?.company || signup.company || '';

  if (action === 'no_show_email') {
    const to = signup.email;
    if (!to || to.includes('@no-email.placeholder')) {
      return { ok: false, signupId, name: signup.full_name, error: 'no email on file' };
    }
    const { subject, text, html } = buildNoShowEmail({ firstName, company, senderName: sender.name });
    const result = await sendEmailViaSendGrid({
      to, fromName: sender.name, fromEmail: sender.email, subject, text, html,
    });
    if (!result.sent) return { ok: false, signupId, name: signup.full_name, error: result.reason || 'sendgrid failed' };
    await appendNote(supabase, signupId, `📧 No-show recovery email sent from ${sender.name} → ${to}`);
    return { ok: true, signupId, from: sender.name, to };
  }

  if (action === 'reminder_sms') {
    const phone = signup.phone || lead?.mobile_phone || lead?.phone;
    if (!phone) return { ok: false, signupId, name: signup.full_name, error: 'no phone on file' };
    const message = buildReminderSMS({
      firstName, daySlug: signup.day_label, time: signup.time_slot, senderName: sender.name,
    });
    const result = await sendSMSViaTwilio({ to: phone, message });
    if (!result.sent) return { ok: false, signupId, name: signup.full_name, error: result.reason || 'twilio failed' };
    await appendNote(supabase, signupId, `📱 Reminder SMS sent from ${sender.name} → ${phone}`);
    return { ok: true, signupId, from: sender.name, to: phone };
  }

  return { ok: false, signupId, error: 'unhandled action' };
}

// Netlify function execution cap is ~26s on free tier. With 250ms pacing
// per send + ~200ms overhead per item, we can safely fit ~80 sends in a
// single invocation. The frontend chunks anything larger across multiple
// invocations so the UI is never bitten by a mid-batch timeout.
const BULK_LIMIT = 80;
const SEND_DELAY_MS = 250;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const { signupId, signupIds, action } = JSON.parse(event.body || '{}');
    if (!action || !['no_show_email', 'reminder_sms'].includes(action)) {
      return json(400, { error: 'action must be no_show_email or reminder_sms' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server misconfigured' });
    const supabase = createClient(supabaseUrl, serviceKey);

    // ---- Bulk path ----
    if (Array.isArray(signupIds)) {
      if (signupIds.length === 0) return json(400, { error: 'signupIds is empty' });
      if (signupIds.length > BULK_LIMIT) {
        return json(400, { error: `bulk limit is ${BULK_LIMIT} per request (got ${signupIds.length})` });
      }
      const results = [];
      for (let i = 0; i < signupIds.length; i++) {
        const r = await processSend(supabase, signupIds[i], action);
        results.push(r);
        if (i < signupIds.length - 1) await new Promise(res => setTimeout(res, SEND_DELAY_MS));
      }
      const sent = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok);
      return json(200, {
        ok: failed.length === 0,
        action,
        total: signupIds.length,
        sent,
        failed: failed.length,
        failures: failed.map(f => ({ signupId: f.signupId, name: f.name, error: f.error })),
      });
    }

    // ---- Single path ----
    if (!signupId) return json(400, { error: 'signupId or signupIds required' });
    const r = await processSend(supabase, signupId, action);
    if (!r.ok) return json(502, { error: r.error });
    return json(200, { ok: true, sent: action === 'no_show_email' ? 'email' : 'sms', from: r.from });
  } catch (err) {
    console.error('workhuman-booth-send error:', err);
    return json(500, { error: err.message || 'unknown error' });
  }
};
