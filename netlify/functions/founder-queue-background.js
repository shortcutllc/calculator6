/**
 * founder-queue-background.js — Will's daily founder-networking queue.
 * See memory/founder_outreach_lane.md (the program design, 2026-07-02).
 *
 * Each morning (host cron POSTs here) it picks the day's targets — brokers first,
 * by priority rank — and for each one:
 *   1. RESEARCHES the person + firm live (Anthropic web_search, max 3 searches)
 *   2. drafts a founder note in WILL'S OWN VOICE (grounded on his real recent
 *      sent emails as style exemplars + the founder-note craft rules), hyper-
 *      personalized on what the research actually found — with an honesty rule:
 *      nothing specific found -> use the firm-level angle, NEVER fabricate
 *   3. creates a real Gmail DRAFT in will@ (minimal inline sign-off, no heavy
 *      signature — cold first-touch etiquette)
 *   4. saves a saved_drafts row (target_kind='founder_note') so the existing
 *      Send / Edit / Show-angles / Cancel Slack buttons work
 *   5. DMs Will one compact card per lead: who / why-now / the research note /
 *      today's LinkedIn step / the draft preview
 *
 * The COMPOSE ENGINE (voice prompt, gates, revise loop, skeptic) lives in
 * lib/founder-note.js so it can be edited + tested locally without a deploy
 * (scripts/draft-founder-note-local.mjs). This file is just the orchestration:
 * target selection, Gmail draft, saved_drafts row, Slack card.
 *
 * HARD RULES (the personal lane): DRAFTS ONLY — Will sends every email by hand.
 * No tracking, no sequencer, volume capped (default 5/run, ramp to 10-15).
 * gmail-sent-crawl attributes sends automatically once he hits Send.
 *
 * POST body: { max?:5, dryRun?:bool, audience?:'brokers', only?:'email', cta?, trigger? }
 * Env: SUPABASE_*, ANTHROPIC_API_KEY, PRO_SLACK_BOT_TOKEN.
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { leadPicture } from './lib/lead-picture.js';
import { buildDraftPreviewBlocks } from './lib/slack-blocks.js';
import { getAccessToken, createDraft, lc } from './lib/gmail.js';
import { recentSentBodies, composeNote, researchPersonalHook } from './lib/founder-note.js';

const SLACK_API = 'https://slack.com/api';
const WILL = 'will@getshortcut.co';
const DEFAULT_MAX = 5;   // ramp: wk1 ~5/day, wk2 ~10, ceiling 15 (founder_outreach_lane.md)

// Will's "founder-min" Gmail signature, embedded verbatim (Will 2026-07-06).
// Gmail's API only exposes the DEFAULT sendAs signature, which for will@ is the
// heavy one (Founder & CEO + Book-a-call link + logo image) — exactly what the
// founder-lane first-touch rules ban. So the minimal signature lives here.
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
  const max = Number.isFinite(body.max) ? Math.max(1, Math.min(15, body.max)) : DEFAULT_MAX;
  const dryRun = !!body.dryRun;
  const only = lc(body.only) || null;
  const audience = body.audience || 'brokers';
  // verified why-now from the tech-scout harvest (only meaningful with `only`
  // since it describes one lead's company)
  const trigger = typeof body.trigger === 'string' && body.trigger.trim() ? body.trigger.trim().slice(0, 300) : null;
  // remote=true (from tech-scout harvest) → this company is fully remote; the note
  // leads the virtual/flexible track (mindfulness, sound baths, nutrition coaching)
  // instead of on-site. Saved on the draft so follow-ups stay consistent in-thread.
  const remote = body.remote === true;
  // trigger_type distinguishes a real external MILESTONE (funding/IPO/launch — open
  // on it) from an INTERNAL targeting signal (an open job posting / growth-list hit
  // — why we picked them, NEVER quoted at the prospect). Prevents notes that open
  // "I saw you're hiring…" or frame a routine role as growth (Will 2026-07-08).
  const triggerType = typeof body.trigger_type === 'string' ? body.trigger_type : null;

  // Will's account (Slack + Gmail + user id).
  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, slack_user_id, supabase_user_id').eq('email', WILL).maybeSingle();
  if (!acct?.slack_user_id) return { statusCode: 500, body: 'will@ not connected (gmail_accounts.slack_user_id)' };

  // ---- TARGETS. brokers (v1): priority-ranked broker contacts. tech-execs (v2,
  // 2026-07-06): the founder-personal cohort from find-founder-targets.mjs
  // (source='founder-personal', channel='personal' — never in the cold pool).
  const { data: firms } = await sb.from('crm_target_firms').select('id, display_name, tier, track, why, nyc_presence, priority_rank');
  const firmById = new Map((firms || []).map((f) => [f.id, f]));
  let rows = [];
  for (let f = 0; ; f += 1000) {
    const q = sb.from('outreach_contacts')
      .select('email, name, title, company, location, mv_status, bounceban_status, broker_firm_id, broker_priority_rank, channel, source, linkedin_url');
    const { data } = audience === 'brokers'
      ? await q.not('broker_firm_id', 'is', null).range(f, f + 999)
      : await q.eq('source', 'founder-personal').range(f, f + 999);
    rows.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  rows = rows.filter((r) => r.email && (r.mv_status === 'ok' || r.bounceban_status === 'deliverable'));
  if (only) rows = rows.filter((r) => lc(r.email) === only);
  // exclusions: suppression, already queued (founder_note draft exists), already personally emailed by Will
  const supp = new Set(); const queued = new Set(); const contacted = new Set();
  {
    const { data: s } = await sb.from('crm_suppression').select('email').limit(10000);
    (s || []).forEach((x) => supp.add(lc(x.email)));
    const { data: q } = await sb.from('saved_drafts').select('recipient_email').eq('target_kind', 'founder_note').limit(10000);
    (q || []).forEach((x) => queued.add(lc(x.recipient_email)));
    const { data: c } = await sb.from('outreach_sends').select('email').eq('sender_email', WILL).limit(10000);
    (c || []).forEach((x) => contacted.add(lc(x.email)));
  }
  rows = rows.filter((r) => !supp.has(lc(r.email)) && !queued.has(lc(r.email)) && !contacted.has(lc(r.email)));
  // one contact per firm/company per day (spread the courtship), then priority order
  rows.sort((a, b) => (a.broker_priority_rank ?? 9e9) - (b.broker_priority_rank ?? 9e9));
  const seenFirm = new Set(); const targets = [];
  for (const r of rows) {
    if (targets.length >= max) break;
    const fid = r.broker_firm_id || lc(r.company) || lc(r.email);
    if (seenFirm.has(fid)) continue;
    seenFirm.add(fid); targets.push(r);
  }

  if (dryRun) {
    return { statusCode: 200, body: JSON.stringify({ dryRun: true, audience, max, candidates: rows.length, today: targets.map((t) => ({ email: t.email, name: t.name, company: t.company, firm: firmById.get(t.broker_firm_id)?.display_name })) }) };
  }
  if (!targets.length) return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'no eligible targets', candidates: rows.length }) };

  // Voice exemplars once per run.
  const tok = await getAccessToken(sb, WILL);
  // 5 exemplars, not 3 — few-shot voice samples are the strongest tone lever
  // (Anthropic multishot guidance; voice research 2026-07-06).
  const exemplars = await recentSentBodies(tok, 5);

  // Digest header DM.
  const open = await slackPost('conversations.open', { users: acct.slack_user_id });
  const channel = open.channel?.id;
  if (channel) {
    await slackPost('chat.postMessage', {
      channel, text: `Founder queue: ${targets.length} today`,
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `:coffee: *Your founder queue — ${targets.length} ${audience} today.* Each has a Gmail draft ready in your voice, a research note, and today's LinkedIn step. You send; nothing goes out on its own.` } }],
      unfurl_links: false, unfurl_media: false,
    });
  }

  const results = [];
  for (const t of targets) {
    const firm = firmById.get(t.broker_firm_id) || null;
    try {
      // preflight (suppressed/client) via the shared gate
      let pic = null;
      try { pic = await leadPicture(sb, { email: lc(t.email) }); } catch { /* optional */ }
      if (pic?.preflight?.suppressed || pic?.preflight?.is_client) { results.push({ email: t.email, skipped: pic.preflight.suppressed ? 'suppressed' : 'is_client' }); continue; }

      // CTA A/B (Will 2026-07-02): alternate help-posture close vs convo-invite close;
      // measured on replies per variant (cta_variant stored on the saved draft).
      // body.cta overrides (used by --only redrafts to keep the A/B assignment).
      const ctaVariant = ['help', 'convo'].includes(body.cta) ? body.cta
        : (targets.indexOf(t) % 2 === 0) ? 'help' : 'convo';
      // PERSONALIZE (Will 2026-07-08): research the company for ONE genuine, kind,
      // specific human detail (from any category) and open the note on it, instead of
      // a robotic trigger tag. Tech-execs only for now (brokers already do firm-level
      // observation well). Null-safe: on timeout/nothing-found the note falls back to
      // its normal trigger-based path.
      let personalHook = null;
      if (audience !== 'brokers') {
        try {
          const ph = await researchPersonalHook(anthropic, t, { log: (m) => log(`  ${m}`) });
          if (ph?.warm_line && ph.confidence !== 'low') { personalHook = ph.warm_line; log(`  personalized ${t.email}: ${ph.category} — ${ph.warm_line.slice(0, 80)}`); }
        } catch (e) { log(`  personalize failed for ${t.email} (${e.message}) — trigger fallback`); }
      }
      // Compose engine (lib/founder-note.js): draft -> guards (2 revises) ->
      // skeptic -> revise -> final guard. Throws if it still violates a hard
      // rule; the catch below turns that into a Slack skip.
      const { note } = await composeNote(anthropic, { lead: t, firm, exemplars, audience, ctaVariant, trigger, triggerType, remote, personalHook, label: t.email });

      // Gmail draft — founder-min signature embedded (Will 2026-07-06). Still no
      // logo/booking-link (first-touch rule); founder-min is the minimal block.
      let gmailDraftId = null; let gmailMessageId = null;
      try {
        const d = await createDraft(tok, { from: WILL, to: lc(t.email), subject: note.subject, body: note.body, signatureHtml: FOUNDER_MIN_SIG_HTML, threadId: null });
        gmailDraftId = d.id; gmailMessageId = d.messageId;
      } catch (e) { console.warn(`gmail draft failed for ${t.email}:`, e.message); }

      const { data: saved, error: saveErr } = await sb.from('saved_drafts').insert({
        user_id: acct.supabase_user_id,
        recipient_email: lc(t.email),
        subject: note.subject, body: note.body, direction_label: 'founder',
        source_company: t.company, source_contact: t.name, source_title: t.title,
        target_kind: 'founder_note',
        target_ref: {
          audience, cta_variant: ctaVariant, firm: firm?.display_name || null, tier: firm?.tier || null,
          linkedin_url: t.linkedin_url || null,
          trigger: trigger || null,
          trigger_type: triggerType || null,
          remote: remote || null,
          personal_hook: personalHook || null,
          research_note: note.research_note, linkedin_step: note.linkedin_step,
          rep_email: WILL, thread_id: null, gmail_draft_id: gmailDraftId, gmail_message_id: gmailMessageId,
          all_directions: [{ label: 'founder', subject: note.subject, body: note.body }],
        },
        preflight_reco: pic?.preflight?.recommendation || null,
      }).select().single();
      if (saveErr || !saved) { results.push({ email: t.email, status: 'save_failed', error: saveErr?.message }); continue; }

      if (channel) {
        const who = [t.name, firm?.display_name || t.company].filter(Boolean).join(' · ');
        const context = { type: 'section', text: { type: 'mrkdwn', text: [
          `*${who}*  (${t.title || 'benefits'}${firm?.tier ? ` · ${firm.tier}` : ''})`,
          firm?.why ? `*Why this firm:* ${String(firm.why).slice(0, 180)}` : null,
          `*Research:* ${note.research_note}`,
          `*LinkedIn today:* ${note.linkedin_step}`,
          `*CTA variant:* ${ctaVariant}`,
        ].filter(Boolean).join('\n') } };
        // LinkedIn people-search fallback keeps the button useful if a contact
        // ever lands without a stored profile URL (all 231 current ones have it).
        const linkedinUrl = t.linkedin_url
          || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${t.name || ''} ${firm?.display_name || t.company || ''}`.trim())}`;
        const preview = buildDraftPreviewBlocks(
          { who, email: lc(t.email), draftId: saved.id, threadId: null, repEmail: WILL, signatureText: null, gmailDraftId, gmailMessageId, linkedinUrl, hideEditInBrowser: true },
          { label: 'founder', subject: note.subject, body: note.body }, null,
        );
        await slackPost('chat.postMessage', { channel, text: `Founder note ready: ${who}`, blocks: [{ type: 'divider' }, context, ...preview], unfurl_links: false, unfurl_media: false });
      }
      results.push({ email: t.email, status: 'drafted', draftId: saved.id });
    } catch (e) {
      console.error(`founder-queue error for ${t.email}:`, e.message);
      results.push({ email: t.email, status: 'error', error: e.message });
      if (channel) {
        await slackPost('chat.postMessage', {
          channel, text: `Founder queue: ${t.email} skipped`,
          blocks: [{ type: 'context', elements: [{ type: 'mrkdwn', text: `:warning: Skipped *${t.name || t.email}* (${firm?.display_name || t.company || ''}): ${String(e.message).slice(0, 180)}` }] }],
          unfurl_links: false, unfurl_media: false,
        });
      }
    }
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true, audience, drafted: results.filter((r) => r.status === 'drafted').length, results }) };
};
