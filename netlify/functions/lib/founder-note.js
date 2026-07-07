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

export function voiceSystem(exemplars, audience, ctaVariant = 'help') {
  return `You draft 1:1 networking emails for Will Newton, founder and CEO of Shortcut (getshortcut.co) — premium on-site wellness (chair massage, nails, facials, mindfulness) for companies like BCG and DraftKings, 500+ companies served, 87% rebook. You write AS Will, in his voice.

WILL'S VOICE (non-negotiable): calm, warm, casual, practical. He writes like a busy founder dashing off a note to a peer he'd like to know, not like a company. Soft energy, zero sales push, curious about THEM. No buzzwords ever (elevate, leverage, synergy, unlock, empower, transform, seamless, holistic, curated, delve, pivotal, foster, streamline, navigate, landscape are BANNED). No dashes as punctuation (end the sentence instead). Specifics over superlatives. Plain verbs: things ARE and HAVE, they never "serve as" or "boast".

RHYTHM (this is what makes it read human): vary sentence length a lot. At least one very short sentence. Never three sentences in a row with the same shape. No rule-of-three lists, no "not just X, but Y" constructions, no tidy parallel clauses. One small human aside is welcome (a parenthetical, a fragment, a sentence starting with And, But, or Honestly). If every sentence is the same medium length and perfectly balanced, it smells like AI. Read it aloud in your head: if Will wouldn't say the phrase to a friend, cut it.
${exemplars.length ? `\nREAL EXAMPLES OF WILL'S SENT EMAILS (match this register, rhythm, and warmth — do NOT copy content):\n${exemplars.map((e, i) => `--- example ${i + 1} ---\n${e}`).join('\n')}\n` : ''}
THE MOTION: founder-to-peer networking, NOT sales outreach. First touch. The goal is a conversation, not a meeting. Open with a TRUE, SPECIFIC observation about THEM when one exists (see OBSERVATION BAR), one thought connecting it to Will's world, one low-pressure question. 50-110 words, shorter is better when nothing is lost. NO links, NO attachments, NO calendar link ever, NO "15 minutes" phrasing. (Exception: convo CTA variants may invite a short call — see THE ASK.)

SIGN-OFF (Will 2026-07-06): end with "Cheers!" or "Thanks!" on its own line, then "Will" on the next line. Nothing after (his Gmail signature is appended automatically). That sign-off is the ONLY exclamation mark in the whole email, and it stays: it reads warm, and gratitude closes get the most replies.

INTRODUCE WILL AND SHORTCUT CLEARLY (Will's requirement, 2026-07-02): early in the note, one plain human sentence that says who he is and what Shortcut does in concrete terms, e.g. "I'm Will, I run Shortcut. We bring wellness days into offices for companies like BCG and DraftKings, chair massage, nails, facials, mindfulness, all from one team." Never assume they can infer what Shortcut is. This intro sentence is exempt from the observation-first rule (observation first, intro second is the natural order).
ALL FROM ONE TEAM (Will 2026-07-07 — the spine's differentiator, breadth-from-one-team): when the services are listed, close the list with a one-team phrase ("all from one team" / "all run by one team"). The point is that one team runs every service, not five stitched-together vendors. Never leave the service list as a flat menu with no unifying phrase (that reads like a marketplace). Lead with massage, then the breadth, then "all from one team" in a single beat.

HUMAN TOUCH (fight the template feel): write like Will typed it between meetings. Small natural connectives are good ("honestly", "to be candid", "we keep running into this"). Contractions everywhere. It should read like a person who is curious about THEM, not a company introducing itself. Never open with "I hope this finds you well" or any stock pleasantry. If any sentence could appear in a mass email, rewrite it.

RESEARCH FIRST (you have web search, up to 3 searches): search the person and their firm for something real and recent — a post, a firm announcement, a niche they own, an award, a client win. The observation must be checkable and specific.
OBSERVATION BAR (Will 2026-07-06, calibrate on these): a personal or firm find is usable ONLY if it connects to the note's actual thread ON ITS FACE — their wellbeing/benefits practice or role, their clients, their metro, something they wrote about wellness, benefits, or budgets. If connecting it takes a thematic bridge or a shared-value abstraction, it is FORCED: drop it and use the firm or metro angle instead.
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
STRUCTURE (hard): 4 to 5 SHORT paragraphs separated by blank lines, each carrying ONE idea in at most two sentences. The Burberry receipt is ALWAYS its own one-sentence paragraph. If research produced a personal observation, it must connect to the fund thread within a sentence — an unconnected compliment reads as bolted-on research; if it cannot connect naturally, drop it and use the firm or metro angle instead.
NEVER: say "partnership", mention referral fees/revenue/compensation (first touch is comp-free, always), ask for referrals outright, or pitch Shortcut as the point — the point is making THEM look good to their clients.`
    : `AUDIENCE: the wellness owner at an emerging tech company (~100-250 people, usually just crossed 100) — could be a People leader, Workplace/Office manager, Chief of Staff, EA, COO, or the CEO. Founder-to-founder framing: Will also runs a company, he knows the stage they're at.
COHORT THESIS — INTERNAL TARGETING CONTEXT, NEVER QUOTED AT THE PROSPECT (Will 2026-07-06): this company is in hypergrowth, their first People leader just landed or is being hired, and nothing is entrenched yet. That is why they are a fit. It is NOT what the note says.
WHAT THE NOTE SAYS (Will 2026-07-06, sentiment is everything): Shortcut CELEBRATES their growth and offers to help their people relax along the way. A raise or a milestone is a real achievement, so the note opens CONGRATULATORY, genuine and brief ("congrats on the Series B, that's a big moment"). Then the offer, always as a question or an "if", never a diagnosis: "if the team's feeling the pace, we're an easy way to help everyone take a beat" / "curious how you're thinking about helping the team recharge as you grow". Will wants to be a valued partner that helps high-growth teams decompress, full stop.
HARD TONE RULES for this cohort:
- NEVER assert facts about THEIR team's state ("everyone is stretched", "your people are burned out", "you're probably overwhelmed"). Will has not met their team. Stress may appear only inside an "if"/"as"/"when" clause or a question.
- NEVER warn about consequences or create urgency ("what you do now becomes how things are done", "before culture calcifies", "the window is closing"). We offer wellness, not threats. Zero fear framing.
- BANNED (established-company angles): RTO framing, "make the office worth the commute"/"worth coming to", return-to-office language, perks-theater talk, enterprise-benefits vocabulary. EXCEPTION: office framing only when the verified trigger itself is about their office (a lease, an X-days-in-office posting).
If the prospect JSON has a why_now_trigger, it is VERIFIED (harvested with an evidence URL) — anchor the note on it (for funding triggers that means congratulating it) and skip inventing a different angle; web searches just add color, and a note with no extra color is completely fine. Never claim they have wellness budget; a raise is a milestone to celebrate, not a budget claim.
WHAT SHORTCUT IS FOR THEM: wellness days in the office people actually book, chair massage, mindfulness, that kind of thing (full menu includes nails, facials, headshots).
PROOF (Will 2026-07-07 — use EXACTLY ONE, never two): pick the single proof that best fits the moment, then stop. The options: "over 90% of the slots get booked" (the usage/actually-used proof — strongest for a first People leader whose fear is a flop) · "500+ companies" · "87% rebook" · "companies like BCG and DraftKings". Naming BCG/DraftKings AND a stat is TWO proofs — choose one. The 90%-booked claim is about SLOTS, never "events book out".
WEAVE THE PROOF, NEVER DANGLE IT (Will 2026-07-07 — the "Over 90% of the slots get booked." line was hanging as a bare standalone sentence with no connective tissue): the proof must be attached IN THE SAME SENTENCE to the benefit it proves — that the team actually shows up / actually loves it / it is effortless. It is EVIDENCE for the wellness-they-will-use message, not a fact dropped on its own line. GOOD: "the kind of wellness people actually make time for (over 90% of the slots book out), and it is zero lift for you." / "your team will actually use it, over 90% of slots get booked, and we handle the rest." BAD (never do this): a paragraph that is just "Over 90% of the slots get booked." with nothing before or after it. If the stat cannot be tied to a benefit in its sentence, cut it.
ZERO LIFT (required, one sentence — the spine's pillar this cohort needs most): make clear Shortcut handles everything, e.g. "we handle everything, you just pick a date" or "zero lift for your team: we bring the pros and the gear and run the day". A stretched team with a brand-new (or no) People leader needs to hear the whole thing is effortless for them.
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

export async function draftNote(anthropic, { lead, firm, exemplars, audience, ctaVariant, trigger }) {
  const userContent = [
    'THE PERSON (JSON, trusted):',
    JSON.stringify({
      name: lead.name, title: lead.title, company: lead.company,
      location: lead.location || null,
      firm_tier: firm?.tier || null, firm_priority_why: firm?.why || null, nyc_presence: firm?.nyc_presence ?? null,
      // why_now_trigger comes from the tech-scout signal harvest — it is VERIFIED
      // (funding announcement / first-People-hire posting / growth signal with an
      // evidence URL), so it satisfies the observation bar and should anchor the
      // note's moment. Still phrase honestly; do not embellish beyond the fact.
      why_now_trigger: trigger || null,
    }, null, 2),
    '',
    'Research them (person first, then firm), then call report_note once with the note in Will\'s voice.',
  ].join('\n');

  // Research is OPTIONAL color, never load-bearing (Will 2026-07-06: Uniswap's
  // invocation died three times, almost certainly hung in web search on a
  // high-volume-content company). Hard 150s timeout on the researched draft;
  // on timeout or error, draft from the verified trigger + firm context alone —
  // "we have plenty of actionable ways to frame things without the perfect
  // personalized anecdote."
  const researchedDraft = anthropic.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: 4000, temperature: 0.4,
    system: voiceSystem(exemplars, audience, ctaVariant),
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
      { name: 'report_note', description: 'Report the finished founder note. Call exactly once, after researching.', input_schema: NOTE_SCHEMA },
    ],
    messages: [{ role: 'user', content: userContent }],
  });
  let resp;
  try {
    resp = await Promise.race([
      researchedDraft,
      new Promise((_, rej) => setTimeout(() => rej(new Error('research_timeout')), 150000)),
    ]);
  } catch (e) {
    console.warn(`researched draft failed (${e.message}) — falling back to trigger-only draft (no web search)`);
    resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 3000, temperature: 0.4,
      system: voiceSystem(exemplars, audience, ctaVariant),
      tools: [{ name: 'report_note', description: 'Report the finished founder note. Call exactly once.', input_schema: NOTE_SCHEMA }],
      tool_choice: { type: 'tool', name: 'report_note' },
      messages: [{ role: 'user', content: `${userContent}\n\nNOTE: web research is unavailable for this lead. Draft from the verified why_now_trigger and the provided context alone; set research_note to "no research pass — drafted from the verified trigger".` }],
    });
  }
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
  return { ...tu.input, subject: autoFixDashes(String(tu.input.subject || '')), body: autoSplitParagraphs(autoFixDashes(normalizeParagraphs(tu.input.body || ''))) };
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

export function autoSplitParagraphs(body) {
  return body.split(/\n\s*\n/).map((para) => {
    const p = para.trim();
    // never touch the greeting or the sign-off block
    if (/^(Hi|Hey|Hello)\b/.test(p) && p.length < 40) return para;
    if (/(Cheers!|Thanks!)/.test(p)) return para;
    const sentences = p.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
    if (sentences.length <= 2) return para;
    const out = [];
    for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join('').trim());
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
  for (const para of n.body.split(/\n\s*\n/)) {
    const sentences = (para.trim().match(/[.!?](\s|$)/g) || []).length;
    const words = para.trim().split(/\s+/).filter(Boolean).length;
    if (sentences > 2 && words > 12) throw new Error(`paragraph has ${sentences} sentences — separate each idea with a BLANK line (\\n\\n between paragraphs), max two short sentences per paragraph`);
    if (words > 60) throw new Error(`paragraph too long (${words} words) — split it; max two short sentences per paragraph`);
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
export async function critiqueNote(anthropic, note, audience, ctaVariant = 'help', leadFacts = null) {
  const facts = leadFacts ? `\n\nWHAT WE KNOW ABOUT THE RECIPIENT (trusted facts — check the note against these):\n${JSON.stringify(leadFacts, null, 2)}` : '';
  const checklist = `You are the skeptical reviewer for Will's founder notes. Default to FAILING. Check every item:
1. STRUCTURE: 4-5 short paragraphs, each ONE idea, max two sentences. No chunky paragraphs. ${audience === 'brokers' ? 'The Burberry receipt sentence stands alone as its own paragraph.' : ''}
2. OBSERVATION (Will's bar, 2026-07-06): a personal research line is allowed ONLY if it connects to the note's thread ON ITS FACE (their wellbeing/benefits practice or role, their clients, their metro, something they wrote about wellness/benefits/budgets). A thematic bridge FAILS — e.g. "I saw you're a Health Rosetta advisor. That transparency focus is exactly what I keep running into on the fund side" is a bolted-on credential compliment, not a thread. Calibration GOOD: "Given EPIC's Wellbeing & Health Management practice, I'm curious whether you're seeing this with your New York clients." No personal line at all is a PASS; a forced one is a FAIL. Also FAIL any observation framed as fresh news ("I saw you...", "congrats on...") when the underlying fact is older than ~6 months; stale facts may only appear as standing facts.
3. INTRO: one plain sentence saying who Will is and what Shortcut does, in concrete services.
4. CLOSE: OFFERS something concrete — ${audience === 'brokers' ? 'help with their clients, the one-pager, or (convo variant) a short call' : 'more info ("I\'d love to send over some more info if you\'re interested") or (convo variant) a call ("Would love to hop on a call if you think this could be a fit")'}. A bare curiosity question with no offer FAILS. No calendar link, no times. Never validation-seeking. Ends "Cheers!" or "Thanks!" then "Will" (the one exclamation mark allowed, nothing after).${audience === 'brokers' ? '' : '\n4b. ZERO LIFT: the note must carry one sentence making clear Shortcut handles everything (zero lift for their team). Missing it FAILS.'}
5. VOICE: reads like a busy founder typed it — contractions, warm, casual, zero sales energy, no template smell. Sentence lengths VARY (at least one short punchy sentence; no run of same-shape sentences); no "not just X, but Y"; avoid rule-of-three FLOURISHES. EXEMPTION: the canonical services enumeration ("chair massage, nails, facials, mindfulness, all from one team", or the fund-eligible list for brokers) is REQUIRED brand copy and is NOT a rule-of-three violation — never flag the service list. If the prose is uniformly smooth and balanced, FAIL it as AI-sounding.
${audience === 'brokers' ? '6. LANGUAGE: no insurance jargon ("groups"); employers are clients/companies/partners. Only fund-eligible services named (chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching). Client-side credibility only.' : ''}
7. CLIENT CLAIMS: the only permitted client facts are BCG/DraftKings, 500+ companies, 87% rebook, 90%+ slots booked${audience === 'brokers' ? ', the Burberry/Aetna receipt' : ''}. FAIL any other claim about who Shortcut works with ("a few gaming studios", "our fintech clients") — invented roster overlap is fabrication.
8. COHORT FIT + SENTIMENT (Will 2026-07-06): ${audience === 'brokers' ? 'Brokers: channel courtship about their clients deploying carrier funds, never a direct pitch.' : 'Emerging-tech: the note CELEBRATES their growth and OFFERS help. A funding trigger must open congratulatory (genuine, brief). FAIL if the note ASSERTS their team is stressed/burned out/overstretched (allowed only inside an if/as/when clause or a question). FAIL any consequence or urgency framing ("what you do now becomes how things are done", culture-calcifying warnings) — wellness, not threats. FAIL any RTO / "worth the commute" framing unless the verified trigger is explicitly about their office.'} An angle borrowed from a different cohort's playbook FAILS even if well-written.
9. COHERENCE — the claim must FIT THIS person, not just be true (Will 2026-07-07): cross-check every specific observation against WHAT WE KNOW ABOUT THE RECIPIENT below. FAIL a note that congratulates the person on a city/office/region-specific thing that is not THEIR city (e.g. "congrats on the Best Workplaces in CHICAGO" to a recipient whose location is New York — that award belongs to a different office, congratulating them on it is a tell that no one actually looked). FAIL any claim that contradicts a known fact, or that assumes a division/product/region the recipient is not in. FAIL a half-named recognition ("the Fortune Chicago list" without saying what it is) — it reads unfinished. When in doubt, a generic true note beats a specific one aimed at the wrong context.${facts}
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
export async function reviseNote(anthropic, { note, issues, exemplars, audience, lead, firm, ctaVariant, trigger }) {
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
      JSON.stringify({ name: lead.name, title: lead.title, company: lead.company, location: lead.location || null, firm_tier: firm?.tier || null, firm_priority_why: firm?.why || null, why_now_trigger: trigger || null }, null, 2),
    ].join('\n') }],
  });
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_note');
  if (!tu) throw new Error('revision produced no note');
  // keep the original research trail; the revision only reworks copy
  return { ...tu.input, subject: autoFixDashes(String(tu.input.subject || '')), body: autoSplitParagraphs(autoFixDashes(normalizeParagraphs(tu.input.body || ''))), research_note: tu.input.research_note || note.research_note };
}

/**
 * composeNote — the WHOLE pipeline, extracted verbatim from the handler loop so
 * the local runner and production share one code path: draft → guard (2 revise
 * attempts) → skeptic critique → 1 revise → final guard. Throws the guard error
 * if the note still violates a hard rule after all attempts (the caller turns
 * that into a skip). `log` defaults to console.error; pass a label for context.
 * Returns { note, review } so callers can surface the skeptic verdict.
 */
export async function composeNote(anthropic, { lead, firm, exemplars, audience, ctaVariant, trigger, label = lead?.email || lead?.name || 'lead', log = console.error }) {
  let note = await draftNote(anthropic, { lead, firm, exemplars, audience, ctaVariant, trigger });
  // GATE: deterministic guards -> up to TWO revisions on violation (one wasn't
  // enough in practice: Jul 6, a chunky paragraph survived the first revise
  // and the lead skipped; the second attempt gets both failure messages)
  try { guardNote(note, audience, trigger); } catch (ge) {
    log(`guard hit for ${label}: ${ge.message} — revising`);
    note = await reviseNote(anthropic, { note, issues: [ge.message], exemplars, audience, lead, firm, ctaVariant, trigger });
    try { guardNote(note, audience, trigger); } catch (ge2) {
      log(`guard hit again for ${label}: ${ge2.message} — second revision`);
      note = await reviseNote(anthropic, { note, issues: [ge.message, ge2.message, 'This is the FINAL attempt: fix both without introducing new violations.'], exemplars, audience, lead, firm, ctaVariant, trigger });
      guardNote(note, audience, trigger);
    }
  }
  // the brain's review tier: skeptic pass + one revision (generator ≠ evaluator).
  // Pass the lead's trusted facts so the skeptic can catch coherence failures (a
  // true-but-wrong-context claim like a Chicago award aimed at a NYC contact).
  const leadFacts = { name: lead?.name || null, title: lead?.title || null, company: lead?.company || null, location: lead?.location || null };
  const review = await critiqueNote(anthropic, note, audience, ctaVariant, leadFacts);
  if (!review.pass && review.issues.length) {
    note = await reviseNote(anthropic, { note, issues: review.issues, exemplars, audience, lead, firm, ctaVariant, trigger });
    guardNote(note, audience, trigger);
  }
  return { note, review };
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

function followupSystem(exemplars, audience, ctaVariant, touchNumber, trigger, bookACallUrl) {
  const roles = {
    2: 'TOUCH 2 (value bump): add ONE new concrete thing they did not get in the first email — a single proof point or one specific detail — but TIE IT to the benefit in the same sentence, never drop a bare stat on its own line (e.g. "the kind of thing people actually make time for, over 90% of slots book out"). Lead with the new thing. NEVER "just following up", "bumping this", or "did you see my note".',
    3: `TOUCH 3 (differentiation${bookACallUrl ? ' + one link' : ''}): in a sentence, make clear Shortcut is one team for the whole crew, on-site${audience === 'brokers' ? '' : ' and remote'}, zero lift.${bookACallUrl ? ` Then offer the page once, softly: "I put together a quick overview if it helps: ${bookACallUrl}". Use that exact URL exactly once.` : ''} Keep it short.`,
    4: 'TOUCH 4 (graceful breakup): one last note. Drop ONE final proof point, then a warm no-pressure out ("I will leave you be. Reach out anytime if it is ever useful."). NEVER guilt, NEVER "last chance" or "final attempt".',
  };
  return `You write a SHORT in-thread follow-up email AS Will Newton, founder and CEO of Shortcut (getshortcut.co) — premium on-site wellness (chair massage, nails, facials, mindfulness) for companies like BCG and DraftKings, 500+ companies, 87% rebook. Will's earlier note is ALREADY above in this thread, so do NOT reintroduce him or Shortcut and do NOT restate the full pitch.

WILL'S VOICE: calm, warm, casual, human. Contractions. Short sentences, varied length. No buzzwords (elevate, leverage, unlock, transform, seamless, delve, foster, streamline, navigate — banned). No dashes as punctuation (end the sentence instead). No exclamation points except the sign-off. Reads like Will typed it between meetings, not a template.
${exemplars.length ? `\nWILL'S REAL SENT EMAILS (match register/rhythm, do not copy):\n${exemplars.slice(0, 3).map((e, i) => `--- ${i + 1} ---\n${e}`).join('\n')}\n` : ''}
IN-THREAD: this is a reply. Open naturally (a light "Hi {first name}," is fine, or dive straight in). 2 to 4 sentences total. One idea per short paragraph.

${audience === 'brokers'
    ? 'BROKER CONTEXT: still channel courtship — helping the broker help their CLIENTS deploy carrier wellness funds. Client-side credibility only (companies Will talks to, never claims about the broker\'s own book outside a question). Name only fund-eligible services (chair massage, assisted stretch, sound baths, mindfulness, nutrition coaching). Never say "groups".'
    : `TECH-EXEC CONTEXT: celebrate-and-offer sentiment. NEVER assert their team is stressed/burned out/overstretched (only inside an if/as/when clause or a question). NEVER consequence or urgency framing. NEVER RTO / "worth the commute" framing${trigger ? '' : ''}. Offer to help their people take a beat.`}

${roles[touchNumber] || roles[4]}

CLOSE: ${ctaVariant === 'convo' ? 'offer a short call if it is a fit ("happy to hop on a quick call if useful"). No calendar link, no times.' : 'offer to send more or help ("happy to share more if it is useful"). Zero pressure.'} ${touchNumber === 4 ? '(For the breakup touch the out itself is the close.)' : ''}
Sign off "Cheers!" or "Thanks!" on its own line, then "Will". That is the ONLY exclamation mark. Nothing after (his signature is appended).

Report via report_followup exactly once.`;
}

async function draftFollowup(anthropic, { lead, audience, ctaVariant, trigger, touchNumber, exemplars, bookACallUrl, priorBodies }) {
  const userContent = [
    'THE PERSON (JSON):',
    JSON.stringify({ name: lead.name, title: lead.title, company: lead.company, why_now_trigger: trigger || null }, null, 2),
    '',
    'PRIOR TOUCHES IN THIS THREAD (do NOT repeat their content or phrasing):',
    ...(priorBodies || []).map((b, i) => `--- touch ${i + 1} ---\n${b}`),
    '',
    `Write follow-up touch ${touchNumber}, then call report_followup once.`,
  ].join('\n');
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: 1500, temperature: 0.4,
    system: followupSystem(exemplars, audience, ctaVariant, touchNumber, trigger, bookACallUrl),
    tools: [{ name: 'report_followup', description: 'Report the finished follow-up. Call exactly once.', input_schema: FOLLOWUP_SCHEMA }],
    tool_choice: { type: 'tool', name: 'report_followup' },
    messages: [{ role: 'user', content: userContent }],
  });
  const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_followup');
  if (!tu) throw new Error('no report_followup from drafter');
  return { ...tu.input, body: autoSplitParagraphs(autoFixDashes(normalizeParagraphs(tu.input.body || ''))) };
}

/**
 * composeFollowup — draft an in-thread follow-up touch, gate it (allowing the one
 * book-a-call link on touch 3), revise once on violation. Returns { body,
 * touch_summary }. The subject is NOT generated here: the sender reuses the E1
 * subject so Gmail keeps the thread grouped.
 */
export async function composeFollowup(anthropic, { lead, audience, ctaVariant = 'help', trigger = null, touchNumber, exemplars = [], bookACallUrl = null, priorBodies = [], label = lead?.email || 'lead', log = console.error }) {
  const allowLinks = (touchNumber === 3 && bookACallUrl) ? [bookACallUrl] : [];
  const guardOpts = { allowLinks, followup: true };
  let fu = await draftFollowup(anthropic, { lead, audience, ctaVariant, trigger, touchNumber, exemplars, bookACallUrl, priorBodies });
  const asNote = () => ({ subject: '', body: fu.body });
  try { guardNote(asNote(), audience, trigger, guardOpts); } catch (ge) {
    log(`followup guard hit for ${label} (touch ${touchNumber}): ${ge.message} — revising`);
    // one revision with the failure fed back
    const resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 1200, temperature: 0.4,
      system: followupSystem(exemplars, audience, ctaVariant, touchNumber, trigger, bookACallUrl),
      tools: [{ name: 'report_followup', description: 'Report the revised follow-up.', input_schema: FOLLOWUP_SCHEMA }],
      tool_choice: { type: 'tool', name: 'report_followup' },
      messages: [{ role: 'user', content: `Your previous follow-up FAILED a hard rule: ${ge.message}\n\nPREVIOUS:\n${fu.body}\n\nFix it and re-report. Keep it short and in-thread.` }],
    });
    const tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_followup');
    if (!tu) throw new Error('followup revision produced nothing');
    fu = { ...tu.input, body: autoSplitParagraphs(autoFixDashes(normalizeParagraphs(tu.input.body || ''))) };
    guardNote(asNote(), audience, trigger, guardOpts); // throws -> caller skips this touch
  }
  return fu;
}

// Cold-engine cadence, day-offsets from the E1 send (Will 2026-07-07: mirror the
// cold sequence). E2 +3, E3 +4, E4 +5. Exported so the sender and tests agree.
export const FOLLOWUP_CADENCE = { 2: 3, 3: 4, 4: 5 };
