/**
 * enrich-replies (shared core) — backfill reply CONTENT + SENTIMENT that the
 * pull path deliberately skips (it records reply *presence* only).
 *
 * For every outreach_replies row with NULL content + a campaign_id: fetch the
 * body from Smartlead, strip HTML + quoted history, classify sentiment
 * (rule-based via lib/sentiment.js — NO LLM), write reply_content +
 * reply_sentiment, and for unsubscribe/negative ALSO upsert crm_suppression so
 * the gate blocks them forever. `reclassifyAll` re-labels every existing reply
 * with the current classifier (weekly maintenance; skips the Smartlead fetch).
 *
 * Reused by BOTH the CLI (scripts/enrich-replies.mjs) and the Netlify scheduled
 * function so the two can't drift. Env-only inputs (Smartlead key passed in),
 * so it runs anywhere. Read-only when dry=true.
 */
import { classify, cleanReply } from './sentiment.js';
import { stampHeartbeat } from './heartbeat.js';

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object}   o
 * @param {object}   o.sb            Supabase service-role client
 * @param {string}   o.smartleadKey  Smartlead API key (required for the backfill fetch pass)
 * @param {boolean}  [o.reclassifyAll] re-label existing content instead of fetching new (weekly)
 * @param {boolean}  [o.dry]         no writes
 * @param {string}   [o.host]        heartbeat host tag
 * @param {function} [o.log]
 * @returns {Promise<object>} summary
 */
export async function enrichReplies({ sb, smartleadKey, reclassifyAll = false, dry = false, host = null, log = console.log }) {
  const BASE = 'https://server.smartlead.ai/api/v1';
  const api = async (path) => {
    for (let a = 0; ; a += 1) {
      try {
        const r = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${smartleadKey}`);
        if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
        if (!r.ok) throw new Error(`${r.status}`);
        return await r.json();
      } catch (e) {
        if (a >= 4) throw new Error(`smartlead ${path.split('?')[0]}: ${e.message}`);
        await sleep(1000 * 2 ** (a + 1));
      }
    }
  };
  const leadIdByEmail = async (email) => {
    try {
      const j = await api(`/leads?email=${encodeURIComponent(email)}`);
      return j?.id || j?.[0]?.id || j?.data?.[0]?.id || null;
    } catch { return null; }
  };

  log(dry ? 'DRY RUN — no writes' : 'LIVE RUN');

  // ---------- PASS 1: re-classify ALL existing reply_content (no Smartlead) ----------
  if (reclassifyAll) {
    log('reclassify-all: re-evaluating sentiment on every reply with content');
    const all = [];
    for (let f = 0; ; f += 1000) {
      const { data, error } = await sb.from('outreach_replies')
        .select('id, email, reply_content, reply_sentiment, sentiment_source')
        .not('reply_content', 'is', null)
        .neq('sentiment_source', 'manual')
        .range(f, f + 999);
      if (error) throw new Error(error.message);
      all.push(...data);
      if (data.length < 1000) break;
    }
    log(`  candidates (have content, not manual): ${all.length}`);
    const changes = { unchanged: 0, updated: 0, by_to: {} };
    const reSuppress = [];
    for (const r of all) {
      // Clean FIRST: stored content can still carry quoted thread history +
      // signatures (times/days inside "On … wrote:" would false-match SCHED).
      const c = classify(cleanReply(r.reply_content));
      if (c.sentiment === r.reply_sentiment) { changes.unchanged += 1; continue; }
      changes.updated += 1;
      const k = `${r.reply_sentiment || 'null'}->${c.sentiment || 'null'}`;
      changes.by_to[k] = (changes.by_to[k] || 0) + 1;
      if (c.suppress && r.email) reSuppress.push({ email: lc(r.email), reason: 'do_not_contact', source: 'reply', detail: { kind: c.reason, snippet: r.reply_content.slice(0, 140) } });
      if (!dry) {
        const { error } = await sb.from('outreach_replies').update({ reply_sentiment: c.sentiment }).eq('id', r.id);
        if (error) log(`  update err id=${r.id}: ${error.message}`);
      }
    }
    log(`  unchanged: ${changes.unchanged}   updated: ${changes.updated}`);
    log(`  transitions: ${JSON.stringify(changes.by_to)}`);
    log(`  new suppressions discovered: ${reSuppress.length}`);
    if (!dry && reSuppress.length) {
      const map = new Map();
      for (const s of reSuppress) if (!map.has(s.email)) map.set(s.email, s);
      const rows = [...map.values()];
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await sb.from('crm_suppression').upsert(rows.slice(i, i + 100), { onConflict: 'email', ignoreDuplicates: false });
        if (error) log(`  suppression upsert error: ${error.message}`);
      }
      log(`  crm_suppression upserted: ${rows.length}`);
    }
    // reclassify-all is exclusive (skips the fetch pass), matching the CLI.
    log(dry ? 'DRY — nothing written.' : 'DONE (reclassify) — re-run generate-plays so Play B reflects updates.');
    return { mode: 'reclassify', candidates: all.length, updated: changes.updated, suppressions: reSuppress.length };
  }

  // ---------- PASS 2: fetch reply BODIES we don't have yet (Smartlead) ----------
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

  let fetched = 0; const classified = {}; const suppress = [];
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

    if (dry) {
      log(`  ${email} -> ${c.sentiment}${c.suppress ? ' [SUPPRESS]' : ''}: "${body.slice(0, 90).replace(/\n/g, ' ')}"`);
    } else {
      await sb.from('outreach_replies').update({ reply_content: body.slice(0, 4000), reply_sentiment: c.sentiment }).eq('id', r.id);
    }
    await sleep(150);
  }

  log('================ BACKFILL SUMMARY ================');
  log(`fetched bodies: ${fetched}/${work.length}`);
  log(`sentiment: ${JSON.stringify(classified)}`);
  log(`to suppress (unsubscribe/negative): ${suppress.length}`);
  for (const s of suppress.slice(0, 15)) log(`  SUPPRESS ${s.email} (${s.detail.kind})`);

  if (!dry && suppress.length) {
    for (let i = 0; i < suppress.length; i += 100) {
      const { error } = await sb.from('crm_suppression').upsert(suppress.slice(i, i + 100), { onConflict: 'email', ignoreDuplicates: false });
      if (error) log(`  suppression upsert error: ${error.message}`);
    }
    log(`crm_suppression upserted: ${suppress.length}`);
  }
  log(dry ? 'DRY — nothing written. Re-run without --dry to apply.' : 'DONE — re-run generate-plays to reclassify Play B.');
  if (!dry) await stampHeartbeat(sb, 'enrich-replies', { host });
  return { mode: 'backfill', backlog: work.length, fetched, classified, suppressions: suppress.length };
}
