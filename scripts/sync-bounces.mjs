/**
 * sync-bounces.mjs — the BOUNCE FEEDBACK LOOP. Smartlead auto-BLOCKS a lead on a
 * hard bounce (also on unsubscribe / manual block). We never want to re-email any
 * blocked address, so this pulls every BLOCKED lead from Smartlead campaigns and:
 *   1. adds it to crm_suppression (reason 'smartlead_blocked') — the cold engine's
 *      permanent drop list,
 *   2. marks outreach_contacts.mv_status='invalid' — also dropped by the skeptic,
 *   3. (--delete) removes it from the Smartlead campaign.
 * So one bounce permanently removes the lead from the cold pool everywhere.
 *
 * Dry by default. Scans ALL campaigns unless --campaigns "id1,id2" is given.
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   node scripts/sync-bounces.mjs                     # dry: list blocked leads
 *   node scripts/sync-bounces.mjs --confirm           # suppress + mark invalid
 *   node scripts/sync-bounces.mjs --confirm --delete  # + remove from the campaign
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { stampHeartbeat } from '../netlify/functions/lib/heartbeat.js';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const CONFIRM = process.argv.includes('--confirm');
const DELETE = process.argv.includes('--delete');
const campArg = (() => { const i = process.argv.indexOf('--campaigns'); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean) : null; })();
const SL = (() => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(/^SMARTLEAD_API_KEY=(.+)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } })();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SL) { console.error('MISSING SMARTLEAD_API_KEY (openclaw .env)'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV (SUPABASE)'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
const lc = (s) => String(s || '').trim().toLowerCase() || null;
const api = (path) => `https://server.smartlead.ai/api/v1${path}${path.includes('?') ? '&' : '?'}api_key=${SL}`;

(async () => {
  log(CONFIRM ? `SYNC BOUNCES — LIVE${DELETE ? ' + DELETE from campaigns' : ''}` : 'SYNC BOUNCES — dry run (no writes)');

  // 1. campaigns to scan — default to ACTIVE only (a bounce can only happen in a
  // campaign that is/was sending); --all scans every campaign (slow).
  const ALL = process.argv.includes('--all');
  let campaigns = [];
  if (campArg) campaigns = campArg.map((id) => ({ id, name: `(id ${id})` }));
  else {
    const r = await fetch(api('/campaigns'));
    const j = await r.json();
    const ACTIVE = new Set(['ACTIVE', 'START', 'STARTED', 'RUNNING']);
    campaigns = (Array.isArray(j) ? j : j.data || []).filter((c) => c && c.id && (ALL || ACTIVE.has(String(c.status || '').toUpperCase()))).map((c) => ({ id: c.id, name: c.name || '' }));
  }
  log(`scanning ${campaigns.length} ${ALL || campArg ? '' : 'active '}campaign(s) for BLOCKED leads…`);

  // 2. collect BLOCKED leads per campaign
  const blocked = []; // { email, leadId, campaignId, campaignName }
  for (const c of campaigns) {
    let off = 0;
    for (;;) {
      const r = await fetch(api(`/campaigns/${c.id}/leads?offset=${off}&limit=100`));
      const j = await r.json().catch(() => ({}));
      const arr = j.data || [];
      for (const L of arr) {
        const status = L.status || (L.lead_campaign_data?.[0]?.status);
        if (status === 'BLOCKED') blocked.push({ email: lc(L.lead?.email || L.email), leadId: L.lead?.id, campaignId: c.id, campaignName: c.name });
      }
      if (arr.length < 100) break; off += 100; if (off > 5000) break;
      await new Promise((res) => setTimeout(res, 80));
    }
  }
  const byEmail = new Map();
  for (const b of blocked) { if (b.email && !byEmail.has(b.email)) byEmail.set(b.email, b); }
  log(`\nfound ${blocked.length} BLOCKED lead-rows across campaigns → ${byEmail.size} unique emails:`);
  for (const b of byEmail.values()) log(`  ${b.email.padEnd(40)} campaign ${b.campaignId} ${b.campaignName ? `(${b.campaignName.slice(0, 30)})` : ''}`);

  if (!byEmail.size) { log('\nno blocked leads — nothing to do.'); return; }
  if (!CONFIRM) { log(`\nDRY RUN — re-run with --confirm to suppress + mark invalid${DELETE ? '' : ' (add --delete to also remove from campaigns)'}.`); return; }

  // 3. suppress + mark invalid
  const at = new Date().toISOString();
  const supRows = [...byEmail.values()].map((b) => ({ email: b.email, reason: 'smartlead_blocked', source: 'sync-bounces', detail: { campaign_id: b.campaignId, synced_at: at } }));
  const { error: se } = await sb.from('crm_suppression').upsert(supRows, { onConflict: 'email' });
  if (se) log(`  suppression warn: ${se.message}`); else log(`\nsuppressed ${supRows.length} emails (reason=smartlead_blocked).`);
  let marked = 0;
  for (const b of byEmail.values()) {
    const { error } = await sb.from('outreach_contacts').update({ mv_status: 'invalid', mv_checked_at: at }).eq('email', b.email);
    if (!error) marked += 1;
  }
  log(`marked ${marked} outreach_contacts mv_status='invalid'.`);

  // 4. optional: delete from the Smartlead campaign
  if (DELETE) {
    let deleted = 0;
    for (const b of byEmail.values()) {
      if (!b.leadId) continue;
      try { const r = await fetch(api(`/campaigns/${b.campaignId}/leads/${b.leadId}`), { method: 'DELETE' }); if (r.ok) deleted += 1; } catch { /* skip */ }
      await new Promise((res) => setTimeout(res, 80));
    }
    log(`deleted ${deleted} leads from their Smartlead campaigns.`);
  }
  log('\nDONE — bounced/blocked leads will never re-enter the cold pool.');
  if (CONFIRM) await stampHeartbeat(sb, 'sync-bounces', { host: 'local-mac' });
})().catch((e) => { console.error('SYNC_BOUNCES_ERROR:', e.message); process.exit(1); });
