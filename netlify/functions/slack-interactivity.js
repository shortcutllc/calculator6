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
import { buildSettingsModal, buildDraftSentBlocks, buildDraftCancelledBlocks, buildDraftErrorBlocks, buildOtherAnglesBlocks } from './lib/slack-blocks.js';
import { getAccessToken, sendEmail, getSignature, deleteDraft } from './lib/gmail.js';
import { preflight } from './lib/preflight.js';

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

// --- Draft / Send / Cancel handlers --------------------------------------

const DRAFTING_HOST = process.env.URL || 'https://proposals.getshortcut.co';

// Resolve the DM channel for this Slack user, then post a "Drafting..."
// placeholder card. Returns the channel_id + message_ts so the background
// function can chat.update() the placeholder with the real preview.
async function postDraftingPlaceholder(rep, label) {
  const open = await slackPost('conversations.open', { users: rep.slack_user_id });
  if (!open.ok) return { error: open.error };
  const channel = open.channel?.id;
  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `:hourglass_flowing_sand: *Drafting to ${label}…*` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `_Pro is generating a draft using brand voice + anti-hallucination rules. ~10s._` }] },
  ];
  const post = await slackPost('chat.postMessage', {
    channel, blocks, text: `Drafting to ${label}…`, unfurl_links: false, unfurl_media: false,
  });
  if (!post.ok) return { error: post.error };
  return { channel, ts: post.ts };
}

// Kick off the background function. Netlify Background Functions accept
// the POST and return 202 immediately, then continue running async for up
// to 15min. We MUST await this fetch — without awaiting, the Lambda runtime
// can terminate before the request actually leaves the process, dropping
// the background dispatch entirely (this is what caused the "stuck on
// Drafting..." bug). The await typically adds <1s since we only wait for
// 202 Accepted, not for the LLM call to finish.
async function fireDraftBackground(payload) {
  try {
    const r = await fetch(`${DRAFTING_HOST}/.netlify/functions/slack-draft-async-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok && r.status !== 202) {
      console.error('background dispatch non-2xx:', r.status, await r.text().catch(() => ''));
    }
  } catch (e) {
    console.error('background dispatch error:', e.message);
  }
}

async function handleDraftButton(sb, rep, action) {
  // Value is JSON {email, threadId, firstOutreach, label}
  let v;
  try { v = JSON.parse(action.value || '{}'); }
  catch { return 'Could not parse draft target.'; }
  const placeholder = await postDraftingPlaceholder(rep, v.label || v.email);
  if (placeholder.error) return `Could not open DM: ${placeholder.error}`;
  // AWAIT the background dispatch so Netlify doesn't terminate the inflight
  // request when the handler returns (this was the "stuck Drafting" bug).
  await fireDraftBackground({
    repEmail: rep.email,
    leadEmail: v.email,
    threadId: v.threadId || null,
    firstOutreach: !!v.firstOutreach,
    label: v.label || v.email,
    slackChannel: placeholder.channel,
    placeholderTs: placeholder.ts,
  });
  // No ephemeral confirmation needed — the placeholder message is the receipt.
  return null;
}

// Pull the chosen direction (subject + body) from saved_drafts. If a label
// is given, swap into all_directions[label]; otherwise use the stored
// medium subject + body.
async function loadDraftForSend(sb, draftId, optionalLabel) {
  const { data: draft, error } = await sb.from('saved_drafts').select('*').eq('id', draftId).maybeSingle();
  if (error || !draft) return { error: `draft ${draftId} not found` };
  let subject = draft.subject;
  let body = draft.body;
  let label = draft.direction_label;
  if (optionalLabel && optionalLabel !== draft.direction_label) {
    const all = (draft.target_ref && Array.isArray(draft.target_ref.all_directions)) ? draft.target_ref.all_directions : [];
    const picked = all.find((d) => d.label === optionalLabel);
    if (picked) {
      subject = picked.subject; body = picked.body; label = picked.label;
    }
  }
  return { draft, subject, body, label };
}

async function handleSendDraft(sb, rep, draftId, optionalLabel) {
  const loaded = await loadDraftForSend(sb, draftId, optionalLabel);
  if (loaded.error) return { ok: false, error: loaded.error };
  const { draft, subject, body } = loaded;
  const recipient = draft.recipient_email;
  if (!recipient) return { ok: false, error: 'draft has no recipient_email' };

  // Pre-flight gate — never bypass, even on user click. Suppression, current
  // client, DNC reply all block here just like send-as-rep.
  let gate;
  try { gate = await preflight(sb, { email: recipient, domain: recipient.split('@')[1] }); }
  catch (e) { return { ok: false, error: `preflight failed: ${e.message}` }; }
  if (gate.suppressed) return { ok: false, error: `blocked: ${gate.suppression_reason || 'suppressed'}` };
  if (gate.is_client) return { ok: false, error: 'blocked: already a current client (expansion touch, not cold pitch)' };

  // Send via the rep's Gmail. Reuses send-as-rep's helpers.
  const threadId = draft.target_ref?.thread_id || null;
  let sent;
  try {
    const token = await getAccessToken(sb, rep.email);
    const signatureHtml = await getSignature(token, rep.email);
    sent = await sendEmail(token, { from: rep.email, to: recipient, subject, body, signatureHtml, threadId });
  } catch (e) {
    return { ok: false, error: `Send failed: ${e.message}` };
  }

  // Record so the next digest reflects the send. Same path as send-as-rep:
  // upsert outreach_contacts, upsert outreach_sends with sender_email +
  // touch_count + thread_id + message_id.
  const now = new Date().toISOString();
  try {
    await sb.from('outreach_contacts').upsert(
      { email: recipient, email_domain: recipient.split('@')[1] || null, source: 'slack-pro-send', first_seen: now, ingested_at: now },
      { onConflict: 'email', ignoreDuplicates: true },
    );
    const { data: prev } = await sb.from('outreach_sends')
      .select('touch_count').eq('email', recipient).eq('campaign_id', 'gmail-direct').maybeSingle();
    await sb.from('outreach_sends').upsert(
      {
        email: recipient, campaign_id: 'gmail-direct', sent_time: now, ingested_at: now,
        touch_count: (prev?.touch_count || 0) + 1,
        thread_id: sent.threadId || threadId || null,
        message_id: sent.id || null,
        sender_email: rep.email,
      },
      { onConflict: 'email,campaign_id' },
    );
  } catch (e) {
    console.error('Send recorded but logging errored (non-fatal):', e.message);
  }

  // Clean up: delete the matching Gmail draft if one was created (otherwise
  // the rep sees a stale duplicate in their Drafts folder + the sent email).
  // Best-effort — never fail the send because the draft cleanup errored.
  if (draft.target_ref?.gmail_draft_id) {
    try {
      const tok = await getAccessToken(sb, rep.email);
      await deleteDraft(tok, draft.target_ref.gmail_draft_id);
    } catch (e) { console.warn('gmail draft cleanup after send failed (non-fatal):', e.message); }
  }
  await sb.from('saved_drafts').delete().eq('id', draftId);

  return { ok: true, sent: { subject, thread_id: sent.threadId || threadId } };
}

async function handleCancelDraft(sb, draftId) {
  // Load the draft first so we know the gmail_draft_id + rep_email to clean up.
  const { data: draft } = await sb.from('saved_drafts').select('target_ref').eq('id', draftId).maybeSingle();
  if (draft?.target_ref?.gmail_draft_id && draft.target_ref?.rep_email) {
    try {
      const tok = await getAccessToken(sb, draft.target_ref.rep_email);
      await deleteDraft(tok, draft.target_ref.gmail_draft_id);
    } catch (e) { console.warn('gmail draft cleanup on cancel failed (non-fatal):', e.message); }
  }
  await sb.from('saved_drafts').delete().eq('id', draftId);
  return { ok: true };
}

// "Chat with Pro" — posts an opener in the rep's DM that names the lead +
// pulls a quick context summary, and seeds the slack_conversations store
// keyed on this thread so Pro's first reply (and every subsequent reply)
// already has the lead context. Without the seed, slack-assistant.js sees
// an empty conversation history when the rep replies and has to ask "who
// are we drafting for?" — the bug Will hit.
async function handleChatWithPro(sb, rep, valueJson) {
  let v;
  try { v = JSON.parse(valueJson || '{}'); }
  catch { return { ok: false, error: 'bad chat target' }; }
  if (!v.email) return { ok: false, error: 'no email' };

  // Pull a quick lead picture so the opener message has real context to set.
  let pic = null;
  try {
    const mod = await import('./lib/lead-picture.js');
    pic = await mod.leadPicture(sb, { email: v.email });
  } catch (e) { console.warn('lead-picture failed (non-fatal):', e.message); }

  const name = pic?.identity?.name || v.label || v.email;
  const company = pic?.identity?.company || '';
  const personalNote = pic?.workhuman?.personal_note || '';
  const lastSentDate = pic?.history?.last_sent ? new Date(pic.history.last_sent).toLocaleDateString() : null;
  const lastSent = lastSentDate ? `last emailed ${lastSentDate}` : 'never emailed';
  const status = pic?.workhuman?.outreach_status ? ` · status: ${pic.workhuman.outreach_status.replace(/_/g, ' ')}` : '';
  const tier = pic?.workhuman?.tier ? ` · ${pic.workhuman.tier.replace('tier_', 'Tier ')}` : '';

  const visibleLines = [
    `:speech_balloon: *Chatting about ${name}${company ? ` · ${company}` : ''}* (${v.email})`,
    `_${lastSent}${status}${tier}_`,
  ];
  if (personalNote) visibleLines.push(`_Note: ${personalNote.slice(0, 200)}_`);
  visibleLines.push('');
  visibleLines.push("What would you like to do? Examples:");
  visibleLines.push(`  • draft a follow-up`);
  visibleLines.push(`  • create a proposal`);
  visibleLines.push(`  • look up history / next actions`);
  visibleLines.push(`  • create a landing page`);
  visibleLines.push(`Just type in this thread — I'll keep the lead context loaded.`);

  const open = await slackPost('conversations.open', { users: rep.slack_user_id });
  if (!open.ok) return { ok: false, error: open.error };
  const channel = open.channel?.id;
  const post = await slackPost('chat.postMessage', {
    channel,
    text: `Chatting about ${name}`,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: visibleLines.join('\n') } }],
  });
  if (!post.ok) return { ok: false, error: post.error };

  // Seed slack_conversations so Pro reads context on the first thread reply.
  // The conversation key is (channel_id, thread_ts). The thread_ts is the ts
  // of this opener message — when the rep replies in the thread, Slack tags
  // the reply with thread_ts pointing here, and slack-assistant.js loads our
  // seeded history.
  //
  // We seed with an explicit "Lead context" assistant turn so Claude knows
  // EXACTLY who to target for any draft/proposal/lookup action without us
  // having to also patch the system prompt to parse the opener's prose.
  const contextSummary = [
    `[Lead context for this thread]`,
    `email: ${v.email}`,
    name ? `name: ${name}` : null,
    company ? `company: ${company}` : null,
    pic?.identity?.title ? `title: ${pic.identity.title}` : null,
    pic?.workhuman?.tier ? `tier: ${pic.workhuman.tier}` : null,
    pic?.workhuman?.outreach_status ? `outreach_status: ${pic.workhuman.outreach_status}` : null,
    lastSentDate ? `last_emailed: ${lastSentDate}` : null,
    pic?.history?.replied ? `replied: yes` : null,
    personalNote ? `personal_note: ${personalNote.slice(0, 400)}` : null,
    v.threadId ? `gmail_thread_id: ${v.threadId}` : null,
    ``,
    `Any draft/proposal/landing-page/lookup action in this thread should target the lead above unless the rep names a different one. When the rep says "draft a follow-up", call draft_email with email=${v.email} immediately — do not re-ask who to draft for. The default mode is follow_up if last_emailed is set, otherwise first_outreach.`,
  ].filter(Boolean).join('\n');

  try {
    const { saveConversation } = await import('./lib/slack-conversation-store.js');
    await saveConversation(sb, channel, post.ts, [
      { role: 'assistant', content: contextSummary },
    ], null);
  } catch (e) {
    console.warn('conversation seed failed (non-fatal):', e.message);
  }

  return { ok: true };
}

// "Show other angles" — pull the saved_drafts row, render safe + brave from
// target_ref.all_directions, post them as a NEW message below the preview.
async function handleShowAngles(sb, rep, draftId, payload) {
  const { data: draft } = await sb.from('saved_drafts').select('*').eq('id', draftId).maybeSingle();
  if (!draft) return { ok: false, error: 'draft not found' };
  const allDirections = draft.target_ref?.all_directions || [];
  const fightFor = { label: draft.target_ref?.fight_for, reason: draft.target_ref?.fight_for_reason };
  const blocks = buildOtherAnglesBlocks(
    { who: draft.target_ref?.label || draft.recipient_email, email: draft.recipient_email, draftId },
    allDirections, fightFor,
  );
  // Post as new message in same channel so the original preview stays.
  const open = await slackPost('conversations.open', { users: rep.slack_user_id });
  if (!open.ok) return { ok: false, error: open.error };
  await slackPost('chat.postMessage', {
    channel: open.channel?.id, blocks, text: `Other angles for ${draft.recipient_email}`,
  });
  return { ok: true };
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

    const [op, arg, arg2] = (action.action_id || '').split(':');
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
      else if (op === 'draft_pro') {
        // Returns null on success (placeholder posted, background fires);
        // returns a string on failure for the ephemeral confirmation.
        const fail = await handleDraftButton(sb, rep, action);
        if (fail) confirmation = fail;
      }
      else if (op === 'send_pro' || op === 'send_pro_dir') {
        // arg = draftId; arg2 (for send_pro_dir) = direction label override
        const result = await handleSendDraft(sb, rep, arg, arg2);
        if (result.ok) {
          // Update the ORIGINAL preview message in place: pull the message ts
          // from saved_drafts.target_ref before delete, or use the message
          // from the action payload.
          const draftCtx = payload.message;
          const blocks = buildDraftSentBlocks(
            { who: draftCtx?.text || arg, email: '', tz: rep.tz },
            result.sent, rep.email,
          );
          await slackPost('chat.update', {
            channel: payload.channel?.id, ts: payload.message?.ts, blocks, text: 'Sent ✓',
          });
        } else {
          confirmation = result.error;
          const blocks = buildDraftErrorBlocks({ who: 'lead', email: '' }, result.error);
          await slackPost('chat.update', {
            channel: payload.channel?.id, ts: payload.message?.ts, blocks, text: 'Send failed',
          });
        }
      }
      else if (op === 'cancel_draft') {
        await handleCancelDraft(sb, arg);
        const blocks = buildDraftCancelledBlocks({ who: 'this lead' });
        await slackPost('chat.update', {
          channel: payload.channel?.id, ts: payload.message?.ts, blocks, text: 'Draft cancelled',
        });
      }
      else if (op === 'show_angles') {
        const result = await handleShowAngles(sb, rep, arg, payload);
        if (!result.ok) confirmation = result.error;
      }
      else if (op === 'chat_pro') {
        const result = await handleChatWithPro(sb, rep, action.value);
        if (!result.ok) confirmation = result.error;
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
