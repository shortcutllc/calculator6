/**
 * landing-pages.mjs — host-side helper to get a personalized book-a-call page URL
 * per company for cold campaigns ({{landing_url}} custom field).
 *
 * Minting runs through the Netlify fn create-book-a-call-page (BRANDFETCH_API_KEY
 * + logo/assembler libs live there). This helper adds the two things the endpoint
 * doesn't do:
 *   REUSE  — one page per company, ever: existing generic_landing_pages rows are
 *            matched by partnerName (case-insensitive) so re-runs never sprawl.
 *   BATCH  — the endpoint is a regular (non-background) function with a ~26s cap
 *            and Brandfetch takes ~1-2s per company, so we call it 4 companies at
 *            a time.
 *
 * mintLandingPages({ sb, companies, log }) → Map(lowercased company → url)
 *   companies: [{ company, domain }] (dedupe by company upstream or not — we do it)
 * Fallback for any failure: GENERIC_BOOK_A_CALL (the public non-personalized page)
 * so {{landing_url}} can never render empty.
 */

export const GENERIC_BOOK_A_CALL = 'https://proposals.getshortcut.co/book-a-call';
const ENDPOINT = 'https://proposals.getshortcut.co/.netlify/functions/create-book-a-call-page';
const BATCH = 4;

const keyOf = (name) => String(name || '').trim().toLowerCase();

export async function mintLandingPages({ sb, companies, log = console.log }) {
  const map = new Map();
  // dedupe by company name (one page per company; every lead there shares it)
  const uniq = new Map();
  for (const c of companies || []) {
    const k = keyOf(c.company);
    if (k && !uniq.has(k)) uniq.set(k, { company: String(c.company).trim(), domain: c.domain || null });
  }
  if (!uniq.size) return map;

  // REUSE: existing pages by partnerName (newest wins).
  if (sb) {
    const rows = [];
    for (let f = 0; ; f += 1000) {
      const { data, error } = await sb.from('generic_landing_pages')
        .select('unique_token, data, created_at').order('created_at', { ascending: false }).range(f, f + 999);
      if (error) { log(`  pages reuse-scan warn: ${error.message}`); break; }
      rows.push(...data); if (data.length < 1000) break;
    }
    for (const r of rows) {
      const k = keyOf(r.data?.partnerName);
      if (k && uniq.has(k) && !map.has(k)) map.set(k, `https://proposals.getshortcut.co/book-a-call/${r.unique_token}`);
    }
  }

  const toMint = [...uniq.entries()].filter(([k]) => !map.has(k)).map(([, v]) => v);
  log(`  pages: ${uniq.size} companies · ${map.size} reused · ${toMint.length} to mint`);

  for (let i = 0; i < toMint.length; i += BATCH) {
    const batch = toMint.slice(i, i + BATCH);
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: batch.map((b) => ({ company: b.company, domain: b.domain })) }),
      });
      // A slow batch can hit the fn's time cap → 502 with pages PARTIALLY created
      // server-side. Log it loudly (was silent once): the reuse scan on the next
      // run picks those orphaned pages up, so re-running self-heals.
      if (!r.ok) log(`  mint batch warn: HTTP ${r.status} for [${batch.map((b) => b.company).join(', ')}] — re-run to pick up via reuse`);
      const j = await r.json().catch(() => ({}));
      for (const res of j.results || []) {
        if (res.url) map.set(keyOf(res.company), res.url);
        else log(`  mint warn: ${res.company}: ${res.error || 'no url'}`);
      }
    } catch (e) { log(`  mint batch warn: ${e.message}`); }
    if ((i / BATCH) % 10 === 9) log(`  minted ${Math.min(i + BATCH, toMint.length)}/${toMint.length}…`);
  }
  return map;
}

/** URL for a lead: its company's page, else the generic public page. */
export const landingUrlFor = (map, company) => map.get(keyOf(company)) || GENERIC_BOOK_A_CALL;
