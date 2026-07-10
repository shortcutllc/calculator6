/**
 * graduate-replies.mjs — CLI for the cold → personal GRADUATION step.
 *
 * The core logic now lives in netlify/functions/lib/graduate-replies.js, shared
 * with the Netlify scheduled function so the two can't drift. This CLI just loads
 * the local env + the openclaw Smartlead key/cache and calls it. When a cold lead
 * replies POSITIVE (and fresh), it moves to the personal lane (channel='personal'
 * + graduated_at) so the cold engine never re-emails it, an owner is assigned, and
 * it surfaces in Follow-ups for a human to reply 1:1. TRIAGE: only positive
 * replies graduate. Read-only until --confirm.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/graduate-replies.mjs                     # dry: who WOULD graduate
 *   node scripts/graduate-replies.mjs --confirm           # write channel/graduated state
 *   node scripts/graduate-replies.mjs --confirm --notify  # + auto-draft a suggested
 *                                                         #   reply and ping each owner
 *                                                         #   in Slack (drafts only, never sends)
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { graduateReplies } from '../netlify/functions/lib/graduate-replies.js';

const CONFIRM = process.argv.includes('--confirm');
const RESEARCH = process.argv.includes('--research');   // corroborate owners via Smartlead campaign inboxes
const NOTIFY = process.argv.includes('--notify');       // after writing, trigger the auto-draft + Slack ping
const RECENCY_DAYS = (() => { const i = process.argv.indexOf('--recency-days'); const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : parseInt(process.env.GRADUATION_RECENCY_DAYS || '', 10); return Number.isFinite(v) && v > 0 ? v : 14; })();
const NOTIFY_URL = (process.env.GRADUATION_NOTIFY_URL || 'https://proposals.getshortcut.co/.netlify/functions/graduation-notify-background').trim();
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const SMARTLEAD = (() => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(/^SMARTLEAD_API_KEY=(.+)$/m)?.[1] || '').trim(); } catch { return ''; } })();
const cache = (() => { try { return JSON.parse(readFileSync(`${OPENCLAW}/smartlead_cache.json`, 'utf8')).leads || {}; } catch { return {}; } })();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

graduateReplies({
  sb, smartleadKey: SMARTLEAD, cache,
  confirm: CONFIRM, research: RESEARCH, notify: NOTIFY,
  notifyUrl: NOTIFY_URL, recencyDays: RECENCY_DAYS, host: 'local-mac', log: console.log,
}).catch((e) => { console.error('GRADUATE_ERROR:', e.message); process.exit(1); });
