/**
 * gmail-pubsub-reply — Pub/Sub PUSH receiver for Gmail reply notifications.
 *
 * DATA-ONLY BY DESIGN. Inbound email is untrusted content. This function
 * never runs an LLM, never takes an action from message content, and never
 * follows instructions in a message. It records reply *presence + metadata*
 * (from / subject / thread) into outreach_replies and flips the matching
 * outreach_sends.reply_time. That feeds the read-only pre-flight gate so we
 * stop contacting people who replied. This is the only safe shape for
 * attacker-controlled input: pure data sink, no tool surface.
 *
 * Auth: Pub/Sub push has no JWT we control, so the subscription endpoint
 * carries ?token=<HMAC(service_role_key,'gmail-pubsub')>. Constant-time check.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getAccessToken, listInboundSince, lc } from './lib/gmail.js';

const ok = (b = 'ok') => ({ statusCode: 200, body: b });   // 200 so Pub/Sub doesn't redeliver
const GMAIL_CAMPAIGN = 'gmail-direct';

export function pushToken(secret) {
  return crypto.createHmac('sha256', secret).update('gmail-pubsub').digest('hex').slice(0, 32);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return ok('misconfigured');

  const got = (event.queryStringParameters || {}).token || '';
  const want = pushToken(key);
  if (got.length !== want.length
    || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return { statusCode: 403, body: 'forbidden' };
  }

  // Decode the Pub/Sub envelope -> { emailAddress, historyId }
  let notif;
  try {
    const body = JSON.parse(event.body || '{}');
    const data = body?.message?.data;
    if (!data) return ok('no-data');
    notif = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
  } catch {
    return ok('bad-envelope');
  }
  const mailbox = lc(notif.emailAddress);
  if (!mailbox) return ok('no-mailbox');

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, history_id').eq('email', mailbox).maybeSingle();
  if (!acct) return ok('unknown-mailbox');

  const startHistoryId = acct.history_id || notif.historyId;
  if (!startHistoryId) return ok('no-cursor');

  let result;
  try {
    const accessToken = await getAccessToken(sb, mailbox);
    result = await listInboundSince(accessToken, startHistoryId);
  } catch (e) {
    console.error('gmail history fetch failed:', e.message);
    return ok('history-error'); // 200: transient, next notification re-syncs
  }

  for (const m of result.messages) {
    if (!m.fromEmail) continue;
    // Only record replies from people we actually contacted (keeps the gate clean).
    const { data: snd } = await sb.from('outreach_sends')
      .select('email').eq('email', m.fromEmail).limit(1).maybeSingle();
    if (!snd) continue;

    const when = m.internalDate || new Date().toISOString();
    await sb.from('outreach_replies').upsert(
      {
        email: m.fromEmail,
        campaign_id: GMAIL_CAMPAIGN,
        reply_date: when,
        reply_content: m.subject ? `re: ${m.subject}`.slice(0, 300) : null,
        reply_sentiment: null,            // presence-only; sentiment deferred (same as Smartlead path)
        sentiment_source: 'automated',
        ingested_at: new Date().toISOString(),
      },
      { onConflict: 'email,campaign_id,sentiment_source' },
    );
    await sb.from('outreach_sends')
      .update({ reply_time: when })
      .eq('email', m.fromEmail).eq('campaign_id', GMAIL_CAMPAIGN).is('reply_time', null);
  }

  if (result.newHistoryId && result.newHistoryId !== acct.history_id) {
    await sb.from('gmail_accounts')
      .update({ history_id: String(result.newHistoryId), updated_at: new Date().toISOString() })
      .eq('email', mailbox);
  }

  return ok();
};
