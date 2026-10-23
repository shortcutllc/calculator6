# Connect your own AI to the proposals site

Your AI (Claude, ChatGPT, Cursor, or a script you wrote) can create and edit proposals, landing pages, sponsor pages and QR signs on proposals.getshortcut.co, the same way Pro does in Slack. It acts as you: what it creates is saved under your name, and every tool hands back the live link.

There are two ways in, and both use the same personal key:

- **The MCP connector**, for AI apps. You paste one URL and your AI gets Pro's tools, along with the rules Pro follows (service menu, pricing, edit operations, how to write the note a client reads).
- **The HTTP API**, for scripts and automations (Zapier, n8n, your own agent). Plain JSON over HTTPS.

## 1. Get your key

Ask Will. He issues one key per AI tool you connect, so one can be turned off without touching the others. It looks like `sk_shortcut_` followed by 32 characters, and you see it once.

Treat it like a password. It can create and change live client pages as you. Don't paste it into a shared doc or a repo. If it leaks, tell Will and he'll revoke it in seconds.

## 2. Connect your AI

The connector URL is:

```
https://proposals.getshortcut.co/.netlify/functions/mcp
```

**Claude (claude.ai or the desktop app).** Settings → Connectors → Add custom connector. Name it `Shortcut`. For the URL, put your key on the end:

```
https://proposals.getshortcut.co/.netlify/functions/mcp?key=sk_shortcut_YOUR_KEY
```

Leave the OAuth fields empty. Then turn the connector on in a chat from the tools menu.

**Claude Code.**

```bash
claude mcp add --transport http shortcut https://proposals.getshortcut.co/.netlify/functions/mcp --header "Authorization: Bearer sk_shortcut_YOUR_KEY"
```

**ChatGPT.** Turn on developer mode for connectors (Settings → Apps & Connectors → Advanced; it depends on your plan), then create a connector with the `?key=` URL above and no authentication.

**Cursor.** Add this to `~/.cursor/mcp.json`:

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

Any other MCP client works the same way: the URL, plus either the `Authorization: Bearer` header or `?key=` on the URL. Use the header when the app lets you, since a URL can end up in logs.

To check it works, ask your AI: "List the latest sponsor pages."

## 3. What your AI can do

| Area | Tools |
|---|---|
| Proposals | `create_proposal`, `edit_proposal`, `get_proposal`, `search_proposals`, `duplicate_proposal` |
| Proposal options (A/B/C versions in one link) | `create_proposal_option`, `link_proposals`, `unlink_proposal`, `rename_proposal_option`, `reorder_proposal_option` |
| Pricing and lookups | `calculate_pricing` (appointments to hours and pros), `lookup_client`, `search_logo` |
| Landing pages (for a company's wellness team) | `create_landing_page`, `get_landing_page` |
| Sponsor pages (for a conference organizer) | `create_sponsor_page`, `edit_sponsor_page`, `get_sponsor_page`, `list_sponsor_pages` |
| QR signs | `create_qr_code_sign`, `edit_qr_code_sign`, `get_qr_code_sign`, `list_qr_code_signs` |
| The rules | `get_guide`: the service menu, pricing, edit operations and copy rules. Good AIs call it first. If yours doesn't, tell it to. |

What it can't do, on purpose: anything with leads, drafting or sending email, or invoices (those stay in Slack with Pro, where a person sends), and deleting anything (do that in the app).

New proposals are posted to #proposals like any other. Proposals start as drafts, the same as Pro's.

Talk to it like you would to Pro:

- "Make a proposal for Acme: chair massage at their NYC office, 350 5th Ave, on Nov 12, 4 hours, 2 pros."
- "40 appointments of massage. What are my staffing options?"
- "Sponsor page for the AACSB Deans Conference, Oct 19 to 21, 2026, from Marc, massage and headshots only, password DEANS26."
- "Change the dates on the deans-conference sponsor page to Oct 20 to 22."

### Sponsor page rules

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

## 4. The HTTP API

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

## 5. For Will: issuing and revoking keys

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

## How it fits together (for whoever maintains it)

- `netlify/functions/mcp.js`: the MCP endpoint. Its tools are Pro's own definitions (`TOOLS` in `lib/slack-ai.js`) and handlers (`lib/slack-tools.js`), filtered by `EXPOSED`. Teach Pro a tool, add its name to `EXPOSED`, and every teammate's AI has it. Its instructions are Pro's rules plus the positioning block (`lib/positioning.js`), so a note your AI writes follows the same brain as everything else.
- `netlify/functions/generate-proposal.js`: the HTTP API.
- `netlify/functions/lib/sponsor-pages.js`: sponsor pages, shared by Pro, the API and MCP. Same rules as the staff screen at /sponsor-pages.
- `netlify/functions/lib/staff-auth.js`: one auth check for both. It takes a personal key or a staff sign-in token (what the app itself sends).
- `staff_api_keys` table: `supabase/migrations/20261023000000_create_staff_api_keys.sql`.
