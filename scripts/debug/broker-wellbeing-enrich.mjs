/**
 * broker-wellbeing-enrich.mjs — enrich the wellbeing-role broker leads found by
 * broker-wellbeing-drysearch, verify (MV + BounceBan), and add to the broker pool
 * with broker_priority_rank=0 so the daily founder-queue drafts them FIRST
 * (existing brokers are rank 1-24). Approved by Will 2026-07-13 (~126 Apollo credits).
 *
 *   node scripts/debug/broker-wellbeing-enrich.mjs            # DRY (search only)
 *   node scripts/debug/broker-wellbeing-enrich.mjs --confirm  # spend Apollo + insert
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { verifyEmail } from '../lib/bounceban.mjs';

const CONFIRM = process.argv.includes('--confirm');
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return (process.env[n] || '').trim(); } };
const APOLLO = process.env.APOLLO_API_KEY || envKey('APOLLO_API_KEY');
const MV = process.env.MILLIONVERIFIER_API_KEY || envKey('MILLIONVERIFIER_API_KEY');
const BB = process.env.BOUNCEBAN_API_KEY || envKey('BOUNCEBAN_API_KEY');
const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanDom = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim() || null;
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

const TITLES = ['Wellbeing Account Manager', 'Wellbeing Consultant', 'Wellness Consultant', 'Wellness Program Manager', 'Health Management Consultant', 'Population Health Consultant', 'Population Health Strategist', 'Wellbeing Strategist', 'Vitality and Wellbeing', 'Health and Wellbeing', 'Wellness Manager', 'Wellbeing Specialist'];
const WELLBEING_RE = /wellbeing|well-being|well being|wellness|vitality|population health/i;

async function apollo(path, body) {
  for (let a = 0; ; a += 1) {
    const r = await fetch(`https://api.apollo.io/api/v1/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO }, body: JSON.stringify(body) });
    if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
    if (!r.ok) throw new Error(`${path} ${r.status}`);
    return r.json();
  }
}
const mvVerify = async (email) => { try { const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${MV}&email=${encodeURIComponent(email)}&timeout=20`); const j = await r.json(); return (j.result || 'unknown').toLowerCase(); } catch { return 'unknown'; } };

(async () => {
  const firms = (await sb.from('crm_target_firms').select('id, display_name, domain, track').then((r) => r.data || [])).filter((f) => f.track === 'broker' && f.domain);
  const domById = new Map();
  const idByDom = new Map();
  for (const f of firms) { const d = cleanDom(f.domain); if (d) { idByDom.set(d, f.id); domById.set(f.id, f.display_name); } }
  const domains = [...idByDom.keys()];
  const known = new Set((await sb.from('outreach_contacts').select('email').then((r) => (r.data || []).map((x) => lc(x.email)))));
  const supp = new Set((await sb.from('crm_suppression').select('email').then((r) => (r.data || []).map((x) => lc(x.email)))));

  // search (free)
  let people = [];
  for (let page = 1; page <= 5; page += 1) {
    const s = await apollo('mixed_people/api_search', { q_organization_domains_list: domains, person_titles: TITLES, include_similar_titles: true, page, per_page: 100 });
    const batch = s.people || []; people.push(...batch);
    if (batch.length < 100) break; await sleep(300);
  }
  // keep only real wellbeing titles + has_email + net-new
  const targets = people.filter((p) => p.has_email && WELLBEING_RE.test(p.title || '') && !known.has(lc(p.email)));
  log(`search: ${people.length} matched · ${targets.length} net-new wellbeing targets to enrich`);
  if (!CONFIRM) { log(`DRY — re-run with --confirm to enrich ${targets.length} (~${targets.length} Apollo credits).`); return; }

  let credits = 0, inserted = 0; const tally = { ok: 0, catch_all: 0, unknown: 0, deliverable: 0, suppressed: 0, no_email: 0, invalid: 0 };
  for (const p of targets) {
    try {
      const m = await apollo('people/match', { id: String(p.id), reveal_personal_emails: false });
      credits += 1;
      const person = m.person || {};
      const email = lc(person.email);
      if (!email) { tally.no_email += 1; continue; }
      if (known.has(email) || supp.has(email)) { tally.suppressed += 1; continue; }
      const dom = cleanDom(person.organization?.primary_domain || p.organization?.primary_domain || email.split('@')[1]);
      let mv = await mvVerify(email); let bb = null;
      if (mv === 'invalid' || mv === 'disposable') { tally.invalid += 1; continue; }
      if (BB && (mv === 'catch_all' || mv === 'unknown')) { const res = await verifyEmail(email, { apiKey: BB }); if (res.ok) { bb = res.result; if (bb === 'undeliverable') { tally.invalid += 1; continue; } } }
      tally[mv] = (tally[mv] || 0) + 1; if (bb === 'deliverable') tally.deliverable += 1;
      const now = new Date().toISOString();
      const firmId = idByDom.get(dom) || null;
      const { error } = await sb.from('outreach_contacts').upsert([{
        email, email_domain: dom, name: person.name || p.name, title: person.title || p.title,
        company: person.organization?.name || p.organization?.name || null,
        linkedin_url: person.linkedin_url || null, location: lc([person.city, person.state].filter(Boolean).join(', ')) || null,
        source: 'broker-wellbeing-apollo', broker_track: 'broker', broker_firm_id: firmId, broker_priority_rank: 0,
        mv_status: mv, mv_checked_at: now, bounceban_status: bb, bounceban_checked_at: bb ? now : null,
        first_seen: now, ingested_at: now,
      }], { onConflict: 'email' });
      if (error) { log(`  insert warn ${email}: ${error.message}`); continue; }
      inserted += 1; known.add(email);
      if (inserted % 20 === 0) log(`  …${inserted} inserted (${credits} credits)`);
      await sleep(120);
    } catch (e) { log(`  err ${p.name}: ${e.message}`); }
  }
  log(`DONE: ${inserted} wellbeing brokers added (rank 0 = drafted first) · ${credits} Apollo credits · verify ${JSON.stringify(tally)}`);
})().catch((e) => { console.error('ENRICH_ERROR:', e.message); process.exit(1); });
