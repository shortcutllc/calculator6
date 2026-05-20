/**
 * enrich-replies.mjs — backfills reply CONTENT + SENTIMENT that the recurring
 * pull-smartlead path deliberately skips (it records reply *presence* only).
 *
 * Without this, an explicit unsubscribe ("please remove me") looks identical
 * to a warm "Replied" lead — it floats to the TOP of the Play B board and the
 * suppression gate (which scans reply_content) can't catch it because the
 * content is null. Real example: Kari Helgason @ Audible.
 *
 * For every outreach_replies row with NULL content + a campaign_id:
 *   Smartlead /leads?email -> lead_id -> /campaigns/{cid}/leads/{lid}/message-history
 *   -> take the REPLY body, strip HTML + quoted history, classify sentiment
 *   (rule-based; no LLM/key needed — the high-value cases are unambiguous),
 *   write reply_content + reply_sentiment, and for unsubscribe/negative ALSO
 *   upsert crm_suppression (reason do_not_contact) so the gate blocks them
 *   forever. Propose-then-apply: --dry shows everything, writes nothing.
 *
 * Host-bound (SMARTLEAD_API_KEY in openclaw/.shortcut-cron env):
 *   node scripts/enrich-replies.mjs --dry
 *   node scripts/enrich-replies.mjs
 */

import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
// Re-evaluate sentiment on every row that has reply_content using the current
// classifier (catches stale 'positive'/'neutral' labels on long OOO autoreplies
// or rejections the old heuristic missed). Manual labels are always preserved.
const RECLASSIFY_ALL = process.argv.includes('--reclassify-all');
const BASE = 'https://server.smartlead.ai/api/v1';
const SK = (process.env.SMARTLEAD_API_KEY || '').trim();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SK) { console.error('MISSING: SMARTLEAD_API_KEY'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

async function api(path) {
  for (let a = 0; ; a += 1) {
    try {
      const r = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${SK}`);
      if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
      if (!r.ok) throw new Error(`${r.status}`);
      return await r.json();
    } catch (e) {
      if (a >= 4) throw new Error(`smartlead ${path.split('?')[0]}: ${e.message}`);
      await sleep(1000 * 2 ** (a + 1));
    }
  }
}

// Strip HTML, then cut quoted thread history (everything from the first
// "On … wrote:" / "From: …" boundary) so we keep just the new reply text.
function cleanReply(html) {
  let t = String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&#39;|&rsquo;/gi, "'").replace(/&quot;/gi, '"');
  const cut = t.search(/\n?\s*(From:\s|On .+? wrote:|-{2,} ?Original Message|Sent from my )/i);
  if (cut > 0) t = t.slice(0, cut);
  return t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

// Rule-based sentiment. Order: DNC (safety) -> OOO (kill autoreply noise
// before it false-matches pos/neg in a signature) -> NEG -> POS -> LATER.
const DNC = /\bunsubscribe\b|\bremove me\b|\btake me off\b|\bopt[- ]?out\b|\bdo not (contact|email|reach)\b|\bstop (emailing|contacting)\b|\bno longer\b.*\b(here|with)\b/i;
const OOO = /\bout of (the )?office\b|\boutofoffice\b|\bautomatic(ally)? repl|\bauto[- ]?reply\b|\bon (leave|vacation|pto|holiday|annual leave)\b|\bannual leave\b|\b(currently )?(away|unavailable)\b|\blimited access to (email|phone)\b|\breturn(ing)? (on|to the office)\b|\bback (in the office|on)\b|\bupon my return\b|\bwhile i'?m (away|out)\b/i;
const NEG = /\bnot interested\b|\bno,? thank|\bwe('| a)re all set\b|\ball set (here|for|on)\b|\bnot at this time\b|\bnot a (fit|priority|good time)\b|\bnot taking on new\b|\bno need\b|\bplease (stop|don'?t)\b|\bdecline|\bnot looking\b/i;
const POS = /\binterested\b|\blet'?s (chat|connect|talk|set up)|\bhappy to (chat|connect|hop|meet)\b|\bsounds (good|great|interesting)\b|\bschedule a\b|\bset up a (call|time|meeting)\b|\bbook a\b|\btell me more\b|\bwho'?s the right (person|contact)\b|\byes,? (let|i|we|please|happy)\b/i;
const LATER = /\b(circle back|reach back out|follow up|next (quarter|year)|in \d+ (weeks|months)|revisit)\b|\bnot right now\b|\bmaybe (later|in)\b|\bdown the (road|line)\b/i;

function classify(text) {
  const s = (text || '').toLowerCase();
  if (!s) return { sentiment: null, suppress: false };
  if (DNC.test(s)) return { sentiment: 'negative', suppress: true, reason: 'unsubscribe' };
  if (OOO.test(s)) return { sentiment: 'ooo', suppress: false };
  if (NEG.test(s)) return { sentiment: 'negative', suppress: true, reason: 'not_interested' };
  if (POS.test(s)) return { sentiment: 'positive', suppress: false };
  if (LATER.test(s)) return { sentiment: 'maybe_later', suppress: false };
  return { sentiment: 'neutral', suppress: false };
}

async function leadIdByEmail(email) {
  try {
    const j = await api(`/leads?email=${encodeURIComponent(email)}`);
    return j?.id || j?.[0]?.id || j?.data?.[0]?.id || null;
  } catch { return null; }
}

(async () => {
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN');

  // ---------- PASS 1: re-classify ALL existing reply_content (no Smartlead) ----------
  // Stricter classifier catches stale 'positive'/'neutral' on long OOO autoreplies
  // and rejections the old heuristic missed. NEVER overwrite manual labels.
  if (RECLASSIFY_ALL) {
    log('--reclassify-all: re-evaluating sentiment on every reply with content');
    const all = [];
    for (let f = 0; ; f += 1000) {
      const { data, error } = await sb.from('outreach_replies')
        .select('id, email, reply_content, reply_sentiment, sentiment_source')
        .not('reply_content', 'is', null)
        .neq('sentiment_source', 'manual')   // human labels trump regex
        .range(f, f + 999);
      if (error) throw new Error(error.message);
      all.push(...data);
      if (data.length < 1000) break;
    }
    log(`  candidates (have content, not manual): ${all.length}`);
    const changes = { unchanged: 0, updated: 0, by_to: {} };
    const reSuppress = [];
    for (const r of all) {
      const c = classify(r.reply_content);
      if (c.sentiment === r.reply_sentiment) { changes.unchanged += 1; continue; }
      changes.updated += 1;
      const k = `${r.reply_sentiment || 'null'}->${c.sentiment || 'null'}`;
      changes.by_to[k] = (changes.by_to[k] || 0) + 1;
      if (c.suppress && r.email) reSuppress.push({ email: lc(r.email), reason: 'do_not_contact', source: 'reply', detail: { kind: c.reason, snippet: r.reply_content.slice(0, 140) } });
      if (!DRY) {
        const { error } = await sb.from('outreach_replies')
          .update({ reply_sentiment: c.sentiment }).eq('id', r.id);
        if (error) log(`  update err id=${r.id}: ${error.message}`);
      }
    }
    log(`  unchanged: ${changes.unchanged}   updated: ${changes.updated}`);
    log(`  transitions: ${JSON.stringify(changes.by_to)}`);
    log(`  new suppressions discovered: ${reSuppress.length}`);
    if (!DRY && reSuppress.length) {
      // de-dup by email before upsert
      const map = new Map();
      for (const s of reSuppress) if (!map.has(s.email)) map.set(s.email, s);
      const rows = [...map.values()];
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await sb.from('crm_suppression')
          .upsert(rows.slice(i, i + 100), { onConflict: 'email', ignoreDuplicates: false });
        if (error) log(`  suppression upsert error: ${error.message}`);
      }
      log(`  crm_suppression upserted: ${rows.length}`);
    }
  }

  // When run as --reclassify-all alone, skip the Smartlead fetch pass (which
  // takes ~1 call per null-content row). Run plain `enrich-replies.mjs` after
  // the daily cron to scoop up new presence-only rows.
  if (RECLASSIFY_ALL) {
    log(DRY ? 'DRY — nothing written. Re-run without --dry to apply.'
      : 'DONE — re-run generate-plays so Play B reflects updated sentiment + suppressions.');
    return;
  }

  // ---------- PASS 2: fetch reply BODIES we don't have yet (Smartlead) ----------
  // backlog: replies with no text but a fetchable campaign
  const rows = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('outreach_replies')
      .select('id, email, campaign_id, reply_content, reply_sentiment')
      .is('reply_content', null).not('campaign_id', 'is', null)
      .range(f, f + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const work = rows.filter((r) => r.campaign_id && r.email);
  log(`backlog: ${work.length} replies missing content (fetchable)`);

  let fetched = 0; let classified = {}; const suppress = [];
  for (const r of work) {
    const email = lc(r.email);
    const lid = await leadIdByEmail(email);
    if (!lid) { log(`  no lead id for ${email} — skip`); continue; }
    let mh;
    try { mh = await api(`/campaigns/${r.campaign_id}/leads/${lid}/message-history`); }
    catch (e) { log(`  msg-history err ${email}: ${e.message}`); continue; }
    const hist = Array.isArray(mh?.history) ? mh.history : [];
    const replies = hist.filter((m) => /reply/i.test(m.type || m.email_type || ''));
    if (!replies.length) continue;
    const body = cleanReply(replies[replies.length - 1].email_body || replies[replies.length - 1].body || '');
    if (!body) continue;
    fetched += 1;
    const c = classify(body);
    classified[c.sentiment || 'null'] = (classified[c.sentiment || 'null'] || 0) + 1;
    if (c.suppress) suppress.push({ email, reason: 'do_not_contact', source: 'reply', detail: { kind: c.reason, snippet: body.slice(0, 140) } });

    if (DRY) {
      log(`  ${email} -> ${c.sentiment}${c.suppress ? ' [SUPPRESS]' : ''}: "${body.slice(0, 90).replace(/\n/g, ' ')}"`);
    } else {
      await sb.from('outreach_replies').update({
        reply_content: body.slice(0, 4000),
        reply_sentiment: c.sentiment,
      }).eq('id', r.id);
    }
    await sleep(150);
  }

  log('================ BACKFILL SUMMARY ================');
  log(`fetched bodies: ${fetched}/${work.length}`);
  log(`sentiment: ${JSON.stringify(classified)}`);
  log(`to suppress (unsubscribe/negative): ${suppress.length}`);
  for (const s of suppress.slice(0, 15)) log(`  SUPPRESS ${s.email} (${s.detail.kind})`);

  if (!DRY && suppress.length) {
    for (let i = 0; i < suppress.length; i += 100) {
      const { error } = await sb.from('crm_suppression')
        .upsert(suppress.slice(i, i + 100), { onConflict: 'email', ignoreDuplicates: false });
      if (error) log(`  suppression upsert error: ${error.message}`);
    }
    log(`crm_suppression upserted: ${suppress.length}`);
  }
  log(DRY ? 'DRY — nothing written. Re-run without --dry to apply.' : 'DONE — re-run generate-plays to reclassify Play B.');
})().catch((e) => { console.error('ENRICH_REPLIES_ERROR:', e.message); process.exit(1); });
