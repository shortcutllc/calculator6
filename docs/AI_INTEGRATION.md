# Team AI integration: technical reference

**Teammates set up from the guide page, not this file: [https://proposals.getshortcut.co/ai-guide/](https://proposals.getshortcut.co/ai-guide/).** It explains, in plain language, what this unlocks, how to connect Muse, Claude or ChatGPT step by step, how to get good results, how to keep a key safe, and what to do when something goes wrong. It is a static page in this repo (`public/ai-guide/index.html`), so anyone with the link can open it without a claude.ai account, and it carries noindex like the rest of the site. It holds no key and no key commands. Change setup steps there, not here. This file is the technical reference behind it.

A teammate's AI (Muse, Claude, ChatGPT, Cursor, or a script) can create and edit proposals, landing pages, sponsor pages and QR signs on proposals.getshortcut.co, the same way Pro does in Slack. Through the MCP connector it can also make employee sign-up links (coordinator events) and staff them with Pros. It acts as that teammate: what it creates is saved under their user id, and every tool hands back the live link.

There are two ways in, and both use the same personal key:

- **The MCP connector**, for AI apps. One URL gives the AI Pro's tools, along with the rules Pro follows (service menu, pricing, edit operations, how to write the note a client reads).
- **The HTTP API**, for scripts and automations (Zapier, n8n, a custom agent). Plain JSON over HTTPS.

## 1. Connecting

Connector URL (MCP over streamable HTTP, stateless, JSON replies):

```
https://proposals.getshortcut.co/.netlify/functions/mcp
```

Auth is a personal key (`sk_shortcut_` plus 32 characters, issued in section 4), sent one of two ways:

- `Authorization: Bearer sk_shortcut_YOUR_KEY`. Use this wherever the client allows a header.
- `?key=sk_shortcut_YOUR_KEY` on the URL, for clients that only take a link (the Claude and ChatGPT connector screens). A URL can end up in logs, so the header is better.

How each client connects (click-by-click steps for Muse, Claude and ChatGPT are on the guide page):

- **Meta Muse** has no add-server form. Asked in a chat, it writes its own client with the official MCP SDK and keeps the key in its secure credential store, sent as the Bearer header. Checked 2026-10-23 with the official TypeScript (1.32) and Python (2.3) SDK clients: both connect, list and call tools, and close cleanly. They ask for newer protocol versions and accept our 2025-06-18.
- **Claude and ChatGPT connectors** take the `?key=` URL with no OAuth.
- **Claude Code:**

```bash
claude mcp add --transport http shortcut https://proposals.getshortcut.co/.netlify/functions/mcp --header "Authorization: Bearer sk_shortcut_YOUR_KEY"
```

- **Cursor**, in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shortcut": {
      "url": "https://proposals.getshortcut.co/.netlify/functions/mcp",
      "headers": { "Authorization": "Bearer sk_shortcut_YOUR_KEY" }
    }
  }
}
```

A quick check from any client: ask it to "List the latest sponsor pages."

## 2. What the connector exposes

| Area | Tools |
|---|---|
| Proposals | `create_proposal`, `edit_proposal`, `get_proposal`, `search_proposals`, `duplicate_proposal` |
| Holiday packages (www.getshortcut.co/holiday) | `price_holiday_package` (a price, nothing saved), `create_holiday_proposal`, and `edit_proposal`'s `set_holiday_package` operation (switch the package or re-staff for a new headcount) |
| Proposal options (A/B/C versions in one link) | `create_proposal_option`, `link_proposals`, `unlink_proposal`, `rename_proposal_option`, `reorder_proposal_option` |
| Pricing and lookups | `calculate_pricing` (appointments to hours and pros), `lookup_client`, `search_logo` |
| Landing pages (for a company's wellness team) | `create_landing_page`, `get_landing_page` |
| Sponsor pages (for a conference organizer) | `create_sponsor_page`, `edit_sponsor_page`, `get_sponsor_page`, `list_sponsor_pages` |
| QR signs | `create_qr_code_sign`, `edit_qr_code_sign`, `get_qr_code_sign`, `list_qr_code_signs` |
| Sign-up links (coordinator events) | `create_signup_link` (preview, then `confirm: true`), `find_signup_links` |
| Staffing (the /ops Staffing tab's data) | `find_pros`, `list_pro_groups`, `get_event_staffing`, `add_pro_to_event` (preview, then `confirm: true`) |
| The rules | `get_guide`: the same text as the server's `instructions` (Pro's rules plus the positioning block), for clients that never show instructions to the model. |

Left out on purpose: leads and drafting or sending email (those stay in Slack with Pro, where a person sends), and deleting anything (done in the app).

Invoices (`create_invoice`, `search_invoices`, `get_invoice`) are only for the accounts in `INVOICE_USERS` in `netlify/functions/mcp.js`, today Will's, and every key that account holds. Everyone else's AI never sees them, and a call to one comes back as an unknown tool. `create_invoice` emails a real Stripe invoice, so on the connector a send needs `confirmedByUser: true`: the AI calls it with `preview: true`, shows who it goes to, the lines, the total and the due date, and sends only after you say yes. Without the flag nothing reaches Stripe. To give someone else invoicing, add their email to `INVOICE_USERS` and deploy.

New proposals, duplicates and edits post to #proposals like any other. Proposals start as drafts, the same as Pro's.

### Sign-up links and staffing

These act on the live coordinator (admin.shortcutpros.com) as the coordinator admin account, through the backend's own functions: `addEvent`, `addBarberToEvent`, `swapBarberForEvent`, and the Staffing tab's `pullStaffingRoster_Admin`, `pullProGroups_Admin`, `pullEventStaffing_Admin`. Nothing in SCCloudCode changed for them. They are in the MCP connector and in Pro, not in the HTTP API.

- **`create_signup_link`** makes one coordinator event (one location on one date). With `proposalId`, the fields come from the same rules as the Create Event screen (`lib/coordinator-event-form.js`, shared with `CreateEventModal.tsx`): the client's kept services, the post-approval survey's address, room, contact, start time and notes. Without one, the caller gives client name, date, times, full address, services, Pros and contact email. A call without `confirm: true` only previews. The preview flags anything a person should check: a 9 AM start nobody chose, a survey address that differs from the proposal's, a series code already in use.
- **It refuses** a past date, an end before the start, an address without street, city, state and zip (the timezone comes from it), and a code whose past events have another name (`addEvent`'s own rule). It also refuses when the proposal already made an event for that location and date, or when the coordinator already has an event for this client that day. Many events are made by hand, so the proposal never hears of them. `createAnother: true` overrides both.
- **Retries never duplicate.** Before creating, it looks for a live event with the same code and start time and reuses it. A repeat call with the same arguments finishes the same event.
- **Pro TBD seats.** After creating, it fills the empty Pro seats with the backend's Pro TBD placeholders (`PRO_TBD_IDS`, five of them), one at a time, so the link takes bookings at once. Each add takes about 1.7 s, so it stops starting new ones 5.5 s into the call (Netlify ends functions at 10 s) and says to call again, which carries on.
- **The record.** The event is added to `proposals.coordinator_events` (merged: `create-event.js` used to overwrite the list, forgetting earlier events) and to `sign_up_links`. Its admin notes say who made it with the AI tool.
- **`find_pros`** ranks the roster the Staffing tab uses: worked for this client, then at this address, then tier in a matching Pro group, then most recent work, then distance. Each Pro comes with reasons and cautions (already on an event then, contractor agreement, new and needs orientation, opted out of the Pros line). It returns no phone numbers or emails.
- **`add_pro_to_event`** puts a Pro into a Pro TBD seat (`swapBarberForEvent`, which moves that seat's bookings to them), else an empty seat (`addBarberToEvent`), or the seat named by `replaceBarberId`. The Pro gets the backend's usual "you've been added" text from the Pros line (none for a test event). Preview first.

Testing: on the dev backend there are no Pro TBD accounts (the five ids are prod's), so seat filling needs a stand-in there. Local cloud code (`./dev-watch`) has texts off.

### Sponsor page fields

The page's copy is the same for every conference. What you set are the facts:

| Field | Notes |
|---|---|
| `conferenceName` | Required. As it reads mid-sentence: "The Deans Conference". It also makes the link, which never changes after that, even if you rename the conference. |
| `organizerName` | Required. "AACSB". Shown next to the Shortcut logo when there is no logo. |
| `dateLabel` | "Oct 19 to 21, 2026". Write "to", not a dash. |
| `sentFrom` | Will, Jaimie, Marc or Caren. Their name is on the page's buttons and calls book on their Google Calendar. Defaults to you if you're one of the four. |
| `stations` | Any of `reset` (chair massage), `glow` (hair, shaves, makeup, facials), `polish` (manicures), `studio` (headshots), `mindful`, `sound`, `movement`. Plain words like "massage" or "headshots" work too. Leave it out for all seven. |
| `logoUrl` | An https link to the organizer's logo. A copy is stored. |
| `password` | Visitors type it to see the page. On an edit, `""` removes it. |
| `status` | `published` (default, live at once) or `draft`. |

### Sponsor deck

Once an organizer has bought the lounge, the sponsor deck is the page **they** send **their** sponsors, with a Download PDF button. It sits on the same sponsor page. Set it with `edit_sponsor_page` (or the update call below), passing only what changes:

| Field | Notes |
|---|---|
| `deck.salesContact` | `{ name, team, email }`: the organizer's person sponsors contact to reserve. |
| `deck.tiers` | The organizer's own prices and availability: `title` (the whole lounge), `station` (one station each), `mindful` (a Mindful Reset sponsorship), each `{ price, available }`. Never our prices. |
| `deck.venue`, `deck.about` | The venue, and one plain sentence about the conference. |
| `deck.audience` | Who attends, one group per item, up to nine. |
| `deck.stats`, `deck.statsSource` | Up to three figures from the organizer, each `{ fig, label }`, with where they come from. Never invent one. |
| `makeDeckLink` | `true` makes the deck's own link, returned as `deckUrl`. It never changes after that. |

Send the organizer the `deckUrl`, never the sponsor page `url`: the sponsor page shows the organizer's margin.

## 3. The HTTP API

Base URL: `https://proposals.getshortcut.co/.netlify/functions/generate-proposal`

Every request carries `Authorization: Bearer sk_shortcut_YOUR_KEY` and, with a body, `Content-Type: application/json`. Replies are JSON with `success: true`, or `success: false` with `error` (a sentence) and `code`.

| What | Method and URL |
|---|---|
| Create a proposal | `POST` |
| Edit a proposal | `PATCH` with `{ "proposalId", "operations": [...] }` |
| Get a proposal | `GET ?id=<uuid>` |
| Search proposals | `GET ?search=<client name>` |
| Duplicate a proposal | `POST ?action=duplicate` with `{ "proposalId", "newTitle"? }` |
| Staffing options | `POST ?action=calculate` with `{ "serviceType", "targetAppointments" }` |
| Client lookup | `GET ?action=client&name=<name>` |
| Create a landing page | `POST ?action=create-landing-page` |
| Update a landing page | `PATCH ?action=update-landing-page` with `{ "pageId", ... }` |
| Get a landing page | `GET ?action=landing-page&id=<uuid>` |
| Search landing pages | `GET ?action=search-landing-pages&search=<term>` |
| Create a sponsor page | `POST ?action=create-sponsor-page` |
| Change a sponsor page | `PATCH ?action=update-sponsor-page` with `{ "page", ...fields to change }` |
| Get a sponsor page | `GET ?action=sponsor-page&page=<id, slug or link>` |
| List sponsor pages | `GET ?action=sponsor-pages&search=<term>` (search optional) |
| Proposal options | `POST ?action=create-option`, `link`, `unlink`, `rename-option`, `reorder-option`; `GET ?action=group-options&id=<uuid>` |
| List the holiday packages | `GET ?action=holiday-packages` |
| Price a holiday package | `GET ?action=holiday-quote&package=<id or name>&headcount=<n>` (plus `&services=massage,yoga` for Create Your Own, `&classMinutes=60` for hour-long classes) |
| Create a holiday package proposal | `POST ?action=create-holiday-proposal` |

The edit operations for `PATCH` (add a service, change a date, set a discount, and so on) are listed under "Edit Operations" in the guide. Ask your AI for `get_guide`, or read `SYSTEM_PROMPT_TEXT` in `netlify/functions/lib/slack-ai.js`.

### Create a proposal

```bash
curl -X POST https://proposals.getshortcut.co/.netlify/functions/generate-proposal \
  -H "Authorization: Bearer sk_shortcut_YOUR_KEY" -H "Content-Type: application/json" \
  -d '{
    "clientName": "Acme",
    "contactName": "Dana Lee",
    "events": [
      { "serviceType": "massage", "massageType": "chair", "locationName": "NYC",
        "officeAddress": "350 5th Ave, New York NY 10118", "date": "2026-11-12",
        "totalHours": 4, "numPros": 2 }
    ]
  }'
```

Reply (shortened):

```json
{ "success": true,
  "proposal": { "id": "…", "url": "https://proposals.getshortcut.co/p/…", "status": "draft",
                "summary": { "totalAppointments": 24, "totalEventCost": 1200 } } }
```

For a conference, trade show or other multi-day event, add `"eventType": "conference"` and name each day as its own location (`"LegalOps, Day 1"`, `"LegalOps, Day 2"`). The client view then lists the days as one event, and the hourly services are priced at $165 per Pro hour with no automatic discount. Leave `hourlyRate` out and the server sets it.

### Create a holiday package proposal

The five packages on www.getshortcut.co/holiday, priced exactly as the page prices them: a 4 hour visit staffed for the headcount, $150 per Pro hour, headshots at $450 per photographer hour plus $25 per person, group classes at one flat price, and 10% off any visit with two or more services (hair + makeup counts as two). The client view shows the package, the 10%, and the free 30 minute class and holiday treat. `package` is `sleigh`, `grinch`, `styled`, `bright` or `custom` (or the package's name); Create Your Own takes `services`. Create Your Own can also include beard trims (`"beard trims"`, 15 minute appointments), which the holiday page doesn't list but a proposal can.

**Ask first before Christmas.** When a teammate asks for a proposal for an event before December 25 that isn't a conference, ask whether it should be a holiday proposal before calling `create-proposal`, unless they already said. A holiday proposal gives the client 10% off two or more services, the free 30 minute class and the holiday treat.

```bash
curl -X POST "https://proposals.getshortcut.co/.netlify/functions/generate-proposal?action=create-holiday-proposal" \
  -H "Authorization: Bearer sk_shortcut_YOUR_KEY" -H "Content-Type: application/json" \
  -d '{
    "clientName": "Acme",
    "contactName": "Dana Lee",
    "package": "bright",
    "headcount": 50,
    "date": "2026-12-10",
    "locationName": "NYC",
    "officeAddress": "350 5th Ave, New York NY 10118"
  }'
```

Reply (shortened):

```json
{ "success": true,
  "proposal": { "id": "…", "url": "https://proposals.getshortcut.co/p/…", "status": "draft",
                "summary": { "totalEventCost": 7605, "holidayDiscountAmount": 845 } },
  "holidayPackage": "Merry and Bright",
  "quote": { "lines": [ { "name": "Headshots", "pros": 3, "cost": 6650 },
                        { "name": "Hair and makeup touch-up", "pros": 3, "cost": 1800 } ],
             "subtotal": 8450, "savings": 845, "total": 7605,
             "freeClass": { "minutes": 30, "value": 1250, "useBy": "March 2027" } } }
```

### Create a sponsor page

```bash
curl -X POST "https://proposals.getshortcut.co/.netlify/functions/generate-proposal?action=create-sponsor-page" \
  -H "Authorization: Bearer sk_shortcut_YOUR_KEY" -H "Content-Type: application/json" \
  -d '{
    "conferenceName": "The Deans Conference",
    "organizerName": "AACSB",
    "dateLabel": "Oct 19 to 21, 2026",
    "sentFrom": "Marc",
    "stations": ["massage", "headshots"],
    "password": "DEANS26"
  }'
```

```json
{ "success": true,
  "sponsorPage": { "id": "…", "slug": "the-deans-conference",
                   "url": "https://proposals.getshortcut.co/sponsor/the-deans-conference",
                   "conferenceName": "The Deans Conference", "organizerName": "AACSB",
                   "dateLabel": "Oct 19 to 21, 2026",
                   "sentFrom": { "name": "Marc Levitan", "email": "marc@getshortcut.co" },
                   "stations": ["reset", "studio"], "logoUrl": null,
                   "hasPassword": true, "status": "published" } }
```

If the link is taken, the page gets `-2`, `-3` and so on. Always use the `url` that comes back.

### Change a sponsor page

```bash
curl -X PATCH "https://proposals.getshortcut.co/.netlify/functions/generate-proposal?action=update-sponsor-page" \
  -H "Authorization: Bearer sk_shortcut_YOUR_KEY" -H "Content-Type: application/json" \
  -d '{ "page": "the-deans-conference", "dateLabel": "Oct 20 to 22, 2026", "password": "" }'
```

The reply has the page and a `changed` list, here `["dates", "password removed"]`.

The sponsor deck, then its link:

```bash
curl -X PATCH "https://proposals.getshortcut.co/.netlify/functions/generate-proposal?action=update-sponsor-page" \
  -H "Authorization: Bearer sk_shortcut_YOUR_KEY" -H "Content-Type: application/json" \
  -d '{ "page": "gcuc-miami", "makeDeckLink": true,
        "deck": { "salesContact": { "name": "Jamie Russo", "team": "GCUC Partnerships", "email": "jamie@gcuc.co" },
                  "tiers": { "title": { "price": "$35,000", "available": "1 available" } } } }'
```

The reply's `page.deckUrl` is the link to send, like `https://proposals.getshortcut.co/lounge/k7qm2px9dalr`.

### Create a landing page

```bash
curl -X POST "https://proposals.getshortcut.co/.netlify/functions/generate-proposal?action=create-landing-page" \
  -H "Authorization: Bearer sk_shortcut_YOUR_KEY" -H "Content-Type: application/json" \
  -d '{ "partnerName": "Acme", "clientEmail": "dana@acme.com" }'
```

### Errors

| Status | Means |
|---|---|
| 401 | No key, a wrong key, or a revoked one. |
| 400, 422 | Something in the request is missing or wrong. `error` says what, in a sentence your AI can act on. |
| 404 | No proposal or page matches. |
| 503 | Keys aren't switched on yet on the server. Tell Will. |

## 4. For Will: issuing and revoking keys

Keys are issued by hand. That's the staff check, since email signup on the site is open and being signed in proves nothing on its own. Run these from the repo with `.env` in place:

```bash
node scripts/api-keys.mjs issue marc@getshortcut.co "Marc, Claude desktop"
```

```bash
node scripts/api-keys.mjs list
```

```bash
node scripts/api-keys.mjs revoke sk_shortcut_AbC123
```

The teammate needs to have signed in to proposals.getshortcut.co once, so their account exists. Only a hash of each key is stored, so a lost key gets revoked and replaced, never recovered.

Send the key privately (a Slack DM, not a channel) along with the [guide page](https://proposals.getshortcut.co/ai-guide/). The guide tells them where the key goes, and that it never goes in a chat message.

## How it fits together (for whoever maintains it)

- `netlify/functions/mcp.js`: the MCP endpoint. Its tools are Pro's own definitions (`TOOLS` in `lib/slack-ai.js`) and handlers (`lib/slack-tools.js`), filtered by `EXPOSED`. Teach Pro a tool, add its name to `EXPOSED`, and every teammate's AI has it. Its instructions are Pro's rules plus the positioning block (`lib/positioning.js`), so a note your AI writes follows the same brain as everything else.
- `netlify/functions/generate-proposal.js`: the HTTP API.
- `netlify/functions/lib/sponsor-pages.js`: sponsor pages, shared by Pro, the API and MCP. Same rules as the staff screen at /sponsor-pages.
- `netlify/functions/lib/holiday-packages.js`: the holiday packages and their math, shared by Pro, the API, MCP, the staff calculator and the client viewer. `node scripts/check-holiday-parity.mjs` prices every package with the www page's own file and both proposal engines, and fails on any difference. Change the www page first, then this file, then run it.
- `netlify/functions/lib/staff-auth.js`: one auth check for both. It takes a personal key or a staff sign-in token (what the app itself sends).
- `staff_api_keys` table: `supabase/migrations/20261023000000_create_staff_api_keys.sql`.
- `netlify/functions/lib/signup-links.js`: the sign-up link and staffing tools. `lib/coordinator-events.js`: the `addEvent` payload, timezone, duplicate checks, Pro TBD seats and the record on the proposal, shared with `create-event.js`. `lib/coordinator-event-form.js`: proposal to event form, shared with `CreateEventModal.tsx`. `lib/pro-paperwork.js`: agreements and orientation, shared with `ops-api.js`.
