// One-off self-healing crawl for every gmail_accounts row with sent_crawl_enabled=true.
// Walks the full Sent folder since `connected_at` (or 60 days back, whichever
// is later — Gmail's after: is day-precision), runs the same filters as the
// hourly crawl, and message-id-dedupes against existing outreach_sends so we
// only insert what was missed. Run with --dry first to preview, then real.
//
// Usage:
//   node scripts/debug/heal-gmail-crawl.mjs --dry
//   node scripts/debug/heal-gmail-crawl.mjs               # for real
//   node scripts/debug/heal-gmail-crawl.mjs --email will@getshortcut.co
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
// Make these visible to the gmail lib helpers which read process.env
for (const k of ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (env[k] && !process.env[k]) process.env[k] = env[k];
}

const flag = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? (process.argv[i + 1] || true) : d; };
const DRY = !!flag('--dry', false);
const ONLY_EMAIL = flag('--email', null);
const MAX_MSG = Number(flag('--max', 2000));

const { getAccessToken, listSentSince, getMessageHeaders, getThread, bodyFromPayload, lc } = await import('../../netlify/functions/lib/gmail.js');
const { classify, cleanReply } = await import('../../netlify/functions/lib/sentiment.js');

const CAMPAIGN = 'gmail-sent-crawl';
const INTERNAL = new Set([
  'getshortcut.co', 'shortcutwellness.com', 'shortcutcorporate.com',
  'shortcutpros.com', 'shortcutpartnership.com', 'shortcutexperience.com',
  'shortcutcorpwellness.com',
]);
const isInternal = (email) => { const d = lc(email)?.split('@')[1]?.replace(/^www\./, ''); return d ? INTERNAL.has(d) : true; };

function shouldKeep(h, repEmail) {
  if (!h) return false;
  if (h.labelIds?.includes('CHAT')) return false;
  if ((h.contentType || '').toLowerCase().includes('text/calendar')) return false;
  if (h.autoSubmitted && /auto-?(replied|generated)/i.test(h.autoSubmitted)) return false;
  if (h.from && lc(h.from) !== lc(repEmail)) return false;
  return true;
}
function externalRecipients(h) {
  const all = [...(h.to || []), ...(h.cc || [])];
  const ext = [...new Set(all.filter((e) => e && !isInternal(e)))];
  return ext.slice(0, 5);
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let q = sb.from('gmail_accounts').select('email, connected_at, last_sent_crawl_at, sent_crawl_enabled').eq('sent_crawl_enabled', true);
if (ONLY_EMAIL) q = q.eq('email', ONLY_EMAIL);
const { data: accounts, error } = await q;
if (error) { console.error('accounts error:', error.message); process.exit(1); }
console.log(`Will heal ${accounts.length} account(s) — DRY=${DRY}, MAX_MSG=${MAX_MSG}`);

for (const a of accounts) {
  console.log(`\n===== ${a.email} =====`);
  const sinceISO = a.connected_at || new Date(Date.now() - 60 * 86400000).toISOString();
  console.log(`since: ${sinceISO}`);
  let token;
  try { token = await getAccessToken(sb, a.email); }
  catch (e) { console.error(`  token error: ${e.message}`); continue; }
  let ids;
  try { ids = await listSentSince(token, new Date(sinceISO), MAX_MSG); }
  catch (e) { console.error(`  list error: ${e.message}`); continue; }
  console.log(`  Gmail returned ${ids.length} message ids`);

  let kept = 0, inserted = 0, alreadyHad = 0, repliesAttached = 0, suppressed = 0;
  const seenContacts = new Set();
  for (const id of ids) {
    let h; try { h = await getMessageHeaders(token, id); } catch { continue; }
    if (!shouldKeep(h, a.email)) continue;
    const externals = externalRecipients(h);
    if (!externals.length) continue;
    kept += 1;
    const sentTimeIso = h.internalDate || new Date().toISOString();
    for (const prospectEmail of externals) {
      const { data: dupe } = await sb.from('outreach_sends')
        .select('campaign_id').eq('email', prospectEmail).eq('message_id', h.id).maybeSingle();
      if (dupe) { alreadyHad += 1; continue; }

      if (!seenContacts.has(prospectEmail) && !DRY) {
        seenContacts.add(prospectEmail);
        await sb.from('outreach_contacts').upsert(
          { email: prospectEmail, email_domain: prospectEmail.split('@')[1] || null, source: 'gmail-sent-crawl-heal', ingested_at: sentTimeIso },
          { onConflict: 'email', ignoreDuplicates: true },
        );
      }

      const { data: prev } = await sb.from('outreach_sends')
        .select('touch_count').eq('email', prospectEmail).eq('campaign_id', CAMPAIGN).maybeSingle();
      if (!DRY) {
        await sb.from('outreach_sends').upsert(
          { email: prospectEmail, campaign_id: CAMPAIGN, sent_time: sentTimeIso, ingested_at: new Date().toISOString(),
            thread_id: h.threadId, message_id: h.id, sender_email: a.email, touch_count: (prev?.touch_count || 0) + 1 },
          { onConflict: 'email,campaign_id' },
        );
      }
      inserted += 1;
      console.log(`  + ${prospectEmail}  ${sentTimeIso}  msg=${h.id}  subj=${(h.subject || '').slice(0, 60)}`);

      // attach replies (same logic as the live crawl)
      let thread; try { thread = await getThread(token, h.threadId); } catch { thread = null; }
      const msgs = thread?.messages || [];
      const inbound = msgs.filter((m) => {
        const from = (m.payload?.headers || []).find((x) => x.name?.toLowerCase() === 'from')?.value || '';
        const fromAddr = lc(from.match(/<([^>]+)>/)?.[1] || from);
        const internalDate = m.internalDate ? Number(m.internalDate) : 0;
        return fromAddr === prospectEmail && internalDate > new Date(sentTimeIso).getTime();
      });
      if (inbound.length) {
        const reply = inbound[inbound.length - 1];
        const body = cleanReply(bodyFromPayload(reply.payload));
        const c = classify(body);
        const replyIso = reply.internalDate ? new Date(Number(reply.internalDate)).toISOString() : sentTimeIso;
        if (!DRY) {
          await sb.from('outreach_replies').upsert(
            { email: prospectEmail, campaign_id: CAMPAIGN, reply_date: replyIso,
              reply_content: body ? body.slice(0, 4000) : null, reply_sentiment: c.sentiment, is_ooo: c.sentiment === 'ooo',
              sentiment_source: 'automated', ingested_at: new Date().toISOString() },
            { onConflict: 'email,campaign_id,sentiment_source' },
          );
          await sb.from('outreach_sends').update({ reply_time: replyIso }).eq('email', prospectEmail).eq('campaign_id', CAMPAIGN).is('reply_time', null);
        }
        repliesAttached += 1;
        if (c.suppress) suppressed += 1;
      }
    }
  }
  console.log(`  -- summary: kept ${kept}, inserted ${inserted}, alreadyHad ${alreadyHad}, replies ${repliesAttached}, suppressed ${suppressed}`);
}
