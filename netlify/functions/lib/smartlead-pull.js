/**
 * smartlead-pull.js — the Smartlead → Supabase reply/send PRESENCE refresh, shared
 * by the CLI (scripts/pull-smartlead.mjs) and the Netlify scheduled function
 * (smartlead-pull.js). ONE source of truth so the cron and the cloud run identically.
 *
 * Scope (Will 2026-07-09): scan ONLY campaigns LAUNCHED in the last `campaignMonths`
 * (default 3) — a cold campaign older than that has no fresh replies, and the old
 * all-status sweep took ~13min. Reply PRESENCE only (fast); content/sentiment is
 * deferred to enrich-replies. Idempotent upserts. Reply rows are INSERT-ONLY so a
 * pull never clobbers a classification enrich-replies already wrote.
 */

const BASE = 'https://server.smartlead.ai/api/v1';
const REQ_TIMEOUT_MS = 30000; // Node fetch has no default timeout; a stalled Smartlead conn would hang forever.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const tsv = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

function makeApi(apiKey) {
  return async function api(path) {
    for (let a = 0; ; a += 1) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), REQ_TIMEOUT_MS);
      try {
        const sep = path.includes('?') ? '&' : '?';
        const res = await fetch(`${BASE}${path}${sep}api_key=${apiKey}`, { signal: ac.signal });
        if (res.status === 429 && a < 5) { clearTimeout(timer); await sleep(2000 * 2 ** a); continue; }
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
      } catch (e) {
        if (a >= 4) throw new Error(`Smartlead ${path.split('?')[0]}: ${e.name === 'AbortError' ? `timeout >${REQ_TIMEOUT_MS}ms` : e.message}`);
        await sleep(1000 * 2 ** (a + 1));
      } finally { clearTimeout(timer); }
    }
  };
}

async function upsertRows(sb, table, rows, conflict, insertOnly = false) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = rows.slice(i, i + 400);
    for (let a = 0; ; a += 1) {
      try {
        const { error } = await sb.from(table).upsert(batch, { onConflict: conflict, ignoreDuplicates: insertOnly });
        if (error) throw new Error(error.message);
        break;
      } catch (e) {
        if (a >= 4) throw new Error(`upsert ${table}: ${e.message}`);
        await sleep(1000 * 2 ** (a + 1));
      }
    }
  }
}

/**
 * Run the pull. Pass a Supabase client (`sb`) and Smartlead `apiKey`.
 * @returns {{campaigns:number, contacts:number, sends:number, replies:number, scanned:number, total:number}}
 */
export async function pullSmartlead({ sb, apiKey, full = false, days = 30, campaignMonths = 3, dry = false, log = () => {} }) {
  if (!apiKey) throw new Error('MISSING SMARTLEAD_API_KEY');
  if (!dry && !sb) throw new Error('MISSING Supabase client');
  const api = makeApi(apiKey);
  const CUTOFF = full ? null : Date.now() - days * 86400000;
  log(`${dry ? 'DRY' : 'LIVE'} — window: ${full ? 'FULL history' : `last ${days} days`}`);

  const all = await api('/campaigns');
  const allCampaigns = Array.isArray(all) ? all : all.data || [];
  const cutoff = Date.now() - campaignMonths * 30.44 * 86400000;
  const campaigns = full ? allCampaigns
    : allCampaigns.filter((c) => c.created_at && new Date(c.created_at).getTime() >= cutoff);
  log(`${campaigns.length}/${allCampaigns.length} campaigns to scan (${full ? 'FULL history' : `launched <${campaignMonths}mo; last ${days}d row filter`})`);

  const campRows = []; const contactRows = [];
  const sendMap = new Map(); const replyMap = new Map();
  for (const c of campaigns) {
    campRows.push({ campaign_id: String(c.id), name: c.name || null, status: c.status || null });
    let offset = 0; let inWin = 0;
    for (;;) {
      const page = await api(`/campaigns/${c.id}/statistics?limit=100&offset=${offset}`);
      const data = page.data || [];
      for (const s of data) {
        const email = lc(s.lead_email); if (!email) continue;
        const st = s.sent_time ? Date.parse(s.sent_time) : NaN;
        const rt = s.reply_time ? Date.parse(s.reply_time) : NaN;
        if (CUTOFF && !((Number.isFinite(st) && st >= CUTOFF) || (Number.isFinite(rt) && rt >= CUTOFF))) continue;
        inWin += 1;
        const cidS = String(c.id);
        const k = `${email}|${cidS}`;
        contactRows.push({ email, name: s.lead_name || null });
        const sRow = sendMap.get(k);
        const sNew = tsv(s.sent_time); const rNew = tsv(s.reply_time);
        if (!sRow) sendMap.set(k, { email, campaign_id: cidS, sent_time: sNew, reply_time: rNew, is_bounced: !!s.is_bounced });
        else {
          if (sNew && (!sRow.sent_time || sNew < sRow.sent_time)) sRow.sent_time = sNew;
          if (!sRow.reply_time && rNew) sRow.reply_time = rNew;
          if (s.is_bounced) sRow.is_bounced = true;
        }
        if (s.reply_time && !replyMap.has(k)) {
          replyMap.set(k, { email, campaign_id: cidS, reply_date: rNew, reply_content: null, reply_sentiment: null, is_ooo: false, manual_category: null, sentiment_source: 'automated' });
        }
      }
      offset += 100;
      if (data.length < 100) break;
      await sleep(150);
    }
    log(`  campaign ${c.id} (${c.status}): ${inWin} in-window`);
    await sleep(150);
  }

  const sendRows = [...sendMap.values()];
  const replyRows = [...replyMap.values()];
  const cMap = new Map(); for (const c of contactRows) cMap.set(c.email, c);
  const summary = { campaigns: campRows.length, contacts: cMap.size, sends: sendRows.length, replies: replyRows.length, scanned: campaigns.length, total: allCampaigns.length };
  log(`campaigns ${campRows.length} | contacts ${cMap.size} | sends ${sendRows.length} | replies ${replyRows.length} (deduped; presence-only)`);
  if (dry) { log('DRY — no writes. DONE'); return summary; }

  await upsertRows(sb, 'outreach_campaigns', campRows, 'campaign_id');
  await upsertRows(sb, 'outreach_contacts', [...cMap.values()], 'email');
  await upsertRows(sb, 'outreach_sends', sendRows, 'email,campaign_id');
  await upsertRows(sb, 'outreach_replies', replyRows, 'email,campaign_id,sentiment_source', true);
  log('DONE');
  return summary;
}
