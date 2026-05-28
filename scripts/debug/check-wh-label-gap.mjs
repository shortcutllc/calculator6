// Why are many workhuman_leads not getting the WH label in follow-ups?
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const banner = (s) => console.log(`\n===== ${s} =====`);

const PERSONAL_NOTE_RE = /\[[^\[\]]*·[^\[\]]*\]/;

banner('1. workhuman_leads total + with-personal-note breakdown');
{
  const { count: total } = await sb.from('workhuman_leads').select('*', { count: 'exact', head: true });
  console.log(`total workhuman_leads: ${total}`);

  // Sample first 2000 to see how many have personal notes
  const { data } = await sb.from('workhuman_leads').select('email, name, company, tier, tier_1a, tier_1b, workhuman_attendee_id, notes, assigned_to').limit(2000);
  const withNote = data.filter((w) => PERSONAL_NOTE_RE.test(w.notes || ''));
  const withTier1 = data.filter((w) => w.tier === 'tier_1' || w.tier_1a || w.tier_1b);
  const withAttended = data.filter((w) => !!w.workhuman_attendee_id);
  const withAssignee = data.filter((w) => !!w.assigned_to);
  console.log(`  with personal_note stamp: ${withNote.length} / ${data.length}`);
  console.log(`  with tier_1 (any variant): ${withTier1.length} / ${data.length}`);
  console.log(`  with workhuman_attendee_id: ${withAttended.length} / ${data.length}`);
  console.log(`  with assigned_to: ${withAssignee.length} / ${data.length}`);
}

banner('2. Will\'s recent sends — which sent_emails are in workhuman_leads but not Path A?');
{
  // Pull Will's last 60d sends
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: sends } = await sb.from('outreach_sends')
    .select('email').eq('sender_email', 'will@getshortcut.co').gte('sent_time', cutoff);
  const willEmails = [...new Set((sends || []).map((s) => s.email?.toLowerCase()))];
  console.log(`Will emailed ${willEmails.length} unique contacts in last 60d`);

  // Of those, which are in workhuman_leads?
  const whHits = [];
  for (let i = 0; i < willEmails.length; i += 200) {
    const slice = willEmails.slice(i, i + 200);
    const { data } = await sb.from('workhuman_leads')
      .select('email, name, company, tier, tier_1a, tier_1b, workhuman_attendee_id, notes, assigned_to').in('email', slice);
    whHits.push(...(data || []));
  }
  console.log(`  of those, ${whHits.length} are in workhuman_leads`);
  const withPN = whHits.filter((w) => PERSONAL_NOTE_RE.test(w.notes || ''));
  console.log(`  ...of which ${withPN.length} have a personal-note stamp (Path A)`);
  console.log(`  ...so ${whHits.length - withPN.length} are workhuman leads WITHOUT a personal note → today they appear in follow-ups via Path B with NO WH label`);

  console.log('\nSample 10 of the missed WH labels:');
  const missed = whHits.filter((w) => !PERSONAL_NOTE_RE.test(w.notes || ''));
  console.table(missed.slice(0, 10).map((w) => ({
    email: w.email, name: w.name, company: w.company,
    tier: w.tier_1a ? '1A' : w.tier_1b ? '1B' : w.tier,
    attended: !!w.workhuman_attendee_id, assigned: w.assigned_to,
    notes_preview: (w.notes || '').slice(0, 50),
  })));
}
