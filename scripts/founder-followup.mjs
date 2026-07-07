/**
 * founder-followup.mjs — trigger / verify the auto-sent founder follow-ups.
 * See founder-followup-background.js + memory/founder_outreach_lane.md.
 *
 * DEFAULT (local DRY): imports the handler and runs it in-process with confirm
 * off, so you SEE the full output (who's due, who's HALTED and why, and the
 * composed E2/E3/E4 copy) — a background fn discards its HTTP body, so local is
 * the only way to read a dry run. Sends nothing, writes nothing.
 *
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   export ANTHROPIC_API_KEY=...
 *   node scripts/founder-followup.mjs                       # dry, all leads
 *   node scripts/founder-followup.mjs --only rosemary.vargas@securitize.io
 *   node scripts/founder-followup.mjs --only <email> --touch 2   # force-compose E2 now
 *   node scripts/founder-followup.mjs --confirm                  # LIVE local send (rare)
 *   node scripts/founder-followup.mjs --remote --confirm         # POST the deployed fn (the cron path)
 */
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const CONFIRM = has('--confirm');
const REMOTE = has('--remote');
const MAX = parseInt(val('--max', '15'), 10) || 15;
const ONLY = val('--only', null);
const TOUCH = val('--touch', null) ? parseInt(val('--touch', null), 10) : null;
const FN_URL = (process.env.FOUNDER_FOLLOWUP_URL || 'https://proposals.getshortcut.co/.netlify/functions/founder-followup-background').trim();

const payload = { confirm: CONFIRM, max: MAX, ...(ONLY ? { only: ONLY } : {}), ...(TOUCH ? { touch: TOUCH } : {}) };

(async () => {
  if (REMOTE) {
    const r = await fetch(FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    console.log(`founder-followup (remote) → HTTP ${r.status}${r.status === 202 ? ' (accepted — background). Watch Slack + Netlify logs.' : ''}`);
    if (r.status !== 202 && r.status !== 200) console.log((await r.text()).slice(0, 400));
    return;
  }
  // Local: fill non-Supabase secrets from openclaw if absent; Slack not needed in dry.
  const envKey = (n) => { try { return (readFileSync('/Users/willnewton/.openclaw/workspace/.env', 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
  process.env.ANTHROPIC_API_KEY ||= envKey('ANTHROPIC_API_KEY');
  process.env.SUPABASE_URL ||= (process.env.VITE_SUPABASE_URL || '');
  if (!process.env.PRO_SLACK_BOT_TOKEN) process.env.PRO_SLACK_BOT_TOKEN = CONFIRM ? '' : 'dry-local-no-slack';
  if (CONFIRM && !process.env.PRO_SLACK_BOT_TOKEN) { console.error('LIVE local send needs PRO_SLACK_BOT_TOKEN (or use --remote --confirm)'); process.exit(2); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }

  const { handler } = await import('../netlify/functions/founder-followup-background.js');
  const resp = await handler({ body: JSON.stringify(payload) });
  let out; try { out = JSON.parse(resp.body); } catch { out = resp.body; }
  console.log('\n================ FOLLOW-UP SUMMARY ================');
  console.log(JSON.stringify({ dry: out.dry, considered: out.considered, sent: out.sent, halted: out.halted }, null, 0));
  for (const r of out.results || []) {
    const tag = r.sent ? `SENT touch ${r.touch}` : r.would_send ? `WOULD SEND touch ${r.touch}` : r.error ? `ERROR ${r.error}` : `skip: ${r.skip}`;
    console.log(`  ${String(r.email).padEnd(40)} ${tag}${r.summary ? ` — ${r.summary}` : ''}`);
  }
})().catch((e) => { console.error('FOLLOWUP_TRIGGER_ERROR:', e.message); process.exit(1); });
