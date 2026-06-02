// Quarantine the 3 corrupt workhuman_leads rows that have a rep email in
// the email column (came in via the landing-page booking flow). We don't
// know the prospect's real email, so the safest action is:
//   - move the rep email out of email (preserves nothing, but unblocks routing)
//   - prefix the row's notes with a [CORRUPT-EMAIL ...] marker so the rep
//     can fix later if they want
//   - set email to a synthetic '<row.id>@unknown.local' placeholder so the
//     row stays uniquely-keyed but never matches a real lookup
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const REPS = ['will@getshortcut.co', 'caren@getshortcut.co', 'marc@getshortcut.co', 'jaimie@getshortcut.co', 'courtney@getshortcut.co'];

const { data: rows } = await sb.from('workhuman_leads')
  .select('id, email, name, company, notes').in('email', REPS);

console.log(`Quarantining ${rows.length} corrupt rows:`);
for (const r of rows) {
  const synthetic = `corrupt-${r.id.slice(0, 8)}@unknown.local`;
  const marker = `[CORRUPT-EMAIL was=${r.email} fixed=${new Date().toISOString().slice(0, 10)}] `;
  const newNotes = marker + (r.notes || '');
  console.log(`  ${r.id.slice(0, 8)} | "${r.name}" @ ${r.company} | ${r.email} → ${synthetic}`);
  await sb.from('workhuman_leads')
    .update({ email: synthetic, notes: newNotes, updated_at: new Date().toISOString() })
    .eq('id', r.id);
}
console.log('\n✓ done. resolveLeadOwner will no longer match these rows on internal email lookups.');
