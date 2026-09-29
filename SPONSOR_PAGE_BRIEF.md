# Conference partner page: brief for the next session

Branch: `sponsor-partner-page`. **Never push to `main`** (it auto-deploys to production).
Commit to this branch only, staging files by name.

- Page: `/sponsor/:slug`, in `src/components/sponsor/SponsorOnePager.tsx`
- Configs: `src/components/sponsor/sponsorPages.ts`
  - Test page: `/sponsor/acme` (open).
  - Blank: `/sponsor/template` (password `SHORTCUTxSPONSOR`).
- Other modules:
  - `SponsorBento.tsx`: the website's "What sets Shortcut apart" bento.
  - `StationModal.tsx`: the + pop-outs.
  - `src/utils/sponsorPackages.ts`: station data. Its pricing code is unused on this page.
- Run it: `npm run dev`, then open `/sponsor/acme`.

## Who reads this page, and what we are selling

The reader is the **conference organizer** (AACSB is the model). The organizer buys the lounge
from Shortcut and resells it to their sponsors and exhibitors as a premium sponsorship.

- **The organizer wants** to sell more sponsor dollars.
- **Sponsors and exhibitors want** to reach more clients.
- **Today** an exhibitor pays for a booth, then stands in it and waits. People have to
  volunteer interest and hand over contact info.
- **We deliver** a beloved, high-traffic, memorable experience that people book in advance,
  built in the sponsor's brand. Every booking captures name, title, company and email, so the
  lounge is a lead gen machine.
- **The line:** "You sell it. We run it."
- **No pricing on this page.** The organizer sets the sponsor's price. AACSB sells it at about
  $30K on roughly $8 to 9K of Shortcut cost. That figure is internal: never publish it.

## Voice

- Explicit, plain, straightforward and bold, like the `/aacsb` page. No abstraction.
- Contrast with booths and logo placements is allowed. So are numbers in headlines and plain
  talk about revenue.
- No dashes as punctuation anywhere a user reads.
- None of: leverage, unlock, elevate, turnkey, synergy.
- Name things plainly. No "so that X reads as Y" trailing clauses.
- Use the real numbers freely:
  - Workhuman Live 2026: 400 fifteen-minute chair massages, five chairs, three days, and a
    waitlist that never dropped below 200. That is 100 hours of attendee time.
  - 90%+ of slots booked across every event.
  - 500+ companies.
- Don't invent statistics.
- Don't narrate verification to Will, and don't append caveat lists.

## Visual system

These modules are ported from getshortcut.co (shortcut repo, not needed here):

- **Stations:** station cards, each with a + that opens StationModal.
- **The bento:** WhyShortcutBento with the live roster, Pros, map and checklist, plus the phone
  sign-up. The phone copy is overridden via MdCopyContext in MobileSignupModule.
- **Step cards:** the tinted numbered cards.
- **Gallery:** the conference photos in `public/ds-assets/conference`.
- **Base system:** V2 tokens, 28px cards, and panels that lap over each other with a 50px rounded top.

## What Will is demanding

Perfect layout, zero redundant information, and consistent section design. His criticism of
past work: updates were served without critically analysing each section or checking the
result. Work to this standard.

### Before reporting anything

1. Render the page at 1440 and 375 wide, look at every section, and read the full page text
   end to end.
2. For each section, write down the single job it does for the organizer. A section with no
   unique job gets merged or cut.
3. Search the rendered text for repeated claims. These currently repeat across the hero, About,
   Problem, bento, "What your sponsors get" and the path:
   - leads, the list, "name, title, company and email"
   - "you sell it"
   - booking in advance
   - the sponsor's brand

   Each fact should be said once, in its strongest place.
4. Make the section design consistent:
   - One heading pattern (kicker / title / optional coral accent / optional sub). Current usage
     is uneven.
   - Consistent card radius, padding and tone rhythm.
   - Similar density from section to section.
5. Only report after re-reading the whole page following the last change.

### Suggested story to consolidate into

1. Hero
2. The problem, from both sides
3. How it works: the bento
4. What the sponsor gets
5. The attendee path
6. Who does what
7. Proof: Workhuman
8. What goes in the lounge: stations
9. Next step

The About band can likely fold into the hero or the problem. "What your sponsors get" and the
path overlap. The nav has 7 items, which is too many.

## Open with Will (flag once, don't nag)

- Hero image: the University of Cincinnati branded AACSB rendering.
- Path section: the Netflix Ads booking-page screenshot (under an NDA).
- "Sell each station to a different sponsor" still needs his confirmation that we run it that way.
