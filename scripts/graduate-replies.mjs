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
 *   node scripts/graduate-replies.mjs                     # dry: who WOULD graduate
 *   node scripts/graduate-replies.mjs --confirm           # write channel/graduated state
 *   node scripts/graduate-replies.mjs --confirm --notify  # + auto-draft a suggested
 *                                                         #   reply and ping each owner
 *                                                         #   in Slack (drafts only,
 *                                                         #   never sends)
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { assigneeForGmail, repFromCampaignName } from '../netlify/functions/lib/assignee.js';

const CONFIRM = process.argv.includes('--confirm');
const RESEARCH = process.argv.includes('--research');   // corroborate owners via Smartlead campaign inboxes
const NOTIFY = process.argv.includes('--notify');       // after writing, trigger the auto-draft + Slack ping
// RECENCY GUARD — only graduate FRESH positive replies. Without this, a reclassify
// (or a corpus backfill) turns old neutral replies into positives and the cron
// graduates years-old replies (a Jan 2023 "let's meet" auto-drafted in 2026). A
// positive reply must be within this many days, and must HAVE a date (fail closed:
// the historical Gmail corpus has null reply_date — never auto-graduate those).
const RECENCY_DAYS = (() => { const i = process.argv.indexOf('--recency-days'); const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : parseInt(process.env.GRADUATION_RECENCY_DAYS || '', 10); return Number.isFinite(v) && v > 0 ? v : 14; })();
const RECENCY_CUTOFF = Date.now() - RECENCY_DAYS * 86400000;
const isFresh = (d) => { const t = d ? new Date(d).getTime() : NaN; return Number.isFinite(t) && t >= RECENCY_CUTOFF; };
// Deployed graduation-notify-background endpoint (override for local/preview).
const NOTIFY_URL = (process.env.GRADUATION_NOTIFY_URL || 'https://proposals.getshortcut.co/.netlify/functions/graduation-notify-background').trim();
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const SMARTLEAD = (() => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(/^SMARTLEAD_API_KEY=(.+)$/m)?.[1] || '').trim(); } catch { return ''; } })();
// Smartlead sending domain → rep (getshortcutcorporate=Caren, shortcutcorpwellness/employeewellness=Jaimie).
const repFromAccount = (fromEmail) => {
  const e = lc(fromEmail); const dom = e?.split('@')[1];
  if (dom === 'getshortcutcorporate.com') return 'Caren Skutch';
  if (dom === 'shortcutcorpwellness.com' || dom === 'shortcutemployeewellness.com') return 'Jaimie Pritchard';
  return assigneeForGmail(e);
};
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

  // POSITIVE repliers (triage: only positive graduates) — AND the reply must be
  // fresh (see RECENCY_DAYS). Stale positives are the historical corpus; graduating
  // them auto-drafts a reply to a conversation from years ago.
  const positives = new Set();
  let staleSkipped = 0;
  for (const r of replies) {
    if (lc(r.reply_sentiment) !== 'positive' || !lc(r.email)) continue;
    if (!isFresh(r.reply_date)) { staleSkipped += 1; continue; }
    positives.add(lc(r.email));
  }
  log(`Positive replies: ${positives.size} fresh (<=${RECENCY_DAYS}d) · ${staleSkipped} stale/undated skipped by the recency guard.`);

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
  const cacheName = new Map(); const cacheCid = new Map();
  try {
    const leads = JSON.parse(readFileSync(`${OPENCLAW}/smartlead_cache.json`, 'utf8')).leads || {};
    for (const [k, v] of Object.entries(leads)) { const e = lc(k); cacheName.set(e, v?.campaign_name || null); cacheCid.set(e, v?.campaign_id || null); }
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

  // --research: corroborate unassigned owners via the Smartlead campaign's
  // sending inboxes (per campaign, memoized). Single-rep campaign → assign that
  // rep; mixed-domain (Caren + Jaimie rotated) stays unassigned for human claim.
  if (RESEARCH && SMARTLEAD) {
    const campRep = new Map();
    const getCampRep = async (cid) => {
      if (!cid) return null;
      if (campRep.has(cid)) return campRep.get(cid);
      let rep = null;
      try {
        const r = await fetch(`https://server.smartlead.ai/api/v1/campaigns/${cid}/email-accounts?api_key=${SMARTLEAD}`);
        const accs = await r.json();
        const reps = new Set((Array.isArray(accs) ? accs : []).map((a) => repFromAccount(a.from_email || a.email)).filter(Boolean));
        rep = reps.size === 1 ? [...reps][0] : (reps.size > 1 ? 'MIXED' : null);
      } catch { rep = null; }
      campRep.set(cid, rep); return rep;
    };
    // Per-lead fallback for MIXED-domain campaigns (Cold Engine uses both Caren's
    // + Jaimie's inboxes): the campaign-level inbox check can't say WHO sent to a
    // given lead, but the lead's message-history shows the actual sending inbox in
    // the SENT 'from' address → the real owner. Bounded to unresolved repliers.
    const ownerFromHistory = async (email) => {
      try {
        const lr = await fetch(`https://server.smartlead.ai/api/v1/leads/?api_key=${SMARTLEAD}&email=${encodeURIComponent(email)}`);
        const lj = await lr.json();
        const L = Array.isArray(lj) ? lj[0] : (lj?.data?.[0] || lj);
        const lid = L?.id || L?.lead?.id;
        const camps = L?.lead_campaign_data || L?.campaigns || [];
        if (!lid || !camps.length) return null;
        for (const c of camps) {                               // try each campaign the lead is in
          const cid = c.campaign_id || c.id; if (!cid) continue;
          const hr = await fetch(`https://server.smartlead.ai/api/v1/campaigns/${cid}/leads/${lid}/message-history?api_key=${SMARTLEAD}`);
          const hj = await hr.json();
          const arr = hj.history || hj.data || (Array.isArray(hj) ? hj : []);
          const sent = arr.find((m) => String(m.type || '').toUpperCase() === 'SENT' && m.from);
          const rep = sent ? repFromAccount(sent.from) : null;
          if (rep) return rep;
        }
      } catch { /* fall through */ }
      return null;
    };
    let researched = 0; let viaHistory = 0;
    for (const g of toGraduate) {
      if (g.owner) continue;
      const rep = await getCampRep(cacheCid.get(g.email));
      if (rep && rep !== 'MIXED') { g.owner = rep; researched += 1; }
      else { const h = await ownerFromHistory(g.email); if (h) { g.owner = h; viaHistory += 1; } }
      await new Promise((r) => setTimeout(r, 60));
    }
    log(`  researched ${researched} owners via campaign inboxes + ${viaHistory} via per-lead message-history`);
  } else if (RESEARCH) {
    log('  (--research skipped: MISSING SMARTLEAD_API_KEY)');
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

  // --notify: kick the auto-draft + Slack ping for newly graduated leads.
  // The function reads pending graduations (graduation_notified_at IS NULL)
  // itself and is capped + idempotent, so a fire-and-forget POST is safe.
  // It DRAFTS and PINGS only — the rep still clicks Send (human door).
  if (NOTIFY) {
    try {
      const r = await fetch(NOTIFY_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      log(`  notify: triggered graduation-notify-background (HTTP ${r.status}). Owners get a suggested reply in Slack shortly.`);
    } catch (e) {
      log(`  notify warn: could not reach graduation-notify-background (${e.message}). Run it manually or wait for the cron.`);
    }
  } else {
    log('  (add --notify to auto-draft a suggested reply + ping each owner in Slack)');
  }
  log('DONE');
})().catch((e) => { console.error('GRADUATE_ERROR:', e.message); process.exit(1); });
