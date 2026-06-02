import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { resolveLeadOwner } = await import('../../netlify/functions/lib/slack-event-ping.js');

const banner = (s) => console.log(`\n===== ${s} =====`);

for (const email of [
  'lbryan@cleveland-research.com',
  'dschumacher@cleveland-research.com',
  'jmartin@cleveland-research.com',
]) {
  banner(email);
  const { data: sends } = await sb.from('outreach_sends')
    .select('campaign_id, sent_time, sender_email, reply_time')
    .eq('email', email).order('sent_time', { ascending: false }).limit(5);
  console.log(`outreach_sends: ${sends?.length || 0}`);
  console.table(sends);

  const { data: reps } = await sb.from('outreach_replies')
    .select('campaign_id, reply_date, reply_sentiment')
    .eq('email', email).order('reply_date', { ascending: false }).limit(3);
  console.log(`outreach_replies: ${reps?.length || 0}`);
  console.table(reps);

  const owner = await resolveLeadOwner(sb, email);
  console.log(`resolveLeadOwner → ${owner ? owner.acct.email + ' (slack=' + owner.acct.slack_user_id + ', name=' + owner.name + ')' : 'NULL'}`);
}
