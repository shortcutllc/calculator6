import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. Philly Bar proposal');
{
  const { data } = await sb.from('proposals')
    .select('id, slug, client_name, status, created_at, updated_at')
    .or('client_name.ilike.%philadelphia bar%,client_name.ilike.%philabar%,client_name.ilike.%bench bar%')
    .order('updated_at', { ascending: false }).limit(5);
  console.table(data);
}

banner('2. sign_up_links — search ALL for "philadelphia" / "philabar" / "bench bar" / iZdLEoviVK');
{
  const { data: all } = await sb.from('sign_up_links')
    .select('id, proposal_id, signup_url, status, coordinator_event_id, event_payload, created_at')
    .order('created_at', { ascending: false }).limit(50);
  const matches = (all || []).filter((s) => {
    const payload = s.event_payload || {};
    const blob = JSON.stringify({ url: s.signup_url, payload, coord: s.coordinator_event_id }).toLowerCase();
    return blob.includes('philabar')
        || blob.includes('philadelphia bar')
        || blob.includes('bench bar')
        || blob.includes('izdleovivk');
  });
  console.log(`scanned ${all?.length} signup rows; matched: ${matches.length}`);
  for (const m of matches) {
    console.log(`---`);
    console.log(`  id:                  ${m.id}`);
    console.log(`  signup_url:          ${m.signup_url}`);
    console.log(`  status:              ${m.status}`);
    console.log(`  proposal_id:         ${m.proposal_id}`);
    console.log(`  coordinator_event_id:${m.coordinator_event_id}`);
    console.log(`  event_payload keys:  ${Object.keys(m.event_payload || {}).join(', ')}`);
    console.log(`  payload preview:     ${JSON.stringify(m.event_payload || {}).slice(0, 300)}`);
  }
}

banner('3. What lead-picture would return for Jen — proposals + signups');
{
  const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
  const pic = await leadPicture(sb, { email: 'jmcauliffe@philabar.org' });
  console.log('proposals returned:');
  console.table((pic.proposals || []).map((p) => ({ id: p.id?.slice(0, 8), name: p.client_name, status: p.status })));
  console.log('signups returned:');
  console.table((pic.signups || []).map((s) => ({ id: s.id?.slice(0, 8), url: s.signup_url, status: s.status })));
}
