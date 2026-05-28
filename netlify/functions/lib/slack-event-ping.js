/**
 * slack-event-ping — DM Pro pings to the owner of a lead for a real-time
 * trigger (Phase 3). Shared between gmail-pubsub-reply (new reply) and
 * the landing-page view notifier.
 *
 * Resolves "lead owner" via the same chain `followups.js` uses:
 *   1. workhuman_leads.assigned_to (when the contact is a personal-note lead)
 *      → map to gmail via reverse SENDER_EMAILS lookup
 *   2. most recent outreach_sends.sender_email for that contact
 *   3. no owner → no ping (don't bug anyone about unclaimed leads)
 *
 * Honors the per-rep mute + global-snooze settings on gmail_accounts.
 *
 * Sends as plain text + block kit so the inline buttons (Draft / Open thread
 * / Snooze 1d / Mute lead) work the same as Phase 2 digest items.
 */

const SLACK_API = 'https://slack.com/api';

// Keep aligned with workhuman-booth-send.js + record-outreach-send.js.
// TODO: extract this single source of truth once a fourth file uses it.
const ASSIGNEE_TO_EMAIL = {
  'Will Newton':       'will@getshortcut.co',
  'Jaimie Pritchard':  'jaimie@getshortcut.co',
  'Marc Levitan':      'marc@getshortcut.co',
  'Caren Skutch':      'caren@getshortcut.co',
};

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

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

/**
 * Resolve the lead owner for a contact. Returns the gmail_accounts row of
 * the owner (with slack_user_id + mute settings) or null if no owner.
 */
export async function resolveLeadOwner(sb, leadEmail) {
  const email = lc(leadEmail);
  if (!email) return null;

  // Path A — workhuman_leads.assigned_to (personal-note leads)
  let repEmail = null;
  const { data: wh } = await sb.from('workhuman_leads')
    .select('assigned_to, name, company').eq('email', email).maybeSingle();
  if (wh?.assigned_to && ASSIGNEE_TO_EMAIL[wh.assigned_to]) {
    repEmail = ASSIGNEE_TO_EMAIL[wh.assigned_to];
  }

  // Path B — most recent outreach_sends.sender_email
  if (!repEmail) {
    const { data: latestSend } = await sb.from('outreach_sends')
      .select('sender_email').eq('email', email).not('sender_email', 'is', null)
      .order('sent_time', { ascending: false }).limit(1).maybeSingle();
    if (latestSend?.sender_email) repEmail = latestSend.sender_email;
  }
  if (!repEmail) return null;

  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, slack_user_id, tz, event_pings_enabled, muted_until, muted_lead_emails, muted_until_by_lead')
    .eq('email', repEmail).maybeSingle();
  if (!acct?.slack_user_id) return null;

  return { acct, name: wh?.name || null, company: wh?.company || null };
}

/**
 * Check whether a ping should fire for this rep + lead based on their
 * notification settings. Centralized so future triggers behave consistently.
 */
export function shouldPing(acct, leadEmail) {
  if (!acct?.slack_user_id) return false;
  if (acct.event_pings_enabled === false) return false;
  const now = Date.now();
  if (acct.muted_until && new Date(acct.muted_until).getTime() > now) return false;
  const muted = new Set((acct.muted_lead_emails || []).map(lc));
  if (muted.has(lc(leadEmail))) return false;
  const snoozes = acct.muted_until_by_lead || {};
  const until = snoozes[lc(leadEmail)];
  if (until && new Date(until).getTime() > now) return false;
  return true;
}

/**
 * Open the rep's DM channel and post a block-kit message + fallback text.
 * Returns { ok, ts } so the caller can correlate later updates if needed.
 */
export async function sendPingDM(slackUserId, fallbackText, blocks) {
  const open = await slackPost('conversations.open', { users: slackUserId });
  if (!open.ok) return { ok: false, error: open.error };
  const post = await slackPost('chat.postMessage', {
    channel: open.channel?.id,
    text: fallbackText,
    blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
  return { ok: !!post.ok, ts: post.ts, error: post.error || null, channel: open.channel?.id };
}
