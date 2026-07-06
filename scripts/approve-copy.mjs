/**
 * approve-copy.mjs — WILL'S RATIFICATION STEP (the human door of the copy lane).
 * Flips a proposed copy_assets row to approved (or rejected). Only an approved
 * asset can ever ship — cold-engine prefers the newest approved asset for its
 * segment+opener over the static template. Run by Will, or by Claude ONLY on
 * Will's explicit "approve proposal <id>" in chat.
 *
 *   node scripts/approve-copy.mjs <id>            # approve
 *   node scripts/approve-copy.mjs <id> --reject   # reject (kept for the record)
 */
import { createClient } from '@supabase/supabase-js';

const id = process.argv[2];
const REJECT = process.argv.includes('--reject');
if (!id || id.startsWith('--')) { console.error('usage: node scripts/approve-copy.mjs <asset-id> [--reject]'); process.exit(2); }
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });

(async () => {
  const { data: row, error } = await sb.from('copy_assets').select('id, segment, opener, label, status').eq('id', id).maybeSingle();
  if (error || !row) { console.error('not found:', error?.message || id); process.exit(1); }
  if (row.status !== 'proposed') { console.error(`asset is '${row.status}', only 'proposed' can be decided`); process.exit(1); }
  const status = REJECT ? 'rejected' : 'approved';
  await sb.from('copy_assets').update({ status, approved_at: REJECT ? null : new Date().toISOString(), approved_by: REJECT ? null : 'will' }).eq('id', id);
  console.log(`${status.toUpperCase()}: ${row.label} (${row.segment}/${row.opener})`);
  if (!REJECT) console.log('The engine will use this asset for every future build/edit of this segment+opener (newest approval wins). Static template stays as fallback.');
})().catch((e) => { console.error('APPROVE_ERROR:', e.message); process.exit(1); });
