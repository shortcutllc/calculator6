/**
 * sync-campaign-membership.mjs — mark which leads are currently in a Smartlead
 * campaign (active OR draft), so the Play B UI can badge / hide them. Writes
 * outreach_contacts.in_campaign + smartlead_campaign_id; generate-plays surfaces
 * it into crm_play_b. A lead removed from all campaigns is un-flagged.
 *
 * Captures leads added to a campaign even before they've sent (unlike
 * outreach_sends, which only records sends).
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   node scripts/sync-campaign-membership.mjs            # dry
 *   node scripts/sync-campaign-membership.mjs --confirm  # write
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const SL = (() => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(/^SMARTLEAD_API_KEY=(.+)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } })();
const CONFIRM = process.argv.includes('--confirm');
const ALL = process.argv.includes('--all'); // include paused/completed too (default: active + drafted)
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const lc = (s) => String(s || '').trim().toLowerCase() || null;
const log = (...a) => console.log(...a);
const api = (p) => `https://server.smartlead.ai/api/v1${p}${p.includes('?') ? '&' : '?'}api_key=${SL}`;

async function readAll(t, c, mod) { const o = []; for (let f = 0; ; f += 1000) { let q = sb.from(t).select(c).range(f, f + 999); if (mod) q = mod(q); const { data, error } = await q; if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }

(async () => {
  if (!SL) { console.error('MISSING SMARTLEAD_API_KEY'); process.exit(2); }
  log(CONFIRM ? 'SYNC MEMBERSHIP — LIVE' : 'SYNC MEMBERSHIP — dry run');
  const KEEP = new Set(['ACTIVE', 'START', 'STARTED', 'RUNNING', 'DRAFTED', 'PAUSED']);
  const camps = (await (await fetch(api('/campaigns'))).json());
  const list = (Array.isArray(camps) ? camps : camps.data || []).filter((c) => c && c.id && (ALL || KEEP.has(String(c.status || '').toUpperCase())));
  log(`scanning ${list.length} campaign(s) (active + draft + paused)…`);

  const member = new Map(); // email -> campaignId (most recent wins)
  for (const c of list) {
    let off = 0;
    for (;;) {
      const r = await fetch(api(`/campaigns/${c.id}/leads?offset=${off}&limit=100`));
      const j = await r.json().catch(() => ({}));
      const a = j.data || [];
      for (const L of a) { const e = lc(L.lead?.email); if (e) member.set(e, String(c.id)); }
      if (a.length < 100) break; off += 100; if (off > 5000) break;
      await new Promise((res) => setTimeout(res, 60));
    }
  }
  log(`found ${member.size} unique leads currently in a campaign.`);

  // currently-flagged in DB → to un-flag any no longer a member
  const flagged = new Set((await readAll('outreach_contacts', 'email', (q) => q.eq('in_campaign', true))).map((r) => lc(r.email)));
  const toUnflag = [...flagged].filter((e) => !member.has(e));
  log(`  ${flagged.size} currently flagged; ${toUnflag.length} to un-flag (left their campaign).`);

  if (!CONFIRM) { log('\nDRY RUN — re-run with --confirm to write in_campaign.'); return; }

  // set members true (chunked upsert by email)
  const rows = [...member.entries()].map(([email, cid]) => ({ email, in_campaign: true, smartlead_campaign_id: cid }));
  let wrote = 0;
  for (let i = 0; i < rows.length; i += 200) { const { error } = await sb.from('outreach_contacts').upsert(rows.slice(i, i + 200), { onConflict: 'email' }); if (error) log('  warn:', error.message); else wrote += rows.slice(i, i + 200).length; }
  // un-flag the rest
  for (let i = 0; i < toUnflag.length; i += 200) { await sb.from('outreach_contacts').update({ in_campaign: false, smartlead_campaign_id: null }).in('email', toUnflag.slice(i, i + 200)); }
  log(`\nDONE — flagged ${wrote} in-campaign, un-flagged ${toUnflag.length}.`);
})().catch((e) => { console.error('SYNC_MEMBERSHIP_ERROR:', e.message); process.exit(1); });
