/**
 * founder-reply-graduate — the founder lane's reply-brain, built ON the cold lane's
 * brain, not beside it. It OWNS capture for will@'s personal E1 threads (walks each
 * thread via Gmail, because the founder E1s were logged as companion 'gmail-direct'
 * sends, which the sent-crawl was skipping — so the lane captured 0 replies), then:
 *   - writes + classifies each inbound reply into outreach_replies (same campaign_id
 *     scheme as gmail-sent-crawl so the two dedupe, never double-count),
 *   - suppresses on negative/unsubscribe,
 *   - GRADUATES a positive reply into the SAME state the cold graduation uses
 *     (channel='personal', graduated_reason='positive_founder_reply', owner='Will
 *     Newton') so graduation-notify drafts the on-spine reply into Will's Gmail+Slack.
 *
 * Reuses: gmail.js (thread walk), sentiment.js (classifier), graduation-notify (drafter),
 * positioning.js. No parallel brain. Read-only when dry=true. Idempotent throughout.
 */
import { getAccessToken, getThread, bodyFromPayload } from './gmail.js';
import { classify, cleanReply } from './sentiment.js';
import { stampHeartbeat } from './heartbeat.js';

const WILL = 'will@getshortcut.co';
const CAMPAIGN = 'gmail-sent-crawl'; // MATCH the crawl's reply campaign_id so upserts dedupe
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

export async function graduateFounderReplies({ sb, dry = false, host = null, log = console.log }) {
  const stamp = async () => { if (!dry) await stampHeartbeat(sb, 'founder-reply-graduate', { host }); };

  // 1. founder E1 recipients (saved_drafts target_kind='founder_note')
  const e1 = new Set();
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('saved_drafts').select('recipient_email').eq('target_kind', 'founder_note').range(f, f + 999);
    (data || []).forEach((r) => { const e = lc(r.recipient_email); if (e) e1.add(e); });
    if (!data || data.length < 1000) break;
  }
  if (!e1.size) { await stamp(); return { captured: 0, positives: 0, graduated: 0, toGrad: [] }; }

  // 2. their will@ E1 sends (email → earliest thread_id + sent_time)
  const byEmail = new Map();
  for (let i = 0; i < [...e1].length; i += 300) {
    const chunk = [...e1].slice(i, i + 300);
    const { data } = await sb.from('outreach_sends')
      .select('email, thread_id, sent_time').eq('sender_email', WILL).in('email', chunk).order('sent_time', { ascending: true });
    for (const s of data || []) {
      const em = lc(s.email);
      if (s.thread_id && !byEmail.has(em)) byEmail.set(em, { thread_id: s.thread_id, sent_time: s.sent_time });
    }
  }
  if (!byEmail.size) { await stamp(); return { captured: 0, positives: 0, graduated: 0, toGrad: [] }; }

  // 3. walk each thread, capture + classify inbound replies (the prospect's, after our send)
  let token;
  try { token = await getAccessToken(sb, WILL); } catch (e) { log(`no will@ token: ${e.message}`); await stamp(); return { captured: 0, positives: 0, graduated: 0, toGrad: [], error: 'no_token' }; }

  const positives = new Set();
  let captured = 0;
  for (const [email, { thread_id, sent_time }] of byEmail) {
    let thread;
    try { thread = await getThread(token, thread_id); } catch { continue; }
    const sentMs = new Date(sent_time).getTime();
    const inbound = (thread?.messages || []).filter((m) => {
      const from = (m.payload?.headers || []).find((x) => x.name?.toLowerCase() === 'from')?.value || '';
      const fromAddr = lc(from.match(/<([^>]+)>/)?.[1] || from);
      return fromAddr === email && (m.internalDate ? Number(m.internalDate) : 0) > sentMs;
    });
    if (!inbound.length) continue;

    let earliest = null; let latestSentiment = null; let latestMs = 0;
    for (const reply of inbound) {
      const replyMsgId = reply.id || `${thread_id}:${reply.internalDate}`;
      const body = cleanReply(bodyFromPayload(reply.payload));
      const c = classify(body);
      const iso = reply.internalDate ? new Date(Number(reply.internalDate)).toISOString() : new Date().toISOString();
      if (!earliest || iso < earliest) earliest = iso;
      if ((reply.internalDate ? Number(reply.internalDate) : 0) >= latestMs) { latestMs = Number(reply.internalDate) || 0; latestSentiment = c.sentiment; }
      captured += 1;
      if (!dry) {
        await sb.from('outreach_replies').upsert(
          { email, campaign_id: `${CAMPAIGN}-reply:${replyMsgId}`, reply_date: iso, reply_content: body ? body.slice(0, 4000) : null, reply_sentiment: c.sentiment, is_ooo: c.sentiment === 'ooo', sentiment_source: 'automated', ingested_at: new Date().toISOString() },
          { onConflict: 'email,campaign_id,sentiment_source' },
        );
        if (c.suppress) await sb.from('crm_suppression').upsert({ email, reason: 'do_not_contact', source: 'reply', detail: { kind: c.reason, snippet: body.slice(0, 140), via: 'founder-reply-graduate' } }, { onConflict: 'email', ignoreDuplicates: false });
      }
    }
    if (!dry && earliest) await sb.from('outreach_sends').update({ reply_time: earliest }).eq('email', email).eq('sender_email', WILL).is('reply_time', null);
    if (latestSentiment === 'positive') positives.add(email);
  }
  log(`threads walked: ${byEmail.size} · replies captured: ${captured} · positive: ${positives.size}`);

  // 4. graduate NEW positives (skip already-graduated + suppressed) → graduation-notify drafts
  const pos = [...positives];
  const graded = new Set(); const supp = new Set();
  for (let i = 0; i < pos.length; i += 300) {
    const chunk = pos.slice(i, i + 300);
    const { data: g } = await sb.from('outreach_contacts').select('email, graduated_reason').in('email', chunk);
    (g || []).forEach((c) => { if (c.graduated_reason) graded.add(lc(c.email)); });
    const { data: s } = await sb.from('crm_suppression').select('email').in('email', chunk);
    (s || []).forEach((c) => supp.add(lc(c.email)));
  }
  const toGrad = pos.filter((e) => !graded.has(e) && !supp.has(e));
  for (const e of toGrad.slice(0, 25)) log(`  ${dry ? 'would graduate' : 'graduating'} ${e}`);

  let graduated = 0;
  if (!dry && toGrad.length) {
    const at = new Date().toISOString();
    const rows = toGrad.map((email) => ({ email, channel: 'personal', graduated_at: at, graduated_reason: 'positive_founder_reply', graduated_owner: 'Will Newton' }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('outreach_contacts').upsert(rows.slice(i, i + 200), { onConflict: 'email' });
      if (error) log(`upsert warn: ${error.message}`); else graduated += rows.slice(i, i + 200).length;
    }
  }
  await stamp();
  return { captured, positives: positives.size, graduated, toGrad };
}
