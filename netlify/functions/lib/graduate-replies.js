/**
 * graduate-replies (shared core) — the cold → personal GRADUATION step.
 *
 * When a cold lead replies POSITIVE (and fresh), move it to the personal lane
 * (channel='personal' + graduated_at) so the cold engine never re-emails it,
 * assign the owning rep, and (optionally) trigger the on-spine draft + Slack
 * ping. Read-only until confirm=true. Reused by BOTH the CLI
 * (scripts/graduate-replies.mjs) and the Netlify scheduled function, so the two
 * can't drift — same pattern as lib/smartlead-pull.js.
 *
 * The two host-specific inputs are passed in, NOT read from disk, so this runs
 * anywhere: `smartleadKey` (was the openclaw .env) and `cache` (was the openclaw
 * smartlead_cache.json; pass {} when unavailable — owner resolution then relies
 * on outreach_sends + live --research, which fully recovers it).
 */
import { assigneeForGmail, repFromCampaignName } from './assignee.js';
import { stampHeartbeat } from './heartbeat.js';

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

// cold (Smartlead) vs personal (rep Gmail), from campaign_id convention.
const channelOf = (cid) => {
  const c = String(cid || '');
  if (/gmail|personal|booth|workhuman-personal/i.test(c)) return 'personal';
  if (/^\d+$/.test(c) || /smartlead/i.test(c)) return 'cold';
  return 'other';
};

// Smartlead sending domain → rep (getshortcutcorporate=Caren, shortcutcorpwellness/employeewellness=Jaimie).
const repFromAccount = (fromEmail) => {
  const e = lc(fromEmail); const dom = e?.split('@')[1];
  if (dom === 'getshortcutcorporate.com') return 'Caren Skutch';
  if (dom === 'shortcutcorpwellness.com' || dom === 'shortcutemployeewellness.com') return 'Jaimie Pritchard';
  return assigneeForGmail(e);
};

/**
 * @param {object}   o
 * @param {object}   o.sb            Supabase service-role client
 * @param {string}   [o.smartleadKey] Smartlead API key (for --research); '' disables research
 * @param {object}   [o.cache]       smartlead_cache.leads object (email → {campaign_name, campaign_id}); {} if none
 * @param {boolean}  [o.confirm]     write the graduation (default dry)
 * @param {boolean}  [o.research]    corroborate owners via Smartlead API
 * @param {boolean}  [o.notify]      POST graduation-notify-background after writing
 * @param {string}   [o.notifyUrl]   the notify endpoint
 * @param {number}   [o.recencyDays] only graduate positives newer than this (default 14)
 * @param {string}   [o.host]        heartbeat host tag
 * @param {function} [o.log]
 * @returns {Promise<{candidates:number, owned:number, saved:number, staleSkipped:number}>}
 */
export async function graduateReplies({
  sb, smartleadKey = '', cache = {}, confirm = false, research = false,
  notify = false, notifyUrl, recencyDays = 14, host = null, log = console.log,
}) {
  const RECENCY_CUTOFF = Date.now() - recencyDays * 86400000;
  const isFresh = (d) => { const t = d ? new Date(d).getTime() : NaN; return Number.isFinite(t) && t >= RECENCY_CUTOFF; };

  const readAll = async (t, cols, mod) => {
    const out = [];
    for (let f = 0; ; f += 1000) {
      let q = sb.from(t).select(cols).range(f, f + 999);
      if (mod) q = mod(q);
      const { data, error } = await q;
      if (error) throw new Error(`${t}: ${error.message}`);
      out.push(...data); if (data.length < 1000) break;
    }
    return out;
  };

  log(confirm ? 'GRADUATE — LIVE (will write)' : 'GRADUATE — dry run (no writes)');

  const replies = await readAll('outreach_replies', 'email, campaign_id, reply_sentiment, reply_date');
  const sends = await readAll('outreach_sends', 'email, campaign_id, sender_email, sent_time');
  const contacts = await readAll('outreach_contacts', 'email, name, company, channel, graduated_at');
  const campaigns = await readAll('outreach_campaigns', 'campaign_id, name');
  const campaignName = new Map(campaigns.map((c) => [String(c.campaign_id), c.name || null]));
  const contactByEmail = new Map(contacts.map((c) => [lc(c.email), c]));

  // POSITIVE + FRESH repliers only (recency guard: stale positives are the
  // historical corpus; graduating them auto-drafts replies to years-old threads).
  const positives = new Set();
  let staleSkipped = 0;
  for (const r of replies) {
    if (lc(r.reply_sentiment) !== 'positive' || !lc(r.email)) continue;
    if (!isFresh(r.reply_date)) { staleSkipped += 1; continue; }
    positives.add(lc(r.email));
  }
  log(`Positive replies: ${positives.size} fresh (<=${recencyDays}d) · ${staleSkipped} stale/undated skipped by the recency guard.`);

  // Owner = rep on the most-recent COLD send to that email.
  const coldOwner = new Map();
  for (const s of sends) {
    const e = lc(s.email); if (!e || channelOf(s.campaign_id) !== 'cold') continue;
    const cur = coldOwner.get(e);
    if (!cur || (s.sent_time && s.sent_time > cur.last)) {
      let owner = s.sender_email ? assigneeForGmail(s.sender_email) : null;
      if (!owner) owner = repFromCampaignName(campaignName.get(String(s.campaign_id)));
      coldOwner.set(e, { owner: owner || null, last: s.sent_time || '' });
    }
  }

  // Smartlead cache (optional): email → campaign_name/id, a richer owner source
  // for legacy Smartlead sends with no sender_email.
  const cacheName = new Map(); const cacheCid = new Map();
  for (const [k, v] of Object.entries(cache || {})) {
    const e = lc(k); cacheName.set(e, v?.campaign_name || null); cacheCid.set(e, v?.campaign_id || null);
  }
  const resolveOwner = (email) => coldOwner.get(email)?.owner || repFromCampaignName(cacheName.get(email)) || null;

  // Candidates: positive reply + reached cold + not already graduated.
  const toGraduate = [];
  for (const email of positives) {
    if (!coldOwner.has(email)) continue;
    const c = contactByEmail.get(email);
    if (c && (c.channel === 'personal' || c.graduated_at)) continue;
    toGraduate.push({ email, owner: resolveOwner(email), name: c?.name || null, company: c?.company || null });
  }

  // --research: corroborate unassigned owners via the Smartlead campaign inboxes,
  // with a per-lead message-history fallback for mixed-domain campaigns.
  if (research && smartleadKey) {
    const campRep = new Map();
    const getCampRep = async (cid) => {
      if (!cid) return null;
      if (campRep.has(cid)) return campRep.get(cid);
      let rep = null;
      try {
        const r = await fetch(`https://server.smartlead.ai/api/v1/campaigns/${cid}/email-accounts?api_key=${smartleadKey}`);
        const accs = await r.json();
        const reps = new Set((Array.isArray(accs) ? accs : []).map((a) => repFromAccount(a.from_email || a.email)).filter(Boolean));
        rep = reps.size === 1 ? [...reps][0] : (reps.size > 1 ? 'MIXED' : null);
      } catch { rep = null; }
      campRep.set(cid, rep); return rep;
    };
    const ownerFromHistory = async (email) => {
      try {
        const lr = await fetch(`https://server.smartlead.ai/api/v1/leads/?api_key=${smartleadKey}&email=${encodeURIComponent(email)}`);
        const lj = await lr.json();
        const L = Array.isArray(lj) ? lj[0] : (lj?.data?.[0] || lj);
        const lid = L?.id || L?.lead?.id;
        const camps = L?.lead_campaign_data || L?.campaigns || [];
        if (!lid || !camps.length) return null;
        for (const c of camps) {
          const cid = c.campaign_id || c.id; if (!cid) continue;
          const hr = await fetch(`https://server.smartlead.ai/api/v1/campaigns/${cid}/leads/${lid}/message-history?api_key=${smartleadKey}`);
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
  } else if (research) {
    log('  (--research skipped: no Smartlead API key)');
  }

  const owned = toGraduate.filter((g) => g.owner).length;
  log(`\nPositive cold replies ready to graduate: ${toGraduate.length}`);
  log(`  owner assigned: ${owned} (${toGraduate.length ? Math.round(owned / toGraduate.length * 100) : 0}%) · unassigned: ${toGraduate.length - owned}`);
  for (const g of toGraduate.slice(0, 25)) log(`  ${g.email.padEnd(38)} owner=${g.owner || '?'}  ${g.company || ''}`);
  if (toGraduate.length > 25) log(`  …and ${toGraduate.length - 25} more`);

  if (!confirm) {
    log('\nDRY RUN — re-run with confirm to graduate these to the personal lane.');
    return { candidates: toGraduate.length, owned, saved: 0, staleSkipped };
  }

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

  // --notify: kick the auto-draft + Slack ping. The function reads pending
  // graduations itself and is capped + idempotent, so fire-and-forget is safe.
  // DRAFTS + PINGS only — the rep still clicks Send (human door).
  if (notify) {
    try {
      const r = await fetch(notifyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      log(`  notify: triggered graduation-notify-background (HTTP ${r.status}). Owners get a suggested reply in Slack shortly.`);
    } catch (e) {
      log(`  notify warn: could not reach graduation-notify-background (${e.message}).`);
    }
  }

  await stampHeartbeat(sb, 'graduate-replies', { host, note: `${saved} graduated` });
  return { candidates: toGraduate.length, owned, saved, staleSkipped };
}
