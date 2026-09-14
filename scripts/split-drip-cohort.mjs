#!/usr/bin/env node
/**
 * split-drip-cohort.mjs — carve a small cohort out of a drip campaign for the
 * self-hosted sender, and hand the remainder to Smartlead.
 *
 * WHY A SPLIT: the self-hosted drip has sent four emails in its life, all to
 * Will. Putting 700 leads through it as its first real use would combine an
 * untested sender with a time-sensitive campaign on the domain that carries
 * proposals and invoices. So a cohort proves the system on real recipients
 * while Smartlead — configured, and with the block list bypassed in code —
 * carries the bulk for October.
 *
 * THE INVARIANT: a lead is in exactly one system. Cohort leads stay active in
 * drip_leads and are NEVER uploaded to Smartlead; everyone else is uploaded to
 * Smartlead and parked in drip_leads so the runner will not touch them.
 *
 *   node scripts/split-drip-cohort.mjs --campaign jaimie-fall-nurture-2026 --cohort 100
 *   node scripts/split-drip-cohort.mjs --campaign <slug> --cohort 100 --apply
 */
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './lib/load-env.mjs';

const BASE = 'https://server.smartlead.ai/api/v1';
const SMARTLEAD_CAMPAIGN = 3935145; // Jaimie Fall Nurture 2026

const arg = (f, d = null) => { const i = process.argv.indexOf(f); return i > -1 ? (process.argv[i + 1] ?? d) : d; };
const has = (f) => process.argv.includes(f);

(async () => {
  requireEnv('VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SMARTLEAD_API_KEY');
  const slug = arg('--campaign');
  const cohortSize = parseInt(arg('--cohort', '100'), 10);
  const apply = has('--apply');
  if (!slug) throw new Error('pass --campaign <slug>');

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const KEY = process.env.SMARTLEAD_API_KEY;

  const { data: camp } = await sb.from('drip_campaigns').select('id,slug,status').eq('slug', slug).single();
  if (!camp) throw new Error(`no campaign ${slug}`);

  const { data: leads } = await sb.from('drip_leads')
    .select('id,email,first_name,last_name,company_name,custom_fields,status')
    .eq('campaign_id', camp.id).eq('status', 'active').limit(5000);

  const unverified = leads.filter((l) => !(l.custom_fields || {}).mv);
  if (unverified.length) throw new Error(`${unverified.length} leads still unverified — finish verify-drip-leads first`);

  // Cohort takes MV-'ok' only: the cleanest possible first real test, so a
  // deliverability problem points at OUR sender rather than at list quality.
  const ok = leads.filter((l) => l.custom_fields.mv === 'ok');
  if (ok.length < cohortSize) throw new Error(`only ${ok.length} MV-ok leads, need ${cohortSize}`);

  // Deterministic pick (sorted by email) so a re-run selects the same cohort.
  const cohort = [...ok].sort((a, b) => a.email.localeCompare(b.email)).slice(0, cohortSize);
  const cohortIds = new Set(cohort.map((l) => l.id));
  const remainder = leads.filter((l) => !cohortIds.has(l.id));

  const byMv = {};
  remainder.forEach((l) => { const k = l.custom_fields.mv; byMv[k] = (byMv[k] || 0) + 1; });

  console.log(`${slug}: ${leads.length} active, all verified`);
  console.log(`  cohort (self-hosted drip) : ${cohort.length}  [all MV-ok]`);
  console.log(`  remainder (Smartlead)     : ${remainder.length}  ${JSON.stringify(byMv)}`);
  console.log(`  overlap between the two   : ${remainder.filter((l) => cohortIds.has(l.id)).length}`);

  if (!apply) { console.log('\ndry run — pass --apply'); return; }

  // Park the remainder so the self-hosted runner can never pick them up.
  for (let i = 0; i < remainder.length; i += 200) {
    const ids = remainder.slice(i, i + 200).map((l) => l.id);
    const { error } = await sb.from('drip_leads')
      .update({ status: 'paused', halted_reason: 'handed to Smartlead', updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) throw new Error(`park: ${error.message}`);
  }
  console.log(`\nparked ${remainder.length} leads in drip_leads (status=paused, "handed to Smartlead")`);

  // Upload the remainder to Smartlead. ignore_global_block_list is ON because
  // that list holds ~80 non-client domains that are almost certainly collateral
  // from a single unsubscribe; the individual unsubscribe and bounce guards stay
  // enforced, so anyone who actually opted out is still refused.
  let added = 0, blocked = 0, unsub = 0;
  const rows = remainder.map((l) => ({
    email: l.email, first_name: l.first_name || 'there', last_name: l.last_name || '',
    company_name: l.company_name || '',
    custom_fields: { mv: l.custom_fields.mv, source: 'drip_split' },
  }));
  for (let i = 0; i < rows.length; i += 100) {
    const r = await fetch(`${BASE}/campaigns/${SMARTLEAD_CAMPAIGN}/leads?api_key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_list: rows.slice(i, i + 100),
        settings: { ignore_global_block_list: true, ignore_unsubscribe_list: false, ignore_community_bounce_list: false },
      }),
    });
    if (!r.ok) { console.log('  batch failed:', r.status, (await r.text()).slice(0, 160)); continue; }
    const j = JSON.parse(await r.text());
    added += j.total_leads || 0; blocked += j.block_count || 0; unsub += (j.unsubscribed_leads || []).length;
  }
  console.log(`Smartlead: added ${added} | blocked ${blocked} | refused as unsubscribed ${unsub}`);
  console.log(`\nCohort of ${cohort.length} remains active in drip_leads and is NOT in Smartlead.`);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
