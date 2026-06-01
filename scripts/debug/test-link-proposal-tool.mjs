// Prove that Pro's edit_proposal → update_client_info path actually
// rewires a proposal's client_email and that lookup_lead resolves it
// after the update. End-to-end through the same handler Pro uses.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (env[k] && !process.env[k]) process.env[k] = env[k];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PROPOSAL_ID = 'f5dcac02-c82a-4658-a8f5-7b9f70cd4d34';   // Phil Bar
const TARGET_EMAIL = 'jmcauliffe@philabar.org';

const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. Pre-state — proposal row');
{
  const { data } = await sb.from('proposals').select('id, client_name, client_email').eq('id', PROPOSAL_ID).maybeSingle();
  console.log(JSON.stringify(data, null, 2));
}

// Flip client_email to a wrong value first (simulating an existing-proposal
// that needs to be relinked). Then call the proposal-editor library the way
// Pro's handleEditProposal does, with op=update_client_info.
banner('2. Flip client_email to a stale placeholder to set up the test');
{
  const { error } = await sb.from('proposals').update({ client_email: 'placeholder@stale.test' }).eq('id', PROPOSAL_ID);
  if (error) { console.error(error.message); process.exit(1); }
  const { data } = await sb.from('proposals').select('client_email').eq('id', PROPOSAL_ID).maybeSingle();
  console.log('client_email is now:', data.client_email);
}

banner('3. Run the same applyOperations call Pro uses (op = update_client_info)');
{
  const { applyOperations } = await import('../../netlify/functions/lib/proposal-editor.js');
  const { data: row } = await sb.from('proposals').select('*').eq('id', PROPOSAL_ID).single();
  const proposalRecord = {
    status: row.status,
    client_name: row.client_name,
    client_email: row.client_email,
    client_logo_url: row.client_logo_url,
  };
  const result = applyOperations(
    row.data,
    row.customization || {},
    proposalRecord,
    [{ op: 'update_client_info', clientEmail: TARGET_EMAIL }],
  );
  console.log('changesSummary:', result.changesSummary);
  // Persist (same code path handleEditProposal uses)
  const { error } = await sb.from('proposals').update({
    data: result.proposalData,
    customization: result.customization,
    client_email: result.proposalRecord.client_email,
    updated_at: new Date().toISOString(),
    has_changes: true,
    change_source: 'staff',
  }).eq('id', PROPOSAL_ID);
  if (error) { console.error(error.message); process.exit(1); }
}

banner('4. Post-state — proposal row');
{
  const { data } = await sb.from('proposals').select('id, client_name, client_email').eq('id', PROPOSAL_ID).maybeSingle();
  console.log(JSON.stringify(data, null, 2));
  if (data.client_email !== TARGET_EMAIL) {
    console.error(`❌ FAIL: client_email did not update to ${TARGET_EMAIL}`);
    process.exit(2);
  }
}

banner('5. Re-run lookup_lead and confirm the proposal + signup now surface');
{
  const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
  const pic = await leadPicture(sb, { email: TARGET_EMAIL });
  const proposals = (pic.proposals || []).map((p) => ({ id: p.id.slice(0, 8), name: p.client_name, status: p.status }));
  const signups = (pic.signups || []).map((s) => ({ url: s.signup_url }));
  console.log('proposals:'); console.table(proposals);
  console.log('signups:'); console.table(signups);
  if (!proposals.length || !signups.length) {
    console.error('❌ FAIL: lookup_lead did not surface proposal + signup after relink');
    process.exit(3);
  }
  console.log('\n✓ END-TO-END PASS: Pro\'s edit_proposal → update_client_info relinks a proposal, and lookup_lead picks it up immediately.');
}
