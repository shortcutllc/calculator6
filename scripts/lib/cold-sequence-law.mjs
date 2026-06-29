/**
 * cold-sequence-law.mjs — the LAW-FIRM cold sequence (segment=law).
 *
 * Two openers (cold-engine --opener cle|wellness):
 *   cle      — the CLE wedge. Leads with the mandatory Ethics & Professionalism
 *              credit we cover as an accredited provider. ONLY for NY/FL/PA lists
 *              (we are accredited nowhere else — copy-evaluator blocks other
 *              states + any overstatement of the credit). The unique door-opener
 *              into Professional Development / CLE administrators.
 *   wellness — general law-firm wellness, utilization-led (firms buy wellbeing
 *              nobody uses; we are the part attorneys actually show up for).
 *              Safe for any state (makes no CLE claim). Massage-led like direct.
 *
 * See memory/vertical_law_firm_gtm.md. HARD COMPLIANCE: only the ethics
 * category, only NY/FL/PA, "an hour of your mandatory ethics credit" NEVER
 * "covers your requirement". E3 upsells the wellness day; E4 uses the year-end
 * compliance-deadline hook. Spintax throughout; %sender-firstname% = signature.
 */

// E1 — CLE wedge (NY/FL/PA only). No massage lead; leads with the credit.
const E1_CLE = {
  step: 1, delayDays: 0,
  subjects: ['the ethics credit your attorneys put off', 'an accredited ethics CLE, fully handled'],
  body: `{Hi|Hey} {{first_name}},

{Every attorney needs their ethics credit, and it is the one they put off|The ethics credit is mandatory, and the one most attorneys leave until last}.

{Shortcut runs on-site wellness for over 500 companies|Shortcut brings on-site wellness to 500+ companies}, and we are an accredited CLE provider. Our {one hour|sixty minute} Ethics and Professionalism session covers an hour of that requirement. {We handle the board submission, attendance, and reporting|We file with the board, track attendance, and report the credit}, so your firm does nothing.

{Led by Courtney Schulnick, a litigator of twenty years turned mindfulness teacher|Taught by Courtney Schulnick, who practiced law for two decades before teaching mindfulness}. Accredited in New York, Florida, and Pennsylvania.

{Worth a quick chat about {{company_name}}?|Open to sharing a few details for your attorneys?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

// E1 — general law wellness (any state, utilization-led, massage hero).
const E1_WELLNESS = {
  step: 1, delayDays: 0,
  subjects: ['the wellbeing your attorneys actually use', 'the part of wellness people show up for'],
  body: `{Hi|Hey} {{first_name}},

{Most firms already offer wellbeing their attorneys never use|Most wellbeing programs quietly go unused at firms}.

At Shortcut, we are the part they actually show up for. We turn a conference room into a spa for the day, with {massage, nails, facials, and more|chair massage, nails, facials, and more}, all from one team, and {over 90% of slots booked|90%+ of slots booked}.

{You pick a date. We run the rest|We run everything, so all you do is pick a date}.

{Worth a quick chat about {{company_name}}?|Open to sharing a few details for your attorneys?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

// E2 — simple bump (shared; no proof).
const E2 = {
  step: 2, delayDays: 3,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}}, {hope your week is treating you well|hope you are having a good week}.

Following up on the note below. {Wondering if we could connect?|Worth a quick chat?}

{Thanks,|Best,}
%sender-firstname%`,
};

// E3 — the wellness-day upsell + utilization proof, with the state CLE page.
// {{cle_url}} resolves per lead to their state's page (NY /cle, FL /cle/fl,
// PA /cle/pa) — set in cold-engine custom_fields. The page shows the accredited
// session AND the wellness-day packages, so it matches this email exactly.
const E3 = {
  step: 3, delayDays: 4,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}},

{One more thought|A quick add}. While you have everyone together for the session, many firms make it a full day.

{We add chair massage in a conference room turned spa, plus nails and facials|On top of the CLE, we run chair massage, nails, and facials}, all from one team. {It is the part people actually show up for|It is the part attorneys actually book}. Over 90% of slots get booked, and 87% of firms rebook.

You can see the accredited session and the full day here: {{cle_url}}

{Happy to talk it through|Open to a quick call whenever works}. {Just reply and I will answer any questions.|Worth a short call?}

{Warmly,|Thanks,}
%sender-firstname%`,
};

// E4 — soft close with the year-end compliance-deadline hook.
const E4 = {
  step: 4, delayDays: 5,
  subjects: [''],
  body: `{Hi|Hey} {{first_name}}, {I will keep this short|I do not want to crowd your inbox}.

{If now is not the time, no problem at all|If the timing is not right, I completely understand}.

{Most compliance deadlines land at year end|With deadlines clustering at year end}, so happy to hold a date whenever it helps. {Just reply and I will step away|A quick note back and I will close the loop}.

{Warmly,|Thanks,}
%sender-firstname%`,
};

export function coldSequenceLaw(opener = 'cle') {
  const e1 = opener === 'wellness' ? E1_WELLNESS : E1_CLE;
  return { label: `law cold (${opener} opener, spintax)`, segment: 'law', opener, steps: [e1, E2, E3, E4] };
}

export const COLD_SEQUENCE_LAW_CLE = coldSequenceLaw('cle');
export const COLD_SEQUENCE_LAW_WELLNESS = coldSequenceLaw('wellness');
