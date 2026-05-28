/**
 * slack-rep-digest — daily personal digest DM from Pro to each opted-in rep.
 *
 * Runs hourly (cron) so we can fire at 8am LOCAL for each rep regardless of
 * their tz (DST-aware via Intl.DateTimeFormat). Per-rep dedupe via
 * digest_last_sent_at — at most one digest per rep per day.
 *
 * Phase 1: text-only DM with four sections (hot replies, never-emailed personal
 * notes, due follow-ups, landing-page views). Phase 2 will add block kit
 * + action buttons + snooze.
 *
 * Every DM is personal — the rep only sees their own leads. Ownership =
 * workhuman_leads.assigned_to (when present) → otherwise last sender_email on
 * outreach_sends. Cross-rep crossovers go to the lead OWNER, not the sender.
 *
 * Inbox-mute: muted_lead_emails (per-lead permanent), muted_until (global
 * snooze). Weekends skipped by default.
 */

import { createClient } from '@supabase/supabase-js';
import { assigneeForGmail } from './lib/assignee.js';

export const config = { schedule: '0 * * * *' }; // hourly, top of hour

const SLACK_API = 'https://slack.com/api';
const SECTION_MAX = 5;             // top N per bucket
const HOT_REPLY_WINDOW_H = 48;     // replied in last 48h = hot
const FOLLOWUP_MIN_DAYS = 4;       // matches followups.js
const LP_VIEW_WINDOW_H = 24;       // landing-page view in last 24h

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

// Teammate domains we send to/from in operational threads. These addresses
// must NEVER appear as a lead in the digest — sending yourself a forwarded
// thread is not a sales reply.
const INTERNAL_DOMAINS = new Set([
  'getshortcut.co', 'shortcutwellness.com', 'shortcutcorporate.com',
  'shortcutpros.com', 'shortcutpartnership.com', 'shortcutexperience.com',
  'shortcutcorpwellness.com',
]);
const isInternalEmail = (email) => {
  const d = lc(email)?.split('@')[1]?.replace(/^www\./, '');
  return d ? INTERNAL_DOMAINS.has(d) : true;
};

// Pull a clean handwritten personal-note display:
//   1. strip the [date · author] stamp
//   2. cut at the "Auto-created from..." sentinel (those are import-bot lines)
//   3. take only the first line/paragraph (avoid newlines breaking Slack italics)
//   4. trim + cap length so the bullet stays one line in Slack
function extractPersonalNote(notes) {
  if (!notes) return null;
  let s = String(notes);
  s = s.replace(/^\[[^\[\]]*·[^\[\]]*\]\s*/, '');     // strip leading stamp
  s = s.split(/Auto-created from /i)[0];              // drop importer sentinel
  s = s.split(/[\r\n]+/)[0].trim();                   // first line only
  if (!s) return null;
  // Pure-stub notes ("Booth conversation:" with nothing else) are noise
  if (/^Booth conversation:?\s*$/i.test(s)) return null;
  return s.slice(0, 130) + (s.length > 130 ? '…' : '');
}

// Parse "[May 4, 11:06 AM · Will] ..." → ISO timestamp of when the note was
// created. Used to gate which sends count as "real" outreach touches —
// anything BEFORE the note was operational (e.g. booth logistics), not
// a sales touch, and shouldn't show as "due for follow-up". Matches
// followups.js semantics.
function parseNoteTimestamp(notes) {
  if (!notes) return null;
  const m = String(notes).match(/\[([^\[\]·]+?)·[^\[\]]*\]/);
  if (!m) return null;
  let s = m[1].trim().replace(/\bat\s+/i, '').trim();
  if (!/\d{4}/.test(s)) s = s.replace(/(\d{1,2})(,?)\s+(\d{1,2}:\d{2})/, `$1 ${new Date().getFullYear()} $3`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function slackPost(method, body, token) {
  const r = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) console.error(`Slack ${method} error:`, j.error, j.response_metadata || '');
  return j;
}

// Compute the rep's local hour + weekday from a tz string. Used to decide
// "fire only if it's currently 8am Mon-Fri in their tz".
function repLocalNow(tz) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', hour12: false, weekday: 'short',
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return { hour: Number(parts.hour), weekday: parts.weekday }; // weekday e.g. 'Mon'
  } catch {
    return { hour: NaN, weekday: '?' };
  }
}

async function buildSectionsForRep(sb, acct) {
  const myEmail = lc(acct.email);
  const assignee = assigneeForGmail(myEmail);
  const now = Date.now();
  const muted = new Set((acct.muted_lead_emails || []).map(lc));

  // Pull workhuman personal-note leads assigned to this rep (any with notes set).
  const { data: whAll } = await sb.from('workhuman_leads')
    .select('id, email, name, company, tier, tier_1a, tier_1b, notes, outreach_status, assigned_to, landing_page_url, page_view_count, page_last_viewed_at')
    .eq('assigned_to', assignee).not('notes', 'is', null);
  // Must have a real [date · author] stamp AND not be muted AND not be ourselves.
  const PERSONAL_NOTE_RE = /\[[^\[\]]*·[^\[\]]*\]/;
  const wh = (whAll || []).filter((w) =>
    PERSONAL_NOTE_RE.test(w.notes || '')
    && !muted.has(lc(w.email))
    && !isInternalEmail(w.email)
  );
  const whByEmail = new Map(wh.map((w) => [lc(w.email), w]));
  const noteTsByEmail = new Map();
  for (const w of wh) {
    const ts = parseNoteTimestamp(w.notes);
    if (ts) noteTsByEmail.set(lc(w.email), ts);
  }

  // All sends by this rep in the last 60 days — for state + days_since.
  const cutoff60 = new Date(now - 60 * 86400000).toISOString();
  const { data: mySends } = await sb.from('outreach_sends')
    .select('email, sent_time, reply_time, sender_email, thread_id, message_id, campaign_id')
    .eq('sender_email', myEmail).gte('sent_time', cutoff60);

  // Aggregate per email: latest send + any_reply. Drop the rep themselves +
  // any other internal/teammate addresses — emailing yourself or a teammate
  // is not a sales touch and must never appear in the digest.
  const aggByEmail = new Map();
  for (const s of (mySends || [])) {
    const k = lc(s.email);
    if (!k || muted.has(k) || isInternalEmail(k)) continue;
    const cur = aggByEmail.get(k) || { latest: null, any_reply: false };
    if (s.reply_time) cur.any_reply = true;
    if (s.sent_time && (!cur.latest || s.sent_time > cur.latest.sent_time)) cur.latest = s;
    aggByEmail.set(k, cur);
  }
  // Catch replies that landed in outreach_replies without a reply_time on sends.
  const targetEmails = [...new Set([...whByEmail.keys(), ...aggByEmail.keys()])];
  if (targetEmails.length) {
    for (let i = 0; i < targetEmails.length; i += 200) {
      const slice = targetEmails.slice(i, i + 200);
      const { data: reps } = await sb.from('outreach_replies')
        .select('email, reply_date').in('email', slice);
      for (const r of (reps || [])) {
        const k = lc(r.email); if (!k) continue;
        const cur = aggByEmail.get(k) || { latest: null, any_reply: false };
        cur.any_reply = true;
        if (r.reply_date && (!cur.latest || r.reply_date > (cur.latest.sent_time || ''))) {
          // Don't overwrite latest send — just track the reply date for sorting.
          cur.latest_reply_at = cur.latest_reply_at && r.reply_date <= cur.latest_reply_at ? cur.latest_reply_at : r.reply_date;
        }
        aggByEmail.set(k, cur);
      }
    }
  }

  // ----- Hot replies: replied in last 48h -----
  const hotReplies = [];
  const hotCutoff = new Date(now - HOT_REPLY_WINDOW_H * 3600000).getTime();
  for (const [email, agg] of aggByEmail) {
    if (!agg.any_reply) continue;
    const replyT = agg.latest_reply_at || (agg.latest?.reply_time);
    if (!replyT) continue;
    if (new Date(replyT).getTime() < hotCutoff) continue;
    const wh = whByEmail.get(email);
    hotReplies.push({
      email, name: wh?.name || null, company: wh?.company || null,
      reply_at: replyT, hours_ago: Math.floor((now - new Date(replyT).getTime()) / 3600000),
    });
  }
  hotReplies.sort((a, b) => new Date(b.reply_at).getTime() - new Date(a.reply_at).getTime());

  // ----- Due for follow-up: no reply, >=4d since last send, AND if this is
  //       a personal-note lead, only count sends AFTER the note was created.
  //       Pre-note threads (e.g. Anna Maria's booth-logistics emails) were
  //       operational, not sales outreach, and shouldn't push the rep to
  //       "follow up". Matches followups.js semantics.
  const due = [];
  for (const [email, agg] of aggByEmail) {
    if (agg.any_reply) continue;
    if (!agg.latest?.sent_time) continue;
    const noteTs = noteTsByEmail.get(email);
    if (noteTs && agg.latest.sent_time < noteTs) continue;   // pre-note touch
    const days = Math.floor((now - new Date(agg.latest.sent_time).getTime()) / 86400000);
    if (days < FOLLOWUP_MIN_DAYS) continue;
    const wh = whByEmail.get(email);
    due.push({ email, name: wh?.name || null, company: wh?.company || null, days });
  }
  due.sort((a, b) => b.days - a.days);

  // ----- Enrich missing name/company from outreach_contacts for any
  //       hot-reply or due-for-followup item that didn't match a Workhuman
  //       lead. (Personal Gmail contacts like pmkmsw@gmail.com otherwise
  //       render as raw email strings, which is useless.)
  const needsEnrich = new Set([
    ...hotReplies.filter((r) => !r.name).map((r) => r.email),
    ...due.filter((r) => !r.name).map((r) => r.email),
  ]);
  if (needsEnrich.size > 0) {
    const emails = [...needsEnrich];
    for (let i = 0; i < emails.length; i += 200) {
      const slice = emails.slice(i, i + 200);
      const [{ data: oc }, { data: ap }] = await Promise.all([
        sb.from('outreach_contacts').select('email, name, company').in('email', slice),
        sb.from('apollo_person_cache').select('email, name, company').in('email', slice),
      ]);
      const ocMap = new Map((oc || []).map((r) => [lc(r.email), r]));
      const apMap = new Map((ap || []).map((r) => [lc(r.email), r]));
      const apply = (row) => {
        if (row.name) return;
        const e = lc(row.email);
        const o = ocMap.get(e); const a = apMap.get(e);
        row.name = o?.name || a?.name || null;
        row.company = row.company || o?.company || a?.company || null;
      };
      hotReplies.forEach(apply);
      due.forEach(apply);
    }
  }

  // ----- Never emailed personal notes -----
  const neverEmailed = [];
  for (const w of wh) {
    const emailed = aggByEmail.has(lc(w.email));
    if (emailed) continue;
    const tier = w.tier_1a ? '1A' : w.tier_1b ? '1B' : (w.tier || '').replace('tier_', '');
    const noteText = extractPersonalNote(w.notes);
    if (!noteText) continue;   // skip pure-stub rows (no real handwritten note)
    neverEmailed.push({ email: w.email, name: w.name, company: w.company, tier, note: noteText });
  }

  // ----- Landing page views: page_view_count > 0 AND viewed in last 24h -----
  const lpViews = [];
  const lpCutoff = new Date(now - LP_VIEW_WINDOW_H * 3600000).getTime();
  for (const w of wh) {
    if (!w.page_view_count) continue;
    if (!w.page_last_viewed_at) continue;
    if (new Date(w.page_last_viewed_at).getTime() < lpCutoff) continue;
    lpViews.push({ email: w.email, name: w.name, company: w.company, views: w.page_view_count, last: w.page_last_viewed_at });
  }
  lpViews.sort((a, b) => new Date(b.last).getTime() - new Date(a.last).getTime());

  return { hotReplies, neverEmailed, due, lpViews };
}

function formatDigest(rep, sec) {
  const today = new Intl.DateTimeFormat('en-US', { timeZone: rep.tz, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const lines = [`:wave: Morning${rep.assignee_first ? ' ' + rep.assignee_first : ''}. Here's ${today}.`];

  if (sec.hotReplies.length) {
    lines.push('', `:fire: *Replied in last ${HOT_REPLY_WINDOW_H}h (${sec.hotReplies.length})*`);
    for (const h of sec.hotReplies.slice(0, SECTION_MAX)) {
      const who = [h.name, h.company].filter(Boolean).join(' · ') || h.email;
      lines.push(`  • *${who}* — replied ${h.hours_ago}h ago`);
    }
    if (sec.hotReplies.length > SECTION_MAX) lines.push(`  _+${sec.hotReplies.length - SECTION_MAX} more_`);
  }

  if (sec.neverEmailed.length) {
    lines.push('', `:sparkles: *Personal notes — never emailed (${sec.neverEmailed.length})*`);
    for (const n of sec.neverEmailed.slice(0, SECTION_MAX)) {
      const who = [n.name, n.company].filter(Boolean).join(' · ') || n.email;
      const tier = n.tier ? ` _Tier ${n.tier}_` : '';
      const note = n.note ? `\n     _"${n.note}${n.note.length >= 110 ? '…' : ''}"_` : '';
      lines.push(`  • *${who}*${tier}${note}`);
    }
    if (sec.neverEmailed.length > SECTION_MAX) lines.push(`  _+${sec.neverEmailed.length - SECTION_MAX} more_`);
  }

  if (sec.due.length) {
    lines.push('', `:hourglass: *Due for follow-up (${sec.due.length})*`);
    for (const d of sec.due.slice(0, SECTION_MAX)) {
      const who = [d.name, d.company].filter(Boolean).join(' · ') || d.email;
      lines.push(`  • *${who}* — ${d.days}d since last send`);
    }
    if (sec.due.length > SECTION_MAX) lines.push(`  _+${sec.due.length - SECTION_MAX} more_`);
  }

  if (sec.lpViews.length) {
    lines.push('', `:eyes: *Landing page views — last ${LP_VIEW_WINDOW_H}h (${sec.lpViews.length})*`);
    for (const v of sec.lpViews.slice(0, SECTION_MAX)) {
      const who = [v.name, v.company].filter(Boolean).join(' · ') || v.email;
      lines.push(`  • *${who}* — ${v.views} total view${v.views === 1 ? '' : 's'}`);
    }
  }

  // If literally nothing matched, return null so we don't DM an empty digest.
  const totalItems = sec.hotReplies.length + sec.neverEmailed.length + sec.due.length + sec.lpViews.length;
  if (totalItems === 0) return null;

  lines.push('', '_Tip: open /sales-intelligence in browser for the full picture, or @Pro me here._');
  return lines.join('\n');
}

async function sendDigest(sb, token, acct, repLocalHour, force = false) {
  const sec = await buildSectionsForRep(sb, acct);
  const text = formatDigest({
    tz: acct.tz, assignee_first: assigneeForGmail(acct.email)?.split(' ')[0] || '',
  }, sec);
  if (!text) return { skipped: 'empty', email: acct.email };

  // Open DM → post message.
  const open = await slackPost('conversations.open', { users: acct.slack_user_id }, token);
  if (!open.ok) return { error: 'conversations.open failed', detail: open.error, email: acct.email };
  const channel = open.channel?.id;
  const post = await slackPost('chat.postMessage', { channel, text, unfurl_links: false, unfurl_media: false }, token);
  if (!post.ok) return { error: 'chat.postMessage failed', detail: post.error, email: acct.email };

  if (!force) {
    await sb.from('gmail_accounts')
      .update({ digest_last_sent_at: new Date().toISOString() })
      .eq('email', acct.email);
  }
  return { sent: true, email: acct.email, items: text.split('\n').filter((l) => l.startsWith('  • ')).length };
}

export const handler = async (event) => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.PRO_SLACK_BOT_TOKEN;
  if (!url || !key || !token) return { statusCode: 500, body: 'misconfigured (need SUPABASE + PRO_SLACK_BOT_TOKEN)' };

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Manual fire (HTTP POST with { force: true, only?: 'will@...' }) for testing.
  // Useful before tomorrow's first real cron run — lets Will fire one now.
  const isManual = event?.httpMethod === 'POST';
  let manualBody = null;
  if (isManual) { try { manualBody = JSON.parse(event.body || '{}'); } catch { manualBody = {}; } }

  let q = sb.from('gmail_accounts')
    .select('email, slack_user_id, tz, digest_enabled, digest_skip_weekends, digest_last_sent_at, muted_until, muted_lead_emails')
    .not('slack_user_id', 'is', null).eq('digest_enabled', true);
  if (manualBody?.only) q = q.eq('email', manualBody.only);
  const { data: accounts, error } = await q;
  if (error) return { statusCode: 500, body: `query: ${error.message}` };

  const now = Date.now();
  const results = [];
  for (const a of (accounts || [])) {
    // Globally snoozed?
    if (!manualBody?.force && a.muted_until && new Date(a.muted_until).getTime() > now) {
      results.push({ skipped: 'snoozed', email: a.email, until: a.muted_until });
      continue;
    }
    const local = repLocalNow(a.tz || 'America/New_York');
    const isTargetHour = local.hour === 8;
    const isWeekend = local.weekday === 'Sat' || local.weekday === 'Sun';
    if (!manualBody?.force) {
      if (!isTargetHour) { results.push({ skipped: 'not_8am_local', email: a.email, local }); continue; }
      if (a.digest_skip_weekends && isWeekend) { results.push({ skipped: 'weekend', email: a.email }); continue; }
      if (a.digest_last_sent_at && (now - new Date(a.digest_last_sent_at).getTime()) < 18 * 3600 * 1000) {
        results.push({ skipped: 'already_sent_today', email: a.email, last: a.digest_last_sent_at });
        continue;
      }
    }
    try {
      const r = await sendDigest(sb, token, a, local.hour, !!manualBody?.force);
      results.push(r);
    } catch (e) {
      results.push({ error: e.message, email: a.email });
    }
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true, results }) };
};
