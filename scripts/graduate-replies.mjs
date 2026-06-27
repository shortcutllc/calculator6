/**
 * graduate-replies.mjs — the cold → personal GRADUATION step (loop organ).
 *
 * When a cold lead replies POSITIVE, it moves to the personal lane: marked
 * channel='personal' + graduated_at so the cold engine never re-emails it, an
 * owner is assigned, and it surfaces in Follow-ups for a human to reply 1:1
 * (where conversion is ~28x cold). TRIAGE: only positive replies graduate;
 * OOO / negative / unsubscribe do not (suppression handles DNCs elsewhere).
 *
 * Read-only until --confirm. The actual reply DRAFT + Slack ping reuse the
 * existing draft engine + Follow-ups surface (a graduated lead already shows
 * there as a hot reply); this step is the routing + state that feeds them.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/graduate-replies.mjs            # dry: who WOULD graduate
 *   node scripts/graduate-replies.mjs --confirm  # write channel/graduated state
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { assigneeForGmail, repFromCampaignName } from '../netlify/functions/lib/assignee.js';

const CONFIRM = process.argv.includes('--confirm');
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

// cold (Smartlead) vs personal (rep Gmail), from campaign_id convention.
const channelOf = (cid) => {
  const c = String(cid || '');
  if (/gmail|personal|booth|workhuman-personal/i.test(c)) return 'personal';
  if (/^\d+$/.test(c) || /smartlead/i.test(c)) return 'cold';
  return 'other';
};

async function readAll(t, cols, mod) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    let q = sb.from(t).select(cols).range(f, f + 999);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  log(CONFIRM ? 'GRADUATE — LIVE (will write)' : 'GRADUATE — dry run (no writes)');

  const replies = await readAll('outreach_replies', 'email, campaign_id, reply_sentiment, reply_date');
  const sends = await readAll('outreach_sends', 'email, campaign_id, sender_email, sent_time');
  const contacts = await readAll('outreach_contacts', 'email, name, company, channel, graduated_at');
  const campaigns = await readAll('outreach_campaigns', 'campaign_id, name');
  const campaignName = new Map(campaigns.map((c) => [String(c.campaign_id), c.name || null]));
  const contactByEmail = new Map(contacts.map((c) => [lc(c.email), c]));

  // POSITIVE repliers (triage: only positive graduates).
  const positives = new Set();
  for (const r of replies) { if (lc(r.reply_sentiment) === 'positive' && lc(r.email)) positives.add(lc(r.email)); }

  // Owner = rep on the most-recent COLD send to that email.
  const coldOwner = new Map(); // email -> { owner, last }
  for (const s of sends) {
    const e = lc(s.email); if (!e || channelOf(s.campaign_id) !== 'cold') continue;
    const cur = coldOwner.get(e);
    if (!cur || (s.sent_time && s.sent_time > cur.last)) {
      let owner = s.sender_email ? assigneeForGmail(s.sender_email) : null;
      if (!owner) owner = repFromCampaignName(campaignName.get(String(s.campaign_id)));
      coldOwner.set(e, { owner: owner || null, last: s.sent_time || '' });
    }
  }

  // Smartlead cache: email → campaign_name. Richer owner-via-campaign source for
  // legacy Smartlead sends (no sender_email). repFromCampaignName now matches the
  // rep name anywhere ("| Will", "Jaimie Campaign", "Will MHAM"), not just "- Will".
  let cacheName = new Map();
  try {
    const leads = JSON.parse(readFileSync('/Users/willnewton/.openclaw/workspace/smartlead_cache.json', 'utf8')).leads || {};
    cacheName = new Map(Object.entries(leads).map(([k, v]) => [lc(k), v?.campaign_name || null]));
  } catch { /* cache optional */ }
  const resolveOwner = (email) => coldOwner.get(email)?.owner || repFromCampaignName(cacheName.get(email)) || null;

  // Candidates: positive reply + was reached cold + not already graduated.
  const toGraduate = [];
  for (const email of positives) {
    if (!coldOwner.has(email)) continue;                 // not a cold lead
    const c = contactByEmail.get(email);
    if (c && (c.channel === 'personal' || c.graduated_at)) continue; // already graduated
    toGraduate.push({ email, owner: resolveOwner(email), name: c?.name || null, company: c?.company || null });
  }

  const owned = toGraduate.filter((g) => g.owner).length;
  log(`\nPositive cold replies ready to graduate: ${toGraduate.length}`);
  log(`  owner assigned: ${owned} (${toGraduate.length ? Math.round(owned / toGraduate.length * 100) : 0}%) · unassigned: ${toGraduate.length - owned}`);
  for (const g of toGraduate.slice(0, 25)) log(`  ${g.email.padEnd(38)} owner=${g.owner || '?'}  ${g.company || ''}`);
  if (toGraduate.length > 25) log(`  …and ${toGraduate.length - 25} more`);

  if (!CONFIRM) { log('\nDRY RUN — re-run with --confirm to graduate these to the personal lane.'); return; }

  const at = new Date().toISOString();
  let saved = 0;
  for (let i = 0; i < toGraduate.length; i += 200) {
    const rows = toGraduate.slice(i, i + 200).map((g) => ({
      email: g.email, channel: 'personal', graduated_at: at,
      graduated_reason: 'positive_cold_reply', graduated_owner: g.owner,
    }));
    const { error } = await sb.from('outreach_contacts').upsert(rows, { onConflict: 'email' });
    if (error) log(`  writeback warn: ${error.message}`); else saved += rows.length;
  }
  log(`\nGRADUATED ${saved} leads to the personal lane (channel=personal). They leave cold and surface in Follow-ups for a 1:1 reply.`);
  log('DONE');
})().catch((e) => { console.error('GRADUATE_ERROR:', e.message); process.exit(1); });
