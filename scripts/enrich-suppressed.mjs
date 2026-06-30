/**
 * enrich-suppressed.mjs — recover REAL people whose email on file bounced. The
 * verify step suppressed ~250 leads (real names + companies, wrong/guessed email).
 * This re-matches each in Apollo by name + company (+ LinkedIn) to find the
 * CORRECT email, and stages it as a fresh net-new contact (source 'apollo-reenrich',
 * mv_status null) to be re-verified by verify-leads. The old bad email stays
 * suppressed; only Apollo 'verified'/'likely_to_engage' matches are staged
 * (skip 'extrapolated' guesses). Brokers skipped by default (own lane).
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   export APOLLO_API_KEY=$(grep ^APOLLO_API_KEY ~/.openclaw/workspace/.env|cut -d= -f2-)
 *   node scripts/enrich-suppressed.mjs            # dry: candidates + recovery sample
 *   node scripts/enrich-suppressed.mjs --confirm  # match (spends ~1 Apollo credit each) + stage
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envKey = (n) => { try { return (readFileSync('/Users/willnewton/.openclaw/workspace/.env', 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const APOLLO = process.env.APOLLO_API_KEY || envKey('APOLLO_API_KEY');
const CONFIRM = process.argv.includes('--confirm');
const MAX = (() => { const i = process.argv.indexOf('--max'); return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : 100000; })();
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const lc = (s) => String(s || '').trim().toLowerCase() || null;
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readAll = async (t, c) => { const o = []; for (let f = 0; ; f += 1000) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; };

(async () => {
  if (!APOLLO) { console.error('MISSING APOLLO_API_KEY'); process.exit(2); }
  log(CONFIRM ? 'ENRICH SUPPRESSED — LIVE (spends Apollo credits + stages contacts)' : 'ENRICH SUPPRESSED — dry run');
  const supp = (await readAll('crm_suppression', 'email, source')).filter((r) => r.source === 'verify-leads');
  const suppEmails = new Set(supp.map((r) => lc(r.email)));
  const oc = await readAll('outreach_contacts', 'email, name, title, company, email_domain, linkedin_url, location, source');
  const byEmail = new Map(oc.map((c) => [lc(c.email), c]));
  const existing = new Set(oc.map((c) => lc(c.email)));   // don't re-create a contact we already have
  // candidates: suppressed + real (name + company) + not a broker
  const cands = supp.map((s) => byEmail.get(lc(s.email))).filter(Boolean)
    .filter((c) => c.name && c.company && !/broker/i.test(c.source || ''))
    .slice(0, MAX);
  log(`${cands.length} suppressed real-ICP leads to re-match in Apollo (brokers skipped).`);
  if (!CONFIRM) { log(`sample: ${cands.slice(0, 6).map((c) => `${c.name}@${c.email_domain}`).join(', ')}\n\nDRY RUN — re-run with --confirm.`); return; }

  const tally = { matched: 0, corrected: 0, same: 0, no_match: 0, weak: 0, dup: 0 };
  const stage = [];
  let done = 0;
  for (const c of cands) {
    const [first, ...rest] = String(c.name).trim().split(/\s+/);
    let p = null;
    try {
      const r = await fetch('https://api.apollo.io/api/v1/people/match', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO }, body: JSON.stringify({ first_name: first, last_name: rest.join(' '), organization_name: c.company, domain: c.email_domain, linkedin_url: c.linkedin_url || undefined }) });
      p = (await r.json())?.person || null;
    } catch { /* skip */ }
    await sleep(250);
    if (!p || !p.email) { tally.no_match += 1; continue; }
    tally.matched += 1;
    const newEmail = lc(p.email);
    const good = ['verified', 'likely_to_engage'].includes(p.email_status);
    if (newEmail === lc(c.email)) { tally.same += 1; continue; }      // same bad email → nothing gained
    if (!good) { tally.weak += 1; continue; }                          // extrapolated/guessed → skip
    if (existing.has(newEmail) || suppEmails.has(newEmail)) { tally.dup += 1; continue; }
    tally.corrected += 1;
    stage.push({ email: newEmail, name: c.name, title: c.title, company: c.company, email_domain: lc(p.organization?.primary_domain) || newEmail.split('@')[1], linkedin_url: c.linkedin_url, location: c.location || p.city || null, source: 'apollo-reenrich', mv_status: null });
    existing.add(newEmail);
    if (++done % 20 === 0) log(`  ${done}/${cands.length} · ${JSON.stringify(tally)}`);
  }
  if (stage.length) for (let i = 0; i < stage.length; i += 200) { const { error } = await sb.from('outreach_contacts').upsert(stage.slice(i, i + 200), { onConflict: 'email' }); if (error) log('  stage warn:', error.message); }
  log(`\nDONE — ${JSON.stringify(tally)}`);
  log(`  → staged ${stage.length} corrected-email contacts (source apollo-reenrich, mv null). Next: node scripts/verify-leads.mjs --source "apollo-reenrich" --include-null --confirm`);
})().catch((e) => { console.error('ENRICH_ERROR:', e.message); process.exit(1); });
