// Fetch Will's actual Gmail signature so we can see what's being used.
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
const { getAccessToken, getSignature } = await import('../../netlify/functions/lib/gmail.js');

const REP = 'will@getshortcut.co';
const tok = await getAccessToken(sb, REP);

// 1. Raw sendAs entries
const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', { headers: { Authorization: `Bearer ${tok}` } });
const j = await r.json();
console.log('All sendAs entries Gmail has on file:');
for (const s of (j.sendAs || [])) {
  console.log(`\n  sendAsEmail:  ${s.sendAsEmail}`);
  console.log(`  displayName:  ${s.displayName || '—'}`);
  console.log(`  isPrimary:    ${!!s.isPrimary}`);
  console.log(`  isDefault:    ${!!s.isDefault}`);
  console.log(`  signature length: ${(s.signature || '').length} chars`);
  console.log(`  signature preview:\n    ${(s.signature || '(empty)').slice(0, 400).replace(/\n/g, '\n    ')}`);
}

// 2. What getSignature returns
console.log('\n=== getSignature() returns ===');
const sig = await getSignature(tok, REP);
console.log(sig ? `length: ${sig.length}\nfirst 400 chars:\n${sig.slice(0, 400)}` : '(null — no signature)');

// 3. What plain-text strip produces
if (sig) {
  const plain = sig
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#39;|&rsquo;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n').trim();
  console.log('\n=== Plain-text version (what Open-in-Gmail puts in body=) ===');
  console.log(plain);
}
