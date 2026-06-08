// End-to-end re-verify: create a fresh draft via the SAME code path
// the deployed function uses, build the SAME URL pattern the updated
// slack-blocks.js would build, print it so we can navigate + screenshot.
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
const LEAD = 'will@getshortcut.co';  // self for harmless test

const tok = await getAccessToken(sb, REP);
const sigHtml = await getSignature(tok, REP);
const draft = await createDraft(tok, {
  from: REP, to: LEAD,
  subject: 'PROD URL TEST — Wellness-fund deployment for OneDigital clients',
  body: `Hi Daria,\n\nWill Newton here. I run Shortcut.\n\nWe help mid-market employers deploy their carrier wellness funds (Cigna HIF, Aetna Wellness Allowance, Anthem Wellness Fund) on eligible in-office and virtual services like chair massage, mindfulness, nutrition, and assisted stretch. Single vendor, zero admin lift on HR.\n\nBurberry funds our chair massage through their Aetna Wellness Allowance. We invoice them, they forward it through their carrier, and the check comes back to us.\n\nWorth a 15-min call to walk through how this works for [View your proposal](https://proposals.getshortcut.co/proposal/test-id?shared=true) clients?\n\nBest,\nWill`,
  signatureHtml: sigHtml,
  threadId: null,
});

console.log('draft created:');
console.log('  draft id:   ', draft.id);
console.log('  message id: ', draft.messageId);
console.log('  thread id:  ', draft.threadId);

// Build the URL EXACTLY the way the deployed slack-blocks.js builds it
const url = `https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(REP)}#drafts/${draft.messageId}`;
console.log('\nOpen-in-Gmail URL the deployed code would build:');
console.log(`  ${url}`);
