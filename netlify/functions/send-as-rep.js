/**
 * send-as-rep — send a rep-approved draft from the rep's own Gmail.
 *
 * Auth: Supabase JWT. The body is human-approved (the rep edited it in the
 * draft modal and clicked send). Before sending we RE-RUN the shared pre-flight
 * gate on the recipient and HARD-BLOCK suppressed / existing-client addresses.
 * After sending we record the send into outreach_* so the gate sees it next
 * time (no double-contact).
 *
 * Lethal-trifecta note: the only untrusted input here is prospect context that
 * already shaped the draft; a human reviews the final text before this runs,
 * and this function performs exactly one action (Gmail send) with no tool loop.
 */

import { createClient } from '@supabase/supabase-js';
import { preflight } from './lib/preflight.js';
import { getAccessToken, sendEmail, getSignature, lc } from './lib/gmail.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GMAIL_CAMPAIGN = 'gmail-direct';      // confirmed API send
const GMAIL_OPEN_CAMPAIGN = 'gmail-open';   // opened in Gmail web compose (intent to send)

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'Server misconfigured' });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }

  const mode = body.mode === 'open' ? 'open' : 'send';
  const to = lc(body.to);
  const fromEmail = lc(body.fromEmail);
  const threadId = body.threadId ? String(body.threadId) : null; // set => follow-up in this Gmail thread
  let subject = (body.subject || '').toString().trim();
  if (threadId && subject && !/^re:/i.test(subject)) subject = `Re: ${subject}`;
  const text = (body.body || '').toString();
  const acknowledgedCaution = body.acknowledgedCaution === true;

  if (!to || !EMAIL_RE.test(to)) return json(400, { error: 'A valid recipient email is required' });
  // 'open' mode opens Gmail web compose and does not need our OAuth connection.
  if (mode === 'send' && !fromEmail) return json(400, { error: 'fromEmail (the connected Gmail) is required' });
  if (!subject) return json(400, { error: 'Subject is required' });
  if (text.trim().length < 10) return json(400, { error: 'Body looks empty' });

  // HARD pre-flight gate before any real send.
  let gate;
  try {
    gate = await preflight(sb, { email: to });
  } catch (e) {
    return json(502, { error: `Pre-flight failed: ${e.message}` });
  }
  if (gate.recommendation === 'skip_suppressed') {
    return json(409, { blocked: true, reason: 'suppressed', detail: gate.suppression_reason, preflight: gate });
  }
  if (gate.recommendation === 'skip_already_client') {
    return json(409, { blocked: true, reason: 'already_client', detail: gate.client, preflight: gate });
  }
  if (gate.recommendation === 'caution_recently_contacted' && !acknowledgedCaution) {
    return json(409, { blocked: true, reason: 'recently_contacted', detail: gate.last_contact, preflight: gate });
  }

  // "Open in Gmail": build a web-compose deep link, record intent so the
  // gate dedupes, and let the rep send from Gmail (signature added natively).
  if (mode === 'open') {
    const p = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body: text });
    if (fromEmail) p.set('authuser', fromEmail);
    const openUrl = `https://mail.google.com/mail/?${p.toString()}`;

    const now = new Date().toISOString();
    try {
      await sb.from('outreach_contacts').upsert(
        { email: to, email_domain: to.split('@')[1] || null, source: 'gmail-open', first_seen: now, ingested_at: now },
        { onConflict: 'email', ignoreDuplicates: true },
      );
      await sb.from('outreach_sends').upsert(
        { email: to, campaign_id: GMAIL_OPEN_CAMPAIGN, sent_time: now, ingested_at: now, sender_email: fromEmail || null },
        { onConflict: 'email,campaign_id' },
      );
    } catch (e) {
      console.error('open recorded with errors (non-fatal):', e.message);
    }

    return json(200, { success: true, mode: 'open', open_url: openUrl, preflight: gate });
  }

  // Send via the rep's Gmail.
  let sent;
  try {
    const accessToken = await getAccessToken(sb, fromEmail);
    const signatureHtml = await getSignature(accessToken, fromEmail);
    sent = await sendEmail(accessToken, { from: fromEmail, to, subject, body: text, signatureHtml, threadId });
  } catch (e) {
    return json(502, { error: `Send failed: ${e.message}` });
  }

  // Record so the gate sees this contact next time, and track cadence
  // (touch_count/thread) for the follow-up queue. Best-effort.
  const now = new Date().toISOString();
  try {
    await sb.from('outreach_contacts').upsert(
      { email: to, email_domain: to.split('@')[1] || null, source: 'gmail-direct', first_seen: now, ingested_at: now },
      { onConflict: 'email', ignoreDuplicates: true },
    );
    // Read-modify-write the touch count (one row per email,campaign; a
    // follow-up upserts the same row so we can't count rows). Human-paced
    // sends => the race window is irrelevant.
    const { data: prev } = await sb.from('outreach_sends')
      .select('touch_count').eq('email', to).eq('campaign_id', GMAIL_CAMPAIGN).maybeSingle();
    await sb.from('outreach_sends').upsert(
      {
        email: to, campaign_id: GMAIL_CAMPAIGN, sent_time: now, ingested_at: now,
        touch_count: (prev?.touch_count || 0) + 1,
        thread_id: sent.threadId || threadId || null,
        message_id: sent.id || null,
        sender_email: fromEmail,                 // attribute the send to this rep
      },
      { onConflict: 'email,campaign_id' },
    );
  } catch (e) {
    console.error('send recorded with errors (non-fatal):', e.message);
  }

  return json(200, {
    success: true,
    message_id: sent.id,
    thread_id: sent.threadId,
    preflight: gate,
    caution: gate.recommendation === 'caution_recently_contacted' ? 'sent_despite_recent_contact' : null,
  });
};
