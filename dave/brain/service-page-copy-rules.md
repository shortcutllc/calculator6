# Service-page copy: the rules (hard-won with Will, 2026-09)

READ THIS before writing ANY service-page copy. In a long session I kept leaking these exact
corrections — anchor to this file, don't trust in-context recall. If Will re-corrects something
that's already here, I stopped reading this. Go re-read it.

## 1. Don't write from scratch. SEO-optimize the copy we ALREADY have.
Strong, on-voice copy already exists in four places — start there, never invent a fancier version:
- **Lite sign-up / booking:** `src/components/proposal/data.ts` (`SERVICE_DESC`, `MASSAGE_TYPE_DESC`,
  `NAILS_TYPE_DESC`, `STRETCH_TYPE_DESC`).
- **Website menu:** `src/utils/menuServices.ts` (`desc` / `bring` / `items`).
- **Proposals:** `SERVICE_COPY.md`, `serviceContent.ts`.
- **Live site** getshortcut.co.
Method: take the existing description → **front-load the keyword → fix terminology → stop.** The
failure mode (mine, repeatedly) is over-crafting a fourth, more elaborate paragraph. Simpler is the job.

## 2. Terminology — non-negotiable
- Providers are **"Pros"** / **"Massage Pros," "Nail Pros," "Hair Pros," "Headshot Pros."**
  NEVER "therapist, esthetician, technician, stylist, photographer, staff, provider, worker" in
  customer copy. (Source: `PartnershipModelsSection.tsx` `${service} Pro`; homepage "THE SHORTCUT PROS.")
  Reusable Pro lines: "the pros you'd book yourself," "we hire a small fraction of the pros who apply,"
  "the same pros come back every visit," "licensed, insured, tested before they set foot in your office."
  Pricing too: "$150 per Pro, per hour," "3 Pros over 4 hours."
- Massage = **15- or 20-minute increments** (the customer picks the length), ~3–4 an hour per Pro.
  NOT "about 15 to 20 minutes."
- Chair or table = the customer's choice. **NEVER** write "oils," "no oils," "private room," "a room
  that closes," "whichever fits the space," or undressing — none of it is in our copy, all of it reads
  wrong for an office, and Will has killed each one by hand.
- **Preferred Pro = the COMPANY (organizer/manager) sets the preferred Pro GENDER for the event —
  NOT each employee, and NOT a named individual.** Separately, on recurring visits the same Pros come
  back. Three distinct facts, keep them straight: (1) company sets gender, (2) not per-employee choice,
  (3) same Pros return on recurring. Never write "everyone/employees pick their Pro." (Source:
  serviceContent.ts "select their preferred [Pro] gender"; "same Pros, every visit.")
- **Invent nothing.** If a detail isn't in our source copy, don't write it. Location is flexible
  ("a meeting room or an empty office," "right in the workplace"), not pinned to "conference room."

## 3. Voice — write like a copywriter, not a machine
Model = **Airbnb Services** (studied their live massage listings): short, plain, confident,
feeling-first sentences; one vivid image; no stacked adjectives; no hype; and DON'T cram every fact
into one paragraph. The definition paragraph should make them FEEL it; mechanics (times, price) go in
the menu / other sections.
**The bar (Will-approved massage description):** "Our corporate massage experience treats your team to
rejuvenating chair or table sessions right in the workplace. Our Massage Pros turn a meeting room into
a calm, spa-like space — soft lighting, quiet music, a little aromatherapy — a real break, without
anyone leaving the building."

## 4. SEO — real US Keyword Planner data (pulled 2026-09, not the March guesses)
- **corporate massage** = 320/mo, LOW comp. **corporate chair massage** = 320/mo, MED comp. Tied on
  volume; corporate massage is easier. Lead H1/body with **"corporate massage"**; keep "chair" in the
  title tag + service menu + FAQ (covers both terms).
- **"corporate" is load-bearing** — it's the qualifier that keeps you out of the massage-CHAIR-FURNITURE
  SERP. "office chair massage" = 5,400/mo but it's people buying a massage chair. A trap. Never target it.
- **City×service is tiny:** "corporate massage {city}" ≈ 10/mo each. NOT worth a 33-page city tree for
  massage — keep the city LINKS (internal linking + fixes /cities cannibalization) but don't build the
  pages. (This deflates the city×service priority in seo-plan.md.)
- The keyword only has to appear in: **title tag, URL, H1, the opening definition line, one keyword H2,
  the FAQ questions, city-link anchors, image alt.** Everything else is free for personality.
- Title tag ≠ H1 — the title tag does the heavy SEO lift, so the H1 can have personality as long as the
  title/intro/H2 carry the term. Full 2026 build standard (answer-first, schema, FAQ placement) is in
  seo-plan.md.

## 5. How to work with Will on this
- **Will's first-party statements ARE a source. Trust them.** When Will states a fact about Shortcut
  (client/partner list, a price, a discount band, how a service works), that's the most authoritative
  source there is — do NOT ask him to verify it or hedge it. "Truth is hard" governs MY guesses and
  EXTERNAL claims, not Will's direct word about his own company. He got annoyed being asked to re-verify
  the partner list ("Im not lying bro") — don't do that again.
- **Massage-page recurring discount = 10% (4+) / 15% (9+)** — Will's call, 2026-09-01. The page uses
  these, NOT the engine's 15/20. Pricing section + Recurring card both show 10/15; keep them matched.
- He wants **concise + the reasoning when it matters**, not terse-and-mailing-it-in, not bloated.
- Show drafts as options, pick one, move fast. He iterates hard on copy; that's the process.
- **Reviewing a design = section-by-section viewport screenshots off the EXPORTED standalone HTML**
  (ask Will to export it to Downloads, open `file://` in the debugging Chrome, `scrollTo(y)` +
  viewport screenshot per block). The accessibility snapshot (reading order, not layout) and a single
  tall `fullPage:true` capture BOTH lie — the fullPage one mis-renders and blanks whole sections; the
  a11y tree flattens 2D layout so you can't judge parallelism or card pairing. On 2026-09-01 those two
  misled me into flagging "empty bands / non-parallel pillars / misplaced checklist" that all proved
  false against the real render. Use `evaluate_script` to map the block stack (y/height/bg/text) first,
  then screenshot each block's viewport. Chrome is view-only; that's fine — reads only.
- The whole massage page is the template — once it's right, clone the pattern per service (headshots,
  nails, hair, mindfulness), each starting from ITS own existing copy, not a new invention.
