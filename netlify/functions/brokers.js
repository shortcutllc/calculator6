/**
 * brokers — the rep's healthcare broker + carrier-HEC GTM queue.
 *
 * Returns every outreach_contacts row tagged with broker_track, scoped to
 * the rep's assignment. Includes:
 *   - identity (name, title, company)
 *   - the firm record from crm_target_firms (tier, track, priority_rank, why)
 *   - email state: emailed_count, last_sent, replied (derived from outreach_sends)
 *
 * Frontend renders this as the Brokers tab in /sales-intelligence. Mirrors
 * the followups.js shape so the UI can reuse table primitives.
 *
 * scope=mine (default) | team
 */

import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

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

  const scope = (event.queryStringParameters?.scope === 'team') ? 'team' : 'mine';

  // Resolve the rep's gmail
  const { data: gAcct } = await sb.from('gmail_accounts')
    .select('email').eq('supabase_user_id', user.id).maybeSingle();
  const myEmail = lc(gAcct?.email) || lc(user.email);
  if (!myEmail) return json(200, { success: true, count: 0, brokers: [] });

  // ----- 1. Pull broker contacts -----
  let q = sb.from('outreach_contacts')
    .select('email, name, title, company, broker_track, broker_priority_rank, broker_assigned_to, linkedin_url, source')
    .not('broker_track', 'is', null)
    .order('broker_priority_rank', { ascending: true });
  if (scope === 'mine') q = q.eq('broker_assigned_to', myEmail);
  const { data: contacts, error: ce } = await q;
  if (ce) return json(502, { error: `contacts query failed: ${ce.message}` });

  // ----- 2. Pull all target firms (for tier/why/firm-level metadata) -----
  const { data: firms } = await sb.from('crm_target_firms')
    .select('display_name, tier, track, priority_rank, nyc_presence, why');
  const firmByName = new Map();
  for (const f of (firms || [])) firmByName.set(f.display_name.toLowerCase(), f);
  // Fuzzy match — also normalize to first word for cases like "OneDigital, Inc."
  const firmByFirstWord = new Map();
  for (const f of (firms || [])) {
    const first = f.display_name.toLowerCase().split(/\s|,/)[0];
    if (first.length >= 4 && !firmByFirstWord.has(first)) firmByFirstWord.set(first, f);
  }
  const resolveFirm = (companyName) => {
    if (!companyName) return null;
    const c = companyName.toLowerCase();
    if (firmByName.has(c)) return firmByName.get(c);
    // Try first-word fuzzy
    const first = c.split(/\s|,/)[0];
    if (firmByFirstWord.has(first)) return firmByFirstWord.get(first);
    // Try substring across all firms
    for (const f of (firms || [])) {
      const fc = f.display_name.toLowerCase();
      if (c.includes(fc) || fc.includes(c)) return f;
    }
    return null;
  };

  // ----- 3. Pull email state for each contact -----
  const emails = (contacts || []).map((c) => lc(c.email)).filter(Boolean);
  const stateByEmail = new Map();
  for (let i = 0; i < emails.length; i += 200) {
    const slice = emails.slice(i, i + 200);
    const [sends, replies] = await Promise.all([
      sb.from('outreach_sends').select('email, sent_time, sender_email, reply_time, message_id').in('email', slice),
      sb.from('outreach_replies').select('email, reply_date, reply_sentiment').in('email', slice),
    ]);
    for (const s of (sends.data || [])) {
      const k = lc(s.email);
      const cur = stateByEmail.get(k) || { sends: [], replied: false, last_sent: null, last_reply: null, sender_email: null };
      cur.sends.push(s);
      if (s.reply_time) cur.replied = true;
      if (!cur.last_sent || s.sent_time > cur.last_sent) {
        cur.last_sent = s.sent_time;
        cur.sender_email = s.sender_email;
      }
      stateByEmail.set(k, cur);
    }
    for (const r of (replies.data || [])) {
      const k = lc(r.email);
      const cur = stateByEmail.get(k) || { sends: [], replied: false, last_sent: null, last_reply: null, sender_email: null };
      cur.replied = true;
      if (!cur.last_reply || r.reply_date > cur.last_reply) cur.last_reply = r.reply_date;
      stateByEmail.set(k, cur);
    }
  }

  // ----- 4. Compose the response -----
  const now = Date.now();
  const out = [];
  for (const c of (contacts || [])) {
    const firm = resolveFirm(c.company);
    const state = stateByEmail.get(lc(c.email)) || null;
    const daysSince = state?.last_sent
      ? Math.floor((now - new Date(state.last_sent).getTime()) / 86400000)
      : null;
    // Dedupe sends by message_id for accurate emailed_count
    const seen = new Set();
    let emailedCount = 0;
    for (const s of (state?.sends || [])) {
      const k = s.message_id || `${s.sent_time}`;
      if (seen.has(k)) continue;
      seen.add(k);
      emailedCount += 1;
    }
    out.push({
      email: c.email,
      name: c.name,
      title: c.title,
      company: c.company,
      linkedin_url: c.linkedin_url,
      assigned_to: c.broker_assigned_to,
      // Firm-level
      firm_name: firm?.display_name || c.company,
      firm_tier: firm?.tier || null,
      firm_track: firm?.track || c.broker_track,
      firm_priority: firm?.priority_rank ?? c.broker_priority_rank ?? null,
      firm_nyc: firm?.nyc_presence || null,
      firm_why: firm?.why || null,
      // State
      emailed_count: emailedCount,
      last_sent: state?.last_sent || null,
      last_reply: state?.last_reply || null,
      days_since: daysSince,
      replied: !!state?.replied,
      sender_email: state?.sender_email || null,
      state: state?.replied
        ? 'replied'
        : (state?.last_sent ? 'in_cadence' : 'never_emailed'),
    });
  }

  // Sort: never_emailed first (highest priority first), then in_cadence by days_since desc, then replied
  const stateOrder = { never_emailed: 0, in_cadence: 1, replied: 2 };
  out.sort((a, b) => {
    const so = (stateOrder[a.state] ?? 9) - (stateOrder[b.state] ?? 9);
    if (so !== 0) return so;
    if (a.state === 'never_emailed') {
      return (a.firm_priority ?? 999) - (b.firm_priority ?? 999);
    }
    return (b.days_since ?? 0) - (a.days_since ?? 0);
  });

  return json(200, {
    success: true,
    count: out.length,
    scope,
    rep_email: myEmail,
    brokers: out,
  });
};
