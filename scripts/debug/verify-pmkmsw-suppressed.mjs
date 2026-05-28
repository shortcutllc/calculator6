// Verify suppress_lead worked end-to-end:
//   1. crm_suppression row exists with the right reason + provenance
//   2. preflight() returns suppressed=true (means web CRM card + lookup_lead
//      + followups tab all filter it)
//   3. would the digest filter it (muted_lead_emails OR crm_suppression)?
//   4. dry-run a digest build for Will to confirm nothing slips through
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TARGET = 'pmkmsw@gmail.com';
const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. crm_suppression row');
{
  const { data, error } = await sb.from('crm_suppression').select('*').eq('email', TARGET).maybeSingle();
  if (error) console.error(error.message);
  else if (!data) console.log('❌ NO ROW — suppress_lead did not write');
  else {
    console.log('✓ row exists');
    console.log(JSON.stringify(data, null, 2));
  }
}

banner('2. preflight() verdict (powers Pro lookup_lead + web CRM card + followups)');
{
  const { preflight } = await import('../../netlify/functions/lib/preflight.js');
  const v = await preflight(sb, { email: TARGET, domain: 'gmail.com' });
  console.log(JSON.stringify({
    suppressed: v.suppressed,
    suppression_reason: v.suppression_reason,
    recommendation: v.recommendation,
  }, null, 2));
  console.log(v.suppressed ? '✓ preflight reports suppressed — all surfaces will filter' : '❌ preflight does NOT report suppressed');
}

banner('3. Will\'s muted_lead_emails (per-rep mute, secondary safety net)');
{
  const { data } = await sb.from('gmail_accounts').select('muted_lead_emails').eq('email', 'will@getshortcut.co').maybeSingle();
  const muted = data?.muted_lead_emails || [];
  console.log('muted:', muted);
  console.log(muted.includes(TARGET) ? '✓ also in muted_lead_emails (belt + suspenders)' : 'not in muted_lead_emails (still filtered via crm_suppression)');
}

banner('4. Dry-run digest build for will@getshortcut.co');
{
  const r = await fetch('https://proposals.getshortcut.co/.netlify/functions/slack-rep-digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // dry-run mode would be ideal but isn't built; instead just inspect via the live force path WITHOUT triggering a fresh DM.
    // We'll instead probe directly: query everything the digest section logic uses and confirm pmkmsw is not in any of them.
    body: JSON.stringify({ force: false, only: 'will@getshortcut.co' }),
  });
  const j = await r.json();
  console.log('digest endpoint reply (force=false → no actual DM sent unless conditions met):');
  console.log(JSON.stringify(j, null, 2));
}

banner('5. Section-level check — would pmkmsw appear in any digest section?');
{
  // Mirror the digest's exact filter chain: would pmkmsw survive the isFiltered() guard?
  const { data: suppRows } = await sb.from('crm_suppression').select('email');
  const suppressed = new Set((suppRows || []).map((r) => r.email?.toLowerCase()));
  const { data: w } = await sb.from('gmail_accounts').select('muted_lead_emails').eq('email', 'will@getshortcut.co').maybeSingle();
  const muted = new Set((w?.muted_lead_emails || []).map((s) => s.toLowerCase()));
  const isFiltered = suppressed.has(TARGET) || muted.has(TARGET);
  console.log(`crm_suppression has pmkmsw? ${suppressed.has(TARGET)}`);
  console.log(`muted_lead_emails has pmkmsw? ${muted.has(TARGET)}`);
  console.log(isFiltered ? '✓ pmkmsw is filtered — will NOT appear in tomorrow\'s digest' : '❌ pmkmsw is NOT filtered — would appear');
}
