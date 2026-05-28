import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log('=== crm_play_b ===');
const { data: rows, error, count } = await sb.from('crm_play_b')
  .select('*', { count: 'exact' }).order('rank', { ascending: true }).limit(5);
if (error) {
  console.error('ERROR querying crm_play_b:', error);
  process.exit(1);
}
console.log(`row count: ${count}`);
if (rows && rows.length) {
  console.log('first 3 columns sampled:');
  console.log(JSON.stringify(rows.slice(0, 3), null, 2));
} else {
  console.log('NO ROWS');
}

console.log('\n=== crm_play_b last_sender column? ===');
const { data: lsRows, error: lsErr } = await sb.from('crm_play_b')
  .select('rank, company_name, last_sender_email').limit(1);
if (lsErr) {
  console.error('last_sender_email column query error:', lsErr.message);
} else {
  console.log('column ok, sample:', lsRows?.[0]);
}

console.log('\n=== crm_play_b generated_at column? ===');
const { data: gaRows, error: gaErr } = await sb.from('crm_play_b').select('generated_at').limit(1);
if (gaErr) console.error('generated_at column error:', gaErr.message);
else console.log('generated_at ok:', gaRows?.[0]);
