#!/usr/bin/env node
/**
 * verify-drip-leads.mjs — verify a drip campaign's leads before anything sends.
 *
 * These addresses came off a hand-maintained sheet, and most were last emailed
 * a year or more ago. People change jobs; an address that worked in 2024 is not
 * evidence it works now. On the PRIMARY domain a bounce is expensive, so every
 * lead is checked before the first touch rather than discovered afterwards.
 *
 * Two passes, matching the hard lesson already in the cold engine:
 *   1. MillionVerifier — fast, cheap, authoritative on 'ok' and 'invalid'.
 *   2. BounceBan — second pass ONLY for catch-all/unknown, which MV cannot
 *      resolve. MV 'ok' alone has false-OK'd guessed addresses before.
 *
 * Writes the verdict to drip_leads.custom_fields.mv / .bb and flips anything
 * undeliverable to status 'suppressed' so the runner skips it permanently.
 *
 *   node scripts/verify-drip-leads.mjs --campaign jaimie-fall-nurture-2026
 *   node scripts/verify-drip-leads.mjs --campaign <slug> --apply
 */
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './lib/load-env.mjs';
import { verifyEmail as bbVerifyEmail } from './lib/bounceban.mjs';

const arg = (f, d = null) => { const i = process.argv.indexOf(f); return i > -1 ? (process.argv[i + 1] ?? d) : d; };
const has = (f) => process.argv.includes(f);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mvVerify(email, key) {
  try {
    const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${key}&email=${encodeURIComponent(email)}&timeout=10`);
    const j = await r.json();
    return String(j.result || 'unknown').toLowerCase();
  } catch { return 'unknown'; }
}

(async () => {
  requireEnv('VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MILLIONVERIFIER_API_KEY');
  const slug = arg('--campaign');
  const limit = parseInt(arg('--limit', '5000'), 10);
  const apply = has('--apply');
  const useBB = has('--bb');
  if (!slug) throw new Error('pass --campaign <slug>');

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const MV = process.env.MILLIONVERIFIER_API_KEY;
  const BB = process.env.BOUNCEBAN_API_KEY;

  const { data: camp } = await sb.from('drip_campaigns').select('id,slug,status').eq('slug', slug).single();
  if (!camp) throw new Error(`no campaign ${slug}`);
  if (camp.status === 'active' && apply) throw new Error('campaign is ACTIVE — pause it before re-verifying');

  const { data: leads } = await sb.from('drip_leads')
    .select('id,email,custom_fields,status').eq('campaign_id', camp.id).eq('status', 'active').limit(limit);
  const todo = (leads || []).filter((l) => !(l.custom_fields || {}).mv);
  console.log(`${slug}: ${leads.length} active leads, ${todo.length} unverified`);
  if (!todo.length) return;
  if (!apply) { console.log('dry run — pass --apply to verify and write results'); return; }

  const tally = {};
  let bbUsed = 0, suppressed = 0;
  for (let i = 0; i < todo.length; i++) {
    const l = todo[i];
    const mv = await mvVerify(l.email, MV);
    let bb = null;
    // MV cannot resolve catch-all/unknown; BounceBan probes real deliverability.
    // It is quasi-synchronous (up to ~80s per call), so it is gated behind
    // --bb so a full-list MV pass stays fast.
    if (useBB && BB && /^(catch_all|catchall|unknown)$/.test(mv)) {
      const res = await bbVerifyEmail(l.email, { apiKey: BB });
      bb = res.result; bbUsed++;
    }

    const key = bb ? `${mv}/${bb}` : mv;
    tally[key] = (tally[key] || 0) + 1;

    // Only refuse what is positively bad. A catch-all that BounceBan calls
    // deliverable is fine; an unresolved catch-all is left active but flagged,
    // because these are known contacts, not guessed addresses.
    const bad = mv === 'invalid' || mv === 'disposable' || bb === 'undeliverable';
    const patch = { ...(l.custom_fields || {}), mv, ...(bb ? { bb } : {}) };
    await sb.from('drip_leads')
      .update({ custom_fields: patch, ...(bad ? { status: 'suppressed', halted_reason: `verifier: ${key}` } : {}), updated_at: new Date().toISOString() })
      .eq('id', l.id);
    if (bad) suppressed++;

    if ((i + 1) % 50 === 0) { console.log(`  ${i + 1}/${todo.length} verified (${suppressed} suppressed)`); await sleep(250); }
  }

  console.log('\nresults:');
  Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k}`));
  console.log(`\nBounceBan second pass used on ${bbUsed}; ${suppressed} leads suppressed as undeliverable`);
  if (!useBB) console.log('(catch-all/unknown left unresolved — re-run with --bb on the subset you are about to send)');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
