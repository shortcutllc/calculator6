/**
 * tech-scout.mjs — LOCAL runner for the tech-exec scouting engine.
 * See memory/tech_exec_targeting.md (v2: company-first, Apollo = enrichment only).
 *
 * The engine now lives in netlify/functions/lib/tech-scout.js (shared with the
 * Netlify background function tech-scout-background.js, so the two can't drift).
 * This wrapper just supplies the LOCAL persistence: prime_targets.json as the
 * ledger + tech_scout_candidates.json as the harvest cache. Env keys come from
 * ~/.openclaw/workspace/.env (fallback) or the process env.
 *
 * FLAGS:
 *   --harvest   Claude + web_search sweeps the signal feeds, writes CAND_PATH.
 *   --confirm   spend Apollo/MV/BounceBan credits (dry by default).
 *   --queue     POST each landed buyer to founder-queue-background immediately.
 *   --report    print replies-per-trigger (the brain hook); no spend.
 *   --max-orgs / --max-buyers / --candidates <path>
 *
 *   set -a; source ~/.openclaw/workspace/.env; set +a
 *   node scripts/tech-scout.mjs --harvest --confirm --max-orgs 30 --max-buyers 5 --queue
 *   node scripts/tech-scout.mjs --report
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { harvestCandidates, runReport, runTechScout, loadLedger, persistLedger } from '../netlify/functions/lib/tech-scout.js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const CONFIRM = has('--confirm');
const HARVEST = has('--harvest');
const QUEUE = has('--queue');
const REPORT = has('--report');
const CAND_PATH = val('--candidates', `${ROOT}/tech_scout_candidates.json`);
const MAX_ORGS = parseInt(val('--max-orgs', '30'), 10) || 30;
const MAX_BUYERS = parseInt(val('--max-buyers', '5'), 10) || 5;

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const APOLLO = process.env.APOLLO_API_KEY || envKey('APOLLO_API_KEY');
const MV = process.env.MILLIONVERIFIER_API_KEY || envKey('MILLIONVERIFIER_API_KEY');
const BB = process.env.BOUNCEBAN_API_KEY || envKey('BOUNCEBAN_API_KEY');
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');
const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

(async () => {
  if (REPORT) { await runReport({ sb, ledger: await loadLedger(sb), log }); return; }
  if (!APOLLO) { console.error('MISSING APOLLO_API_KEY'); process.exit(2); }

  if (HARVEST) {
    if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY for --harvest'); process.exit(2); }
    log('HARVEST — sweeping signal feeds via web search…');
    const fresh = await harvestCandidates({ anthropicKey: ANTHROPIC_KEY, log });
    log(`harvest returned ${fresh.length} candidates`);
    if (fresh.length) writeFileSync(CAND_PATH, JSON.stringify(fresh, null, 1));
    else if (!existsSync(CAND_PATH)) { console.error('harvest empty and no candidates file — stopping'); process.exit(1); }
  }
  if (!existsSync(CAND_PATH)) { console.error(`no candidates file at ${CAND_PATH}`); process.exit(2); }
  const candidates = JSON.parse(readFileSync(CAND_PATH, 'utf8'));
  const ledger = await loadLedger(sb);
  log(`TECH SCOUT — ${candidates.length} candidates · ${CONFIRM ? 'LIVE (spends credits)' : 'DRY'} · max-orgs ${MAX_ORGS}`);

  const { results, orgCredits, personCredits, buyersLanded } = await runTechScout({
    sb, apolloKey: APOLLO, mvKey: MV, bbKey: BB, log,
    confirm: CONFIRM, queue: QUEUE, maxOrgs: MAX_ORGS, maxBuyers: MAX_BUYERS,
    candidates, ledger, persist: (led, dirty) => persistLedger(sb, led, dirty),
  });

  log('\n================ SCOUT DIGEST ================');
  for (const r of results) {
    const line = [r.status.toUpperCase().padEnd(24), (r.company || '').padEnd(28), r.size ? `${r.size}pp` : '', r.crossed_recently ? 'CROSSED<12mo' : '', r.buyer ? `→ ${r.buyer.name} (${r.buyer.tier}: ${r.buyer.title})` : '', r.why_not || ''].filter(Boolean).join(' ');
    console.log('  ' + line);
  }
  const landed = results.filter((r) => r.status === 'buyer_landed');
  log(`candidates ${candidates.length} · org credits ${orgCredits} · person credits ${personCredits} · qualified ${results.filter((r) => String(r.status).startsWith('qualified') || r.status === 'buyer_landed' || String(r.status).startsWith('buyer_')).length} · buyers landed ${landed.length}`);
  log('ledger: Supabase tech_scout_ledger');
  if (landed.length) log(`next: node scripts/founder-queue.mjs --confirm --audience tech-execs --only <email> --trigger "<why-now>" per lead (trigger is in the ledger).`);
})().catch((e) => { console.error('SCOUT_ERROR:', e.message); process.exit(1); });
