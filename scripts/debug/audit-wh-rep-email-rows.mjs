import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const REPS = ['will@getshortcut.co', 'caren@getshortcut.co', 'marc@getshortcut.co', 'jaimie@getshortcut.co', 'courtney@getshortcut.co'];

const { data } = await sb.from('workhuman_leads')
  .select('id, email, name, company, assigned_to, notes')
  .in('email', REPS).limit(200);
console.log(`Found ${data?.length || 0} workhuman_leads rows where email = a rep email (data-entry bug):`);
console.table(data.map((r) => ({
  id: r.id.slice(0, 8),
  wrong_email: r.email,
  name: r.name,
  company: r.company,
  assigned_to: r.assigned_to,
  note_preview: (r.notes || '').slice(0, 60).replace(/\n/g, ' '),
})));
