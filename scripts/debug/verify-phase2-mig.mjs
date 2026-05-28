import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await sb.from('gmail_accounts')
  .select('email, muted_until_by_lead, muted_lead_emails').eq('email', 'will@getshortcut.co').maybeSingle();
if (error) { console.error('migration NOT applied:', error.message); process.exit(1); }
console.log('Migration applied.');
console.log('  muted_until_by_lead =', JSON.stringify(data.muted_until_by_lead));
console.log('  muted_lead_emails =', JSON.stringify(data.muted_lead_emails));
