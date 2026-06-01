import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PROPOSAL_ID = 'f5dcac02-c82a-4658-a8f5-7b9f70cd4d34';
const CONTACT_EMAIL = 'jmcauliffe@philabar.org';

const { data: before } = await sb.from('proposals')
  .select('id, client_name, client_email').eq('id', PROPOSAL_ID).maybeSingle();
console.log('before:', before);

const { error } = await sb.from('proposals')
  .update({ client_email: CONTACT_EMAIL })
  .eq('id', PROPOSAL_ID);
if (error) { console.error(error.message); process.exit(1); }

const { data: after } = await sb.from('proposals')
  .select('id, client_name, client_email').eq('id', PROPOSAL_ID).maybeSingle();
console.log('after:', after);

console.log('\nNow re-verifying lead-picture finds it for Jen:');
const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
const pic = await leadPicture(sb, { email: CONTACT_EMAIL });
console.log('proposals found:', pic.proposals.map((p) => ({ id: p.id.slice(0, 8), name: p.client_name })));
console.log('signups found:', pic.signups.map((s) => ({ url: s.signup_url })));
