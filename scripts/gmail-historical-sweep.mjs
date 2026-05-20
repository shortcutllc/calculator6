/**
 * gmail-historical-sweep.mjs — targeted Gmail backfill driven by a lead list.
 *
 * Example use (what built this): pull every workhuman_leads row that has a
 * personal-note stamp (`[stamp · Name]`) assigned to Will, then sweep Will's
 * Gmail Sent folder for any message to those exact addresses, ingest the
 * sends + their replies into outreach_sends / outreach_replies, and suppress
 * DNCs the classifier catches. Targeted = cheap (Gmail to:<email> is fast),
 * vs the daily forward-only crawl which scans the whole Sent folder.
 *
 * Stored under a distinct campaign_id so this run is auditable:
 *   campaign_id = 'workhuman-personal-historical' (default; --campaign overrides)
 *
 * Host-bound (Supabase + Gmail OAuth refresh via gmail_accounts):
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   export GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=...
 *   node scripts/gmail-historical-sweep.mjs --dry
 *   node scripts/gmail-historical-sweep.mjs --assigned-to "Will Newton" --max 200
 *
 * Flags:
 *   --assigned-to NAME     workhuman_leads.assigned_to filter (default "Will Newton")
 *   --gmail-account EMAIL  which gmail_accounts row to use (default: the assignee's mailbox)
 *   --lookback-days N      how far back in Gmail to search (default 365)
 *   --max N                cap total leads processed in this run (default 500)
 *   --max-msgs-per-lead N  cap Gmail messages per lead (default 30)
 *   --campaign LABEL       campaign_id (default workhuman-personal-historical)
 *   --dry                  preview, no writes
 */

import { createClient } from '@supabase/supabase-js';
import { getAccessToken, getMessageHeaders, getThread, bodyFromPayload, lc } from '../netlify/functions/lib/gmail.js';
import { classify, cleanReply } from '../netlify/functions/lib/sentiment.js';

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i !== -1 && args[i + 1] ? args[i + 1] : dflt; };
const DRY = args.includes('--dry');
const ASSIGNED = flag('--assigned-to', 'Will Newton');
const LOOKBACK = parseInt(flag('--lookback-days', '365'), 10) || 365;
const MAX_LEADS = parseInt(flag('--max', '500'), 10) || 500;
const MAX_MSG = parseInt(flag('--max-msgs-per-lead', '30'), 10) || 30;
const CAMPAIGN = flag('--campaign', 'workhuman-personal-historical');
const GMAIL_OVERRIDE = flag('--gmail-account', null);

const ASSIGNED_TO_GMAIL = {
  'Will Newton': 'will@getshortcut.co',
  'Jaimie Pritchard': 'jaimie@getshortcut.co',
  'Caren Skutch': 'caren@getshortcut.co',
  'Marc Levitan': 'marc@getshortcut.co',
};
const MANUAL_NOTE_RE = /\[[^\]]+·\s*[A-Za-z]+\]/;

const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  console.error('MISSING: GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET (needed to refresh the rep token)');
  process.exit(2);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function searchSentTo(token, recipient, lookbackDays, max) {
  const dateLimit = new Date(Date.now() - lookbackDays * 86400000);
  const q = `from:me to:${recipient} after:${dateLimit.getUTCFullYear()}/${String(dateLimit.getUTCMonth() + 1).padStart(2, '0')}/${String(dateLimit.getUTCDate()).padStart(2, '0')} -in:chats`;
  const ids = []; let pageToken = '';
  while (ids.length < max) {
    const p = new URLSearchParams({ q, maxResults: String(Math.min(100, max - ids.length)) });
    if (pageToken) p.set('pageToken', pageToken);
    const r = await fetch(`${GMAIL}/messages?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.status);
    for (const m of j.messages || []) ids.push(m.id);
    pageToken = j.nextPageToken || '';
    if (!pageToken) break;
  }
  return ids;
}

(async () => {
  log(`${DRY ? 'DRY' : 'LIVE'} — assigned-to "${ASSIGNED}", lookback ${LOOKBACK}d, max ${MAX_LEADS} leads`);
  const repGmail = lc(GMAIL_OVERRIDE || ASSIGNED_TO_GMAIL[ASSIGNED]);
  if (!repGmail) { console.error(`No Gmail mapping for assignee "${ASSIGNED}". Pass --gmail-account explicitly.`); process.exit(2); }

  // 1. Pull workhuman leads assigned to this rep with personal notes.
  const leads = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('workhuman_leads')
      .select('id, name, email, company, title, notes, assigned_to')
      .eq('assigned_to', ASSIGNED).not('notes', 'is', null)
      .range(f, f + 999);
    if (error) throw new Error(`workhuman_leads: ${error.message}`);
    leads.push(...data);
    if (data.length < 1000) break;
  }
  const targets = leads.filter((l) => MANUAL_NOTE_RE.test(l.notes || '') && l.email && l.email.includes('@'));
  const uniqEmails = [...new Set(targets.map((l) => lc(l.email)))].slice(0, MAX_LEADS);
  log(`workhuman leads (assigned + personal-note): ${targets.length}; unique emails: ${uniqEmails.length}`);

  if (!uniqEmails.length) { log('Nothing to sweep. DONE'); return; }

  // 2. Get the rep's Gmail token.
  let token;
  try { token = await getAccessToken(sb, repGmail); }
  catch (e) { console.error(`No connected Gmail for ${repGmail} (or token refresh failed): ${e.message}`); process.exit(2); }

  // 3. Per email: search Sent, ingest sends, attach replies.
  let leadsHit = 0, sendsFound = 0, repliesFound = 0, suppressed = 0;
  const sampleSuppressions = [];
  for (const email of uniqEmails) {
    let ids;
    try { ids = await searchSentTo(token, email, LOOKBACK, MAX_MSG); }
    catch (e) { log(`  ${email}: search err ${e.message}`); continue; }
    if (!ids.length) continue;
    leadsHit += 1;

    const lead = targets.find((l) => lc(l.email) === email);
    const threadsSeen = new Set();          // dedupe — a thread with N of our sends shouldn't fan out N times
    for (const mid of ids) {
      let h;
      try { h = await getMessageHeaders(token, mid); } catch { continue; }
      if (!h || lc(h.from) !== repGmail) continue;        // must actually be sent by the rep
      if (!h.to?.includes(email) && !h.cc?.includes(email)) continue;
      const sentIso = h.internalDate || new Date().toISOString();
      sendsFound += 1;

      if (!DRY) {
        await sb.from('outreach_contacts').upsert(
          { email, name: lead?.name || null, title: lead?.title || null, company: lead?.company || null,
            email_domain: email.split('@')[1] || null, source: 'workhuman-personal-historical', ingested_at: sentIso },
          { onConflict: 'email', ignoreDuplicates: true },
        );
        const { data: prev } = await sb.from('outreach_sends')
          .select('touch_count').eq('email', email).eq('campaign_id', CAMPAIGN).maybeSingle();
        await sb.from('outreach_sends').upsert(
          { email, campaign_id: CAMPAIGN, sent_time: sentIso, ingested_at: new Date().toISOString(),
            thread_id: h.threadId, message_id: h.id, sender_email: repGmail,
            touch_count: (prev?.touch_count || 0) + 1 },
          { onConflict: 'email,campaign_id' },
        );
      }

      // Any inbound from the prospect on this thread is engagement we care
      // about. Order-agnostic: a thread we crawled because *we* seeded the
      // lead is one we're part of, so a calendar acceptance or any pre-existing
      // reply still counts (it was the original bug — Gillian @ Acme Mills
      // booked a meeting and the time-filter dropped the calendar accept).
      // Dedupe: a thread with multiple of our sends only processes once.
      if (threadsSeen.has(h.threadId)) continue;
      threadsSeen.add(h.threadId);
      let thread; try { thread = await getThread(token, h.threadId); } catch { thread = null; }
      const msgs = thread?.messages || [];
      const inbound = msgs.filter((m) => {
        const from = (m.payload?.headers || []).find((x) => x.name?.toLowerCase() === 'from')?.value || '';
        const fromAddr = lc(from.match(/<([^>]+)>/)?.[1] || from);
        return fromAddr === email;
      });
      if (!inbound.length) continue;
      const reply = inbound[inbound.length - 1];
      const body = cleanReply(bodyFromPayload(reply.payload));
      const c = classify(body);
      const replyIso = reply.internalDate ? new Date(Number(reply.internalDate)).toISOString() : sentIso;
      repliesFound += 1;
      if (!DRY) {
        await sb.from('outreach_replies').upsert(
          { email, campaign_id: CAMPAIGN, reply_date: replyIso,
            reply_content: body ? body.slice(0, 4000) : null, reply_sentiment: c.sentiment,
            is_ooo: c.sentiment === 'ooo', sentiment_source: 'automated', ingested_at: new Date().toISOString() },
          { onConflict: 'email,campaign_id,sentiment_source' },
        );
        await sb.from('outreach_sends').update({ reply_time: replyIso })
          .eq('email', email).eq('campaign_id', CAMPAIGN).is('reply_time', null);
      }
      if (c.suppress) {
        suppressed += 1;
        if (sampleSuppressions.length < 10) sampleSuppressions.push(`${email}: ${(body || '').slice(0, 90).replace(/\n/g, ' ')}`);
        if (!DRY) {
          await sb.from('crm_suppression').upsert(
            { email, reason: 'do_not_contact', source: 'reply',
              detail: { kind: c.reason, via: 'workhuman-personal-historical', snippet: body.slice(0, 140) } },
            { onConflict: 'email', ignoreDuplicates: false },
          );
        }
      }
    }
    await sleep(80);
  }

  log('================ HISTORICAL SWEEP REPORT ================');
  log(`leads matched (workhuman + personal-note + assigned ${ASSIGNED}): ${uniqEmails.length}`);
  log(`leads with at least one historical send: ${leadsHit}`);
  log(`sends found / ingested: ${sendsFound}`);
  log(`replies found / classified: ${repliesFound}`);
  log(`suppressions added (unsubscribe/negative): ${suppressed}`);
  if (sampleSuppressions.length) {
    log('Sample suppressions:');
    for (const s of sampleSuppressions) log(`  ${s}`);
  }
  log(DRY ? 'DRY — nothing written. Re-run without --dry to apply.' : 'DONE — re-run generate-plays to reflect.');
})().catch((e) => { console.error('SWEEP_ERROR:', e.message); process.exit(1); });
