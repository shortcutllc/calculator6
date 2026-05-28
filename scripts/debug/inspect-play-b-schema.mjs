import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Try a series of column probes to see which exist
const cols = ['rank', 'company_name', 'domain', 'employees', 'industry', 'contact_name', 'contact_email',
  'contact_title', 'title_category', 'score', 'generated_at', 'engagement_state', 'last_sent', 'replied',
  'touches', 'last_sender_name', 'last_sender_email'];
for (const c of cols) {
  const { error } = await sb.from('crm_play_b').select(c).limit(0);
  console.log(`${c.padEnd(25)} ${error ? '❌ ' + error.message : '✓ exists'}`);
}

console.log('\nAlso check related tables:');
for (const t of ['crm_play_a', 'crm_companies', 'crm_sites', 'crm_play_b_history']) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
  console.log(`${t.padEnd(25)} ${error ? '❌ ' + error.message : `✓ ${count} rows`}`);
}
