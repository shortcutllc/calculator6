/**
 * ingest-templates.mjs — pulls Smartlead campaign email bodies into
 * public.outreach_templates and joins each to its campaign's measured reply
 * rate (computed from outreach_sends already in Supabase — no extra stats
 * pull). draft-outreach.js reads the top performers as grounding.
 *
 * Host-bound (needs SMARTLEAD_API_KEY — same as pull-smartlead.mjs):
 *   export SMARTLEAD_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/ingest-templates.mjs [--dry]
 *
 * Idempotent (upsert on campaign_id,seq_number). Read-only on Smartlead.
 */

import { createClient } from '@supabase/supabase-js';

const BASE = 'https://server.smartlead.ai/api/v1';
const DRY = process.argv.includes('--dry');
const SK = (process.env.SMARTLEAD_API_KEY || '').trim();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SK) { console.error('MISSING_ENV: SMARTLEAD_API_KEY'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_RUN_MS = 20 * 60 * 1000;
setTimeout(() => { console.error('INGEST_ERROR: hard watchdog exceeded'); process.exit(1); }, MAX_RUN_MS).unref();

const REQ_TIMEOUT_MS = 30000;
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
      if (a >= 4) throw new Error(`Smartlead ${path.split('?')[0]}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
      await sleep(1000 * 2 ** (a + 1));
    } finally {
      clearTimeout(timer);
    }
  }
}

// HTML -> readable text. Keep {{merge}} tags and {spin|tax} (pattern signal).
function htmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&#39;|&rsquo;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ').trim();
}

// Campaign-level sent/replied from outreach_sends (already in Supabase).
async function campaignReplyStats() {
  const stats = new Map(); // campaign_id -> { sent, replied }
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('outreach_sends')
      .select('campaign_id, reply_time').range(from, from + 999);
    if (error) throw new Error(`outreach_sends: ${error.message}`);
    for (const r of data) {
      const cid = r.campaign_id == null ? '' : String(r.campaign_id);
      const s = stats.get(cid) || { sent: 0, replied: 0 };
      s.sent += 1;
      if (r.reply_time) s.replied += 1;
      stats.set(cid, s);
    }
    if (data.length < 1000) break;
  }
  return stats;
}

async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 300) {
    const batch = rows.slice(i, i + 300);
    for (let a = 0; ; a += 1) {
      try {
        const { error } = await sb.from('outreach_templates')
          .upsert(batch, { onConflict: 'campaign_id,seq_number', ignoreDuplicates: false });
        if (error) throw new Error([error.message, error.code, error.details, error.hint].filter(Boolean).join(' | ') || 'unknown supabase error');
        break;
      } catch (e) {
        if (a >= 4) throw new Error(`upsert outreach_templates: ${e.message}`);
        await sleep(1000 * 2 ** (a + 1));
      }
    }
    log(`  upserted ${Math.min(i + 300, rows.length)}/${rows.length}`);
  }
}

(async () => {
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN');
  const stats = await campaignReplyStats();
  log(`reply stats for ${stats.size} campaigns from outreach_sends`);

  const all = await api('/campaigns');
  const campaigns = Array.isArray(all) ? all : all.data || [];
  log(`${campaigns.length} campaigns; fetching sequences`);

  const rows = [];
  for (const c of campaigns) {
    const cid = String(c.id);
    let seq;
    try { seq = await api(`/campaigns/${c.id}/sequences`); }
    catch (e) { log(`  campaign ${cid}: sequences error ${e.message} — skip`); continue; }
    const steps = Array.isArray(seq) ? seq : seq.data || [];
    const st = stats.get(cid) || { sent: 0, replied: 0 };
    const rate = st.sent > 0 ? Number((st.replied / st.sent).toFixed(4)) : null;
    const seenSeq = new Set();
    let idx = 0;
    for (const s of steps) {
      const body = htmlToText(s.email_body);
      if (!body && !s.subject) { idx += 1; continue; }
      // seq_number can repeat or be null across steps/variants → guarantee a
      // unique (campaign_id, seq_number) so the batch upsert can't collide.
      let sn = Number.isFinite(s.seq_number) ? s.seq_number : idx + 1;
      while (seenSeq.has(sn)) sn += 100;
      seenSeq.add(sn);
      idx += 1;
      rows.push({
        campaign_id: cid,
        seq_number: sn,
        campaign_name: c.name || null,
        subject: s.subject || null,
        body: body || null,
        variant_count: Array.isArray(s.sequence_variants) ? s.sequence_variants.length : 0,
        sent: st.sent,
        replied: st.replied,
        reply_rate: rate,
      });
    }
    await sleep(120);
  }

  const withVol = rows.filter((r) => r.sent >= 25 && r.reply_rate != null)
    .sort((a, b) => b.reply_rate - a.reply_rate);
  log(`${rows.length} template steps; ${withVol.length} with >=25 sends`);
  log('Top 5 by reply rate (>=25 sends):');
  for (const r of withVol.slice(0, 5)) {
    log(`  ${(r.reply_rate * 100).toFixed(1)}%  n=${r.sent}  "${(r.subject || '').slice(0, 60)}"  [${r.campaign_name}]`);
  }

  if (DRY) { log('DRY — no writes. DONE'); return; }
  await upsert(rows);
  log(`DONE — ${rows.length} template steps upserted`);
})().catch((e) => { console.error('INGEST_ERROR:', e.message); process.exit(1); });
