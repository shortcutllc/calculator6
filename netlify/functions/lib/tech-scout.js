/**
 * tech-scout.js — the shared tech-exec scouting engine, extracted from
 * scripts/tech-scout.mjs so it can run BOTH as the local Mac script AND as a
 * Netlify background function (tech-scout-background.js), with no logic drift.
 *
 * The engine is pure of persistence: the caller loads the ledger (domain -> record)
 * and passes a `persist(ledger, dirtyDomains)` callback. The local wrapper persists
 * to prime_targets.json; the Netlify wrapper persists to the tech_scout_ledger
 * Supabase table. Candidates are passed in (the caller harvests or file-caches).
 *
 * TITLE POLICY (Will 2026-07-13): for tech founders / emerging-tech companies we
 * pull People professionals ONLY. The Founder/CEO/COO "exec-door" tier and the
 * Chief-of-Staff/EA proxy tier were REMOVED — see BUYER_TIERS + BUYER_SEARCH_TITLES.
 */

import { verifyEmail } from '../../../scripts/lib/bounceban.mjs';

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const cleanDom = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim() || null;

// tech-ish gate — same coarse cluster as find-founder-targets, plus keyword rescue
export const TECH_INDUSTRY_RE = /software|internet|information technology|computer|fintech|financial services|biotech|artificial intelligence|saas|e-?learning|health.*tech|marketing & advertising/i;
export const TECH_KEYWORD_RE = /\b(saas|software|platform|api|ai|machine learning|fintech|developer|cloud|data|app)\b/i;

// The buyer cluster, ranked. PEOPLE PROFESSIONALS ONLY (Will 2026-07-13): the
// old rank-3 (chief of staff / EA) and rank-4 (COO/CEO/founder "exec door") tiers
// were removed for the tech-exec lane — we no longer pull Founder/CEO titles.
export const BUYER_TIERS = [
  { rank: 1, label: 'people-owner', re: /\b(chief people|chro|head of people|vp,? (of )?people|people operations|people ops|director,? (of )?people|head of hr|vp,? (of )?hr|human resources (director|lead|manager)|head of talent)\b/i },
  { rank: 2, label: 'workplace-owner', re: /\b(workplace experience|employee experience|office (manager|operations|experience)|workplace (manager|operations|lead)|facilities (manager|director))\b/i },
];
export const buyerTier = (title) => { for (const t of BUYER_TIERS) if (t.re.test(title || '')) return t; return null; };
export const BUYER_SEARCH_TITLES = [
  'Head of People', 'VP of People', 'Chief People Officer', 'People Operations', 'Director of People', 'Head of HR', 'Head of Talent',
  'Workplace Experience', 'Employee Experience', 'Office Manager', 'Workplace Operations',
];

function makeApollo(apolloKey) {
  return async function apollo(path, bodyObj) {
    for (let a = 0; ; a += 1) {
      const r = await fetch(`https://api.apollo.io/api/v1/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apolloKey },
        body: JSON.stringify(bodyObj),
      });
      if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
      if (!r.ok) throw new Error(`${path} ${r.status}`);
      return r.json();
    }
  };
}
const makeMvVerify = (mvKey) => async (email) => {
  try { const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${mvKey}&email=${encodeURIComponent(email)}&timeout=20`); const j = await r.json(); return (j.result || 'unknown').toLowerCase(); }
  catch { return 'unknown'; }
};
async function readAll(sb, t, c) {
  const o = [];
  for (let f = 0; ; f += 1000) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; }
  return o;
}

// ---- Ledger persistence (Supabase tech_scout_ledger). Single source of truth
// shared by the local runner AND the Netlify background fn (replaces prime_targets.json).
export async function loadLedger(sb) {
  const rows = await readAll(sb, 'tech_scout_ledger', 'domain, record');
  const led = {}; for (const r of rows) led[r.domain] = r.record || {};
  return led;
}
export async function persistLedger(sb, ledger, dirty) {
  const domains = dirty ? [...dirty] : Object.keys(ledger);
  if (!domains.length) return;
  const rows = domains.map((d) => ({ domain: d, record: ledger[d], trigger_type: ledger[d]?.trigger_type ?? null, status: ledger[d]?.status ?? null, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from('tech_scout_ledger').upsert(rows.slice(i, i + 200), { onConflict: 'domain' });
    if (error) throw new Error(`ledger persist: ${error.message}`);
  }
}

// ---- HARVEST: Claude + web_search sweeps the signal feeds and reports the day's
// candidates via a forced tool call (same pattern as the founder queue's research).
export const HARVEST_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' }, domain: { type: ['string', 'null'] },
          trigger_type: { type: 'string', enum: ['funding', 'people_posting', 'growth_list'] },
          trigger: { type: 'string', description: 'one-line human-readable why-now with a date when known' },
          evidence_url: { type: 'string' },
          remote: { type: ['boolean', 'null'], description: 'true if the company is fully remote / heavily distributed (no single office) → downstream leads with the VIRTUAL track (mindfulness, sound baths, nutrition coaching) instead of on-site' },
        },
        required: ['company', 'trigger_type', 'trigger', 'evidence_url'],
      },
    },
  },
  required: ['candidates'],
};
export async function harvestCandidates({ anthropicKey, log = () => {} }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const today = new Date().toISOString().slice(0, 10);
  const sys = `You are the daily signal-collection pass for a corporate-wellness founder's NYC outreach. Today is ${today}. Find CANDIDATE COMPANIES that plausibly just crossed (or are about to cross) ~100 employees in the New York area, each with a concrete recent WHY-NOW trigger. Work three feeds with web search: (1) RECENT NYC FUNDING — AlleyWatch daily/weekly funding reports and news from the last ~10 days; Series A/B ~$10-60M at companies plausibly 50-250 employees; skip seed-stage tiny companies and unicorns. (2) FIRST-PEOPLE-HIRE POSTINGS — currently-open Head of People / People Operations roles at NYC companies (site:boards.greenhouse.io / jobs.lever.co / jobs.ashbyhq.com searches). (3) GROWTH CHATTER — only companies with indicated size 50-250. RULES: real companies only, every entry needs a live source URL, no duplicates. A physical NYC office is IDEAL (it fits the on-site play), so prefer it, but do NOT discard a strong fully-remote or distributed company: Shortcut serves distributed teams with a VIRTUAL track (mindfulness, sound baths, nutrition coaching), so a remote company is a real opportunity, not a disqualifier. When a company is fully remote or heavily distributed, still include it and set remote=true so downstream leads with the virtual angle. Bias hard toward companies plainly in the 60-250 headcount band and plainly NEW-YORK-based — off-band (too small/too big) and wrong-city entries waste an Apollo enrich credit each (2026-07-07: Warp 51pp, Prosper 13pp, an Italian utility named Hera, and a Texas company named Crosby all got enriched and disqualified). When a company name is ambiguous, include the DOMAIN so it resolves to the right entity. Aim for 25-35 fresh, on-band entries so the pipeline can land 5 qualified buyers. Report via report_candidates exactly once when done.`;
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929', max_tokens: 8000, temperature: 0.2, system: sys,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 12 },
      { name: 'report_candidates', description: 'Report the harvested candidates. Call exactly once.', input_schema: HARVEST_SCHEMA },
    ],
    messages: [{ role: 'user', content: 'Run the three feeds, then call report_candidates once.' }],
  });
  let tu = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_candidates');
  if (!tu) {
    const critique = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    const r2 = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', max_tokens: 8000, temperature: 0.2, system: sys,
      tools: [{ name: 'report_candidates', description: 'Report the harvested candidates.', input_schema: HARVEST_SCHEMA }],
      tool_choice: { type: 'tool', name: 'report_candidates' },
      messages: [
        { role: 'user', content: 'Run the three feeds, then call report_candidates once.' },
        { role: 'assistant', content: critique || '(research complete)' },
        { role: 'user', content: 'Call report_candidates now.' },
      ],
    });
    tu = (r2.content || []).find((b) => b.type === 'tool_use' && b.name === 'report_candidates');
  }
  return tu?.input?.candidates || [];
}

// ---- REPORT: the brain hook — replies per trigger_type. Joins the ledger
// (domain -> trigger_type) with founder-personal contacts, Will's sends, replies.
// `ledger` = object domain -> record (caller loads it).
export async function runReport({ sb, ledger = {}, log = console.log }) {
  const contacts = (await readAll(sb, 'outreach_contacts', 'email, email_domain, source')).filter((r) => r.source === 'founder-personal');
  const byDomain = new Map(Object.entries(ledger));
  const sends = await readAll(sb, 'outreach_sends', 'email, sender_email');
  const sentSet = new Set(sends.filter((s) => lc(s.sender_email) === 'will@getshortcut.co').map((s) => lc(s.email)));
  const replies = await readAll(sb, 'outreach_replies', 'email, reply_sentiment');
  const repMap = new Map(); for (const r of replies) { const e = lc(r.email); if (!repMap.has(e)) repMap.set(e, []); repMap.get(e).push(lc(r.reply_sentiment)); }
  const stats = {};
  for (const c of contacts) {
    const t = byDomain.get(lc(c.email_domain))?.trigger_type || 'untagged';
    stats[t] ||= { leads: 0, sent: 0, replied: 0, positive: 0 };
    stats[t].leads += 1;
    const e = lc(c.email);
    if (sentSet.has(e)) stats[t].sent += 1;
    const rs = repMap.get(e) || [];
    if (rs.length) stats[t].replied += 1;
    if (rs.includes('positive')) stats[t].positive += 1;
  }
  log('FOUNDER TECH LANE — conversion by trigger type (feeds pruned by data, not opinion)');
  for (const [t, s] of Object.entries(stats)) log(`  ${t.padEnd(16)} leads ${String(s.leads).padStart(3)} · sent ${String(s.sent).padStart(3)} · replied ${s.replied} · positive ${s.positive}`);
  if (!Object.keys(stats).length) log('  (no founder-personal leads yet)');
  return stats;
}

/**
 * runTechScout — enrich → qualify → buyer ID → verify → queue, over `candidates`.
 * Mutates `ledger` in place and calls `await persist(ledger, dirtyDomains)` at the
 * self-heal writeback and once at the end. Returns run stats.
 */
export async function runTechScout({
  sb, apolloKey, mvKey, bbKey, log = console.log,
  confirm = false, queue = false, maxOrgs = 30, maxBuyers = 5,
  candidates = [], ledger = {}, persist = async () => {},
  queueUrl = 'https://proposals.getshortcut.co/.netlify/functions/founder-queue-background',
}) {
  const apollo = makeApollo(apolloKey);
  const mvVerify = makeMvVerify(mvKey);
  const dirty = new Set();
  const touch = (domain) => dirty.add(domain);

  // SELF-HEAL: any buyer this ledger landed whose founder note never materialized
  // gets re-queued (3-strike cap). (Will 2026-07-06: never lose a lead to a failed draft.)
  if (confirm && queue) {
    const landedBuyers = Object.entries(ledger).filter(([, e]) => e.buyer?.email && (e.status === 'buyer_landed' || e.queued));
    if (landedBuyers.length) {
      const { data: drafted } = await sb.from('saved_drafts').select('recipient_email').eq('target_kind', 'founder_note');
      const hasDraft = new Set((drafted || []).map((d) => lc(d.recipient_email)));
      let healed = 0;
      for (const [domain, e] of landedBuyers) {
        const em = lc(e.buyer.email);
        if (hasDraft.has(em)) continue;
        e.queue_attempts = (e.queue_attempts || 1) + 1; touch(domain);
        if (e.queue_attempts > 3) {
          if (e.status !== 'buyer_landed_draft_failed') { e.status = 'buyer_landed_draft_failed'; log(`  self-heal: GIVING UP on ${em} (${e.company}) after ${e.queue_attempts - 1} attempts — draft invocations keep dying`); }
          continue;
        }
        healed += 1;
        const cta = healed % 2 === 1 ? 'help' : 'convo';
        const qr = await fetch(queueUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: 1, only: em, audience: 'tech-execs', cta, trigger: e.trigger, trigger_type: e.trigger_type, remote: e.remote === true }) });
        log(`  self-heal: re-queued ${em} (${e.company}) attempt ${e.queue_attempts} → HTTP ${qr.status}`);
        await sleep(500);
      }
      if (!healed) log('  self-heal: all landed buyers have drafts (or are capped).');
      await persist(ledger, dirty);
    }
  }

  // known-universe guards
  const knownEmails = new Set((await readAll(sb, 'outreach_contacts', 'email')).map((r) => lc(r.email)));
  const knownCompanies = new Set((await readAll(sb, 'outreach_contacts', 'email_domain, source'))
    .filter((r) => r.source === 'founder-personal').map((r) => lc(r.email_domain)));
  const supp = new Set((await readAll(sb, 'crm_suppression', 'email')).map((r) => lc(r.email)));
  const clientDomains = new Set((await readAll(sb, 'crm_companies', 'primary_domain').catch(() => []))
    .map((r) => cleanDom(r.primary_domain)).filter(Boolean));

  const results = []; let orgCredits = 0; let personCredits = 0; let buyersLanded = 0;
  for (const cand of candidates) {
    if (orgCredits >= maxOrgs) { log('org-credit cap reached — stopping'); break; }
    const name = String(cand.company || '').trim();
    if (!name) continue;
    let domain = cleanDom(cand.domain);
    try {
      if (!domain) {
        const s = await apollo('mixed_companies/search', { q_organization_name: name, page: 1, per_page: 3 });
        const hit = (s.organizations || s.accounts || [])[0];
        domain = cleanDom(hit?.primary_domain || hit?.website_url);
        if (!domain) { results.push({ company: name, status: 'no_domain' }); continue; }
      }
      if (ledger[domain]?.status === 'qualified') { results.push({ company: name, domain, status: 'already_in_ledger' }); continue; }
      if (clientDomains.has(domain)) { results.push({ company: name, domain, status: 'is_client' }); continue; }
      if (knownCompanies.has(domain)) { results.push({ company: name, domain, status: 'already_targeted' }); continue; }
      if (!confirm) { results.push({ company: name, domain, status: 'would_enrich', trigger: cand.trigger }); continue; }

      const e = await apollo(`organizations/enrich?domain=${encodeURIComponent(domain)}`, {}).catch(() => null);
      orgCredits += 1;
      const o = e?.organization;
      if (!o) { results.push({ company: name, domain, status: 'org_enrich_miss' }); continue; }
      const size = o.estimated_num_employees || null;
      const industry = lc(o.industry) || '';
      const kw = (o.keywords || []).join(' ');
      const city = lc([o.city, o.state].filter(Boolean).join(', '));
      const growth12 = o.organization_headcount_twelve_month_growth ?? null;

      const sizeOk = size != null && size >= 90 && size <= 280;
      const techOk = TECH_INDUSTRY_RE.test(industry) || TECH_KEYWORD_RE.test(kw);
      const nycOk = /new york|brooklyn|nyc/.test(city || '') || /new york|nyc/i.test(`${cand.trigger} ${cand.evidence_url || ''}`);
      const crossedRecently = size != null && growth12 != null && growth12 > 0 && (size / (1 + growth12)) < 100 && size >= 95;
      const verdict = sizeOk && techOk && nycOk;
      const entry = {
        company: o.name || name, domain, status: verdict ? 'qualified' : 'disqualified',
        why_not: verdict ? null : [!sizeOk && `size=${size}`, !techOk && `industry=${industry}`, !nycOk && `city=${city}`].filter(Boolean).join(' · '),
        size, industry, city, growth_12mo: growth12, crossed_recently: crossedRecently,
        latest_funding_stage: o.latest_funding_stage || null, latest_funding_date: o.latest_funding_round_date || null,
        trigger_type: cand.trigger_type, trigger: cand.trigger, evidence_url: cand.evidence_url,
        remote: cand.remote === true,
        scouted_at: new Date().toISOString(),
      };
      ledger[domain] = entry; touch(domain);
      if (!verdict) { results.push(entry); continue; }
      if (buyersLanded >= maxBuyers) { entry.status = 'qualified_buyer_deferred'; results.push(entry); continue; }

      const ps = await apollo('mixed_people/api_search', {
        q_organization_domains_list: [domain], person_titles: BUYER_SEARCH_TITLES,
        include_similar_titles: false, page: 1, per_page: 25,
      });
      const ranked = (ps.people || [])
        .map((p) => ({ p, tier: buyerTier(p.title) }))
        .filter((x) => x.tier && x.p.has_email)
        .sort((a, b) => a.tier.rank - b.tier.rank);
      if (!ranked.length) { entry.status = 'qualified_no_buyer_found'; results.push(entry); continue; }
      const pick = ranked[0];

      const m = await apollo('people/match', { id: String(pick.p.id), reveal_personal_emails: false });
      personCredits += 1;
      const person = m.person || {};
      const email = lc(person.email);
      const now = new Date().toISOString();
      entry.buyer = {
        name: person.name || pick.p.name, title: person.title || pick.p.title, tier: pick.tier.label,
        email: email || null, linkedin_url: person.linkedin_url || null,
      };
      if (!email) { entry.status = 'buyer_no_email'; results.push(entry); continue; }
      if (person.email_status && !['verified', 'likely to engage', 'likely_to_engage'].includes(lc(person.email_status))) { entry.status = 'buyer_email_unverified'; results.push(entry); continue; }
      if (knownEmails.has(email) || supp.has(email)) { entry.status = 'buyer_known_or_suppressed'; results.push(entry); continue; }
      let mv = null; let bb = null;
      if (mvKey) { mv = await mvVerify(email); if (mv === 'invalid' || mv === 'disposable') { entry.status = 'buyer_mv_invalid'; results.push(entry); continue; } }
      if (bbKey && (mv === 'catch_all' || mv === 'unknown' || !mv)) {
        const res = await verifyEmail(email, { apiKey: bbKey });
        if (res.ok) {
          bb = res.result;
          if (bb === 'undeliverable') {
            entry.status = 'buyer_bounceban_undeliverable';
            await sb.from('crm_suppression').upsert([{ email, reason: 'bounceban_undeliverable', source: 'tech-scout' }], { onConflict: 'email' });
            results.push(entry); continue;
          }
        }
      }
      const sendable = mv === 'ok' || bb === 'deliverable';
      const { error: insErr } = await sb.from('outreach_contacts').upsert([{
        email, email_domain: domain, name: entry.buyer.name, title: entry.buyer.title,
        company: entry.company, linkedin_url: entry.buyer.linkedin_url, location: city,
        source: 'founder-personal', channel: 'personal',
        mv_status: mv, mv_checked_at: mv ? now : null,
        bounceban_status: bb, bounceban_checked_at: bb ? now : null,
        first_seen: now, ingested_at: now,
      }], { onConflict: 'email' });
      if (insErr) { entry.status = `insert_failed: ${insErr.message}`; results.push(entry); continue; }
      entry.buyer.mv_status = mv; entry.buyer.bounceban_status = bb;
      if (!sendable) { entry.status = 'buyer_parked_unverified'; log(`  parked (not sendable: mv=${mv} bb=${bb || 'n/a'}) ${email}`); results.push(entry); continue; }
      entry.status = 'buyer_landed';
      buyersLanded += 1;
      if (queue) {
        const cta = (buyersLanded % 2 === 1) ? 'help' : 'convo';
        const qr = await fetch(queueUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: 1, only: email, audience: 'tech-execs', cta, trigger: cand.trigger, trigger_type: cand.trigger_type, remote: cand.remote === true }) });
        entry.queued = qr.status === 202 || qr.status === 200;
        log(`  queued ${email} (cta=${cta}, mv=${mv} bb=${bb || 'n/a'}) → HTTP ${qr.status}`);
      }
      results.push(entry);
      await sleep(150);
    } catch (err) {
      results.push({ company: name, domain, status: `error: ${err.message}` });
    }
  }

  // TOP-UP from standing inventory (Will 2026-07-07): draw any shortfall from the
  // ~95 enriched, sendable, undrafted founder-personal execs already on hand.
  if (queue && confirm && buyersLanded < maxBuyers) {
    const deficit = maxBuyers - buyersLanded;
    const qr = await fetch(queueUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audience: 'tech-execs', max: deficit }) });
    log(`TOP-UP: harvest landed ${buyersLanded}/${maxBuyers} sendable buyers; requested ${deficit} more from the standing founder-personal pool → HTTP ${qr.status}`);
    results.push({ company: `[top-up ${deficit} from standing pool]`, status: `topup_requested_${qr.status}` });
  }

  await persist(ledger, dirty);
  return { results, orgCredits, personCredits, buyersLanded };
}
