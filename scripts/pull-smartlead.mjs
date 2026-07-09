/**
 * pull-smartlead.mjs — CLI wrapper around the shared Smartlead pull
 * (netlify/functions/lib/smartlead-pull.js). The Netlify SCHEDULED function
 * netlify/functions/smartlead-pull.js runs the SAME lib in the cloud, hourly,
 * independent of whether this laptop is awake (Will 2026-07-09 — the 6:05am local
 * cron missed its slot on a sleeping Mac and a hot reply went uncaptured). Keep this
 * CLI as a manual/fallback entrypoint; both share one code path.
 *
 *   export SMARTLEAD_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/pull-smartlead.mjs [--days 30] [--campaign-months 3] [--full] [--dry]
 */

import { createClient } from '@supabase/supabase-js';
import { pullSmartlead } from '../netlify/functions/lib/smartlead-pull.js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const num = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? (parseInt(args[i + 1], 10) || d) : d; };
const DRY = has('--dry');
const FULL = has('--full');
const DAYS = num('--days', 30);
const CAMPAIGN_MONTHS = num('--campaign-months', 3);

const SK = (process.env.SMARTLEAD_API_KEY || '').trim();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SK) { console.error('MISSING_ENV: SMARTLEAD_API_KEY'); process.exit(2); }
if (!DRY && (!/^https?:\/\//i.test(URL) || !KEY)) { console.error('MISSING_ENV: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
// Hard watchdog — an unattended cron must never hang forever (an overnight run hung 12h).
const MAX_RUN_MS = 35 * 60 * 1000;
setTimeout(() => { console.error(`PULL_ERROR: hard watchdog ${MAX_RUN_MS / 60000}min exceeded — aborting`); process.exit(1); }, MAX_RUN_MS).unref();

const sb = DRY ? null : createClient(URL, KEY, { auth: { persistSession: false } });
pullSmartlead({ sb, apiKey: SK, full: FULL, days: DAYS, campaignMonths: CAMPAIGN_MONTHS, dry: DRY, log })
  .then(() => process.exit(0))
  .catch((e) => { console.error('PULL_ERROR:', e.message); process.exit(1); });
