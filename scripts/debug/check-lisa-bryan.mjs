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
const { getAccessToken, getThread, bodyFromPayload, lc } = await import('../../netlify/functions/lib/gmail.js');

const LEAD = 'lbryan@cleveland-research.com';
const REP = 'caren@getshortcut.co';
const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. outreach_replies for lbryan');
{
  const { data } = await sb.from('outreach_replies')
    .select('*').eq('email', LEAD).order('reply_date');
  console.log(`count: ${data?.length || 0}`);
  for (const r of (data || [])) {
    console.log(`  [${r.campaign_id}] ${r.reply_date} sentiment=${r.reply_sentiment}`);
    if (r.reply_content) console.log(`    "${r.reply_content.slice(0, 250).replace(/\n/g, ' ')}"`);
  }
}

banner('2. Pull ALL Gmail messages in Caren ↔ lbryan threads');
{
  const tok = await getAccessToken(sb, REP);
  // Find every thread between Caren and lbryan
  const { data: sends } = await sb.from('outreach_sends')
    .select('thread_id').eq('email', LEAD).eq('sender_email', REP).not('thread_id', 'is', null);
  const threadIds = [...new Set((sends || []).map((s) => s.thread_id))];
  console.log(`distinct threads: ${threadIds.length}`);

  for (const tid of threadIds) {
    const thr = await getThread(tok, tid);
    const msgs = thr?.messages || [];
    console.log(`\nThread ${tid} — ${msgs.length} messages:`);
    for (const m of msgs) {
      const hs = m.payload?.headers || [];
      const hdr = (n) => hs.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value || null;
      const fromRaw = hdr('From') || '';
      const fromAddr = lc(fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw);
      const dt = m.internalDate ? new Date(Number(m.internalDate)).toISOString().slice(0, 16) : '?';
      const dir = fromAddr === lc(REP) ? 'SENT' : 'INBOUND';
      console.log(`  ${dt} | ${dir} | from=${fromAddr} | to=${hdr('To')} | subj=${(hdr('Subject') || '').slice(0, 60)}`);
      if (dir === 'INBOUND') {
        let body = bodyFromPayload(m.payload) || '';
        if (/<\s*(div|p|br|html|body)/i.test(body)) {
          body = body.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ');
        }
        const cut = body.search(/\n?\s*(From:\s|On .+? wrote:|-{2,} ?Original Message|Sent from my )/i);
        if (cut > 0) body = body.slice(0, cut);
        console.log(`    "${body.replace(/\s+/g, ' ').slice(0, 250)}"`);
      }
    }
  }
}
