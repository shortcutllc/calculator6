/**
 * The browser side of sponsor page call booking: load the open times on the
 * page's teammate's calendar, book one. Mirrors www's
 * composables/useCallBooking.js (shortcut repo).
 *
 * Server: netlify/functions/sponsor-call-slots.js and sponsor-call-book.js.
 * Rules (hours, notice, who can host): netlify/functions/lib/call-hours.js,
 * server side only.
 */

export interface CallSlot {
  /** ms */
  start: number;
  /** 'YYYY-MM-DD', Eastern. */
  day: string;
}

export interface CallLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  notes: string;
  /** The visitor's choices in the pricing section: 'Package: Signature'. */
  picked: string[];
}

export type BookResult =
  | { status: 'booked'; start: number; host: string; meet: string }
  | { status: 'already'; start: number }
  | { status: 'taken'; slots: CallSlot[] }
  | { status: 'error' };

const FN = '/.netlify/functions';

export function normaliseSlots(list: unknown): CallSlot[] {
  return (Array.isArray(list) ? list : [])
    .map((s: { start?: unknown; day?: unknown }) => ({
      start: typeof s?.start === 'number' ? s.start : Date.parse(String(s?.start ?? '')),
      day: String(s?.day || ''),
    }))
    .filter((s) => Number.isFinite(s.start) && s.day);
}

/** Open times on the page's teammate's calendar. Throws if it can't be read. */
export async function loadSponsorCallSlots(slug: string, password?: string): Promise<CallSlot[]> {
  const res = await fetch(`${FN}/sponsor-call-slots`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ slug, password: password || '' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return normaliseSlots((await res.json()).slots);
}

/** Book `start` (ms) for `lead`. Never throws. */
export async function bookSponsorCall(slug: string, password: string | undefined, lead: CallLead, start: number): Promise<BookResult> {
  try {
    const res = await fetch(`${FN}/sponsor-call-book`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, password: password || '', start: new Date(start).toISOString(), ...lead }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { status: 'booked', start: Date.parse(data.start), host: data.host || '', meet: data.meet || '' };
    if (res.status === 409 && data.error === 'already') return { status: 'already', start: Date.parse(data.start) };
    if (res.status === 409 && data.error === 'taken') return { status: 'taken', slots: normaliseSlots(data.slots) };
    console.error('sponsor call book', res.status, data.error);
  } catch (e) {
    console.error('sponsor call book', e);
  }
  return { status: 'error' };
}

const tidy = (s: string) => s.replace(' AM', ' am').replace(' PM', ' pm');

/** 'Friday, October 9 at 10:15 am EDT', in the visitor's zone. */
export function callWhen(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  return tidy(new Date(ms).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }));
}
