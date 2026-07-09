/**
 * Sandbox for lib/next-actions.js — validates the recommendation engine against
 * REAL leads. Read-only. No sends, no writes.
 *
 *   node scripts/debug/next-actions-sandbox.mjs           # find candidate leads
 *   node scripts/debug/next-actions-sandbox.mjs <email>   # full run on one lead
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// --- env: repo .env (Supabase) + openclaw .env (ANTHROPIC_API_KEY) ---
function loadEnv(path) {
  try {
    for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* missing file — skip */ }
}
loadEnv('.env');
loadEnv('/Users/willnewton/.openclaw/workspace/.env');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing Supabase env'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');
const { rulesActions, nextActions } = await import('../../netlify/functions/lib/next-actions.js');

const emailArg = process.argv[2];

if (!emailArg) {
  // Discovery: surface a few candidates per interesting state.
  console.log('ANTHROPIC key present:', !!process.env.ANTHROPIC_API_KEY, '\n');

  const { data: posReplies } = await sb.from('outreach_replies')
    .select('email, reply_sentiment, reply_date')
    .eq('reply_sentiment', 'positive').order('reply_date', { ascending: false }).limit(8);
  console.log('--- recent POSITIVE replies (create-proposal candidates) ---');
  for (const r of posReplies || []) console.log(`  ${r.email}  (${r.reply_date?.slice(0, 10)})`);

  const { data: notes } = await sb.from('workhuman_leads')
    .select('email, name, company, notes')
    .not('notes', 'is', null).ilike('notes', '%·%').limit(30);
  const neverEmailed = [];
  for (const w of notes || []) {
    const { data: s } = await sb.from('outreach_sends').select('email').eq('email', w.email).limit(1);
    if (!s || s.length === 0) { neverEmailed.push(w); if (neverEmailed.length >= 6) break; }
  }
  console.log('\n--- personal-note leads NEVER emailed (warm cold-open candidates) ---');
  for (const w of neverEmailed) console.log(`  ${w.email}  ${w.name || ''} @ ${w.company || ''}`);

  const { data: supp } = await sb.from('crm_suppression').select('email, reason').limit(4);
  console.log('\n--- suppressed (should short-circuit, ZERO llm calls) ---');
  for (const s of supp || []) console.log(`  ${s.email}  (${s.reason})`);

  console.log('\nRe-run with:  node scripts/debug/next-actions-sandbox.mjs <email>');
  process.exit(0);
}

// Full run on one lead.
const email = emailArg.trim().toLowerCase();
const t0 = Date.now();
const pic = await leadPicture(sb, { email });
console.log(`\n===== ${email} =====`);
console.log('identity   :', pic.identity?.name, '|', pic.identity?.title, '|', pic.identity?.company);
console.log('preflight  :', pic.preflight?.recommendation, '| suppressed:', pic.preflight?.suppressed, '| client:', pic.preflight?.is_client);
console.log('history    : emailed', pic.history?.emailed_count, '| replied', pic.history?.replied,
  '| last reply sentiment:', (pic.history?.replies || []).slice(-1)[0]?.sentiment || 'n/a');
console.log('workhuman  :', pic.workhuman ? `tier ${pic.workhuman.tier}, note: ${pic.workhuman.personal_note ? JSON.stringify(pic.workhuman.personal_note.slice(0, 90)) : 'none'}` : 'none');
console.log('proposals  :', (pic.proposals || []).length, '| signups:', (pic.signups || []).length);
console.log('graduation :', pic.graduation ? `graduated=${pic.graduation.graduated} reason=${pic.graduation.reason} owner=${pic.graduation.owner} draft=${pic.graduation.draft ? JSON.stringify(pic.graduation.draft.subject) : 'none'}` : 'none');
console.log('latest reply cold?:', (pic.history?.replies || []).slice(-1)[0]?.cold);

console.log('\n--- RULES ONLY (what lookup_lead shows) ---');
for (const a of rulesActions(pic)) {
  console.log(`  [${a.priority}] ${a.action}  →  verb: ${a.verb ?? 'manual'}  (conf ${a.confidence})`);
  console.log(`      ${a.why}`);
}

console.log('\n--- FULL (rules + LLM judgment — what next_actions_for_lead shows) ---');
const { actions, used_llm } = await nextActions(pic, { useLLM: true });
for (const a of actions) {
  const tag = a.source === 'llm' ? ' ✨LLM' : '';
  console.log(`  [${a.priority}] ${a.action}  →  verb: ${a.verb ?? 'manual'}  (conf ${a.confidence})${tag}`);
  console.log(`      ${a.why}`);
}
console.log(`\nused_llm: ${used_llm}   |   elapsed: ${Date.now() - t0}ms`);
process.exit(0);
