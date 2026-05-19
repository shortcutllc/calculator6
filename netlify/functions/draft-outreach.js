/**
 * Draft Outreach — Netlify serverless function (Phase 4A: assisted drafting).
 *
 * POST  body { play: 'A'|'B', rank: number, repName?: string }
 *   → reads the target from crm_play_a / crm_play_b
 *   → assembles read-only pre-flight context (suppression / client / contacted)
 *   → grounds Claude in the Shortcut brand voice
 *   → returns 3 cold-email directions (safe / medium / brave) + which to fight for
 *
 * Human-in-the-loop only. This drafts. It does NOT send. The rep edits and
 * copies. Gmail send/track is Phase 4B.
 *
 * Caveat (v1): the measured winning-template corpus is not yet in Supabase, so
 * drafts are grounded on prospect context + brand voice, not yet on
 * "templates that historically converted for this profile". Template-grounding
 * is a fast-follow once the template library is ingested.
 *
 * Auth: Supabase JWT in Authorization header (Bearer token).
 * Env:  ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL|SUPABASE_URL
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { preflight } from './lib/preflight.js';

const MODEL = 'claude-sonnet-4-5-20250929';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// --- Auth (same pattern as create-stripe-invoice.js) ---

async function validateAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Authorization required' };
  }
  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw { statusCode: 500, message: 'Server misconfigured' };
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw { statusCode: 401, message: 'Invalid or expired token' };
  return { user, supabase };
}

// Read-only pre-flight context now lives in ./lib/preflight.js (shared with
// send-as-rep.js so the gate cannot drift between drafting and sending).

// --- Brand voice (mirrors memory/brand_voice_copywriter.md + CLAUDE.md) ---

const SYSTEM_PROMPT = `You are the outbound copywriter for Shortcut, an all-in-one corporate wellness platform. Shortcut delivers in-person and virtual wellness experiences (chair massage, office grooming, corporate headshots, mindfulness workshops) to mid-market and enterprise companies. The pitch is single-vendor simplicity, operational excellence, and immediate employee impact.

You are writing a cold outreach email from a Shortcut salesperson to one prospect. Output 3 distinct directions labeled exactly "safe", "medium", "brave".

WHO YOU ARE WRITING TO: People Ops / HR / CHRO leaders at mid-market and enterprise companies. They are exhausted by "wellness theater" (pizza parties, stress balls, unused meditation app licenses). They want something employees actually want that does not create more admin work. They are smart, busy, and allergic to being sold to.

VOICE: Calm, human, practical. Like a competent friend who happens to run a wellness company. Confident but never loud. State what we do plainly. The service sells itself. Premium without being pretentious, professional without being stiff.

HARD WRITING RULES (violating any of these fails the task):
- NEVER use dashes as punctuation. No em dashes, no en dashes, no hyphens between clauses. End the sentence. Start a new one.
- NEVER use these words: elevate, leverage, synergy, unlock, empower, transform, reimagine, seamless, holistic, curated.
- NEVER start with "In today's..." or "At Shortcut, we believe...".
- No exclamation points. No manufactured energy. No rhyming, no forced alliteration.
- No buzzwords. If a McKinsey deck would use the word, do not use it.
- Specifics over superlatives. "15 minutes" beats "quick". "500+ companies" beats "many".
- If a sentence would work for any wellness company, rewrite it so it only works for Shortcut.

EMAIL TONE: Conversational, peer-to-peer. Write like one human emailing another, not a tagline string. Sentences can run 20+ words when the rhythm calls for it. Warmth over compression. Do NOT compress into telegraph fragments. Keep the whole email tight though: a busy HR leader should be able to read it in under 20 seconds. One clear ask. No attachments-talk, no calendar-link spam in the body.

DIRECTIONS:
- safe: the version a conservative B2B seller would happily send. Low risk, clearly competent, still in Shortcut voice.
- medium: more personality. A sharper hook, a little dry wit if it fits the prospect. The recommended default for most sends.
- brave: takes a real swing. Strong point of view or unexpected angle. Higher risk, higher reply-rate ceiling.

Use any provided context (prior contact history, whether they are an existing client expanding, firmographics, the contact's title) to ground the hook in something true and specific. Do not invent facts about the prospect. If context is thin, lean on the category insight (wellness theater fatigue, single-vendor logistics, fast in-office delivery) rather than fabricating detail.

Return ONLY valid JSON, no prose around it, in exactly this shape:
{
  "directions": [
    { "label": "safe", "subject": "...", "body": "..." },
    { "label": "medium", "subject": "...", "body": "..." },
    { "label": "brave", "subject": "...", "body": "..." }
  ],
  "fight_for": "safe|medium|brave",
  "fight_for_reason": "one or two sentences on why this is the one to send to this specific prospect"
}
Body should be plain text with real line breaks (\\n), no markdown, signed off simply (e.g. "Best," then the rep name if provided, else just "Best,").`;

// --- Handler ---

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  let sb, user;
  try {
    ({ supabase: sb, user } = await validateAuth(event));
  } catch (e) {
    return jsonResponse(e.statusCode || 401, { error: e.message || 'Auth failed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, { error: 'ANTHROPIC_API_KEY not configured' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return jsonResponse(400, { error: 'Invalid JSON body' }); }
  const followup = body.followup && body.followup.to ? body.followup : null;
  const play = followup ? null : (body.play === 'A' ? 'A' : body.play === 'B' ? 'B' : null);
  const rank = Number(body.rank);
  if (!followup && (!play || !Number.isFinite(rank))) {
    return jsonResponse(400, { error: 'Body must include play ("A"|"B") and a numeric rank, or a followup {to}' });
  }
  const repName = (body.repName && String(body.repName).trim()) || (user.email ? String(user.email).split('@')[0] : '');

  // 1. Load the target
  const target = {};
  let preflightEmail = null;
  let preflightDomain = null;

  if (followup) {
    const fto = String(followup.to).trim().toLowerCase();
    Object.assign(target, {
      kind: 'follow_up',
      company: followup.company || null,
      known_contact: { name: followup.name || null, title: followup.title || null },
      days_since_last_email: followup.days_since ?? null,
      this_is_touch_number: followup.touch_number ?? 2,
    });
    preflightEmail = fto;
    preflightDomain = fto.split('@')[1] || null;
  } else if (play === 'A') {
    const { data: row, error } = await sb.from('crm_play_a')
      .select('company_id, company_name, employees, industry, sites_served, sites_list, fit_score, last_event_at, months_since_event, play_status')
      .eq('rank', rank).maybeSingle();
    if (error || !row) return jsonResponse(404, { error: `Play A rank ${rank} not found` });
    Object.assign(target, {
      kind: row.play_status === 're_engage' ? 're_engage_lapsed_client' : 'expand_existing_client',
      company: row.company_name, employees: row.employees, industry: row.industry,
      sites_we_serve: row.sites_served, sites_list: row.sites_list, fit_score: row.fit_score,
      last_event_at: row.last_event_at, months_since_last_event: row.months_since_event,
    });
    if (row.company_id) {
      const { data: c } = await sb.from('crm_companies')
        .select('trajectory, activity_status, completed_events, contact_domains, contacts')
        .eq('id', row.company_id).maybeSingle();
      if (c) {
        target.trajectory = c.trajectory;
        target.activity_status = c.activity_status;
        target.events_run_with_us = c.completed_events;
        const dom = (c.contact_domains || [])[0] || null;
        preflightDomain = dom;
        const contacts = Array.isArray(c.contacts) ? c.contacts : [];
        const primary = contacts.find((x) => x && x.email) || contacts[0] || null;
        if (primary) {
          target.known_contact = { name: primary.name || null, title: primary.title || null };
          preflightEmail = primary.email || null;
        }
      }
    }
  } else {
    const { data: row, error } = await sb.from('crm_play_b')
      .select('company_name, domain, employees, industry, contact_name, contact_title, title_category, score')
      .eq('rank', rank).maybeSingle();
    if (error || !row) return jsonResponse(404, { error: `Play B rank ${rank} not found` });
    Object.assign(target, {
      kind: 'net_new_lookalike',
      company: row.company_name, domain: row.domain, employees: row.employees,
      industry: row.industry, lookalike_score: row.score,
      known_contact: { name: row.contact_name, title: row.contact_title, title_category: row.title_category },
    });
    preflightDomain = row.domain;
    if (row.domain && row.contact_name) {
      const { data: oc } = await sb.from('outreach_contacts')
        .select('email').eq('company', row.company_name).limit(1).maybeSingle();
      if (oc?.email) preflightEmail = oc.email;
    }
  }

  // 2. Read-only pre-flight context
  let gate = null;
  try {
    gate = await preflight(sb, { email: preflightEmail, domain: preflightDomain });
  } catch (e) {
    gate = { recommendation: 'unknown', error: e.message };
  }

  // 2b. Proven patterns: top real Shortcut emails by measured reply rate.
  // Grounds the draft in "what actually converted", not just brand voice.
  // Degrades silently if the corpus isn't ingested yet (table empty/absent).
  let provenPatterns = [];
  try {
    const { data: tpls } = await sb.from('outreach_templates')
      .select('subject, body, reply_rate, sent, campaign_name')
      .gte('sent', 25)
      .not('body', 'is', null)
      .order('reply_rate', { ascending: false })
      .limit(12);
    provenPatterns = (tpls || [])
      .filter((t) => t.body && t.body.trim().length > 80)
      .slice(0, 3)
      .map((t, i) => `Pattern ${i + 1} (replied ${(Number(t.reply_rate) * 100).toFixed(0)}% over ${t.sent} sends)\n`
        + `Subject: ${t.subject || '(continues thread, no subject)'}\n`
        + `${t.body.slice(0, 700)}`);
  } catch { /* corpus optional */ }

  // 3. Draft via Claude
  const userContent = [
    `Prospect context (JSON):`,
    JSON.stringify(target, null, 2),
    ``,
    `Pre-flight history (JSON, read-only — use to inform tone, do not mention it explicitly):`,
    JSON.stringify(gate, null, 2),
    ``,
    provenPatterns.length
      ? `PROVEN PATTERNS — real Shortcut emails with the highest measured reply rates. These earned replies from buyers like this one. Do NOT copy them. Study what works (the hook, the length, how direct the ask is, the register) and apply that to THIS prospect in Shortcut's voice:\n\n${provenPatterns.join('\n\n---\n\n')}\n`
      : ``,
    repName ? `Sign emails from: ${repName}` : `No rep name provided — sign "Best," with no name.`,
    followup
      ? `This is a FOLLOW-UP (touch #${target.this_is_touch_number}) to someone who has NOT replied to a prior email about ${target.days_since_last_email ?? 'a few'} days ago. Keep it short, warm, and low-pressure. Briefly reference that you reached out before, then add a fresh reason to reply (a new angle, a concrete offer, or a single easy question). Do NOT just say "bumping this" or "circling back". No guilt, no pressure. It will be sent on the same email thread, so do not re-introduce Shortcut from scratch.`
      : play === 'A' && target.kind === 're_engage_lapsed_client'
        ? `This is a RE-ENGAGEMENT. They are a past client but it has been about ${target.months_since_last_event ?? 'several'} months since their last event with us. Acknowledge the gap naturally and without apology or guilt. Reference the prior work warmly, then give a concrete, specific reason to come back now (a new offering, a seasonal moment, a fresh idea for their teams). Do NOT pitch as if they have never heard of us, and do NOT pretend it has been business-as-usual.`
        : play === 'A'
          ? `This is an EXISTING, currently-active client we want to expand to more of their offices/teams. Acknowledge the existing relationship warmly and specifically. Do not pitch as if they have never heard of us.`
          : `This is a NET-NEW prospect who looks like our best-fit winning customers. They do not know us yet.`,
  ].filter(Boolean).join('\n');

  let result;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    result = JSON.parse(jsonStr);
  } catch (e) {
    return jsonResponse(502, { error: `Draft generation failed: ${e.message}` });
  }

  return jsonResponse(200, {
    success: true,
    play: play || (followup ? 'followup' : null),
    rank: Number.isFinite(rank) ? rank : null,
    target,
    preflight: gate,
    drafts: result.directions || [],
    fight_for: result.fight_for || null,
    fight_for_reason: result.fight_for_reason || null,
    grounding_note: provenPatterns.length
      ? `Grounded on prospect context, brand voice, and ${provenPatterns.length} top-performing real Shortcut emails by measured reply rate.`
      : 'Grounded on prospect context + brand voice. Winning-template corpus not yet ingested.',
  });
};
