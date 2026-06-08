// Check which connected reps have the gmail.compose scope needed for
// drafts.create + Open-in-Gmail-with-signature.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
for (const k of ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']) {
  if (env[k] && !process.env[k]) process.env[k] = env[k];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { getAccessToken } = await import('../../netlify/functions/lib/gmail.js');

const NEEDED = 'https://www.googleapis.com/auth/gmail.compose';

const { data: accts } = await sb.from('gmail_accounts')
  .select('email, connected_at, updated_at, refresh_token')
  .order('email');

const rows = [];
for (const a of accts) {
  if (a.refresh_token?.startsWith('_PLACEHOLDER')) {
    rows.push({ email: a.email, status: '⏸ disconnected', has_compose: '—', last_connect: a.connected_at?.slice(0, 16) });
    continue;
  }
  try {
    const tok = await getAccessToken(sb, a.email);
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${tok}`);
    const j = await r.json();
    const scopes = (j.scope || '').split(' ');
    const has = scopes.includes(NEEDED);
    rows.push({
      email: a.email,
      status: has ? '✓ Open-in-Gmail works' : '❌ needs reconnect (no gmail.compose)',
      has_compose: has ? 'YES' : 'NO',
      scopes_count: scopes.length,
      last_connect: a.connected_at?.slice(0, 16),
    });
  } catch (e) {
    rows.push({ email: a.email, status: `⚠ token error: ${e.message.slice(0, 40)}`, has_compose: '?', last_connect: a.connected_at?.slice(0, 16) });
  }
}
console.table(rows);

const needsReconnect = rows.filter((r) => r.has_compose === 'NO').map((r) => r.email);
if (needsReconnect.length) {
  console.log('\nReps who need to click "Reconnect Gmail":');
  for (const e of needsReconnect) console.log(`  - ${e}`);
} else {
  console.log('\n✓ Every connected rep has gmail.compose. Open-in-Gmail with signature works for everyone.');
}
