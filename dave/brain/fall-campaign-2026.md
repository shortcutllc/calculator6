# Fall re-engagement campaign 2026 — LIVE (launched 14 Sep 2026)

**Read this before suggesting any outreach angle between now and the end of October.**
570 of Jaimie's contacts are mid-sequence. Anything you propose has to not collide
with it: no second "checking in" note to the same people, no competing October
angle, no re-pitching the new services to someone who just received them.

## What is running

| | Self-hosted drip | Smartlead |
|---|---|---|
| Campaign | `jaimie-fall-nurture-2026` | Jaimie Fall Nurture 2026 (id 3935145) |
| Leads | 100 | 470 |
| Sender | jaimie@getshortcut.co | jaimie@getshortcut.co |
| Pace | 50/day, 0-2 per 10-min tick | ~40/day, ~16 min apart |
| Window | Mon-Fri 09:00-16:00 ET | Mon-Fri 09:00-17:00 ET |

Both send from Jaimie's REAL mailbox, not a sacrificial domain. A lead is in
exactly one system; there is no overlap. 131 more addresses were verified dead
and will never send.

## The copy

Three touches. Touch 1 has a subject-line rotation, touches 2 and 3 are threaded
replies with no subject. Source of truth is
`netlify/functions/lib/drip-copy.js` — do not re-derive it.

Touch 1 says: Shortcut looks different and does more (new site, new services);
five new Mind & Body classes (sound baths, yoga, somatic movement, strength &
sculpt, dance cardio) that run in office, over Zoom or both; and for World
Mental Health Day this October, 10% of every booking goes to Venture House, a
New York nonprofit supporting mental health recovery for nearly 40 years.

Campaign page: https://www.getshortcut.co/mental-health-day

## The honesty rule that governs the opener — DO NOT BREAK THIS

Touch 1 has two variants and the split is not cosmetic:

- **booked** — "since our last event". Requires a VERIFIED completed event
  (`crm_companies.completed_events > 0`). 28 companies qualify.
- **spoke** — "since we last spoke". Everyone else.

A row in `proposals` does NOT qualify: many are drafts, meaning we sent a quote
and were never on site. 94% of the list has never booked, so the honest variant
is the majority case. Anything that claims a visit we cannot evidence is wrong,
and the same rule applies to anything you draft for these contacts.

The copy also never names a service. Raw CRM titles are operational line items
("Lip Wax", "Quick Clean Up", "Shave") and quoting them back at a client reads
badly, so it says "our last event" and nothing more.

## What this means for your suggestions

- **Do not propose outreach to anyone on this list before November.** Ask before
  assuming a contact is free; the campaign runs through October.
- **The October hook is already spent** on these 570. Proposing "reach out about
  World Mental Health Day" to them is a duplicate, not an idea.
- **Replies are Jaimie's.** She drafts and sends them herself. Do not draft
  replies for this campaign.
- **Live opportunities are receipts.** Day one produced Feifei Cheng (Office
  Manager, Alibaba Group US): massage + headshots, 20-25 people, NYC, asking
  about ACH payment. That is the kind of concrete result to reference, not a
  projection.

## Deadline that matters

The campaign page recommends booking by **25 September** for comfortable October
staffing, and an event needs about a week's lead time. An October angle proposed
after roughly 20 October cannot actually be delivered in October.

## Where to look, rather than guess

- Copy: `netlify/functions/lib/drip-copy.js`
- Send logic and safety: `netlify/functions/lib/drip-engine.js`
- Live state: Supabase `drip_campaigns`, `drip_leads`
- Positioning it ladders to: `netlify/functions/lib/positioning.js`

Related: [[messaging]] · [[services-pricing-and-tech]] · [[who-actually-buys]]
