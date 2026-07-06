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
    body: { type: 'string', description: "the founder note, 50-100 words, plain text; separate paragraphs with a BLANK line (\\n\\n), ending with the sign-off: 'Cheers!' or 'Thanks!' then '\\nWill'. No company block after (his Gmail signature is appended separately)." },
    research_note: { type: 'string', description: 'one line for Will: the specific thing you found and used (or "nothing specific found — used firm-level angle")' },
    linkedin_step: { type: 'string', description: "today's LinkedIn action for Will for this person, one line (e.g. 'comment on her post about X, then blank connect')" },
  },
  required: ['subject', 'body', 'research_note', 'linkedin_step'],
};

function voiceSystem(exemplars, audience, ctaVariant = 'help') {
  return `You draft 1:1 networking emails for Will Newton, founder and CEO of Shortcut (getshortcut.co) — premium on-site wellness (chair massage, nails, facials, mindfulness) for companies like BCG and DraftKings, 500+ companies served, 87% rebook. You write AS Will, in his voice.

WILL'S VOICE (non-negotiable): calm, warm, casual, practical. He writes like a busy founder dashing off a note to a peer he'd like to know, not like a company. Soft energy, zero sales push, curious about THEM. No buzzwords ever (elevate, leverage, synergy, unlock, empower, transform, seamless, holistic, curated, delve, pivotal, foster, streamline, navigate, landscape are BANNED). No dashes as punctuation (end the sentence instead). Specifics over superlatives. Plain verbs: things ARE and HAVE, they never "serve as" or "boast".

RHYTHM (this is what makes it read human): vary sentence length a lot. At least one very short sentence. Never three sentences in a row with the same shape. No rule-of-three lists, no "not just X, but Y" constructions, no tidy parallel clauses. One small human aside is welcome (a parenthetical, a fragment, a sentence starting with And, But, or Honestly). If every sentence is the same medium length and perfectly balanced, it smells like AI. Read it aloud in your head: if Will wouldn't say the phrase to a friend, cut it.
${exemplars.length ? `\nREAL EXAMPLES OF WILL'S SENT EMAILS (match this register, rhythm, and warmth — do NOT copy content):\n${exemplars.map((e, i) => `--- example ${i + 1} ---\n${e}`).join('\n')}\n` : ''}
THE MOTION: founder-to-peer networking, NOT sales outreach. First touch. The goal is a conversation, not a meeting. Open with a TRUE, SPECIFIC observation about THEM when one exists (see OBSERVATION BAR), one thought connecting it to Will's world, one low-pressure question. 50-110 words, shorter is better when nothing is lost. NO links, NO attachments, NO calendar link ever, NO "15 minutes" phrasing. (Exception: the broker convo CTA variant may invite a short call — see THE ASK.)

SIGN-OFF (Will 2026-07-06): end with "Cheers!" or "Thanks!" on its own line, then "Will" on the next line. Nothing after (his Gmail signature is appended automatically). That sign-off is the ONLY exclamation mark in the whole email, and it stays: it reads warm, and gratitude closes get the most replies.

INTRODUCE WILL AND SHORTCUT CLEARLY (Will's requirement, 2026-07-02): early in the note, one plain human sentence that says who he is and what Shortcut does in concrete terms, e.g. "I'm Will, I run Shortcut. We bring wellness days into offices, chair massage, nails, facials, mindfulness, for teams like BCG and DraftKings." Never assume they can infer what Shortcut is. This intro sentence is exempt from the observation-first rule (observation first, intro second is the natural order).

HUMAN TOUCH (fight the template feel): write like Will typed it between meetings. Small natural connectives are good ("honestly", "to be candid", "we keep running into this"). Contractions everywhere. It should read like a person who is curious about THEM, not a company introducing itself. Never open with "I hope this finds you well" or any stock pleasantry. If any sentence could appear in a mass email, rewrite it.

RESEARCH FIRST (you have web search, up to 3 searches): search the person and their firm for something real and recent — a post, a firm announcement, a niche they own, an award, a client win. The observation must be checkable and specific.
OBSERVATION BAR (Will 2026-07-06, calibrate on these): a personal or firm find is usable ONLY if it connects to the note's actual thread ON ITS FACE — their wellbeing/benefits practice or role, their clients, their metro, something they wrote about wellness, benefits, or budgets. If connecting it takes a thematic bridge or a shared-value abstraction, it is FORCED: drop it and use the firm or metro angle instead.
  GOOD (flows with the sell): "Given EPIC's Wellbeing & Health Management practice, I'm curious whether you're seeing this with your New York clients on those carriers." The find IS the thread.
  FORCED (never do this): "I saw you're a Health Rosetta advisor. That transparency focus is exactly what I keep running into on the carrier wellness fund side." Credential → "transparency" → funds is a bolted-on bridge. A note with no personal line beats this every time.
RECENCY (part of the bar): an observation framed as news ("I saw you...", "congrats on...") must be from the last ~6 months. Older facts are fine ONLY as standing facts ("you run People across 12 countries"), never with I-just-saw framing. A 2023 promotion presented as fresh news reads as lazy scraping the moment they notice the date.
If the firm context includes a CONTENT HOOK (a verified piece of the firm's own published content), referencing it naturally is the best possible observation. Only reference content named in the context or found in YOUR OWN searches this run.
HONESTY RULE (hard): if the searches surface nothing specific about the PERSON, use the firm-level angle from the context instead, framed honestly. NEVER imply Will read/saw something that does not exist. NEVER invent posts, quotes, news, or mutuals. A slightly less personal true note beats a fake-personal one every time.
CLIENT CLAIMS ARE CLOSED-WORLD (hard): the only facts about Shortcut's clients you may state are the ones IN THIS PROMPT (BCG and DraftKings, 500+ companies, 87% rebook, over 90% of slots get booked${audience === 'brokers' ? ', the Burberry/Aetna receipt' : ''}). NEVER invent client categories or segments ("we work with a few gaming studios", "our law-firm clients tell us") — you do not know the roster. Tie the note to their world through THEIR context, not through made-up client overlap.

${audience === 'brokers'
    ? `AUDIENCE: employee-benefits broker (producer/consultant). This is CHANNEL COURTSHIP, not a pitch. THE CORE MESSAGE (get this exactly right): Will is offering to help the BROKER help their CLIENTS deploy carrier wellness funds they are otherwise forfeiting — making the broker the hero at renewal. The mechanics that make it credible (weave in ONE, naturally): most carriers allot these dollars per plan year and clients forfeit what they do not use (Cigna Health Improvement Fund, Aetna Wellness Allowance, Anthem wellness fund); deploying them means carrier pre-approval and receipt/invoice paperwork most HR teams never get around to; Shortcut removes that friction end to end.
THE RECEIPT (use this, it is real and this audience's proof), phrased exactly as a partnership: "Our partner Burberry pays for Shortcut chair massage through their Aetna Wellness Allowance, no invoice friction for the HR team." (BCG/DraftKings are secondary here.)
THE WHY (Will's approved explanation for unused funds, 2026-07-02): companies either DO NOT KNOW these funds exist, or CANNOT FIND a valued, easy partner to deploy them with. Lead with that. Never claim "most HR teams never get around to the paperwork" or similar unbackable generalizations — paperwork friction may appear only as light supporting color for why deployment feels hard, never as the headline claim.
PHRASING THE DEMOGRAPHIC: in observations say "companies", "the companies I talk to", or "our partners" — NEVER "your clients" outside a direct question ("a striking number of your clients..." reads accusatory and asserts knowledge of their book).
WHERE WILL'S CREDIBILITY COMES FROM (hard honesty rule, Will 2026-07-02): Will's ground truth is the CLIENT side, not the broker side — this is his first broker outreach, so he can NEVER claim broker conversations ("I keep running into brokers...", "brokers tell me...") — he cannot back that up. What he CAN say, because it is true: he talks to companies every week, and a striking number are sitting on unused Cigna/Aetna wellness dollars or do not even know the fund exists; Shortcut helps them deploy those dollars on services their teams actually use (over 90% of slots get booked). Frame every observation from that client-side vantage: Will is telling the broker what he sees inside the broker's client demographic. NEVER disclose or comment on Will's own outreach in the note itself (no "this is my first broker outreach", no "I don't usually email brokers") — the honesty rule governs what he can CLAIM, it is not something to confess; a repeated "first" becomes a lie at scale. And Will NEVER asserts facts about THIS broker's own book ("a striking number of your clients are sitting on...") — he has not seen their book. Observations are always about companies WILL talks to; only QUESTIONS may reference the broker's clients ("Do any of your clients on Cigna...?").
FUND-ELIGIBLE SERVICES (hard fact, Will 2026-07-02): carrier wellness funds cover ONLY these Shortcut services: chair massage, assisted stretch, sound baths, mindfulness, and nutrition coaching. Nails, facials, headshots and grooming are on Shortcut's general menu but are NOT fund-payable — in a broker note (which is entirely about fund deployment) name ONLY the eligible services, including in the who-we-are intro sentence.
LOCATION: anchor the note in the broker's metro when their location is known (e.g. "your Philly clients", "your groups in Connecticut") — it is in the prospect JSON.
${ctaVariant === 'convo'
    ? `THE ASK (CONVO variant — under A/B test, Will 2026-07-02): invite a short conversation about how Will can help THE BROKER help their clients deploy these funds — e.g. "Open to a short call on how this could work for your clients?" or "Worth a quick conversation? I can walk you through how we make this easy for your clients." Soft and warm: no calendar link, no "15 minutes", no times proposed. The subtext (never stated as their incentive): their clients deploying these funds is a win the broker delivers at renewal.`
    : `THE ASK (HELP variant, Will 2026-07-02): close by asking whether this is something Will can HELP with — e.g. "Is this something I could help your Philly clients with?" or "Do any of your clients on Cigna or Aetna have fund dollars still sitting there this plan year? Happy to help them put those to use." The posture is offering help, never seeking validation. Offering to send the one-pager is a good soft close.`}
LANGUAGE: never call employers "groups" (insurance jargon Will does not use) — say clients, companies, or partners.
STRUCTURE (hard): 4 to 5 SHORT paragraphs separated by blank lines, each carrying ONE idea in at most two sentences. The Burberry receipt is ALWAYS its own one-sentence paragraph. If research produced a personal observation, it must connect to the fund thread within a sentence — an unconnected compliment reads as bolted-on research; if it cannot connect naturally, drop it and use the firm or metro angle instead.
NEVER: say "partnership", mention referral fees/revenue/compensation (first touch is comp-free, always), ask for referrals outright, or pitch Shortcut as the point — the point is making THEM look good to their clients.`
    : `AUDIENCE: executive (CEO/COO/CHRO/Head of People) at an emerging tech company (~100-500 people). Founder-to-founder framing: Will also runs a company, he knows the stage they're at. THE MOMENT is the observation — tie the note to what they're living through right now (just raised and hiring fast, RTO push, office move, first People hire, trying to make the office worth the commute). The same OBSERVATION BAR applies: the trigger must be real and checkable; a fundraise or job posting IS the thread, an abstract "saw you value culture" is not.
WHAT SHORTCUT IS FOR THEM: wellness days in the office people actually book — chair massage, mindfulness, that kind of thing (full menu includes nails, facials, headshots). Over 90% of slots get booked when we run a day. Use ONE proof point maximum (500+ companies, 87% rebook, or BCG/DraftKings at every US office).
THE ASK: an interest question, never a meeting ask ("Worth a look for {company}?", "Is this on your radar for the office push?"). No calendar link, no "15 minutes".`}

Report by calling report_note exactly once, AFTER your research. Body is plain text with real line breaks: greeting line, blank line, 2-4 short paragraphs, blank line, then the sign-off exactly:\nCheers!\nWill   (or Thanks! instead of Cheers!)`;
}

// Carrier funds cover ONLY: chair massage, assisted stretch, sound baths,
// mindfulness, nutrition coaching (Will, 2026-07-02). A broker note is entirely
// about fund deployment, so naming a non-eligible service there misstates
// eligibility to the exact audience that would catch it — hard reject.
const NON_FUND_SERVICES_RE = /\b(nails?|manicures?|facials?|headshots?|grooming|barber|hair)\b/i;
// Will can't back up broker-side experience (first broker outreach) — his ground
// truth is CLIENT conversations. Reject drafts that fabricate broker relationships.
const FAKE_BROKER_EXPERIENCE_RE = /\b(keep )?(running into|talk(ing)? (to|with)|hear(ing)? from|work(ing)? with) (a lot of |many |other )?brokers\b|\bbrokers (tell|keep telling) me\b/i;

async function draftNote(anthropic, { lead, firm, exemplars, audience, ctaVariant }) {
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
    system: voiceSystem(exemplars, audience, ctaVariant),
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
      system: voiceSystem(exemplars, audience, ctaVariant),
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
  return { ...tu.input, body: normalizeParagraphs(tu.input.body || '') };
}

// The model sometimes separates paragraphs with SINGLE newlines; the chunky-
// paragraph guard then sees one giant paragraph and kills the note (cause of the
// Jul 6 morning + evening skips). Normalize: if the body has no blank lines,
// promote sentence-ending single breaks to paragraph breaks (sign-off stays tight).
function normalizeParagraphs(body) {
  if (/\n\s*\n/.test(body)) return body;
  return body.replace(/([.?!])\n(?!\n)(?!Will\s*$)/g, '$1\n\n');
}

// Deterministic guardrails (brand-hard rules) — throw loudly; the run skips the lead.
function guardNote(n, audience) {
  const all = `${n.subject} ${n.body}`;
  if (/[—–]|\s-\s/.test(all)) throw new Error('draft used a dash as punctuation');
  // Exclamation marks: banned everywhere EXCEPT the sign-off line ("Cheers!" or
  // "Thanks!"), which Will explicitly wants (2026-07-06) — warm, human close.
  const withoutSignoff = all.replace(/^(Cheers!|Thanks!)$/gm, '');
  if (/!/.test(withoutSignoff)) throw new Error('draft used an exclamation point outside the Cheers!/Thanks! sign-off');
  if (!/\n(Cheers!|Thanks!)\n+Will\s*$/.test(n.body)) throw new Error("draft must end with 'Cheers!' or 'Thanks!' then 'Will' (no company block — the signature is appended)");
  for (const w of ['elevate', 'leverage', 'synergy', 'unlock', 'empower', 'transform', 'reimagine', 'seamless', 'holistic', 'curated',
    // AI-lexicon additions (voice research 2026-07-06): statistically overrepresented LLM words
    'delve', 'pivotal', 'underscore', 'showcase', 'foster', 'landscape', 'navigate', 'realm', 'testament', 'tapestry', 'meticulous', 'streamline', 'additionally']) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(all)) throw new Error(`draft used banned word: ${w}`);
  }
  if (/hope this (email |message |note )?finds you/i.test(all)) throw new Error('draft opened with a stock AI pleasantry');
  if (/\bnot (just|only) [^.!?\n]{0,60}, but\b/i.test(n.body)) throw new Error('draft used "not just X, but Y" parallelism (top AI tell)');
  if (/https?:\/\//.test(n.body.replace(/getshortcut\.co/g, ''))) throw new Error('draft included a link (first touch is link-free)');
  // structure: short paragraphs, one idea each (Will 2026-07-02 — v5 shipped a 3-sentence chunk)
  for (const para of n.body.split(/\n\s*\n/)) {
    const words = para.trim().split(/\s+/).filter(Boolean).length;
    if (words > 46) throw new Error(`paragraph too chunky (${words} words) — separate each idea with a BLANK line (\\n\\n between paragraphs) and keep every paragraph to at most two short sentences`);
  }
  if (audience === 'brokers') {
    if (NON_FUND_SERVICES_RE.test(n.body)) throw new Error('broker note names a non-fund-eligible service (funds cover only massage, assisted stretch, sound bath, mindfulness, nutrition coaching)');
    if (FAKE_BROKER_EXPERIENCE_RE.test(n.body)) throw new Error('broker note claims broker-side experience Will cannot back up — credibility comes from CLIENT conversations');
    if (/\b(my|our) first (broker )?(outreach|note|email|message)\b|\bfirst time (I am|I'm|reaching|emailing|writing)\b/i.test(n.body)) throw new Error('broker note comments on Will\'s own outreach (a repeated "first" becomes false at scale)');
    if (/\bgroups?\b/i.test(n.body)) throw new Error('broker note says "group(s)" — insurance jargon Will does not use (say clients, companies, or partners)');
    // assertions about THE BROKER'S book are unbackable; questions are fine
    for (const sentence of n.body.split(/(?<=[.?])\s+/)) {
      if (/\b(your|their) [\w ]{0,16}clients\b/i.test(sentence) && !/\?\s*$/.test(sentence.trim()) && /\b(are|have|sit|sitting|keep|forfeit|lose|don't even know)\b/i.test(sentence)) {
        throw new Error(`broker note asserts facts about the broker's own book ("${sentence.trim().slice(0, 60)}...") — observations stay about companies Will talks to; only questions may reference their clients`);
      }
    }
  }
}

// THE BRAIN'S REVIEW TIER (generator ≠ evaluator, Will 2026-07-02): a separate
// skeptic pass reviews every note against Will's craft checklist before it
// reaches him; one revision attempt on failure. Mirrors the cold engine's
// composer↔evaluator loop — structure regressions die here, not in Will's Slack.
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean', description: 'true ONLY if every checklist item holds' },
    issues: { type: 'array', items: { type: 'string' }, description: 'each failed item, specifically' },
  },
  required: ['pass', 'issues'],
};
async function critiqueNote(anthropic, note, audience, ctaVariant = 'help') {
  const checklist = `You are the skeptical reviewer for Will's founder notes. Default to FAILING. Check every item:
1. STRUCTURE: 4-5 short paragraphs, each ONE idea, max two sentences. No chunky paragraphs. ${audience === 'brokers' ? 'The Burberry receipt sentence stands alone as its own paragraph.' : ''}
2. OBSERVATION (Will's bar, 2026-07-06): a personal research line is allowed ONLY if it connects to the note's thread ON ITS FACE (their wellbeing/benefits practice or role, their clients, their metro, something they wrote about wellness/benefits/budgets). A thematic bridge FAILS — e.g. "I saw you're a Health Rosetta advisor. That transparency focus is exactly what I keep running into on the fund side" is a bolted-on credential compliment, not a thread. Calibration GOOD: "Given EPIC's Wellbeing & Health Management practice, I'm curious whether you're seeing this with your New York clients." No personal line at all is a PASS; a forced one is a FAIL. Also FAIL any observation framed as fresh news ("I saw you...", "congrats on...") when the underlying fact is older than ~6 months; stale facts may only appear as standing facts.
3. INTRO: one plain sentence saying who Will is and what Shortcut does, in concrete services.
4. CLOSE: matches the CTA variant — either a help-posture question (offering to help) or, for the convo variant, a soft call invitation (no calendar link, no times). Never validation-seeking. Ends "Cheers!" or "Thanks!" then "Will" (the one exclamation mark allowed, nothing after).
5. VOICE: reads like a busy founder typed it — contractions, warm, casual, zero sales energy, no template smell. Sentence lengths VARY (at least one short punchy sentence; no run of same-shape sentences); no rule-of-three lists; no "not just X, but Y". If it is uniformly smooth and balanced, FAIL it as AI-sounding.
${audience === 'brokers' ? '6. LANGUAGE: no insurance jargon ("groups"); employers are clients/companies/partners. Only fund-eligible services named (chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching). Client-side credibility only.' : ''}
7. CLIENT CLAIMS: the only permitted client facts are BCG/DraftKings, 500+ companies, 87% rebook, 90%+ slots booked${audience === 'brokers' ? ', the Burberry/Aetna receipt' : ''}. FAIL any other claim about who Shortcut works with ("a few gaming studios", "our fintech clients") — invented roster overlap is fabrication.
Report via report_review, one issue string per failed item.`;
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: 1200, temperature: 0,
    system: checklist,
    tools: [{ name: 'report_review', description: 'Report the review verdict.', input_schema: REVIEW_SCHEMA }],
    tool_choice: { type: 'auto' },
    messages: [{ role: 'user', content: `THE NOTE:\nSubject: ${note.subject}\n\n${note.body}\n\nReview against the checklist, then call report_review once.` }],
  });
  let tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_review');
  if (!tu) {
    const critique = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    const resp2 = await anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 600, temperature: 0, system: checklist,
      tools: [{ name: 'report_review', description: 'Report the review verdict.', input_schema: REVIEW_SCHEMA }],
      tool_choice: { type: 'tool', name: 'report_review' },
      messages: [
        { role: 'user', content: `THE NOTE:\nSubject: ${note.subject}\n\n${note.body}` },
        { role: 'assistant', content: critique || '(reviewed)' },
        { role: 'user', content: 'Call report_review now.' },
      ],
    });
    tu = (resp2.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_review');
  }
  return tu?.input || { pass: true, issues: [] };
}

// One revision attempt with the skeptic's issues fed back (retry-once, like the composer).
async function reviseNote(anthropic, { note, issues, exemplars, audience, lead, firm, ctaVariant }) {
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: 2000, temperature: 0.4,
    system: voiceSystem(exemplars, audience, ctaVariant),
    tools: [{ name: 'report_note', description: 'Report the revised founder note.', input_schema: NOTE_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_note' },
    messages: [{ role: 'user', content: [
      'Your previous draft FAILED review. Fix every issue and re-report the full note (keep the research observation only if it can connect naturally):',
      ...issues.map((i) => `  - ${i}`),
      '',
      `PREVIOUS DRAFT:\nSubject: ${note.subject}\n\n${note.body}`,
      '',
      'THE PERSON (JSON):',
      JSON.stringify({ name: lead.name, title: lead.title, company: lead.company, location: lead.location || null, firm_tier: firm?.tier || null, firm_priority_why: firm?.why || null }, null, 2),
    ].join('\n') }],
  });
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  if (!tu) throw new Error('revision produced no note');
  // keep the original research trail; the revision only reworks copy
  return { ...tu.input, body: normalizeParagraphs(tu.input.body || ''), research_note: tu.input.research_note || note.research_note };
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

  // ---- TARGETS. brokers (v1): priority-ranked broker contacts. tech-execs (v2,
  // 2026-07-06): the founder-personal cohort from find-founder-targets.mjs
  // (source='founder-personal', channel='personal' — never in the cold pool).
  const { data: firms } = await sb.from('crm_target_firms').select('id, display_name, tier, track, why, nyc_presence, priority_rank');
  const firmById = new Map((firms || []).map((f) => [f.id, f]));
  let rows = [];
  for (let f = 0; ; f += 1000) {
    const q = sb.from('outreach_contacts')
      .select('email, name, title, company, location, mv_status, bounceban_status, broker_firm_id, broker_priority_rank, channel, source');
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
      let note = await draftNote(anthropic, { lead: t, firm, exemplars, audience, ctaVariant });
      // GATE: deterministic guards -> revise-once on violation (guard throws used
      // to skip the lead outright with no revision and no visibility)
      try { guardNote(note, audience); } catch (ge) {
        console.error(`guard hit for ${t.email}: ${ge.message} — revising`);
        note = await reviseNote(anthropic, { note, issues: [ge.message], exemplars, audience, lead: t, firm, ctaVariant });
        guardNote(note, audience);
      }
      // the brain's review tier: skeptic pass + one revision (generator ≠ evaluator)
      const review = await critiqueNote(anthropic, note, audience, ctaVariant);
      if (!review.pass && review.issues.length) {
        note = await reviseNote(anthropic, { note, issues: review.issues, exemplars, audience, lead: t, firm, ctaVariant });
        guardNote(note, audience);
      }

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
        const preview = buildDraftPreviewBlocks(
          { who, email: lc(t.email), draftId: saved.id, threadId: null, repEmail: WILL, signatureText: null, gmailDraftId, gmailMessageId },
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
