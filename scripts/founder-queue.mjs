/**
 * founder-queue.mjs — trigger Will's daily founder-networking queue.
 * Thin host-side trigger (the work happens in founder-queue-background.js:
 * research → draft in Will's voice → Gmail draft + Slack card per lead).
 * See memory/founder_outreach_lane.md.
 *
 *   node scripts/founder-queue.mjs               # dry: who WOULD be queued today
 *   node scripts/founder-queue.mjs --confirm     # queue today's batch (default max 5)
 *   node scripts/founder-queue.mjs --confirm --max 10
 *   node scripts/founder-queue.mjs --confirm --only someone@firm.com
 */
const val = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CONFIRM = process.argv.includes('--confirm');
const MAX = parseInt(val('--max', '5'), 10) || 5;
const ONLY = val('--only', null);
const URL = (process.env.FOUNDER_QUEUE_URL || 'https://proposals.getshortcut.co/.netlify/functions/founder-queue-background').trim();

(async () => {
  const payload = { max: MAX, dryRun: !CONFIRM, ...(ONLY ? { only: ONLY } : {}) };
  const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = await r.text();
  console.log(`founder-queue → HTTP ${r.status}`);
  try {
    const j = JSON.parse(text);
    if (j.dryRun) {
      console.log(`DRY RUN — ${j.candidates} eligible, today's ${j.today?.length || 0} (max ${j.max}):`);
      for (const t of j.today || []) console.log(`  ${String(t.name || '').padEnd(24)} ${String(t.firm || t.company || '').padEnd(28)} ${t.email}`);
      console.log('\nRe-run with --confirm to research + draft + DM the queue.');
    } else {
      console.log(JSON.stringify(j, null, 2).slice(0, 1200));
    }
  } catch { console.log(text.slice(0, 400)); }
})().catch((e) => { console.error('FOUNDER_QUEUE_ERROR:', e.message); process.exit(1); });
