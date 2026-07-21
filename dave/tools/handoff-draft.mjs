/**
 * handoff-draft — turn a Dave draft into a one-tap sendable card.
 *
 * Writes the draft into the EXISTING send path (never a parallel sender):
 *   1. suppression check (fail-closed — a suppressed address is refused)
 *   2. Gmail draft in will@'s drafts (founder-min signature)
 *   3. saved_drafts row, target_kind='founder_note' so the Slack Send/Edit/Cancel
 *      buttons work and the row PERSISTS marked-sent for tracking — but with
 *      target_ref.sequence.status='manual' so the auto-follow-up sender NEVER
 *      picks it up (Dave's notes are often warm; the cold cadence would be wrong).
 *   4. Slack card with buttons, posted by the PRO bot to Will's DM (the buttons
 *      route through the Pro app's interactivity endpoint, so the Pro bot must
 *      be the one posting).
 *
 * Usage (Dave calls this from the morning brief / on request):
 *   node tools/handoff-draft.mjs '<json>'      or pipe the JSON on stdin
 *   JSON: { "to": "a@b.com", "name": "...", "title": "...", "company": "...",
 *           "subject": "...", "body": "...", "why_now": "...", "reply_odds": 0.3,
 *           "research_note": "...", "linkedin_step": "..." }
 * Prints a JSON result line. Never sends an email — it stages one for Will.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DAVE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.join(DAVE_DIR, '..');
// Self-load env (dave/.env + ~/.shortcut-cron.env) — launchd zsh can't read Documents; node can.
for (const f of [path.join(DAVE_DIR, '.env'), path.join(process.env.HOME || '', '.shortcut-cron.env')]) {
  try {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
    }
  } catch { /* fine */ }
}

const { createClient } = await import(path.join(REPO, 'node_modules', '@supabase/supabase-js', 'dist', 'main', 'index.js')).catch(() => import('@supabase/supabase-js'));
// FOUNDER_MIN_SIG_HTML: the single source of truth in lib/gmail.js. The first version of
// this file re-declared it locally WITH AN INVENTED PHONE NUMBER (2026-07-21) — the exact
// fabricated-specific failure this whole system polices. Never re-declare the signature.
const { getAccessToken, createDraft, lc, FOUNDER_MIN_SIG_HTML } = await import(path.join(REPO, 'netlify', 'functions', 'lib', 'gmail.js'));
const { buildDraftPreviewBlocks } = await import(path.join(REPO, 'netlify', 'functions', 'lib', 'slack-blocks.js'));

const WILL = 'will@getshortcut.co';

const fail = (why, extra = {}) => { console.log(JSON.stringify({ ok: false, why, ...extra })); process.exit(1); };

// ---- input
let raw = process.argv.slice(2).join(' ');
if (!raw.trim()) raw = await new Promise((res) => { let d = ''; process.stdin.on('data', (c) => { d += c; }).on('end', () => res(d)); });
let spec; try { spec = JSON.parse(raw); } catch { fail('input is not valid JSON'); }
for (const k of ['to', 'name', 'company', 'subject', 'body']) if (!spec[k] || !String(spec[k]).trim()) fail(`missing field: ${k}`);
const to = lc(String(spec.to).trim());
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) fail(`not an email address: ${to}`);

const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });

// ---- 1. suppression, fail-closed (a query error is a refusal, not a pass)
const { data: supp, error: suppErr } = await sb.from('crm_suppression').select('email, reason').eq('email', to).maybeSingle();
if (suppErr) fail(`suppression check errored (fail-closed): ${suppErr.message}`);
if (supp) fail(`SUPPRESSED (${supp.reason}) — this address may never be drafted`, { suppressed: true });

// ---- 2. Gmail draft in will@'s drafts
const { data: acct } = await sb.from('gmail_accounts').select('email, supabase_user_id').eq('email', WILL).maybeSingle();
if (!acct) fail('no gmail_accounts row for will@');
let gmailDraftId = null; let gmailMessageId = null;
try {
  const tok = await getAccessToken(sb, WILL);
  const d = await createDraft(tok, { from: WILL, to, subject: spec.subject, body: spec.body, signatureHtml: FOUNDER_MIN_SIG_HTML, threadId: spec.thread_id || null });
  gmailDraftId = d.id; gmailMessageId = d.messageId;
} catch (e) { fail(`gmail draft failed: ${e.message}`); }

// ---- 3. saved_drafts row (founder_note => buttons work + row persists marked-sent;
//         sequence.status='manual' => auto-follow-ups never touch it)
const { data: saved, error: saveErr } = await sb.from('saved_drafts').insert({
  user_id: acct.supabase_user_id,
  recipient_email: to,
  subject: spec.subject, body: spec.body, direction_label: 'dave',
  source_company: spec.company, source_contact: spec.name, source_title: spec.title || null,
  target_kind: 'founder_note',
  target_ref: {
    dave: true,
    why_now: spec.why_now || null,
    reply_odds: spec.reply_odds ?? null,
    research_note: spec.research_note || null,
    linkedin_step: spec.linkedin_step || null,
    rep_email: WILL, thread_id: spec.thread_id || null,
    gmail_draft_id: gmailDraftId, gmail_message_id: gmailMessageId,
    sequence: { status: 'manual', touches: [] },
    all_directions: [{ label: 'dave', subject: spec.subject, body: spec.body }],
  },
}).select().single();
if (saveErr || !saved) fail(`saved_drafts insert failed: ${saveErr?.message}`);

// ---- 4. Slack card with the Send/Edit/Cancel buttons, via the PRO bot to Will's DM
const slack = (method, body) => fetch(`https://slack.com/api/${method}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then((r) => r.json());
const open = await slack('conversations.open', { users: process.env.DAVE_ALLOWED_USER });
if (!open.ok) fail(`slack conversations.open failed: ${open.error} (row ${saved.id} + gmail draft exist — clean up or retry)`);
const who = [spec.name, spec.company].filter(Boolean).join(' · ');
const context = { type: 'section', text: { type: 'mrkdwn', text: [
  `*${who}*${spec.title ? `  (${spec.title})` : ''}  — _from Dave_`,
  spec.why_now ? `*Why now:* ${String(spec.why_now).slice(0, 200)}` : null,
  spec.reply_odds != null ? `*Reply odds:* ${spec.reply_odds}` : null,
  spec.linkedin_step ? `*LinkedIn today:* ${spec.linkedin_step}` : null,
].filter(Boolean).join('\n') } };
const linkedinUrl = spec.linkedin_url
  || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${spec.name} ${spec.company}`.trim())}`;
const preview = buildDraftPreviewBlocks(
  { who, email: to, draftId: saved.id, threadId: spec.thread_id || null, repEmail: WILL, signatureText: null, gmailDraftId, gmailMessageId, linkedinUrl, hideEditInBrowser: true },
  { label: 'dave', subject: spec.subject, body: spec.body }, null,
);
const posted = await slack('chat.postMessage', {
  channel: open.channel.id, text: `Dave draft ready: ${who}`,
  blocks: [{ type: 'divider' }, context, ...preview], unfurl_links: false, unfurl_media: false,
});
if (!posted.ok) fail(`slack post failed: ${posted.error} (row ${saved.id} exists; draft is in Gmail regardless)`);

console.log(JSON.stringify({ ok: true, draft_id: saved.id, gmail_draft_id: gmailDraftId, to, subject: spec.subject }));
