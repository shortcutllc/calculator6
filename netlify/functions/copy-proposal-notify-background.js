/**
 * copy-proposal-notify-background.js — DM Will a copy proposal card (the
 * proposal lane's notification leg — see scripts/propose-copy.mjs).
 * Shows the full proposed text per step + both gate reports + how to decide.
 * NOTIFIES ONLY — approval happens via approve-copy.mjs / Will's explicit word.
 *
 * POST body: { asset_id }
 * Env: SUPABASE_*, PRO_SLACK_BOT_TOKEN.
 */
import { createClient } from '@supabase/supabase-js';

const SLACK_API = 'https://slack.com/api';
const WILL = 'will@getshortcut.co';

async function slackPost(method, body) {
  const r = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) console.error(`Slack ${method} error:`, j.error);
  return j;
}

export default async (req) => {
  if (!process.env.PRO_SLACK_BOT_TOKEN) return new Response('misconfigured', { status: 500 });
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let body = {};
  try { body = JSON.parse((await req.text()) || '{}'); } catch { /* noop */ }
  if (!body.asset_id) return new Response('asset_id required', { status: 400 });

  const { data: a } = await sb.from('copy_assets').select('*').eq('id', body.asset_id).maybeSingle();
  if (!a) return new Response('asset not found', { status: 404 });
  const { data: acct } = await sb.from('gmail_accounts').select('slack_user_id').eq('email', WILL).maybeSingle();
  if (!acct?.slack_user_id) return new Response('will not on slack', { status: 500 });

  const open = await slackPost('conversations.open', { users: acct.slack_user_id });
  if (!open.ok) return new Response('dm open failed', { status: 500 });
  const channel = open.channel?.id;

  const stepsText = (a.steps || []).map((s) => `*E${s.step}* (day +${s.delayDays})${(s.subjects || []).filter(Boolean).length ? `  ·  subj: ${(s.subjects || []).filter(Boolean).map((x) => `"${x}"`).join(' / ')}` : '  ·  (threaded)'}\n\`\`\`${String(s.body || '').slice(0, 900)}\`\`\``).join('\n');
  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `:scroll: *Copy proposal — ${a.label}*  (${a.segment}/${a.opener})\n${a.note ? `*Why:* ${a.note}\n` : ''}*Gates:* evaluator PASS · judge ${a.judge?.verdict || '?'} ${a.judge?.score ?? ''}${a.judge?.would_reply_read ? `\n*Judge:* ${a.judge.would_reply_read}` : ''}` } },
    { type: 'section', text: { type: 'mrkdwn', text: stepsText.slice(0, 2900) } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Nothing ships until you ratify. Approve: tell Claude "approve proposal ${a.id}" (or reject it). Newest approval becomes the engine's copy for ${a.segment}/${a.opener}.` }] },
  ];
  await slackPost('chat.postMessage', { channel, text: `Copy proposal: ${a.label}`, blocks, unfurl_links: false, unfurl_media: false });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
