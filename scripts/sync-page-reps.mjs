/**
 * sync-page-reps.mjs — make each lead's book-a-call page match the rep who
 * actually emails them (Will's catch 2026-07-06: pages all said "Book a call
 * with Will" while Caren/Jaimie sent the emails).
 *
 * Smartlead assigns the sending inbox at SEND time, so pages mint with the
 * default rep. This daily pass (cron 6:55, before the 9am send window) walks
 * every ACTIVE/DRAFTED "Cold Engine" campaign, and for each lead that has (a) a
 * landing_url and (b) at least one sent email, resolves the true sender from
 * message-history (domain → rep: getshortcutcorporate=Caren Skutch,
 * shortcutcorpwellness=Jaimie Pritchard) and writes customization.bookingRep on
 * the page. One-time per page (repSynced flag). E3 carries the link at day +7;
 * this runs within a day of E1 — always ahead of it.
 *
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/sync-page-reps.mjs            # dry
 *   node scripts/sync-page-reps.mjs --confirm
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SL = (process.env.SMARTLEAD_API_KEY || (readFileSync(`${process.env.HOME}/.shortcut-cron.env`, 'utf8').match(/^SMARTLEAD_API_KEY=(.+)$/m)?.[1] || '')).trim();
const CONFIRM = process.argv.includes('--confirm');
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const base = 'https://server.smartlead.ai/api/v1';
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const repFor = (fromEmail) => {
  const dom = String(fromEmail || '').toLowerCase().split('@')[1] || '';
  if (dom === 'getshortcutcorporate.com') return 'Caren Skutch';
  if (dom === 'shortcutcorpwellness.com' || dom === 'shortcutemployeewellness.com') return 'Jaimie Pritchard';
  return null;
};
const tokenOf = (url) => (String(url || '').match(/book-a-call\/([a-z0-9]+)/i) || [])[1] || null;

(async () => {
  const all = await (await fetch(`${base}/campaigns?api_key=${SL}`)).json();
  const campaigns = (Array.isArray(all) ? all : all.data || [])
    .filter((c) => /cold engine/i.test(c.name || '') && ['ACTIVE', 'START', 'STARTED', 'PAUSED', 'DRAFTED'].includes(String(c.status).toUpperCase()));
  log(`${campaigns.length} Cold Engine campaigns to scan${CONFIRM ? '' : ' (dry run)'}`);
  const tally = { checked: 0, synced: 0, already: 0, nosend: 0, notoken: 0, errors: 0 };
  for (const c of campaigns) {
    let off = 0;
    for (;;) {
      const j = await (await fetch(`${base}/campaigns/${c.id}/leads?api_key=${SL}&limit=100&offset=${off}`)).json();
      const rows = j.data || [];
      for (const r of rows) {
        const lead = r.lead || r;
        const url = lead.custom_fields?.landing_url;
        const token = tokenOf(url);
        if (!token) { tally.notoken += 1; continue; }
        tally.checked += 1;
        // page already synced?
        const { data: page } = await sb.from('generic_landing_pages').select('id, customization').eq('unique_token', token).maybeSingle();
        if (!page) { tally.errors += 1; continue; }
        if (page.customization?.repSynced) { tally.already += 1; continue; }
        // actual sender from message-history (only exists once something sent)
        let rep = null;
        try {
          const mh = await (await fetch(`${base}/campaigns/${c.id}/leads/${lead.id}/message-history?api_key=${SL}`)).json();
          const hist = mh.history || mh.data || [];
          const sent = (Array.isArray(hist) ? hist : []).find((m) => String(m.type || '').toUpperCase() === 'SENT' && m.from);
          if (sent) rep = repFor(sent.from);
        } catch { /* skip */ }
        if (!rep) { tally.nosend += 1; continue; }
        if (CONFIRM) {
          await sb.from('generic_landing_pages').update({ customization: { ...(page.customization || {}), bookingRep: rep, repSynced: true } }).eq('id', page.id);
        }
        tally.synced += 1;
        await sleep(60);
      }
      if (rows.length < 100) break;
      off += 100;
    }
    log(`  ${c.id} (${c.status}) done · ${JSON.stringify(tally)}`);
  }
  log(`DONE — ${JSON.stringify(tally)}${CONFIRM ? '' : ' (dry — nothing written)'}`);
})().catch((e) => { console.error('SYNC_PAGE_REPS_ERROR:', e.message); process.exit(1); });
