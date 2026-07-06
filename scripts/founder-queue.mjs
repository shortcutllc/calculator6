/**
 * founder-queue.mjs — trigger Will's daily founder-networking queue.
 * See memory/founder_outreach_lane.md.
 *
 * The real work happens in founder-queue-background.js (research → draft in
 * Will's voice → Gmail draft + Slack card per lead). That's a Netlify BACKGROUND
 * function (202, async, no body), so:
 *   - DRY (default): computes today's would-be picks LOCALLY (same selection
 *     logic, read-only) and prints them. Needs SUPABASE env (~/.shortcut-cron.env).
 *   - --confirm: POSTs the fn and returns; results arrive as Slack DMs to Will
 *     (plus saved_drafts rows + real Gmail drafts in will@).
 *
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/founder-queue.mjs                    # dry: today's picks
 *   node scripts/founder-queue.mjs --confirm          # queue today's batch (max 5)
 *   node scripts/founder-queue.mjs --confirm --max 10
 *   node scripts/founder-queue.mjs --confirm --only someone@firm.com
 */
import { createClient } from '@supabase/supabase-js';

const val = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CONFIRM = process.argv.includes('--confirm');
const MAX = Math.max(1, Math.min(15, parseInt(val('--max', '5'), 10) || 5));
const ONLY = val('--only', null);
const CTA = val('--cta', null); // 'help' | 'convo' — pin the A/B variant (for --only redrafts)
const URL = (process.env.FOUNDER_QUEUE_URL || 'https://proposals.getshortcut.co/.netlify/functions/founder-queue-background').trim();
const WILL = 'will@getshortcut.co';
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

(async () => {
  if (CONFIRM) {
    const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: MAX, ...(ONLY ? { only: ONLY } : {}), ...(CTA ? { cta: CTA } : {}) }) });
    console.log(`founder-queue → HTTP ${r.status}${r.status === 202 ? ' (accepted — background). Watch Slack: one card per lead, Gmail drafts in will@. ~1 min per lead.' : ''}`);
    if (r.status !== 202 && r.status !== 200) console.log((await r.text()).slice(0, 300));
    return;
  }
  // ---- DRY: mirror the fn's selection locally (read-only).
  const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
  const { data: firms } = await sb.from('crm_target_firms').select('id, display_name, tier');
  const firmById = new Map((firms || []).map((f) => [f.id, f]));
  let rows = [];
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('outreach_contacts')
      .select('email, name, title, company, mv_status, bounceban_status, broker_firm_id, broker_priority_rank')
      .not('broker_firm_id', 'is', null).range(f, f + 999);
    rows.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  rows = rows.filter((r) => r.email && (r.mv_status === 'ok' || r.bounceban_status === 'deliverable'));
  const { data: s } = await sb.from('crm_suppression').select('email').limit(10000);
  const supp = new Set((s || []).map((x) => lc(x.email)));
  const { data: q } = await sb.from('saved_drafts').select('recipient_email').eq('target_kind', 'founder_note').limit(10000);
  const queued = new Set((q || []).map((x) => lc(x.recipient_email)));
  const { data: c } = await sb.from('outreach_sends').select('email').eq('sender_email', WILL).limit(10000);
  const contacted = new Set((c || []).map((x) => lc(x.email)));
  rows = rows.filter((r) => !supp.has(lc(r.email)) && !queued.has(lc(r.email)) && !contacted.has(lc(r.email)));
  rows.sort((a, b) => (a.broker_priority_rank ?? 9e9) - (b.broker_priority_rank ?? 9e9));
  const seenFirm = new Set(); const today = [];
  for (const r of rows) {
    if (today.length >= MAX) break;
    if (seenFirm.has(r.broker_firm_id)) continue;
    seenFirm.add(r.broker_firm_id); today.push(r);
  }
  console.log(`DRY RUN — ${rows.length} eligible brokers · today's ${today.length} (max ${MAX}, one per firm):`);
  for (const t of today) {
    const f = firmById.get(t.broker_firm_id);
    console.log(`  ${String(t.name || '').padEnd(24)} ${String(f?.display_name || t.company || '').padEnd(28)} ${String(f?.tier || '').padEnd(8)} ${t.email}`);
  }
  console.log('\nRe-run with --confirm to research + draft + DM the queue (drafts only, you send).');
})().catch((e) => { console.error('FOUNDER_QUEUE_ERROR:', e.message); process.exit(1); });
