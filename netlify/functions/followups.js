/**
 * followups — the rep's unified personal-outreach queue.
 *
 * Returns the union of:
 *   A) the rep's Workhuman PERSONAL-NOTE leads (assigned_to matched via the
 *      rep's connected Gmail → assigneeForGmail). These are the people you
 *      had a real-world conversation with at a conference; the note is your
 *      memory of it. Brought over wholesale, regardless of email-send status.
 *   B) any rep-attributed Gmail send (sender_email = rep) with no reply,
 *      ≥4d old, ≤3 touches.
 *
 * Deduplicated by email. Each row carries the full Workhuman context (tier,
 * outreach_status, note text, conference attendance, landing page) plus the
 * email state derived from outreach_sends.
 *
 * Inbox-connected banner: when the rep hasn't connected Gmail, the queue is
 * still useful (Workhuman context drives it), but email-send status will be
 * partial — the response flags that so the UI can warn explicitly.
 */

import { createClient } from '@supabase/supabase-js';
import { preflight } from './lib/preflight.js';
import { assigneeForGmail } from './lib/assignee.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

const MIN_DAYS = 4;
// Dual cap: trip if EITHER rule is hit. Models real outreach cadence —
// you can do a burst (3 in 30d) or a slow drip (5 in 60d) but not both.
const MAX_TOUCHES_30D = 3;
const MAX_TOUCHES_60D = 5;
const WINDOW_30_DAYS = 30;
const WINDOW_60_DAYS = 60;

// Parse the timestamp from a personal note: "[May 4, 11:06 AM · Will] ..."
// or "[Apr 28 at 8:20 AM · Will] ...". Used to gate which sends count toward
// the cadence cap — sends BEFORE the personal note were operational/coincidental
// contact (e.g., booth logistics), not a sales outreach attempt.
function parseNoteTimestamp(notes) {
  if (!notes) return null;
  const m = String(notes).match(/\[([^\[\]·]+?)·[^\[\]]*\]/);
  if (!m) return null;
  let s = m[1].trim().replace(/\bat\s+/i, '').trim();
  if (!/\d{4}/.test(s)) s = s.replace(/(\d{1,2})(,?)\s+(\d{1,2}:\d{2})/, `$1 ${new Date().getFullYear()} $3`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const MAX_RESULTS = 300;
const PERSONAL_NOTE_RE = /\[[^\[\]]*·[^\[\]]*\]/;  // strict: [timestamp · Author]
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

  // Resolve the rep's Gmail + assignee identity.
  const { data: gAcct } = await sb.from('gmail_accounts')
    .select('email, sent_crawl_enabled').eq('supabase_user_id', user.id).maybeSingle();
  const myEmail = lc(gAcct?.email);
  // Fall back to the auth user email if no Gmail account connected.
  const userEmail = lc(user.email);
  const myAssignee = assigneeForGmail(myEmail || userEmail);
  const inbox = {
    connected: !!gAcct,
    email: myEmail || null,
    sent_crawl_enabled: !!gAcct?.sent_crawl_enabled,
    assignee_name: myAssignee,
  };

  // ----- A) Pull Workhuman personal-note leads -----
  // For "mine" scope: filter to assigned_to = myAssignee. For "team": all
  // personal-note leads. If myAssignee resolution failed, fall back to
  // empty (UI banner explains).
  const whRows = [];
  if (scope === 'mine' ? !!myAssignee : true) {
    for (let from = 0; ; from += 1000) {
      let q = sb.from('workhuman_leads')
        .select('id, email, name, title, company, assigned_to, tier, tier_1a, tier_1b, notes, outreach_status, linkedin_url, landing_page_url, page_view_count, page_last_viewed_at, workhuman_attendee_id, was_waitlisted, vip_slot_day, vip_slot_time, email_sent_at, responded_at, meeting_scheduled_at')
        .not('notes', 'is', null);
      if (scope === 'mine') q = q.eq('assigned_to', myAssignee);
      const { data, error: e } = await q.range(from, from + 999);
      if (e) return json(502, { error: `workhuman query failed: ${e.message}` });
      // strict author-stamp filter
      for (const r of data || []) if (PERSONAL_NOTE_RE.test(r.notes || '')) whRows.push(r);
      if ((data || []).length < 1000) break;
    }
  }

  // ----- B) Pull ALL rep-attributed sends in the last 60d, regardless of reply -----
  // (Only when inbox is connected — otherwise this set is empty.)
  // Previously this filtered to `reply_time IS NULL` AND days_since >= 4 AND
  // under cadence cap, which meant active conversations (Jen @ Philly Bar —
  // replied yesterday) disappeared the moment they got hot. That's the wrong
  // mental model for a "my personal outreach" view; a sales rep wants ALL their
  // active threads visible with a state badge (replied / no_reply / maxed /
  // recent), not silently filtered down to "needs action today".
  const now = Date.now();
  const cutoff30 = new Date(now - WINDOW_30_DAYS * 86400000).toISOString();
  const cutoff60 = new Date(now - WINDOW_60_DAYS * 86400000).toISOString();
  const sendRows = [];
  if (myEmail) {
    for (let from = 0; ; from += 1000) {
      let q = sb.from('outreach_sends')
        .select('email, campaign_id, sent_time, reply_time, touch_count, thread_id, message_id, sender_email')
        .not('sender_email', 'is', null)
        .gte('sent_time', cutoff60);
      if (scope === 'mine') q = q.eq('sender_email', myEmail);
      const { data, error: e } = await q.range(from, from + 999);
      if (e) return json(502, { error: `outreach_sends query failed: ${e.message}` });
      sendRows.push(...data);
      if (data.length < 1000) break;
    }
  }
  // Path 2 aggregates per email: dual cap counts for cadence + any_reply flag.
  const path2Agg = new Map();
  for (const s of sendRows) {
    const k = lc(s.email);
    const cur = path2Agg.get(k) || { latest: null, t30: 0, t60: 0, any_reply: false, seen_msg: new Set() };
    const seenKey = s.message_id || `${s.campaign_id}|${s.sent_time}`;
    if (s.sender_email && s.sent_time && s.sent_time >= cutoff60 && !cur.seen_msg.has(seenKey)) {
      const inc = s.touch_count || 1;
      cur.t60 += inc;
      if (s.sent_time >= cutoff30) cur.t30 += inc;
      cur.seen_msg.add(seenKey);
    }
    if (s.reply_time) cur.any_reply = true;
    if (s.sent_time && (!cur.latest || s.sent_time > cur.latest.sent_time)) cur.latest = s;
    path2Agg.set(k, cur);
  }
  // Emit ALL aggregated emails with appropriate state. UI uses the state
  // badge (replied / maxed / no_reply) so the rep sees what's hot vs stale.
  const sendByEmail = new Map();
  for (const [k, agg] of path2Agg.entries()) {
    if (!agg.latest?.sent_time) continue;
    const days_since = Math.floor((now - new Date(agg.latest.sent_time).getTime()) / 86400000);
    const cap30Hit = (agg.t30 || 0) >= MAX_TOUCHES_30D;
    const cap60Hit = (agg.t60 || 0) >= MAX_TOUCHES_60D;
    const state = agg.any_reply ? 'replied' : ((cap30Hit || cap60Hit) ? 'maxed' : 'no_reply');
    sendByEmail.set(k, { ...agg.latest, days_since, t30: agg.t30, t60: agg.t60, state, any_reply: agg.any_reply });
  }
  // Aggregate ALL sends per email (a contact often has multiple send rows
  // across campaigns — historical sweep + gmail-sent-crawl + gmail-direct
  // all live as separate (email, campaign_id) rows). For each email we need:
  //  - the most recent sent_time + its thread_id + sender_email (for "last sent")
  //  - total touches across rows (for cadence cap; not just the latest row's
  //    touch_count, which only counts within one campaign)
  //  - has-replied-ever: ANY row with reply_time set OR ANY outreach_replies
  //    row exists. Once they've replied, the "replied" badge stays — sending
  //    them another email doesn't erase the warm signal.
  // Per-lead note timestamp: only sends AFTER this timestamp count as outreach
  // touches (pre-note emails were operational, not outreach).
  const noteTsByEmail = new Map();
  for (const w of whRows) {
    const ts = parseNoteTimestamp(w.notes);
    if (ts) noteTsByEmail.set(lc(w.email), ts);
  }
  const allSendByEmail = new Map();
  const whEmails = whRows.map((w) => lc(w.email)).filter(Boolean);
  for (let i = 0; i < whEmails.length; i += 200) {
    const slice = whEmails.slice(i, i + 200);
    const { data } = await sb.from('outreach_sends')
      .select('email, sent_time, reply_time, touch_count, thread_id, message_id, sender_email, campaign_id')
      .in('email', slice);
    for (const r of data || []) {
      const k = lc(r.email);
      const cur = allSendByEmail.get(k) || { latest: null, t30: 0, t60: 0, any_reply: false, seen_msg: new Set() };
      const noteTs = noteTsByEmail.get(k);
      // Touches only count if: rep-attributed, deduped by message_id, within
      // window, AND sent AFTER the personal note was written (so pre-note
      // operational threads like booth-logistics don't count as outreach).
      const seenKey = r.message_id || `${r.campaign_id}|${r.sent_time}`;
      const qualifies = r.sender_email && r.sent_time
        && r.sent_time >= cutoff60
        && (!noteTs || r.sent_time >= noteTs)
        && !cur.seen_msg.has(seenKey);
      if (qualifies) {
        const inc = r.touch_count || 1;
        cur.t60 += inc;
        if (r.sent_time >= cutoff30) cur.t30 += inc;
        cur.seen_msg.add(seenKey);
      }
      if (r.reply_time) cur.any_reply = true;
      if (r.sent_time && (!cur.latest || r.sent_time > cur.latest.sent_time)) cur.latest = r;
      allSendByEmail.set(k, cur);
    }
  }
  // Reply presence from outreach_replies (catches cases where the inbound
  // tracker wrote a reply row but no send had reply_time set — e.g. when a
  // reply lands against a different campaign_id than the original send).
  const replyEverByEmail = new Set();
  for (let i = 0; i < whEmails.length; i += 200) {
    const slice = whEmails.slice(i, i + 200);
    const { data } = await sb.from('outreach_replies').select('email').in('email', slice);
    for (const r of data || []) if (r.email) replyEverByEmail.add(lc(r.email));
  }

  // ----- Unify by email -----
  // Each emit row carries Workhuman context (if present) + email state.
  const emitted = new Map();
  const ensure = (k) => emitted.get(k) || (() => { const o = {}; emitted.set(k, o); return o; })();

  // First seed from Workhuman personal-note rows
  for (const w of whRows) {
    const k = lc(w.email); if (!k) continue;
    const tier = w.tier_1a ? 'tier_1a' : w.tier_1b ? 'tier_1b' : w.tier;
    const note = (w.notes || '').slice(0, 500);
    const o = ensure(k);
    Object.assign(o, {
      email: k, name: w.name, title: w.title, company: w.company,
      assigned_to: w.assigned_to, tier, outreach_status: w.outreach_status,
      personal_note: note, linkedin_url: w.linkedin_url,
      landing_page_url: w.landing_page_url, page_view_count: w.page_view_count,
      page_last_viewed_at: w.page_last_viewed_at,
      is_personal_note: true, has_workhuman: true,
      conference_attendee: !!w.workhuman_attendee_id,
      was_waitlisted: !!w.was_waitlisted,
      vip_slot: w.vip_slot_day ? { day: w.vip_slot_day, time: w.vip_slot_time } : null,
    });
    const agg = allSendByEmail.get(k);
    const everReplied = replyEverByEmail.has(k) || !!agg?.any_reply;
    if (agg && agg.latest) {
      const latest = agg.latest;
      o.last_sent = latest.sent_time;
      o.days_since = latest.sent_time ? Math.floor((now - new Date(latest.sent_time).getTime()) / 86400000) : null;
      o.touches = agg.t30 || 0;             // 30d count is the actionable display
      o.touches_60d = agg.t60 || 0;
      o.thread_id = latest.thread_id || null;
      o.sender_email = latest.sender_email || null;
      o.replied = everReplied;
      const cap30Hit = (agg.t30 || 0) >= MAX_TOUCHES_30D;
      const cap60Hit = (agg.t60 || 0) >= MAX_TOUCHES_60D;
      o.state = everReplied ? 'replied' : ((cap30Hit || cap60Hit) ? 'maxed' : 'no_reply');
    } else {
      o.state = inbox.connected ? 'never_emailed' : 'unknown_no_inbox';
      o.touches = 0;
    }
  }

  // Now add the rep's personal sends to non-Workhuman contacts.
  // (e.g. Jen @ Philly Bar — not a WH conference lead, but an active sales
  // conversation Will is having through his own Gmail.) Enrich name/title/
  // company from outreach_contacts (+ apollo_person_cache fallback) so rows
  // aren't just an email string.
  const sbKeys = [...sendByEmail.keys()].filter((k) => !emitted.has(k));
  const ocByEmail = new Map();
  const apByEmail = new Map();
  for (let i = 0; i < sbKeys.length; i += 200) {
    const slice = sbKeys.slice(i, i + 200);
    const [{ data: oc }, { data: ap }] = await Promise.all([
      sb.from('outreach_contacts').select('email, name, title, company, linkedin_url').in('email', slice),
      sb.from('apollo_person_cache').select('email, name, title, company, linkedin_url').in('email', slice),
    ]);
    for (const r of (oc || [])) ocByEmail.set(lc(r.email), r);
    for (const r of (ap || [])) apByEmail.set(lc(r.email), r);
  }
  for (const [k, s] of sendByEmail.entries()) {
    if (emitted.has(k)) continue; // already covered via WH
    const oc = ocByEmail.get(k);
    const ap = apByEmail.get(k);
    emitted.set(k, {
      email: k,
      name: oc?.name || ap?.name || null,
      title: oc?.title || ap?.title || null,
      company: oc?.company || ap?.company || null,
      assigned_to: null, tier: null, outreach_status: null,
      personal_note: null,
      linkedin_url: oc?.linkedin_url || ap?.linkedin_url || null,
      landing_page_url: null,
      is_personal_note: false, has_workhuman: false,
      conference_attendee: false, was_waitlisted: false, vip_slot: null,
      last_sent: s.sent_time, days_since: s.days_since,
      touches: s.t30 || 0, touches_60d: s.t60 || 0, thread_id: s.thread_id || null,
      sender_email: s.sender_email || null, replied: !!s.any_reply,
      state: s.state,
    });
  }

  // ----- Upgrade state to 'replied' for ANY emitted email with a reply on
  // record — single source of truth across both paths. The "latest send
  // hasn't been replied to" reading was wrong: once a lead has ever replied,
  // they're warm; sending them another email doesn't erase that signal.
  // Catches the case where a reply lives under a different campaign_id than
  // the latest send (e.g. gmail-direct reply attached to a gmail-sent-crawl
  // send), or only exists in outreach_replies, or only in send.reply_time.
  const allKeys = [...emitted.keys()];
  for (let i = 0; i < allKeys.length; i += 200) {
    const slice = allKeys.slice(i, i + 200);
    const [reps, sends] = await Promise.all([
      sb.from('outreach_replies').select('email').in('email', slice),
      sb.from('outreach_sends').select('email').in('email', slice).not('reply_time', 'is', null),
    ]);
    for (const r of (reps.data || [])) {
      const k = lc(r.email); if (!k) continue;
      const o = emitted.get(k);
      if (o) { o.state = 'replied'; o.replied = true; }
    }
    for (const r of (sends.data || [])) {
      const k = lc(r.email); if (!k) continue;
      const o = emitted.get(k);
      if (o) { o.state = 'replied'; o.replied = true; }
    }
  }

  // ----- Gate each row (drop suppressed / now-a-client / since-replied) -----
  const out = [];
  for (const o of emitted.values()) {
    if (out.length >= MAX_RESULTS) break;
    try {
      const gate = await preflight(sb, { email: o.email });
      if (gate.suppressed || gate.is_client) continue;
      // 'replied' state stays (we'll show it so the rep can see warm replies);
      // never_emailed/no_reply stay; we don't drop them.
    } catch { /* keep the row; gate failures shouldn't blank the queue */ }
    // Backfill name/company/title from outreach_contacts if missing (the
    // Workhuman row has it, but sends-only rows don't).
    if (!o.name || !o.company) {
      const { data: oc } = await sb.from('outreach_contacts')
        .select('name, title, company').eq('email', o.email).maybeSingle();
      if (oc) { o.name = o.name || oc.name; o.title = o.title || oc.title; o.company = o.company || oc.company; }
    }
    out.push(o);
  }

  // Sort: never_emailed (no prior contact — needs first outreach) first, then
  // everyone else by recency (most recently active conversation on top, so an
  // active replied thread doesn't get buried under months-old no-replies).
  // Within never_emailed: tier (1A first), then by name.
  const order = { never_emailed: 0, unknown_no_inbox: 0, no_reply: 1, replied: 1, maxed: 1 };
  out.sort((a, b) => {
    const grp = (order[a.state] ?? 9) - (order[b.state] ?? 9);
    if (grp !== 0) return grp;
    // Within the "has-history" group, most recently active first
    return (a.days_since ?? 9999) - (b.days_since ?? 9999);
  });

  return json(200, {
    success: true,
    count: out.length,
    inbox,
    note: null,  // banner in the UI handles the "inbox not connected" messaging
    followups: out,
  });
};
