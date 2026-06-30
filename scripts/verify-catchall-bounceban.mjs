/**
 * verify-catchall-bounceban.mjs — run the SECOND-pass verifier (BounceBan) over
 * the catch-all backlog MillionVerifier parked, and resolve each:
 *   deliverable   → bounceban_status='deliverable' (now SENDABLE — the cold pool
 *                   picks it up via isSendable; recovers parked volume)
 *   undeliverable → suppress (crm_suppression) — never send
 *   risky/unknown → record bounceban_status, stays parked (not sendable)
 *
 * Default target = apollo-pipeline catch_all not yet BounceBan-checked (only
 * those can ever be cold-sent, so only those are worth a credit). --all widens
 * to every source; --include-unknown also does MV 'unknown'.
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   node scripts/verify-catchall-bounceban.mjs                 # dry: how many + sample
 *   node scripts/verify-catchall-bounceban.mjs --confirm --max 50   # verify 50
 *   node scripts/verify-catchall-bounceban.mjs --confirm            # whole backlog
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { verifyEmail } from './lib/bounceban.mjs';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const BB = envKey('BOUNCEBAN_API_KEY');
const arg = (f) => process.argv.includes(f);
const argv = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CONFIRM = arg('--confirm');
const ALL = arg('--all');
const PLAYB = arg('--play-b');   // restrict to leads present in crm_play_b (any source)
const INCLUDE_UNKNOWN = arg('--include-unknown');
const MAX = parseInt(argv('--max', '100000'), 10);
const CONCURRENCY = Math.max(1, parseInt(argv('--concurrency', '5'), 10));
if (!BB) { console.error('MISSING BOUNCEBAN_API_KEY (add it to openclaw .env — see chat)'); process.exit(2); }
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const log = (...a) => console.log(...a);

async function readAll(t, c, mod) { const o = []; for (let f = 0; ; f += 1000) { let q = sb.from(t).select(c).range(f, f + 999); if (mod) q = mod(q); const { data, error } = await q; if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }

(async () => {
  log(CONFIRM ? 'BOUNCEBAN VERIFY — LIVE (spends ~1 credit per resolved email)' : 'BOUNCEBAN VERIFY — dry run');
  const statuses = INCLUDE_UNKNOWN ? ['catch_all', 'unknown'] : ['catch_all'];
  let rows = await readAll('outreach_contacts', 'email, source, mv_status, bounceban_status', (q) => q.in('mv_status', statuses).is('bounceban_status', null));
  if (PLAYB) {
    const pb = await readAll('crm_play_b', 'contact_email');
    const inPB = new Set(pb.map((r) => String(r.contact_email || '').toLowerCase()).filter(Boolean));
    rows = rows.filter((r) => inPB.has(String(r.email || '').toLowerCase()));
  } else if (!ALL) rows = rows.filter((r) => String(r.source || '').startsWith('apollo-leadgen'));
  const supp = new Set((await readAll('crm_suppression', 'email')).map((r) => String(r.email).toLowerCase()));
  rows = rows.filter((r) => r.email && !supp.has(r.email.toLowerCase())).slice(0, MAX);

  log(`\n${rows.length} ${ALL ? '' : 'apollo-pipeline '}leads to second-verify (mv in [${statuses.join(', ')}], not yet BounceBan-checked).`);
  if (!rows.length) { log('nothing to do.'); return; }
  if (!CONFIRM) { log(`sample: ${rows.slice(0, 8).map((r) => r.email).join(', ')}\n\nDRY RUN — re-run with --confirm (spends ~1 credit per RESOLVED email; risky/unknown not charged).`); return; }

  const tally = { deliverable: 0, undeliverable: 0, risky: 0, unknown: 0, error: 0 };
  let done = 0;
  const at = () => new Date().toISOString();
  // simple concurrency pool (catch-all probes are slow, up to ~80s each)
  const queue = [...rows];
  const worker = async () => {
    for (;;) {
      const r = queue.shift(); if (!r) break;
      const res = await verifyEmail(r.email, { apiKey: BB });
      const status = res.ok ? res.result : 'error';
      tally[status] = (tally[status] || 0) + 1;
      if (res.ok) {
        await sb.from('outreach_contacts').update({ bounceban_status: res.result, bounceban_checked_at: at(), bounceban_score: res.score ?? null }).eq('email', r.email);
        if (res.result === 'undeliverable') await sb.from('crm_suppression').upsert([{ email: r.email, reason: 'bounceban_undeliverable', source: 'verify-catchall-bounceban' }], { onConflict: 'email' });
      }
      if (++done % 20 === 0) log(`  ${done}/${rows.length} · ${JSON.stringify(tally)}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  log(`\nDONE — ${done} verified. ${JSON.stringify(tally)}`);
  log(`  → ${tally.deliverable} catch-all PROMOTED to sendable, ${tally.undeliverable} suppressed, ${tally.risky + tally.unknown} stay parked.`);
})().catch((e) => { console.error('BOUNCEBAN_ERROR:', e.message); process.exit(1); });
