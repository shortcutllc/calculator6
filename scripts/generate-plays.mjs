/**
 * generate-plays.mjs — CLI for the three ranked deliverables (Play A / Play B /
 * Reconciliation). Core now lives in netlify/functions/lib/generate-plays.js,
 * shared with the Netlify scheduled function so the two can't drift. This CLI
 * also writes the play_a/b + reconciliation CSVs to repo root (the Netlify run
 * skips CSVs — the web reads the crm_play_* tables). Read-only on source data,
 * no Apollo spend, every Play B row passed through the pre-flight gate.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/generate-plays.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { generatePlays } from '../netlify/functions/lib/generate-plays.js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

generatePlays({ sb, writeCsv: true, csvDir: ROOT, host: 'local-mac', log: (...a) => console.log(...a) })
  .then((r) => console.log(`DONE — Play A=${r.play_a}, Play B=${r.play_b}. CSVs written to repo root.`))
  .catch((e) => { console.error('PLAYS_ERROR:', e.message); process.exit(1); });
