import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as typedClient } from '../lib/supabaseClient';
import { SPONSOR_SERVICES, type SponsorServiceId } from '../utils/sponsorPackages';
import { SPONSOR_PAGES } from '../components/sponsor/sponsorPages';
import type { SponsorPageConfig, SponsorPageInput, SponsorPageRecord } from '../types/sponsorPage';

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
  const bucket = 'generic-landing-page-assets';
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
