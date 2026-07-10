/**
 * founder-reply-reconcile — the once-a-day cleanup for the founder lane. The hourly
 * founder-reply-graduate walks the E1 THREADS; this sweep searches Will's whole
 * mailbox (INCLUDING Trash/Spam) for messages FROM founder prospects that never
 * threaded (auto-filed OOOs, replies from a different address) — which the thread
 * read can't see. For each, it ingests+classifies the reply and applies the same
 * branch as the live halt: positive → graduate (on-spine draft), OOO → pause the
 * sequence until they return, unsubscribe/negative → suppress.
 *
 * Reuses gmail.js (search) + sentiment.js (classifier) + the graduation drafter.
 * Read-only when dry=true. Idempotent (upserts dedupe by reply message_id).
 */
import { getAccessToken, searchMessages, getMessageFull, bodyFromPayload } from './gmail.js';
import { classify, cleanReply } from './sentiment.js';
import { stampHeartbeat } from './heartbeat.js';

const WILL = 'will@getshortcut.co';
const DAY = 86400000;
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const gmailDate = (d) => { const t = new Date(d); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };

function parseReturnDate(text) {
  const M = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  const m = String(text || '').toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!m) return null;
  const mon = M[m[1]]; const day = parseInt(m[2], 10);
  if (mon == null || day < 1 || day > 31) return null;
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), mon, day, 13, 0, 0));
  if (d < now) d = new Date(Date.UTC(now.getUTCFullYear() + 1, mon, day, 13, 0, 0));
  if (d - now > 30 * DAY) return null;
  return d.toISOString();
}

export async function reconcileFounderReplies({ sb, dry = false, host = null, log = console.log }) {
  const stamp = async () => { if (!dry) await stampHeartbeat(sb, 'founder-reply-reconcile', { host }); };

  // 1. founder E1 drafts (id + recipient + sequence)
  const drafts = [];
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('saved_drafts').select('id, recipient_email, target_ref').eq('target_kind', 'founder_note').range(f, f + 999);
    (data || []).forEach((d) => { const e = lc(d.recipient_email); if (e) drafts.push({ id: d.id, email: e, ref: d.target_ref || {} }); });
    if (!data || data.length < 1000) break;
  }
  if (!drafts.length) { await stamp(); return { searched: 0, matched: 0, ingested: 0, graduated: 0, paused: 0, suppressed: 0 }; }

  // 2. E1 sent time per email (earliest will@ send). Only prospects Will actually emailed.
  const emails = [...new Set(drafts.map((d) => d.email))];
  const sentByEmail = new Map();
  for (let i = 0; i < emails.length; i += 300) {
    const { data } = await sb.from('outreach_sends').select('email, sent_time').eq('sender_email', WILL).in('email', emails.slice(i, i + 300)).order('sent_time', { ascending: true });
    for (const s of data || []) { const e = lc(s.email); if (!sentByEmail.has(e)) sentByEmail.set(e, new Date(s.sent_time).getTime()); }
  }
  const targets = emails.filter((e) => sentByEmail.has(e));
  if (!targets.length) { await stamp(); return { searched: 0, matched: 0, ingested: 0, graduated: 0, paused: 0, suppressed: 0 }; }
  const draftByEmail = new Map(drafts.map((d) => [d.email, d]));

  // 3. Gmail search: any message FROM a target, since the earliest E1 (minus a day).
  const earliest = Math.min(...targets.map((e) => sentByEmail.get(e)));
  let token;
  try { token = await getAccessToken(sb, WILL); } catch (e) { log(`no will@ token: ${e.message}`); await stamp(); return { error: 'no_token' }; }
  const fromClause = targets.map((e) => `from:${e}`).join(' OR ');
  const query = `(${fromClause}) after:${gmailDate(earliest - DAY)}`;
  let ids = [];
  try { ids = await searchMessages(token, query, 200); } catch (e) { log(`search failed: ${e.message}`); await stamp(); return { error: 'search_failed' }; }
  log(`search matched ${ids.length} message(s) across ${targets.length} prospects`);

  let ingested = 0; let graduated = 0; let paused = 0; let suppressed = 0; let matched = 0;
  for (const id of ids) {
    const msg = await getMessageFull(token, id);
    if (!msg || !msg.from) continue;
    const email = targets.find((e) => msg.from === e);
    if (!email) continue;                                    // not from a prospect (safety)
    if (msg.internalDate <= sentByEmail.get(email)) continue; // before our E1
    matched += 1;
    const body = cleanReply(bodyFromPayload(msg.payload));
    const c = classify(body);
    const iso = new Date(msg.internalDate).toISOString();
    if (dry) { log(`  ${email} [${c.sentiment}${c.suppress ? '/suppress' : ''}] ${body.slice(0, 60).replace(/\n/g, ' ')}`); continue; }

    // ingest (dedupe by reply message id)
    await sb.from('outreach_replies').upsert(
      { email, campaign_id: `gmail-offthread-reply:${id}`, reply_date: iso, reply_content: body ? body.slice(0, 4000) : null, reply_sentiment: c.sentiment, is_ooo: c.sentiment === 'ooo', sentiment_source: 'automated', ingested_at: new Date().toISOString() },
      { onConflict: 'email,campaign_id,sentiment_source' },
    );
    ingested += 1;

    const draft = draftByEmail.get(email);
    const seq = draft?.ref?.sequence;
    const seqActive = !seq || seq.status === 'active' || seq.status === 'paused';

    if (c.suppress) {
      await sb.from('crm_suppression').upsert({ email, reason: 'do_not_contact', source: 'founder-reconcile', detail: { kind: c.reason, via: 'off-thread', snippet: body.slice(0, 140) } }, { onConflict: 'email' });
      if (draft && seqActive) await sb.from('saved_drafts').update({ target_ref: { ...draft.ref, sequence: { ...(seq || { touches: [{ n: 1 }] }), status: 'unsubscribed' } } }).eq('id', draft.id);
      suppressed += 1;
    } else if (c.sentiment === 'ooo' && draft && seqActive) {
      const count = (seq?.pause_count || 0) + 1;
      const until = count > 3 ? null : (parseReturnDate(body) || new Date(Date.now() + 4 * DAY).toISOString());
      const nextSeq = until
        ? { ...(seq || { touches: [{ n: 1 }] }), status: 'paused', paused_until: until, pause_count: count, paused_since_ms: msg.internalDate }
        : { ...(seq || { touches: [{ n: 1 }] }), status: 'dormant' };
      await sb.from('saved_drafts').update({ target_ref: { ...draft.ref, sequence: nextSeq } }).eq('id', draft.id);
      if (until) paused += 1;
    } else if (c.sentiment === 'positive') {
      // graduate → graduation-notify drafts the on-spine reply (skip if already graduated/suppressed)
      const { data: cc } = await sb.from('outreach_contacts').select('graduated_reason').eq('email', email).maybeSingle();
      const { data: sup } = await sb.from('crm_suppression').select('email').eq('email', email).maybeSingle();
      if (!cc?.graduated_reason && !sup) {
        await sb.from('outreach_contacts').upsert({ email, channel: 'personal', graduated_at: new Date().toISOString(), graduated_reason: 'positive_founder_reply', graduated_owner: 'Will Newton' }, { onConflict: 'email' });
        graduated += 1;
      }
    }
  }
  log(`ingested ${ingested} · graduated ${graduated} · paused ${paused} · suppressed ${suppressed}`);
  await stamp();
  return { searched: ids.length, matched, ingested, graduated, paused, suppressed };
}
