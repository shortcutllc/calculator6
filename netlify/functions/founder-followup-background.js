/**
 * founder-followup-background.js — AUTO-SENT follow-up touches for the founder
 * personal lane (Will's explicit decision 2026-07-07: auto-send from will@,
 * 4-touch cold cadence). Mirrors the cold engine's cadence + role structure:
 *   E1 (day 0)  = the note Will sent by hand (the founder queue).
 *   E2 (day +3) = value bump         } auto-sent in-thread by THIS function,
 *   E3 (day +4) = differentiation+link}  gated by the shared compose engine,
 *   E4 (day +5) = graceful breakup   }  from will@'s real Gmail.
 *
 * THE HARD STOP (load-bearing): before EVERY send it does a LIVE Gmail thread
 * check — if anyone other than will@ has posted in the thread (i.e. the prospect
 * replied), or the row bounced, or the address is suppressed, the whole sequence
 * halts and nothing sends. This is what keeps auto-send from firing "just
 * following up" at someone who already answered (the one thing that burns a
 * personal domain). It is stricter than the daily crawl because it reads the
 * thread in real time.
 *
 * Sequence STATE lives on the E1's saved_drafts.target_ref.sequence (no new
 * table). outreach_sends (populated by gmail-sent-crawl) supplies the E1
 * thread_id / sent_time / reply_time / is_bounced.
 *
 * POST body: { confirm?:false, max?:15, only?:'email', touch?:2|3|4 }
 *   confirm=false (default) = DRY: computes + composes but SENDS NOTHING and
 *   writes no state. confirm=true = live auto-send. touch forces a specific
 *   touch number (testing copy without waiting for the cadence date).
 * Env: SUPABASE_*, ANTHROPIC_API_KEY, PRO_SLACK_BOT_TOKEN, FOUNDER_BOOK_A_CALL_URL?
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { getAccessToken, sendEmail, getThread, getMessageHeaders, lc } from './lib/gmail.js';
import { composeFollowup, FOLLOWUP_CADENCE } from './lib/founder-note.js';

const SLACK_API = 'https://slack.com/api';
const WILL = 'will@getshortcut.co';
const DEFAULT_MAX = 15;   // per-run cap on auto-sends (founder-lane daily ceiling)
const BOOK_A_CALL_URL = process.env.FOUNDER_BOOK_A_CALL_URL || null; // E3 link; off by default

const FOUNDER_MIN_SIG_HTML = [
  '<div dir="ltr" style="font-family:Outfit,sans-serif;font-size:11pt;color:rgb(0,0,0)">',
  'Will Newton<br>',
  'Founder, <b>Shortcut</b><br>',
  '<a href="https://www.getshortcut.co" target="_blank">getshortcut.co</a><br>',
  '(215) 218-8088',
  '</div>',
].join('');

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

const DAY_MS = 86400000;
const daysBetween = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS;

// LIVE reply/halt check: read the Gmail thread; any message From someone other
// than will@ means the prospect (or anyone) engaged -> halt. Fail CLOSED: if the
// thread can't be read, treat as "cannot confirm silence" and DO NOT send.
async function threadIsSilent(token, threadId) {
  const t = await getThread(token, threadId).catch(() => null);
  if (!t || !Array.isArray(t.messages)) return { silent: false, reason: 'thread_unreadable' };
  for (const m of t.messages) {
    const from = lc((m.payload?.headers || []).find((h) => h.name?.toLowerCase() === 'from')?.value || '');
    if (from && !from.includes(WILL)) return { silent: false, reason: `inbound from ${from.slice(0, 40)}` };
  }
  return { silent: true, reason: null };
}

export const handler = async (event) => {
  if (!process.env.PRO_SLACK_BOT_TOKEN) return { statusCode: 500, body: 'misconfigured (PRO_SLACK_BOT_TOKEN)' };
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 500, body: 'misconfigured (ANTHROPIC_API_KEY)' };
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured (SUPABASE)' };
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* defaults */ }
  const confirm = !!body.confirm;
  const max = Number.isFinite(body.max) ? Math.max(1, Math.min(30, body.max)) : DEFAULT_MAX;
  const only = lc(body.only) || null;
  const forceTouch = [2, 3, 4].includes(body.touch) ? body.touch : null;
  const log = (...a) => console.log(`[followup]`, ...a);
  log(`start · ${confirm ? 'LIVE (will auto-send)' : 'DRY (no sends)'} · max ${max}${only ? ` · only ${only}` : ''}${forceTouch ? ` · force touch ${forceTouch}` : ''}`);

  const { data: acct } = await sb.from('gmail_accounts').select('email, slack_user_id, supabase_user_id').eq('email', WILL).maybeSingle();
  if (!acct) return { statusCode: 500, body: 'will@ not connected' };
  const token = await getAccessToken(sb, WILL);

  // E1 records = founder-note saved_drafts. Only tech-exec + broker founder notes.
  let e1rows = [];
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('saved_drafts')
      .select('id, recipient_email, subject, body, source_contact, source_company, source_title, target_ref')
      .eq('target_kind', 'founder_note').range(f, f + 999);
    e1rows.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  if (only) e1rows = e1rows.filter((r) => lc(r.recipient_email) === only);

  // suppression set
  const supp = new Set();
  { const { data } = await sb.from('crm_suppression').select('email').limit(20000); (data || []).forEach((x) => supp.add(lc(x.email))); }

  const open = await slackPost('conversations.open', { users: acct.slack_user_id });
  const channel = open.channel?.id;

  const results = [];
  let sent = 0;
  for (const e1 of e1rows) {
    if (sent >= max) { log(`max ${max} reached — stopping`); break; }
    const email = lc(e1.recipient_email);
    const ref = e1.target_ref || {};
    try {
      if (supp.has(email)) { results.push({ email, skip: 'suppressed' }); continue; }
      const seqStatus = ref.sequence?.status;
      if (seqStatus && seqStatus !== 'active') { results.push({ email, skip: `sequence ${seqStatus}` }); continue; }

      // E1 send facts from outreach_sends (gmail-sent-crawl). Earliest will@ row = E1.
      const { data: sends } = await sb.from('outreach_sends')
        .select('thread_id, message_id, sent_time, reply_time, is_bounced')
        .eq('email', email).eq('sender_email', WILL).order('sent_time', { ascending: true });
      const e1send = (sends || [])[0];
      if (!e1send || !e1send.sent_time) { results.push({ email, skip: 'E1 not sent yet (Will has not sent the first note)' }); continue; }
      if ((sends || []).some((s) => s.is_bounced)) { results.push({ email, skip: 'bounced' }); await markSequence(sb, e1, 'bounced'); continue; }
      if ((sends || []).some((s) => s.reply_time)) { results.push({ email, skip: 'replied (crawl)' }); await markSequence(sb, e1, 'replied'); continue; }

      // sequence state (initialise from E1 if first run)
      const seq = ref.sequence || { touches: [{ n: 1, sent_at: e1send.sent_time, body: e1.body || '' }], status: 'active' };
      const touchesSent = seq.touches.length;
      if (touchesSent >= 4) { results.push({ email, skip: 'sequence complete (4 touches)' }); await markSequence(sb, e1, 'completed'); continue; }
      const nextTouch = forceTouch || (touchesSent + 1);
      if (nextTouch < 2 || nextTouch > 4) { results.push({ email, skip: `no touch ${nextTouch}` }); continue; }

      // cadence: due if now >= E1 + offset days (skipped when forcing a touch)
      const dueDay = FOLLOWUP_CADENCE[nextTouch];
      const age = daysBetween(e1send.sent_time, new Date().toISOString());
      if (!forceTouch && age < dueDay) { results.push({ email, skip: `touch ${nextTouch} due in ${(dueDay - age).toFixed(1)}d` }); continue; }

      // LIVE HALT CHECK — the load-bearing safety gate
      const silence = await threadIsSilent(token, e1send.thread_id);
      if (!silence.silent) {
        results.push({ email, skip: `HALT: ${silence.reason}` });
        if (silence.reason?.startsWith('inbound')) await markSequence(sb, e1, 'replied');
        continue;
      }

      // compose the touch
      const priorBodies = seq.touches.map((t) => t.body).filter(Boolean);
      const fu = await composeFollowup(anthropic, {
        lead: { email, name: e1.source_contact || null, title: e1.source_title || null, company: e1.source_company || ref.firm || null },
        audience: ref.audience || 'brokers', ctaVariant: ref.cta_variant || 'help', trigger: ref.trigger || null, remote: ref.remote === true,
        touchNumber: nextTouch, exemplars: [], bookACallUrl: BOOK_A_CALL_URL, priorBodies,
        label: email, log,
      });

      if (!confirm) {
        results.push({ email, touch: nextTouch, would_send: true, summary: fu.touch_summary });
        log(`DRY would send touch ${nextTouch} to ${email}:\n${fu.body}\n`);
        continue;
      }

      // LIVE SEND — in-thread reply from will@
      const e1hdr = await getMessageHeaders(token, e1send.message_id).catch(() => null);
      const msgId = e1hdr?.messageIdHeader || null;
      const subject = e1.subject ? (/^re:/i.test(e1.subject) ? e1.subject : `Re: ${e1.subject}`) : 'Re: quick note';
      const res = await sendEmail(token, {
        from: WILL, to: email, subject, body: fu.body, signatureHtml: FOUNDER_MIN_SIG_HTML,
        threadId: e1send.thread_id, inReplyTo: msgId, references: msgId,
      });
      sent += 1;
      seq.touches.push({ n: nextTouch, sent_at: new Date().toISOString(), body: fu.body, message_id: res.id });
      seq.status = nextTouch >= 4 ? 'completed' : 'active';
      await sb.from('saved_drafts').update({ target_ref: { ...ref, sequence: seq } }).eq('id', e1.id);
      results.push({ email, touch: nextTouch, sent: true });
      log(`SENT touch ${nextTouch} to ${email} (thread ${e1send.thread_id})`);
      if (channel) {
        await slackPost('chat.postMessage', {
          channel, text: `Auto-sent follow-up ${nextTouch} to ${email}`,
          blocks: [{ type: 'context', elements: [{ type: 'mrkdwn', text: `:mailbox_with_mail: *Auto-sent follow-up ${nextTouch}/4* to ${email} (${ref.firm || ref.audience || ''}). Reply-halt was clear. _${fu.touch_summary}_` }] }],
          unfurl_links: false, unfurl_media: false,
        });
      }
    } catch (e) {
      console.error(`[followup] error for ${email}:`, e.message);
      results.push({ email, error: e.message });
    }
  }

  const summary = {
    ok: true, dry: !confirm, considered: e1rows.length, sent,
    due: results.filter((r) => r.would_send || r.sent).length,
    halted: results.filter((r) => String(r.skip || '').startsWith('HALT')).length,
    results,
  };
  log(`done · ${JSON.stringify({ considered: summary.considered, sent, halted: summary.halted })}`);
  return { statusCode: 200, body: JSON.stringify(summary) };
};

async function markSequence(sb, e1, status) {
  const ref = e1.target_ref || {};
  const seq = ref.sequence || { touches: [{ n: 1 }] };
  if (seq.status === status) return;
  await sb.from('saved_drafts').update({ target_ref: { ...ref, sequence: { ...seq, status } } }).eq('id', e1.id);
}
