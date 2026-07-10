/**
 * sync-bounces.mjs — CLI for the bounce feedback loop. Core now lives in
 * netlify/functions/lib/sync-bounces.js, shared with the Netlify scheduled fn so
 * the two can't drift. Suppresses every Smartlead-BLOCKED lead + marks it
 * invalid, optionally removing it from the campaign. Dry by default.
 *
 *   set -a; source .env; set +a
 *   node scripts/sync-bounces.mjs                     # dry: list blocked leads
 *   node scripts/sync-bounces.mjs --confirm           # suppress + mark invalid
 *   node scripts/sync-bounces.mjs --confirm --delete  # + remove from the campaign
 */
import { createClient } from '@supabase/supabase-js';
import { syncBounces } from '../netlify/functions/lib/sync-bounces.js';

const CONFIRM = process.argv.includes('--confirm');
const DELETE = process.argv.includes('--delete');
const ALL = process.argv.includes('--all');
const campArg = (() => { const i = process.argv.indexOf('--campaigns'); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean) : null; })();
const SL = (process.env.SMARTLEAD_API_KEY || '').trim();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SL) { console.error('MISSING SMARTLEAD_API_KEY'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV (SUPABASE)'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

syncBounces({ sb, smartleadKey: SL, confirm: CONFIRM, del: DELETE, campaignIds: campArg, all: ALL, host: 'local-mac', log: (...a) => console.log(...a) })
  .catch((e) => { console.error('SYNC_BOUNCES_ERROR:', e.message); process.exit(1); });
