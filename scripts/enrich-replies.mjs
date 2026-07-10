/**
 * enrich-replies.mjs — CLI for reply CONTENT + SENTIMENT backfill.
 *
 * The core now lives in netlify/functions/lib/enrich-replies.js, shared with the
 * Netlify scheduled function so the two can't drift. This CLI just loads the env
 * and calls it. Backfills content/sentiment that the pull path skips (presence
 * only), and suppresses unsubscribe/negative replies. Rule-based classifier (no
 * LLM). Read-only with --dry.
 *
 *   node scripts/enrich-replies.mjs --dry            # show, write nothing
 *   node scripts/enrich-replies.mjs                  # daily backfill
 *   node scripts/enrich-replies.mjs --reclassify-all # weekly: re-label existing content
 */

import { createClient } from '@supabase/supabase-js';
import { enrichReplies } from '../netlify/functions/lib/enrich-replies.js';

const DRY = process.argv.includes('--dry');
const RECLASSIFY_ALL = process.argv.includes('--reclassify-all');
const SK = (process.env.SMARTLEAD_API_KEY || '').trim();
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SK) { console.error('MISSING: SMARTLEAD_API_KEY'); process.exit(2); }
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

enrichReplies({
  sb, smartleadKey: SK, reclassifyAll: RECLASSIFY_ALL, dry: DRY, host: 'local-mac',
  log: (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a),
}).catch((e) => { console.error('ENRICH_REPLIES_ERROR:', e.message); process.exit(1); });
