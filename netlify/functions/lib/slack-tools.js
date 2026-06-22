/**
 * Slack Tools — execute proposal operations for the Pro assistant.
 * Each handler imports lib modules directly (same process, no HTTP hop).
 * Returns plain objects that Claude can interpret and relay to the user.
 */

import { assembleProposal } from './proposal-assembler.js';
import { applyOperations } from './proposal-editor.js';
import { calculateEventOptions } from './reverse-calculator.js';
import { searchClients, getClientByName, searchProposals } from './client-lookup.js';
import { fetchAndStoreLogo, storeProvidedLogo, fetchLogoUrl, searchLogoViaBrave, svgLikelyInvisibleOnLight, fetchSvgText } from './logo-fetcher.js';
import { recalculateProposalSummary } from './pricing-engine.js';
import { duplicateProposal } from './proposal-duplicator.js';
import { createOption, linkProposals, unlinkProposal, renameOption, reorderOption } from './proposal-linker.js';
import { createLandingPage, getLandingPage } from './landing-page-assembler.js';
import { leadPicture, suggestNextActions } from './lead-picture.js';
import { getAccessToken, getThread, bodyFromPayload, lc as lcGmail } from './gmail.js';

const PROPOSAL_BASE_URL = 'https://proposals.getshortcut.co/proposal';
const PROPOSAL_SHORT_URL = 'https://proposals.getshortcut.co/p';

function getProposalShareUrl(id, slug) {
  if (slug) return `${PROPOSAL_SHORT_URL}/${slug}`;
  return `${PROPOSAL_BASE_URL}/${id}?shared=true`;
}

/**
 * Execute a tool call from Claude and return the result.
 */
async function executeTool(toolName, params, supabase, userId, slackContext) {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    return { error: `Unknown tool: ${toolName}` };
  }

  try {
    return await handler(params, supabase, userId, slackContext || {});
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return { error: err.message || 'Tool execution failed' };
  }
}

// --- Tool Handlers ---

const TOOL_HANDLERS = {
  create_proposal: handleCreateProposal,
  edit_proposal: handleEditProposal,
  search_proposals: handleSearchProposals,
  get_proposal: handleGetProposal,
  calculate_pricing: handleCalculatePricing,
  lookup_client: handleLookupClient,
  search_logo: handleSearchLogo,
  duplicate_proposal: handleDuplicateProposal,
  create_proposal_option: handleCreateOption,
  link_proposals: handleLinkProposals,
  unlink_proposal: handleUnlinkProposal,
  rename_proposal_option: handleRenameOption,
  reorder_proposal_option: handleReorderOption,
  create_landing_page: handleCreateLandingPage,
  get_landing_page: handleGetLandingPage,
  create_qr_code_sign: handleCreateQRCodeSign,
  get_qr_code_sign: handleGetQRCodeSign,
  list_qr_code_signs: handleListQRCodeSigns,
  edit_qr_code_sign: handleEditQRCodeSign,
  create_invoice: handleCreateInvoice,
  search_invoices: handleSearchInvoices,
  get_invoice: handleGetInvoice,
  lookup_lead: handleLookupLead,
  next_actions_for_lead: handleNextActionsForLead,
  suppress_lead: handleSuppressLead,
  unsuppress_lead: handleUnsuppressLead,
  draft_email: handleDraftEmail,
  edit_draft: handleEditDraft,
  read_thread: handleReadThread,
  list_broker_queue: handleListBrokerQueue
};

// ============================================================
// Suppress / unsuppress — writes to the shared crm_suppression table that
// preflight.js already reads. Once an email is in there, it's filtered from
// EVERYWHERE: daily digest, follow-up queue, contact-card searches, lookup_lead.
// One row per email; reason + detail let future reps see why it was hidden.
// ============================================================

async function handleSuppressLead(params, supabase, userId) {
  const email = (params.email || '').toString().trim().toLowerCase();
  const reason = (params.reason || 'personal').toString();
  if (!email) return { error: 'suppress_lead requires email' };
  if (!email.includes('@')) return { error: `"${email}" doesn't look like an email address` };

  // Look up who's doing this so the detail row carries provenance.
  // Resolves the supabase auth user_id to the rep's gmail (the same identity
  // mapping Pro already uses everywhere else).
  let actor = null;
  if (userId) {
    const { data } = await supabase.from('gmail_accounts').select('email').eq('supabase_user_id', userId).maybeSingle();
    actor = data?.email || null;
  }

  const { error } = await supabase.from('crm_suppression').upsert({
    email,
    reason,
    source: 'slack_pro',
    detail: { note: params.detail || null, suppressed_by: actor, suppressed_at: new Date().toISOString() },
  }, { onConflict: 'email' });
  if (error) return { error: `Failed to hide ${email}: ${error.message}` };
  return {
    success: true,
    email,
    reason,
    message: `Hidden ${email} from the CRM (reason: ${reason}). Filtered from your digest, the follow-up tab, and Pro lookups. Call unsuppress_lead to restore.`,
  };
}

async function handleUnsuppressLead(params, supabase) {
  const email = (params.email || '').toString().trim().toLowerCase();
  if (!email) return { error: 'unsuppress_lead requires email' };

  // Check it actually exists first so we can confirm the reason cleanly.
  const { data: existing } = await supabase.from('crm_suppression')
    .select('reason, source, detail').eq('email', email).maybeSingle();
  if (!existing) {
    return { success: true, email, message: `${email} wasn't suppressed — nothing to restore.` };
  }
  const { error } = await supabase.from('crm_suppression').delete().eq('email', email);
  if (error) return { error: `Failed to restore ${email}: ${error.message}` };
  return {
    success: true,
    email,
    previous_reason: existing.reason,
    message: `Restored ${email} (was hidden as: ${existing.reason}). They'll appear in the next digest if they have active outreach.`,
  };
}

// ============================================================
// draft_email — same pipeline as the digest "Draft" button.
// Resolves the lead (by email or name+company), opens a DM with the rep,
// posts a "Drafting..." placeholder, fires the background LLM, returns
// to Pro. The background function chat.updates the placeholder with the
// preview (subject + body + Send/Cancel/etc buttons).
//
// userId here is the supabase auth user id of the slack user who DMed Pro,
// resolved by slack-assistant.js via the gmail_accounts.supabase_user_id
// mapping.
// ============================================================

async function handleDraftEmail(params, supabase, userId, slackContext) {
  // Resolve recipient via lead-picture (which supports email OR name+company).
  let leadEmail = (params.email || '').toString().trim().toLowerCase();
  const name = (params.name || '').toString().trim() || null;
  const company = (params.company || '').toString().trim() || null;
  if (!leadEmail && !name && !company) {
    return { error: 'draft_email needs email, or name+company' };
  }
  // Use lead-picture for name resolution (same path lookup_lead uses).
  const pic = await leadPicture(supabase, { email: leadEmail, name, company });
  leadEmail = leadEmail || pic.identity?.email || null;
  if (!leadEmail) {
    return { error: `Could not resolve "${[name, company].filter(Boolean).join(' from ') || '(unknown)'}" to a contact. Try the email directly.` };
  }

  // Look up the rep's gmail + slack_user_id for the DM.
  const { data: acct } = await supabase.from('gmail_accounts')
    .select('email, slack_user_id, tz').eq('supabase_user_id', userId).maybeSingle();
  if (!acct?.slack_user_id) {
    return { error: 'I don\'t have your Slack profile mapped — set up Pro digest first, or reach Will to backfill slack_user_id.' };
  }

  // Post the placeholder in the conversation Pro is already having with the
  // rep. If the rep @Pro'd inside a thread, post the placeholder INTO that
  // thread (Will's complaint: drafts were landing in the main DM feed,
  // splitting the conversation in two). Otherwise open a fresh DM channel.
  // DM channel IDs start with 'D' (or 'U' on some workspaces) — those are
  // the safe cases to reuse the channel directly. For channel mentions
  // (channelId starts with 'C'), fall back to opening the IM so the draft
  // stays private to the rep.
  const SLACK_API = 'https://slack.com/api';
  const slackPost = async (method, body) => {
    const r = await fetch(`${SLACK_API}/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  };
  const label = [pic.identity?.name, pic.identity?.company].filter(Boolean).join(' · ') || leadEmail;
  const ctxChannel = slackContext?.channelId || null;
  const ctxThreadTs = slackContext?.threadTs || null;
  let channel = ctxChannel;
  let threadTs = ctxThreadTs;
  // If the conversation context is missing OR not a DM/IM, open a fresh DM.
  if (!channel || /^[CG]/.test(channel)) {
    const open = await slackPost('conversations.open', { users: acct.slack_user_id });
    if (!open.ok) return { error: `Could not open DM: ${open.error}` };
    channel = open.channel?.id;
    threadTs = null;  // no thread context when we open a fresh DM
  }
  const placeholder = await slackPost('chat.postMessage', {
    channel,
    ...(threadTs ? { thread_ts: threadTs } : {}),
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `:hourglass_flowing_sand: *Drafting to ${label}…*` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '_~10s. Brand voice + anti-hallucination rules applied._' }] },
    ],
    text: `Drafting to ${label}…`,
  });
  if (!placeholder.ok) return { error: `Could not post placeholder: ${placeholder.error}` };

  // Resolve thread + mode.
  const latestSendThreadId = (pic.history?.sends || []).slice(-1)[0]?.thread_id || null;
  let firstOutreach;
  if (params.mode === 'first_outreach') firstOutreach = true;
  else if (params.mode === 'follow_up') firstOutreach = false;
  else firstOutreach = !latestSendThreadId;   // auto

  // BROKER GTM detection — if this contact is in our broker queue, pull the
  // track + firm metadata so the background prompt switches to the
  // wellness-fund pitch (no Workhuman hook).
  let brokerCtx = null;
  try {
    const { data: oc } = await supabase.from('outreach_contacts')
      .select('broker_track, company').eq('email', leadEmail).maybeSingle();
    if (oc?.broker_track) {
      const co = (oc.company || pic.identity?.company || '').toLowerCase();
      let firm = null;
      if (co) {
        const { data: firms } = await supabase.from('crm_target_firms')
          .select('display_name, tier, track, priority_rank, nyc_presence, why');
        for (const f of (firms || [])) {
          const fc = f.display_name.toLowerCase();
          if (co === fc || co.includes(fc) || fc.includes(co)) { firm = f; break; }
        }
      }
      brokerCtx = {
        track: oc.broker_track,                    // 'broker' | 'carrier_hec'
        firm_tier: firm?.tier || null,
        firm_why: firm?.why || null,
        firm_nyc: firm?.nyc_presence || null,
      };
    }
  } catch { /* non-fatal — falls back to non-broker mode */ }

  // Fire the background function — AWAIT so the dispatch reaches it before
  // we return to Pro (same fix as the digest button's interactivity path).
  const host = process.env.URL || 'https://proposals.getshortcut.co';
  try {
    await fetch(`${host}/.netlify/functions/slack-draft-async-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repEmail: acct.email,
        leadEmail,
        threadId: firstOutreach ? null : latestSendThreadId,
        firstOutreach,
        label,
        slackChannel: channel,
        placeholderTs: placeholder.ts,
        // Pass-through: the rep's own instructions about what the email should
        // do, plus any specific proposals / signup links Pro found and wants
        // the draft to reference. The background function weaves these into
        // the LLM prompt as primary guidance.
        instructions: (params.instructions || '').toString().trim() || null,
        proposalIds: Array.isArray(params.proposalIds) ? params.proposalIds.slice(0, 5) : null,
        signupUrls: Array.isArray(params.signupUrls) ? params.signupUrls.slice(0, 5) : null,
        // BROKER GTM context (auto-detected from outreach_contacts above) —
        // flips the prompt out of Workhuman-personal-note mode into the
        // wellness-fund / broker pitch. brokerCtx is null for non-broker leads.
        brokerCtx,
      }),
    });
  } catch (e) {
    return { error: `Background dispatch failed: ${e.message}` };
  }

  return {
    success: true,
    recipient_email: leadEmail,
    recipient_label: label,
    mode: firstOutreach ? 'first_outreach' : 'follow_up',
    message: `Drafting a ${firstOutreach ? 'cold open' : 'follow-up'} to ${label}. The preview will land in your DM in ~10s with Send / Show angles / Edit in browser / Cancel buttons.`,
  };
}

// ============================================================
// edit_draft — revise the most recent draft in place.
// Same async pattern as draft_email but with a different background mode.
// The rep iterates ("make it shorter", "drop the X line"); the LLM rewrites
// the subject + body; the saved_drafts row updates; chat.update swaps the
// preview message in place so the conversation stays clean.
// ============================================================

async function handleEditDraft(params, supabase, userId, slackContext) {
  const editInstructions = (params.editInstructions || '').toString().trim();
  if (!editInstructions) return { error: 'edit_draft needs editInstructions (the rep\'s change request).' };

  // Resolve which draft to edit:
  //   1. If params.email is set, narrow to that recipient
  //   2. Else if name+company is set, resolve via lead-picture, then narrow
  //   3. Else: most recent draft for this user, period
  let recipientFilter = (params.email || '').toString().trim().toLowerCase() || null;
  const name = (params.name || '').toString().trim() || null;
  const company = (params.company || '').toString().trim() || null;
  if (!recipientFilter && (name || company)) {
    const pic = await leadPicture(supabase, { name, company });
    recipientFilter = pic.identity?.email || null;
  }

  let q = supabase.from('saved_drafts')
    .select('id, recipient_email, subject, body, target_ref, source_company, source_contact')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(5);
  if (recipientFilter) q = q.eq('recipient_email', recipientFilter);
  const { data: recents, error: lookupErr } = await q;
  if (lookupErr) return { error: `Could not find your recent drafts: ${lookupErr.message}` };
  if (!recents || recents.length === 0) {
    return { error: recipientFilter
      ? `No recent draft to ${recipientFilter} to edit. Generate one first with draft_email.`
      : 'No recent draft to edit. Generate one first with draft_email.' };
  }

  // If more than one recent draft and the rep didn't disambiguate, ask Pro
  // to clarify (returning an error message Pro can relay).
  if (!recipientFilter && recents.length > 1) {
    const distinct = [...new Set(recents.map((d) => d.recipient_email))].slice(0, 3);
    if (distinct.length > 1) {
      return {
        error: `You have ${distinct.length} recent drafts. Which one? (${distinct.join(', ')}) Pass an explicit recipient email or name to edit_draft.`,
      };
    }
  }
  const draft = recents[0];
  const slackChannel = draft.target_ref?.slack_channel || null;
  const placeholderTs = draft.target_ref?.slack_message_ts || null;
  const repEmail = draft.target_ref?.rep_email || null;
  if (!slackChannel || !placeholderTs) {
    return { error: 'I have the draft but lost track of which Slack message to update. Open in browser or generate a fresh draft.' };
  }
  if (!repEmail) {
    return { error: 'Draft is missing rep_email — generate a fresh draft so I can edit it.' };
  }

  // Post a quick "Editing…" overlay so the rep knows it's in flight.
  const SLACK_API = 'https://slack.com/api';
  const slackPost = async (method, body) => {
    const r = await fetch(`${SLACK_API}/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  };
  await slackPost('chat.update', {
    channel: slackChannel,
    ts: placeholderTs,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `:hourglass_flowing_sand: *Revising the draft…*` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `_${editInstructions.slice(0, 120)}_` }] },
    ],
    text: 'Revising the draft…',
  });

  // Fire the background function with mode=edit.
  const host = process.env.URL || 'https://proposals.getshortcut.co';
  try {
    await fetch(`${host}/.netlify/functions/slack-draft-async-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'edit',
        draftId: draft.id,
        editInstructions,
        repEmail,
        leadEmail: draft.recipient_email,
        label: draft.target_ref?.label || draft.recipient_email,
        slackChannel,
        placeholderTs,
      }),
    });
  } catch (e) {
    return { error: `Background dispatch failed: ${e.message}` };
  }

  return {
    success: true,
    draftId: draft.id,
    recipient_email: draft.recipient_email,
    message: `Revising the draft to ${draft.target_ref?.label || draft.recipient_email}. The updated preview will land in ~5s — same Send / Open in Gmail buttons.`,
  };
}

// ============================================================
// list_broker_queue — the rep's healthcare-broker + carrier-HEC stack.
// Mirrors the /brokers Netlify function but for Slack. Returns a compact
// summary the LLM can recap conversationally ("you have 100 brokers,
// 12 are tier-1 ready, none emailed yet"). Use scope=mine for self,
// scope=team for everyone, plus optional state/tier/track filters.
// ============================================================

async function handleListBrokerQueue(params, supabase, userId) {
  const scope = params.scope === 'team' ? 'team' : 'mine';
  const trackFilter = params.track === 'broker' || params.track === 'carrier_hec' ? params.track : null;
  const stateFilter = ['never_emailed', 'in_cadence', 'replied'].includes(params.state) ? params.state : null;
  const tierFilter = ['tier_1', 'tier_2', 'tier_3'].includes(params.tier) ? params.tier : null;
  const limit = Math.min(Number(params.limit) || 25, 100);

  const { data: acct } = await supabase.from('gmail_accounts')
    .select('email').eq('supabase_user_id', userId).maybeSingle();
  const myEmail = (acct?.email || '').toLowerCase();
  if (!myEmail && scope === 'mine') {
    return { error: 'No Gmail connected for you — can\'t scope to you. Pass scope: "team" or connect Gmail.' };
  }

  let q = supabase.from('outreach_contacts')
    .select('email, name, title, company, broker_track, broker_priority_rank, broker_assigned_to')
    .not('broker_track', 'is', null);
  if (scope === 'mine') q = q.eq('broker_assigned_to', myEmail);
  if (trackFilter) q = q.eq('broker_track', trackFilter);
  q = q.order('broker_priority_rank', { ascending: true }).limit(500);
  const { data: contacts, error: ce } = await q;
  if (ce) return { error: `contacts query failed: ${ce.message}` };

  // Pull firms for tier metadata
  const { data: firms } = await supabase.from('crm_target_firms').select('display_name, tier');
  const firmTier = new Map();
  for (const f of (firms || [])) firmTier.set(f.display_name.toLowerCase(), f.tier);
  const resolveTier = (c) => {
    if (!c) return null;
    const lc = c.toLowerCase();
    if (firmTier.has(lc)) return firmTier.get(lc);
    for (const [name, tier] of firmTier.entries()) if (lc.includes(name) || name.includes(lc)) return tier;
    return null;
  };

  // Pull state: emailed_count, last_sent, replied
  const emails = (contacts || []).map((c) => (c.email || '').toLowerCase()).filter(Boolean);
  const stateByEmail = new Map();
  for (let i = 0; i < emails.length; i += 200) {
    const slice = emails.slice(i, i + 200);
    const [sends, replies] = await Promise.all([
      supabase.from('outreach_sends').select('email, sent_time, reply_time, message_id').in('email', slice),
      supabase.from('outreach_replies').select('email').in('email', slice),
    ]);
    for (const s of (sends.data || [])) {
      const k = (s.email || '').toLowerCase();
      const cur = stateByEmail.get(k) || { msg_ids: new Set(), last_sent: null, replied: false };
      cur.msg_ids.add(s.message_id || `${s.sent_time}`);
      if (s.reply_time) cur.replied = true;
      if (!cur.last_sent || s.sent_time > cur.last_sent) cur.last_sent = s.sent_time;
      stateByEmail.set(k, cur);
    }
    for (const r of (replies.data || [])) {
      const k = (r.email || '').toLowerCase();
      const cur = stateByEmail.get(k) || { msg_ids: new Set(), last_sent: null, replied: false };
      cur.replied = true;
      stateByEmail.set(k, cur);
    }
  }

  // Compose + filter
  const now = Date.now();
  const out = [];
  const summary = { total: 0, never_emailed: 0, in_cadence: 0, replied: 0, by_tier: { tier_1: 0, tier_2: 0, tier_3: 0 } };
  for (const c of (contacts || [])) {
    const tier = resolveTier(c.company);
    const state = stateByEmail.get((c.email || '').toLowerCase());
    const days = state?.last_sent ? Math.floor((now - new Date(state.last_sent).getTime()) / 86400000) : null;
    const computedState = state?.replied ? 'replied' : (state?.last_sent ? 'in_cadence' : 'never_emailed');
    if (tierFilter && tier !== tierFilter) continue;
    if (stateFilter && computedState !== stateFilter) continue;
    summary.total += 1;
    summary[computedState] += 1;
    if (tier && summary.by_tier[tier] !== undefined) summary.by_tier[tier] += 1;
    out.push({
      email: c.email, name: c.name, title: c.title, firm: c.company,
      tier, track: c.broker_track, priority: c.broker_priority_rank,
      emailed_count: state ? state.msg_ids.size : 0,
      days_since: days, replied: !!state?.replied, state: computedState,
    });
  }

  return {
    success: true,
    scope,
    filters: { track: trackFilter, tier: tierFilter, state: stateFilter },
    summary,
    contacts: out.slice(0, limit),
    truncated: out.length > limit,
    total_matching: out.length,
  };
}

// ============================================================
// read_thread — fetch actual email body content from the rep's Gmail.
// lookup_lead returns dates / counts / reply snippets from the DB; this
// returns the prose so Pro can answer "what did I last say?" or draft an
// intelligent follow-up that doesn't restate what's already in the thread.
// ============================================================

async function handleReadThread(params, supabase, userId) {
  const contactEmail = (params.email || '').toString().trim().toLowerCase();
  if (!contactEmail) return { error: 'read_thread needs an email (the contact, not the rep).' };
  const maxMessages = Math.min(10, Math.max(1, Number(params.maxMessages) || 4));

  // Find this rep's Gmail account
  const { data: acct } = await supabase.from('gmail_accounts')
    .select('email').eq('supabase_user_id', userId).maybeSingle();
  if (!acct?.email) {
    return { error: 'Your Gmail is not connected — connect it in the sales-intelligence settings to let me read thread bodies.' };
  }
  const repEmail = acct.email.toLowerCase();

  // Find the most recent send by this rep to this contact (gives us the thread_id)
  const { data: latest } = await supabase.from('outreach_sends')
    .select('thread_id, sent_time, message_id')
    .eq('email', contactEmail).eq('sender_email', repEmail)
    .not('thread_id', 'is', null)
    .order('sent_time', { ascending: false }).limit(1).maybeSingle();
  if (!latest?.thread_id) {
    return {
      success: true, has_thread: false,
      message: `No prior thread on record for ${contactEmail} sent by you. Nothing to read.`,
    };
  }

  // Pull the thread
  let token;
  try { token = await getAccessToken(supabase, repEmail); }
  catch (e) { return { error: `Could not authenticate to Gmail: ${e.message}` }; }

  let thread;
  try { thread = await getThread(token, latest.thread_id); }
  catch (e) { return { error: `Could not fetch Gmail thread: ${e.message}` }; }

  const allMsgs = (thread?.messages || []);
  // Most recent N messages
  const slice = allMsgs.slice(-maxMessages);
  const messages = slice.map((m) => {
    const hs = m.payload?.headers || [];
    const hdr = (n) => hs.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value || null;
    const fromRaw = hdr('From') || '';
    const fromEmail = lcGmail((fromRaw.match(/<([^>]+)>/) || [, fromRaw])[1]);
    const direction = fromEmail === repEmail ? 'sent' : 'received';
    let body = bodyFromPayload(m.payload) || '';
    if (/<\s*(div|p|br|html|body)/i.test(body)) {
      body = body.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n').replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
        .replace(/&#39;|&rsquo;|&apos;/gi, "'").replace(/&quot;/gi, '"');
    }
    // Strip quoted reply tail
    const cut = body.search(/\n?\s*(From:\s|On .+? wrote:|-{2,} ?Original Message|Sent from my )/i);
    if (cut > 0) body = body.slice(0, cut);
    body = body.replace(/\n{3,}/g, '\n\n').trim();
    return {
      direction,
      from: hdr('From'),
      to: hdr('To'),
      subject: hdr('Subject'),
      date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
      snippet: m.snippet || null,
      body: body ? body.slice(0, 4000) : null,
    };
  });

  return {
    success: true,
    has_thread: true,
    thread_id: latest.thread_id,
    contact_email: contactEmail,
    rep_email: repEmail,
    total_messages_in_thread: allMsgs.length,
    messages_returned: messages.length,
    messages,
  };
}

// ============================================================
// Sales Lead Intelligence — shared with the web companion (`/sales-intelligence`).
// Backed by lib/lead-picture.js so Slack and the web surface render the same
// picture and recommend the same actions. Don't add lead-related logic here
// directly — extend lead-picture.js and let both surfaces benefit.
// ============================================================

async function handleLookupLead(params, supabase /* userId unused for read */) {
  const email = (params.email || '').toString().trim().toLowerCase();
  const name = (params.name || '').toString().trim() || null;
  const company = (params.company || '').toString().trim() || null;
  const domain = (params.domain || '').toString().trim().toLowerCase() || null;
  if (!email && !name && !domain && !company) {
    return { error: 'lookup_lead requires email, name, domain, or company' };
  }
  const pic = await leadPicture(supabase, { email, name, domain, company });
  // If we tried to resolve by name+company and got nothing on the workhuman side,
  // tell Pro explicitly so it doesn't claim "no info" — it just couldn't resolve.
  if (!email && !pic.identity?.email && !pic.workhuman) {
    return {
      success: true,
      resolved: false,
      note: `Could not resolve "${name || ''}${name && company ? ' from ' : ''}${company || ''}" to a known lead. Try the email if you have it, or check Workhuman CRM for the exact spelling. The proposals/company info below is matched by company name only.`,
      lead: {
        identity: { email: null, name, company },
        workhuman: null,
        company: pic.company || null,
        preflight: pic.preflight ? { recommendation: pic.preflight.recommendation } : null,
        history: { emailed_count: 0 },
        proposals: pic.proposals || [],
        signups: pic.signups || [],
      },
      next_actions: suggestNextActions(pic),
    };
  }
  // Trim history for Slack response — keep latest 3 sends + latest 3 replies
  const history = pic.history || {};
  const compact = {
    identity: pic.identity,
    workhuman: pic.workhuman ? {
      tier: pic.workhuman.tier,
      assigned_to: pic.workhuman.assigned_to,
      outreach_status: pic.workhuman.outreach_status,
      lead_score: pic.workhuman.lead_score,
      personal_note: pic.workhuman.personal_note,
      personal_note_at: pic.workhuman.personal_note_at,
      personal_note_by: pic.workhuman.personal_note_by,
      // Contact channels — surface so Pro can mention them
      linkedin_url: pic.workhuman.linkedin_url,
      phone: pic.workhuman.phone,
      phone_source: pic.workhuman.phone_source,
      personal_email: pic.workhuman.personal_email,
      // Firmographics
      hq_location: pic.workhuman.hq_location,
      industry: pic.workhuman.industry,
      company_size: pic.workhuman.company_size,
      multi_office: pic.workhuman.multi_office,
      // Landing page
      landing_page_url: pic.workhuman.landing_page_url,
      landing_page_views: pic.workhuman.landing_page_views,
      landing_page_last_viewed: pic.workhuman.landing_page_last_viewed,
      // Booth attendance
      conference_attendee: pic.workhuman.conference_attendee,
      was_waitlisted: pic.workhuman.was_waitlisted,
      vip_slot: pic.workhuman.vip_slot,
      // Multi-channel outreach history (workhuman_dm / linkedin_connect / linkedin_dm / email / sms)
      outreach_log_count: pic.workhuman.outreach_log_count || 0,
      recent_outreach_log: (pic.workhuman.outreach_log || []).slice(0, 5).map((e) => ({
        channel: e.channel, sender: e.sender_name, sent_at: e.sent_at,
        preview: e.message_preview ? String(e.message_preview).slice(0, 200) : null,
      })),
      // Booth massage signups (Workhuman conference)
      booth_signups_count: pic.workhuman.booth_signups_count || 0,
      booth_signups: (pic.workhuman.booth_signups || []).map((s) => ({
        appointment_at: s.appointment_at, day_label: s.day_label, time_slot: s.time_slot,
        service_type: s.service_type, team_status: s.team_status,
      })),
      // Engagement timestamps
      email_sent_at: pic.workhuman.email_sent_at,
      responded_at: pic.workhuman.responded_at,
      meeting_scheduled_at: pic.workhuman.meeting_scheduled_at,
    } : null,
    company: pic.company ? {
      name: pic.company.name, trajectory: pic.company.trajectory,
      activity_status: pic.company.activity_status,
      completed_events: pic.company.completed_events,
      last_event_at: pic.company.last_event_at, months_since_event: pic.company.months_since_event,
      sites_we_serve: pic.company.sites_we_serve, cities: pic.company.cities,
      industry: pic.company.industry, employees: pic.company.employees,
    } : null,
    preflight: pic.preflight ? {
      recommendation: pic.preflight.recommendation,
      suppressed: pic.preflight.suppressed,
      is_client: pic.preflight.is_client,
      contacted: pic.preflight.contacted,
    } : null,
    history: {
      emailed_count: history.emailed_count || 0,
      first_sent: history.first_sent, last_sent: history.last_sent, replied: !!history.replied,
      recent_sends: (history.sends || []).slice(-3).map((s) => ({
        sent_time: s.sent_time, replied: s.replied, touches: s.touches, sender: s.sender_email,
      })),
      recent_replies: (history.replies || []).slice(-3).map((r) => ({
        date: r.date, sentiment: r.sentiment, source: r.source,
        content_preview: r.content ? r.content.slice(0, 400) : null,
      })),
    },
    proposals: (pic.proposals || []).map((p) => ({
      id: p.id, client_name: p.client_name, status: p.status, proposal_type: p.proposal_type,
      created_at: p.created_at, url: `${PROPOSAL_BASE_URL}/${p.id}?shared=true`,
    })),
    signups: pic.signups || [],
  };
  // Always include actionable suggestions so Pro doesn't need a second call
  const actions = suggestNextActions(pic);
  return { success: true, resolved: true, resolution: pic.resolution || (email ? 'email_direct' : null), lead: compact, next_actions: actions };
}

async function handleNextActionsForLead(params, supabase) {
  const email = (params.email || '').toString().trim().toLowerCase();
  if (!email) return { error: 'next_actions_for_lead requires email' };
  const pic = await leadPicture(supabase, { email });
  return { success: true, next_actions: suggestNextActions(pic) };
}

// --- Create Proposal ---

async function handleCreateProposal(params, supabase, userId) {
  if (!params.clientName) return { error: 'clientName is required' };
  if (!params.events || !Array.isArray(params.events) || params.events.length === 0) {
    return { error: 'At least one event is required in the events array' };
  }

  // Build customization defaults from the named-contact + custom-note args
  // so the proposal renders "Hi {first name}" and shows Pro's intro line.
  // Splits contactName into first/last on first whitespace; explicit
  // contactFirstName / contactLastName win if both are passed.
  const contactCustomization = {};
  if (params.contactFirstName || params.contactLastName || params.contactName) {
    const parts = (params.contactName || '').trim().split(/\s+/);
    contactCustomization.contactFirstName = (params.contactFirstName || parts[0] || '').trim();
    contactCustomization.contactLastName = (params.contactLastName || parts.slice(1).join(' ') || '').trim();
  }
  if (params.customNote) contactCustomization.customNote = String(params.customNote).trim();
  // Merge into whatever customization the user passed.
  const paramsWithCustomization = {
    ...params,
    customization: { ...(params.customization || {}), ...contactCustomization },
  };

  const { proposalData, customization, proposalType } = assembleProposal(paramsWithCustomization);

  // Handle logo
  if (params.clientLogoUrl) {
    try {
      const { logoUrl, stored } = await storeProvidedLogo(supabase, params.clientLogoUrl, params.clientName);
      if (stored) proposalData.clientLogoUrl = logoUrl;
    } catch (e) {
      console.warn('Logo storage failed:', e.message);
    }
  }

  const proposalInsert = {
    data: proposalData,
    customization,
    is_editable: true,
    user_id: userId,
    status: 'draft',
    pending_review: false,
    has_changes: false,
    original_data: proposalData,
    client_name: proposalData.clientName.trim(),
    client_email: proposalData.clientEmail || params.clientEmail || null,
    client_logo_url: proposalData.clientLogoUrl || params.clientLogoUrl || null,
    notes: params.notes || 'Created by Pro (Slack assistant)',
    proposal_type: proposalType
  };

  const { data: newProposal, error } = await supabase
    .from('proposals')
    .insert(proposalInsert)
    .select()
    .single();

  if (error) return { error: `Failed to create proposal: ${error.message}` };

  // Build a verified snapshot so Claude can report exact facts.
  // Pass customization separately so customNote / contactFirstName etc.
  // are reflected in verifiedState — otherwise Pro can't tell whether the
  // note actually applied vs got lost in the merge.
  const verifiedState = buildVerifiedState(proposalData, customization);
  // Check logo reachability — Pro must say "logo failed" if the URL 404s,
  // not "logo applied" just because we stored a string.
  if (verifiedState.clientLogoUrl) {
    verifiedState.clientLogoReachable = await checkUrlReachable(verifiedState.clientLogoUrl);
    // Reachable ≠ visible: a white/transparent SVG loads fine but shows blank.
    verifiedState.logoLikelyVisible = await checkLogoVisible(verifiedState.clientLogoUrl);
  }

  return {
    success: true,
    proposalId: newProposal.id,
    url: getProposalShareUrl(newProposal.id, newProposal.slug),
    clientName: proposalData.clientName,
    status: 'draft',
    summary: proposalData.summary,
    eventCount: (proposalData.eventDates || []).length,
    locations: proposalData.locations || [],
    eventDates: proposalData.eventDates || [],
    verifiedState
  };
}

// --- Edit Proposal ---

async function handleEditProposal(params, supabase, userId) {
  if (!params.proposalId) return { error: 'proposalId is required' };
  if (!params.operations || !Array.isArray(params.operations) || params.operations.length === 0) {
    return { error: 'At least one operation is required' };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.proposalId)
    .single();

  if (fetchError || !existing) return { error: `Proposal ${params.proposalId} not found` };

  const proposalRecord = {
    status: existing.status,
    client_name: existing.client_name,
    client_email: existing.client_email,
    client_logo_url: existing.client_logo_url,
    notes: existing.notes
  };

  let updatedData, updatedCustomization, updatedRecord, changesSummary;
  try {
    const result = applyOperations(existing.data, existing.customization || {}, proposalRecord, params.operations);
    updatedData = result.proposalData;
    updatedCustomization = result.customization;
    updatedRecord = result.proposalRecord;
    changesSummary = result.changesSummary;
  } catch (opError) {
    return {
      error: `Edit operation failed: ${opError.message}`,
      proposalId: params.proposalId,
      operationsAttempted: params.operations.map(op => op.op)
    };
  }

  const updatePayload = {
    data: updatedData,
    customization: updatedCustomization,
    updated_at: new Date().toISOString(),
    has_changes: true,
    change_source: 'staff'
  };

  if (updatedRecord.status !== existing.status) updatePayload.status = updatedRecord.status;
  if (updatedRecord.client_name !== existing.client_name) updatePayload.client_name = updatedRecord.client_name;
  if (updatedRecord.client_email !== existing.client_email) updatePayload.client_email = updatedRecord.client_email;
  if (updatedRecord.client_logo_url !== existing.client_logo_url) updatePayload.client_logo_url = updatedRecord.client_logo_url;
  // notes column — driven by set_admin_notes op
  if (Object.prototype.hasOwnProperty.call(updatedRecord, 'notes') && updatedRecord.notes !== existing.notes) {
    updatePayload.notes = updatedRecord.notes;
  }

  const { error: updateError } = await supabase
    .from('proposals')
    .update(updatePayload)
    .eq('id', params.proposalId);

  if (updateError) return { error: `Failed to save proposal to database: ${updateError.message}` };

  // --- Auto-verification: re-fetch the proposal to confirm the edits were persisted ---
  const verifiedState = buildVerifiedState(updatedData, updatedCustomization);
  if (verifiedState.clientLogoUrl) {
    verifiedState.clientLogoReachable = await checkUrlReachable(verifiedState.clientLogoUrl);
    // Reachable ≠ visible: a white/transparent SVG loads fine but shows blank.
    verifiedState.logoLikelyVisible = await checkLogoVisible(verifiedState.clientLogoUrl);
  }

  return {
    success: true,
    proposalId: params.proposalId,
    url: getProposalShareUrl(params.proposalId, existing.slug),
    clientName: updatedData.clientName,
    status: updatedRecord.status,
    summary: updatedData.summary,
    changesSummary,
    verifiedState
  };
}

// --- Search Proposals ---

async function handleSearchProposals(params, supabase) {
  if (!params.searchTerm) return { error: 'searchTerm is required' };

  const { results } = await searchProposals(supabase, params.searchTerm);
  return { success: true, results, resultCount: results.length };
}

// --- Get Proposal ---

async function handleGetProposal(params, supabase) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.proposalId)
    .single();

  if (error || !proposal) return { error: `Proposal ${params.proposalId} not found` };

  // Include both raw data and a clean verified summary. proposal.customization
  // is the top-level jsonb column (where customNote lives) — pass it through
  // so Pro can see what the proposal-viewer will actually render.
  const verifiedState = buildVerifiedState(proposal.data, proposal.customization);
  if (verifiedState.clientLogoUrl) {
    verifiedState.clientLogoReachable = await checkUrlReachable(verifiedState.clientLogoUrl);
    // Reachable ≠ visible: a white/transparent SVG loads fine but shows blank.
    verifiedState.logoLikelyVisible = await checkLogoVisible(verifiedState.clientLogoUrl);
  }

  return {
    success: true,
    proposalId: proposal.id,
    url: getProposalShareUrl(proposal.id, proposal.slug),
    clientName: proposal.client_name,
    clientEmail: proposal.client_email,
    status: proposal.status,
    createdAt: proposal.created_at,
    data: proposal.data,
    customization: proposal.customization,
    verifiedState
  };
}

// --- Calculate Pricing ---

async function handleCalculatePricing(params) {
  if (!params.serviceType) return { error: 'serviceType is required' };
  if (params.targetAppointments === undefined) return { error: 'targetAppointments is required' };

  const result = calculateEventOptions(params.serviceType, params.targetAppointments, params.overrides);
  return result;
}

// --- Lookup Client ---

async function handleLookupClient(params, supabase) {
  if (!params.clientName) return { error: 'clientName is required' };

  // Try exact match first
  const exactResult = await getClientByName(supabase, params.clientName);
  if (exactResult.found) {
    return { success: true, found: true, client: exactResult.client };
  }

  // Fall back to partial search
  const searchResult = await searchClients(supabase, params.clientName);
  if (searchResult.found && searchResult.results.length > 0) {
    return {
      success: true,
      found: true,
      client: searchResult.results[0],
      alternateMatches: searchResult.results.slice(1)
    };
  }

  // Not found — try to find a logo via Brave Search + Clearbit
  let suggestedLogoUrl = null;
  let logoSource = null;
  try {
    const logoResult = await searchLogoViaBrave(params.clientName);
    if (logoResult.logoUrl) {
      // Store it permanently
      const { logoUrl, stored } = await storeProvidedLogo(supabase, logoResult.logoUrl, params.clientName);
      suggestedLogoUrl = logoUrl;
      logoSource = logoResult.source;
    }
  } catch (e) { /* best-effort */ }

  return {
    success: true,
    found: false,
    client: { name: params.clientName, suggestedLogoUrl, logoSource }
  };
}

// --- Search Logo ---

/**
 * Verify a logo URL is actually accessible (not a 404).
 */
async function verifyLogoUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') || '';
    return contentType.startsWith('image/') || contentType.includes('octet-stream');
  } catch {
    return false;
  }
}

async function handleSearchLogo(params, supabase) {
  if (!params.companyName) return { error: 'companyName is required' };

  const searchName = params.companyName.trim();

  // Step 1: Check existing proposals — try exact match first, then partial
  let existingMatch = null;

  // 1a: Exact match
  const { data: exactProposals } = await supabase
    .from('proposals')
    .select('client_name, client_logo_url')
    .ilike('client_name', searchName)
    .not('client_logo_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (exactProposals && exactProposals.length > 0) {
    for (const p of exactProposals) {
      if (p.client_logo_url && await verifyLogoUrl(p.client_logo_url)) {
        existingMatch = { logoUrl: p.client_logo_url, clientName: p.client_name };
        break;
      }
    }
  }

  // 1b: Partial match — catches abbreviations like "BCG" matching "Boston Consulting Group"
  if (!existingMatch) {
    const { data: partialProposals } = await supabase
      .from('proposals')
      .select('client_name, client_logo_url')
      .ilike('client_name', `%${searchName}%`)
      .not('client_logo_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (partialProposals && partialProposals.length > 0) {
      // Group by client name and find the one with the most proposals (most likely match)
      const nameCounts = {};
      for (const p of partialProposals) {
        const name = p.client_name.trim();
        if (!nameCounts[name]) nameCounts[name] = { count: 0, logoUrl: null };
        nameCounts[name].count++;
        if (!nameCounts[name].logoUrl && p.client_logo_url) {
          nameCounts[name].logoUrl = p.client_logo_url;
        }
      }

      // Pick the client with the most proposals
      const sorted = Object.entries(nameCounts).sort((a, b) => b[1].count - a[1].count);
      for (const [name, data] of sorted) {
        if (data.logoUrl && await verifyLogoUrl(data.logoUrl)) {
          existingMatch = { logoUrl: data.logoUrl, clientName: name };
          break;
        }
      }

      // If multiple distinct clients matched, include them all for the AI to report
      if (sorted.length > 1 && existingMatch) {
        const alternateMatches = sorted
          .filter(([name]) => name !== existingMatch.clientName)
          .map(([name, data]) => ({ name, proposalCount: data.count, hasLogo: !!data.logoUrl }));
        if (alternateMatches.length > 0) {
          return {
            success: true,
            logoUrl: existingMatch.logoUrl,
            source: 'existing_proposal',
            stored: true,
            resolvedName: existingMatch.clientName,
            alternateMatches,
            message: `Found existing logo for "${existingMatch.clientName}" from a previous proposal. Also found other matches: ${alternateMatches.map(m => m.name).join(', ')}.`
          };
        }
      }
    }
  }

  if (existingMatch) {
    return {
      success: true,
      logoUrl: existingMatch.logoUrl,
      source: 'existing_proposal',
      stored: true,
      resolvedName: existingMatch.clientName,
      message: `Found existing logo for "${existingMatch.clientName}" from a previous proposal.`
    };
  }

  // Step 2: Search via Brave (with Clearbit fallback) — pass domain if provided
  const searchResult = await searchLogoViaBrave(searchName, params.domain);

  if (!searchResult.logoUrl) {
    return {
      success: true,
      logoUrl: null,
      source: null,
      message: searchResult.message || `No logo found for "${searchName}". The user can provide a direct image URL instead.`
    };
  }

  // Step 3: Store the logo permanently in Supabase
  try {
    const { logoUrl, stored } = await storeProvidedLogo(supabase, searchResult.logoUrl, searchName);
    return {
      success: true,
      logoUrl,
      source: searchResult.source,
      stored,
      message: stored
        ? `Found and stored logo for "${searchName}".`
        : `Found logo for "${searchName}" but could not store permanently.`
    };
  } catch (e) {
    // Return the external URL as fallback
    return {
      success: true,
      logoUrl: searchResult.logoUrl,
      source: searchResult.source,
      stored: false,
      message: `Found logo but storage failed: ${e.message}`
    };
  }
}

// --- Duplicate Proposal ---

async function handleDuplicateProposal(params, supabase, userId) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const { proposal, url } = await duplicateProposal(supabase, params.proposalId, userId, {
    newTitle: params.newTitle,
    notes: params.notes
  });

  return {
    success: true,
    proposalId: proposal.id,
    url,
    clientName: proposal.client_name,
    duplicatedFrom: params.proposalId
  };
}

// --- Create Option ---

async function handleCreateOption(params, supabase, userId) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const result = await createOption(supabase, params.proposalId, userId, {
    optionName: params.optionName
  });

  return {
    success: true,
    newProposalId: result.newProposal.id,
    url: result.url,
    optionName: result.newProposal.option_name,
    groupId: result.groupId,
    optionCount: result.optionCount
  };
}

// --- Link Proposals ---

async function handleLinkProposals(params, supabase) {
  if (!params.sourceProposalId) return { error: 'sourceProposalId is required' };
  if (!params.proposalIds || !Array.isArray(params.proposalIds)) return { error: 'proposalIds array is required' };

  const result = await linkProposals(supabase, params.sourceProposalId, params.proposalIds);
  return { success: true, groupId: result.groupId, linkedCount: result.linkedCount, options: result.options };
}

// --- Unlink Proposal ---

async function handleUnlinkProposal(params, supabase) {
  if (!params.proposalId) return { error: 'proposalId is required' };

  const result = await unlinkProposal(supabase, params.proposalId);
  return { success: true, unlinked: result.unlinked, remainingOptions: result.remainingOptions };
}

// --- Rename a linked proposal option (mirrors admin viewer's handleUpdateOptionName) ---

async function handleRenameOption(params, supabase) {
  if (!params.proposalId) return { error: 'proposalId is required' };
  if (!params.newName || typeof params.newName !== 'string') return { error: 'newName is required (the new option label, e.g. "Premium")' };
  try {
    const { updated } = await renameOption(supabase, params.proposalId, params.newName);
    return {
      success: true,
      proposalId: updated.id,
      option_name: updated.option_name,
      option_order: updated.option_order,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// --- Reorder a linked proposal option (mirrors admin viewer's handleReorderOption) ---

async function handleReorderOption(params, supabase) {
  if (!params.proposalId) return { error: 'proposalId is required' };
  if (typeof params.newOrder !== 'number' || params.newOrder < 1) {
    return { error: 'newOrder must be a positive integer (1-based position in the option group)' };
  }
  try {
    const { updated } = await reorderOption(supabase, params.proposalId, params.newOrder);
    return {
      success: true,
      proposalId: updated.id,
      option_name: updated.option_name,
      option_order: updated.option_order,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// --- Create Landing Page ---

async function handleCreateLandingPage(params, supabase, userId) {
  if (!params.partnerName) return { error: 'partnerName is required' };

  // Auto-search for a logo if none provided
  let logoUrl = params.partnerLogoUrl || null;
  let logoSource = null;
  if (!logoUrl) {
    try {
      // Check existing proposals first
      const { data: existingProposals } = await supabase
        .from('proposals')
        .select('client_logo_url')
        .ilike('client_name', params.partnerName.trim())
        .not('client_logo_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingProposals && existingProposals.length > 0 && existingProposals[0].client_logo_url) {
        const isValid = await verifyLogoUrl(existingProposals[0].client_logo_url);
        if (isValid) {
          logoUrl = existingProposals[0].client_logo_url;
          logoSource = 'existing_proposal';
        }
      }

      // If no existing logo, search via Brave/Clearbit
      if (!logoUrl) {
        const searchResult = await searchLogoViaBrave(params.partnerName);
        if (searchResult.logoUrl) {
          const { logoUrl: storedUrl, stored } = await storeProvidedLogo(supabase, searchResult.logoUrl, params.partnerName);
          logoUrl = storedUrl;
          logoSource = searchResult.source;
        }
      }
    } catch (e) {
      console.warn('Auto logo search for landing page failed:', e.message);
    }

    if (logoUrl) {
      params.partnerLogoUrl = logoUrl;
    }
  }

  const result = await createLandingPage(supabase, userId, params);
  return {
    success: true,
    pageId: result.page.id,
    url: result.url,
    partnerName: params.partnerName,
    uniqueToken: result.uniqueToken,
    logoApplied: !!logoUrl,
    logoUrl: logoUrl || null,
    logoSource
  };
}

// --- Get Landing Page ---

async function handleGetLandingPage(params, supabase) {
  if (!params.pageId) return { error: 'pageId is required' };

  const result = await getLandingPage(supabase, params.pageId);
  return {
    success: true,
    pageId: result.page.id,
    url: result.url,
    data: result.page.data,
    customization: result.page.customization,
    status: result.page.status
  };
}

// --- QR Code Sign Tools ---

const QR_SIGN_BASE_URL = 'https://proposals.getshortcut.co/qr-code-sign';

function generateUniqueToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function handleCreateQRCodeSign(params, supabase, userId) {
  if (!params.title) return { error: 'title is required' };
  if (!params.serviceTypes || !Array.isArray(params.serviceTypes) || params.serviceTypes.length === 0) {
    return { error: 'serviceTypes is required (array of 1-3 service types)' };
  }
  if (!params.qrCodeUrl) return { error: 'qrCodeUrl is required' };

  let partnerName = params.partnerName || null;
  let partnerLogoUrl = params.partnerLogoUrl || null;
  let serviceTypes = params.serviceTypes;

  // If proposalId provided, fetch proposal to auto-fill missing fields
  if (params.proposalId) {
    try {
      const { data: proposal } = await supabase
        .from('proposals')
        .select('data')
        .eq('id', params.proposalId)
        .single();

      if (proposal?.data) {
        if (!partnerName) partnerName = proposal.data.clientName || null;
        if (!partnerLogoUrl) partnerLogoUrl = proposal.data.clientLogoUrl || null;
      }
    } catch (e) {
      console.warn('Failed to fetch linked proposal:', e.message);
    }
  }

  // Auto-search for logo if we have a partner name but no logo
  if (partnerName && !partnerLogoUrl) {
    try {
      const { data: existingProposals } = await supabase
        .from('proposals')
        .select('client_logo_url')
        .ilike('client_name', partnerName.trim())
        .not('client_logo_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingProposals?.[0]?.client_logo_url) {
        partnerLogoUrl = existingProposals[0].client_logo_url;
      }
    } catch (e) {
      console.warn('Auto logo search for QR sign failed:', e.message);
    }
  }

  const uniqueToken = generateUniqueToken();
  const now = new Date().toISOString();

  const signData = {
    data: {
      title: params.title.trim(),
      eventDetails: params.eventDetails || '',
      qrCodeUrl: params.qrCodeUrl.trim(),
      serviceType: serviceTypes[0],
      serviceTypes,
      proposalId: params.proposalId || null,
      partnerName,
      partnerLogoUrl,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    customization: {},
    is_editable: true,
    user_id: userId,
    status: 'published',
    unique_token: uniqueToken,
    custom_url: null
  };

  const { data: created, error } = await supabase
    .from('qr_code_signs')
    .insert(signData)
    .select()
    .single();

  if (error) return { error: `Failed to create QR code sign: ${error.message}` };

  const url = `${QR_SIGN_BASE_URL}/${uniqueToken}`;

  return {
    success: true,
    signId: created.id,
    url,
    title: params.title.trim(),
    serviceTypes,
    partnerName,
    logoApplied: !!partnerLogoUrl,
    uniqueToken
  };
}

async function handleGetQRCodeSign(params, supabase) {
  if (!params.signId) return { error: 'signId is required' };

  // Try UUID first
  let { data: sign, error } = await supabase
    .from('qr_code_signs')
    .select('*')
    .eq('id', params.signId)
    .single();

  // Fall back to unique_token
  if (!sign) {
    ({ data: sign, error } = await supabase
      .from('qr_code_signs')
      .select('*')
      .eq('unique_token', params.signId)
      .single());
  }

  if (!sign) return { error: 'QR code sign not found' };

  return {
    success: true,
    signId: sign.id,
    url: `${QR_SIGN_BASE_URL}/${sign.unique_token}`,
    title: sign.data.title,
    serviceTypes: sign.data.serviceTypes || [sign.data.serviceType],
    eventDetails: sign.data.eventDetails,
    qrCodeUrl: sign.data.qrCodeUrl,
    partnerName: sign.data.partnerName,
    partnerLogoUrl: sign.data.partnerLogoUrl,
    proposalId: sign.data.proposalId,
    status: sign.status,
    createdAt: sign.created_at
  };
}

async function handleListQRCodeSigns(params, supabase) {
  const limit = params?.limit || 10;

  let query = supabase
    .from('qr_code_signs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (params?.searchTerm) {
    const term = `%${params.searchTerm}%`;
    query = query.or(`data->>title.ilike.${term},data->>partnerName.ilike.${term}`);
  }

  const { data: signs, error } = await query;

  if (error) return { error: `Failed to list QR code signs: ${error.message}` };

  return {
    success: true,
    count: signs.length,
    signs: signs.map(sign => ({
      signId: sign.id,
      url: `${QR_SIGN_BASE_URL}/${sign.unique_token}`,
      title: sign.data.title,
      serviceTypes: sign.data.serviceTypes || [sign.data.serviceType],
      partnerName: sign.data.partnerName || null,
      status: sign.status,
      createdAt: sign.created_at
    }))
  };
}

async function handleEditQRCodeSign(params, supabase) {
  if (!params.signId) return { error: 'signId is required' };

  // Fetch existing sign
  const { data: existing, error: fetchError } = await supabase
    .from('qr_code_signs')
    .select('*')
    .eq('id', params.signId)
    .single();

  if (!existing) return { error: 'QR code sign not found' };

  // Merge updates into existing data
  const updatedData = { ...existing.data };
  if (params.title) updatedData.title = params.title.trim();
  if (params.eventDetails !== undefined) updatedData.eventDetails = params.eventDetails;
  if (params.qrCodeUrl) updatedData.qrCodeUrl = params.qrCodeUrl.trim();
  if (params.serviceTypes) {
    updatedData.serviceTypes = params.serviceTypes;
    updatedData.serviceType = params.serviceTypes[0];
  }
  if (params.partnerName !== undefined) updatedData.partnerName = params.partnerName;
  if (params.partnerLogoUrl !== undefined) updatedData.partnerLogoUrl = params.partnerLogoUrl;
  updatedData.updatedAt = new Date().toISOString();

  const updatePayload = {
    data: updatedData,
    updated_at: new Date().toISOString()
  };
  if (params.status) updatePayload.status = params.status;

  const { data: updated, error: updateError } = await supabase
    .from('qr_code_signs')
    .update(updatePayload)
    .eq('id', params.signId)
    .select()
    .single();

  if (updateError) return { error: `Failed to update QR code sign: ${updateError.message}` };

  return {
    success: true,
    signId: updated.id,
    url: `${QR_SIGN_BASE_URL}/${updated.unique_token}`,
    title: updated.data.title,
    serviceTypes: updated.data.serviceTypes || [updated.data.serviceType],
    partnerName: updated.data.partnerName,
    status: updated.status
  };
}

// --- Verification Helper ---

/**
 * Build a concise verified state snapshot of a proposal's data.
 * This gives Claude ground-truth information to report, preventing hallucination.
 * Includes: all services with their types, locations, dates, hours, pros, costs.
 */

// --- Invoice Tools ---

async function handleCreateInvoice(params, supabase, userId) {
  if (!params.clientEmail) return { error: 'clientEmail is required' };
  if (!params.lineItems || !Array.isArray(params.lineItems) || params.lineItems.length === 0) {
    return { error: 'lineItems array is required and must not be empty' };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { error: 'Stripe not configured on server' };

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

  // Resolve client name — from params or from linked proposal
  let clientName = params.clientName;
  if (!clientName && params.proposalId) {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('client_name')
      .eq('id', params.proposalId)
      .single();
    clientName = proposal?.client_name;
  }
  if (!clientName) clientName = 'Unknown';

  // Create Stripe customer
  const customer = await stripe.customers.create({
    name: clientName,
    email: params.clientEmail,
    metadata: { proposalId: params.proposalId || 'standalone' }
  });

  // Create invoice
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: params.daysUntilDue || 30,
    metadata: { proposalId: params.proposalId || 'standalone' }
  });

  // Add line items
  let totalCents = 0;
  for (const item of params.lineItems) {
    const amountCents = Math.round((item.amount || 0) * 100);
    totalCents += amountCents;
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      description: item.description || 'Line item',
      amount: amountCents,
      currency: 'usd'
    });
  }

  // Finalize and send
  const sentInvoice = await stripe.invoices.sendInvoice(invoice.id);

  // Save to DB
  const { error: insertError } = await supabase
    .from('stripe_invoices')
    .insert({
      proposal_id: params.proposalId || null,
      stripe_invoice_id: sentInvoice.id,
      stripe_customer_id: customer.id,
      invoice_url: sentInvoice.hosted_invoice_url,
      status: sentInvoice.status || 'sent',
      amount_cents: totalCents,
      client_name: clientName,
      created_by_user_id: userId
    });

  if (insertError) {
    console.error('Failed to save invoice record:', insertError);
  }

  // Link to proposal if applicable
  if (params.proposalId) {
    await supabase
      .from('proposals')
      .update({ stripe_invoice_id: sentInvoice.id })
      .eq('id', params.proposalId);
  }

  // Send Slack notification
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL_PROPOSALS;
  if (slackWebhookUrl) {
    const amount = `$${(totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fields = [
      { type: 'mrkdwn', text: `*Client:* ${clientName}` },
      { type: 'mrkdwn', text: `*Email:* ${params.clientEmail}` },
      { type: 'mrkdwn', text: `*Amount:* ${amount}` },
      { type: 'mrkdwn', text: `*Invoice:* <${sentInvoice.hosted_invoice_url}|View Invoice>` }
    ];
    if (params.proposalId) {
      fields.push({ type: 'mrkdwn', text: `*Proposal:* <https://proposals.getshortcut.co/proposal/${params.proposalId}|View Proposal>` });
    }
    try {
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `💳 Invoice Sent via Pro: ${clientName}`,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: '💳 Invoice Sent' } },
            { type: 'section', fields }
          ]
        })
      });
    } catch (err) {
      console.error('Slack notification failed (non-fatal):', err.message);
    }
  }

  return {
    success: true,
    invoiceId: sentInvoice.id,
    invoiceUrl: sentInvoice.hosted_invoice_url,
    amountDollars: totalCents / 100,
    clientName,
    clientEmail: params.clientEmail,
    status: sentInvoice.status || 'sent',
    proposalId: params.proposalId || null
  };
}

async function handleSearchInvoices(params, supabase) {
  let query = supabase
    .from('stripe_invoices')
    .select('id, stripe_invoice_id, client_name, status, amount_cents, invoice_url, proposal_id, created_at');

  if (params.clientName) {
    query = query.ilike('client_name', `%${params.clientName.trim()}%`);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.proposalId) {
    query = query.eq('proposal_id', params.proposalId);
  }

  query = query.order('created_at', { ascending: false }).limit(params.limit || 10);

  const { data: invoices, error } = await query;

  if (error) return { error: `Database query failed: ${error.message}` };

  const results = (invoices || []).map(inv => ({
    id: inv.id,
    stripeInvoiceId: inv.stripe_invoice_id,
    clientName: inv.client_name,
    status: inv.status,
    amountDollars: (inv.amount_cents || 0) / 100,
    invoiceUrl: inv.invoice_url,
    proposalId: inv.proposal_id,
    createdAt: inv.created_at
  }));

  return { success: true, results, resultCount: results.length };
}

async function handleGetInvoice(params, supabase) {
  if (!params.invoiceId) return { error: 'invoiceId is required' };

  const isStripeId = params.invoiceId.startsWith('in_');
  const column = isStripeId ? 'stripe_invoice_id' : 'id';

  const { data: invoice, error } = await supabase
    .from('stripe_invoices')
    .select('*')
    .eq(column, params.invoiceId)
    .single();

  if (error || !invoice) return { error: `Invoice ${params.invoiceId} not found` };

  // Fetch linked proposal name if available
  let proposalName = null;
  if (invoice.proposal_id) {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('client_name, status')
      .eq('id', invoice.proposal_id)
      .single();
    if (proposal) {
      proposalName = proposal.client_name;
    }
  }

  return {
    success: true,
    id: invoice.id,
    stripeInvoiceId: invoice.stripe_invoice_id,
    clientName: invoice.client_name,
    status: invoice.status,
    amountDollars: (invoice.amount_cents || 0) / 100,
    invoiceUrl: invoice.invoice_url,
    proposalId: invoice.proposal_id,
    proposalName,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at
  };
}

// --- Verified State ---

// HEAD-fetch a URL with a short timeout, return true if 2xx/3xx, false on
// any error / timeout / 4xx-5xx. Used to confirm logo URLs actually serve
// an image before Pro claims "logo applied". Best-effort: if the host
// blocks HEAD or times out, we return false rather than guessing — Pro
// should tell the rep "couldn't verify" instead of claiming success.
async function checkUrlReachable(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const r = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    if (r.ok) return true;
    // Some hosts (S3 pre-signed, certain CDNs) reject HEAD. Try GET as fallback.
    if (r.status === 405 || r.status === 403) {
      const controller2 = new AbortController();
      const t2 = setTimeout(() => controller2.abort(), 4000);
      const g = await fetch(url, { method: 'GET', signal: controller2.signal });
      clearTimeout(t2);
      return g.ok;
    }
    return false;
  } catch { return false; }
}

/**
 * Stronger than reachability: would this logo actually be VISIBLE on the
 * proposal's light nav background? A white/transparent SVG passes
 * checkUrlReachable (200 OK) but renders blank. For SVGs we inspect the markup;
 * raster formats we trust if reachable (can't decode pixels in-function).
 * Returns true (visible), false (likely blank), or null (couldn't determine).
 */
async function checkLogoVisible(url) {
  if (!url || typeof url !== 'string') return null;
  const isSvg = url.toLowerCase().split('?')[0].endsWith('.svg');
  if (!isSvg) return true; // raster: assume visible if it loads
  const svgText = await fetchSvgText(url);
  if (!svgText) return null; // couldn't fetch the markup — unknown
  return !svgLikelyInvisibleOnLight(svgText);
}

function buildVerifiedState(proposalData, customization) {
  const services = [];
  const locations = proposalData.locations || [];

  for (const location of locations) {
    const locationData = proposalData.services[location];
    if (!locationData) continue;

    for (const [date, dateData] of Object.entries(locationData)) {
      if (!dateData.services) continue;
      for (let i = 0; i < dateData.services.length; i++) {
        const svc = dateData.services[i];
        const entry = {
          index: i,
          serviceType: svc.serviceType,
          location,
          date,
          totalHours: svc.totalHours,
          numPros: svc.numPros,
          totalAppointments: svc.totalAppointments,
          serviceCost: svc.serviceCost
        };
        if (svc.isRecurring && svc.recurringFrequency) {
          entry.recurring = `${svc.recurringFrequency.type} (${svc.recurringFrequency.occurrences} events)`;
        }
        if (svc.discountPercent) {
          entry.discountPercent = svc.discountPercent;
        }
        services.push(entry);
      }
    }
  }

  const state = {
    clientName: proposalData.clientName,
    clientLogoUrl: proposalData.clientLogoUrl || null,
    locations,
    officeLocations: proposalData.officeLocations || {},
    serviceCount: services.length,
    services,
    grandTotal: proposalData.summary?.grandTotal ?? null,
    totalAppointments: proposalData.summary?.totalAppointments ?? null,
    eventDates: proposalData.eventDates || [],
    // Customization fields that Pro MUST verify before claiming success.
    // Without these in verifiedState, Pro had no way to know whether a
    // customNote it passed actually made it through, and would happily
    // report "Note added" when it was lost in the merge.
    // Customization fields Pro MUST verify before claiming success.
    customization: {
      customNote: customization?.customNote
        || proposalData.customization?.customNote
        || null,
      contactFirstName: customization?.contactFirstName
        || proposalData.customization?.contactFirstName
        || null,
      contactLastName: customization?.contactLastName
        || proposalData.customization?.contactLastName
        || null,
    },
  };

  // Include CLE state if set
  if (proposalData.cleState) {
    state.cleState = proposalData.cleState;
  }

  // Include gratuity info if set
  if (proposalData.gratuityType && proposalData.gratuityValue) {
    state.gratuity = {
      type: proposalData.gratuityType,
      value: proposalData.gratuityValue,
      amount: proposalData.summary?.gratuityAmount ?? null
    };
  }

  return state;
}

export { executeTool, TOOL_HANDLERS };
