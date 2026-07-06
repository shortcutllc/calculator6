/**
 * backfill-page-logos.mjs — drive the relogo mode of create-book-a-call-page
 * until every recently-minted page has a logo (or the chain truly has none).
 * Small server batches (sync fn timeout) in a loop; safe to re-run anytime.
 *   node scripts/backfill-page-logos.mjs
 */
const URL = 'https://proposals.getshortcut.co/.netlify/functions/create-book-a-call-page';
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
let noProgress = 0; let last = Infinity;
for (let i = 1; i <= 80; i += 1) {
  const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relogo: true, max: 10 }) });
  if (!r.ok) { log(`HTTP ${r.status} — stopping`); break; }
  const j = await r.json();
  log(`batch ${i}: fixed ${j.fixed} · no-logo-found ${j.nologo} · errors ${j.errors} · remaining ${j.remaining}`);
  if (j.remaining === 0) { log('ALL PAGES HAVE LOGOS.'); break; }
  if (j.remaining >= last) { noProgress += 1; if (noProgress >= 3) { log(`no progress 3 rounds — ${j.remaining} pages have no findable logo (text header fallback stays).`); break; } }
  else noProgress = 0;
  last = j.remaining;
  await new Promise((res) => setTimeout(res, 1500));
}
