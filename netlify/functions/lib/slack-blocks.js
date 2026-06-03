/**
 * Slack Block Kit builders for Pro's daily rep digest.
 *
 * Every digest section renders as a section block + per-item action button
 * row. Button action_ids encode the operation + email so the interactivity
 * webhook can route without extra state. Action_id format: <op>:<email>
 *   draft:<email>           → open the web drafter prefilled to that lead
 *   open_thread:<thread_id> → Gmail deep link (URL button, no roundtrip)
 *   snooze_1d:<email>       → muted_until_by_lead[email] = now + 1d
 *   snooze_7d:<email>       → muted_until_by_lead[email] = now + 7d
 *   mute:<email>            → muted_lead_emails << email (permanent)
 *
 * Buttons that just open a URL are url-buttons (no roundtrip). Buttons that
 * mutate state are value-buttons that POST to /slack-interactivity.
 */

const SI_URL_BASE = 'https://proposals.getshortcut.co/sales-intelligence';

// Gmail deep-link for a thread. Uses #all/<thread_id> which is what Gmail's
// "Open in Gmail" UI generates. Works for any thread visible to the user.
const gmailThreadUrl = (threadId, repEmail) => {
  if (!threadId) return null;
  // authuser pins to the right account if the rep has multiple Gmail logins
  const params = repEmail ? `?authuser=${encodeURIComponent(repEmail)}` : '';
  return `https://mail.google.com/mail/u/0${params}#all/${threadId}`;
};

// Sales-intelligence drafter deep link (web). Phase 2.5 may swap this for a
// Slack modal-based drafter; deep link is fine for v1.
const draftUrl = (email) => `${SI_URL_BASE}?lead=${encodeURIComponent(email)}#followups`;

// Truncate inline so Slack's button labels don't exceed 75 chars
const sliceLbl = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

// Action button: opens a URL in browser (no roundtrip to our backend)
const urlBtn = (text, url, style) => ({
  type: 'button',
  text: { type: 'plain_text', text: sliceLbl(text, 30), emoji: true },
  url,
  ...(style ? { style } : {}),
});

// Action button: POSTs to /slack-interactivity with action_id encoding op + email
const actionBtn = (text, actionId, value, style, confirm) => ({
  type: 'button',
  text: { type: 'plain_text', text: sliceLbl(text, 30), emoji: true },
  action_id: actionId,
  value,
  ...(style ? { style } : {}),
  ...(confirm ? { confirm } : {}),
});

function itemBlocks(label, sublabel, email, opts = {}) {
  const { threadId, repEmail, includeDraft = true, includeOpenThread = true, draftLabel = 'Draft', isFirstOutreach = false } = opts;
  const blocks = [];
  // Headline row — bold name + faded sublabel
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `• *${label}*${sublabel ? ` — ${sublabel}` : ''}` },
  });
  const buttons = [];
  if (includeDraft) {
    // Primary action: Pro drafts + lets you send from Slack.
    // action_id encodes the operation + email + a flag for first-outreach
    // (cold open) vs follow-up so the background generator picks the right
    // prompt mode. We also pass thread_id via value (URL-encoded) so the
    // generated draft can reply in-thread.
    const actionId = `draft_pro:${email}`;
    const value = JSON.stringify({ email, threadId: threadId || null, firstOutreach: !!isFirstOutreach, label });
    buttons.push(actionBtn(draftLabel, actionId, value, 'primary'));
  }
  const gmailUrl = gmailThreadUrl(threadId, repEmail);
  if (includeOpenThread && gmailUrl) buttons.push(urlBtn('Open thread', gmailUrl));
  // "Chat with Pro" — opens a conversation in DM about this specific lead.
  // Pro gets the lead context (name, company, last send, personal note)
  // pre-loaded so subsequent replies in the DM understand who you're
  // discussing without you re-typing it.
  buttons.push(actionBtn('Chat with Pro', `chat_pro:${email}`, JSON.stringify({ email, label, threadId: threadId || null })));
  buttons.push(actionBtn('Snooze 1d', `snooze_1d:${email}`, email));
  buttons.push(actionBtn('Snooze 7d', `snooze_7d:${email}`, email));
  buttons.push(actionBtn('Mute lead', `mute:${email}`, email, undefined, {
    title: { type: 'plain_text', text: 'Mute this lead?' },
    text: { type: 'mrkdwn', text: `You will stop seeing *${label}* in any digest until you restore them.` },
    confirm: { type: 'plain_text', text: 'Mute' },
    deny: { type: 'plain_text', text: 'Cancel' },
  }));
  blocks.push({ type: 'actions', elements: buttons });
  return blocks;
}

/**
 * Build the full digest message blocks.
 * @param rep        { tz, assignee_first, repEmail }
 * @param sec        { hotReplies, neverEmailed, due, lpViews } from buildSectionsForRep
 */
export function buildDigestBlocks(rep, sec) {
  const today = new Intl.DateTimeFormat('en-US', { timeZone: rep.tz, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const blocks = [];
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `:wave: Morning${rep.assignee_first ? ' ' + rep.assignee_first : ''}. Here's ${today}.` },
  });

  if (sec.hotReplies.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `:fire: *Replied in last 48h (${sec.hotReplies.length})*` } });
    for (const h of sec.hotReplies.slice(0, 5)) {
      const who = [h.name, h.company].filter(Boolean).join(' · ') || h.email;
      blocks.push(...itemBlocks(who, `replied ${h.hours_ago}h ago`, h.email, {
        threadId: h.thread_id, repEmail: rep.repEmail, draftLabel: 'Draft proposal',
      }));
    }
    if (sec.hotReplies.length > 5) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_+${sec.hotReplies.length - 5} more in /sales-intelligence_` }] });
  }

  if (sec.neverEmailed.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `:sparkles: *Personal notes — never emailed (${sec.neverEmailed.length})*` } });
    for (const n of sec.neverEmailed.slice(0, 5)) {
      const who = [n.name, n.company].filter(Boolean).join(' · ') || n.email;
      const tierStr = n.tier ? `Tier ${n.tier}` : '';
      const sub = [tierStr, n.note ? `"${n.note}"` : ''].filter(Boolean).join(' — ');
      blocks.push(...itemBlocks(who, sub, n.email, {
        repEmail: rep.repEmail, includeOpenThread: false, draftLabel: 'Draft cold open',
        isFirstOutreach: true,
      }));
    }
    if (sec.neverEmailed.length > 5) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_+${sec.neverEmailed.length - 5} more_` }] });
  }

  if (sec.due.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `:hourglass: *Due for follow-up (${sec.due.length})*` } });
    for (const d of sec.due.slice(0, 5)) {
      const who = [d.name, d.company].filter(Boolean).join(' · ') || d.email;
      blocks.push(...itemBlocks(who, `${d.days}d since last send`, d.email, {
        threadId: d.thread_id, repEmail: rep.repEmail, draftLabel: 'Draft follow-up',
      }));
    }
    if (sec.due.length > 5) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_+${sec.due.length - 5} more_` }] });
  }

  if (sec.lpViews.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `:eyes: *Landing page views — last 24h (${sec.lpViews.length})*` } });
    for (const v of sec.lpViews.slice(0, 5)) {
      const who = [v.name, v.company].filter(Boolean).join(' · ') || v.email;
      blocks.push(...itemBlocks(who, `${v.views} total view${v.views === 1 ? '' : 's'}`, v.email, {
        repEmail: rep.repEmail, includeOpenThread: false, draftLabel: 'Draft check-in',
      }));
    }
  }

  // Footer — Settings opens the modal, and a help tip points to /sales-intelligence
  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'actions',
    elements: [
      actionBtn('Settings', 'open_settings', 'open'),
      urlBtn('Open in browser', `${SI_URL_BASE}#followups`),
    ],
  });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '_Mute or snooze any lead with the buttons above. @Pro me here to draft, hide, or look anyone up._' }],
  });

  return blocks;
}

/**
 * Build the Settings modal view. Surfaces digest enabled state, weekend toggle,
 * timezone, current mutes (with restore buttons), and active per-lead snoozes.
 * Submitted via view_submission interaction → handled in slack-interactivity.
 */
export function buildSettingsModal(acct) {
  const muted = (acct.muted_lead_emails || []).slice(0, 25);
  const snoozesByLead = acct.muted_until_by_lead || {};
  const activeSnoozes = Object.entries(snoozesByLead)
    .filter(([, until]) => until && new Date(until).getTime() > Date.now())
    .slice(0, 25);

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: 'Pro · Notification settings' } },
    {
      type: 'section', text: { type: 'mrkdwn', text: '*Daily digest*' },
      accessory: {
        type: 'static_select',
        action_id: 'set_digest_enabled',
        initial_option: acct.digest_enabled
          ? { text: { type: 'plain_text', text: 'On' }, value: 'on' }
          : { text: { type: 'plain_text', text: 'Off' }, value: 'off' },
        options: [
          { text: { type: 'plain_text', text: 'On' }, value: 'on' },
          { text: { type: 'plain_text', text: 'Off' }, value: 'off' },
        ],
      },
    },
    {
      type: 'section', text: { type: 'mrkdwn', text: '*Skip weekends*' },
      accessory: {
        type: 'static_select',
        action_id: 'set_skip_weekends',
        initial_option: acct.digest_skip_weekends
          ? { text: { type: 'plain_text', text: 'Yes' }, value: 'yes' }
          : { text: { type: 'plain_text', text: 'No' }, value: 'no' },
        options: [
          { text: { type: 'plain_text', text: 'Yes' }, value: 'yes' },
          { text: { type: 'plain_text', text: 'No' }, value: 'no' },
        ],
      },
    },
    {
      type: 'section', text: { type: 'mrkdwn', text: '*Event pings* (replies, landing page views, etc — Phase 3)' },
      accessory: {
        type: 'static_select',
        action_id: 'set_event_pings_enabled',
        initial_option: acct.event_pings_enabled
          ? { text: { type: 'plain_text', text: 'On' }, value: 'on' }
          : { text: { type: 'plain_text', text: 'Off' }, value: 'off' },
        options: [
          { text: { type: 'plain_text', text: 'On' }, value: 'on' },
          { text: { type: 'plain_text', text: 'Off' }, value: 'off' },
        ],
      },
    },
    {
      type: 'section', text: { type: 'mrkdwn', text: `*Timezone*\n_currently ${acct.tz || 'America/New_York'}_` },
    },
    { type: 'divider' },
  ];

  if (muted.length) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Muted leads (${muted.length})*` } });
    for (const email of muted) {
      blocks.push({
        type: 'section', text: { type: 'mrkdwn', text: `• \`${email}\`` },
        accessory: actionBtn('Restore', `restore:${email}`, email),
      });
    }
  } else {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '_No muted leads._' } });
  }

  if (activeSnoozes.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Active snoozes (${activeSnoozes.length})*` } });
    for (const [email, until] of activeSnoozes) {
      const untilStr = new Date(until).toLocaleString('en-US', { timeZone: acct.tz || 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric' });
      blocks.push({
        type: 'section', text: { type: 'mrkdwn', text: `• \`${email}\` — until ${untilStr}` },
        accessory: actionBtn('Unsnooze', `unsnooze:${email}`, email),
      });
    }
  }

  return {
    type: 'modal',
    callback_id: 'pro_settings',
    title: { type: 'plain_text', text: 'Pro Settings' },
    close: { type: 'plain_text', text: 'Close' },
    blocks,
  };
}

// ============================================================
// Draft preview message (posted by slack-draft-async-background after the
// LLM finishes). Shows subject + body of the medium direction with action
// buttons to send, switch direction, edit in browser, or cancel.
// ============================================================

const BODY_TRUNCATE_AT = 1400; // Slack section text max is 3000; leave room for formatting

/**
 * Build the draft preview message blocks.
 * @param ctx  { who: 'Beverly · Opensesame', email, draftId, threadId? }
 * @param draft { subject, body, label }
 * @param fightFor { label, reason }
 */
export function buildDraftPreviewBlocks(ctx, draft, fightFor) {
  const blocks = [];
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `:pencil2: *Draft to ${ctx.who}* (${draft.label || 'medium'})` },
  });
  if (fightFor && fightFor.reason) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_Pro recommends *${fightFor.label}*: ${fightFor.reason.slice(0, 200)}_` }],
    });
  }
  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*Subject:* ${draft.subject || '_(no subject — continues thread)_'}` },
  });
  const body = String(draft.body || '');
  const truncated = body.length > BODY_TRUNCATE_AT;
  const shown = truncated ? body.slice(0, BODY_TRUNCATE_AT) + '…' : body;
  // Convert Markdown links [Label](URL) → Slack mrkdwn <URL|Label> so they
  // render as clickable links in the preview (matches how the Gmail send
  // converts them to HTML anchors — both surfaces stay visually consistent).
  const mdToSlack = (s) => s.replace(/\[([^\]\n]+?)\]\((https?:\/\/[^\s)]+)\)/g, '<$2|$1>');
  // Render body in a quoted block so newlines preserve (Slack mrkdwn `>` quote)
  const quoted = mdToSlack(shown).split('\n').map((l) => `> ${l}`).join('\n');
  blocks.push({ type: 'section', text: { type: 'mrkdwn', text: quoted } });
  if (truncated) {
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_+${body.length - BODY_TRUNCATE_AT} more chars — click Edit in browser to see full body_` }] });
  }
  blocks.push({ type: 'divider' });
  // "Open in Gmail" deep-link: opens Gmail compose pre-filled with to /
  // subject / body so the rep can tweak and send from Gmail directly.
  // Uses the rep's own gmail account via authuser= so the right inbox opens.
  let openInGmailUrl = null;
  if (ctx.repEmail && ctx.gmailMessageId) {
    // Preferred path: open the REAL Gmail draft created via drafts.create.
    // VERIFIED working URL format: ?authuser=...#drafts/<HEX_MESSAGE_ID>
    // (NOT ?compose=<draft_id> — that pattern just lands the user in their
    // inbox.) The fragment-based URL pops the actual compose window with
    // full HTML body + the rep's brand-styled HTML signature rendered.
    // Tested live: https://mail.google.com/mail/u/0/?authuser=<rep>#drafts/<msgId>
    openInGmailUrl = `https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(ctx.repEmail)}#drafts/${ctx.gmailMessageId}`;
  } else if (ctx.repEmail && ctx.email) {
    // Fallback: legacy compose URL when no real Gmail draft id was created
    // (e.g. token fetch failed). body= is text-only; Gmail's own
    // auto-signature setting takes over from there.
    const gmailBody = String(draft.body || '').replace(
      /\[([^\]\n]+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '$1: $2',
    );
    const p = new URLSearchParams({
      view: 'cm', fs: '1',
      to: ctx.email,
      su: String(draft.subject || ''),
      body: gmailBody,
      authuser: ctx.repEmail,
    });
    openInGmailUrl = `https://mail.google.com/mail/?${p.toString()}`;
  }
  const actions = [
    actionBtn('Send', `send_pro:${ctx.draftId}`, ctx.draftId, 'primary', {
      title: { type: 'plain_text', text: 'Send now?' },
      text: { type: 'mrkdwn', text: `This will send the draft from your Gmail to *${ctx.email}*.` },
      confirm: { type: 'plain_text', text: 'Send' },
      deny: { type: 'plain_text', text: 'Cancel' },
    }),
    ...(openInGmailUrl ? [urlBtn('Open in Gmail', openInGmailUrl)] : []),
    actionBtn('Show other angles', `show_angles:${ctx.draftId}`, ctx.draftId),
    urlBtn('Edit in browser', `${SI_URL_BASE}?lead=${encodeURIComponent(ctx.email)}&draft=${encodeURIComponent(ctx.draftId)}#followups`),
    actionBtn('Cancel', `cancel_draft:${ctx.draftId}`, ctx.draftId, 'danger'),
  ];
  blocks.push({ type: 'actions', elements: actions });
  return blocks;
}

/**
 * Build the safe + brave angles preview (revealed when user clicks
 * "Show other angles"). Each direction gets its own Send button.
 */
export function buildOtherAnglesBlocks(ctx, allDirections, fightFor) {
  const blocks = [];
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `:scales: *Other angles for ${ctx.who}*` },
  });
  for (const d of allDirections) {
    if (d.label === 'medium') continue;  // already shown above
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${d.label.toUpperCase()}*${fightFor?.label === d.label ? ' :star:' : ''}` },
    });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Subject:* ${d.subject || '_(no subject)_'}` },
    });
    const body = String(d.body || '').slice(0, 700);
    const quoted = body.split('\n').map((l) => `> ${l}`).join('\n');
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: quoted } });
    blocks.push({
      type: 'actions',
      elements: [
        actionBtn(`Send ${d.label}`, `send_pro_dir:${ctx.draftId}:${d.label}`, JSON.stringify({ draftId: ctx.draftId, label: d.label }), 'primary', {
          title: { type: 'plain_text', text: `Send ${d.label} draft?` },
          text: { type: 'mrkdwn', text: `Send the *${d.label}* version to *${ctx.email}* from your Gmail.` },
          confirm: { type: 'plain_text', text: 'Send' },
          deny: { type: 'plain_text', text: 'Cancel' },
        }),
      ],
    });
  }
  return blocks;
}

/**
 * Replace the preview after a successful send. Body is short so we render
 * the subject + the time + a link to the thread.
 */
export function buildDraftSentBlocks(ctx, sent, repEmail) {
  const when = new Date().toLocaleString('en-US', { timeZone: ctx.tz || 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `:white_check_mark: *Sent to ${ctx.who}* at ${when}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Subject:* ${sent.subject}` } },
  ];
  const gmailUrl = gmailThreadUrl(sent.thread_id, repEmail);
  if (gmailUrl) {
    blocks.push({ type: 'actions', elements: [urlBtn('Open in Gmail', gmailUrl)] });
  }
  return blocks;
}

export function buildDraftCancelledBlocks(ctx) {
  return [{ type: 'section', text: { type: 'mrkdwn', text: `:x: *Draft to ${ctx.who} cancelled.*` } }];
}

export function buildDraftErrorBlocks(ctx, errorMessage) {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `:warning: *Could not send to ${ctx.who}*` } },
    { type: 'section', text: { type: 'mrkdwn', text: `\`${errorMessage}\`` } },
    {
      type: 'actions',
      elements: [urlBtn('Try in browser', `${SI_URL_BASE}?lead=${encodeURIComponent(ctx.email)}#followups`)],
    },
  ];
}

// ============================================================
// Phase 3 event-driven ping blocks. Same button row as digest items so
// Snooze / Mute / Open thread / Draft all work identically — the rep
// doesn't have to learn a second UI.
// ============================================================

/**
 * Ping when a prospect replies to a thread the rep owns.
 * ctx: { who, email, threadId, repEmail, snippet, sentiment }
 */
export function buildReplyPingBlocks(ctx) {
  const sentEmoji = ctx.sentiment === 'positive' ? ':fire:'
    : ctx.sentiment === 'negative' ? ':warning:'
    : ctx.sentiment === 'ooo' ? ':palm_tree:'
    : ':bell:';
  const sentLabel = ctx.sentiment ? ` (${ctx.sentiment})` : '';

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `${sentEmoji} *New reply from ${ctx.who}*${sentLabel}` },
    },
  ];
  if (ctx.snippet) {
    const quoted = ctx.snippet.slice(0, 600).split('\n').map((l) => `> ${l}`).join('\n');
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: quoted } });
  }
  const buttons = [];
  // Draft a reply via the same background pipeline as the digest button
  buttons.push(actionBtn('Draft reply', `draft_pro:${ctx.email}`,
    JSON.stringify({ email: ctx.email, threadId: ctx.threadId || null, firstOutreach: false, label: ctx.who }),
    'primary'));
  const gmailUrl = gmailThreadUrl(ctx.threadId, ctx.repEmail);
  if (gmailUrl) buttons.push(urlBtn('Open thread', gmailUrl));
  buttons.push(actionBtn('Snooze 1d', `snooze_1d:${ctx.email}`, ctx.email));
  buttons.push(actionBtn('Mute lead', `mute:${ctx.email}`, ctx.email));
  blocks.push({ type: 'actions', elements: buttons });
  return blocks;
}

/**
 * Ping when a prospect views their landing page (2nd+ view in 24h).
 * ctx: { who, email, viewCount, landingPageUrl, repEmail }
 */
export function buildLandingViewPingBlocks(ctx) {
  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `:eyes: *${ctx.who} viewed their landing page* (${ctx.viewCount} total view${ctx.viewCount === 1 ? '' : 's'})` },
    },
  ];
  const buttons = [];
  buttons.push(actionBtn('Draft follow-up', `draft_pro:${ctx.email}`,
    JSON.stringify({ email: ctx.email, threadId: null, firstOutreach: false, label: ctx.who }),
    'primary'));
  if (ctx.landingPageUrl) buttons.push(urlBtn('Open page', ctx.landingPageUrl));
  buttons.push(actionBtn('Snooze 1d', `snooze_1d:${ctx.email}`, ctx.email));
  buttons.push(actionBtn('Mute lead', `mute:${ctx.email}`, ctx.email));
  blocks.push({ type: 'actions', elements: buttons });
  return blocks;
}
