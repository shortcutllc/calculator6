/**
 * followups — the gated non-responder queue.
 *
 * Auth: Supabase JWT. Read-only. Returns companion sends (campaign_id
 * gmail-direct / gmail-open) that got NO reply, are old enough to nudge, and
 * still pass the pre-flight gate (not suppressed, not now-a-client). Capped
 * touches so we never hound anyone. This SURFACES + lets the rep draft a
 * follow-up; it never sends on its own.
 */

import { createClient } from '@supabase/supabase-js';
import { preflight } from './lib/preflight.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

// Any rep-attributed Gmail send qualifies (sender_email is set by send-as-rep,
// gmail-sent-crawl, and gmail-historical-sweep). Old corpus / Smartlead rows
// have sender_email = NULL and are excluded — they aren't ours to follow up on.
const MIN_DAYS = 4;     // give them time to reply before nudging
const MAX_TOUCHES = 3;  // total emails per person before we stop
const MAX_RESULTS = 200;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'Server misconfigured' });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  // Per-rep scope by default. ?scope=team shows everyone's companion sends.
  const scope = (event.queryStringParameters?.scope === 'team') ? 'team' : 'mine';
  let myEmail = null;
  if (scope === 'mine') {
    const { data: acct } = await sb.from('gmail_accounts')
      .select('email').eq('supabase_user_id', user.id).maybeSingle();
    myEmail = acct?.email || null;
    if (!myEmail) return json(200, { success: true, scope: 'mine', count: 0, followups: [], note: 'No Gmail connected — connect to see your follow-ups.' });
  }

  // Any rep-attributed Gmail send with no reply (companion, daily crawl,
  // historical sweep — all set sender_email; legacy/Smartlead corpus is NULL
  // and stays out of the follow-up queue by design).
  const sends = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from('outreach_sends')
      .select('email, campaign_id, sent_time, touch_count, thread_id, sender_email')
      .not('sender_email', 'is', null)
      .is('reply_time', null);
    if (myEmail) q = q.eq('sender_email', myEmail);
    const { data, error: e } = await q.range(from, from + 999);
    if (e) return json(502, { error: `query failed: ${e.message}` });
    sends.push(...data);
    if (data.length < 1000) break;
  }

  const now = Date.now();
  const aged = sends
    .map((s) => ({ ...s, days_since: s.sent_time ? Math.floor((now - new Date(s.sent_time).getTime()) / 86400000) : null }))
    .filter((s) => s.days_since != null && s.days_since >= MIN_DAYS && (s.touch_count || 1) < MAX_TOUCHES)
    .sort((a, b) => b.days_since - a.days_since)
    .slice(0, MAX_RESULTS * 2); // headroom; gate drops some below

  // Enrich with contact identity (batched).
  const emails = [...new Set(aged.map((s) => s.email))];
  const idById = new Map();
  for (let i = 0; i < emails.length; i += 300) {
    const { data } = await sb.from('outreach_contacts')
      .select('email, name, title, company').in('email', emails.slice(i, i + 300));
    for (const c of data || []) idById.set(c.email, c);
  }

  // Gate each candidate (drop suppressed / now-a-client / since-replied).
  const out = [];
  for (const s of aged) {
    if (out.length >= MAX_RESULTS) break;
    let gate;
    try { gate = await preflight(sb, { email: s.email }); } catch { continue; }
    if (gate.suppressed || gate.is_client) continue;
    if (gate.last_contact && gate.last_contact.replied) continue;
    const c = idById.get(s.email) || {};
    out.push({
      email: s.email,
      name: c.name || null,
      title: c.title || null,
      company: c.company || null,
      last_sent: s.sent_time,
      days_since: s.days_since,
      touches: s.touch_count || 1,
      thread_id: s.thread_id || null,
      sender_email: s.sender_email || null,
    });
  }

  return json(200, { success: true, scope, my_email: myEmail, count: out.length, followups: out });
};
