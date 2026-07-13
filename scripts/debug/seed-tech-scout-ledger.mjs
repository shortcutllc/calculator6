/**
 * One-time: seed the Supabase tech_scout_ledger from prime_targets.json so the
 * dedup/self-heal memory survives the move off the local file. Idempotent (upsert
 * on domain). Run once at the tech-scout Netlify migration.
 *   set -a; . ~/.shortcut-cron.env; set +a; node scripts/debug/seed-tech-scout-ledger.mjs [--confirm]
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const CONFIRM = process.argv.includes('--confirm');
const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const ledger = JSON.parse(readFileSync('/Users/willnewton/Documents/GitHub/calculator6/prime_targets.json', 'utf8'));
const domains = Object.keys(ledger);
const rows = domains.map((d) => ({ domain: d, record: ledger[d], trigger_type: ledger[d]?.trigger_type ?? null, status: ledger[d]?.status ?? null, updated_at: new Date().toISOString() }));

console.log(`prime_targets.json: ${domains.length} domains`);
if (!CONFIRM) { console.log('DRY — re-run with --confirm to upsert into tech_scout_ledger.'); process.exit(0); }

let n = 0;
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await sb.from('tech_scout_ledger').upsert(rows.slice(i, i + 200), { onConflict: 'domain' });
  if (error) { console.error('upsert error:', error.message); process.exit(1); }
  n += rows.slice(i, i + 200).length;
}
const { count } = await sb.from('tech_scout_ledger').select('*', { count: 'exact', head: true });
console.log(`seeded ${n} rows · tech_scout_ledger now has ${count} rows`);
