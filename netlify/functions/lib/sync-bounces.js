/**
 * sync-bounces (shared core) — the BOUNCE FEEDBACK LOOP. Smartlead auto-BLOCKS a
 * lead on a hard bounce (also unsubscribe / manual block). This pulls every
 * BLOCKED lead from Smartlead campaigns and: (1) suppresses it (crm_suppression
 * reason 'smartlead_blocked'), (2) marks outreach_contacts.mv_status='invalid',
 * (3) optionally removes it from the Smartlead campaign. One bounce permanently
 * removes the lead from the cold pool everywhere.
 *
 * Reused by the CLI (scripts/sync-bounces.mjs) and the Netlify scheduled fn.
 * Env-only (Smartlead key passed in). Read-only when confirm=false. NO Anthropic.
 */
import { stampHeartbeat } from './heartbeat.js';

const lc = (s) => String(s || '').trim().toLowerCase() || null;

/**
 * @param {object}   o
 * @param {object}   o.sb            Supabase service-role client
 * @param {string}   o.smartleadKey  Smartlead API key
 * @param {boolean}  [o.confirm]     write suppressions + mark invalid (else dry)
 * @param {boolean}  [o.del]         also DELETE the lead from its Smartlead campaign
 * @param {string[]} [o.campaignIds] scan only these campaigns (default: active)
 * @param {boolean}  [o.all]         scan every campaign (slow)
 * @param {string}   [o.host]        heartbeat host tag
 * @param {function} [o.log]
 * @returns {Promise<object>} summary
 */
export async function syncBounces({ sb, smartleadKey, confirm = false, del = false, campaignIds = null, all = false, host = null, log = console.log }) {
  const api = (path) => `https://server.smartlead.ai/api/v1${path}${path.includes('?') ? '&' : '?'}api_key=${smartleadKey}`;
  log(confirm ? `SYNC BOUNCES — LIVE${del ? ' + DELETE from campaigns' : ''}` : 'SYNC BOUNCES — dry run (no writes)');

  // 1. campaigns to scan — default to ACTIVE only
  let campaigns = [];
  if (campaignIds && campaignIds.length) campaigns = campaignIds.map((id) => ({ id, name: `(id ${id})` }));
  else {
    const r = await fetch(api('/campaigns'));
    const j = await r.json();
    const ACTIVE = new Set(['ACTIVE', 'START', 'STARTED', 'RUNNING']);
    campaigns = (Array.isArray(j) ? j : j.data || []).filter((c) => c && c.id && (all || ACTIVE.has(String(c.status || '').toUpperCase()))).map((c) => ({ id: c.id, name: c.name || '' }));
  }
  log(`scanning ${campaigns.length} ${all || campaignIds ? '' : 'active '}campaign(s) for BLOCKED leads…`);

  // 2. collect BLOCKED leads per campaign
  const blocked = [];
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
  log(`found ${blocked.length} BLOCKED lead-rows → ${byEmail.size} unique emails`);

  if (!byEmail.size) { log('no blocked leads — nothing to do.'); if (confirm && host) await stampHeartbeat(sb, 'sync-bounces', { host, note: '0 blocked' }); return { blocked: 0, suppressed: 0, deleted: 0 }; }
  if (!confirm) { log('DRY RUN — pass confirm to suppress + mark invalid.'); return { blocked: byEmail.size, suppressed: 0, deleted: 0, dry: true }; }

  // 3. suppress + mark invalid
  const at = new Date().toISOString();
  const supRows = [...byEmail.values()].map((b) => ({ email: b.email, reason: 'smartlead_blocked', source: 'sync-bounces', detail: { campaign_id: b.campaignId, synced_at: at } }));
  const { error: se } = await sb.from('crm_suppression').upsert(supRows, { onConflict: 'email' });
  if (se) log(`  suppression warn: ${se.message}`); else log(`suppressed ${supRows.length} emails (reason=smartlead_blocked).`);
  let marked = 0;
  for (const b of byEmail.values()) {
    const { error } = await sb.from('outreach_contacts').update({ mv_status: 'invalid', mv_checked_at: at }).eq('email', b.email);
    if (!error) marked += 1;
  }
  log(`marked ${marked} outreach_contacts mv_status='invalid'.`);

  // 4. optional: delete from the Smartlead campaign
  let deleted = 0;
  if (del) {
    for (const b of byEmail.values()) {
      if (!b.leadId) continue;
      try { const r = await fetch(api(`/campaigns/${b.campaignId}/leads/${b.leadId}`), { method: 'DELETE' }); if (r.ok) deleted += 1; } catch { /* skip */ }
      await new Promise((res) => setTimeout(res, 80));
    }
    log(`deleted ${deleted} leads from their Smartlead campaigns.`);
  }
  log('DONE — bounced/blocked leads will never re-enter the cold pool.');
  if (host) await stampHeartbeat(sb, 'sync-bounces', { host, note: `${byEmail.size} blocked` });
  return { blocked: byEmail.size, suppressed: supRows.length, marked, deleted };
}
