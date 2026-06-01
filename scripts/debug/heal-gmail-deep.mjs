// Deeper heal:
//   - Uses 90-day lookback (not connected_at) so pre-connect messages are captured
//   - INSERTS each missing message as its OWN row (campaign_id = gmail-sent-crawl-heal)
//     instead of upserting on (email,campaign_id) which would clobber prior sent_time.
//     Trade-off: multiple rows per email under a different campaign — but every message
//     is preserved with its own sent_time + message_id + thread_id.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
for (const k of ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (env[k] && !process.env[k]) process.env[k] = env[k];
}

const flag = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? (process.argv[i + 1] || true) : d; };
const DRY = !!flag('--dry', false);
const ONLY_EMAIL = flag('--email', null);
const LOOKBACK_DAYS = Number(flag('--days', 90));

const { getAccessToken, listSentSince, getMessageHeaders, lc } = await import('../../netlify/functions/lib/gmail.js');

const HEAL_CAMPAIGN = 'gmail-sent-crawl-heal';
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
function externals(h) {
  const all = [...(h.to || []), ...(h.cc || [])];
  return [...new Set(all.filter((e) => e && !isInternal(e)))].slice(0, 5);
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let q = sb.from('gmail_accounts').select('email').eq('sent_crawl_enabled', true);
if (ONLY_EMAIL) q = q.eq('email', ONLY_EMAIL);
const { data: accts } = await q;
console.log(`Healing ${accts.length} account(s), lookback=${LOOKBACK_DAYS}d, DRY=${DRY}`);

for (const a of accts) {
  console.log(`\n===== ${a.email} =====`);
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
  let tok; try { tok = await getAccessToken(sb, a.email); } catch (e) { console.error('token:', e.message); continue; }
  let ids; try { ids = await listSentSince(tok, since, 3000); } catch (e) { console.error('list:', e.message); continue; }
  console.log(`  Gmail returned ${ids.length} sent ids`);

  let kept = 0, inserted = 0, hadIt = 0;
  for (const id of ids) {
    let h; try { h = await getMessageHeaders(tok, id); } catch { continue; }
    if (!shouldKeep(h, a.email)) continue;
    const ext = externals(h);
    if (!ext.length) continue;
    kept += 1;
    const sentIso = h.internalDate || new Date().toISOString();
    for (const prospectEmail of ext) {
      // Dedupe by message_id across ALL rows for this email (every campaign).
      const { data: dupe } = await sb.from('outreach_sends')
        .select('campaign_id').eq('email', prospectEmail).eq('message_id', h.id).maybeSingle();
      if (dupe) { hadIt += 1; continue; }

      if (!DRY) {
        await sb.from('outreach_contacts').upsert(
          { email: prospectEmail, email_domain: prospectEmail.split('@')[1] || null, source: 'gmail-deep-heal', ingested_at: sentIso },
          { onConflict: 'email', ignoreDuplicates: true },
        );
        // Insert a NEW row per message — no onConflict clobber. The (email,
        // campaign_id) unique constraint allows multiple message-id rows if we
        // tag them with unique campaign_ids; we use the heal campaign here so
        // each insert stands on its own.
        // Use a per-message campaign_id suffix so the unique constraint holds.
        await sb.from('outreach_sends').upsert({
          email: prospectEmail,
          campaign_id: `${HEAL_CAMPAIGN}:${h.id}`,
          sent_time: sentIso, ingested_at: new Date().toISOString(),
          thread_id: h.threadId, message_id: h.id,
          sender_email: a.email, touch_count: 1,
        }, { onConflict: 'email,campaign_id' });
      }
      inserted += 1;
      console.log(`  + ${prospectEmail}  ${sentIso}  msg=${h.id}  subj=${(h.subject || '').slice(0, 60)}`);
    }
  }
  console.log(`  -- kept ${kept}, inserted ${inserted}, already had ${hadIt}`);
}
