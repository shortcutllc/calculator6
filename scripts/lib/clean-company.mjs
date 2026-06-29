/**
 * clean-company.mjs — strip trailing legal/corporate suffixes from a company
 * name so merge tags and list displays read naturally ("Morgan, Lewis &
 * Bockius LLP" → "Morgan, Lewis & Bockius", "Cole, Scott & Kissane, P.A." →
 * "Cole, Scott & Kissane"). Used by cold-engine (send merge tag) and
 * generate-plays (Play B / Law tab display) so both surfaces match.
 *
 * Conservative: only strips well-known suffix TOKENS at the very end (optionally
 * after a comma), loops for stacked suffixes, and never touches "& Co" style
 * names (Co/Company are excluded — too risky, and law firms do not use them).
 */

// Trailing suffix token (after a comma or space, at end of string). All internal
// dots optional so "P.C", "P.C.", "PC" all match; end-anchored so it never
// touches "Pa…"/"Co…" mid-name.
const SUFFIX = /[,\s]+(?:L\.?L\.?P\.?|L\.?L\.?C\.?|P\.?L\.?L\.?C\.?|PLC|P\.?C\.?|P\.?A\.?|L\.?P\.?|Inc\.?|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|GmbH|S\.A\.|N\.A\.|N\.V\.)$/i;
// Marketing marks + a trailing tagline glued on after " - " / " | " (e.g.
// "Houston Harbaugh, P.C. - Building Client Confidence®").
const MARKS = /[®™]/g;
const TAGLINE = /\s+[-–—|•]\s+.*$/;

// Trailing "and Affiliates" / "& Affiliated Companies" clause (Apollo appends it
// after the suffix, e.g. "Skadden ... Flom LLP and Affiliates").
const AFFIL = /[,\s]+(?:and|&)\s+affiliate(?:d|s)?(?:\s+(?:companies|entities|offices))?\.?$/i;

export function cleanCompany(name) {
  if (name == null) return name;
  let s = String(name).replace(MARKS, '').trim();
  s = s.replace(TAGLINE, '').trim();   // drop a marketing tagline after " - " / " | "
  // Strip "and Affiliates" + suffixes, looping (handles "LLP and Affiliates").
  for (let i = 0; i < 6 && (AFFIL.test(s) || SUFFIX.test(s)); i += 1) {
    s = s.replace(AFFIL, '').replace(SUFFIX, '').trim();
  }
  return s.replace(/[,\s&]+$/, '').trim() || String(name).trim(); // never return empty
}
