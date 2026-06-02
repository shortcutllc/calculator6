import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const col of [
  'display_name', 'aliases', 'tier', 'track', 'priority_rank', 'nyc_presence',
  'icp_notes', 'why', 'domains', 'recent_ma_note', 'verdict', 'apollo_filter',
  'created_at', 'notes',
]) {
  const r = await sb.from('crm_target_firms').select(col).limit(0);
  console.log(`  ${col.padEnd(20)} ${r.error?.message ? '❌ ' + r.error.message : '✓'}`);
}
