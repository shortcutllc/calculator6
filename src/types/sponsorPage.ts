import type { SponsorServiceId } from '../utils/sponsorPackages';

/** What the /sponsor/:slug page renders from. Built from a sponsor_pages row
 *  (or, until that table exists, from the code fallback in
 *  src/components/sponsor/sponsorPages.ts). */
export interface SponsorPageConfig {
  /** Only on the code fallback. Database pages check passwords on the server. */
  password?: string;

  organizer: {
    /** Shown beside the Shortcut logo when there is no logo: 'AACSB'. */
    mark: string;
    /** As it reads in a sentence: 'AACSB'. */
    name: string;
    /** Partner logo, shown in place of `mark` in the nav, hero and gate. */
    logoUrl?: string;
  };

  conference: {
    /** As it reads mid-sentence: 'The Deans Conference'. */
    name: string;
    /** Shown on the booking card: 'Oct 19 to 21, 2026'. */
    dateLabel: string;
  };

  /** Who the organizer replies to. */
  contact: { name: string; email: string };

  /** Stations on offer, in order. Omit for all of them. */
  services?: SponsorServiceId[];

  /** Right-hand hero image. Defaults to the AACSB lounge rendering. */
  heroPhoto?: { src: string; alt: string };
}

/* ── Sponsor decks ──
   The page an organizer sends its SPONSORS (SponsorDeck.tsx), at its own
   link /lounge/<token>. Stored on the sponsor_pages row: `deck` and
   `deck_token` (migration 20261119000000_sponsor_page_decks.sql). */

export type DeckTierId = 'title' | 'station' | 'mindful';

/** The conference's own facts and the organizer's offer. Every field is
 *  optional; the deck leaves out what isn't set. Conference facts come from
 *  the organizer's own site and carry a source. Never invent one. */
export interface SponsorDeckDetails {
  /** Shown with the dates in the hero: 'Miami Ironside, Little River'. */
  venue?: string;
  /** A sentence about the conference, from its site. */
  about?: string;
  /** Who attends, as the organizer describes them. */
  audience?: string[];
  /** Conference figures from the organizer's site. */
  stats?: { fig: string; label: string }[];
  /** Where `stats` came from: 'gcuc.co, including its coworking market projection'. */
  statsSource?: string;
  /** The organizer's price and availability per sponsorship option. */
  tiers?: Partial<Record<DeckTierId, { price?: string; available?: string }>>;
  /** The organizer's person who sells sponsorships. */
  salesContact?: { name: string; team?: string; email?: string };
}

/** What the deck renders from: the page's conference facts plus its deck.
 *  No slug and no Shortcut sender: nothing that leads to the partner page. */
export interface SponsorDeckConfig {
  organizer: { mark: string; name: string; logoUrl?: string };
  conference: { name: string; dateLabel: string };
  services?: SponsorServiceId[];
  deck: SponsorDeckDetails;
}

/** A sponsor_pages row as the staff screen sees it. The password hash never
 *  leaves the service; `hasPassword` says whether one is set. */
export interface SponsorPageRecord {
  id: string;
  slug: string;
  organizerName: string;
  conferenceName: string;
  dateLabel: string;
  contactName: string;
  contactEmail: string;
  services: SponsorServiceId[] | null;
  logoUrl: string | null;
  hasPassword: boolean;
  status: 'draft' | 'published';
  /** The sponsor deck's details, and its link token once created. */
  deck: SponsorDeckDetails | null;
  deckToken: string | null;
  /** The organizer's preview link token (/lounge/preview/<token>), once
   *  created. Migration 20261120000000_sponsor_deck_preview_links.sql. */
  deckPreviewToken: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the staff form saves. The link (slug) is not part of it: it is
 *  made from the conference name when the page is created and never
 *  changes. `newPassword`: undefined keeps the current password, '' removes
 *  it, anything else replaces it. */
export interface SponsorPageInput {
  organizerName: string;
  conferenceName: string;
  dateLabel: string;
  contactName: string;
  contactEmail: string;
  services: SponsorServiceId[] | null;
  logoUrl: string | null;
  newPassword?: string;
}
