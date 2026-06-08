// Fire a draft via the deployed slack-draft-async-background endpoint and
// read the saved_drafts row to inspect the generated body. Production
// Anthropic key + production prompts. End-to-end test of the warm voice.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const SLACK_TOKEN = env.PRO_SLACK_BOT_TOKEN;
const slack = async (m, b) => { const r = await fetch(`https://slack.com/api/${m}`, { method: 'POST', headers: { Authorization: `Bearer ${SLACK_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); };

const REP = 'will@getshortcut.co';
const LEAD = 'mreyes@thehighline.org';  // Marissa Reyes · Friends of the High Line (had personal note)

// Find her email via lead-picture name resolution
const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
const pic = await leadPicture(sb, { name: 'Marissa Reyes', company: 'Friends of the High Line' });
const leadEmail = pic.identity?.email || LEAD;
console.log(`Lead resolved to: ${leadEmail}`);
console.log(`Personal note: ${pic.workhuman?.personal_note?.slice(0, 200) || '(none)'}`);

// Open Will's DM and post a placeholder we can update
const { data: acct } = await sb.from('gmail_accounts').select('slack_user_id').eq('email', REP).maybeSingle();
const open = await slack('conversations.open', { users: acct.slack_user_id });
if (!open.ok) { console.error('open:', open.error); process.exit(1); }
const ph = await slack('chat.postMessage', { channel: open.channel.id, text: '🧪 [warm-voice test] Drafting...' });
if (!ph.ok) { console.error('post:', ph.error); process.exit(1); }

const label = [pic.identity?.name, pic.identity?.company].filter(Boolean).join(' · ') || leadEmail;

console.log('\nFiring deployed slack-draft-async-background...');
const r = await fetch('https://proposals.getshortcut.co/.netlify/functions/slack-draft-async-background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repEmail: REP,
    leadEmail,
    threadId: null,
    firstOutreach: true,
    label,
    slackChannel: open.channel.id,
    placeholderTs: ph.ts,
  }),
});
console.log('  status:', r.status);

// Wait for background function to complete (it's async — give it ~25s)
console.log('\nWaiting ~25s for background processing...');
for (let i = 0; i < 5; i++) {
  await new Promise(res => setTimeout(res, 5000));
  const { data: latest } = await sb.from('saved_drafts')
    .select('id, subject, body, target_ref, created_at')
    .eq('recipient_email', leadEmail)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (latest && Date.now() - new Date(latest.created_at).getTime() < 60000) {
    console.log(`\n=== GENERATED MEDIUM DRAFT (${(Date.now() - new Date(latest.created_at).getTime()) / 1000}s ago) ===\n`);
    console.log(`Subject: ${latest.subject}\n`);
    console.log(latest.body);
    console.log(`\nPro recommended: ${latest.target_ref?.fight_for || '?'}`);
    if (latest.target_ref?.fight_for_reason) console.log(`Reason: ${latest.target_ref.fight_for_reason}`);
    // Clean up
    await slack('chat.delete', { channel: open.channel.id, ts: ph.ts });
    process.exit(0);
  }
  console.log(`  ...still waiting (attempt ${i + 1}/5)`);
}
console.log('Timed out waiting for draft. Check Slack DM for the preview manually.');
