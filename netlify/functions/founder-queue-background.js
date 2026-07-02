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
 * HARD RULES (the personal lane): DRAFTS ONLY — Will sends every email by hand.
 * No tracking, no sequencer, volume capped (default 5/run, ramp to 10-15).
 * gmail-sent-crawl attributes sends automatically once he hits Send.
 *
 * POST body: { max?:5, dryRun?:bool, audience?:'brokers', only?:'email' }
 * Env: SUPABASE_*, ANTHROPIC_API_KEY, PRO_SLACK_BOT_TOKEN.
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { leadPicture } from './lib/lead-picture.js';
import { buildDraftPreviewBlocks } from './lib/slack-blocks.js';
import { getAccessToken, createDraft, lc } from './lib/gmail.js';

const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';
const SLACK_API = 'https://slack.com/api';
const WILL = 'will@getshortcut.co';
const DEFAULT_MAX = 5;   // ramp: wk1 ~5/day, wk2 ~10, ceiling 15 (founder_outreach_lane.md)

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

// ---- Will's live voice exemplars: recent real sent mail (external, plain text).
async function recentSentBodies(accessToken, n = 3) {
  try {
    const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('in:sent -to:getshortcut.co newer_than:60d')}&maxResults=15`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());
    const out = [];
    for (const m of list.messages || []) {
      if (out.length >= n) break;
      const msg = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json());
      const part = (function find(p) {
        if (!p) return null;
        if (p.mimeType === 'text/plain' && p.body?.data) return p;
        for (const c of p.parts || []) { const f = find(c); if (f) return f; }
        return null;
      })(msg.payload);
      if (!part) continue;
      let text = Buffer.from(part.body.data, 'base64url').toString('utf8');
      text = text.split(/\r?\nOn .{5,80}wrote:\r?\n/)[0].split(/\r?\n>{1}/)[0].trim(); // strip quoted thread
      if (text.length >= 120 && text.length <= 1600) out.push(text.slice(0, 900));
    }
    return out;
  } catch (e) {
    console.warn('voice exemplars fetch failed (non-fatal):', e.message);
    return [];
  }
}

const NOTE_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string', description: '1-4 words, lowercase internal-note style, no sell words' },
    body: { type: 'string', description: "the founder note, 50-100 words, plain text with \\n line breaks, signed exactly:\\n\\nWill\\nFounder, Shortcut\\ngetshortcut.co" },
    research_note: { type: 'string', description: 'one line for Will: the specific thing you found and used (or "nothing specific found — used firm-level angle")' },
    linkedin_step: { type: 'string', description: "today's LinkedIn action for Will for this person, one line (e.g. 'comment on her post about X, then blank connect')" },
  },
  required: ['subject', 'body', 'research_note', 'linkedin_step'],
};

function voiceSystem(exemplars, audience) {
  return `You draft 1:1 networking emails for Will Newton, founder and CEO of Shortcut (getshortcut.co) — premium on-site wellness (chair massage, nails, facials, mindfulness) for companies like BCG and DraftKings, 500+ companies served, 87% rebook. You write AS Will, in his voice.

WILL'S VOICE (non-negotiable): calm, human, practical, operator-direct. Writes like a busy founder to a peer: short sentences, zero fluff, zero sales energy, warm but never gushing. No buzzwords ever (elevate, leverage, synergy, unlock, empower, transform, seamless, holistic, curated are BANNED). No dashes as punctuation (end the sentence instead). No exclamation points. Specifics over superlatives.
${exemplars.length ? `\nREAL EXAMPLES OF WILL'S SENT EMAILS (match this register, rhythm, and warmth — do NOT copy content):\n${exemplars.map((e, i) => `--- example ${i + 1} ---\n${e}`).join('\n')}\n` : ''}
THE MOTION: founder-to-peer networking, NOT sales outreach. First touch. The goal is a conversation, not a meeting. Josh Braun style: open with a TRUE, SPECIFIC observation about THEM that proves Will did the work, one thought connecting it to Will's world, one low-pressure illumination question. 50-110 words. NO links, NO attachments, NO calendar ask, NO "15 minutes" ask.

INTRODUCE WILL AND SHORTCUT CLEARLY (Will's requirement, 2026-07-02): early in the note, one plain human sentence that says who he is and what Shortcut does in concrete terms, e.g. "I'm Will, I run Shortcut. We bring wellness days into offices, chair massage, nails, facials, mindfulness, for teams like BCG and DraftKings." Never assume they can infer what Shortcut is. This intro sentence is exempt from the observation-first rule (observation first, intro second is the natural order).

HUMAN TOUCH (fight the template feel): write like Will typed it between meetings. Small natural connectives are good ("honestly", "to be candid", "we keep running into this"). One sentence may be conversational filler if it earns warmth. Contractions everywhere. It should read like a person who is curious about THEM, not a company introducing itself. If any sentence could appear in a mass email, rewrite it.

RESEARCH FIRST (you have web search, up to 3 searches): search the person and their firm for something real and recent — a post, a firm announcement, a niche they own, an award, a client win. The observation must be checkable and specific ("your note last month on PBM transparency", "Alera picking up two Boston shops this spring").
HONESTY RULE (hard): if the searches surface nothing specific about the PERSON, use the firm-level angle from the context instead, framed honestly. NEVER imply Will read/saw something that does not exist. NEVER invent posts, quotes, news, or mutuals. A slightly less personal true note beats a fake-personal one every time.

${audience === 'brokers'
    ? `AUDIENCE: employee-benefits broker (producer/consultant). This is CHANNEL COURTSHIP, not a pitch. THE CORE MESSAGE (get this exactly right): Will is offering to help the BROKER help their CLIENTS deploy carrier wellness funds they are otherwise forfeiting — making the broker the hero at renewal. The mechanics that make it credible (weave in ONE, naturally): most carriers allot these dollars per plan year and clients forfeit what they do not use (Cigna Health Improvement Fund, Aetna Wellness Allowance, Anthem wellness fund); deploying them means carrier pre-approval and receipt/invoice paperwork most HR teams never get around to; Shortcut removes that friction end to end.
THE RECEIPT (use this, it is real and this audience's proof): Burberry pays for Shortcut chair massage through their Aetna Wellness Allowance, with no invoice friction for the HR team. (BCG/DraftKings are secondary here.)
WHERE WILL'S CREDIBILITY COMES FROM (hard honesty rule, Will 2026-07-02): Will's ground truth is the CLIENT side, not the broker side — this is his first broker outreach, so he can NEVER claim broker conversations ("I keep running into brokers...", "brokers tell me...") — he cannot back that up. What he CAN say, because it is true: he talks to companies every week, and a striking number are sitting on unused Cigna/Aetna wellness dollars or do not even know the fund exists; Shortcut helps them deploy those dollars on services their teams actually use (over 90% of slots get booked). Frame every observation from that client-side vantage: Will is telling the broker what he sees inside the broker's client demographic.
FUND-ELIGIBLE SERVICES (hard fact, Will 2026-07-02): carrier wellness funds cover ONLY these Shortcut services: chair massage, assisted stretch, sound baths, mindfulness, and nutrition coaching. Nails, facials, headshots and grooming are on Shortcut's general menu but are NOT fund-payable — in a broker note (which is entirely about fund deployment) name ONLY the eligible services, including in the who-we-are intro sentence.
LOCATION: anchor the note in the broker's metro when their location is known (e.g. "your Philly clients", "your groups in Connecticut") — it is in the prospect JSON.
THE ASK: a "would this land" peer question about THEIR book — if research surfaced a named client of theirs, ask about that client specifically ("would the same setup land with [client]?"); otherwise book-level ("do any of your Cigna or Aetna groups have fund dollars still sitting there this plan year?"). Offering to send the one-pager is a good soft close.
NEVER: say "partnership", mention referral fees/revenue/compensation (first touch is comp-free, always), ask for referrals outright, or pitch Shortcut as the point — the point is making THEM look good to their clients.`
    : `AUDIENCE: executive (CEO/COO/CHRO/Head of People) at an emerging tech company. Founder-to-founder/peer framing in sentence one. Tie the observation to the moment they are in (post-raise scaling, RTO, first People hire). One real proof point maximum (500+ companies, 87% rebook, or BCG/DraftKings). Close with an interest question, not a meeting ask.`}

Report by calling report_note exactly once, AFTER your research. Body is plain text with real line breaks: greeting line, blank line, 2-3 short paragraphs, blank line, then exactly:\nWill\nFounder, Shortcut\ngetshortcut.co`;
}

// Carrier funds cover ONLY: chair massage, assisted stretch, sound baths,
// mindfulness, nutrition coaching (Will, 2026-07-02). A broker note is entirely
// about fund deployment, so naming a non-eligible service there misstates
// eligibility to the exact audience that would catch it — hard reject.
const NON_FUND_SERVICES_RE = /\b(nails?|manicures?|facials?|headshots?|grooming|barber|hair)\b/i;
// Will can't back up broker-side experience (first broker outreach) — his ground
// truth is CLIENT conversations. Reject drafts that fabricate broker relationships.
const FAKE_BROKER_EXPERIENCE_RE = /\b(keep )?(running into|talk(ing)? (to|with)|hear(ing)? from|work(ing)? with) (a lot of |many |other )?brokers\b|\bbrokers (tell|keep telling) me\b/i;

async function draftNote(anthropic, { lead, firm, exemplars, audience }) {
  const userContent = [
    'THE PERSON (JSON, trusted):',
    JSON.stringify({
      name: lead.name, title: lead.title, company: lead.company,
      location: lead.location || null,
      firm_tier: firm?.tier || null, firm_priority_why: firm?.why || null, nyc_presence: firm?.nyc_presence ?? null,
    }, null, 2),
    '',
    'Research them (person first, then firm), then call report_note once with the note in Will\'s voice.',
  ].join('\n');

  let resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: 4000, temperature: 0.4,
    system: voiceSystem(exemplars, audience),
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
      { name: 'report_note', description: 'Report the finished founder note. Call exactly once, after researching.', input_schema: NOTE_SCHEMA },
    ],
    messages: [{ role: 'user', content: userContent }],
  });
  let tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  if (!tu) {
    const critique = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 2000, temperature: 0.4,
      system: voiceSystem(exemplars, audience),
      tools: [{ name: 'report_note', description: 'Report the finished founder note.', input_schema: NOTE_SCHEMA }],
      tool_choice: { type: 'tool', name: 'report_note' },
      messages: [
        { role: 'user', content: userContent },
        { role: 'assistant', content: critique || '(research complete)' },
        { role: 'user', content: 'Call report_note now with the finished note.' },
      ],
    });
    tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  }
  if (!tu) throw new Error('no report_note from drafter');
  const n = tu.input;
  // deterministic guardrails (brand-hard rules) — fail loudly, the run skips the lead
  const all = `${n.subject} ${n.body}`;
  if (/[—–]|\s-\s/.test(all)) throw new Error('draft used a dash as punctuation');
  if (/!/.test(all)) throw new Error('draft used an exclamation point');
  for (const w of ['elevate', 'leverage', 'synergy', 'unlock', 'empower', 'transform', 'reimagine', 'seamless', 'holistic', 'curated']) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(all)) throw new Error(`draft used banned word: ${w}`);
  }
  if (/https?:\/\//.test(n.body.replace(/getshortcut\.co/g, ''))) throw new Error('draft included a link (first touch is link-free)');
  if (audience === 'brokers' && NON_FUND_SERVICES_RE.test(n.body)) throw new Error('broker note names a non-fund-eligible service (funds cover only massage, assisted stretch, sound bath, mindfulness, nutrition coaching)');
  if (audience === 'brokers' && FAKE_BROKER_EXPERIENCE_RE.test(n.body)) throw new Error('broker note claims broker-side experience Will cannot back up — credibility comes from CLIENT conversations');
  return n;
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

  // Will's account (Slack + Gmail + user id).
  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, slack_user_id, supabase_user_id').eq('email', WILL).maybeSingle();
  if (!acct?.slack_user_id) return { statusCode: 500, body: 'will@ not connected (gmail_accounts.slack_user_id)' };

  // ---- TARGETS (brokers v1): priority-ranked, sendable, never personally contacted.
  const { data: firms } = await sb.from('crm_target_firms').select('id, display_name, tier, track, why, nyc_presence, priority_rank');
  const firmById = new Map((firms || []).map((f) => [f.id, f]));
  let rows = [];
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('outreach_contacts')
      .select('email, name, title, company, location, mv_status, bounceban_status, broker_firm_id, broker_priority_rank, channel')
      .not('broker_firm_id', 'is', null).range(f, f + 999);
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
  // one contact per firm per day (spread the courtship), then priority order
  rows.sort((a, b) => (a.broker_priority_rank ?? 9e9) - (b.broker_priority_rank ?? 9e9));
  const seenFirm = new Set(); const targets = [];
  for (const r of rows) {
    if (targets.length >= max) break;
    const fid = r.broker_firm_id;
    if (seenFirm.has(fid)) continue;
    seenFirm.add(fid); targets.push(r);
  }

  if (dryRun) {
    return { statusCode: 200, body: JSON.stringify({ dryRun: true, audience, max, candidates: rows.length, today: targets.map((t) => ({ email: t.email, name: t.name, company: t.company, firm: firmById.get(t.broker_firm_id)?.display_name })) }) };
  }
  if (!targets.length) return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'no eligible targets', candidates: rows.length }) };

  // Voice exemplars once per run.
  const tok = await getAccessToken(sb, WILL);
  const exemplars = await recentSentBodies(tok, 3);

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

      const note = await draftNote(anthropic, { lead: t, firm, exemplars, audience });

      // Gmail draft — minimal inline sign-off, NO heavy signature (cold first-touch rule).
      let gmailDraftId = null; let gmailMessageId = null;
      try {
        const d = await createDraft(tok, { from: WILL, to: lc(t.email), subject: note.subject, body: note.body, signatureHtml: null, threadId: null });
        gmailDraftId = d.id; gmailMessageId = d.messageId;
      } catch (e) { console.warn(`gmail draft failed for ${t.email}:`, e.message); }

      const { data: saved, error: saveErr } = await sb.from('saved_drafts').insert({
        user_id: acct.supabase_user_id,
        recipient_email: lc(t.email),
        subject: note.subject, body: note.body, direction_label: 'founder',
        source_company: t.company, source_contact: t.name, source_title: t.title,
        target_kind: 'founder_note',
        target_ref: {
          audience, firm: firm?.display_name || null, tier: firm?.tier || null,
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
        ].filter(Boolean).join('\n') } };
        const preview = buildDraftPreviewBlocks(
          { who, email: lc(t.email), draftId: saved.id, threadId: null, repEmail: WILL, signatureText: null, gmailDraftId, gmailMessageId },
          { label: 'founder', subject: note.subject, body: note.body }, null,
        );
        await slackPost('chat.postMessage', { channel, text: `Founder note ready: ${who}`, blocks: [{ type: 'divider' }, context, ...preview], unfurl_links: false, unfurl_media: false });
      }
      results.push({ email: t.email, status: 'drafted', draftId: saved.id });
    } catch (e) {
      results.push({ email: t.email, status: 'error', error: e.message });
    }
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true, audience, drafted: results.filter((r) => r.status === 'drafted').length, results }) };
};
