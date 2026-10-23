/**
 * Shared by sponsor-call-slots.js and sponsor-call-book.js: which page the
 * visitor is on, who it is sent from, and when that person is free.
 *
 * The page is read through get_sponsor_page, the same RPC the page itself
 * loads from, with the password the visitor unlocked it with. So the calendar
 * of a password-protected page is only reachable by someone who has the
 * password, and a draft page has no calendar at all.
 */
import { createClient } from '@supabase/supabase-js';
import { hostFor } from './call-hours.js';
import { freeBusy } from './gcal.js';
import { busyMs, isFree, candidateSlots, querySpan } from './call-slots.js';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const json = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export const str = (v, max = 300) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

/**
 * { page, host } for an unlocked, published page whose teammate can take
 * calls, or { error, status } for the response to send instead.
 */
export async function pageAndHost(slug, password) {
  const s = str(slug, 80).toLowerCase();
  if (!SLUG_RE.test(s)) return { status: 400, error: 'page' };
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 503, error: 'not configured' };
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('get_sponsor_page', { p_slug: s, p_password: str(password, 200) || null });
  if (error) {
    console.error('sponsor call page', error.message);
    return { status: 502, error: 'page' };
  }
  if (!data) return { status: 404, error: 'page' };
  if (data.locked) return { status: 403, error: 'locked' };
  const host = hostFor(data.contact_email);
  /* A page sent from someone off the team has no calendar to offer. The
     sheet shows its email line instead. */
  if (!host) return { status: 409, error: 'no host' };
  return { page: { slug: s, ...data }, host };
}

/**
 * The host's busy times, or null when their calendar cannot be read: a token
 * refused, a Google error, a timeout. Unreadable is treated as unavailable,
 * never as free, so nobody is double-booked.
 */
export async function hostBusy(host, timeMin, timeMax) {
  try {
    return busyMs(await freeBusy(host.email, timeMin, timeMax));
  } catch (err) {
    console.error('calendar', err?.message);
    return null;
  }
}

/** Open starts on the host's calendar; `readable` false when it can't be seen. */
export async function openSlots(host, now = Date.now()) {
  const cands = candidateSlots(now);
  if (!cands.length) return { slots: [], readable: true };
  const { timeMin, timeMax } = querySpan(cands);
  const busy = await hostBusy(host, timeMin, timeMax);
  if (!busy) return { slots: [], readable: false };
  return { slots: cands.filter((c) => isFree(busy, c.start, c.end)), readable: true };
}
