/**
 * founder-note.js — the founder-note COMPOSE ENGINE, shared by the Netlify
 * function (founder-queue-background.js) and the local runner
 * (scripts/draft-founder-note-local.mjs). See memory/founder_outreach_lane.md
 * (task #10, Will 2026-07-06): voice/prompt/gate iteration must be editable and
 * testable WITHOUT a Netlify deploy per tweak. Both callers import this module,
 * so what runs locally is byte-identical to what runs in production.
 *
 * PURE of infrastructure: no Supabase, no Slack, no Gmail-draft creation. The
 * ONE external dependency is the Anthropic client (passed in) and, optionally,
 * a Gmail access token for the live voice exemplars.
 *
 * The full pipeline (draft → guard → up to 2 revisions → skeptic critique → 1
 * revision → final guard) lives in composeNote(); the granular pieces are also
 * exported for tests.
 */

// The founder-note engine is a customer-facing COPY surface, so it draws from the
// SAME single source of truth as every other drafting surface (cold, proposals):
// positioning.js, the machine twin of memory/messaging_spine.md. Do NOT hardcode
// the service menu, proof, or voice inline here — inject the block so this lane
// cannot drift from the brain (it silently did until 2026-07-07). See CLAUDE.md
// "Copy surfaces must import positioning.js".
import { buildPositioningBlock } from './positioning.js';

export const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';

// ---- Will's live voice exemplars: recent real sent mail (external, plain text).
export async function recentSentBodies(accessToken, n = 3) {
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

export const NOTE_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string', description: '1-4 words, lowercase internal-note style, no sell words' },
    body: { type: 'string', description: "the founder note, 50-100 words, plain text; separate paragraphs with a BLANK line (\\n\\n), ending with the sign-off: 'Cheers!' or 'Thanks!' then '\\nWill'. No company block after (his Gmail signature is appended separately)." },
    research_note: { type: 'string', description: 'one line for Will: the specific thing you found and used (or "nothing specific found — used firm-level angle")' },
    linkedin_step: { type: 'string', description: "today's LinkedIn action for Will for this person, one line (e.g. 'comment on her post about X, then blank connect')" },
  },
  required: ['subject', 'body', 'research_note', 'linkedin_step'],
};

export function voiceSystem(exemplars, audience, ctaVariant = 'help', remote = false) {
  const channel = audience === 'brokers' ? 'broker' : 'direct';
  return `You draft 1:1 networking emails for Will Newton, founder and CEO of Shortcut (getshortcut.co). You write AS Will, in his voice.

${buildPositioningBlock({ channel, remote })}

Everything above is the SOURCE OF TRUTH for what Shortcut is and the only facts/proof you may claim. Treat it as RAW MATERIAL to say in Will's own words, never lines to paste. This is a 1:1 founder-to-peer note; the rules below govern HOW Will writes it.

WILL'S VOICE (non-negotiable): calm, warm, casual, practical. He writes like a busy founder dashing off a note to a peer he'd like to know, not like a company. Soft energy, zero sales push, curious about THEM. No buzzwords (elevate, leverage, unlock, empower, transform, seamless, holistic, curated, delve, foster, streamline, navigate are BANNED). No dashes as punctuation (end the sentence instead). Specifics over superlatives. Plain verbs: things ARE and HAVE, they never "serve as" or "boast".

HOW WILL'S EMAILS READ (brand voice guide — this is EMAIL, and email BREATHES): write like one human emailing another, warmth over compression. Sentences can run 20+ words when the rhythm calls for it. Do NOT compress the note into clipped telegraph fragments or a stack of tiny choppy lines — that reads cold and robotic, which is the opposite of Will. Contractions everywhere. Let sentence length vary naturally (a short line here and there is good; do not force choppiness, and never three same-shape sentences in a row). No "not just X, but Y". Read it in your head: if it sounds like a robot, LENGTHEN it; if a sentence could appear in a mass email, rewrite it.

COMPOSE, DON'T ASSEMBLE (the whole point): say every idea fresh, phrased differently each email. If two of your notes could swap a sentence unnoticed, you have written a template. Two hard consequences of this:
- COMPLETE SENTENCES, ALWAYS. Every sentence has a subject and a real verb. NEVER drop the service list in as a bare line ("Chair massage, nails, facials, mindfulness." standing alone is a broken fragment). The services live INSIDE a flowing sentence you compose from the menu above, fresh each time: lead with massage, signal the breadth (nails, facials and more, and the virtual track for remote teams), and that one team runs all of it so they're not juggling vendors. Vary the verb, the order, where the "one team" idea lands. Never the same stock phrasing twice.
- KEEP THE LIST CLEAN. The service enumeration itself is a simple, natural list: comma-separated, joined with "and" ("chair massage, nails, facials, and mindfulness"). NEVER join services with "plus", and NEVER wedge a delivery detail (like the spa-like conference room) into the middle of the list, that reads awkward ("chair massage in a conference room turned spa-like, plus nails, facials..." is exactly the clumsy phrasing to avoid). If the spa-like-room image earns its place, give it its OWN short sentence, separate from the list.
- Describe who Shortcut helps as "companies" or "People teams", NEVER by grafting the recipient's exact title into a generic claim ("we work with VP People teams" is wrong; "we work with People teams" is right).
${exemplars.length ? `\nREAL EXAMPLES OF WILL'S SENT EMAILS (match this register, rhythm, and warmth — do NOT copy content):\n${exemplars.map((e, i) => `--- example ${i + 1} ---\n${e}`).join('\n')}\n` : ''}
THE MOTION: founder-to-peer networking, NOT sales outreach. First touch. The goal is a conversation, not a meeting. Open with a TRUE, SPECIFIC observation about THEM when one exists (see OBSERVATION BAR), one thought connecting it to Will's world, one low-pressure question. Keep it to a tight few short paragraphs; shorter is better when nothing is lost, but let each thought be a real sentence. NO links, NO attachments, NO calendar link ever, NO "15 minutes" phrasing. (Exception: convo CTA variants may invite a short call — see THE ASK.)

SIGN-OFF (Will 2026-07-06): end with "Cheers!" or "Thanks!" on its own line, then "Will" on the next line. Nothing after (his Gmail signature is appended automatically). That sign-off is the ONLY exclamation mark in the whole email, and it stays: it reads warm, and gratitude closes get the most replies.

INTRODUCE WILL AND SHORTCUT CLEARLY (Will's requirement, 2026-07-02): early in the note, one plain human sentence saying who he is ("I'm Will, I run Shortcut") and what Shortcut does, in concrete terms drawn from the positioning above. Compose it FRESH every time in your own words; do NOT paste a fixed template sentence. The single biggest machine tell is every note opening with the identical "We bring wellness days into offices for companies like BCG and DraftKings, chair massage, nails, facials, mindfulness, all from one team" sentence. Vary the wording, the order, which detail leads. Never assume they can infer what Shortcut is. This intro is exempt from the observation-first rule (observation first, intro second is the natural order).

RESEARCH FIRST (you have web search, up to 3 searches): search the person and their firm for something real and recent — a post, a firm announcement, a niche they own, an award, a client win. The observation must be checkable and specific.
MILESTONE HOOKS — KEEP THE GOOD ONES (Will 2026-07-07, do NOT default to dropping): a genuine COMPANY MILESTONE (going public / an IPO, a funding round, a big product launch, a notable partnership, a company-wide award) is a valid hook for ANY senior leader at that company. Do NOT null it because it isn't specific to their exact role — congratulating a VP of People on their company going public is completely natural and warm. If a real milestone exists, OPEN on it with one brief genuine congrats, then move to why you're writing. Only DROP a real fact when it is a non-sequitur to caring for a team (a security or product report, a technical release, an industry stat) — those have nothing to do with wellness; do not force a bridge. Rule of thumb: if a peer founder would say "nice, congrats" on hearing it, keep it; if not and it isn't about their people, drop it.
OBSERVATION BAR (Will 2026-07-06, for NON-milestone finds): a personal or firm find is usable ONLY if it connects to the note's actual thread ON ITS FACE — their wellbeing/benefits practice or role, their clients, their metro, something they wrote about wellness, benefits, or budgets. If connecting it takes a thematic bridge or a shared-value abstraction, it is FORCED: drop it and use the firm or metro angle instead.
  GOOD (flows with the sell): "Given EPIC's Wellbeing & Health Management practice, I'm curious whether you're seeing this with your New York clients on those carriers." The find IS the thread.
  FORCED (never do this): "I saw you're a Health Rosetta advisor. That transparency focus is exactly what I keep running into on the carrier wellness fund side." Credential → "transparency" → funds is a bolted-on bridge. A note with no personal line beats this every time.
RECENCY (part of the bar): an observation framed as news ("I saw you...", "congrats on...") must be from the last ~6 months. Older facts are fine ONLY as standing facts ("you run People across 12 countries"), never with I-just-saw framing. A 2023 promotion presented as fresh news reads as lazy scraping the moment they notice the date.
If the firm context includes a CONTENT HOOK (a verified piece of the firm's own published content), referencing it naturally is the best possible observation. Only reference content named in the context or found in YOUR OWN searches this run.
HONESTY RULE (hard): if the searches surface nothing specific about the PERSON, use the firm-level angle from the context instead, framed honestly. NEVER imply Will read/saw something that does not exist. NEVER invent posts, quotes, news, or mutuals. A slightly less personal true note beats a fake-personal one every time.
CLIENT CLAIMS ARE CLOSED-WORLD (hard): the only facts about Shortcut's clients you may state are the ones IN THIS PROMPT (BCG and DraftKings, 500+ companies, 87% rebook, over 90% of slots get booked${audience === 'brokers' ? ', the Burberry/Aetna receipt' : ''}). NEVER invent client categories or segments ("we work with a few gaming studios", "our law-firm clients tell us") — you do not know the roster. Tie the note to their world through THEIR context, not through made-up client overlap.
COHERENCE CHECK (Will 2026-07-07 — true is not enough, it must FIT THIS person): before you use any research find, cross-check it against THE PERSON JSON (their location, title, company). A fact can be real yet wrong for this contact. HARD examples: do NOT congratulate someone on a CITY-specific award/office/event that is not their city (a "Best Workplaces in Chicago" award is meaningless to a New York contact — a different office earned it); do NOT reference a division/region/product they do not work in; do NOT frame something as "yours" that belongs to a different part of the company. If a find has a specific place/time/team attached and it does not match this person, either drop it or reframe it honestly as company-wide, never as a personal congratulations. When you DO name a specific recognition, name it COMPLETELY (say WHAT it is — "Fortune's Best Workplaces in Chicago", not the half-reference "the Fortune Chicago list", which reads unfinished). A generic true note beats a specific note aimed at the wrong context.

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
STRUCTURE: a few short paragraphs separated by blank lines, each carrying one idea (let a paragraph breathe to two or three sentences when the rhythm calls for it, this is email not a telegram). The Burberry receipt is ALWAYS its own paragraph. If research produced a personal observation, it must connect to the fund thread within a sentence — an unconnected compliment reads as bolted-on research; if it cannot connect naturally, drop it and use the firm or metro angle instead.
NEVER: say "partnership", mention referral fees/revenue/compensation (first touch is comp-free, always), ask for referrals outright, or pitch Shortcut as the point — the point is making THEM look good to their clients.`
    : `AUDIENCE: the wellness owner at an emerging tech company (~100-250 people, usually just crossed 100) — could be a People leader, Workplace/Office manager, Chief of Staff, EA, COO, or the CEO. Founder-to-founder framing: Will also runs a company, he knows the stage they're at.
COHORT THESIS — INTERNAL TARGETING CONTEXT, NEVER QUOTED AT THE PROSPECT (Will 2026-07-06): this company is in hypergrowth, their first People leader just landed or is being hired, and nothing is entrenched yet. That is why they are a fit. It is NOT what the note says.
WHAT THE NOTE SAYS (Will 2026-07-06, sentiment is everything): Shortcut CELEBRATES their growth and offers to help their people relax along the way. A raise or a milestone is a real achievement, so the note opens CONGRATULATORY, genuine and brief ("congrats on the Series B, that's a big moment"). Then the offer, always as a question or an "if", never a diagnosis: "if the team's feeling the pace, we're an easy way to help everyone take a beat" / "curious how you're thinking about helping the team recharge as you grow". Will wants to be a valued partner that helps high-growth teams decompress, full stop.
HARD TONE RULES for this cohort:
- NEVER assert facts about THEIR team's state ("everyone is stretched", "your people are burned out", "you're probably overwhelmed"). Will has not met their team. Stress may appear only inside an "if"/"as"/"when" clause or a question.
- NEVER warn about consequences or create urgency ("what you do now becomes how things are done", "before culture calcifies", "the window is closing"). We offer wellness, not threats. Zero fear framing.
- BANNED (established-company angles): RTO framing, "make the office worth the commute"/"worth coming to", return-to-office language, perks-theater talk, enterprise-benefits vocabulary. EXCEPTION: office framing only when the verified trigger itself is about their office (a lease, an X-days-in-office posting).
If the prospect JSON has a why_now_trigger, it is VERIFIED (harvested with an evidence URL) — anchor the note on it (for funding triggers that means congratulating it) and skip inventing a different angle; web searches just add color, and a note with no extra color is completely fine. Never claim they have wellness budget; a raise is a milestone to celebrate, not a budget claim.
WHAT SHORTCUT IS FOR THEM: the wellness days people actually book (drawn from the positioning above), led by massage with the breadth signalled in one beat. Lead with the in-office experience for a company with an office.
REMOTE vs IN-OFFICE — GET THE SERVICES RIGHT (Will 2026-07-07): there are two kinds of service (see the menu above). IN-PERSON ONLY (massage, nails, facials, hair, headshots) need a physical location. FLEXIBLE (mindfulness, sound baths, nutrition coaching) run in person, over Zoom, or hybrid. Two rules:
  - If the company is FULLY REMOTE / distributed: do NOT mention the in-person-only services, and do NOT write them off as a poor fit. Lead with the flexible services delivered over Zoom ("your whole team, wherever they are"). Remote is a segment we win, not an objection.
  - If the company has an OFFICE: lead with the in-person experience (massage and the breadth). You MAY also mention a flexible service, but NEVER label massage/nails/facials/hair as "for remote" or "virtual" — that is factually wrong, they are in-person only. Do not staple "for remote folks" onto the in-person list.
PROOF (Will 2026-07-07 — use EXACTLY ONE, never two): from the REAL proof in the positioning above, pick the single receipt that best fits the moment, then stop (the 90%+ slots-booked usage proof is strongest for a first People leader whose fear is a flop). Naming BCG/DraftKings AND a stat is TWO proofs — choose one. The 90%-booked claim is about SLOTS, never "events book out".
WEAVE THE PROOF, NEVER DANGLE IT (Will 2026-07-07): whatever proof you use, attach it in the same breath to the benefit it proves (the team actually shows up, actually loves it, it's effortless) — it's evidence for the message, not a fact dropped on its own line. Never leave a bare stat as its own standalone sentence. Say it in your own words; if the stat can't be tied to a benefit naturally, cut it.
ZERO LIFT (this cohort needs to hear it — say it your own way, don't skip it): make clear the whole thing is effortless for them, that Shortcut handles everything and they just pick a date. A stretched team with a brand-new or no People leader needs to know it's no work on their side. One natural sentence, phrased fresh, not a stock tag.
THE ASK (Will 2026-07-06 — ALWAYS offer something concrete; a bare curiosity question is not a close):
${ctaVariant === 'convo'
    ? `CONVO variant: offer a call, human and unpushy — "Would love to hop on a call if you think this could be a fit for {{company}}" or "Happy to jump on a quick call if it's useful". No calendar link, no "15 minutes", no times proposed.`
    : `HELP/INFO variant: offer to send more — "I'd love to send over some more info if you're interested" or "Happy to share more on how our wellness experience works". Warm, zero pressure.`}`}

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

// Today's date, so the model anchors timing correctly and never calls a month
// that has already passed "upcoming" (Will 2026-07-07: a note said "as we head
// into June" in July). Real Node runtime here (cron / function / local), so
// new Date() is available and gives the current day.
export function todayLong() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Trigger types that are real EXTERNAL milestones worth opening a note on. Anything
// else from the harvest (people_posting, growth_list) is INTERNAL targeting signal —
// the reason we reached out, never quoted at the prospect (Will 2026-07-08).
const MILESTONE_TRIGGER_TYPES = new Set(['funding', 'ipo', 'launch', 'partnership', 'acquisition', 'award']);

// ============================================================================
// PERSONAL HOOK RESEARCH (Will 2026-07-08): be HUMAN, not robotic. Research the
// company and extract ONE genuine, specific, kind detail from ANY category (recent
// growth, a milestone, a new office, a product, a leadership moment, an award, or —
// often warmest — how they treat their people), phrased as a warm line Will could
// actually open with. Returns the artifact (or null). Fed to composeNote as
// personalHook so live notes open human instead of on a trigger tag. Hard timeout +
// null fallback so a hung search never blocks the send.
// ============================================================================
const PERSONAL_HOOK_SCHEMA = {
  type: 'object',
  properties: {
    personal_detail: { type: ['string', 'null'], description: 'the single most genuine, specific, VERIFIED fact you found, or null if nothing real exists' },
    category: { type: 'string', description: 'growth | milestone | office | product | leadership | award | how_they_treat_people | person' },
    warm_line: { type: ['string', 'null'], description: "ONE crisp short sentence (about 12-22 words, one idea) Will could open with, in his calm human voice — no buzzwords, no dashes, no exclamation, do NOT pack multiple facts. null if no genuine detail." },
    connects: { type: 'string', description: 'one honest line on how it connects (caring for their team, or for brokers helping their clients)' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['personal_detail', 'category', 'warm_line', 'connects', 'confidence'],
};

const WARM_LINE_CRAFT = `Write warm_line the way Will actually talks: calm, human, kind, a little understated. CRISP — ONE short sentence, about 12 to 22 words, ONE idea. Do NOT pack multiple facts or dates into it; pick the single most resonant detail and say it simply. RECENCY: if the detail is older than ~6 months, phrase it as a STANDING fact ("EPIC has a strong Northeast benefits practice") — never as fresh news ("I saw", "I know they just"); save fresh-news framing for genuinely recent events. No buzzwords, no dashes as punctuation, no exclamation points. Report via report_personal exactly once.`;

function personalHookSystem(audience) {
  if (audience === 'brokers') {
    return `You help Will Newton, founder of Shortcut, write a GENUINELY personal 1:1 note to ONE employee-benefits broker or consultant. Shortcut helps brokers make their CLIENTS the hero: deploying carrier wellness funds (Cigna, Aetna, Anthem) on wellness employees actually use.

YOUR JOB: research THIS person and their FIRM and find the SINGLE most genuine, specific detail a thoughtful person would warmly mention, that connects HONESTLY to the benefits/wellness thread. Good categories:
- the firm's wellbeing / health-management / benefits practice or specialty
- a firm milestone, acquisition, or growth
- an award or recognition (Best Places to Work, a benefits-industry honor)
- something the broker or firm published on benefits, wellness, or workplace health
- their metro / the kinds of clients they serve
Avoid anything that reads scraped or generic. Do NOT comment on how the FIRM treats its own staff (this note is about helping their CLIENTS), and never invent a book of business you cannot see.

HARD RULES: it must be TRUE and specific — verify with 1 to 3 web searches and only report what you actually found. NEVER invent or embellish. If nothing genuine exists, return personal_detail=null and warm_line=null (that is fine).

${WARM_LINE_CRAFT}`;
  }
  return `You help Will Newton, founder of Shortcut, write a GENUINELY personal 1:1 note to ONE person. Shortcut brings wellness into companies: in-person (chair massage, nails, facials) and flexible services delivered in person or over Zoom (mindfulness, sound baths, nutrition coaching), one team, fully managed, and people actually use it.

YOUR JOB: research THIS company and find the SINGLE most genuine, specific, HUMAN detail a thoughtful person would actually notice and warmly mention. It can come from ANY category:
- a real milestone (funding, IPO, a revenue milestone, a big launch)
- a new office / HQ / expansion
- a notable product or something they are known for
- a leadership moment (new CEO, a founder transition)
- an award or recognition
- HOW THEY TREAT THEIR PEOPLE (their culture, an internal wellness program, benefits, work-life values) — often the warmest and most relevant detail for Shortcut
- something the person themselves is known for

HOW TO CHOOSE: prefer the detail that is (a) genuinely warm and kind to mention and (b) connects HONESTLY to caring for a team. A company that already invests in its people's wellbeing is a GREAT fit to point out, not awkward. Avoid anything that reads like a scraped job posting ("I saw you're hiring...") — that is not human.

HARD RULES: it must be TRUE and specific — verify with 1 to 3 web searches and only report what you actually found. NEVER invent or embellish. If nothing genuine exists, return personal_detail=null and warm_line=null (that is fine).

${WARM_LINE_CRAFT}`;
}

export async function researchPersonalHook(anthropic, lead, { audience = 'tech-execs', timeoutMs = 70000, maxIters = 5, log = () => {} } = {}) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }, { name: 'report_personal', description: 'Report the single personal detail. Call exactly once.', input_schema: PERSONAL_HOOK_SCHEMA }];
  const messages = [{ role: 'user', content: `The person: ${lead.name}, ${lead.title} at ${lead.company} (${lead.location || 'location unknown'}). Research ${lead.company} and report the single best genuine personal detail, then call report_personal.` }];
  const t0 = Date.now();
  let iters = 0;
  try {
    while (iters < maxIters) {
      if (Date.now() - t0 > timeoutMs) { log(`personalize timeout for ${lead.company}`); return null; }
      iters += 1;
      const resp = await Promise.race([
        anthropic.messages.create({ model: ANTHROPIC_MODEL, max_tokens: 1500, system: personalHookSystem(audience), tools, messages }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('personalize_timeout')), timeoutMs)),
      ]);
      messages.push({ role: 'assistant', content: resp.content });
      const rp = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_personal');
      if (rp) return rp.input;
      if (resp.stop_reason === 'pause_turn') continue;
      if (resp.stop_reason === 'end_turn') messages.push({ role: 'user', content: 'Call report_personal now.' });
    }
  } catch (e) { log(`personalize error for ${lead.company}: ${e.message}`); return null; }
  return null;
}

export async function draftNote(anthropic, { lead, firm, exemplars, audience, ctaVariant, trigger, triggerType = null, remote = false, personalHook = null }) {
  const isMilestone = MILESTONE_TRIGGER_TYPES.has(triggerType);
  const userContent = [
    `TODAY IS ${todayLong()}. Anchor every time reference to today. A month or date that has already passed is NOT "upcoming" — refer to a past event in the past ("the launch last month", "since going public in July"), and only call something upcoming if it is genuinely still ahead of today. If the timing is unclear, keep it timeless.`,
    '',
    'THE PERSON (JSON, trusted):',
    JSON.stringify({
      name: lead.name, title: lead.title, company: lead.company,
      location: lead.location || null,
      remote_or_distributed: remote || null,
      firm_tier: firm?.tier || null, firm_priority_why: firm?.why || null, nyc_presence: firm?.nyc_presence ?? null,
      why_now_trigger: trigger || null,
      why_now_trigger_type: triggerType || null,
    }, null, 2),
    '',
    // HOW TO USE THE TRIGGER (Will 2026-07-08 — two-layer rule): a trigger is EITHER
    // an external milestone to open on, OR internal targeting context you must never
    // quote. Do NOT conflate them.
    personalHook
      ? `PERSONAL OBSERVATION (verified, already researched and TRUE — THIS IS YOUR HOOK): ${personalHook}\nOpen the note warmly on this, in your own words (one or two genuine, kind sentences), then move into why you are writing. Do NOT invent a different hook, and you do NOT need to web-search for this note. If there is also an internal signal below (a hiring/posting), still NEVER quote it.`
      : isMilestone
        ? 'The why_now_trigger is a real EXTERNAL MILESTONE (funding / IPO / launch / partnership). Open with ONE brief, genuine congrats on it, then move to why you are writing.'
        : trigger
          ? 'The why_now_trigger is an INTERNAL TARGETING SIGNAL (an open job posting / hiring / growth-list hit). It is WHY we chose to reach out, NOT something to say to them. NEVER write "I saw you\'re hiring…", NEVER reference the open role, and NEVER frame a routine role as "a sign of growth" (for an established company it is just a job opening). Write the clean, warm note with NO reference to the posting. Use a genuine external hook only if your own research turns one up; otherwise no hook is the right call.'
          : 'No verified trigger. Write the clean, warm note; use a hook only if your research turns up a genuine external milestone.',
    '',
    'Research them (person first, then firm), then call report_note once with the note in Will\'s voice.',
  ].join('\n');

  // Research is OPTIONAL color, never load-bearing (Will 2026-07-06: Uniswap's
  // invocation died three times, almost certainly hung in web search on a
  // high-volume-content company). Hard 150s timeout on the researched draft;
  // on timeout or error, draft from the verified trigger + firm context alone —
  // "we have plenty of actionable ways to frame things without the perfect
  // personalized anecdote."
  let resp;
  if (personalHook) {
    // The personal hook is ALREADY researched and verified — no web search needed.
    // Draft directly (no second research pass, no 150s wait). (Will 2026-07-08)
    resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 3000, temperature: 0.4,
      system: voiceSystem(exemplars, audience, ctaVariant, remote),
      tools: [{ name: 'report_note', description: 'Report the finished founder note. Call exactly once.', input_schema: NOTE_SCHEMA }],
      tool_choice: { type: 'tool', name: 'report_note' },
      messages: [{ role: 'user', content: `${userContent}\n\nNOTE: no web research needed — open on the verified PERSONAL OBSERVATION above. Set research_note to the personal detail you used.` }],
    });
  } else {
    const researchedDraft = anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 4000, temperature: 0.4,
      system: voiceSystem(exemplars, audience, ctaVariant, remote),
      tools: [
        { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
        { name: 'report_note', description: 'Report the finished founder note. Call exactly once, after researching.', input_schema: NOTE_SCHEMA },
      ],
      messages: [{ role: 'user', content: userContent }],
    });
    try {
      resp = await Promise.race([
        researchedDraft,
        new Promise((_, rej) => setTimeout(() => rej(new Error('research_timeout')), 150000)),
      ]);
    } catch (e) {
      console.warn(`researched draft failed (${e.message}) — falling back to trigger-only draft (no web search)`);
      resp = await anthropic.messages.create({
        model: ANTHROPIC_MODEL, max_tokens: 3000, temperature: 0.4,
        system: voiceSystem(exemplars, audience, ctaVariant, remote),
        tools: [{ name: 'report_note', description: 'Report the finished founder note. Call exactly once.', input_schema: NOTE_SCHEMA }],
        tool_choice: { type: 'tool', name: 'report_note' },
        messages: [{ role: 'user', content: `${userContent}\n\nNOTE: web research is unavailable for this lead. Draft from the verified why_now_trigger and the provided context alone; set research_note to "no research pass — drafted from the verified trigger".` }],
      });
    }
  }
  let tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  if (!tu) {
    const critique = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 2000, temperature: 0.4,
      system: voiceSystem(exemplars, audience, ctaVariant, remote),
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
  return { ...tu.input, subject: autoFixDashes(String(tu.input.subject || '')), body: autoSplitParagraphs(autoFixServiceFragment(autoFixDashes(normalizeParagraphs(tu.input.body || '')))) };
}

// The model sometimes separates paragraphs with SINGLE newlines; the chunky-
// paragraph guard then sees one giant paragraph and kills the note (cause of the
// Jul 6 morning + evening skips). Normalize: if the body has no blank lines,
// promote sentence-ending single breaks to paragraph breaks (sign-off stays tight).
export function normalizeParagraphs(body) {
  if (/\n\s*\n/.test(body)) return body;
  return body.replace(/([.?!])\n(?!\n)(?!Will\s*$)/g, '$1\n\n');
}

// Structure is an AUTO-FIX, never a lead-killer (Will 2026-07-06: "we shouldn't
// skip leads because of poor drafting"). Splitting a >2-sentence paragraph at a
// sentence boundary is pure formatting — zero wording changes — so do it
// mechanically instead of burning revisions (the old chunky guard caused every
// skip on Jul 6). Content guards (fabrication, cohort fit, banned words) still block.
// Dash-as-punctuation is also an AUTO-FIX (Will's rule is mechanical: "Write
// clean sentences. Period. New sentence."). The revise loop kept re-introducing
// em dashes (Niural skipped on it 2026-07-06 after two revisions). Em/en dashes
// and spaced hyphens between clauses become sentence breaks or commas.
export function autoFixDashes(body) {
  return body
    // clause break after a complete thought → period + capital
    .replace(/([a-z0-9)])\s*[—–]\s*(\w)/g, (_, a, b) => `${a}. ${b.toUpperCase()}`)
    .replace(/(\w)\s+-\s+(\w)/g, (_, a, b) => `${a}. ${b.toUpperCase()}`)
    // catch-alls: EVERY remaining em/en dash and spaced hyphen → comma, so the
    // dash guard (which mirrors these exact patterns) is unreachable
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s-\s/g, ', ');
}

// The service list dropped in as a bare, verb-less line is the ONE fragment the
// model keeps re-emitting even when told not to (proven 3/3 across on-site AND
// virtual service lists; the skeptic catches it but the revise fixes it only ~half
// the time). So repair it MECHANICALLY, like autoFixDashes — but variety-PRESERVING:
// MERGE the list into the model's OWN preceding lead-in sentence with a colon
// (folding a trailing dependent clause with a comma), not a canned stamp. Falls back
// to a light "We run" prepend only when there is no lead-in. Runs after every draft
// AND every revise, so a revise can't re-introduce the fragment. (Will 2026-07-07 —
// he rejected an identical-every-time patch; this keeps whatever the model wrote.)
// A service ITEM = a service keyword, tolerant of common phrasings the model uses:
// "chair and table massage", a trailing "sessions"/"session" ("mindfulness sessions"),
// and simple plurals. Keeps the net matching when the model varies the wording.
// A service item, tolerant of the phrasings the model uses: a trailing "sessions",
// and the delivery-fact descriptor on massage ("massage in a conference room turned
// spa-like") so the first item doesn't break the list chain (Will 2026-07-08).
const SVC_RE = '(?:chair and table massage|chair massage|table massage|massage|nails|facials|hair and grooming|grooming|hair|headshots|mindfulness|meditation|sound baths?|nutrition coaching)(?:\\s+(?:sessions?|in a conference room[^,.!?\\n]*))?';
// Separator tolerates comma / and / plus / then and RUNS of them (", plus nails").
const SVC_LIST3 = `${SVC_RE}(?:(?:\\s*(?:,|and|plus|then)\\s*)+${SVC_RE}){2,}`; // 3+ services = fragment signal
const SVC_NL = '\n';
const svcLc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
export function autoFixServiceFragment(body) {
  let s = body.replace(/\n\s*\n/g, SVC_NL);
  const cue = '(?:bring|run|do|doing|handle|offer|cover|wellness|session|service|experience|menu)';
  const mergeRe = new RegExp(
    `([^.!?${SVC_NL}]*\\b${cue}\\b[^.!?${SVC_NL}]*)([.!?])[ ${SVC_NL}]+(${SVC_LIST3}[^.!?${SVC_NL}]*)\\.` +
    `(?:[ ${SVC_NL}]+((?:That|Which|All|So|Where)\\b[^.!?${SVC_NL}]*)\\.)?`,
    'i',
  );
  s = s.replace(mergeRe, (_m, prev, _p, list, dep) =>
    `${prev.trim()}: ${svcLc(list.trim())}${dep ? ', ' + svcLc(dep.trim()) : ''}.`);
  // fallback: a bare list still alone at a block start with no lead-in → light prepend
  s = s.replace(new RegExp(`(^|${SVC_NL})[ ]*(${SVC_LIST3}[^.!?${SVC_NL}]*)\\.`, 'i'),
    (_m, br, list) => `${br}We run ${svcLc(list.trim())}.`);
  s = s.replace(new RegExp(SVC_NL, 'g'), '\n\n');
  return s.replace(/([a-z0-9)])\.([A-Z])/g, '$1. $2'); // repair any boundary space the merge consumed
}

export function autoSplitParagraphs(body) {
  return body.split(/\n\s*\n/).map((para) => {
    const p = para.trim();
    // never touch the greeting or the sign-off block
    if (/^(Hi|Hey|Hello)\b/.test(p) && p.length < 40) return para;
    if (/(Cheers!|Thanks!)/.test(p)) return para;
    const sentences = p.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
    // Let a paragraph breathe up to three sentences (email voice); only split a
    // genuinely chunky 4+ paragraph, and into halves so it still reads natural.
    if (sentences.length <= 3) return para;
    const out = [];
    const half = Math.ceil(sentences.length / 2);
    out.push(sentences.slice(0, half).join('').trim(), sentences.slice(half).join('').trim());
    return out.join('\n\n');
  }).join('\n\n');
}

// Cohort-fit guard (Will 2026-07-06): RTO/commute framing is an established-company
// angle. Emerging-tech hypergrowth companies are not dragging anyone back to the
// office — projecting that problem onto them reads tone-deaf. Allowed only when
// the lead's own verified trigger is explicitly about the office.
const RTO_FRAME_RE = /\b(worth (the )?commut(e|ing)|worth coming (in|to)|return to (the )?office|rto|back to the office|reason to come in|come into the office)\b/i;
const OFFICE_TRIGGER_RE = /\b(office|in.office|on.?site|days? (a|per) week|hybrid|lease|hq|headquarters)\b/i;
// Tone guards (Will 2026-07-06): we CELEBRATE their growth and OFFER help.
// Asserting their team's stress state is presumptuous ("everyone is stretched");
// stress may only live inside an if/as/when clause or a question. Consequence/
// urgency framing is a threat, not wellness ("what you do now becomes how
// things are done here").
const STRESS_ASSERTION_RE = /\b(everyone|your (team|people|folks)|people( there)?|the (team|whole team)|you) (is|are|'re|feels?|must be|are probably|is probably) (all )?(stretched( thin)?|burned? out|overwhelmed|exhausted|running on empty|maxed out|under water|underwater|swamped)\b/i;
const CONSEQUENCE_FRAME_RE = /\b(becomes? how (things are|it's) done|before (it|the culture|things) (calcif|hardens|sets|is too late)|the window (is closing|closes)|now or never|pay (a|the) price|can't afford (not|to wait))\b/i;

// Deterministic guardrails (brand-hard rules) — throw loudly; the run skips the lead.
// opts.allowLinks: array of exact URLs permitted in the body (follow-up touch 3
// carries one first-party book-a-call link; the cold-lane callers pass nothing so
// their link ban is unchanged). opts.followup: relaxes intro/greeting expectations
// (an in-thread reply does not re-introduce Will).
export function guardNote(n, audience, trigger = null, opts = {}) {
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
  {
    // Strip any explicitly-allowed follow-up links FIRST (exact match on the raw
    // body — must happen before the getshortcut.co strip, which would otherwise
    // mangle a proposals.getshortcut.co URL so it no longer matches), then strip
    // bare getshortcut.co mentions; any remaining https is a banned link. First
    // touch is link-free; follow-up touch 3 may carry ONE first-party book link.
    let linkTest = n.body;
    for (const u of (opts.allowLinks || [])) linkTest = linkTest.split(u).join('');
    linkTest = linkTest.replace(/getshortcut\.co/g, '');
    if (/https?:\/\//.test(linkTest)) throw new Error('draft included a link (first touch is link-free)');
  }
  // structure: short paragraphs, one idea each (Will 2026-07-02 — v5 shipped a
  // 3-sentence chunk). Enforce the ACTUAL rule (max two sentences per paragraph)
  // rather than a word-count proxy: the 46-word cap false-killed four good
  // two-sentence paragraphs on 2026-07-06. Word ceiling stays only as a backstop
  // against runaway sentences.
  // Email BREATHES (brand voice guide 2026-07-07 — "warmth over compression;
  // compressing email into telegraph fragments makes it feel cold"). Allow up to
  // THREE sentences per paragraph so the note can read like a human wrote it, not
  // a stack of clipped lines. Only a genuinely chunky paragraph (4+ sentences or a
  // runaway word count) gets split.
  for (const para of n.body.split(/\n\s*\n/)) {
    const sentences = (para.trim().match(/[.!?](\s|$)/g) || []).length;
    const words = para.trim().split(/\s+/).filter(Boolean).length;
    if (sentences > 3 && words > 18) throw new Error(`paragraph has ${sentences} sentences — separate distinct ideas with a BLANK line (\\n\\n between paragraphs); keep a paragraph to a few sentences`);
    if (words > 75) throw new Error(`paragraph too long (${words} words) — split it into separate short paragraphs`);
  }
  if (audience !== 'brokers' && RTO_FRAME_RE.test(n.body) && !(trigger && OFFICE_TRIGGER_RE.test(trigger))) {
    throw new Error('tech-exec note used RTO/commute framing — this cohort is in hypergrowth, not a return-to-office fight; celebrate their growth and offer help unless the verified trigger itself is about the office');
  }
  if (audience !== 'brokers') {
    // strip if/as/when/question clauses first — conditional stress framing is allowed
    const assertions = n.body.split(/(?<=[.!?])\s+/).filter((s) => !/\b(if|as|when|whether)\b/i.test(s) && !/\?\s*$/.test(s.trim()));
    for (const s of assertions) {
      if (STRESS_ASSERTION_RE.test(s)) throw new Error(`note ASSERTS the team's stress state ("${s.trim().slice(0, 60)}...") — Will hasn't met their team; stress belongs only in an if/as/when clause or a question`);
    }
    if (CONSEQUENCE_FRAME_RE.test(n.body)) throw new Error('note uses consequence/urgency framing — we offer wellness, not warnings; celebrate their growth and offer help, zero fear framing');
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
export const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean', description: 'true ONLY if every checklist item holds' },
    issues: { type: 'array', items: { type: 'string' }, description: 'each failed item, specifically' },
  },
  required: ['pass', 'issues'],
};
export async function critiqueNote(anthropic, note, audience, ctaVariant = 'help', leadFacts = null, trigger = null, triggerType = null, personalHook = null) {
  const facts = leadFacts ? `\n\nWHAT WE KNOW ABOUT THE RECIPIENT (trusted facts — check the note against these):\n${JSON.stringify(leadFacts, null, 2)}` : '';
  // The trigger is VERIFIED (harvested with an evidence URL). Give it to the skeptic
  // so it does NOT flag a real milestone opener as "fabricated" and strip it (Will
  // 2026-07-07: a valid "congrats on the launch" got deleted). Plus today's date so
  // it catches stale timing ("as we head into June" in July).
  const verified = trigger ? `\n\nVERIFIED why-now trigger for this lead (harvested with evidence — treat as TRUE, do NOT flag it as fabricated): ${trigger}` : '';
  const personalV = personalHook ? `\n\nVERIFIED personal observation used to open this note (already researched and TRUE — do NOT flag it as fabricated; it is about the RECIPIENT'S company and is meant to be the warm opener): ${personalHook}` : '';
  const dateLine = `\n\nTODAY IS ${todayLong()}. FAIL any note that calls a month/date that has already passed "upcoming" or frames a past event as still ahead (e.g. "as we head into June" when it is July).`;
  // Two-layer rule (Will 2026-07-08): an INTERNAL targeting signal (an open job
  // posting / hiring / growth-list hit) must NEVER be quoted at the prospect.
  const internalSignal = trigger && !MILESTONE_TRIGGER_TYPES.has(triggerType);
  const signalLine = internalSignal ? `\n\nTHIS LEAD'S TRIGGER IS INTERNAL TARGETING CONTEXT (type "${triggerType || 'signal'}"), NOT a milestone: it is WHY we reached out, never something to say to them. FAIL the note if it references an open role / hiring / a job posting ("I saw you're hiring…", "as you bring on…"), or frames a routine role as "a sign of growth". Those are hard fails.` : '';
  const checklist = `You are the skeptical copy editor for Will's founder notes. The prose must read like a sharp human wrote ONE coherent note, not a system stitching approved lines together. Be a demanding editor — but do NOT invent problems to justify failing; a clean, warm, complete-sentence note that fits this person should PASS. Check every item:
1. FRAGMENTS / broken grammar. Apply ONE precise test to each sentence: does it have a subject and a finite (conjugated) verb? If YES it is complete — NOT a fragment — no matter how short or whether it contains a comma list. Only flag a line that truly has NO subject or NO verb. Before flagging, name the missing subject or verb; if you can't name what's missing, it is NOT a fragment.
   · A bare noun list with no verb IS a fragment: "Chair massage, nails, facials, mindfulness." → flag. But the SAME list is COMPLETE once a verb governs it: "We bring chair massage, nails, facials and mindfulness into the office." → subject "We", verb "bring" → do NOT flag.
   · Short sentences are fine: "That's a lot of moving parts." / "It's genuinely no work." / "You pick a date, we handle the rest." → all complete.
   · And/But/So/Honestly openers are Will's voice: "And we run it all as one team." is COMPLETE (subject "we", verb "run"). Never flag a sentence merely for starting with And/But/So.
2. STITCHED/TEMPLATED + SAMENESS: FAIL if the note reads like bolted-together stock phrases rather than one train of thought. In particular FAIL the identical machine-open "We bring wellness days into offices for companies like BCG and DraftKings, chair massage, nails, facials, mindfulness, all from one team" (or any near-verbatim stock catchphrase) — the intro and the one-team idea must be said in fresh words. WORDINESS: flag any sentence that could be half as long, and filler not earning its place.
3. OBSERVATION + HOOK (Will 2026-07-07): a genuine COMPANY MILESTONE (IPO/going public, funding round, big launch, notable partnership) SHOULD open the note with a brief warm congrats — FAIL a note that had such a milestone available and opened flat/generic instead (dropping a real milestone reads cold). Conversely FAIL a hook forced in that is a non-sequitur to caring for a team (a security/product report, a technical stat). For NON-milestone personal finds, Will's bar: usable only if it connects to the thread ON ITS FACE (their wellbeing/benefits role, their clients, their metro, something they wrote about wellness/benefits). A thematic bridge FAILS ("I saw you're a Health Rosetta advisor, that transparency focus is exactly what I keep running into" is bolted-on). No personal line at all is a PASS; a forced one FAILS. FAIL fresh-news framing ("I saw you...", "congrats on...") when the fact is older than ~6 months.
4. INTRO: the note clearly says who Will is and what Shortcut does, in concrete services (said in his own words, not a pasted template). If a reader couldn't tell what Shortcut is, FAIL.
5. CLOSE: OFFERS something concrete — ${audience === 'brokers' ? 'help with their clients, the one-pager, or (convo variant) a short call' : 'more info or (convo variant) a call'}. A bare curiosity question with no offer FAILS. No calendar link, no times. Never validation-seeking. Ends "Cheers!" or "Thanks!" then "Will" (the one exclamation mark allowed, nothing after).${audience === 'brokers' ? '' : '\n5b. ZERO LIFT: the note makes clear the whole thing is effortless for them (Shortcut handles everything, they just pick a date), said naturally somewhere. If that reassurance is entirely absent, FAIL — but do not demand a specific stock phrasing.'}
6. VOICE: reads like a busy founder typed it — contractions, warm, casual, zero sales energy. Sentence lengths VARY (at least one short punchy line; no run of same-shape sentences); no "not just X, but Y". The service list folded into a real sentence is REQUIRED brand copy, NOT a rule-of-three violation — never flag it for that. If the prose is uniformly smooth and balanced with no human texture, FAIL it as AI-sounding.
${audience === 'brokers' ? '6b. LANGUAGE: no insurance jargon ("groups"); employers are clients/companies/partners. Only fund-eligible services named (chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching). Client-side credibility only.' : ''}
7. CLIENT CLAIMS: the only permitted client facts are BCG/DraftKings, 500+ companies, 87% rebook, 90%+ slots booked${audience === 'brokers' ? ', the Burberry/Aetna receipt' : ''}. FAIL any other claim about who Shortcut works with ("a few gaming studios", "our fintech clients") — invented roster overlap is fabrication.${audience === 'brokers' ? '' : '\n7b. ONE PROOF ONLY (Will 2026-07-07): the note may use EXACTLY ONE proof point. Naming BCG/DraftKings AND a stat (e.g. "90% of slots get booked") is TWO — FAIL it; pick the single one that best fits the moment.'}
8. COHORT FIT + SENTIMENT (Will 2026-07-06): ${audience === 'brokers' ? 'Brokers: channel courtship about their clients deploying carrier funds, never a direct pitch.' : 'Emerging-tech: the note CELEBRATES their growth and OFFERS help. A funding trigger must open congratulatory (genuine, brief). FAIL if the note ASSERTS their team is stressed/burned out/overstretched (allowed only inside an if/as/when clause or a question). FAIL any consequence or urgency framing ("what you do now becomes how things are done", culture-calcifying warnings) — wellness, not threats. FAIL any RTO / "worth the commute" framing unless the verified trigger is explicitly about their office.'} An angle borrowed from a different cohort's playbook FAILS even if well-written.
9. COHERENCE — the claim must FIT THIS person, not just be true (Will 2026-07-07): cross-check every specific observation against WHAT WE KNOW ABOUT THE RECIPIENT below. FAIL a note that congratulates the person on a city/office/region-specific thing that is not THEIR city (e.g. "congrats on the Best Workplaces in CHICAGO" to a recipient whose location is New York — that award belongs to a different office, congratulating them on it is a tell that no one actually looked). FAIL any claim that contradicts a known fact, or that assumes a division/product/region the recipient is not in. FAIL a half-named recognition ("the Fortune Chicago list" without saying what it is) — it reads unfinished. When in doubt, a generic true note beats a specific one aimed at the wrong context. NOTE: if a specific milestone matches the VERIFIED trigger below, it is REAL, do NOT flag it as fabricated (only flag it if it is framed for the wrong person/place/time).${facts}${verified}${personalV}${dateLine}${signalLine}
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

// Two-proof detector (tech-execs only, Will 2026-07-07 — exactly one proof per
// note). A named-client proof (BCG/DraftKings) AND a stat proof (90% booked / 87%
// rebook / 500+ companies) in the same note is TWO. Deterministic because the LLM
// skeptic misses it inconsistently; fed into the revise loop, never a hard skip.
export function proofOveruse(body, audience) {
  if (audience === 'brokers') return false;
  const hasClient = /\b(bcg|draftkings)\b/i.test(body);
  const hasStat = /\b(87%|500\+|500 companies)\b|90%|over 90|slots (get |book)|rebook|come back for another/i.test(body);
  return hasClient && hasStat;
}

// One revision attempt with the skeptic's issues fed back (retry-once, like the composer).
export async function reviseNote(anthropic, { note, issues, exemplars, audience, lead, firm, ctaVariant, trigger, triggerType = null, remote = false, personalHook = null }) {
  const internalSignal = trigger && !MILESTONE_TRIGGER_TYPES.has(triggerType);
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: 2000, temperature: 0.4,
    system: voiceSystem(exemplars, audience, ctaVariant, remote),
    tools: [{ name: 'report_note', description: 'Report the revised founder note.', input_schema: NOTE_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_note' },
    messages: [{ role: 'user', content: [
      'Your previous draft FAILED review. Fix every issue and re-report the full note (keep the research observation only if it can connect naturally):',
      ...issues.map((i) => `  - ${i}`),
      '',
      'WHILE FIXING, DO NOT INTRODUCE NEW PROBLEMS. Every sentence must stay complete (subject + verb). The most common mistake here: when you de-stitch the intro, you drop the services onto their own line as a bare list ("Chair massage, nails, facials, mindfulness.") — that is a FRAGMENT. Keep the services INSIDE a real sentence with a verb ("We bring chair massage, nails, facials and mindfulness into the office, all run by one team.").',
      internalSignal ? 'ALSO: this lead\'s trigger is INTERNAL targeting context (an open role / hiring / growth-list hit). Do NOT reference the open role or frame a routine role as growth; write the clean note with no mention of the posting.' : '',
      personalHook ? `KEEP the opening personal observation (verified and TRUE, do not drop it): ${personalHook}` : '',
      '',
      `PREVIOUS DRAFT:\nSubject: ${note.subject}\n\n${note.body}`,
      '',
      'THE PERSON (JSON):',
      JSON.stringify({ name: lead.name, title: lead.title, company: lead.company, location: lead.location || null, firm_tier: firm?.tier || null, firm_priority_why: firm?.why || null, why_now_trigger: trigger || null, why_now_trigger_type: triggerType || null }, null, 2),
    ].join('\n') }],
  });
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  if (!tu) throw new Error('revision produced no note');
  // keep the original research trail; the revision only reworks copy
  return { ...tu.input, subject: autoFixDashes(String(tu.input.subject || '')), body: autoSplitParagraphs(autoFixServiceFragment(autoFixDashes(normalizeParagraphs(tu.input.body || '')))), research_note: tu.input.research_note || note.research_note };
}

/**
 * composeNote — the WHOLE pipeline, extracted verbatim from the handler loop so
 * the local runner and production share one code path: draft → guard (2 revise
 * attempts) → skeptic critique → 1 revise → final guard. Throws the guard error
 * if the note still violates a hard rule after all attempts (the caller turns
 * that into a skip). `log` defaults to console.error; pass a label for context.
 * Returns { note, review } so callers can surface the skeptic verdict.
 */
export async function composeNote(anthropic, { lead, firm, exemplars, audience, ctaVariant, trigger, triggerType = null, remote = false, personalHook = null, label = lead?.email || lead?.name || 'lead', log = console.error }) {
  let note = await draftNote(anthropic, { lead, firm, exemplars, audience, ctaVariant, trigger, triggerType, remote, personalHook });
  // GATE: deterministic guards -> up to TWO revisions on violation (one wasn't
  // enough in practice: Jul 6, a chunky paragraph survived the first revise
  // and the lead skipped; the second attempt gets both failure messages)
  try { guardNote(note, audience, trigger); } catch (ge) {
    log(`guard hit for ${label}: ${ge.message} — revising`);
    note = await reviseNote(anthropic, { note, issues: [ge.message], exemplars, audience, lead, firm, ctaVariant, trigger, triggerType, remote, personalHook });
    try { guardNote(note, audience, trigger); } catch (ge2) {
      log(`guard hit again for ${label}: ${ge2.message} — second revision`);
      note = await reviseNote(anthropic, { note, issues: [ge.message, ge2.message, 'This is the FINAL attempt: fix both without introducing new violations.'], exemplars, audience, lead, firm, ctaVariant, trigger, triggerType, remote, personalHook });
      guardNote(note, audience, trigger);
    }
  }
  // the brain's review tier: skeptic pass + revision (generator ≠ evaluator).
  // Pass the lead's trusted facts so the skeptic can catch coherence failures (a
  // true-but-wrong-context claim like a Chicago award aimed at a NYC contact).
  // LOOP, don't revise-once-and-ship (Will 2026-07-07): a revision that fixes one
  // issue can INTRODUCE another the same pass never re-checks — most often a
  // de-stitched service list that lands as a bare-noun FRAGMENT. Re-critique after
  // every revise (up to 2 rounds) so a revise-introduced defect can't ship silently.
  const leadFacts = { name: lead?.name || null, title: lead?.title || null, company: lead?.company || null, location: lead?.location || null };
  // The skeptic misses the two-proof rule ~half the time (LLM doesn't re-check
  // every item each pass), so enforce it DETERMINISTICALLY and fold it into the
  // review issues the revise loop must fix (Will 2026-07-07: exactly one proof).
  const critique = async (n) => {
    const r = await critiqueNote(anthropic, n, audience, ctaVariant, leadFacts, trigger, triggerType, personalHook);
    if (proofOveruse(n.body, audience)) {
      return { pass: false, issues: [...(r.issues || []), 'You used TWO proofs (a named client like BCG/DraftKings AND a stat like "90% of slots book"). Keep EXACTLY ONE (not zero, not two): pick the single strongest for this moment and cut the other. Do NOT drop both, one credibility proof should stay in the note.'] };
    }
    return r;
  };
  const firstReview = await critique(note);
  let review = firstReview;
  const MAX_SKEPTIC_REVISES = 2;
  for (let r = 0; r < MAX_SKEPTIC_REVISES && !review.pass && review.issues.length; r += 1) {
    log(`skeptic flagged ${label} (round ${r + 1}): ${review.issues.join(' | ')} — revising`);
    note = await reviseNote(anthropic, { note, issues: review.issues, exemplars, audience, lead, firm, ctaVariant, trigger, triggerType, remote, personalHook });
    guardNote(note, audience, trigger); // hard rules must always hold after a revise
    review = await critique(note);
  }
  // Return the FIRST review for caller display parity (it shows what the drafter
  // produced), plus the final verdict so callers/tests can see if it settled clean.
  return { note, review: firstReview, finalReview: review };
}

// ============================================================================
// FOLLOW-UP TOUCHES (Will 2026-07-07): auto-sent in-thread nudges that mirror the
// COLD ENGINE cadence + role structure — E2 value bump (day+3), E3 differentiation
// + one first-party link (day+4), E4 graceful breakup (day+5). Same voice + hard
// rules as the first touch, but SHORT and in-thread (no re-introduction). The
// sender (founder-followup-background.js) hard-stops the whole sequence the moment
// the prospect replies, so these only ever go to people who stayed silent.
// ============================================================================

const FOLLOWUP_SCHEMA = {
  type: 'object',
  properties: {
    body: { type: 'string', description: "the in-thread follow-up, plain text, SHORT (2-4 sentences), paragraphs separated by a blank line, ending 'Cheers!' or 'Thanks!' then '\\nWill'. NO re-introduction (Will's first email is above in the thread) and NO stock 'just following up'." },
    touch_summary: { type: 'string', description: 'one line for Will: what NEW thing this touch adds' },
  },
  required: ['body', 'touch_summary'],
};

function followupSystem(exemplars, audience, ctaVariant, touchNumber, trigger, bookACallUrl, remote = false) {
  const channel = audience === 'brokers' ? 'broker' : 'direct';
  const oneTeam = remote ? 'one team for your whole distributed crew, run over Zoom, zero lift' : `one team for the whole crew, on-site${audience === 'brokers' ? '' : ' and remote'}, zero lift`;
  const roles = {
    2: 'TOUCH 2 (value bump): add ONE new concrete thing they did not get in the first email — a single REAL proof point (from the positioning above) or one specific detail — tied to the benefit in the same sentence, never a bare stat on its own line. Lead with the new thing. NEVER "just following up", "bumping this", or "did you see my note".',
    3: `TOUCH 3 (differentiation${bookACallUrl ? ' + one link' : ''}): in a sentence, make clear Shortcut is ${oneTeam}.${bookACallUrl ? ` Then offer the page once, softly: "I put together a quick overview if it helps: ${bookACallUrl}". Use that exact URL exactly once.` : ''} Keep it short.`,
    4: 'TOUCH 4 (graceful breakup): one last note. Drop ONE final REAL proof point, then a warm no-pressure out ("I will leave you be. Reach out anytime if it is ever useful."). NEVER guilt, NEVER "last chance" or "final attempt".',
  };
  return `You write a SHORT in-thread follow-up email AS Will Newton, founder and CEO of Shortcut (getshortcut.co). Will's earlier note is ALREADY above in this thread, so do NOT reintroduce him or Shortcut and do NOT restate the full pitch.

${buildPositioningBlock({ channel, remote })}

Everything above is the SOURCE OF TRUTH for the facts, services, and proof you may use (say them in your own words, never invent a number or client). This is a SHORT reply, so do NOT dump the positioning; just pull the ONE thing this touch needs.

TODAY IS ${todayLong()}. Never call a month/date that has already passed "upcoming".

WILL'S VOICE (email breathes, warmth over compression): calm, warm, casual, human. Contractions. Complete sentences only, never a bare service list dropped in as its own line. Vary sentence length naturally; do not compress into clipped fragments. No buzzwords. No dashes as punctuation (end the sentence instead). No exclamation points except the sign-off.
${exemplars.length ? `\nWILL'S REAL SENT EMAILS (match register/rhythm, do not copy):\n${exemplars.slice(0, 3).map((e, i) => `--- ${i + 1} ---\n${e}`).join('\n')}\n` : ''}
IN-THREAD: this is a reply. Open naturally (a light "Hi {first name}," is fine, or dive straight in). A few short sentences total. One idea per short paragraph.

${audience === 'brokers'
    ? 'BROKER CONTEXT: still channel courtship — helping the broker help their CLIENTS deploy carrier wellness funds. Client-side credibility only (companies Will talks to, never claims about the broker\'s own book outside a question). Name only fund-eligible services (chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching). Never say "groups".'
    : `TECH-EXEC CONTEXT: celebrate-and-offer sentiment. NEVER assert their team is stressed/burned out/overstretched (only inside an if/as/when clause or a question). NEVER consequence or urgency framing. NEVER RTO / "worth the commute" framing.${remote ? ' This company is fully remote: keep to the flexible/virtual services (mindfulness, sound baths, nutrition coaching), never on-site massage/nails/facials.' : ''} Offer to help their people take a beat.`}

${roles[touchNumber] || roles[4]}

CLOSE: ${ctaVariant === 'convo' ? 'offer a short call if it is a fit ("happy to hop on a quick call if useful"). No calendar link, no times.' : 'offer to send more or help ("happy to share more if it is useful"). Zero pressure.'} ${touchNumber === 4 ? '(For the breakup touch the out itself is the close.)' : ''}
Sign off "Cheers!" or "Thanks!" on its own line, then "Will". That is the ONLY exclamation mark. Nothing after (his signature is appended).

Report via report_followup exactly once.`;
}

async function draftFollowup(anthropic, { lead, audience, ctaVariant, trigger, touchNumber, exemplars, bookACallUrl, priorBodies, remote = false }) {
  const userContent = [
    'THE PERSON (JSON):',
    JSON.stringify({ name: lead.name, title: lead.title, company: lead.company, why_now_trigger: trigger || null, remote_or_distributed: remote || null }, null, 2),
    '',
    'PRIOR TOUCHES IN THIS THREAD (do NOT repeat their content or phrasing):',
    ...(priorBodies || []).map((b, i) => `--- touch ${i + 1} ---\n${b}`),
    '',
    `Write follow-up touch ${touchNumber}, then call report_followup once.`,
  ].join('\n');
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: 1500, temperature: 0.4,
    system: followupSystem(exemplars, audience, ctaVariant, touchNumber, trigger, bookACallUrl, remote),
    tools: [{ name: 'report_followup', description: 'Report the finished follow-up. Call exactly once.', input_schema: FOLLOWUP_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_followup' },
    messages: [{ role: 'user', content: userContent }],
  });
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_followup');
  if (!tu) throw new Error('no report_followup from drafter');
  return { ...tu.input, body: autoSplitParagraphs(autoFixServiceFragment(autoFixDashes(normalizeParagraphs(tu.input.body || '')))) };
}

/**
 * composeFollowup — draft an in-thread follow-up touch, gate it (allowing the one
 * book-a-call link on touch 3), revise once on violation. Returns { body,
 * touch_summary }. The subject is NOT generated here: the sender reuses the E1
 * subject so Gmail keeps the thread grouped.
 */
export async function composeFollowup(anthropic, { lead, audience, ctaVariant = 'help', trigger = null, remote = false, touchNumber, exemplars = [], bookACallUrl = null, priorBodies = [], label = lead?.email || 'lead', log = console.error }) {
  const allowLinks = (touchNumber === 3 && bookACallUrl) ? [bookACallUrl] : [];
  const guardOpts = { allowLinks, followup: true };
  let fu = await draftFollowup(anthropic, { lead, audience, ctaVariant, trigger, touchNumber, exemplars, bookACallUrl, priorBodies, remote });
  const asNote = () => ({ subject: '', body: fu.body });
  try { guardNote(asNote(), audience, trigger, guardOpts); } catch (ge) {
    log(`followup guard hit for ${label} (touch ${touchNumber}): ${ge.message} — revising`);
    // one revision with the failure fed back
    const resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 1200, temperature: 0.4,
      system: followupSystem(exemplars, audience, ctaVariant, touchNumber, trigger, bookACallUrl, remote),
      tools: [{ name: 'report_followup', description: 'Report the revised follow-up.', input_schema: FOLLOWUP_SCHEMA }],
      tool_choice: { type: 'tool', name: 'report_followup' },
      messages: [{ role: 'user', content: `Your previous follow-up FAILED a hard rule: ${ge.message}\n\nPREVIOUS:\n${fu.body}\n\nFix it and re-report. Keep it short and in-thread.` }],
    });
    const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_followup');
    if (!tu) throw new Error('followup revision produced nothing');
    fu = { ...tu.input, body: autoSplitParagraphs(autoFixServiceFragment(autoFixDashes(normalizeParagraphs(tu.input.body || '')))) };
    guardNote(asNote(), audience, trigger, guardOpts); // throws -> caller skips this touch
  }
  return fu;
}

// Follow-up cadence — CUMULATIVE days from the E1 send. The cold engine's "+3/+4/+5"
// means the gap BETWEEN steps (3 days after E1, then 4 after E2, then 5 after E3), i.e.
// cumulative days 3 / 7 / 12 — the conventional 3-4 business-day spacing over ~2 weeks
// (Smartlead + industry best practice). The founder lane originally mis-read those as
// absolute offsets from E1 (3/4/5 = three touches on consecutive days), which was too
// aggressive; corrected 2026-07-08. The sender compares this to age-from-E1.
export const FOLLOWUP_CADENCE = { 2: 3, 3: 7, 4: 12 };
