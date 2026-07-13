/**
 * tech-scout-background.js — the tech-exec daily scout, moved off Will's Mac so it
 * runs even when the laptop sleeps. Triggered by tech-scout-scheduled (7:35am ET
 * weekdays). Mirrors the local cron: harvest signal feeds → qualify → Apollo enrich
 * → MV/BounceBan verify → queue landed buyers into founder-queue-background.
 *
 * Shares the engine with scripts/tech-scout.mjs (netlify/functions/lib/tech-scout.js)
 * so the two can't drift. The ledger lives in the Supabase tech_scout_ledger table
 * (single source of truth for both). Background fn = 15-min limit, enough for the
 * web-search harvest + capped enrich loop.
 *
 * Env: APOLLO_API_KEY, MILLIONVERIFIER_API_KEY, BOUNCEBAN_API_KEY, ANTHROPIC_API_KEY,
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * POST body (all optional): { harvest=true, confirm=true, queue=true, maxOrgs=30,
 *   maxBuyers=5, dryRun=false }. dryRun forces confirm=false (no spend, no queue).
 */

import { createClient } from '@supabase/supabase-js';
import { harvestCandidates, runTechScout, loadLedger, persistLedger } from './lib/tech-scout.js';

export const handler = async (event) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const APOLLO = process.env.APOLLO_API_KEY;
  const MV = process.env.MILLIONVERIFIER_API_KEY;
  const BB = process.env.BOUNCEBAN_API_KEY;
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
  const missing = [['SUPABASE', url && key], ['APOLLO_API_KEY', APOLLO], ['MILLIONVERIFIER_API_KEY', MV], ['BOUNCEBAN_API_KEY', BB], ['ANTHROPIC_API_KEY', ANTHROPIC]]
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error('[tech-scout] misconfigured — missing', missing.join(', ')); return { statusCode: 500, body: `missing env: ${missing.join(', ')}` }; }

  let body = {};
  try { body = JSON.parse(event?.body || '{}'); } catch { /* defaults */ }
  const dryRun = !!body.dryRun;
  const confirm = dryRun ? false : (body.confirm !== false);
  const queue = dryRun ? false : (body.queue !== false);
  const harvest = body.harvest !== false;
  const maxOrgs = Number.isFinite(body.maxOrgs) ? body.maxOrgs : 30;
  const maxBuyers = Number.isFinite(body.maxBuyers) ? body.maxBuyers : 5;
  const log = (...a) => console.log('[tech-scout]', ...a);

  const sb = createClient(url, key, { auth: { persistSession: false } });

  try {
    let candidates = [];
    if (harvest) {
      log('HARVEST — sweeping signal feeds via web search…');
      candidates = await harvestCandidates({ anthropicKey: ANTHROPIC, log });
      log(`harvest returned ${candidates.length} candidates`);
    }
    if (!candidates.length) { log('no candidates harvested — nothing to enrich; done.'); return { statusCode: 200, body: 'no candidates' }; }

    const ledger = await loadLedger(sb);
    log(`TECH SCOUT — ${candidates.length} candidates · ${confirm ? 'LIVE (spends credits)' : 'DRY'} · max-orgs ${maxOrgs} · max-buyers ${maxBuyers}`);

    const { results, orgCredits, personCredits, buyersLanded } = await runTechScout({
      sb, apolloKey: APOLLO, mvKey: MV, bbKey: BB, log,
      confirm, queue, maxOrgs, maxBuyers, candidates, ledger,
      persist: (led, dirty) => persistLedger(sb, led, dirty),
    });

    const landed = results.filter((r) => r.status === 'buyer_landed');
    log(`DONE — candidates ${candidates.length} · org credits ${orgCredits} · person credits ${personCredits} · buyers landed ${landed.length}`);
    for (const r of landed) log(`  landed: ${r.buyer?.name} (${r.buyer?.tier}: ${r.buyer?.title}) @ ${r.company}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, candidates: candidates.length, orgCredits, personCredits, buyersLanded: landed.length }) };
  } catch (e) {
    console.error('[tech-scout] error:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
