/**
 * improve-loop-digest-background.js — post the weekly cold-engine experiment plan
 * to Slack. The improve-loop cron runs host-side (on Will's Mac) and writes
 * belief_experiments.json/.md there; it can't reach the Slack bot token (that
 * lives in Netlify env). So, mirroring the graduate-replies -> graduation-notify
 * pattern, improve-loop.mjs POSTs a compact digest of the plan to this function,
 * which DMs it to Will via PRO_SLACK_BOT_TOKEN.
 *
 * The plan RECOMMENDS; it never launches. This is a read for the operator.
 *
 * POST body (all optional except week): {
 *   week, baseline_floor, honest_read, exploit_cmd,
 *   advisory_cells: [{face,value,floor}], explore: {face,value,mechanism,target,min_sends,command}|null,
 *   counts: {hypotheses,accepted,rejected}, channel?  // channel overrides the default DM-to-Will
 * }
 * Env: SUPABASE_*, PRO_SLACK_BOT_TOKEN. Optional: BRAIN_DIGEST_SLACK_USER (email, default will@getshortcut.co).
 */

import { createClient } from '@supabase/supabase-js';

const SLACK_API = 'https://slack.com/api';
const DEFAULT_RECIPIENT = process.env.BRAIN_DIGEST_SLACK_USER || 'will@getshortcut.co';

async function slackPost(method, body) {
  const r = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) console.error(`Slack ${method} error:`, j.error, j.response_metadata || '');
  return j;
}

const clip = (s, n) => { const t = String(s || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const code = (s) => '```\n' + clip(s, 2800) + '\n```';

function buildBlocks(p) {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `🧠 Cold-engine plan — week of ${p.week || '?'}`, emoji: true } },
  ];
  if (p.honest_read) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(`*Honest read.* ${p.honest_read}`, 2900) } });

  const exploitLines = [`*Exploit (80%) — the proven base*`];
  if (p.baseline_floor) exploitLines.push(`Baseline positive floor: *${p.baseline_floor}*.`);
  if (Array.isArray(p.advisory_cells) && p.advisory_cells.length) {
    exploitLines.push(`Advisory cells to weight the pool toward: ${p.advisory_cells.map((c) => `*${c.face}=${c.value}*${c.floor ? ` (${c.floor})` : ''}`).join(', ')}.`);
  }
  blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(exploitLines.join('\n'), 2900) } });
  if (p.exploit_cmd) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: code(p.exploit_cmd) } });

  if (p.explore) {
    const e = p.explore;
    const lines = [`*Explore (20%) — ${e.face || '?'}=${e.value || '?'}*`];
    if (e.mechanism) lines.push(clip(e.mechanism, 700));
    if (e.target) lines.push(`Target positive rate ~*${e.target}*${e.min_sends ? `, needs ~*${e.min_sends}* sends to call it.` : '.'}`);
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(lines.join('\n'), 2900) } });
    if (e.command) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: code(e.command) } });
  } else {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '*Explore (20%)* — none survived the skeptic this week. Run the base only, or invest the cycle in the personal/graduation lane.' } });
  }

  const c = p.counts || {};
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `${c.rejected ?? 0} hypotheses rejected · the loop recommends only, a human runs the cold engine and starts the draft in Smartlead.` }] });
  return blocks;
}

export const handler = async (event) => {
  if (!process.env.PRO_SLACK_BOT_TOKEN) return { statusCode: 500, body: 'misconfigured (PRO_SLACK_BOT_TOKEN)' };
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured (SUPABASE)' };

  let p = {};
  try { p = JSON.parse(event.body || '{}'); } catch { /* empty plan → still post a heartbeat */ }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Resolve the recipient's Slack DM channel (default: Will).
  let channel = p.channel || null;
  if (!channel) {
    const { data: acct } = await sb.from('gmail_accounts')
      .select('slack_user_id').eq('email', DEFAULT_RECIPIENT).maybeSingle();
    if (!acct?.slack_user_id) return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: `no slack_user_id for ${DEFAULT_RECIPIENT}` }) };
    const open = await slackPost('conversations.open', { users: acct.slack_user_id });
    if (!open.ok) return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: `conversations.open failed: ${open.error}` }) };
    channel = open.channel?.id;
  }

  const blocks = buildBlocks(p);
  const post = await slackPost('chat.postMessage', {
    channel, text: `Cold-engine plan — week of ${p.week || ''}`, blocks, unfurl_links: false, unfurl_media: false,
  });
  return { statusCode: 200, body: JSON.stringify({ ok: !!post.ok, error: post.ok ? undefined : post.error }) };
};
