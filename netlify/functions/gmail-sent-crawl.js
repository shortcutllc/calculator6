/**
 * gmail-sent-crawl — Netlify SCHEDULED function (hourly).
 *
 * Per-rep, opt-in. Sweeps each connected & opted-in mailbox's Sent folder
 * since last_sent_crawl_at, filters to outbound-to-prospect emails (drops
 * internal/teammate, calendar invites, auto-replies), upserts into
 * outreach_sends with sender_email=rep and campaign_id='gmail-sent-crawl',
 * and attaches any inbound replies on the same thread (classifies the body,
 * suppresses DNCs). Net effect: the follow-up queue + CRM card history
 * cover ALL sales activity, not just companion sends.
 *
 * Daily Netlify cron (no HTTP auth — Netlify schedules it). Service-role for
 * gmail_accounts. Best-effort per account; one bad mailbox never blocks others.
 */

import { createClient } from '@supabase/supabase-js';
import {
  getAccessToken, listSentSince, getMessageHeaders, getThread, bodyFromPayload, lc,
} from './lib/gmail.js';
import { classify, cleanReply } from './lib/sentiment.js';

export const config = { schedule: '15 * * * *' }; // hourly at :15

const CAMPAIGN = 'gmail-sent-crawl';

// Recipients on these domains are teammates, not prospects — exclude.
const INTERNAL = new Set([
  'getshortcut.co', 'shortcutwellness.com', 'shortcutcorporate.com',
  'shortcutpros.com', 'shortcutpartnership.com', 'shortcutexperience.com',
  'shortcutcorpwellness.com',
]);

const isInternal = (email) => {
  const dom = lc(email)?.split('@')[1]?.replace(/^www\./, '');
  return dom ? INTERNAL.has(dom) : true;
};

// Drop noise that isn't a sales send.
function shouldKeep(h, repEmail) {
  if (!h) return false;
  if (h.labelIds?.includes('CHAT')) return false;
  if ((h.contentType || '').toLowerCase().includes('text/calendar')) return false;
  if (h.autoSubmitted && /auto-?(replied|generated)/i.test(h.autoSubmitted)) return false;
  // Sent folder includes drafts/auto-cc; ensure From is the rep.
  if (h.from && lc(h.from) !== lc(repEmail)) return false;
  return true;
}

// External recipients only (cap at 5 to avoid blasts/internal-mass sends).
function externalRecipients(h) {
  const all = [...(h.to || []), ...(h.cc || [])];
  const ext = [...new Set(all.filter((e) => e && !isInternal(e)))];
  return ext.slice(0, 5);
}

// Re-process this many minutes BEFORE the last successful run on every crawl.
// Gmail's send-index can lag by a few seconds, and Netlify's cron drifts;
// without overlap, a message sent within ~1min of the previous run can fall
// into a permanent gap (sent < since on every subsequent run, so the line-77
// time filter never lets it through). The message_id dedupe below makes
// re-processing the overlap a no-op for messages we've already recorded.
const OVERLAP_MIN = 30;

async function processAccount(sb, acct) {
  const rawSinceISO = acct.last_sent_crawl_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceISO = acct.last_sent_crawl_at
    ? new Date(new Date(rawSinceISO).getTime() - OVERLAP_MIN * 60 * 1000).toISOString()
    : rawSinceISO;
  const since = new Date(sinceISO);
  let token;
  try { token = await getAccessToken(sb, acct.email); }
  catch (e) { return { account: acct.email, error: `token: ${e.message}` }; }

  let ids;
  try { ids = await listSentSince(token, since, 500); }
  catch (e) { return { account: acct.email, error: `list: ${e.message}` }; }

  let kept = 0; let upsertedSends = 0; let trackedReplies = 0; let suppressed = 0;
  const seenContacts = new Set();
  for (const id of ids) {
    let h;
    try { h = await getMessageHeaders(token, id); } catch { continue; }
    if (!shouldKeep(h, acct.email)) continue;
    const externals = externalRecipients(h);
    if (!externals.length) continue;
    kept += 1;
    const sentTimeIso = h.internalDate || new Date().toISOString();
    if (new Date(sentTimeIso) <= since) continue; // narrow Gmail's day-precision filter

    for (const prospectEmail of externals) {
      // upsert contact (best-effort, never overwrite richer fields)
      if (!seenContacts.has(prospectEmail)) {
        seenContacts.add(prospectEmail);
        await sb.from('outreach_contacts').upsert(
          { email: prospectEmail, email_domain: prospectEmail.split('@')[1] || null, source: 'gmail-sent-crawl', ingested_at: sentTimeIso },
          { onConflict: 'email', ignoreDuplicates: true },
        );
      }
      // DEDUPE: companion sends (gmail-direct / gmail-open) get written to
      // outreach_sends synchronously by send-as-rep. The daily crawl then
      // sees the SAME Gmail message in the Sent folder and would create a
      // duplicate row. Skip if message_id already exists for this email.
      const { data: dupe } = await sb.from('outreach_sends')
        .select('campaign_id').eq('email', prospectEmail).eq('message_id', h.id).maybeSingle();
      if (dupe) continue;  // already recorded — don't double-count

      // ONE ROW PER MESSAGE. The prior pattern used a single
      // (email, CAMPAIGN) row and upserted with onConflict, which clobbered
      // sent_time / message_id / thread_id with whatever was processed last
      // (often the OLDEST of a batch of newest-first Gmail results). This
      // is why Beverly's row showed sent_time=5/19 even after the 5/21 send.
      // Use per-message campaign_id so every send gets its own preserved row.
      // followups + lead-picture aggregation already dedupe by message_id
      // across rows, so cadence math is unaffected.
      await sb.from('outreach_sends').upsert(
        {
          email: prospectEmail,
          campaign_id: `${CAMPAIGN}:${h.id}`,
          sent_time: sentTimeIso, ingested_at: new Date().toISOString(),
          thread_id: h.threadId, message_id: h.id,
          sender_email: acct.email,
          touch_count: 1,
        },
        { onConflict: 'email,campaign_id' },
      );
      upsertedSends += 1;

      // attach inbound replies on this thread from this prospect (after our send)
      let thread;
      try { thread = await getThread(token, h.threadId); } catch { thread = null; }
      const msgs = thread?.messages || [];
      const inbound = msgs.filter((m) => {
        const from = (m.payload?.headers || []).find((x) => x.name?.toLowerCase() === 'from')?.value || '';
        const fromAddr = lc(from.match(/<([^>]+)>/)?.[1] || from);
        const internalDate = m.internalDate ? Number(m.internalDate) : 0;
        return fromAddr === prospectEmail && internalDate > new Date(sentTimeIso).getTime();
      });
      if (!inbound.length) continue;
      const reply = inbound[inbound.length - 1];
      const body = cleanReply(bodyFromPayload(reply.payload));
      const c = classify(body);
      const replyIso = reply.internalDate ? new Date(Number(reply.internalDate)).toISOString() : sentTimeIso;

      await sb.from('outreach_replies').upsert(
        {
          email: prospectEmail, campaign_id: CAMPAIGN, reply_date: replyIso,
          reply_content: body ? body.slice(0, 4000) : null,
          reply_sentiment: c.sentiment, is_ooo: c.sentiment === 'ooo',
          sentiment_source: 'automated', ingested_at: new Date().toISOString(),
        },
        { onConflict: 'email,campaign_id,sentiment_source' },
      );
      await sb.from('outreach_sends')
        .update({ reply_time: replyIso })
        .eq('email', prospectEmail).eq('campaign_id', CAMPAIGN).is('reply_time', null);
      trackedReplies += 1;

      if (c.suppress) {
        await sb.from('crm_suppression').upsert(
          { email: prospectEmail, reason: 'do_not_contact', source: 'reply',
            detail: { kind: c.reason, snippet: body.slice(0, 140), via: 'gmail-sent-crawl' } },
          { onConflict: 'email', ignoreDuplicates: false },
        );
        suppressed += 1;
      }
    }
  }

  await sb.from('gmail_accounts')
    .update({ last_sent_crawl_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('email', acct.email);

  return { account: acct.email, fetched: ids.length, kept, sends: upsertedSends, replies: trackedReplies, suppressed };
}

export const handler = async () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured' };
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: accounts, error } = await sb.from('gmail_accounts')
    .select('email, last_sent_crawl_at').eq('sent_crawl_enabled', true);
  if (error) return { statusCode: 500, body: `query failed: ${error.message}` };

  const results = [];
  for (const a of accounts || []) {
    try { results.push(await processAccount(sb, a)); }
    catch (e) { results.push({ account: a.email, error: e.message }); }
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true, accounts: results }) };
};
