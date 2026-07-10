/**
 * clean-company — strip trailing legal/corporate suffixes from a company name so
 * merge tags and list displays read naturally ("Morgan, Lewis & Bockius LLP" →
 * "Morgan, Lewis & Bockius"). Shared by cold-engine, generate-plays (Play B / Law
 * tab display), and the Netlify scheduled generate-plays so all surfaces match.
 *
 * Conservative: only strips well-known suffix TOKENS at the very end (optionally
 * after a comma), loops for stacked suffixes, and never touches "& Co" style names.
 */

const SUFFIX = /[,\s]+(?:L\.?L\.?P\.?|L\.?L\.?C\.?|P\.?L\.?L\.?C\.?|PLC|P\.?C\.?|P\.?A\.?|L\.?P\.?|Inc\.?|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|GmbH|S\.A\.|N\.A\.|N\.V\.)$/i;
const MARKS = /[®™]/g;
const TAGLINE = /\s+[-–—|•]\s+.*$/;
const AFFIL = /[,\s]+(?:and|&)\s+affiliate(?:d|s)?(?:\s+(?:companies|entities|offices))?\.?$/i;

export function cleanCompany(name) {
  if (name == null) return name;
  let s = String(name).replace(MARKS, '').trim();
  s = s.replace(TAGLINE, '').trim();
  for (let i = 0; i < 6 && (AFFIL.test(s) || SUFFIX.test(s)); i += 1) {
    s = s.replace(AFFIL, '').replace(SUFFIX, '').trim();
  }
  return s.replace(/[,\s&]+$/, '').trim() || String(name).trim();
}
