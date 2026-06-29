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

// Trailing suffix token (after a comma or space, at end of string). Dots optional.
const SUFFIX = /[,\s]+(?:LLP|LLC|PLLC|PLC|L\.L\.P\.|L\.L\.C\.|P\.C\.|P\.A\.|P\.L\.L\.C\.|PC|PA|LP|L\.P\.|Inc\.?|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|GmbH|S\.A\.|N\.A\.|N\.V\.)\.?$/i;

export function cleanCompany(name) {
  if (name == null) return name;
  let s = String(name).trim();
  for (let i = 0; i < 5 && SUFFIX.test(s); i += 1) s = s.replace(SUFFIX, '').trim();
  return s.replace(/[,\s&]+$/, '').trim() || String(name).trim(); // never return empty
}
