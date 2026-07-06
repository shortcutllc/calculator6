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

// Hard process watchdog — guarantees an unattended cron can NEVER hang
// forever from any source (scan, Supabase client, etc). The overnight run
// hung 12h; this caps the whole job and exits non-zero so cron logs a clean
// failure. Generous (job is normally ~15min). unref so it can't keep us alive.
const MAX_RUN_MS = 35 * 60 * 1000;
setTimeout(() => { console.error(`PULL_ERROR: hard watchdog ${MAX_RUN_MS / 60000}min exceeded — aborting`); process.exit(1); }, MAX_RUN_MS).unref();

const sb = DRY ? null : createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const tsv = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

const REQ_TIMEOUT_MS = 30000; // Node fetch has NO default timeout — without
// this an open/stalled Smartlead connection hangs the whole job forever
// (this is exactly what hung the overnight run for 12h). On timeout the
// AbortController throws -> caught below -> retried -> after 4 tries the job
// FAILS CLEANLY rather than hanging an unattended cron indefinitely.
async function api(path) {
  for (let a = 0; ; a += 1) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REQ_TIMEOUT_MS);
    try {
      const sep = path.includes('?') ? '&' : '?';
      const res = await fetch(`${BASE}${path}${sep}api_key=${SK}`, { signal: ac.signal });
      if (res.status === 429 && a < 5) { clearTimeout(timer); await sleep(2000 * 2 ** a); continue; }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      if (a >= 4) throw new Error(`Smartlead ${path.split('?')[0]}: ${e.name === 'AbortError' ? `timeout >${REQ_TIMEOUT_MS}ms` : e.message}`);
      await sleep(1000 * 2 ** (a + 1));
    } finally {
      clearTimeout(timer);
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
  const allCampaigns = Array.isArray(all) ? all : all.data || [];
  // CAMPAIGN-level scope (Will, 2026-07-06): don't sweep statistics for every
  // historical campaign — a 2023 COMPLETED campaign cannot produce last-30-day
  // rows, and the all-133 sweep cost ~12 min/run. Keep a campaign iff:
  //   - status is live-ish (ACTIVE/START/PAUSED/DRAFTED — DRAFTED so a draft's
  //     stats appear the moment Will clicks Start), OR
  //   - created within --campaign-months (default 6) — recent COMPLETEDs still
  //     carry in-window sends/replies (a finished sequence = COMPLETED).
  // --full still scans everything (lifetime backfill mode).
  const LIVE_STATUS = new Set(['ACTIVE', 'START', 'STARTED', 'PAUSED', 'DRAFTED']);
  const mi = process.argv.indexOf('--campaign-months');
  const CAMPAIGN_MONTHS = mi >= 0 && process.argv[mi + 1] ? parseInt(process.argv[mi + 1], 10) : 6;
  const cutoff = Date.now() - CAMPAIGN_MONTHS * 30.44 * 86400000;
  const campaigns = FULL ? allCampaigns : allCampaigns.filter((c) =>
    LIVE_STATUS.has(String(c.status || '').toUpperCase())
    || (c.created_at && new Date(c.created_at).getTime() >= cutoff));
  log(`${campaigns.length}/${allCampaigns.length} campaigns to scan (${FULL ? 'FULL history' : `live-status or created <${CAMPAIGN_MONTHS}mo; last ${DAYS}d row filter`})`);

  // Smartlead /statistics returns ONE ROW PER SEQUENCE STEP, so a lead recurs
  // many times per campaign. Dedupe by the table's conflict key BEFORE upsert
  // (Postgres rejects duplicate ON CONFLICT targets in one batch — exactly
  // what failed). Aggregate: earliest sent_time, keep any reply/bounce.
  const campRows = []; const contactRows = [];
  const sendMap = new Map();   // email|campaign_id -> row
  const replyMap = new Map();  // email|campaign_id -> presence row
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
        const sNew = tsv(s.sent_time);
        const rNew = tsv(s.reply_time);
        if (!sRow) {
          sendMap.set(k, { email, campaign_id: cidS, sent_time: sNew, reply_time: rNew, is_bounced: !!s.is_bounced });
        } else {
          if (sNew && (!sRow.sent_time || sNew < sRow.sent_time)) sRow.sent_time = sNew; // earliest
          if (!sRow.reply_time && rNew) sRow.reply_time = rNew;                          // keep any reply
          if (s.is_bounced) sRow.is_bounced = true;                                      // keep any bounce
        }
        if (s.reply_time && !replyMap.has(k)) {
          replyMap.set(k, {
            email, campaign_id: cidS, reply_date: rNew,
            reply_content: null, reply_sentiment: null, is_ooo: false,
            manual_category: null, sentiment_source: 'automated',
          });
        }
      }
      offset += 100;
      if (data.length < 100) break;
      await sleep(150);
    }
    log(`  campaign ${c.id} (${c.status}): ${inWin} in-window`);
    await sleep(150);
  }

  // Reply is PRESENCE only (sentiment deferred — the gate only needs "did
  // they reply"; per-reply content fetch was the pathological slow path,
  // removed). replyMap was built inline, already deduped by conflict key.
  const sendRows = [...sendMap.values()];
  const replyRows = [...replyMap.values()];
  const cMap = new Map(); for (const c of contactRows) cMap.set(c.email, c); // dedupe by email

  log(`campaigns ${campRows.length} | contacts ${cMap.size} | sends ${sendRows.length} | replies ${replyRows.length} (deduped; presence-only)`);

  if (DRY) { log('DRY — no writes. DONE'); return; }
  await upsert('outreach_campaigns', campRows, 'campaign_id');
  await upsert('outreach_contacts', [...cMap.values()], 'email');
  await upsert('outreach_sends', sendRows, 'email,campaign_id');
  await upsert('outreach_replies', replyRows, 'email,campaign_id,sentiment_source');
  log('Pre-flight gate refreshed natively (no openclaw). DONE');
})().catch((e) => { console.error('PULL_ERROR:', e.message); process.exit(1); });
