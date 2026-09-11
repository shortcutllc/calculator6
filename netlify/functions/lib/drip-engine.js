/**
 * drip-engine.js — the sending brain for rep-owned nurture drips sent from the
 * rep's OWN Gmail, outside Smartlead.
 *
 * WHY THIS EXISTS: Smartlead is a shared, account-level tool with a global block
 * list and its own reply detection. A drip from a rep's real mailbox on the
 * PRIMARY domain (the one that also carries proposals and invoices) needs
 * stricter guarantees than a sacrificial cold domain does. Everything here is
 * built so that the worst case is "nothing sends", never "something sent to
 * someone who asked us to stop".
 *
 * THE PROTECTIONS, and why each one is here:
 *
 *  1. LIVE THREAD READ before every touch. Not a cached reply flag: we read the
 *     Gmail thread at send time and halt on any inbound. Fails CLOSED — an
 *     unreadable thread sends nothing. Borrowed from founder-followup, which has
 *     been running this way since July.
 *  2. REPLY / OOO / BOUNCE / UNSUB are classified separately. An out-of-office
 *     pauses and resumes; a bounce or an unsubscribe suppresses permanently.
 *     Treating an OOO as a reply silently kills good leads; treating it as
 *     silence emails a person who is on holiday.
 *  3. ONE-CLICK UNSUBSCRIBE on every send: List-Unsubscribe plus
 *     List-Unsubscribe-Post (RFC 8058), which is what Gmail and Yahoo's bulk
 *     sender rules require, alongside a visible link and a postal address in the
 *     footer for CAN-SPAM. The runner REFUSES to send if either is unconfigured.
 *  4. SUPPRESSION is checked against crm_suppression on every tick, so an
 *     opt-out anywhere in the system stops this drip too.
 *  5. RAMP. A mailbox that has been sending 15/day does not jump to 80. The cap
 *     starts at ramp_start and steps up per sending day.
 *  6. PER-DOMAIN THROTTLE. No more than a couple of messages to the same
 *     recipient domain per day, so one company's mail server never sees a burst.
 *  7. JITTER. Sends are spaced by a randomised gap, never a fixed metronome.
 *  8. SPINTAX, so no two recipients receive byte-identical text.
 *  9. BUSINESS HOURS ONLY in the rep's timezone, weekdays by default.
 * 10. DRY RUN IS THE DEFAULT. Sending requires an explicit confirm.
 11. CIRCUIT BREAKER. If the bounce or unsubscribe rate over recent sends crosses
     a threshold, the campaign PAUSES ITSELF rather than grinding through the
     rest of the list. A bad list is the single fastest way to damage a domain,
     and this one also carries proposals and invoices.
 */

import crypto from 'node:crypto';
import { getThread, getMessageHeaders, bodyFromPayload, lc } from './gmail.js';
import { classify, cleanReply } from './sentiment.js';

export const DAY_MS = 86400000;

/** Touch cadence in days after touch 1. Index is the touch number. */
export const CADENCE = { 2: 3, 3: 8 };
export const LAST_TOUCH = 3;

/** No more than this many sends to one recipient domain per campaign per day. */
export const PER_DOMAIN_PER_DAY = 2;

/**
 * Circuit breaker thresholds, measured over the most recent MIN_SAMPLE contacted
 * leads. Deliberately tighter than the provider limits, because by the time a
 * provider reacts the damage is done:
 *   - Gmail/Yahoo enforce at a 0.3% SPAM COMPLAINT rate; under 0.1% is the target.
 *     We cannot see complaints without Postmaster Tools, so unsubscribe rate is
 *     the closest in-band proxy we have and the ceiling is set low.
 *   - A 2%+ bounce rate on a WARM list means the list is wrong, not unlucky:
 *     every one of these addresses was deliverable before.
 * MIN_SAMPLE stops a single early bounce (1 of 3 = 33%) tripping the breaker.
 */
export const BREAKER = {
  MIN_SAMPLE: 25,
  MAX_BOUNCE_RATE: 0.05,
  MAX_UNSUB_RATE: 0.03,
};

/**
 * Decide whether a campaign should stop sending. `counts` are over leads that
 * have actually been contacted. Returns { trip, reason } so the caller can log
 * and persist a human-readable cause.
 */
export function checkBreaker({ contacted, bounced, unsubscribed }) {
  if (contacted < BREAKER.MIN_SAMPLE) return { trip: false, reason: null };
  const bounceRate = bounced / contacted;
  const unsubRate = unsubscribed / contacted;
  if (bounceRate > BREAKER.MAX_BOUNCE_RATE) {
    return { trip: true, reason: `bounce rate ${(bounceRate * 100).toFixed(1)}% over ${contacted} sends exceeds ${(BREAKER.MAX_BOUNCE_RATE * 100)}%` };
  }
  if (unsubRate > BREAKER.MAX_UNSUB_RATE) {
    return { trip: true, reason: `unsubscribe rate ${(unsubRate * 100).toFixed(1)}% over ${contacted} sends exceeds ${(BREAKER.MAX_UNSUB_RATE * 100)}%` };
  }
  return { trip: false, reason: null };
}

const BOUNCE_FROM_RE = /(postmaster@|mailer-daemon|microsoftexchange\w*@|mail delivery (subsystem|system)|delivery status notification)/i;

// ---------------------------------------------------------------- spintax ----

/**
 * Resolve {a|b|c}, including nested blocks, using a seeded RNG so the same lead
 * always renders the same text. Deterministic matters: a retry after a network
 * error must not send a differently-worded email to someone who already got one.
 */
export function renderSpintax(text, seed = '') {
  let h = crypto.createHash('sha256').update(String(seed)).digest();
  let i = 0;
  const rnd = () => {
    if (i >= h.length) { h = crypto.createHash('sha256').update(h).digest(); i = 0; }
    return h[i++] / 256;
  };
  let out = String(text ?? '');
  let guard = 0;
  // innermost-first so nesting resolves correctly
  while (/\{[^{}]*\|[^{}]*\}/.test(out)) {
    if (++guard > 200) break;
    out = out.replace(/\{([^{}]*\|[^{}]*)\}/, (_, body) => {
      const opts = body.split('|');
      return opts[Math.floor(rnd() * opts.length)] ?? opts[0];
    });
  }
  return out;
}

/**
 * Replace {{field}} from the lead, with a fallback so a blank never ships.
 *
 * Substituted VALUES are stripped of { } | because merge runs before spintax
 * (see renderBody) and a company literally named "Smith | Jones" would otherwise
 * be parsed as a spin block and silently mangle the sentence.
 */
export function renderMerge(text, lead) {
  const f = {
    first_name: lead.first_name || 'there',
    last_name: lead.last_name || '',
    company_name: lead.company_name || 'your team',
    ...(lead.custom_fields || {}),
  };
  const safe = (v) => String(v).replace(/[{}|]/g, '').trim();
  return String(text ?? '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k) => {
    const v = f[k.toLowerCase()];
    return (v === undefined || v === null || v === '') ? '' : safe(v);
  });
}

/**
 * MERGE FIRST, THEN SPINTAX. Order is load-bearing: a spin block may contain a
 * merge token ("{and the {{company_name}} team|and everyone at {{company_name}}}"),
 * and the innermost-first spin matcher cannot match a block containing braces.
 * Spinning first left those blocks unresolved and shipped raw {a|b} to the
 * recipient. Merging first flattens them to plain text, so spintax then sees a
 * well-formed block.
 */
export function renderBody(template, lead) {
  return renderSpintax(renderMerge(template, lead), lc(lead.email)).replace(/[ \t]+\n/g, '\n').trim();
}

// ------------------------------------------------------------ compliance ----

/**
 * HMAC token so the unsubscribe endpoint can verify an opt-out without a lookup
 * and nobody can forge or enumerate one. Secret is DRIP_UNSUB_SECRET.
 */
export function unsubToken(email, campaignId, secret) {
  return crypto.createHmac('sha256', String(secret)).update(`${lc(email)}:${campaignId}`).digest('hex').slice(0, 32);
}

export function verifyUnsubToken(email, campaignId, token, secret) {
  const want = Buffer.from(unsubToken(email, campaignId, secret));
  const got = Buffer.from(String(token || ''));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

export function unsubscribeUrl(base, email, campaignId, secret) {
  const u = new URL(base);
  u.searchParams.set('e', lc(email));
  u.searchParams.set('c', campaignId);
  u.searchParams.set('t', unsubToken(email, campaignId, secret));
  return u.toString();
}

/**
 * The footer. Deliberately plain and small: it has to be unmistakably an opt-out
 * (CAN-SPAM requires it be "clear and conspicuous") without turning a personal
 * note into a marketing email.
 */
export function complianceFooter({ unsubUrl, postalAddress }) {
  return `<div style="margin-top:18px;padding-top:10px;border-top:1px solid #e5e5e5;font-family:Arial,sans-serif;font-size:11px;color:#888">`
    + `<a href="${unsubUrl}" style="color:#888">Unsubscribe</a> and I will not email you again.`
    + `<br>${escapeHtmlMin(postalAddress)}`
    + `</div>`;
}

function escapeHtmlMin(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Headers Gmail and Yahoo's bulk-sender rules expect. One-click, per RFC 8058. */
export function complianceHeaders({ unsubUrl, unsubMailto }) {
  const parts = [];
  if (unsubMailto) parts.push(`<mailto:${unsubMailto}?subject=unsubscribe>`);
  if (unsubUrl) parts.push(`<${unsubUrl}>`);
  return {
    'List-Unsubscribe': parts.join(', '),
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ------------------------------------------------------------- scheduling ----

/** Current hour and ISO weekday in an IANA timezone, without pulling in a tz lib. */
export function nowInZone(timezone, at = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const dow = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
  return { hour: Number(parts.hour) % 24, dow, date: `${parts.year}-${parts.month}-${parts.day}` };
}

export function withinSendWindow(campaign, at = new Date()) {
  const { hour, dow } = nowInZone(campaign.timezone || 'America/New_York', at);
  if (!(campaign.send_days || [1, 2, 3, 4, 5]).includes(dow)) return { ok: false, why: `not a send day (dow ${dow})` };
  if (hour < campaign.send_start_hour || hour >= campaign.send_end_hour) {
    return { ok: false, why: `outside ${campaign.send_start_hour}:00-${campaign.send_end_hour}:00 (now ${hour}:00)` };
  }
  return { ok: true };
}

/**
 * Today's cap. Ramps from ramp_start toward daily_cap by ramp_step per sending
 * day elapsed, so a mailbox that has been doing 15/day is not asked for 80 on
 * day one. `sendingDays` is how many distinct days this campaign has sent on.
 */
export function todaysCap(campaign, sendingDays) {
  const ramped = (campaign.ramp_start ?? 10) + (campaign.ramp_step ?? 5) * Math.max(0, sendingDays);
  return Math.max(1, Math.min(campaign.daily_cap ?? 25, ramped));
}

/** Randomised gap in ms, so sends never look like a metronome. */
export function jitterMs(capPerDay, campaign) {
  const windowMin = Math.max(1, (campaign.send_end_hour - campaign.send_start_hour)) * 60;
  const mean = (windowMin / Math.max(1, capPerDay)) * 60000;
  return Math.round(mean * (0.55 + Math.random() * 0.9));
}

// ------------------------------------------------------------------ halt ----

/**
 * Read the live thread and say what, if anything, came back. Only messages after
 * `sinceMs` count, so a resumed OOO pause ignores the OOO that is still sitting
 * in the thread. Statuses: silent | bounce | ooo | unsub | reply | unreadable.
 */
export async function classifyThread(token, threadId, sinceMs, repEmail) {
  if (!threadId) return { status: 'silent' };
  const t = await getThread(token, threadId).catch(() => null);
  if (!t || !Array.isArray(t.messages)) return { status: 'unreadable' };
  const others = [];
  for (const m of t.messages) {
    const from = lc((m.payload?.headers || []).find((h) => h.name?.toLowerCase() === 'from')?.value || '');
    const ms = m.internalDate ? Number(m.internalDate) : 0;
    if (from && !from.includes(lc(repEmail)) && ms > (sinceMs || 0)) others.push({ from, ms, m });
  }
  if (!others.length) return { status: 'silent' };
  if (others.some((o) => BOUNCE_FROM_RE.test(o.from))) {
    return { status: 'bounce', reason: 'mail-server bounce/NDR', msgMs: others[others.length - 1].ms };
  }
  const last = others[others.length - 1];
  const body = cleanReply(bodyFromPayload(last.m.payload));
  const c = classify(body);
  if (c.sentiment === 'ooo') return { status: 'ooo', reason: 'out-of-office', msgMs: last.ms, returnDate: parseReturnDate(body) };
  if (c.suppress) return { status: 'unsub', reason: c.reason || 'unsubscribe/negative', msgMs: last.ms };
  return { status: 'reply', reason: `inbound from ${last.from.slice(0, 40)}`, msgMs: last.ms };
}

export function parseReturnDate(text) {
  const M = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  const m = String(text || '').toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!m) return null;
  const mon = M[m[1]]; const day = parseInt(m[2], 10);
  if (mon == null || day < 1 || day > 31) return null;
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), mon, day, 13, 0, 0));
  if (d < now) d = new Date(Date.UTC(now.getUTCFullYear() + 1, mon, day, 13, 0, 0));
  if (d - now > 30 * DAY_MS) return null;
  return d.toISOString();
}

/** Which touch is due for this lead, or null. */
export function dueTouch(lead, at = new Date()) {
  const touches = Array.isArray(lead.touches) ? lead.touches : [];
  const n = touches.length;
  if (n === 0) return 1;
  if (n >= LAST_TOUCH) return null;
  const next = n + 1;
  const first = touches[0]?.sent_at;
  if (!first) return null;
  const age = (at.getTime() - new Date(first).getTime()) / DAY_MS;
  if (age < (CADENCE[next] ?? 999)) return null;
  // one touch per lead per day, whatever the backlog says
  const last = touches[touches.length - 1]?.sent_at;
  if (last && new Date(last).toDateString() === at.toDateString()) return null;
  return next;
}
