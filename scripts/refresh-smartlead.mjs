/**
 * refresh-smartlead.mjs — keeps the pre-flight gate fresh (Option 1).
 *
 * Step 1: re-run openclaw's build_smartlead_cache.js. With no args it is
 *   INCREMENTAL — only ACTIVE/PAUSED/DRAFTED campaigns (where new sends/
 *   replies appear), preserving existing leads + enrichments. Free (Smartlead
 *   API, no Apollo credits). `--full` forces all 120 campaigns.
 * Step 2: re-run our Track B ingest (ingest-outreach-corpus.mjs) — idempotent
 *   upsert, so only the delta lands in outreach_* and the gate stops going stale.
 *
 *   cd /Users/willnewton/Documents/GitHub/calculator6
 *   source ~/.nvm/nvm.sh
 *   export SUPABASE_URL="$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"'"'"' \r\n')" \
 *          SUPABASE_SERVICE_ROLE_KEY="$(netlify env:get SUPABASE_SERVICE_ROLE_KEY | tr -d ' \r\n')"
 *   node .claude/worktrees/<wt>/scripts/refresh-smartlead.mjs [--full] [--cache-only]
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FULL = args.includes('--full');
const CACHE_ONLY = args.includes('--cache-only');
// Rolling window the ingest honors so the cron never re-processes the full
// lifetime — only Smartlead activity in the last N days (default 30). The
// one-time historical backfill runs ingest WITHOUT this env (full history).
const di = args.indexOf('--days');
const SINCE_DAYS = di !== -1 && args[di + 1] ? String(parseInt(args[di + 1], 10) || 30) : '30';

const SMARTLEAD_API_KEY = (() => {
  try {
    const m = readFileSync(`${OPENCLAW}/.env`, 'utf8').match(/^SMARTLEAD_API_KEY=(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
})();

if (!SMARTLEAD_API_KEY) { console.error('MISSING: SMARTLEAD_API_KEY (openclaw/.env)'); process.exit(2); }
if (!CACHE_ONLY) {
  const u = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const k = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!/^https?:\/\//i.test(u) || !k) {
    console.error('MISSING: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (needed for the ingest step; or use --cache-only)');
    process.exit(2);
  }
}

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

function run(cmd, cmdArgs, cwd, extraEnv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { cwd, env: { ...process.env, ...extraEnv }, stdio: 'inherit' });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmdArgs.join(' ')} exited ${code}`))));
    p.on('error', reject);
  });
}

(async () => {
  log(`Step 1/2 — refresh smartlead_cache.json (${FULL ? 'FULL' : 'incremental: active/paused/drafted'})...`);
  await run('node', ['build_smartlead_cache.js', ...(FULL ? ['--full'] : [])], OPENCLAW, { SMARTLEAD_API_KEY });
  log('Cache refreshed.');

  if (CACHE_ONLY) { log('--cache-only: skipping ingest. DONE'); return; }

  log(`Step 2/2 — re-ingest Track B (idempotent; window = last ${SINCE_DAYS} days)...`);
  await run('node', [join(HERE, 'ingest-outreach-corpus.mjs')], HERE, { REFRESH_SINCE_DAYS: SINCE_DAYS });
  log('Ingest complete. Pre-flight gate is fresh. DONE');
})().catch((e) => { console.error('REFRESH_ERROR:', e.message); process.exit(1); });
