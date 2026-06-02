// Find Jaimie Smith @ Danaher's real email by searching Caren's Gmail.
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
const { getAccessToken } = await import('../../netlify/functions/lib/gmail.js');

const CAREN = 'caren@getshortcut.co';
let token;
try { token = await getAccessToken(sb, CAREN); }
catch (e) { console.error('No token for Caren:', e.message); process.exit(1); }

for (const q of [
  'from:smith@danaher.com OR to:smith@danaher.com',
  'from:@danaher.com OR to:@danaher.com',
  'Jaimie Smith Danaher',
  '"Cleveland Research"',
  'Proposal for Cleveland Research',
]) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  const ids = (j.messages || []).map((m) => m.id);
  console.log(`\nquery: "${q}" → ${ids.length} hits`);
  for (const id of ids.slice(0, 5)) {
    const m2 = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const md = await m2.json();
    const hdr = (n) => (md.payload?.headers || []).find((x) => x.name?.toLowerCase() === n.toLowerCase())?.value;
    const dt = md.internalDate ? new Date(Number(md.internalDate)).toISOString().slice(0, 16) : '?';
    console.log(`  ${dt} | from="${hdr('From')}" to="${hdr('To')}" | subj="${hdr('Subject')}"`);
  }
}
