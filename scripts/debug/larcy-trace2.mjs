// Round 2: hit Will's Gmail directly to see if there's actually a sent
// message to lallen@schulzlogistics.com that the crawler missed.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const SUPA_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

// 1) Dump the full will@getshortcut.co gmail_accounts row
banner('1. will@getshortcut.co full row');
{
  const { data, error } = await sb.from('gmail_accounts')
    .select('*').eq('email', 'will@getshortcut.co').maybeSingle();
  if (error) console.error('error:', error.message);
  else console.log(JSON.stringify(data, null, 2));
}

// 2) Exact-email queries for Larcy
banner('2a. outreach_sends WHERE email = lallen@schulzlogistics.com');
{
  const { data, error } = await sb.from('outreach_sends')
    .select('*').eq('email', 'lallen@schulzlogistics.com');
  if (error) console.error('error:', error.message);
  else console.log(`count: ${data.length}`); if (data) console.log(JSON.stringify(data, null, 2));
}

banner('2b. outreach_replies WHERE email = lallen@schulzlogistics.com');
{
  const { data, error } = await sb.from('outreach_replies')
    .select('*').eq('email', 'lallen@schulzlogistics.com');
  if (error) console.error('error:', error.message);
  else console.log(`count: ${data.length}`); if (data) console.log(JSON.stringify(data, null, 2));
}

// 3) Get Will's Gmail access token, query Gmail for any sent to Larcy
banner('3. Gmail API — search Will Sent folder for messages to lallen@schulzlogistics.com');
{
  // Inline minimal copy of getAccessToken logic so we can refresh
  const { data: acct, error } = await sb.from('gmail_accounts')
    .select('email, refresh_token, access_token, token_expiry')
    .eq('email', 'will@getshortcut.co').maybeSingle();
  if (error || !acct) { console.error('cannot load account:', error?.message); process.exit(1); }
  if (!acct.refresh_token) { console.error('no refresh_token on account'); process.exit(1); }

  // Refresh
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || env.GMAIL_OAUTH_CLIENT_ID || '',
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET || env.GMAIL_OAUTH_CLIENT_SECRET || '',
    refresh_token: acct.refresh_token,
    grant_type: 'refresh_token',
  });
  let access_token;
  if (params.get('client_id') && params.get('client_secret')) {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
    const j = await r.json();
    if (!r.ok) { console.error('token refresh failed:', j); process.exit(1); }
    access_token = j.access_token;
    console.log('refreshed access token, scope:', j.scope);
  } else {
    console.warn('No OAuth client creds in .env.local; falling back to stored access_token (may be expired)');
    access_token = acct.access_token;
  }

  // Search Gmail
  for (const q of [
    'in:sent to:lallen@schulzlogistics.com',
    'to:lallen@schulzlogistics.com',
    'in:sent lallen',
    'lallen@schulzlogistics.com',
  ]) {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=20`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const j = await r.json();
    console.log(`\nquery: "${q}"\n -> ${r.status}, resultSizeEstimate: ${j.resultSizeEstimate}, messages: ${(j.messages || []).length}`);
    if (j.messages?.length) {
      for (const m of j.messages.slice(0, 5)) {
        const m2 = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Bcc&metadataHeaders=Subject&metadataHeaders=Date`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const md = await m2.json();
        const hdr = (n) => (md.payload?.headers || []).find((x) => x.name?.toLowerCase() === n.toLowerCase())?.value;
        const dt = md.internalDate ? new Date(Number(md.internalDate)).toISOString() : null;
        console.log(`  - ${m.id} thread=${md.threadId} internalDate=${dt}`);
        console.log(`    From: ${hdr('From')}`);
        console.log(`    To:   ${hdr('To')}`);
        console.log(`    Cc:   ${hdr('Cc')}`);
        console.log(`    Bcc:  ${hdr('Bcc')}`);
        console.log(`    Subj: ${hdr('Subject')}`);
        console.log(`    LabelIds: ${(md.labelIds || []).join(',')}`);
      }
    }
  }
}
