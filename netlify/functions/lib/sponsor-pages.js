/**
 * Conference partner pages (/sponsor/:slug) on the server: the one place Pro,
 * the HTTP API and the MCP endpoint create, edit and read them.
 *
 * Same rules as the staff screen (src/components/SponsorPagesManager.tsx and
 * src/services/sponsorPageService.ts):
 *   - The link is made from the conference name when the page is created,
 *     with -2, -3... when taken, and never changes, so a sent link keeps
 *     working.
 *   - A page is sent from a teammate in CALL_HOSTS. Their name is on the
 *     page's buttons and visitors book calls on their Google Calendar.
 *   - Stations are ids from src/utils/sponsorPackages.ts. All of them is
 *     stored as NULL.
 *   - Passwords are written as plain text to `new_password`; a trigger
 *     hashes them. '' removes the password.
 *
 * Everything else on the page (the copy, pricing, photos) is shared across
 * conferences in SponsorOnePager.tsx. These fields are facts, never copy.
 */
import { CALL_HOSTS, hostFor } from './call-hours.js';
import { storeProvidedLogo } from './logo-fetcher.js';

export const SPONSOR_PAGE_BASE_URL = 'https://proposals.getshortcut.co/sponsor';

/** KEEP IN STEP with SPONSOR_SERVICES in src/utils/sponsorPackages.ts. */
export const SPONSOR_STATIONS = [
  { id: 'reset', name: 'The Massage Wellness Zone', what: 'chair massage', words: ['massage'] },
  { id: 'glow', name: 'The Glow Lounge', what: 'hair, shaves, makeup or facials', words: ['hair', 'barber', 'shave', 'makeup', 'facial', 'salon', 'beauty'] },
  { id: 'polish', name: 'The Polish Bar', what: 'express manicures', words: ['nail', 'manicure', 'mani'] },
  { id: 'studio', name: 'The Studio', what: 'headshots', words: ['headshot', 'photo'] },
  { id: 'mindful', name: 'The Mindful Reset', what: 'guided practices and workshops', words: ['mindful', 'meditation', 'breath'] },
  { id: 'sound', name: 'The Sound Sanctuary', what: 'crystal sound baths', words: ['sound'] },
  { id: 'movement', name: 'The Movement Studio', what: 'group classes', words: ['movement', 'yoga', 'stretch', 'fitness', 'class'] },
];
const STATION_IDS = SPONSOR_STATIONS.map((s) => s.id);

export class SponsorPageError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

/** 'The Deans Conference 2026' -> 'the-deans-conference-2026'.
 *  The same as slugify() in src/services/sponsorPageService.ts. */
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

const clean = (v, max = 200) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);
const urlFor = (slug) => `${SPONSOR_PAGE_BASE_URL}/${slug}`;

/** A station id from an id, a name ('The Polish Bar') or a plain word ('nails'). */
function stationId(value) {
  const v = clean(value).toLowerCase();
  if (!v) return null;
  const exact = SPONSOR_STATIONS.find((s) => s.id === v || s.name.toLowerCase() === v || s.name.toLowerCase() === `the ${v}`);
  if (exact) return exact.id;
  const byWord = SPONSOR_STATIONS.find((s) => s.words.some((w) => v.includes(w)));
  return byWord ? byWord.id : null;
}

/** Station ids in page order, or null for all of them. Throws on a name it
 *  can't place, listing what it can. */
export function resolveStations(value) {
  if (value == null || value === 'all') return null;
  const list = Array.isArray(value) ? value : String(value).split(',');
  if (list.length === 1 && clean(list[0]).toLowerCase() === 'all') return null;
  const ids = new Set();
  const unknown = [];
  for (const item of list) {
    const id = stationId(item);
    if (id) ids.add(id);
    else if (clean(item)) unknown.push(clean(item));
  }
  if (unknown.length) {
    const menu = SPONSOR_STATIONS.map((s) => `${s.id} (${s.name}: ${s.what})`).join(', ');
    throw new SponsorPageError(`Unknown station: ${unknown.join(', ')}. Pick from ${menu}, or "all".`);
  }
  if (!ids.size) throw new SponsorPageError('Pick at least one station, or "all".');
  const ordered = STATION_IDS.filter((id) => ids.has(id));
  return ordered.length === STATION_IDS.length ? null : ordered;
}

/** The teammate a page is sent from, by email, first name or full name. */
export function resolveSender(value) {
  const v = clean(value).toLowerCase();
  if (!v) return null;
  const host = hostFor(v)
    || CALL_HOSTS.find((h) => h.name.toLowerCase() === v || h.name.split(' ')[0].toLowerCase() === v);
  if (!host) {
    throw new SponsorPageError(
      `A sponsor page is sent from ${CALL_HOSTS.map((h) => h.name.split(' ')[0]).join(', ')}: their name is on its buttons and calls book on their calendar. "${clean(value)}" isn't one of them.`
    );
  }
  return host;
}

/** What callers see. The password hash never leaves this module. */
function toPage(r) {
  return {
    id: r.id,
    slug: r.slug,
    url: urlFor(r.slug),
    conferenceName: r.conference_name,
    organizerName: r.organizer_name,
    dateLabel: r.date_label || '',
    sentFrom: { name: r.contact_name, email: r.contact_email },
    stations: Array.isArray(r.services) && r.services.length ? r.services : 'all',
    logoUrl: r.logo_url || null,
    hasPassword: !!r.password_hash,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function storedLogo(supabase, logoUrl, organizerName) {
  const url = clean(logoUrl, 2000);
  if (!url) return null;
  if (!/^https:\/\//i.test(url)) throw new SponsorPageError('logoUrl must be an https link to an image.');
  try {
    // A copy in client-logos, so the page doesn't break if their site moves the file.
    const { logoUrl: stored } = await storeProvidedLogo(supabase, url, organizerName);
    return stored || url;
  } catch (err) {
    console.warn('sponsor logo copy failed, using the link given:', err.message);
    return url;
  }
}

function dbFail(error) {
  const msg = error?.message || 'Database error';
  if (error?.code === '42P01' || error?.code === 'PGRST205' || /does not exist|could not find the/i.test(msg)) {
    throw new SponsorPageError('The sponsor_pages table is missing. Run 20260929000000_create_sponsor_pages.sql first.', 503);
  }
  throw new SponsorPageError(msg, 500);
}

const STATUSES = new Set(['draft', 'published']);

/**
 * Creates a page and returns it. `input`: conferenceName and organizerName
 * (required), dateLabel, sentFrom (falls back to `defaultSender`), stations,
 * logoUrl, password, status ('published' unless 'draft').
 */
export async function createSponsorPage(supabase, userId, input = {}, { defaultSender } = {}) {
  const conferenceName = clean(input.conferenceName);
  const organizerName = clean(input.organizerName);
  const missing = [!conferenceName && 'conferenceName', !organizerName && 'organizerName'].filter(Boolean);
  if (missing.length) throw new SponsorPageError(`${missing.join(' and ')} required.`);

  // The caller is the default only when they are one of the hosts.
  const sender = resolveSender(input.sentFrom) || hostFor(defaultSender);
  if (!sender) {
    throw new SponsorPageError(`Who is the page sent from? One of ${CALL_HOSTS.map((h) => h.name).join(', ')}.`);
  }
  const status = input.status == null ? 'published' : clean(input.status).toLowerCase();
  if (!STATUSES.has(status)) throw new SponsorPageError('status is "published" or "draft".');

  const row = {
    // The page shows the logo, or else this, beside the Shortcut logo.
    organizer_mark: organizerName,
    organizer_name: organizerName,
    conference_name: conferenceName,
    date_label: clean(input.dateLabel, 80),
    contact_name: sender.name,
    contact_email: sender.email,
    services: resolveStations(input.stations),
    logo_url: await storedLogo(supabase, input.logoUrl, organizerName),
    status,
    created_by: userId || null,
  };
  const password = clean(input.password, 200);
  if (password) row.new_password = password;

  const base = slugify(conferenceName) || 'conference';
  for (let n = 1; n <= 20; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await supabase.from('sponsor_pages').insert({ ...row, slug }).select('*').single();
    if (!error) return toPage(data);
    if (error.code !== '23505') dbFail(error);
  }
  throw new SponsorPageError(`Every link from ${base} to ${base}-20 is taken. Use a more specific conference name.`, 409);
}

/** The row for an id, a slug, or a full page link. */
async function findRow(supabase, ref) {
  const raw = clean(ref, 300);
  if (!raw) throw new SponsorPageError('Say which page: its id, its link, or the slug after /sponsor/.', 400);
  const slug = raw.includes('/sponsor/') ? raw.split('/sponsor/')[1].split(/[?#/]/)[0] : raw;
  const column = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) ? 'id' : 'slug';
  const { data, error } = await supabase
    .from('sponsor_pages')
    .select('*')
    .eq(column, column === 'slug' ? slug.toLowerCase() : slug)
    .maybeSingle();
  if (error) dbFail(error);
  if (!data) throw new SponsorPageError(`No sponsor page matches "${raw}".`, 404);
  return data;
}

export async function getSponsorPage(supabase, ref) {
  return toPage(await findRow(supabase, ref));
}

/** Pages, newest first, optionally matching a conference or organizer name. */
export async function listSponsorPages(supabase, { search, limit = 20 } = {}) {
  let q = supabase.from('sponsor_pages').select('*').order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 100));
  const term = clean(search, 80).replace(/[%,()]/g, ' ').trim();
  if (term) q = q.or(`conference_name.ilike.%${term}%,organizer_name.ilike.%${term}%,slug.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) dbFail(error);
  return data.map(toPage);
}

/**
 * Changes the fields given and returns the page with what changed. The link
 * never changes, even when the conference name does. password: '' removes it.
 */
export async function updateSponsorPage(supabase, ref, changes = {}) {
  const existing = await findRow(supabase, ref);
  const row = {};
  const changed = [];
  const has = (k) => Object.prototype.hasOwnProperty.call(changes, k) && changes[k] !== undefined;

  if (has('conferenceName')) {
    const v = clean(changes.conferenceName);
    if (!v) throw new SponsorPageError('conferenceName cannot be empty.');
    row.conference_name = v;
    changed.push('conference name (the link stays the same)');
  }
  if (has('organizerName')) {
    const v = clean(changes.organizerName);
    if (!v) throw new SponsorPageError('organizerName cannot be empty.');
    row.organizer_name = v;
    row.organizer_mark = v;
    changed.push('organizer name');
  }
  if (has('dateLabel')) {
    row.date_label = clean(changes.dateLabel, 80);
    changed.push('dates');
  }
  if (has('sentFrom')) {
    const host = resolveSender(changes.sentFrom);
    if (!host) throw new SponsorPageError('sentFrom cannot be empty.');
    row.contact_name = host.name;
    row.contact_email = host.email;
    changed.push(`sent from ${host.name}`);
  }
  if (has('stations')) {
    row.services = resolveStations(changes.stations);
    changed.push('stations');
  }
  if (has('logoUrl')) {
    row.logo_url = await storedLogo(supabase, changes.logoUrl, row.organizer_name || existing.organizer_name);
    changed.push(row.logo_url ? 'logo' : 'logo removed');
  }
  if (has('password')) {
    // '' removes the password; the trigger hashes anything else.
    row.new_password = clean(changes.password, 200);
    changed.push(row.new_password ? 'password set' : 'password removed');
  }
  if (has('status')) {
    const v = clean(changes.status).toLowerCase();
    if (!STATUSES.has(v)) throw new SponsorPageError('status is "published" or "draft".');
    row.status = v;
    changed.push(v);
  }
  if (!changed.length) throw new SponsorPageError('Nothing to change. Pass at least one field.');

  const { data, error } = await supabase.from('sponsor_pages').update(row).eq('id', existing.id).select('*').single();
  if (error) dbFail(error);
  return { page: toPage(data), changed };
}
