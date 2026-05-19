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

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const DNC_RE = /\bunsubscribe\b|\bnot interested\b|\bremove me\b|\bdo not (contact|email)\b|\bopt[- ]?out\b|\bstop\b/i;

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

// --- Read-only pre-flight context (ported from scripts/preflight.mjs) ---

async function preflight(sb, { email, domain }) {
  email = lc(email);
  domain = domain ? lc(domain).replace(/^www\./, '') : null;
  const v = {
    suppressed: false, suppression_reason: null,
    is_client: false, client: null,
    contacted: false, send_count: 0, last_contact: null,
    recommendation: 'ok_to_proceed',
  };

  if (email) {
    const { data: s } = await sb.from('crm_suppression').select('reason').eq('email', email).maybeSingle();
    if (s) { v.suppressed = true; v.suppression_reason = s.reason; }
    if (!v.suppressed) {
      const { data: reps } = await sb.from('outreach_replies')
        .select('reply_sentiment, manual_category, reply_content').eq('email', email);
      for (const r of reps || []) {
        const txt = `${r.manual_category || ''} ${r.reply_content || ''}`;
        if (r.reply_sentiment === 'negative' || DNC_RE.test(txt)) {
          v.suppressed = true; v.suppression_reason = 'dnc_reply'; break;
        }
      }
    }
  }

  let companyId = null;
  if (email) {
    const { data: oc } = await sb.from('outreach_contacts')
      .select('crm_company_id').eq('email', email).not('crm_company_id', 'is', null).maybeSingle();
    if (oc) companyId = oc.crm_company_id;
  }
  let company = null;
  if (companyId) {
    const { data: c } = await sb.from('crm_companies')
      .select('canonical_key, display_name, trajectory, activity_status, completed_events')
      .eq('id', companyId).maybeSingle();
    company = c;
  } else if (domain) {
    const { data: c } = await sb.from('crm_companies')
      .select('canonical_key, display_name, trajectory, activity_status, completed_events')
      .contains('contact_domains', [domain]).limit(1).maybeSingle();
    company = c;
  }
  if (company && company.completed_events > 0) {
    v.is_client = true;
    v.client = { name: company.display_name, trajectory: company.trajectory, activity: company.activity_status };
  }

  if (email) {
    const { data: sends } = await sb.from('outreach_sends')
      .select('campaign_id, sent_time, reply_time').eq('email', email).order('sent_time', { ascending: false });
    if (sends && sends.length) {
      v.contacted = true;
      v.send_count = sends.length;
      const latest = sends[0];
      v.last_contact = { sent_at: latest.sent_time, replied: !!latest.reply_time };
    }
  }

  if (v.suppressed) v.recommendation = 'skip_suppressed';
  else if (v.is_client) v.recommendation = 'skip_already_client';
  else if (v.contacted && v.last_contact && !v.last_contact.replied
    && (Date.now() - new Date(v.last_contact.sent_at).getTime()) < 90 * 86400000) {
    v.recommendation = 'caution_recently_contacted';
  }
  return v;
}

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
  const play = body.play === 'A' ? 'A' : body.play === 'B' ? 'B' : null;
  const rank = Number(body.rank);
  if (!play || !Number.isFinite(rank)) {
    return jsonResponse(400, { error: 'Body must include play ("A"|"B") and a numeric rank' });
  }
  const repName = (body.repName && String(body.repName).trim()) || (user.email ? String(user.email).split('@')[0] : '');

  // 1. Load the ranked target
  const target = {};
  let preflightEmail = null;
  let preflightDomain = null;

  if (play === 'A') {
    const { data: row, error } = await sb.from('crm_play_a')
      .select('company_id, company_name, employees, industry, sites_served, sites_list, fit_score')
      .eq('rank', rank).maybeSingle();
    if (error || !row) return jsonResponse(404, { error: `Play A rank ${rank} not found` });
    Object.assign(target, {
      kind: 'expand_existing_client',
      company: row.company_name, employees: row.employees, industry: row.industry,
      sites_we_serve: row.sites_served, sites_list: row.sites_list, fit_score: row.fit_score,
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

  // 3. Draft via Claude
  const userContent = [
    `Prospect context (JSON):`,
    JSON.stringify(target, null, 2),
    ``,
    `Pre-flight history (JSON, read-only — use to inform tone, do not mention it explicitly):`,
    JSON.stringify(gate, null, 2),
    ``,
    repName ? `Sign emails from: ${repName}` : `No rep name provided — sign "Best," with no name.`,
    play === 'A'
      ? `This is an EXISTING client we want to expand to more of their offices/teams. Acknowledge the existing relationship warmly and specifically. Do not pitch as if they have never heard of us.`
      : `This is a NET-NEW prospect who looks like our best-fit winning customers. They do not know us yet.`,
  ].join('\n');

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
    play,
    rank,
    target,
    preflight: gate,
    drafts: result.directions || [],
    fight_for: result.fight_for || null,
    fight_for_reason: result.fight_for_reason || null,
    grounding_note: 'v1: grounded on prospect context + brand voice. Winning-template corpus not yet ingested.',
  });
};
