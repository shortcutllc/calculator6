/**
 * slack-interactivity — handles button clicks, modal submits, and slash
 * commands from Pro's Slack app.
 *
 * Slack POSTs an `application/x-www-form-urlencoded` body with a single
 * `payload` field (JSON-stringified). We:
 *   1. Verify the signature against PRO_SLACK_SIGNING_SECRET
 *   2. Decode the payload
 *   3. Dispatch by type:
 *        - block_actions      → digest button clicks (snooze, mute, open settings)
 *        - view_submission    → settings modal save
 *        - view_closed        → cleanup (no-op for now)
 *        - slash command      → /sales mute/unmute/muted
 *
 * Slack expects a 200 within 3 seconds. We do all writes synchronously
 * since they're single supabase upserts (fast).
 *
 * Env: PRO_SLACK_SIGNING_SECRET, PRO_SLACK_BOT_TOKEN, SUPABASE_*
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { buildSettingsModal } from './lib/slack-blocks.js';

const SLACK_API = 'https://slack.com/api';

function verifySlackSignature(event) {
  const signingSecret = process.env.PRO_SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;
  const timestamp = event.headers['x-slack-request-timestamp'];
  const signature = event.headers['x-slack-signature'];
  if (!timestamp || !signature) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;
  const sigBasestring = `v0:${timestamp}:${event.body}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(sigBasestring);
  const expected = `v0=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

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

// Resolve a Slack user id → gmail_accounts row (the rep's profile). Returns
// null if not found (e.g. the Slack user never connected Gmail to Pro).
async function repFromSlack(sb, slackUserId) {
  const { data } = await sb.from('gmail_accounts')
    .select('email, supabase_user_id, slack_user_id, tz, digest_enabled, digest_skip_weekends, event_pings_enabled, muted_lead_emails, muted_until, muted_until_by_lead')
    .eq('slack_user_id', slackUserId).maybeSingle();
  return data || null;
}

// --- Block action handlers (digest buttons + Settings modal buttons) ----

async function handleSnoozeButton(sb, rep, email, days) {
  const until = new Date(Date.now() + days * 86400000).toISOString();
  const snoozes = { ...(rep.muted_until_by_lead || {}), [email.toLowerCase()]: until };
  await sb.from('gmail_accounts').update({ muted_until_by_lead: snoozes }).eq('email', rep.email);
  return `Snoozed ${email} for ${days}d (until ${new Date(until).toLocaleString('en-US', { timeZone: rep.tz || 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric' })}).`;
}

async function handleMuteButton(sb, rep, email) {
  const set = new Set([...(rep.muted_lead_emails || []), email.toLowerCase()]);
  await sb.from('gmail_accounts').update({ muted_lead_emails: [...set] }).eq('email', rep.email);
  return `Muted ${email} permanently. Restore from the Settings modal or @Pro me to unmute.`;
}

async function handleRestoreButton(sb, rep, email) {
  const filtered = (rep.muted_lead_emails || []).filter((e) => e.toLowerCase() !== email.toLowerCase());
  await sb.from('gmail_accounts').update({ muted_lead_emails: filtered }).eq('email', rep.email);
  return `Restored ${email}.`;
}

async function handleUnsnoozeButton(sb, rep, email) {
  const snoozes = { ...(rep.muted_until_by_lead || {}) };
  delete snoozes[email.toLowerCase()];
  await sb.from('gmail_accounts').update({ muted_until_by_lead: snoozes }).eq('email', rep.email);
  return `Unsnoozed ${email}.`;
}

// Open the Settings modal. Slack requires we call views.open within 3s and
// pass back the trigger_id — that's only valid for ~3s, hence sync.
async function openSettingsModal(rep, triggerId) {
  const view = buildSettingsModal(rep);
  return slackPost('views.open', { trigger_id: triggerId, view });
}

// --- Slash command handler ---

async function handleSlashCommand(sb, params) {
  const text = (params.text || '').trim();
  const slackUserId = params.user_id;
  const rep = await repFromSlack(sb, slackUserId);
  if (!rep) {
    return { response_type: 'ephemeral', text: "I can't find your Gmail connection on Pro. Set it up in /sales-intelligence first." };
  }

  // Subcommand parser: "mute <email>" / "unmute <email>" / "muted" (list)
  const m = text.match(/^(mute|unmute|muted)\b\s*(.*)$/i);
  if (!m) {
    return { response_type: 'ephemeral', text: 'Usage: `/sales mute <email>`, `/sales unmute <email>`, or `/sales muted`' };
  }
  const sub = m[1].toLowerCase();
  const arg = m[2].trim().toLowerCase();

  if (sub === 'muted') {
    const list = (rep.muted_lead_emails || []);
    if (!list.length) return { response_type: 'ephemeral', text: 'No muted leads.' };
    return { response_type: 'ephemeral', text: `*Muted leads (${list.length}):*\n${list.map((e) => `• \`${e}\``).join('\n')}` };
  }
  if (!arg || !arg.includes('@')) {
    return { response_type: 'ephemeral', text: `Usage: \`/sales ${sub} <email>\`` };
  }
  if (sub === 'mute') {
    const msg = await handleMuteButton(sb, rep, arg);
    return { response_type: 'ephemeral', text: msg };
  }
  if (sub === 'unmute') {
    const msg = await handleRestoreButton(sb, rep, arg);
    return { response_type: 'ephemeral', text: msg };
  }
  return { response_type: 'ephemeral', text: 'Unknown subcommand.' };
}

// --- Settings modal submit handler ---

async function handleViewSubmission(sb, payload) {
  const slackUserId = payload.user?.id;
  const rep = await repFromSlack(sb, slackUserId);
  if (!rep) return { response_action: 'errors', errors: { _: 'No Pro account found for your Slack user.' } };

  const state = payload.view?.state?.values || {};
  const updates = {};
  // Each select renders inside its own block; the block_id varies but the
  // action_id is stable. Walk all blocks and pick out our known action_ids.
  for (const blk of Object.values(state)) {
    for (const [actionId, val] of Object.entries(blk)) {
      const v = val.selected_option?.value;
      if (actionId === 'set_digest_enabled') updates.digest_enabled = v === 'on';
      else if (actionId === 'set_skip_weekends') updates.digest_skip_weekends = v === 'yes';
      else if (actionId === 'set_event_pings_enabled') updates.event_pings_enabled = v === 'on';
    }
  }
  if (Object.keys(updates).length) {
    await sb.from('gmail_accounts').update(updates).eq('email', rep.email);
  }
  return { response_action: 'clear' };
}

// --- Main handler ---

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  if (!verifySlackSignature(event)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured' };
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Slack sends form-urlencoded for both interactivity payloads and slash
  // commands. Interactivity has a single `payload` field (JSON-stringified).
  // Slash commands have flat fields (command, text, user_id, etc).
  const params = new URLSearchParams(event.body || '');
  const payloadStr = params.get('payload');

  // --- Slash command path ---
  if (!payloadStr) {
    // Flat form — slash command
    const flat = Object.fromEntries(params);
    if (flat.command) {
      const reply = await handleSlashCommand(sb, flat);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reply) };
    }
    return { statusCode: 400, body: 'No payload or command' };
  }

  let payload;
  try { payload = JSON.parse(payloadStr); }
  catch { return { statusCode: 400, body: 'Bad JSON payload' }; }

  // --- View submission (Settings modal save) ---
  if (payload.type === 'view_submission') {
    const reply = await handleViewSubmission(sb, payload);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reply) };
  }

  // --- Block actions (digest buttons + modal buttons) ---
  if (payload.type === 'block_actions') {
    const rep = await repFromSlack(sb, payload.user?.id);
    if (!rep) {
      // Ack the click anyway, can't write without a rep mapping.
      return { statusCode: 200, body: '' };
    }
    // We always ack first (200 within 3s) — Slack shows the action UI as
    // confirmed regardless. Any follow-up confirmation is sent as an
    // ephemeral via the response_url.
    const action = payload.actions?.[0];
    const responseUrl = payload.response_url;
    if (!action) return { statusCode: 200, body: '' };

    const [op, arg] = (action.action_id || '').split(':');
    let confirmation = null;
    try {
      if (op === 'snooze_1d') confirmation = await handleSnoozeButton(sb, rep, arg, 1);
      else if (op === 'snooze_7d') confirmation = await handleSnoozeButton(sb, rep, arg, 7);
      else if (op === 'mute') confirmation = await handleMuteButton(sb, rep, arg);
      else if (op === 'restore') confirmation = await handleRestoreButton(sb, rep, arg);
      else if (op === 'unsnooze') confirmation = await handleUnsnoozeButton(sb, rep, arg);
      else if (op === 'open_settings') {
        await openSettingsModal(rep, payload.trigger_id);
        return { statusCode: 200, body: '' };
      }
    } catch (e) {
      confirmation = `Failed: ${e.message}`;
    }

    // Send an ephemeral confirmation back to the same DM (visible only to the rep)
    if (confirmation && responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_type: 'ephemeral', replace_original: false, text: confirmation }),
      });
    }
    return { statusCode: 200, body: '' };
  }

  return { statusCode: 200, body: '' };
};
