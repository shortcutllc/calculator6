# Team AI integration: technical reference

**Teammates set up from the guide page, not this file: [Shortcut AI Connector](https://claude.ai/artifact/L6ayMmMArbqhQUhpm1QU43).** It explains, in plain language, what this unlocks, how to connect Muse, Claude or ChatGPT step by step, how to get good results, how to keep a key safe, and what to do when something goes wrong. The page is private to Will's account, so share it from its Share menu before sending the link. Change setup steps there, not here. This file is the technical reference behind it.

A teammate's AI (Muse, Claude, ChatGPT, Cursor, or a script) can create and edit proposals, landing pages, sponsor pages and QR signs on proposals.getshortcut.co, the same way Pro does in Slack. It acts as that teammate: what it creates is saved under their user id, and every tool hands back the live link.

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
| Proposal options (A/B/C versions in one link) | `create_proposal_option`, `link_proposals`, `unlink_proposal`, `rename_proposal_option`, `reorder_proposal_option` |
| Pricing and lookups | `calculate_pricing` (appointments to hours and pros), `lookup_client`, `search_logo` |
| Landing pages (for a company's wellness team) | `create_landing_page`, `get_landing_page` |
| Sponsor pages (for a conference organizer) | `create_sponsor_page`, `edit_sponsor_page`, `get_sponsor_page`, `list_sponsor_pages` |
| QR signs | `create_qr_code_sign`, `edit_qr_code_sign`, `get_qr_code_sign`, `list_qr_code_signs` |
| The rules | `get_guide`: the same text as the server's `instructions` (Pro's rules plus the positioning block), for clients that never show instructions to the model. |

Left out on purpose: leads, drafting or sending email, and invoices (those stay in Slack with Pro, where a person sends), and deleting anything (done in the app).

New proposals, duplicates and edits post to #proposals like any other. Proposals start as drafts, the same as Pro's.

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

Send the key privately (a Slack DM, not a channel) along with the [guide page](https://claude.ai/artifact/L6ayMmMArbqhQUhpm1QU43), shared with them first. The guide tells them where the key goes, and that it never goes in a chat message.

## How it fits together (for whoever maintains it)

- `netlify/functions/mcp.js`: the MCP endpoint. Its tools are Pro's own definitions (`TOOLS` in `lib/slack-ai.js`) and handlers (`lib/slack-tools.js`), filtered by `EXPOSED`. Teach Pro a tool, add its name to `EXPOSED`, and every teammate's AI has it. Its instructions are Pro's rules plus the positioning block (`lib/positioning.js`), so a note your AI writes follows the same brain as everything else.
- `netlify/functions/generate-proposal.js`: the HTTP API.
- `netlify/functions/lib/sponsor-pages.js`: sponsor pages, shared by Pro, the API and MCP. Same rules as the staff screen at /sponsor-pages.
- `netlify/functions/lib/staff-auth.js`: one auth check for both. It takes a personal key or a staff sign-in token (what the app itself sends).
- `staff_api_keys` table: `supabase/migrations/20261023000000_create_staff_api_keys.sql`.
