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
import { researchObservations, composeNoteV2 } from './lib/founder-note-v2.js';
import { voiceExemplars } from './lib/voice-corpus.js';

const SLACK_API = 'https://slack.com/api';
const WILL = 'will@getshortcut.co';
const DEFAULT_MAX = 5;   // ramp: wk1 ~5/day, wk2 ~10, ceiling 15 (founder_outreach_lane.md)

// ENGINE SELECTION (2026-07-20). 'v2' = the writing loop (generate-N + judge panel,
// no patch loop); 'v1' = the original checking loop, kept as the A/B control and the
// instant fallback. POST engine:'v1'|'v2' overrides; FOUNDER_ENGINE env sets the default.
const V2_CANDIDATES = 4;   // 4 beats 5 on cost/latency; selection value of the 5th is low
const GROQ_KEY = process.env.GROQ_API_KEY || null;

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

// A broker CONTACT must be a plausible benefits decision-maker (producer, consultant,
// advisor, AE, principal, partner, benefits/wellbeing leader). The Apollo firm-pull
// tags EVERYONE at a brokerage with a verified email as a broker, so non-broker
// FUNCTIONS (content, marketing, creative, engineering, recruiting, legal) get
// mis-tagged and can leak into the queue (Will 2026-07-09: a "Senior Content Producer"
// at NFP made it into the morning batch). This is a denylist: block the clear
// wrong-function titles, trust the broker tag for everything else. Note "producer" is
// an insurance term for a broker, so we only block it when qualified (content/video).
const NON_BROKER_TITLE = /\b(?:content|marketing|communications?|creative|copywriter|editor|journalist|videographer|photographer|podcast|graphic|designer|illustrator|social media|public relations|engineer|engineering|developer|software|devops|data scientist|data engineer|data analyst|recruit(?:er|ing)|talent acquisition|sourcer|paralegal|receptionist|intern|apprentice|facilities|product manager|ux|ui)\b/i;
const isNonBrokerTitle = (title) => NON_BROKER_TITLE.test(String(title || ''));

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
  const ENGINE = ['v1', 'v2'].includes(body.engine) ? body.engine : (process.env.FOUNDER_ENGINE === 'v1' ? 'v1' : 'v2');
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
  // Broker title guard: never email a mis-tagged non-broker (content/marketing/eng/etc.).
  if (audience === 'brokers') {
    const before = rows.length;
    rows = rows.filter((r) => !isNonBrokerTitle(r.title));
    if (before - rows.length) console.log(`broker title guard: skipped ${before - rows.length} non-broker title(s)`);
  }
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
  // VOICE. v2 uses the CURATED cold-lane corpus (lib/voice-corpus.js): most of Will's
  // sent mail is merge templates, so scraping it teaches the model the robot we are trying
  // to escape, and the warm-lane exemplars carry pleasantries the cold guards reject.
  // v1 keeps its original behaviour so the A/B control arm is unchanged.
  const exemplars = ENGINE === 'v2' ? voiceExemplars({ audience, lane: 'cold', max: 6 }) : await recentSentBodies(tok, 5);

  // ANTI-SAMENESS (2026-07-14): the drafter sees ONE note and cannot know what it wrote
  // yesterday, so "vary your phrasing" cannot hold on its own — on 2026-07-14 three
  // broker notes drafted four minutes apart shared a verbatim paragraph. Feed the recent
  // notes back in (composeNote injects them into the prompt AND checks n-gram overlap in
  // code). Notes drafted in THIS run are appended as we go, because the worst duplicates
  // were within a single run.
  const RECENT_NOTES_N = 20;
  const { data: priorNotes } = await sb.from('saved_drafts')
    .select('body')
    .eq('target_kind', 'founder_note')
    .order('created_at', { ascending: false })
    .limit(RECENT_NOTES_N);
  const recentNotes = (priorNotes || []).map((r) => r.body).filter(Boolean);
  console.log(`anti-sameness: ${recentNotes.length} recent notes loaded`);

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
      // PERSONALIZE (Will 2026-07-08): research the person/company for ONE genuine,
      // kind, specific detail and open the note on it, instead of a robotic trigger
      // tag. Audience-aware (tech-execs = company/how-they-treat-people; brokers =
      // their firm's benefits/wellbeing practice, connected to helping their clients).
      // Null-safe: on timeout/nothing-found the note falls back to its normal path.
      let personalHook = null; let hookCategory = null; let hookDetail = null; let hookConnects = null;
      // v2 runs its OWN wide research (researchObservations, rated for noteworthiness), so
      // running v1's single-hook researcher here would be a wasted web-search call.
      try {
        if (ENGINE === 'v2') throw new Error('skip: v2 researches its own observations');
        const ph = await researchPersonalHook(anthropic, t, { audience, log: (m) => console.log(`  ${m}`) });
        if (ph?.warm_line && ph.confidence !== 'low') {
          personalHook = ph.warm_line;
          // category/detail/connects feed the gates (2026-07-14): category==='office'
          // unlocks office framing, and the detail + claimed connection let the skeptic
          // actually judge the "connects on its face" bar instead of guessing at it.
          hookCategory = ph.category || null; hookDetail = ph.personal_detail || null; hookConnects = ph.connects || null;
          console.log(`  personalized ${t.email}: ${ph.category} — ${ph.warm_line.slice(0, 80)}`);
        }
      } catch (e) {
        // Do not cry wolf: on v2 this path is a deliberate skip, not a failure. A log line
        // that says "personalize failed" every single run would train us to ignore it, and
        // then a real failure would look identical to the normal case.
        if (String(e.message).startsWith('skip:')) console.log(`  ${t.email}: v2 researches its own observations (v1 hook researcher not run)`);
        else console.log(`  personalize failed for ${t.email} (${e.message}) — trigger fallback`);
      }
      // Compose engine (lib/founder-note.js): draft -> guards (2 revises) ->
      // skeptic -> revise -> final guard. Throws if it still violates a hard
      // rule; the catch below turns that into a Slack skip.
      // ENGINE SWITCH (2026-07-20). v2 is the WRITING loop: research wide and rate every
      // fact for noteworthiness (allowed to REFUSE), generate N structurally-different
      // candidates across model families, screen with a terminal brand-safety gate, and
      // SELECT with a blind dual-ordered 3-family judge panel. No patch loop anywhere.
      // See memory/llm_writing_loop_architecture.md. v1 stays intact and reachable so we
      // can fall back instantly, and so the A/B has a real control arm.
      let note; let architecture = null; let engineUsed = ENGINE;
      if (ENGINE === 'v2') {
        const { observations, refused: noAngle } = await researchObservations(anthropic, t, { audience, log: (m) => console.log(`  ${m}`) });
        // REFUSING IS A FEATURE, NOT A FAILURE (Will approved 2026-07-14). Being forced to
        // write about a lead with no real angle is what produced "your title mentions
        // employee experience". Five strong notes beat ten inert ones.
        if (noAngle) { results.push({ email: t.email, skipped: 'no angle worth writing' }); console.log(`  REFUSED ${t.email} — nothing worth saying`); continue; }
        const officeContext = observations.some((o) => o.category === 'office');
        const v2 = await composeNoteV2(anthropic, {
          lead: t, firm, audience, remote, exemplars, recentNotes, observations,
          trigger, officeContext, n: V2_CANDIDATES, groqKey: GROQ_KEY, label: t.email,
          log: (m) => console.log(`  ${m}`),
        });
        if (v2.refused) { results.push({ email: t.email, skipped: v2.reason }); console.log(`  REFUSED ${t.email} — ${v2.reason}`); continue; }
        note = v2.note;
      } else {
        // v1: draft -> guards (2 revises) -> skeptic -> revise -> final guard.
        ({ note, architecture } = await composeNote(anthropic, { lead: t, firm, exemplars, audience, ctaVariant, trigger, triggerType, remote, personalHook, hookCategory, hookDetail, hookConnects, recentNotes, label: t.email }));
      }

      // Feed this note back into the anti-sameness pool so the NEXT lead in this same
      // run cannot reuse its phrasing (the Krista/Rob/Julie duplicates on 2026-07-14
      // were all drafted within four minutes of each other).
      recentNotes.unshift(note.body);
      if (recentNotes.length > RECENT_NOTES_N) recentNotes.pop();

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
          // MEASUREMENT (Will 2026-07-14): the CTA A/B (help vs convo) is unmeasurable —
          // 71 drafts produced 27 sends and ONE reply, and it tests the wrong variable
          // anyway. The research says the OBSERVATION is the lever, so record what kind
          // of hook we found and which skeleton we used, and measure send-rate and
          // reply-rate by those instead. Every note contributes a data point, so this
          // accumulates far faster than the CTA split ever could.
          // Read with scripts/debug/founder-lane-metrics.mjs.
          engine: engineUsed,
          hook_category: hookCategory || 'none',
          architecture: architecture?.key || null,
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
