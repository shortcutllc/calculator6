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

/**
 * Format the `[stamp · Name]` author tag that the Rapid Outreach queue
 * uses to identify hand-written notes. Mirrors the format produced by
 * the booth's appendNote and the CRM's "Add note" quick-action.
 *
 * Lives here so the Edit Lead and Add Lead modals can guard against
 * teammates saving raw text into the notes field — without that
 * stamping, the queue's regex skips the lead and it never surfaces
 * to the assignee. (See: Nate Browning, May 7 — saved as "Interested"
 * with no stamp, missed Caren's queue.)
 */
export function buildStamp(firstName: string, when: Date = new Date()): string {
  const stamp = when.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  return `[${stamp} · ${firstName || 'Team'}]`;
}

/**
 * Ensure a notes blob carries at least one manual-note stamp. If the
 * value already has any stamp pattern it's returned unchanged (preserves
 * existing multi-line note histories). If not, a single stamp is
 * prepended so the lead remains discoverable in the Rapid Outreach
 * queue. Empty / null inputs return null so the DB stores NULL.
 */
export function ensureStampedNote(
  notes: string | null | undefined,
  firstName: string
): string | null {
  const trimmed = (notes || '').trim();
  if (!trimmed) return null;
  if (MANUAL_NOTE_RE.test(trimmed)) return trimmed;
  return `${buildStamp(firstName)} ${trimmed}`;
}
