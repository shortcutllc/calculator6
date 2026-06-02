// What's the true follow-ups count per rep vs the 300 cap?
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

const cutoff60 = new Date(Date.now() - 60 * 86400000).toISOString();

console.log('\n--- Each rep\'s 60-day Path B size (rep-attributed sends) ---');
for (const rep of ['will@getshortcut.co', 'caren@getshortcut.co', 'marc@getshortcut.co', 'jaimie@getshortcut.co']) {
  const { data: sends } = await sb.from('outreach_sends').select('email').eq('sender_email', rep).gte('sent_time', cutoff60);
  const unique = new Set((sends || []).map((s) => lc(s.email))).size;
  console.log(`  ${rep}: ${sends?.length || 0} send rows (60d) → ${unique} unique contacts`);
}

console.log('\n--- Workhuman personal-note leads assigned per rep (Path A) ---');
for (const assignee of ['Will Newton', 'Caren Skutch', 'Marc Levitan', 'Jaimie Pritchard']) {
  const PERSONAL_NOTE_RE = /\[[^\[\]]*·[^\[\]]*\]/;
  const { data } = await sb.from('workhuman_leads').select('email, notes').eq('assigned_to', assignee).not('notes', 'is', null);
  const withNote = (data || []).filter((w) => PERSONAL_NOTE_RE.test(w.notes || ''));
  console.log(`  ${assignee}: ${withNote.length} personal-note leads`);
}
