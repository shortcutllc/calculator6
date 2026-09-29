import type { SponsorPageConfig } from '../../types/sponsorPage';

export type { SponsorPageConfig };

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

   Pages are now created at /sponsor-pages (staff admin), stored in the
   `sponsor_pages` table. The entries below are only a fallback that the
   page uses until that table's migration has been applied. Once it has,
   this file can be deleted.
   ───────────────────────────────────────────── */

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
