# Messaging — what Shortcut says, and where the truth lives

Read this at the start of every working session, before you draft anything a prospect will see.

## The canonical source is code, not this file

**`netlify/functions/lib/positioning.js`** (repo root, two levels up from `dave/`) is the machine-readable
source of Shortcut's positioning. Every other drafting surface imports it so positioning cannot drift
between them. **You are the exception, and that is a gap, not a design choice.** Until your drafting is
wired to it directly, read it yourself:

```
node -e "import('../netlify/functions/lib/positioning.js').then(m=>console.log(m.buildPositioningBlock({channel:'direct'})))"
```

That prints the exact positioning block injected into every other drafting engine. It carries the
hierarchy, the real proof points, the banned words, the delivery facts and the no-fabrication rule.
**Use its output. Never restate positioning from memory, and never paraphrase it into this file** — the
moment a second copy exists, the two drift, which is precisely how the spine got flattened before.

For broker prospects use `{channel:'broker'}`. For a fully remote company use `{remote:true}`.

## The hierarchy, in three lines

If you read nothing else, read this. It is the thing most drafts get wrong.

- **THE OUTCOME.** People actually show up. This is the message. Lead here, every time.
- **THE MECHANISMS.** Zero lift for managers, and one vendor for the whole team, in office and remote.
  These explain *why* the outcome happens. They never lead.
- They are **not three co-equal benefits.** Open on the outcome, then earn it with one mechanism and
  one real receipt. The outcome is a claim you PROVE. The mechanisms are claims you STATE, so a
  statistic bolted onto them reads as padding.

## Approved copy, locked 2026-07-31

Top line: **Wellness your people show up for.**

Book-a-call hero, three tiers:
1. Tagline: *Wellness your people show up for.*
2. Secondary tagline: *Loved by your team. All handled for you.*
3. Description: *Everything from massage to sound baths, on site or remote, run by one team.*

Services headline: *One vendor. Over a dozen services to choose from.*

**This is locked copy. It does not change without Will re-approving the new text** — your judgment about
a better line is not authorisation, and neither is a judge score.

## Love claims — eased, with a condition

You may write that people love it **only when a real receipt from PROOF sits immediately adjacent** —
same paragraph, or the very next line. *"Loved by your team"* followed by *"over 90% of slots booked"*
is correct. A love claim floating on its own is banned, as is any exclamation-mark version, any invented
satisfaction score, and **any love claim in a first cold email**, because there is no room for the proof.
We can evidence turnout, not affection, so affection always arrives holding its receipt.

Note this is why *"Loved by everyone"* was rejected for the hero: the receipt beneath it is 90%+, not 100%.

## Hard rules you will otherwise break

- **Never sell the technology.** No "our platform", "our app", "our software". Show what it does for
  them. Selling the tech makes us sound like the software directories we beat.
- **Banned words:** turnkey, all-in-one, one-stop shop, nationwide network, and boost morale /
  productivity / retention / engagement.
- **No dashes as punctuation** in anything a reader sees.
- **Massage happens in a conference room we turn into a spa.** Never "at their desks".
- **Use each receipt once.** Repeating a statistic across a sequence is the fastest way to sound thin.
- **We are a recurring partner, not a one-off.** Avoid framing the relationship as a single day.
- Grooming and headshots are menu breadth. They do not close, so never open with them.

## The current project, for context

The book-a-call page is being rebuilt. You do not need the detail, but if a prospect asks what we are
launching, or you want to see the voice at its best:

- Wireframe: https://claude.ai/code/artifact/7f4aceeb-131f-4542-a25d-dfe79bb9d2d1
- Copywriter brief: https://docs.google.com/document/d/1v36f9KHP8hoFGqyf01oWbJQIlv2ukBaM9fQiewrNVeE/edit
- Best-written live page, use as the voice reference: https://proposals.getshortcut.co/conference
- Health plan / carrier funds angle: https://proposals.getshortcut.co/wellness-funds
- Live proposal example: https://proposals.getshortcut.co/p/test-new-services-jul-2026

## Open gap, flagged 2026-07-31

Your drafting reads this file; it does not import `positioning.js`. Every other copy surface does, and
`scripts/check-copy-surfaces.mjs` enforces it for them. **Wiring your drafting to the same block is the
real fix** — this file is the interim. Raise it with Will if it is still open in a month.
