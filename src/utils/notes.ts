/**
 * Notes utilities for the Workhuman CRM. The same `[stamp · Name]` regex
 * was getting copied across booth, leads, and queue components — it now
 * lives here so all three views agree on what counts as a manual note.
 *
 * "Manual" = a real, hand-written note from a teammate (booth `appendNote`
 * and CRM "Add note" both stamp this format). Auto-stubs from booth-signup
 * imports, landing-page bookings, and SMS receipts have no author tag, so
 * the regex cleanly separates real comments from system-generated noise.
 */

export const MANUAL_NOTE_RE = /\[[^\]]+·\s*[A-Za-z]+\]/;

export function hasManualNote(notes: string | null | undefined): boolean {
  return !!notes && MANUAL_NOTE_RE.test(notes);
}
