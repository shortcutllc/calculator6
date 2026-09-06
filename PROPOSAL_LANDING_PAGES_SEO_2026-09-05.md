# Proposal Landing Pages — SEO & Positioning Research

**Compiled 2026-09-05 · covers `/cle` + `/cle/pa` + `/cle/fl` (CLE) and the two Solution pages (Brokers, Health Plans)**

Combines Dave's Feb-2026 CLE brief ([CLE_RESEARCH.md](./CLE_RESEARCH.md)) with fresh 3-agent state-specific research (NY / PA / FL) + Google Ads Keyword Planner data (via toprank NotFair-GoogleAds MCP, US geo) + inspection of the current live pages and the new solution-page designs.

Draft copy directions here are POSITIONING guidance, not final copy. Any surface that reaches a prospect must still go through `memory/brand_voice_copywriter.md` + `memory/messaging_spine.md` and produce the 3-directions (safe/medium/brave) sanity check per the copy rule in CLAUDE.md.

---

## Executive summary

Three landing-page tracks were audited. They diverge sharply on strategy:

| Track | Pages | Primary use | Optimize for |
|---|---|---|---|
| **CLE** | `/cle` (NY default) · `/cle/pa` · `/cle/fl` | Firm CLE admin buyer with genuine Google demand behind them | Organic SEO + paid |
| **Carrier Wellness Fund — Brokers** | Solution / Brokers | Benefits-broker channel partner | Sales enablement + LinkedIn / trade-pub paid |
| **Carrier Wellness Fund — Health Plans** | Solution / Health Plans | Insurance-carrier partnership BD | Sales enablement + ABM (design not viewable this session — recs deferred) |

Two blockers apply to ALL of the above before any recommendations here will move the needle:

1. **The proposals site is a client-side rendered React SPA.** `curl https://proposals.getshortcut.co/cle` returns a 5,680-byte shell with 0 hits for "Ethics" / "Mindfulness" / "CLE credit". Every CLE page shares the same generic `<title>Shortcut Corporate Wellness</title>` and homepage meta description. Google's crawler cannot see any of Dave's carefully researched content. Fix path: SSR the 3 CLE routes (React Router + Vite prerender, or Netlify prerender plugin) so title/meta/H1/body land in initial HTML.
2. **The Solution pages don't need SEO at all.** See §3 — Google Keyword Planner returns UNSPECIFIED (zero verified search volume) for every seed we tested across both broker and health-plan audiences. These pages must be measured as sales enablement + paid channel destinations, not as organic-traffic assets.

---

## 1 · CLE landing pages — full research

### 1.1 Corrections + updates to Dave's Feb-2026 CLE_RESEARCH.md

Cross-referenced against three parallel state-specific research passes (NY / PA / FL) run 2026-09-05:

| Item | Dave's Feb-2026 file | Verified 2026-09-05 |
|---|---|---|
| PA Ethics minimum | not covered | **2 hours/year** in the combined Ethics/Professionalism/Substance Abuse category (raised from Rule 105's original 1-hour floor by Board regulation) |
| FL total credit hours | 33 | **30 per 3-year cycle** — reduced effective January 8, 2024 (Fla. Supreme Court amendment to Rule 6-10.3(b)) |
| FL bias requirement | not covered | Standalone bias sub-quota **removed in 2024**. Bias content still counts toward the 30-hour total but has no separate minimum |
| FL Legal Professionalism sub-requirement | not covered | **2 of the 5 ethics-block hours** must be The Florida Bar's own Legal Professionalism course. Shortcut cannot substitute for this 2-hour segment |
| FL Technology CLE | not covered | **3 hours** in approved technology (data privacy, cybersecurity, AI, eDiscovery). Not relevant to Shortcut's offering but useful context in FAQ |
| ABA Well-Being Pledge signatories | 227 | **400+ signatories** as of 2024-25 |
| BigLaw associate attrition | 16% (2025) | **~19-20% in 2025-2026** (LawFuel · NALP Foundation 2024) |
| Replacement cost / associate | $1M+ | $1M+ still cited by ALM; NALP Foundation puts the range at **$200K-$500K** per departure. Both numbers appear in the wild; the higher figure applies to third-year+ associates |
| NY newly-admitted format rule | "post-12/31/2025" | Confirmed effective **1/1/2026** — Skills credits must be in-person or fully-interactive videoconference. Ethics format remains flexible |
| NY Cybersecurity double-count | not covered | Up to 3 hours of Cybersecurity-Ethics can double-count toward the 4-hour Ethics minimum. Not applicable to Shortcut's mindfulness content but useful context |

### 1.2 Per-state relevance narrative

Wedge ranking, strongest first:

**1 · Florida — STRONGEST wedge.**
"Mental Health & Wellness" is a **named sub-category** inside the 5-hour Ethics block, co-equal with Substance Abuse and Professionalism. Shortcut's credit claims directly under M&W with no routing through a proxy. Institutional infrastructure is unusually mature: The Florida Bar Mental Health & Wellness Center hosts mindfulness content explicitly, notes many programs are CLE-eligible. Florida Lawyers Assistance Inc (FLA Inc, the state LAP) already awards M&W credit for meditation sessions — specific proof example: "Meditation, It's Not What You Think" (1.0 M&W credit). Florida Lawyers Helpline (833-FL1-WELL) is a 24/7 free line. The Health Law Section launched a section-wide Wellness Program in January 2025.

**2 · New York — biggest institutional MOMENTUM.**
NYSBA's Committee on Attorney Well-Being has publicly advocated broadening ethics-credit eligibility to wellness programming. The NYC Bar's 2020 report formally recommends a **stand-alone 1-credit MH/SU/WB requirement per biennial cycle** (not yet mandated but institutionally advocated). NY removed mental-health questions from the bar admission application in Feb 2020 — a state-level anti-stigma signal. NYSBA's own Lawyer Assistance Program CLE (1.5 Ethics credits) is proof the category works.

**3 · Pennsylvania — clearest COMPETITIVE VALIDATION.**
Pennsylvania Bar Institute (PBI, the state's largest CLE provider) already sells mindfulness programs at 2.0 PA ethics credits: *Breaking the Stress Cycle: Mindfulness Strategies for Legal Minds*, *Understanding Anger: Mindfulness Strategies for Lawyers*, *The Truth About Compassion Fatigue*. Rule 105's fourth accredited category is *"substance abuse as it affects lawyers and the practice of law,"* interpreted broadly by the PA CLE Board and Disciplinary Board to cover well-being and stress-management content. The PA Disciplinary Board runs "Mindful Mondays / Wakeful Wednesdays" sits and a 2025/2026 Lawyer Mental Health and Well-Being Research Project.

### 1.3 Keyword landscape (from Google Keyword Planner, US, 2026-09-05)

**National / commercial (firm-buyer intent):**

| Query | Vol/mo | Comp | CPC range |
|---|---:|---|---|
| in house cle | 50 | MED | $1.24 – $8.69 |
| in house counsel cle | 20 | MED | **$5.18 – $14.45** |
| aba well being pledge | 50 | LOW | (no bids) |
| corporate cle | 10 | LOW | (no bids) |
| general counsel cle | 10 | MED | (no bids) |

Nobody's bidding on "on-site CLE" or "attorney wellness CLE" — the planner has no data. Greenfield.

**New York (highest volume — Shortcut's `/cle` default route):**

| Query | Vol/mo | Comp | CPC |
|---|---:|---|---|
| **new york cle requirements** | **1,000** | MED | $1.89 – $11.58 |
| **nyc cle requirements** | **1,000** | MED | $1.89 – $11.58 |
| **new york state cle requirements** | **1,000** | MED | $1.89 – $11.58 |
| **new york continuing legal education requirements** | **1,000** | MED | $1.89 – $11.58 |
| **continuing legal education new york** | **1,300** | LOW | **$9.42 – $24.94** |
| **mcle new york** | **1,300** | LOW | **$9.42 – $24.94** |
| ny lawyer / ny attorney cle requirements | 210 (ea) | MED | $1.40 – $11.00 |
| cle credit requirements new york | 210 | LOW | $1.29 – $9.72 |
| nysba cle | 170 | MED | $0.34 – $7.12 |
| new york cle requirements experienced attorneys | 140 | MED | $1.75 – $8.63 |
| newly admitted attorney ny cle | 90 | MED | $3.17 – $12.70 |
| ny bar cle requirements | 110 | LOW | $1.60 – $13.61 |
| new attorney cle requirements ny | 110 | LOW | $1.89 – $8.76 |
| new york cle ethics | 30 | **HIGH** | **$3.94 – $21.06** |
| free ny ethics cle | 20 | HIGH | $1.04 – $3.73 |

**Pennsylvania:**

| Query | Vol/mo | Comp | CPC |
|---|---:|---|---|
| pa cle requirements | 170 | MED | $4.38 – $15.53 |
| pa cle courses | 70 | HIGH | $7.00 – $18.73 |
| pa cle classes | 70 | HIGH | $7.00 – $18.73 |
| pa cle credits | 50 | HIGH | **$7.65 – $20.98** |
| pa ethics cle / pa cle ethics | 30 each | HIGH | $4.74 – $17.50 |
| pa cle ethics credits | 30 | HIGH | $4.74 – $17.50 |
| pennsylvania continuing legal education credits | 30 | HIGH | $6.69 – $23.81 |

**Florida:**

| Query | Vol/mo | Comp | CPC |
|---|---:|---|---|
| florida bar cle classes | 90 | MED | $6.60 – $17.72 |
| florida bar cle credits | 40 | MED | $7.68 – $15.76 |

**Read: the intent split matters.**

- Head-term informational queries (1,000-1,300/mo NY) are dominated by bar assocs, Lawline, and Practising Law Institute. A landing page can't win them. A **3,000-word requirements guide** (`/blog/new-york-cle-requirements-2026`) built from Dave's research + the corrections above could. Same play for PA and FL at lower volume.
- **Commercial intent where Shortcut can win:** "in house CLE" (50), "in house counsel cle" (20), "on-site CLE for law firms" (greenfield — no data), "attorney wellness cle" (greenfield). Small volume, high intent.

### 1.4 Recommended `<title>` + `<meta description>` per page

Aligned with buyer's mental model ("we need [state] Ethics credit for our team") + Shortcut's differentiator ("on site — nobody else can deliver that").

**`/cle` (NY default):**

- Title (57 chars): `On-Site CLE at Your Firm — 1.0 NY Ethics Credit | Shortcut`
- Meta: `Bring 1.0 NY Ethics & Professionalism CLE to your firm — a mindfulness session paired with a chair-massage wellness day. Counts toward NY's 4-hour biennial Ethics minimum (Rule 22 NYCRR Part 1500).`

**`/cle/pa`:**

- Title (57 chars): `On-Site CLE at Your Firm — 1.0 PA Ethics Credit | Shortcut`
- Meta: `Bring 1.0 PA Ethics/Professionalism/Substance Abuse credit to your firm — a mindfulness session paired with a chair-massage wellness day. Accredited under Rule 105; counts as live (not distance).`

**`/cle/fl`:**

- Title (62 chars): `On-Site CLE at Your Firm — 1.0 FL Mental Health & Wellness Credit | Shortcut`
- Meta: `Bring 1.0 FL Mental Health & Wellness credit to your firm — a mindfulness session paired with a chair-massage wellness day. Counts toward Florida's 5-hour Ethics block (Rule 6-10.3).`

### 1.5 Hero H1 recommendations

NY + PA share structure. FL breaks the template to lead with the strongest wedge ("satisfy the block").

**`/cle` (NY default):**

- Eyebrow: `NY State Seal · Accredited CLE Provider`
- H1: `New York Ethics CLE, at your firm.`
- Subhead: `1.0 Ethics & Professionalism credit under Rule 22 NYCRR Part 1500 — paired with an on-site mindfulness session and a chair-massage wellness day.`

**`/cle/pa`:**

- Eyebrow: `PA State Seal · Accredited by the PA CLE Board`
- H1: `Pennsylvania Ethics CLE, at your firm.`
- Subhead: `1.0 credit under Rule 105 in the Ethics/Professionalism/Substance Abuse category — paired with an on-site mindfulness session. Delivered live, not distance.`

**`/cle/fl` — different structure:**

- Eyebrow: `FL State Seal · Approved by The Florida Bar`
- H1: `Satisfy Florida's 5-hour Ethics block. On site.`
- Subhead: `1.0 Mental Health & Wellness credit under Rule 6-10.3 — paired with an on-site mindfulness session and a chair-massage wellness day.`

Why FL is different: "Satisfy your 5-hour Ethics block" is the exact phrase in a Miami CLE administrator's head. Every other provider frames the sale as individual credits; nobody frames it as satisfying the block. The buyer-language wedge is worth breaking the template.

### 1.6 Institutional vocabulary per state (use verbatim in copy)

| State | Vocabulary buyers actually use |
|---|---|
| NY | "attorney well-being" (hyphenated, **never** "wellness"); "NYS CLE Board"; "Rule 22 NYCRR Part 1500"; "Ethics & Professionalism" (full category name); "biennial reporting cycle"; "Transitional / Nontransitional" |
| PA | "PA CLE Board" (arm of PA Supreme Court — **distinct** from PA Bar Association); "Rule 105"; "Compliance Group 1/2/3"; "LCL-PA (Lawyers Concerned for Lawyers of Pennsylvania)"; "Ethics, Professionalism, or Substance Abuse credit" |
| FL | "The Florida Bar" (definite article, capitalized); "5-hour block"; "Ethics, Professionalism, Substance Abuse, or Mental Health & Wellness"; "Rule 6-10.3"; "compliance group" (staggered by birth month); "MyFloridaBar Member Portal" |

### 1.7 Recommended FAQ additions per state

**Universal (all 3 pages):**

- What accreditation number is issued for this program?
- How are attendance rosters submitted? Certificate of Attendance delivery?
- Late arrival / make-good policy?

**NY-specific:**

- Is this Transitional (usable by newly-admitted attorneys) or Nontransitional only?
- Does the 1.0 credit apply to the 4-hour biennial Ethics minimum, DEI/Bias, or Cybersecurity?
- Is on-site delivery eligible for newly-admitted attorneys after 1/1/2026's live-format rule?

**PA-specific:**

- Does this count toward the live-format requirement (not the 6-hour distance cap)?
- Which compliance group (1/2/3) does the credit apply to?
- Is Shortcut on the PA CLE Board's approved-provider list? What's the provider number?

**FL-specific:**

- Which sub-category is claimed — Mental Health & Wellness, Substance Abuse, or Professionalism?
- **Does this substitute for the mandatory 2-hour Florida Legal Professionalism course?** (Answer: **no** — that specific 2-hour course must be produced by The Florida Bar.) This FAQ prevents buyer confusion and is non-negotiable.
- Can attendees self-report via MyFloridaBar, or does Shortcut submit rosters?

### 1.8 Verification checklist before publishing

| Claim | Status | Action |
|---|---|---|
| Sullivan & Cromwell / Cravath / Wachtell as ABA Well-Being Pledge signatories | 🔴 not publicly verifiable | **Do not claim** |
| Ballard Spahr as ABA Pledge signatory | 🟡 has "Wellness at Work" committee publicly, ABA sign-on unconfirmed | Verify with source before naming |
| Reed Smith + Blank Rome as ABA Pledge signatories | ✅ confirmed via public sources | OK to cite |
| FL BigLaw offices (Shutts & Bowen / Holland & Knight / Akerman / Greenberg Traurig / White & Case) as ABA Pledge signatories | 🔴 not publicly verifiable | **Do not claim** |
| PA Disciplinary Board "Mindful Mondays / Wakeful Wednesdays" | ✅ public program | OK to cite |
| The Florida Bar Mental Health & Wellness Center | ✅ public | OK to cite |
| NYSBA Committee on Attorney Well-Being | ✅ public committee | OK to cite |
| Miami / Tampa / Orlando-specific attrition stats | 🔴 not independently verifiable | Use national ABA/Hazelden 2016 or Bloomberg Law 2024 instead |
| PA / NY BigLaw associate attrition ~19-20% (2025-26) | ✅ LawFuel + NALP Foundation | OK to cite with source |
| $200K-$500K per associate replacement cost | ✅ NALP Foundation 2024 | OK to cite |
| $1M+ per third-year associate replacement | ✅ ACC / Scale Firm citations | OK for senior-associate framing |

### 1.9 Pillar-content roadmap (attacks informational head-terms)

Dave's `CLE_RESEARCH.md` (with the corrections above) has all the raw material to write pillar guides that could out-rank bar associations on the 1,000-1,300/mo head terms:

| URL | Target query | Est. volume | Effort |
|---|---|---:|---|
| `/blog/new-york-cle-requirements-2026` | new york cle requirements + variants | ~4,300/mo across cluster | ~1 day |
| `/blog/pennsylvania-cle-requirements-2026` | pa cle requirements | ~350/mo | ~1 day |
| `/blog/florida-bar-cle-mental-health-requirement` | florida bar cle + M&W-block terms | ~130/mo | ~1 day |

Each pillar links to the corresponding `/cle/[state]` landing page as the CTA. This is the pattern validated in shortcut/AI_SEARCH_STRATEGY.md (Webflow case study: question-as-H2 + ToC + explicit factual claims + operator POV drove +60% AI-search visibility in 4 weeks).

---

## 2 · Carrier Wellness Fund landing pages

### 2.1 CRITICAL FINDING — these are not SEO plays

Google Keyword Planner returned **UNSPECIFIED** (zero verified search volume) for **all 14 broker-audience seeds** and **all 14 health-plan-audience seeds** tested 2026-09-05:

**Broker seeds tested:** cigna healthy incentive fund · aetna wellness allowance · anthem wellness fund · wellness fund reimbursement · carrier wellness fund · corporate wellness broker · wellness vendor for benefits brokers · benefits broker wellness partner · wellness referral partner · employee benefits broker wellness · on-site wellness vendor · chair massage insurance reimbursement · hsa eligible corporate wellness · carrier pre-approved wellness

**Only signals that came back:**

| Query | Vol/mo | Comp |
|---|---:|---|
| corporate wellness broker | 10 | **HIGH (index 86)** — 1-2 competitors bidding, probably Wellhub / Wellable |
| anthem heartland health and wellness fund | 10 | LOW — tangential |

**Health-plan seeds tested:** wellness vendor for health plans · aetna approved wellness vendor · cigna approved wellness vendor · anthem approved wellness vendor · health plan wellness partner · carrier wellness program vendor · employer wellness fund vendor · wellness incentive program vendor · health plan on-site wellness · insurance company wellness vendor · medical carrier wellness partner · fully insured wellness benefits · self-insured wellness benefits · wellness benefits ancillary vendor

**Only signals that came back:** healthpartners com wellness / healthpartners wellness / onsite wellness program — all ~10/mo, tangential.

**Interpretation:** Google's data confirms that neither audience uses Google as a discovery channel for vendors in this category. These pages will get essentially zero organic traffic — ever. That's a strategic constraint, not a page-quality problem.

### 2.2 Reframe — what these pages actually optimize for

| Purpose | What "good" looks like |
|---|---|
| **Sales enablement asset** | The page a Shortcut BD rep sends after a first broker meeting. 15-second value prop, "how it works" mechanic, clear CTA. CRM signal when the link is opened. |
| **Paid channel destination** | Target URL for LinkedIn Sponsored Content targeting "Employee Benefits Advisor / Consultant / Broker", "VP HR", or (for health plans) "Wellness Program Manager, [Carrier]" style ABM. Measured by form-fill rate, not organic clicks. |
| **Industry publication link** | The URL a BenefitsPRO / Employee Benefit News / Business Insurance sponsored article points at. |
| **Peer referral destination** | The URL an existing broker sends to a peer. Needs prestige signaling — logos, named funds, clear proof. |

Where these audiences actually discover vendors: BenefitsPRO · Employee Benefit News · Business Insurance · BrokerFest / EBLF conferences · NAHU / NABIP directories · carrier rep direct email · broker peer referrals · (for health plans) internal Aetna/Cigna/Anthem procurement · AHIP conferences · RFP databases.

### 2.3 Broker page — recommendations from design inspection

Design elements captured 2026-09-05 (Solution / Brokers 1280 D.dc.html):

- Hero mechanic (existing): "The wellness vendor you, your clients and their people will thank you for. We find the fund, deploy it and hand you the participation numbers for renewal."
- Named funds (existing): Cigna Healthy Incentive Fund · Aetna Wellness Allowance · Anthem Wellness Fund. Common footer per fund: "Renews every plan year. Unused balances do not roll over."
- Client-call moment (existing): "'Who is your medical carrier, and when does your plan year end?' If the answer is Cigna, Aetna or Anthem, there is probably money waiting." CTA: "Send us the client →"
- Value props to brokers (existing): Licensed, vetted, insured Pros · One team runs the whole day · Remote employees covered too · **Carrier pre-approval, handled for your client** · Invoice and participation summary in the carrier's format · "Every service, every fund. Nothing out of pocket."
- Service pill tags (existing): Massage · Stretch · Mindfulness · Sound bath · Yoga (visible in hero)
- Anti-app wedge (existing): "Why a day, not an app" → "The fund will pay for an app too."
- CTAs (existing): "Talk to Caren" (primary — personal-brand angle) + "Explore the fund menu →"

**Recommended `<title>` (LinkedIn / social share unfurls, not SEO):**

`Shortcut for Benefits Brokers — Wellness Programs Paid by Cigna, Aetna & Anthem`

**Recommended `<meta description>`:**

`We find your clients' unused carrier wellness fund, deploy an on-site wellness day, and hand you the participation numbers for renewal. Purpose-built for benefits brokers.`

**Recommended H1 options (three directions per brand-voice rule):**

- **Safe:** `The wellness vendor benefits brokers actually refer.`
- **Medium (recommended):** `Your clients have wellness money they aren't spending. We deploy it.`
- **Brave:** `Find the fund. Deploy the day. Get the participation for renewal.`

**Eyebrow above H1:** `FOR BENEFITS BROKERS & CONSULTANTS`

**Subhead below H1:** `We work with Cigna Healthy Incentive Fund, Aetna Wellness Allowance and Anthem Wellness Fund — carrier pre-approval handled, invoice in the carrier's format, participation numbers ready for renewal.`

**Defensive keyword tracking (brand + person):**

- "Shortcut wellness broker"
- "Caren Shortcut wellness" (the "Talk to Caren" CTA — if Caren is a real relationship rep, defensive tracking of her name is warranted)
- "Shortcut carrier wellness fund"

### 2.4 Health Plans page — DEFERRED

I could not visually inspect the Health Plans design this session. The Claude Design tool's presentation mode consistently returned an all-black screenshot even after fresh navigation + focus. Recommendations for that page's title / meta / H1 / positioning are deferred until either (a) I can capture the design, or (b) someone provides a static screenshot.

The audience identity and keyword universe are already known: buyers are insurance-carrier wellness program managers doing due diligence on eligible vendors, and Google Keyword Planner shows zero verified search volume for the seed terms that describe this audience (§2.1). The page will optimize for the same not-SEO purposes as the broker page (sales enablement, paid ABM, industry publication link, referral destination) — the specific H1 and messaging structure will change based on whether the design leads with the "eligible vendor" mechanic, the member-experience angle, or a partnership pitch.

---

## 3 · Blocking issue — SPA / prerender

`proposals.getshortcut.co` serves a client-side rendered React SPA. `curl` on `/cle`, `/cle/pa`, `/cle/fl` all return:

```
<title>Shortcut Corporate Wellness</title>
<meta name="description" content="Say goodbye to outdated office perks and hello to a new era of employee wellness with Shortcut.">
```

— identical to the homepage, zero state differentiation, zero CLE keywords, 0 body-content hits for "Ethics" / "Mindfulness" / "CLE credit". Google's crawler cannot see any of Dave's content.

**Every recommendation in §1.4 – §1.7 is worthless until this is fixed.**

Fix options (project owner picks):

1. **Prerender the 3 CLE routes at build time** — Netlify prerender plugin or `vite-plugin-ssr` for just the CLE routes. Least invasive.
2. **Move CLE routes off the SPA** — build them as static HTML with `<Helmet>`-style per-route meta baked in. Cleanest for SEO, more work.
3. **Wire a server-rendering path** — Vike / Next / Astro migration for the whole proposals app. Overkill unless there's other reasons to move.

Verify fix with: `curl https://proposals.getshortcut.co/cle | grep -c Ethics` — should return a non-zero number.

---

## 4 · Next actions

**Order of operations:**

1. **Fix SSR / prerender for `/cle` `/cle/pa` `/cle/fl`.** Nothing else in §1 matters until this is done.
2. **Ship the per-state `<title>` / `<meta>` / H1 updates** from §1.4 – §1.5.
3. **Add the per-state FAQ blocks** from §1.7.
4. **Update the state config** in `src/config/cleStateConfigs.ts` — add `heroH1` + `heroSubhead` + `metaTitle` + `metaDescription` fields to `StateConfig` so per-state override lives in the config not the JSX.
5. **Add "Not Legal Professionalism" gotcha copy on `/cle/fl`** — the 2-hour Florida Bar Professionalism course cannot be substituted. Explicit FAQ required.
6. **Write the 3 pillar articles** from §1.9 using Dave's research + the 2026-09-05 corrections. Each links to its state's `/cle/[state]` landing page as CTA.
7. **Update Dave's CLE_RESEARCH.md** with the corrections from §1.1 (or point readers to this doc — done via header pointer).
8. **Broker page: no SSR / prerender urgency** — since organic isn't the play, sales enablement + LinkedIn / trade-pub paid channels are. Ship the H1 / eyebrow / subhead from §2.3 and start CRM instrumentation to measure enablement usage.
9. **Health Plans page: capture the design and re-run this section**.

---

## 5 · Sources

**CLE research (per-state, verified 2026-09-05):**

- NYSBA: [nysba.org/new-york-cle-requirements/](https://nysba.org/new-york-cle-requirements/), [nysba.org/attorney-well-being/](https://nysba.org/attorney-well-being/), [Committee on Attorney Well-Being](https://nysba.org/committees/committee-on-attorney-well-being/)
- NY Courts CLE: [nycourts.gov/attorneys/cle/](https://ww2.nycourts.gov/attorneys/cle/)
- ABA CLE jurisdiction pages: [NY](https://www.americanbar.org/events-cle/mcle/jurisdiction/new-york/) · [PA](https://www.americanbar.org/events-cle/mcle/jurisdiction/pennsylvania/) · [FL](https://www.americanbar.org/events-cle/mcle/jurisdiction/florida/)
- NYC Bar 2020 report: [nycbar.org/reports/support-for-mental-health-substance-use-and-lawyer-well-being-cle-requirement/](https://www.nycbar.org/reports/support-for-mental-health-substance-use-and-lawyer-well-being-continuing-legal-education-cle-requirement-for-new-york-attorneys/)
- PA CLE Board: [pacle.org/rules-and-regulations](https://www.pacle.org/rules-and-regulations)
- PA Rule 105 (204 Pa. Code §82.105): [pacodeandbulletin.gov](https://www.pacodeandbulletin.gov/Display/pacode?file=/secure/pacode/data/204/chapter82/s105.html&d=reduce)
- PA Disciplinary Board Well-Being: [padisciplinaryboard.org/for-attorneys/well-being](https://www.padisciplinaryboard.org/for-attorneys/well-being)
- LCL-PA: [lclpa.org](https://lclpa.org/), [2024 Annual Report](https://lclpa.org/wp-content/uploads/LCL-2024-Annual-Report.pdf)
- PBI competing mindfulness CLE: [Breaking the Stress Cycle](https://www.pbi.org/product/breaking-the-stress-cycle-mindfulness-strategies-for-legal-minds-2024-replay/) · [Understanding Anger](https://www.pbi.org/product/understanding-anger-mindfulness-strategies-for-lawyers-2025-2/) · [Compassion Fatigue](https://www.pbi.org/product/the-truth-about-compassion-fatigue-managing-empathic-overwhelm-in-lawyers-2025-2/)
- The Florida Bar: [floridabar.org/member/cle/](https://www.floridabar.org/member/cle/general-cle-info-and-requirements/), [MH&W Center](https://www.floridabar.org/member/healthandwellnesscenter/), [30-hour rule announcement](https://www.floridabar.org/the-florida-bar-news/supreme-court-reduces-the-number-of-mandatory-cle-hours/)
- FLA Inc: [fla-lap.org](https://www.fla-lap.org/), [continuing education](https://www.fla-lap.org/workshops-continuing-education)
- ABA Well-Being Pledge: [americanbar.org/.../well-being-pledge-campaign/](https://www.americanbar.org/groups/lawyer_assistance/well-being-in-the-legal-profession/well-being-pledge-campaign/)
- Institute for Well-Being in Law: [lawyerwellbeing.net](https://lawyerwellbeing.net/)
- BigLaw attrition + burnout data: [LawFuel 2026](https://www.lawfuel.com/burnout-is-back-why-record-pay-isnt-stopping-biglaws-associate-retention-crisis-in-2026/), [Bloomberg Law 2024 Well-Being Report](https://assets.bbhub.io/bna/sites/18/2024/09/BLAW_2024_Well-Being-Report.pdf), [ABA Journal on BigLaw associate burnout survey](https://www.abajournal.com/news/article/biglaw-associates-at-higher-risk-of-burnout-than-colleagues-survey-says)

**Keyword data:** Google Ads Keyword Planner via toprank NotFair-GoogleAds MCP, US geo, 2026-09-05.

**Earlier internal research:**

- Dave's Feb-2026 [CLE_RESEARCH.md](./CLE_RESEARCH.md) — original source doc; corrections applied via §1.1 above
- shortcut/`seo-research/2026-08-audit-lawfirms-homepage.md` — law-firm vertical + homepage message architecture audit
- shortcut/`AI_SEARCH_STRATEGY.md` — Webflow question-as-H2 pattern validated as strongest AI-search citation lever (see §1.9 pillar-content strategy)
