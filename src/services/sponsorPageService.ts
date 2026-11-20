import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as typedClient } from '../lib/supabaseClient';
import { SPONSOR_SERVICES, type SponsorServiceId } from '../utils/sponsorPackages';
import { SPONSOR_PAGES } from '../components/sponsor/sponsorPages';
import type {
  SponsorPageConfig, SponsorPageInput, SponsorPageRecord, SponsorDeckConfig, SponsorDeckDetails, DeckTierId,
} from '../types/sponsorPage';

/* ─────────────────────────────────────────────
   Conference partner pages (/sponsor/:slug), stored in `sponsor_pages`.
   Migration: supabase/migrations/20260929000000_create_sponsor_pages.sql.

   Staff read and write the table directly (RLS: any signed-in user). The
   public page never reads it; it calls get_sponsor_page(slug, password),
   which checks the password on the server.

   Until the migration is applied the public page falls back to the pages
   in code (sponsorPages.ts), so /sponsor/acme keeps working either way.
   ───────────────────────────────────────────── */

/* src/types/database.ts predates this table and no longer matches the
   installed supabase-js typings (every table resolves to never), so this
   service talks to an untyped client and maps rows itself. */
const supabase = typedClient as unknown as SupabaseClient;

export const SPONSOR_PAGES_MIGRATION = '20260929000000_create_sponsor_pages.sql';

type PgError = { code?: string; message?: string } | null;

/** True when the table or function has not been created yet. */
export function isMissingSchema(err: PgError): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42P01' || err.code === '42883' || err.code === 'PGRST202' || err.code === 'PGRST205' ||
    msg.includes('does not exist') || msg.includes('could not find the')
  );
}

const KNOWN = new Set(SPONSOR_SERVICES.map((s) => s.id));
function cleanServices(v: unknown): SponsorServiceId[] | null {
  if (!Array.isArray(v)) return null;
  const ids = v.filter((x): x is SponsorServiceId => typeof x === 'string' && KNOWN.has(x as SponsorServiceId));
  return ids.length ? ids : null;
}

/* ── Public page ── */

export type PublicSponsorPage =
  | { kind: 'page'; cfg: SponsorPageConfig }
  | { kind: 'locked'; mark: string; logoUrl?: string }
  | { kind: 'missing' };

function fromCode(slug: string, password?: string): PublicSponsorPage {
  const cfg = SPONSOR_PAGES[slug];
  if (!cfg) return { kind: 'missing' };
  if (cfg.password && password !== cfg.password) return { kind: 'locked', mark: cfg.organizer.mark, logoUrl: cfg.organizer.logoUrl };
  return { kind: 'page', cfg };
}

export async function fetchPublicSponsorPage(slug: string, password?: string): Promise<PublicSponsorPage> {
  const { data, error } = await supabase.rpc('get_sponsor_page', {
    p_slug: slug,
    p_password: password || null,
  });
  if (error) {
    // Not migrated yet, or unreachable: serve the pages kept in code.
    return fromCode(slug, password);
  }
  if (!data) return { kind: 'missing' };
  const d = data as Record<string, unknown>;
  const logoUrl = typeof d.logo_url === 'string' && d.logo_url ? d.logo_url : undefined;
  if (d.locked) return { kind: 'locked', mark: String(d.organizer_mark || ''), logoUrl };
  return {
    kind: 'page',
    cfg: {
      organizer: { mark: String(d.organizer_mark || d.organizer_name), name: String(d.organizer_name), logoUrl },
      conference: { name: String(d.conference_name), dateLabel: String(d.date_label || '') },
      contact: { name: String(d.contact_name), email: String(d.contact_email) },
      services: cleanServices(d.services) ?? undefined,
    },
  };
}

/* ── Staff screen ── */

function toRecord(r: Record<string, unknown>): SponsorPageRecord {
  return {
    id: String(r.id),
    slug: String(r.slug),
    organizerName: String(r.organizer_name),
    conferenceName: String(r.conference_name),
    dateLabel: String(r.date_label || ''),
    contactName: String(r.contact_name),
    contactEmail: String(r.contact_email),
    services: cleanServices(r.services),
    logoUrl: typeof r.logo_url === 'string' && r.logo_url ? r.logo_url : null,
    hasPassword: !!r.password_hash,
    status: r.status === 'draft' ? 'draft' : 'published',
    deck: r.deck ? cleanDeck(r.deck) : null,
    deckToken: typeof r.deck_token === 'string' && r.deck_token ? r.deck_token : null,
    deckPreviewToken: typeof r.deck_preview_token === 'string' && r.deck_preview_token ? r.deck_preview_token : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function toRow(input: SponsorPageInput) {
  const row: Record<string, unknown> = {
    // The page shows the logo, or else this, beside the Shortcut logo.
    organizer_mark: input.organizerName.trim(),
    organizer_name: input.organizerName.trim(),
    conference_name: input.conferenceName.trim(),
    date_label: input.dateLabel.trim(),
    contact_name: input.contactName.trim(),
    contact_email: input.contactEmail.trim(),
    services: input.services,
    logo_url: input.logoUrl,
  };
  if (input.newPassword !== undefined) row.new_password = input.newPassword;
  return row;
}

export class SponsorPageError extends Error {
  constructor(message: string, public missingSchema = false) {
    super(message);
  }
}

function fail(error: PgError): never {
  if (isMissingSchema(error)) {
    throw new SponsorPageError(
      `The sponsor_pages table is missing. Run ${SPONSOR_PAGES_MIGRATION} in the Supabase SQL editor first.`,
      true
    );
  }
  throw new SponsorPageError(error?.message || 'Something went wrong. Try again.');
}

export async function listSponsorPages(): Promise<SponsorPageRecord[]> {
  const { data, error } = await supabase
    .from('sponsor_pages')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) fail(error);
  return (data || []).map((r) => toRecord(r as Record<string, unknown>));
}

/** The link a new page gets: the conference name, lowercased and dashed.
 *  'The Deans Conference' -> 'the-deans-conference'. */
export function linkFor(conferenceName: string): string {
  return slugify(conferenceName) || 'conference';
}

/** Creates the page under linkFor(conferenceName), adding -2, -3... when
 *  that link is taken. The link is fixed from then on. */
export async function createSponsorPage(input: SponsorPageInput): Promise<SponsorPageRecord> {
  const { data: auth } = await supabase.auth.getUser();
  const base = linkFor(input.conferenceName);
  let lastError: PgError = null;
  for (let n = 1; n <= 20; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await supabase
      .from('sponsor_pages')
      .insert({ ...toRow(input), slug, created_by: auth.user?.id ?? null })
      .select('*')
      .single();
    if (!error) return toRecord(data as Record<string, unknown>);
    if (error.code !== '23505') fail(error);
    lastError = error;
  }
  fail(lastError);
}

export async function updateSponsorPage(id: string, input: SponsorPageInput): Promise<SponsorPageRecord> {
  const { data, error } = await supabase
    .from('sponsor_pages')
    .update(toRow(input))
    .eq('id', id)
    .select('*')
    .single();
  if (error) fail(error);
  return toRecord(data as Record<string, unknown>);
}

/** Uploads a partner logo to the same public bucket the landing pages use
 *  and returns its URL. */
export async function uploadSponsorLogo(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `sponsor-logos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  // client-logos, where proposal logos go: public, 10 MB, and any signed-in
  // staff user may upload. The 'generic-landing-page-assets' bucket this used
  // to name was never created, so every upload failed with "Bucket not
  // found" (2026-10-21).
  const bucket = 'client-logos';
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw new SponsorPageError(`Could not upload the logo: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function deleteSponsorPage(id: string): Promise<void> {
  const { error } = await supabase.from('sponsor_pages').delete().eq('id', id);
  if (error) fail(error);
}

/** 'The Deans Conference 2026' -> 'the-deans-conference-2026'. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/* ── Sponsor decks (/lounge/<token>) ──
   The page an organizer sends its sponsors. The public reads it only
   through get_sponsor_deck(token), which never returns the slug, so a deck
   can't lead a sponsor back to the partner page. Migration:
   20261119000000_sponsor_page_decks.sql. */

export const SPONSOR_DECKS_MIGRATION = '20261119000000_sponsor_page_decks.sql';

/** The deck's own link. */
export const deckUrl = (token: string) => `${window.location.origin}/lounge/${token}`;

/* Organizer preview links (Will, 2026-11-20): the deck with its sample
   prices and notes, for the ORGANIZER to review without a staff sign-in.
   Its own random token, so the sponsor link never reveals it. Read through
   get_sponsor_deck_preview(token). */
export const SPONSOR_DECK_PREVIEWS_MIGRATION = '20261120000000_sponsor_deck_preview_links.sql';

/** The organizer's preview link. */
export const organizerPreviewUrl = (token: string) => `${window.location.origin}/lounge/preview/${token}`;

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const TIER_IDS: DeckTierId[] = ['title', 'station', 'mindful'];

/** A deck from stored JSON, with anything malformed or empty dropped. */
export function cleanDeck(v: unknown): SponsorDeckDetails {
  const d = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out: SponsorDeckDetails = {};
  if (str(d.venue)) out.venue = str(d.venue, 120);
  if (str(d.about)) out.about = str(d.about, 400);
  if (Array.isArray(d.audience)) {
    const a = d.audience.map((x) => str(x, 90)).filter(Boolean).slice(0, 9);
    if (a.length) out.audience = a;
  }
  if (Array.isArray(d.stats)) {
    const st = d.stats
      .map((x) => (x && typeof x === 'object' ? { fig: str((x as { fig?: unknown }).fig, 16), label: str((x as { label?: unknown }).label, 90) } : null))
      .filter((x): x is { fig: string; label: string } => !!x && !!x.fig && !!x.label)
      .slice(0, 3);
    if (st.length) out.stats = st;
  }
  if (str(d.statsSource)) out.statsSource = str(d.statsSource, 160);
  if (d.tiers && typeof d.tiers === 'object') {
    const tiers: SponsorDeckDetails['tiers'] = {};
    for (const id of TIER_IDS) {
      const t = (d.tiers as Record<string, unknown>)[id] as Record<string, unknown> | undefined;
      const price = str(t?.price, 24);
      const available = str(t?.available, 24);
      if (price || available) tiers[id] = { ...(price ? { price } : {}), ...(available ? { available } : {}) };
    }
    if (Object.keys(tiers).length) out.tiers = tiers;
  }
  if (d.salesContact && typeof d.salesContact === 'object') {
    const c = d.salesContact as Record<string, unknown>;
    if (str(c.name)) {
      out.salesContact = { name: str(c.name, 80) };
      if (str(c.team)) out.salesContact.team = str(c.team, 80);
      if (str(c.email)) out.salesContact.email = str(c.email, 120);
    }
  }
  return out;
}

export type PublicSponsorDeck = { kind: 'deck'; cfg: SponsorDeckConfig } | { kind: 'missing' };

function toDeckConfig(d: Record<string, unknown>): SponsorDeckConfig {
  const logoUrl = typeof d.logo_url === 'string' && d.logo_url ? d.logo_url : undefined;
  return {
    organizer: { mark: String(d.organizer_mark || d.organizer_name), name: String(d.organizer_name), logoUrl },
    conference: { name: String(d.conference_name), dateLabel: String(d.date_label || '') },
    services: cleanServices(d.services) ?? undefined,
    deck: cleanDeck(d.deck),
  };
}

/** The deck at /lounge/<token>, for anyone with the link. */
export async function fetchPublicSponsorDeck(token: string): Promise<PublicSponsorDeck> {
  const { data, error } = await supabase.rpc('get_sponsor_deck', { p_token: token.toLowerCase() });
  if (error || !data) return { kind: 'missing' };
  return { kind: 'deck', cfg: toDeckConfig(data as Record<string, unknown>) };
}

/** The organizer's preview at /lounge/preview/<token>: the deck, plus the
 *  sponsor link's token so its banner can point to it. */
export async function fetchOrganizerDeckPreview(token: string): Promise<{ cfg: SponsorDeckConfig; deckToken: string | null } | null> {
  const { data, error } = await supabase.rpc('get_sponsor_deck_preview', { p_token: token.toLowerCase() });
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return { cfg: toDeckConfig(r), deckToken: typeof r.deck_token === 'string' && r.deck_token ? r.deck_token : null };
}

/** Staff preview of a page's deck at /sponsor/<slug>/deck, before or after
 *  its link exists. Reads the row directly (staff only). */
export async function fetchSponsorDeckPreview(slug: string): Promise<{ cfg: SponsorDeckConfig; deckToken: string | null } | null> {
  const { data, error } = await supabase.from('sponsor_pages').select('*').eq('slug', slug.toLowerCase()).maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return { cfg: toDeckConfig(r), deckToken: typeof r.deck_token === 'string' && r.deck_token ? r.deck_token : null };
}

/** Saves a page's deck details. */
export async function saveSponsorDeck(id: string, deck: SponsorDeckDetails): Promise<SponsorPageRecord> {
  const { data, error } = await supabase
    .from('sponsor_pages')
    .update({ deck: cleanDeck(deck) })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    if (isMissingSchema(error)) throw new SponsorPageError(`Sponsor decks need ${SPONSOR_DECKS_MIGRATION} first.`, true);
    fail(error);
  }
  return toRecord(data as Record<string, unknown>);
}

/** A random link token: 12 characters, a to z and 0 to 9. */
export function newDeckToken(): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

/** Gives a page's deck its own link (a no-op when it has one). */
export async function createDeckLink(id: string): Promise<SponsorPageRecord> {
  for (let n = 0; n < 5; n++) {
    const { data, error } = await supabase
      .from('sponsor_pages')
      .update({ deck_token: newDeckToken() })
      .eq('id', id)
      .is('deck_token', null)
      .select('*')
      .maybeSingle();
    if (error) {
      if (isMissingSchema(error)) throw new SponsorPageError(`Sponsor decks need ${SPONSOR_DECKS_MIGRATION} first.`, true);
      // 23505: another deck has that token. Draw again.
      if (error.code !== '23505') fail(error);
      continue;
    }
    if (data) return toRecord(data as Record<string, unknown>);
    // Nothing updated: it already has a link.
    const { data: row, error: readError } = await supabase.from('sponsor_pages').select('*').eq('id', id).single();
    if (readError) fail(readError);
    return toRecord(row as Record<string, unknown>);
  }
  throw new SponsorPageError('Could not make a unique link. Try again.');
}

/** Gives a page's deck its organizer preview link (a no-op when it has one). */
export async function createOrganizerPreviewLink(id: string): Promise<SponsorPageRecord> {
  for (let n = 0; n < 5; n++) {
    const { data, error } = await supabase
      .from('sponsor_pages')
      .update({ deck_preview_token: newDeckToken() })
      .eq('id', id)
      .is('deck_preview_token', null)
      .select('*')
      .maybeSingle();
    if (error) {
      if (isMissingSchema(error) || /deck_preview_token/i.test(error.message || '')) {
        throw new SponsorPageError(`Organizer preview links need ${SPONSOR_DECK_PREVIEWS_MIGRATION} first.`, true);
      }
      // 23505: another deck has that token. Draw again.
      if (error.code !== '23505') fail(error);
      continue;
    }
    if (data) return toRecord(data as Record<string, unknown>);
    const { data: row, error: readError } = await supabase.from('sponsor_pages').select('*').eq('id', id).single();
    if (readError) fail(readError);
    return toRecord(row as Record<string, unknown>);
  }
  throw new SponsorPageError('Could not make a unique link. Try again.');
}
