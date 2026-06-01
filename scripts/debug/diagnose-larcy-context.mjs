// What does Pro ACTUALLY see when it looks up Larcy right now?
// Mirrors the exact code path Pro's draft_email runs.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']) {
  if (env[k] && !process.env[k]) process.env[k] = env[k];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const LEAD = 'lallen@schulzlogistics.com';
const REP = 'will@getshortcut.co';
const banner = (s) => console.log(`\n===== ${s} =====`);

// ---- 1. Raw send/reply rows
banner('1. outreach_sends for Larcy');
{
  const { data } = await sb.from('outreach_sends')
    .select('campaign_id, sent_time, sender_email, reply_time, touch_count, thread_id, message_id')
    .eq('email', LEAD).order('sent_time', { ascending: true });
  console.table(data);
}
banner('2. outreach_replies for Larcy');
{
  const { data } = await sb.from('outreach_replies')
    .select('campaign_id, reply_date, reply_sentiment, sentiment_source')
    .eq('email', LEAD).order('reply_date', { ascending: true });
  console.table(data);
}

// ---- 3. What lookup_lead (and therefore Pro) sees
banner('3. lead-picture output — what Pro\'s lookup_lead returns');
{
  const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
  const pic = await leadPicture(sb, { email: LEAD });
  console.log('identity:', JSON.stringify(pic.identity, null, 2));
  console.log('workhuman?.personal_note:', JSON.stringify(pic.workhuman?.personal_note));
  console.log('history.emailed_count:', pic.history?.emailed_count);
  console.log('history.first_sent:', pic.history?.first_sent);
  console.log('history.last_sent:', pic.history?.last_sent);
  console.log('history.replied:', pic.history?.replied);
  console.log('history.sends count:', pic.history?.sends?.length);
  console.log('history.sends:');
  console.table((pic.history?.sends || []).map((s) => ({
    sent: s.sent_time, replied: s.replied, touches: s.touches,
    sender: s.sender_email, thread: (s.thread_id || '').slice(0, 10),
  })));
  console.log('history.replies count:', pic.history?.replies?.length);
  console.log('LATEST send (slice(-1)) — this is what draft_email uses for threadId:');
  const latestSend = (pic.history?.sends || []).slice(-1)[0];
  console.log(JSON.stringify(latestSend, null, 2));
  console.log('proposals tied to Larcy:', pic.proposals?.length || 0);
  console.log('signups tied:', pic.signups?.length || 0);
}

// ---- 4. Does the rep's LATEST send by them have a thread_id we can fetch?
banner('4. latest rep-attributed send + Gmail thread fetchability');
{
  const { data: latestRepSend } = await sb.from('outreach_sends')
    .select('sent_time, thread_id, message_id, campaign_id')
    .eq('email', LEAD).eq('sender_email', REP)
    .order('sent_time', { ascending: false }).limit(1).maybeSingle();
  console.log('latest will-attributed send:', JSON.stringify(latestRepSend, null, 2));
  if (latestRepSend?.thread_id) {
    const { getAccessToken, getThread } = await import('../../netlify/functions/lib/gmail.js');
    try {
      const tok = await getAccessToken(sb, REP);
      const thr = await getThread(tok, latestRepSend.thread_id);
      const msgs = thr?.messages || [];
      console.log(`thread has ${msgs.length} messages`);
      // walk newest→oldest, find last SENT by rep
      let foundSubject = null, foundSnippet = null;
      for (let i = msgs.length - 1; i >= 0; i -= 1) {
        const m = msgs[i];
        const hs = m.payload?.headers || [];
        const fromRaw = hs.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
        const fromEmail = (fromRaw.match(/<([^>]+)>/) || [, fromRaw])[1]?.toLowerCase();
        const isSent = (m.labelIds || []).includes('SENT') || fromEmail === REP;
        if (!isSent) continue;
        foundSubject = hs.find((h) => h.name?.toLowerCase() === 'subject')?.value || '(no subject)';
        foundSnippet = m.snippet?.slice(0, 200);
        break;
      }
      console.log(`Most recent SENT message in thread: subject="${foundSubject}" snippet="${foundSnippet}"`);
      console.log(foundSubject ? '✓ priorEmail load WOULD succeed' : '⚠ no sent message found in thread (priorEmail would be null)');
    } catch (e) {
      console.error('Gmail thread fetch FAILED:', e.message);
      console.log('⚠ This means priorEmail in the draft prompt is silently null. The LLM has only the history snippet, no actual prior body.');
    }
  } else {
    console.log('⚠ no thread_id on latest rep send — priorEmail load is skipped entirely');
  }
}
