/**
 * cold-engine-notify-background.js — DM Will the two pieces of cold-engine
 * feedback that used to be log-only (buried in /tmp/sc_cold_engine_weekly.log,
 * which nobody reads):
 *   1. The advisory copy-judge verdict + reason + issues (WHY the copy scored
 *      what it did — the middle gate between the deterministic skeptic and the
 *      human launch click). Advisory: it never blocked, and Will never saw it.
 *   2. The E3 A/B "B-long" variant — a MANUAL step. Smartlead's API can't add
 *      A/B variants, so cold-engine printed the body to the log and expected a
 *      human to paste it into the campaign UI. Easy to miss → the A/B never ran.
 *
 * Mirrors improve-loop-digest-background.js: the cold-engine cron runs host-side
 * on Will's Mac and can't reach the Slack bot token (Netlify env), so
 * cold-engine.mjs POSTs a compact payload here and this fn DMs Will.
 *
 * POST body (all optional): {
 *   segment, senders, week, launched,
 *   campaign: { id, url, leads } | null,
 *   judge:    { verdict, score, would_reply_read, issues:[{severity,step,issue}], suggestions:[] } | null,
 *   variantB: { label, body } | null,
 *   channel?  // overrides the default DM-to-Will
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

export function buildBlocks(p) {
  const seg = (p.segment || 'cold').toUpperCase();
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `🧊 Cold-engine — ${seg}${p.week ? ` · week of ${p.week}` : ''}`, emoji: true } },
  ];

  if (p.launched && p.campaign) {
    const c = p.campaign;
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Launched* campaign \`${c.id}\`${c.leads != null ? ` · ${c.leads} leads` : ''}${c.url ? ` · <${c.url}|open in Smartlead>` : ''}` } });
  } else if (p.launched === false) {
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: 'Preview only — nothing launched.' }] });
  }

  // 1. Advisory copy-judge — the WHY behind the score.
  if (p.judge) {
    const j = p.judge;
    const verdict = String(j.verdict || '').toUpperCase();
    const emoji = verdict === 'PASS' ? '✅' : '✍️';
    const head = [`${emoji} *Copy-judge (advisory): ${verdict}${j.score != null ? ` · ${j.score}/100` : ''}*`];
    if (j.would_reply_read) head.push(`_${clip(j.would_reply_read, 700)}_`);
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(head.join('\n'), 2900) } });

    if (Array.isArray(j.issues) && j.issues.length) {
      const lines = j.issues.slice(0, 6).map((i) => `• *E${i.step}* ${i.severity ? `[${i.severity}] ` : ''}${clip(i.issue, 300)}`);
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(`*Issues*\n${lines.join('\n')}`, 2900) } });
    }
    if (Array.isArray(j.suggestions) && j.suggestions.length) {
      const lines = j.suggestions.slice(0, 4).map((s) => `• ${clip(s, 300)}`);
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(`*Fixes*\n${lines.join('\n')}`, 2900) } });
    }
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: 'Advisory only — the judge never blocks; it flags. You decide whether to sharpen before/after launch.' }] });
  }

  // 2. E3 A/B B-long variant — the one manual step (Smartlead API can't add A/B variants).
  if (p.variantB && p.variantB.body) {
    const vb = p.variantB;
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*One manual step — add the E3 A/B variant* (Smartlead API can't).\nCampaign → Sequences → email #3 → *Add A/B variant* → paste below${vb.label ? ` (label it \`${vb.label}\`)` : ''}, keep the subject blank/threaded, save.` } });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: code(vb.body) } });
  }

  if (blocks.length === 1) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: 'Cold-engine ran — no judge verdict or E3 variant to report.' } });
  }
  return blocks;
}

export const handler = async (event) => {
  if (!process.env.PRO_SLACK_BOT_TOKEN) return { statusCode: 500, body: 'misconfigured (PRO_SLACK_BOT_TOKEN)' };
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured (SUPABASE)' };

  let p = {};
  try { p = JSON.parse(event.body || '{}'); } catch { /* empty → still post a heartbeat */ }
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
    channel, text: `Cold-engine — ${(p.segment || 'cold').toUpperCase()}${p.launched && p.campaign ? ` · launched ${p.campaign.id}` : ''}`,
    blocks, unfurl_links: false, unfurl_media: false,
  });
  return { statusCode: 200, body: JSON.stringify({ ok: !!post.ok, error: post.ok ? undefined : post.error }) };
};
