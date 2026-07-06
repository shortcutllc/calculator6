/**
 * redraft-founder-notes.mjs — replace existing founder-note drafts after a
 * voice/prompt upgrade (Will 2026-07-06). For each recipient:
 *   1. trash the old Gmail draft (via deleteDraft)
 *   2. delete the saved_drafts row (so the queue's already-queued exclusion clears)
 *   3. POST founder-queue-background with --only + the lead's ORIGINAL cta variant
 *      (preserves the help/convo A/B assignment)
 *   4. poll until the new saved_drafts row lands, print the new body
 *
 * Usage:
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/debug/redraft-founder-notes.mjs email1 email2 ...   # dry: shows plan
 *   node scripts/debug/redraft-founder-notes.mjs --confirm email1 ...
 */
import { createClient } from '@supabase/supabase-js';
import { getAccessToken, deleteDraft, lc } from '../../netlify/functions/lib/gmail.js';

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const EMAILS = args.filter((a) => a.includes('@')).map((e) => e.toLowerCase());
const FN_URL = 'https://proposals.getshortcut.co/.netlify/functions/founder-queue-background';
const WILL = 'will@getshortcut.co';

const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!EMAILS.length) { console.error('no emails given'); process.exit(2); }
  const tok = await getAccessToken(sb, WILL);
  for (const email of EMAILS) {
    const { data: row } = await sb.from('saved_drafts').select('id, recipient_email, target_ref')
      .eq('target_kind', 'founder_note').eq('recipient_email', email).maybeSingle();
    if (!row) { log(`${email}: no existing founder_note row — will draft fresh (cta defaults to help)`); }
    const cta = row?.target_ref?.cta_variant === 'convo' ? 'convo' : 'help';
    const audience = row?.target_ref?.audience || 'brokers';
    const oldDraftId = row?.target_ref?.gmail_draft_id || null;
    if (!CONFIRM) { log(`${email}: would trash gmail draft ${oldDraftId || '(none)'}, delete row ${row?.id || '(none)'}, redraft with cta=${cta} audience=${audience}`); continue; }

    if (oldDraftId) { const ok = await deleteDraft(tok, oldDraftId); log(`${email}: old gmail draft ${oldDraftId} ${ok ? 'trashed' : 'not trashed (may already be gone)'}`); }
    if (row) { await sb.from('saved_drafts').delete().eq('id', row.id); log(`${email}: saved_drafts row deleted`); }

    const r = await fetch(FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: 1, only: email, cta, audience }) });
    log(`${email}: queue POST → ${r.status} (cta=${cta}, audience=${audience}); waiting for the new draft…`);

    let fresh = null;
    for (let i = 0; i < 30 && !fresh; i += 1) {
      await sleep(10000);
      const { data } = await sb.from('saved_drafts').select('id, subject, body, target_ref')
        .eq('target_kind', 'founder_note').eq('recipient_email', email).maybeSingle();
      fresh = data || null;
    }
    if (!fresh) { log(`${email}: NO new draft after 5 min — check Slack for a skip warning`); continue; }
    log(`${email}: NEW DRAFT (subject: ${fresh.subject} · cta=${fresh.target_ref?.cta_variant} · research: ${fresh.target_ref?.research_note})`);
    console.log('---\n' + fresh.body + '\n---');
  }
  log('DONE');
})().catch((e) => { console.error('REDRAFT_ERROR:', e.message); process.exit(1); });
