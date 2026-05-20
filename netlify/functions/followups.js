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
const MAX_TOUCHES = 3;
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

  // ----- B) Pull rep-attributed unanswered sends -----
  // (Only when inbox is connected — otherwise this set is empty.)
  const sendRows = [];
  if (myEmail) {
    for (let from = 0; ; from += 1000) {
      let q = sb.from('outreach_sends')
        .select('email, campaign_id, sent_time, touch_count, thread_id, sender_email')
        .not('sender_email', 'is', null)
        .is('reply_time', null);
      if (scope === 'mine') q = q.eq('sender_email', myEmail);
      const { data, error: e } = await q.range(from, from + 999);
      if (e) return json(502, { error: `outreach_sends query failed: ${e.message}` });
      sendRows.push(...data);
      if (data.length < 1000) break;
    }
  }
  const now = Date.now();
  const qualifiedSends = sendRows
    .map((s) => ({ ...s, days_since: s.sent_time ? Math.floor((now - new Date(s.sent_time).getTime()) / 86400000) : null }))
    .filter((s) => s.days_since != null && s.days_since >= MIN_DAYS && (s.touch_count || 1) < MAX_TOUCHES);
  const sendByEmail = new Map();
  for (const s of qualifiedSends) {
    const k = lc(s.email);
    const cur = sendByEmail.get(k);
    if (!cur || (s.sent_time && (!cur.sent_time || s.sent_time > cur.sent_time))) sendByEmail.set(k, s);
  }
  // Also: look up ALL sends (not just no-reply) for personal-note leads so we
  // can show "replied / no_reply / never_emailed" state in their row.
  const allSendByEmail = new Map();
  const whEmails = whRows.map((w) => lc(w.email)).filter(Boolean);
  for (let i = 0; i < whEmails.length; i += 200) {
    const slice = whEmails.slice(i, i + 200);
    const { data } = await sb.from('outreach_sends')
      .select('email, sent_time, reply_time, touch_count, thread_id, sender_email, campaign_id')
      .in('email', slice);
    for (const r of data || []) {
      const k = lc(r.email);
      const cur = allSendByEmail.get(k);
      // Keep most recent by sent_time
      if (!cur || (r.sent_time && (!cur.sent_time || r.sent_time > cur.sent_time))) allSendByEmail.set(k, r);
    }
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
    const send = allSendByEmail.get(k);
    if (send) {
      o.last_sent = send.sent_time;
      o.days_since = send.sent_time ? Math.floor((now - new Date(send.sent_time).getTime()) / 86400000) : null;
      o.touches = send.touch_count || 1;
      o.thread_id = send.thread_id || null;
      o.sender_email = send.sender_email || null;
      o.replied = !!send.reply_time;
      o.state = send.reply_time ? 'replied' : ((o.touches || 1) >= MAX_TOUCHES ? 'maxed' : 'no_reply');
    } else {
      o.state = inbox.connected ? 'never_emailed' : 'unknown_no_inbox';
      o.touches = 0;
    }
  }

  // Now add unanswered sends that aren't in workhuman_leads (Will's existing
  // non-personal-note follow-ups still belong in the queue).
  for (const [k, s] of sendByEmail.entries()) {
    if (emitted.has(k)) continue; // already covered via WH
    emitted.set(k, {
      email: k, name: null, title: null, company: null,
      assigned_to: null, tier: null, outreach_status: null,
      personal_note: null, linkedin_url: null, landing_page_url: null,
      is_personal_note: false, has_workhuman: false,
      conference_attendee: false, was_waitlisted: false, vip_slot: null,
      last_sent: s.sent_time, days_since: s.days_since,
      touches: s.touch_count || 1, thread_id: s.thread_id || null,
      sender_email: s.sender_email || null, replied: false,
      state: 'no_reply',
    });
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

  // Sort: never_emailed first (cold queue), then no_reply by days_since desc, then replied last.
  const order = { never_emailed: 0, unknown_no_inbox: 0, no_reply: 1, maxed: 2, replied: 3 };
  out.sort((a, b) => (order[a.state] - order[b.state]) || ((b.days_since || 0) - (a.days_since || 0)));

  return json(200, {
    success: true,
    count: out.length,
    inbox,
    note: null,  // banner in the UI handles the "inbox not connected" messaging
    followups: out,
  });
};
