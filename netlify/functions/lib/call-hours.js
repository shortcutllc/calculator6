/**
 * When a sponsor page visitor can book a call, and with whom (Will, 2026-10-22).
 *
 * The same rules as the intro-call picker on www.getshortcut.co (shortcut
 * repo, frontend/data/call-hours.js): every 15-minute start from 9:00 am to
 * 4:45 pm Eastern, Monday to Friday, at least 2 hours out, up to 14 days
 * ahead, with 5 minutes clear either side of the host's other meetings. KEEP
 * THE TWO IN STEP, the closed dates above all: Google Calendar does not mark
 * holidays busy, so a day off left out here is offered to visitors.
 *
 * The difference: the website gives each call to whichever of its hosts is
 * free, in turn. A sponsor page has ONE host, the teammate it is sent from
 * (sponsor_pages.contact_email), and books on their calendar only.
 *
 * Every host must be a Google Workspace account on getshortcut.co. The site
 * reads and writes their calendar through the website's `site-call-booking`
 * service account and its domain-wide delegation (lib/gcal.js). A host that
 * is not in CALL_HOSTS is never asked: the service account can act as anyone
 * in the domain, so the list is the guard.
 */
export const CALL_TZ = 'America/New_York';

/** Who a sponsor page can be sent from. Matches ACCOUNT_TEAM in
 *  src/components/proposal/sidebar/AccountTeamCard.tsx. */
export const CALL_HOSTS = [
  { name: 'Will Newton', email: 'will@getshortcut.co' },
  { name: 'Jaimie Pritchard', email: 'jaimie@getshortcut.co' },
  { name: 'Marc Levitan', email: 'marc@getshortcut.co' },
  { name: 'Caren Skutch', email: 'caren@getshortcut.co' },
];

/** ISO weekdays: 1 = Monday … 7 = Sunday. */
export const CALL_WEEKDAYS = [1, 2, 3, 4, 5];
/** First and last START times, Eastern. The last call ends at 5:00 pm. */
export const CALL_FIRST_START = '09:00';
export const CALL_LAST_START = '16:45';
export const CALL_MINUTES = 15;
/** No call sooner than this after the visitor books. */
export const CALL_NOTICE_MINUTES = 120;
/** Clear time kept either side of a host's other meetings and calls. */
export const CALL_BUFFER_MINUTES = 5;
/** How far ahead a visitor can book, in calendar days counting today. */
export const CALL_WINDOW_DAYS = 14;

export const CALL_CLOSED_DATES = [
  '2026-11-26', '2026-11-27', // Thanksgiving
  '2026-12-24', '2026-12-25', // Christmas
  '2026-12-31', '2027-01-01', // New Year
  '2027-01-18', // Martin Luther King Jr. Day
  '2027-02-15', // Presidents' Day
];

export const hostFor = (email) =>
  CALL_HOSTS.find((h) => h.email === String(email || '').trim().toLowerCase()) || null;
