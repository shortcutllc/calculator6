import type { SponsorServiceId } from '../../utils/sponsorPackages';

/* ─────────────────────────────────────────────
   Conference partner pages: one config per conference ORGANIZER.

   WHO READS THIS PAGE. The conference organizer, not the sponsor. The
   organizer buys the lounge from us and resells it to their sponsors as a
   premium sponsorship, at their own price. So the page argues the
   organizer's case: their sponsors want time with the audience, leads and
   recognition; the lounge delivers all three; we do all the work.

   There is NO pricing on this page, by design (Will, 2026-09-28). The
   organizer's margin is the point, and our cost is quoted to them
   privately. The sponsor-facing page (the /aacsb kind, white labeled) comes
   later, once the organizer has a buyer.

   To make a new page:
     1. Copy the `template` entry. Its key is the URL: /sponsor/<key>.
     2. Fill every field from the conference's own event page. Leave an
        optional field out rather than guess it.
     3. Open /sponsor/<key> and read every sentence aloud.
   ───────────────────────────────────────────── */

export interface SponsorPageConfig {
  /** Optional gate, same pattern as /aacsb. Leave out for an open page. */
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

export const SPONSOR_PAGES: Record<string, SponsorPageConfig> = {
  /* The blank. Every bracketed value is a gap to fill. Viewable at
     /sponsor/template so the gaps can be read in place. */
  template: {
    password: 'SHORTCUTxSPONSOR',
    organizer: { mark: '[HOST]', name: '[Organizer]' },
    conference: {
      name: '[Conference name]',
      dateLabel: '[Dates]',
    },
    contact: { name: '[Contact name]', email: '[contact email]' },
  },

  /* TEST page, fictional conference. Open, no password, for the Acme
     presentation (Will, 2026-09-22). */
  acme: {
    organizer: { mark: 'ACME', name: 'Acme Events' },
    conference: {
      name: 'Acme Conference',
      dateLabel: 'Nov 9 to 10, 2026',
    },
    contact: { name: 'Will Newton', email: 'will@getshortcut.co' },
  },
};
