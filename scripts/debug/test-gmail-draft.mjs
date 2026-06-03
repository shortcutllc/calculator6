// Actually create a Gmail draft for Will + print the open URL so we can
// see if it works BEFORE declaring the feature done.
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
const { getAccessToken, getSignature, createDraft } = await import('../../netlify/functions/lib/gmail.js');

const REP = 'will@getshortcut.co';

console.log('1. Fetching Will\'s Gmail token...');
const tok = await getAccessToken(sb, REP);
console.log('   token length:', tok.length);

console.log('\n2. Checking scopes via tokeninfo endpoint...');
const ti = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${tok}`);
const tij = await ti.json();
console.log('   scopes granted:', tij.scope);
console.log('   needs: gmail.compose OR gmail.modify for drafts.create');

console.log('\n3. Fetching signature...');
const sigHtml = await getSignature(tok, REP);
console.log('   signature length:', sigHtml?.length || 0);

console.log('\n4. Calling createDraft (test draft to will@getshortcut.co)...');
try {
  const result = await createDraft(tok, {
    from: REP,
    to: REP,  // send to self so it's harmless
    subject: 'TEST DRAFT — Open in Gmail check',
    body: `Hi Will,\n\nThis is a test draft created via drafts.create API.\n\nIf this opens correctly in Gmail compose with your full HTML signature below, the feature works.\n\n[Test link](https://proposals.getshortcut.co)\n\nBest,\nWill`,
    signatureHtml: sigHtml,
  });
  console.log('   ✓ draft created:', JSON.stringify(result, null, 2));
  console.log('\n5. The URL "Open in Gmail" would build:');
  const url = `https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(REP)}&compose=${result.id}`;
  console.log(`   ${url}`);
  console.log('\n6. ➜ Open that URL in your browser and tell me what you see.');
  console.log('   Expected: Gmail compose opens with the draft body + your real HTML signature.');
  console.log('   If it opens to inbox with no compose: the URL pattern is wrong (need to try a different one).');
  console.log('   If it errors: token/scope issue.');
} catch (e) {
  console.error('   ❌ createDraft FAILED:', e.message);
  console.error('   Most likely cause: token is missing gmail.compose / gmail.modify scope.');
  console.error('   Fix: re-authenticate Gmail via Connect Gmail button (we may have only requested send scope).');
}
