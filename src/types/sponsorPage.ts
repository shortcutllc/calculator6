import type { SponsorServiceId } from '../utils/sponsorPackages';

/** What the /sponsor/:slug page renders from. Built from a sponsor_pages row
 *  (or, until that table exists, from the code fallback in
 *  src/components/sponsor/sponsorPages.ts). */
export interface SponsorPageConfig {
  /** Only on the code fallback. Database pages check passwords on the server. */
  password?: string;

  organizer: {
    /** Short wordmark beside the Shortcut logo: 'AACSB'. */
    mark: string;
    /** As it reads in a sentence: 'AACSB'. */
    name: string;
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

/** A sponsor_pages row as the staff screen sees it. The password hash never
 *  leaves the service; `hasPassword` says whether one is set. */
export interface SponsorPageRecord {
  id: string;
  slug: string;
  organizerMark: string;
  organizerName: string;
  conferenceName: string;
  dateLabel: string;
  contactName: string;
  contactEmail: string;
  services: SponsorServiceId[] | null;
  hasPassword: boolean;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

/** What the staff form saves. `newPassword`: undefined keeps the current
 *  password, '' removes it, anything else replaces it. */
export interface SponsorPageInput {
  slug: string;
  organizerMark: string;
  organizerName: string;
  conferenceName: string;
  dateLabel: string;
  contactName: string;
  contactEmail: string;
  services: SponsorServiceId[] | null;
  newPassword?: string;
}
