/**
 * verify-leads.mjs — THE one cold-lead verifier (MillionVerifier → BounceBan
 * waterfall). Consolidates what used to be two scripts. For each target lead:
 *   mv null (only with --include-null) → MillionVerifier. ok→done; catch_all→BounceBan;
 *                                        invalid/disposable→suppress.
 *   mv catch_all (or unknown w/ --include-unknown) → BounceBan:
 *      deliverable   → bounceban_status='deliverable' (SENDABLE — cold pool picks it
 *                      up via isSendable; recovers parked volume)
 *      undeliverable → suppress (crm_suppression)
 *      risky/unknown → recorded, stays parked
 *
 * SCOPE (who to verify) — defaults to apollo-pipeline (only those can be cold-sent):
 *   (default)        apollo-leadgen source
 *   --all            every source
 *   --play-b         leads present in crm_play_b (any source)
 *   --source "x"     a specific source (e.g. broker_gtm_apollo)
 *   --netnew         restrict to NET-NEW: never contacted + not in a campaign
 *                    (never touches your email history)
 * WHAT to verify: catch_all by default; --include-unknown adds mv 'unknown';
 *   --include-null adds never-checked leads (runs MV first = full waterfall).
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   node scripts/verify-leads.mjs --confirm --max 200                 # cron: resolve apollo catch_alls
 *   node scripts/verify-leads.mjs --netnew --include-null --all --confirm   # verify all net-new
 *   node scripts/verify-leads.mjs --source "broker_gtm_apollo" --include-null --confirm
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { verifyEmail } from './lib/bounceban.mjs';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const MV = envKey('MILLIONVERIFIER_API_KEY');
const BB = envKey('BOUNCEBAN_API_KEY');
const arg = (f) => process.argv.includes(f);
const argv = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CONFIRM = arg('--confirm');
const ALL = arg('--all'); const PLAYB = arg('--play-b'); const NETNEW = arg('--netnew');
const SOURCE = argv('--source', null);
const INCLUDE_UNKNOWN = arg('--include-unknown'); const INCLUDE_NULL = arg('--include-null');
const MAX = parseInt(argv('--max', '100000'), 10);
const CONCURRENCY = Math.max(1, parseInt(argv('--concurrency', '5'), 10));
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const lc = (s) => String(s || '').trim().toLowerCase() || null;
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function readAll(t, c, mod) { const o = []; for (let f = 0; ; f += 1000) { let q = sb.from(t).select(c).range(f, f + 999); if (mod) q = mod(q); const { data, error } = await q; if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }
const mvVerify = async (email) => { try { const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${MV}&email=${encodeURIComponent(email)}&timeout=20`); const j = await r.json(); return (j.result || 'unknown').toLowerCase(); } catch { return 'unknown'; } };

(async () => {
  if (INCLUDE_NULL && !MV) { console.error('MISSING MILLIONVERIFIER_API_KEY'); process.exit(2); }
  if (!BB) { console.error('MISSING BOUNCEBAN_API_KEY'); process.exit(2); }
  log(CONFIRM ? 'VERIFY LEADS — LIVE (spends MV + BounceBan credits)' : 'VERIFY LEADS — dry run');

  const wantMv = ['catch_all', ...(INCLUDE_UNKNOWN ? ['unknown'] : []), ...(INCLUDE_NULL ? [null] : [])];
  let rows = await readAll('outreach_contacts', 'email, source, mv_status, bounceban_status, in_campaign, channel');
  rows = rows.filter((r) => r.email && wantMv.includes(r.mv_status || null) && !(r.mv_status === 'catch_all' && r.bounceban_status));
  // scope
  if (PLAYB) { const pb = await readAll('crm_play_b', 'contact_email'); const inPB = new Set(pb.map((r) => lc(r.contact_email)).filter(Boolean)); rows = rows.filter((r) => inPB.has(lc(r.email))); }
  else if (SOURCE) rows = rows.filter((r) => (r.source || '') === SOURCE);
  // Default scope covers the cold pool AND the founder personal lane (Will 2026-07-06:
  // founder-lane emails are zero-tolerance on verification, but 'founder-personal' and
  // 'broker_gtm_apollo' were invisible to the Monday cron — 33 tech-exec catch-alls parked).
  else if (!ALL) rows = rows.filter((r) => (r.source || '').startsWith('apollo-leadgen') || r.source === 'founder-personal' || r.source === 'broker_gtm_apollo');
  if (NETNEW) { const sends = await readAll('outreach_sends', 'email'); const contacted = new Set(sends.map((s) => lc(s.email))); rows = rows.filter((r) => !contacted.has(lc(r.email)) && !r.in_campaign && r.channel !== 'personal'); }
  const supp = new Set((await readAll('crm_suppression', 'email')).map((r) => lc(r.email)));
  rows = rows.filter((r) => !supp.has(lc(r.email))).slice(0, MAX);

  const nulls = rows.filter((r) => !r.mv_status).length;
  log(`\n${rows.length} leads to verify (${nulls} need MV first, ${rows.length - nulls} go straight to BounceBan).`);
  if (!rows.length) { log('nothing to do.'); return; }
  if (!CONFIRM) { log(`sample: ${rows.slice(0, 8).map((r) => r.email).join(', ')}\n\nDRY RUN — re-run with --confirm.`); return; }

  const tally = { ok: 0, deliverable: 0, undeliverable: 0, risky: 0, unknown: 0, invalid: 0, disposable: 0, error: 0 };
  const at = () => new Date().toISOString();
  let done = 0;
  const queue = [...rows];
  const worker = async () => {
    for (;;) {
      const r = queue.shift(); if (!r) break;
      let mv = r.mv_status;
      if (!mv) { mv = await mvVerify(r.email); await sb.from('outreach_contacts').update({ mv_status: mv, mv_checked_at: at() }).eq('email', r.email); await sleep(80); }
      if (mv === 'ok') tally.ok += 1;
      else if (mv === 'invalid' || mv === 'disposable') { tally[mv] += 1; await sb.from('crm_suppression').upsert([{ email: r.email, reason: 'mv_invalid', source: 'verify-leads' }], { onConflict: 'email' }); }
      else { // catch_all / unknown → BounceBan
        const res = await verifyEmail(r.email, { apiKey: BB });
        const status = res.ok ? res.result : 'error';
        tally[status] = (tally[status] || 0) + 1;
        if (res.ok) {
          await sb.from('outreach_contacts').update({ bounceban_status: res.result, bounceban_checked_at: at(), bounceban_score: res.score ?? null }).eq('email', r.email);
          if (res.result === 'undeliverable') await sb.from('crm_suppression').upsert([{ email: r.email, reason: 'bounceban_undeliverable', source: 'verify-leads' }], { onConflict: 'email' });
        }
        await sleep(80);
      }
      if (++done % 20 === 0) log(`  ${done}/${rows.length} · ${JSON.stringify(tally)}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const sendable = tally.ok + tally.deliverable;
  log(`\nDONE — ${done} verified. ${JSON.stringify(tally)}`);
  log(`  → ${sendable} now SENDABLE (mv ok or bounceban deliverable), ${tally.undeliverable + tally.invalid + tally.disposable} suppressed, ${tally.risky + tally.unknown} parked.`);
})().catch((e) => { console.error('VERIFY_ERROR:', e.message); process.exit(1); });
