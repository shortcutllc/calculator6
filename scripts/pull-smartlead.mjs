/**
 * pull-smartlead.mjs — NATIVE Smartlead -> Supabase refresh. Replaces the
 * openclaw build_smartlead_cache.js + re-ingest chain entirely: no openclaw
 * scripts, no intermediary cache JSON. This is the recurring cron entrypoint.
 *
 * Default: ALL campaigns (status-agnostic), last 30 days of activity only
 * (the lifetime is already in Supabase from the one-time backfill).
 * Upserts outreach_campaigns/contacts/sends/replies idempotently. Reply
 * PRESENCE only (fast) — content/sentiment of new replies is deferred
 * enrichment the gate doesn't need; left null.
 *
 *   export SMARTLEAD_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/pull-smartlead.mjs [--days 30] [--full] [--dry]
 *
 * (Cron sources ~/.shortcut-cron.env for the keys — zero openclaw reliance.)
 */

import { createClient } from '@supabase/supabase-js';

const BASE = 'https://server.smartlead.ai/api/v1';
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FULL = args.includes('--full');
const di = args.indexOf('--days');
const DAYS = di !== -1 && args[di + 1] ? parseInt(args[di + 1], 10) || 30 : 30;
const CUTOFF = FULL ? null : Date.now() - DAYS * 86400000;

const SK = (process.env.SMARTLEAD_API_KEY || '').trim();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SK) { console.error('MISSING_ENV: SMARTLEAD_API_KEY'); process.exit(2); }
if (!DRY && (!/^https?:\/\//i.test(URL) || !KEY)) { console.error('MISSING_ENV: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const sb = DRY ? null : createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const tsv = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

async function api(path) {
  for (let a = 0; ; a += 1) {
    try {
      const sep = path.includes('?') ? '&' : '?';
      const res = await fetch(`${BASE}${path}${sep}api_key=${SK}`);
      if (res.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      if (a >= 4) throw new Error(`Smartlead ${path.split('?')[0]}: ${e.message}`);
      await sleep(1000 * 2 ** (a + 1));
    }
  }
}

async function upsert(table, rows, conflict) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = rows.slice(i, i + 400);
    for (let a = 0; ; a += 1) {
      try {
        const { error } = await sb.from(table).upsert(batch, { onConflict: conflict, ignoreDuplicates: false });
        if (error) throw new Error(error.message);
        break;
      } catch (e) {
        if (a >= 4) throw new Error(`upsert ${table}: ${e.message}`);
        await sleep(1000 * 2 ** (a + 1));
      }
    }
  }
}

(async () => {
  log(`${DRY ? 'DRY' : 'LIVE'} — window: ${FULL ? 'FULL history' : `last ${DAYS} days`}`);
  const all = await api('/campaigns');
  // Scan ALL campaigns regardless of status — recent cold sends/replies live
  // in COMPLETED campaigns (a finished sequence = COMPLETED). The 30-day
  // ROW-level date filter is the real "recent only" gate; campaign status /
  // updated_at are not reliable proxies (verified: 129/130 "updated" <35d).
  const campaigns = Array.isArray(all) ? all : all.data || [];
  log(`${campaigns.length} campaigns to scan (status-agnostic; ${FULL ? 'FULL history' : `last ${DAYS}d row filter`})`);

  const campRows = []; const contactRows = []; const sendRows = []; const replyStubs = [];
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
        contactRows.push({ email, name: s.lead_name || null });
        sendRows.push({ email, campaign_id: String(c.id), sent_time: tsv(s.sent_time), reply_time: tsv(s.reply_time), is_bounced: !!s.is_bounced });
        if (s.reply_time) replyStubs.push({ email, campaign_id: String(c.id), reply_time: s.reply_time, lead_id: s.lead_id || null, cid: c.id });
      }
      offset += 100;
      if (data.length < 100) break;
      await sleep(150);
    }
    log(`  campaign ${c.id} (${c.status}): ${inWin} in-window`);
    await sleep(150);
  }

  // Reply PRESENCE only — fast path. The pre-flight gate acts on "did they
  // reply at all" (caution_recently_contacted); it does NOT need content or
  // sentiment of brand-new replies. Resolving each reply's lead id costs
  // O(pages)/reply (stats rows carry no lead_id), which made the recurring
  // job pathologically slow. Content/sentiment of new replies is enrichment
  // — left null here (consistent with treating unknown sentiment as
  // low-confidence). A separate optional deep pass can classify if needed.
  const replyRows = replyStubs.map((r) => ({
    email: r.email, campaign_id: r.campaign_id, reply_date: tsv(r.reply_time),
    reply_content: null, reply_sentiment: null, is_ooo: false,
    manual_category: null, sentiment_source: 'automated',
  }));

  // dedupe contacts by email (last wins)
  const cMap = new Map(); for (const c of contactRows) cMap.set(c.email, c);

  log(`campaigns ${campRows.length} | contacts ${cMap.size} | sends ${sendRows.length} | replies ${replyRows.length} (presence-only; sentiment deferred)`);

  if (DRY) { log('DRY — no writes. DONE'); return; }
  await upsert('outreach_campaigns', campRows, 'campaign_id');
  await upsert('outreach_contacts', [...cMap.values()], 'email');
  await upsert('outreach_sends', sendRows, 'email,campaign_id');
  await upsert('outreach_replies', replyRows, 'email,campaign_id,sentiment_source');
  log('Pre-flight gate refreshed natively (no openclaw). DONE');
})().catch((e) => { console.error('PULL_ERROR:', e.message); process.exit(1); });
