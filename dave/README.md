# Dave — Will's networking companion

A persistent agent (Claude Code / Agent SDK on the Max plan) that helps Will network like a
CEO: daily 1:1 outreach quality, weekly goal-backward strategy, moment-spotting, and mapping
the corporate-wellness influence landscape. **Dave never sends anything. Will sends by hand.**

## Layout

```
dave/
├── CLAUDE.md            Dave's identity, objectives, hard rules (auto-loads every session)
├── brain/               goals.md · playbook.md · lessons.md · influence-map.md
├── gateway/             always-on Slack listener (Socket Mode) + budget guard
├── jobs/                run-job.sh + one .md prompt per scheduled job
├── tools/               slack-dm.mjs — Dave's ONLY outbound channel (DM to Will)
├── launchd/             plists for the gateway + jobs
└── state/               sessions, budget, watermarks, logs (gitignored)
```

## One-time setup (Will, ~15 minutes)

1. **Slack app** (Dave's identity — do NOT reuse the Pro bot):
   - api.slack.com/apps → Create New App → "Dave" in the Shortcut workspace.
   - Socket Mode → Enable → generate an **App-Level Token** with `connections:write` → this
     is `DAVE_SLACK_APP_TOKEN` (starts `xapp-`).
   - OAuth & Permissions → Bot Token Scopes: `chat:write`, `im:history`, `im:write`,
     `reactions:write` → Install to Workspace → `DAVE_SLACK_BOT_TOKEN` (starts `xoxb-`).
   - Event Subscriptions → Enable → Subscribe to bot events: `message.im`.
2. **Env file** — create `dave/.env` (gitignored, never commit):
   ```
   DAVE_SLACK_BOT_TOKEN=xoxb-...
   DAVE_SLACK_APP_TOKEN=xapp-...
   DAVE_ALLOWED_USER=U...        # Will's Slack member ID (profile → three dots → Copy member ID)
   HEALTHCHECKS_URL=https://hc-ping.com/...   # optional: free check at healthchecks.io, daily period
   # DAVE_MODEL=claude-opus-4-8  # default
   ```
3. **Install + start**:
   ```
   source ~/.nvm/nvm.sh && cd dave/gateway && npm install
   cp ../launchd/*.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.shortcut.dave.gateway.plist
   launchctl load ~/Library/LaunchAgents/com.shortcut.dave.jobs.plist
   ```
4. **Say hi**: DM Dave in Slack. First conversation: fill in `brain/goals.md` together —
   nothing strategic runs until goals exist.

## How Dave stays cheap (enforced in code, not vibes)

- The gateway idles at **zero tokens**; Claude only wakes on your message or a due job.
- Watermarks + day guards skip jobs that aren't due — extra launchd fires cost $0.
- Hard daily caps in `gateway/budget.mjs` (25 frontier calls, 12 job calls); past the cap
  Dave refuses and tells you. "status" DM shows today's spend anytime.
- Designed to fit ~$6-7/day at API rates even though Max makes it ~free today (Anthropic has
  signaled the agent-workload subsidy may end — Dave survives either way).

## Reliability

- launchd (not cron): jobs missed while the Mac sleeps fire on wake; every job is
  catch-up-safe ("everything due since last run").
- Gateway auto-restarts on crash (`KeepAlive`).
- Dead-man's switch: successful jobs ping healthchecks.io; if pings stop, IT alerts you.
- Nightly one-line status DM — silence is a bug, never calm.
- When Dave earns it: move to a used Mac mini (stays inside the Claude login; a VPS
  complicates Max auth).

## Schedule (all catch-up-safe)

| Job | When | What |
|---|---|---|
| morning-brief | daily ~8:05 | drafts reviewed with reasoning, skips + why, moments |
| monday-strategy | Mon (Tue catch-up) | goal-backward week plan, receipts required |
| influence-scan | Thu/Fri | corporate-wellness landscape → influence-map.md + 1-3 moves |
| nightly-status | daily 21:00 | one-line health/cost; silence = bug |

## Phase map

- **Phase 1 (this)**: talk + drafts review + budget + reliability rails.
- **Phase 2**: goals set → weekly strategy live, accept/edit/dismiss verdicts captured, tiers.
- **Phase 3**: daily signal sweep, dormant-ties mine, moment alerts.
- **Phase 4**: reflection loop, scorecard vs the 36% send-rate baseline, frozen test set.
