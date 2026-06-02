// Send Will and Caren their first 10 broker-GTM contacts in a Slack DM.
// One-off — run once after discovery. Subsequent batches via list_broker_queue.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const SLACK_API = 'https://slack.com/api';
const slackPost = async (m, b) => {
  const r = await fetch(`${SLACK_API}/${m}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  });
  return r.json();
};

const BROKER_PLAN_INSTRUCTION_TEMPLATE = `draft a broker GTM email #1.

Hook: wellness-fund deployment — most brokers don't realize their Cigna/Aetna/Anthem clients have HIF / Wellness Allowance / Wellness Fund dollars sitting unused, and Shortcut helps them deploy it on in-person experiences (massage / headshots / mindfulness) the employees actually want.

Pitch the 3-option ethical revenue share (client pass-through / co-marketing / disclosed referral). Mention that ~70% of our wins come through brokers — we want to be a low-effort vendor partner that makes them look like a hero at renewal.

Ask: 15-min intro call to see if there's a fit. Keep under 130 words. Cite their wellness practice / firm specifically.`;

const REPS = [
  { gmail: 'will@getshortcut.co', name: 'Will' },
  { gmail: 'caren@getshortcut.co', name: 'Caren' },
];

for (const rep of REPS) {
  console.log(`\n=== ${rep.name} (${rep.gmail}) ===`);
  // Resolve slack_user_id
  const { data: acct } = await sb.from('gmail_accounts').select('slack_user_id').eq('email', rep.gmail).maybeSingle();
  if (!acct?.slack_user_id) { console.log(`  no slack_user_id; skipping`); continue; }
  const { data: contacts } = await sb.from('outreach_contacts')
    .select('email, name, title, company, broker_track, broker_priority_rank, broker_firm_id')
    .eq('broker_assigned_to', rep.gmail)
    .order('broker_priority_rank', { ascending: true }).limit(10);
  if (!contacts || contacts.length === 0) { console.log(`  no contacts assigned; skipping`); continue; }

  const lines = contacts.map((c, i) =>
    `${i + 1}. *${c.name || '(no name)'}* — ${c.title || ''} @ ${c.company || c.broker_firm_id}\n   \`${c.email}\` · ${c.broker_track} · rank ${c.broker_priority_rank}`
  );

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `Your broker GTM starter stack (10 contacts)` } },
    { type: 'section', text: { type: 'mrkdwn', text: `Hey ${rep.name} — Sprint 1 of the broker GTM plan is live. You've been assigned *${contacts.length}+ contacts* from our Apollo discovery at top NYC tri-state brokers + carrier HECs. Here are your top 10 by priority:` } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: lines.slice(0, 5).join('\n\n') } },
    { type: 'section', text: { type: 'mrkdwn', text: lines.slice(5, 10).join('\n\n') } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: `*How to start outreach (any contact):*\n\`\`\`@Pro draft an email to <name>@<firm.com>\n\n${BROKER_PLAN_INSTRUCTION_TEMPLATE}\`\`\`` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Want to see the rest of your stack? *@Pro list my broker queue* — or filter: *@Pro show my untouched Tier 2 brokers*` } ] },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `*First 10 sends:* Will reviews each draft before send so we nail the template. After that, autopilot decision.` } ] },
  ];
  const open = await slackPost('conversations.open', { users: acct.slack_user_id });
  if (!open.ok) { console.error(`  open DM failed: ${open.error}`); continue; }
  const post = await slackPost('chat.postMessage', {
    channel: open.channel.id,
    text: `Your broker GTM starter stack — top 10 contacts`,
    blocks,
  });
  console.log(`  ${post.ok ? '✓ sent' : '❌ ' + post.error}`);
}
