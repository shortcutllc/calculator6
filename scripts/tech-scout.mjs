/**
 * tech-scout.mjs — the daily "SDR" for the founder tech-exec lane (2026-07-06).
 * See memory/tech_exec_targeting.md (v2: company-first, Apollo = enrichment only).
 *
 * THE DAILY LOOP (cron, weekdays 7:35 — runs before the 7:45 founder queue):
 *   --harvest   Claude + web_search sweeps the signal feeds (NYC funding news /
 *               AlleyWatch, first-People-hire postings on ATS boards, growth
 *               chatter) and writes the day's candidates JSON. Same pattern the
 *               founder queue uses for research; no Apollo, no LinkedIn.
 *   (pipeline)  per candidate: resolve domain (free) → org-enrich (1 credit) →
 *               QUALIFY (60-280 heads crossing ~100 · tech-ish · NYC · not
 *               client/known) → BUYER ID via the BROAD wellness-owner cluster
 *               (People → Workplace/Office → CoS/EA → COO/CEO; never one title)
 *               → enrich buyer (1 credit) + MV → outreach_contacts
 *               (source='founder-personal', channel='personal').
 *   --queue     each landed buyer is POSTed straight to founder-queue-background
 *               with its VERIFIED why-now trigger + alternating help/convo CTA —
 *               so tech-exec cards land in Will's Slack with the broker cards.
 *   --report    the brain hook: replies per trigger_type (joins founder_note
 *               drafts × outreach_replies) — appended to the Monday improve-loop
 *               so feeds get pruned by data.
 *
 * Dry by default (0 credits). --confirm spends. Ledger: prime_targets.json.
 *   node scripts/tech-scout.mjs --harvest --confirm --max-orgs 12 --max-buyers 3 --queue
 *   node scripts/tech-scout.mjs --candidates tech_scout_candidates.json --confirm
 *   node scripts/tech-scout.mjs --report
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { verifyEmail } from './lib/bounceban.mjs';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const LEDGER = `${ROOT}/prime_targets.json`;
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const CONFIRM = has('--confirm');
const HARVEST = has('--harvest');
const QUEUE = has('--queue');
const REPORT = has('--report');
const CAND_PATH = val('--candidates', `${ROOT}/tech_scout_candidates.json`);
const MAX_ORGS = parseInt(val('--max-orgs', '30'), 10) || 30;
const MAX_BUYERS = parseInt(val('--max-buyers', '5'), 10) || 5;
const QUEUE_URL = 'https://proposals.getshortcut.co/.netlify/functions/founder-queue-background';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const APOLLO = process.env.APOLLO_API_KEY || envKey('APOLLO_API_KEY');
const MV = process.env.MILLIONVERIFIER_API_KEY || envKey('MILLIONVERIFIER_API_KEY');
const BB = process.env.BOUNCEBAN_API_KEY || envKey('BOUNCEBAN_API_KEY');
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');
const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanDom = (d) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim() || null;

async function apollo(path, bodyObj) {
  for (let a = 0; ; a += 1) {
    const r = await fetch(`https://api.apollo.io/api/v1/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO },
      body: JSON.stringify(bodyObj),
    });
    if (r.status === 429 && a < 5) { await sleep(2000 * 2 ** a); continue; }
    if (!r.ok) throw new Error(`${path} ${r.status}`);
    return r.json();
  }
}
const mvVerify = async (email) => { try { const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${MV}&email=${encodeURIComponent(email)}&timeout=20`); const j = await r.json(); return (j.result || 'unknown').toLowerCase(); } catch { return 'unknown'; } };
async function readAll(t, c) { const o = []; for (let f = 0; ; f += 1000) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }

// tech-ish gate — same coarse cluster as find-founder-targets, plus keyword rescue
const TECH_INDUSTRY_RE = /software|internet|information technology|computer|fintech|financial services|biotech|artificial intelligence|saas|e-?learning|health.*tech|marketing & advertising/i;
const TECH_KEYWORD_RE = /\b(saas|software|platform|api|ai|machine learning|fintech|developer|cloud|data|app)\b/i;

// The BROAD buyer cluster, ranked (Will 2026-07-06: company-first, never one title).
// Each tier: regex + rank. First match wins the contact-pick; lower rank = better.
const BUYER_TIERS = [
  { rank: 1, label: 'people-owner', re: /\b(chief people|chro|head of people|vp,? (of )?people|people operations|people ops|director,? (of )?people|head of hr|vp,? (of )?hr|human resources (director|lead|manager)|head of talent)\b/i },
  { rank: 2, label: 'workplace-owner', re: /\b(workplace experience|employee experience|office (manager|operations|experience)|workplace (manager|operations|lead)|facilities (manager|director))\b/i },
  { rank: 3, label: 'cos-ea', re: /\b(chief of staff|executive assistant|ea to)\b/i },
  { rank: 4, label: 'exec-door', re: /\b(chief operating officer|coo|chief executive officer|ceo|co-?founder|founder)\b/i },
];
const buyerTier = (title) => { for (const t of BUYER_TIERS) if (t.re.test(title || '')) return t; return null; };
const BUYER_SEARCH_TITLES = [
  'Head of People', 'VP of People', 'Chief People Officer', 'People Operations', 'Director of People', 'Head of HR', 'Head of Talent',
  'Workplace Experience', 'Employee Experience', 'Office Manager', 'Workplace Operations',
  'Chief of Staff', 'Executive Assistant',
  'Chief Operating Officer', 'COO', 'Chief Executive Officer', 'CEO', 'Founder', 'Co-Founder',
];

// ---- HARVEST: Claude + web_search sweeps the signal feeds and reports the day's
// candidates via a forced tool call (same pattern as the founder queue's research).
const HARVEST_SCHEMA = {
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
async function harvestCandidates() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const today = new Date().toISOString().slice(0, 10);
  const sys = `You are the daily signal-collection pass for a corporate-wellness founder's NYC outreach. Today is ${today}. Find CANDIDATE COMPANIES that plausibly just crossed (or are about to cross) ~100 employees in the New York area, each with a concrete recent WHY-NOW trigger. Work three feeds with web search: (1) RECENT NYC FUNDING — AlleyWatch daily/weekly funding reports and news from the last ~10 days; Series A/B ~$10-60M at companies plausibly 50-250 employees; skip seed-stage tiny companies and unicorns. (2) FIRST-PEOPLE-HIRE POSTINGS — currently-open Head of People / People Operations roles at NYC companies (site:boards.greenhouse.io / jobs.lever.co / jobs.ashbyhq.com searches). (3) GROWTH CHATTER — only companies with indicated size 50-250. RULES: real companies only, every entry needs a live source URL, no duplicates. A physical NYC office is IDEAL (it fits the on-site play), so prefer it, but do NOT discard a strong fully-remote or distributed company: Shortcut serves distributed teams with a VIRTUAL track (mindfulness, sound baths, nutrition coaching), so a remote company is a real opportunity, not a disqualifier. When a company is fully remote or heavily distributed, still include it and set remote=true so downstream leads with the virtual angle. Bias hard toward companies plainly in the 60-250 headcount band and plainly NEW-YORK-based — off-band (too small/too big) and wrong-city entries waste an Apollo enrich credit each (2026-07-07: Warp 51pp, Prosper 13pp, an Italian utility named Hera, and a Texas company named Crosby all got enriched and disqualified). When a company name is ambiguous, include the DOMAIN so it resolves to the right entity. Aim for 25-35 fresh, on-band entries so the pipeline can land 5 qualified buyers. Report via report_candidates exactly once when done.`;
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929', max_tokens: 8000, temperature: 0.2,
    system: sys,
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
// (domain → trigger_type) with founder-personal contacts, Will's sends, replies.
async function runReport() {
  const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {};
  const contacts = (await readAll('outreach_contacts', 'email, email_domain, source')).filter((r) => r.source === 'founder-personal');
  const byDomain = new Map(Object.entries(ledger));
  const sends = await readAll('outreach_sends', 'email, sender_email');
  const sentSet = new Set(sends.filter((s) => lc(s.sender_email) === 'will@getshortcut.co').map((s) => lc(s.email)));
  const replies = await readAll('outreach_replies', 'email, reply_sentiment');
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
  console.log('FOUNDER TECH LANE — conversion by trigger type (feeds pruned by data, not opinion)');
  for (const [t, s] of Object.entries(stats)) console.log(`  ${t.padEnd(16)} leads ${String(s.leads).padStart(3)} · sent ${String(s.sent).padStart(3)} · replied ${s.replied} · positive ${s.positive}`);
  if (!Object.keys(stats).length) console.log('  (no founder-personal leads yet)');
}

(async () => {
  if (REPORT) { await runReport(); return; }
  if (!APOLLO) { console.error('MISSING APOLLO_API_KEY'); process.exit(2); }
  if (HARVEST) {
    if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY for --harvest'); process.exit(2); }
    log('HARVEST — sweeping signal feeds via web search…');
    const fresh = await harvestCandidates();
    log(`harvest returned ${fresh.length} candidates`);
    if (fresh.length) writeFileSync(CAND_PATH, JSON.stringify(fresh, null, 1));
    else if (!existsSync(CAND_PATH)) { console.error('harvest empty and no candidates file — stopping'); process.exit(1); }
  }
  if (!existsSync(CAND_PATH)) { console.error(`no candidates file at ${CAND_PATH}`); process.exit(2); }
  const candidates = JSON.parse(readFileSync(CAND_PATH, 'utf8'));
  const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {};
  log(`TECH SCOUT — ${candidates.length} candidates · ${CONFIRM ? 'LIVE (spends credits)' : 'DRY'} · max-orgs ${MAX_ORGS}`);

  // SELF-HEAL (Will 2026-07-06: never lose a lead to a failed draft): any buyer
  // this ledger landed whose founder note never materialized gets re-queued.
  if (CONFIRM && QUEUE) {
    const landedBuyers = Object.values(ledger).filter((e) => e.buyer?.email && (e.status === 'buyer_landed' || e.queued));
    if (landedBuyers.length) {
      const { data: drafted } = await sb.from('saved_drafts').select('recipient_email').eq('target_kind', 'founder_note');
      const hasDraft = new Set((drafted || []).map((d) => lc(d.recipient_email)));
      let healed = 0;
      for (const e of landedBuyers) {
        const em = lc(e.buyer.email);
        if (hasDraft.has(em)) continue;
        e.queue_attempts = (e.queue_attempts || 1) + 1;
        // 3 strikes: a lead whose draft invocation keeps dying (Uniswap, Jul 6:
        // three silent fn deaths) stops consuming queue slots; Will sees it here.
        if (e.queue_attempts > 3) {
          if (e.status !== 'buyer_landed_draft_failed') { e.status = 'buyer_landed_draft_failed'; log(`  self-heal: GIVING UP on ${em} (${e.company}) after ${e.queue_attempts - 1} attempts — draft invocations keep dying`); }
          continue;
        }
        healed += 1;
        const cta = healed % 2 === 1 ? 'help' : 'convo';
        const qr = await fetch(QUEUE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: 1, only: em, audience: 'tech-execs', cta, trigger: e.trigger, remote: e.remote === true }) });
        log(`  self-heal: re-queued ${em} (${e.company}) attempt ${e.queue_attempts} → HTTP ${qr.status}`);
        await sleep(500);
      }
      if (!healed) log('  self-heal: all landed buyers have drafts (or are capped).');
      writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
    }
  }

  // known-universe guards
  const knownEmails = new Set((await readAll('outreach_contacts', 'email')).map((r) => lc(r.email)));
  const knownCompanies = new Set((await readAll('outreach_contacts', 'email_domain, source'))
    .filter((r) => r.source === 'founder-personal').map((r) => lc(r.email_domain)));
  const supp = new Set((await readAll('crm_suppression', 'email')).map((r) => lc(r.email)));
  const clientDomains = new Set((await readAll('crm_companies', 'primary_domain').catch(() => []))
    .map((r) => cleanDom(r.primary_domain)).filter(Boolean));

  const results = []; let orgCredits = 0; let personCredits = 0; let buyersLanded = 0;
  for (const cand of candidates) {
    if (orgCredits >= MAX_ORGS) { log('org-credit cap reached — stopping'); break; }
    const name = String(cand.company || '').trim();
    if (!name) continue;
    let domain = cleanDom(cand.domain);
    try {
      // 1. resolve domain (free search)
      if (!domain) {
        const s = await apollo('mixed_companies/search', { q_organization_name: name, page: 1, per_page: 3 });
        const hit = (s.organizations || s.accounts || [])[0];
        domain = cleanDom(hit?.primary_domain || hit?.website_url);
        if (!domain) { results.push({ company: name, status: 'no_domain' }); continue; }
      }
      if (ledger[domain]?.status === 'qualified') { results.push({ company: name, domain, status: 'already_in_ledger' }); continue; }
      if (clientDomains.has(domain)) { results.push({ company: name, domain, status: 'is_client' }); continue; }
      if (knownCompanies.has(domain)) { results.push({ company: name, domain, status: 'already_targeted' }); continue; }
      if (!CONFIRM) { results.push({ company: name, domain, status: 'would_enrich', trigger: cand.trigger }); continue; }

      // 2. org enrich (1 credit)
      const e = await apollo(`organizations/enrich?domain=${encodeURIComponent(domain)}`, {}).catch(() => null);
      orgCredits += 1;
      const o = e?.organization;
      if (!o) { results.push({ company: name, domain, status: 'org_enrich_miss' }); continue; }
      const size = o.estimated_num_employees || null;
      const industry = lc(o.industry) || '';
      const kw = (o.keywords || []).join(' ');
      const city = lc([o.city, o.state].filter(Boolean).join(', '));
      const growth12 = o.organization_headcount_twelve_month_growth ?? null;

      // 3. qualify — target companies that have CROSSED ~100 employees (Will
      // 2026-07-07: the rule is at-least-100, not 60+). Floor is 90 not 100 as a
      // buffer for Apollo's 1-3mo headcount lag/undercount (a co Apollo reports
      // at 90 is often really 100+). Ceiling 280 keeps it to "emerging".
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
        remote: cand.remote === true, // fully-remote company → note leads the virtual track
        scouted_at: new Date().toISOString(),
      };
      ledger[domain] = entry;
      if (!verdict) { results.push(entry); continue; }
      if (buyersLanded >= MAX_BUYERS) { entry.status = 'qualified_buyer_deferred'; results.push(entry); continue; }

      // 4. buyer ID (free search, broad cluster)
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

      // 5. enrich the person (1 credit) + gates
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
      if (MV) { mv = await mvVerify(email); if (mv === 'invalid' || mv === 'disposable') { entry.status = 'buyer_mv_invalid'; results.push(entry); continue; } }
      // catch_all/unknown -> BounceBan INLINE (same waterfall as verify-leads), so
      // the buyer is SENDABLE today instead of parked catch_all until Monday's
      // cron. This is the 2026-07-07 fix: two catch_all buyers landed but the
      // queue's sendable filter (mv=ok OR bounceban=deliverable) silently rejected
      // them, so no draft + no warning. Now they're resolved before we queue.
      if (BB && (mv === 'catch_all' || mv === 'unknown' || !mv)) {
        const res = await verifyEmail(email, { apiKey: BB });
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
      // A parked (not-yet-sendable) buyer is landed but NOT queued and does NOT
      // count toward MAX_BUYERS — otherwise an unsendable lead would eat a queue
      // slot and produce no card (the silent-drop we just fixed). Monday's
      // verify-leads pass can still resolve it later.
      if (!sendable) { entry.status = 'buyer_parked_unverified'; log(`  parked (not sendable: mv=${mv} bb=${bb || 'n/a'}) ${email}`); results.push(entry); continue; }
      entry.status = 'buyer_landed';
      buyersLanded += 1;
      // --queue: feed the founder queue immediately with the VERIFIED trigger
      // (help/convo CTA alternates per landed buyer, same A/B as brokers)
      if (QUEUE) {
        const cta = (buyersLanded % 2 === 1) ? 'help' : 'convo';
        const qr = await fetch(QUEUE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: 1, only: email, audience: 'tech-execs', cta, trigger: cand.trigger, remote: cand.remote === true }) });
        entry.queued = qr.status === 202 || qr.status === 200;
        log(`  queued ${email} (cta=${cta}, mv=${mv} bb=${bb || 'n/a'}) → HTTP ${qr.status}`);
      }
      results.push(entry);
      await sleep(150);
    } catch (err) {
      results.push({ company: name, domain, status: `error: ${err.message}` });
    }
  }

  // TOP-UP from standing inventory (Will 2026-07-07): the fresh web-harvest is
  // trigger-first and thin some days, but we already hold ~95 enriched, sendable,
  // undrafted founder-personal execs (the static Apollo pull). If the harvest
  // didn't land the full MAX_BUYERS, draw the remainder from that pool so the
  // daily band still hits target. The founder-queue's tech-exec path already
  // selects source=founder-personal, one-per-company, excluding drafted/
  // contacted/suppressed — so one POST with max=deficit tops us up (trigger-less,
  // but the composer's research pass still finds a live hook when one exists).
  if (QUEUE && CONFIRM && buyersLanded < MAX_BUYERS) {
    const deficit = MAX_BUYERS - buyersLanded;
    const qr = await fetch(QUEUE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audience: 'tech-execs', max: deficit }) });
    log(`TOP-UP: harvest landed ${buyersLanded}/${MAX_BUYERS} sendable buyers; requested ${deficit} more from the standing founder-personal pool → HTTP ${qr.status}`);
    results.push({ company: `[top-up ${deficit} from standing pool]`, status: `topup_requested_${qr.status}` });
  }

  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  log(`\n================ SCOUT DIGEST ================`);
  for (const r of results) {
    const line = [r.status.toUpperCase().padEnd(24), (r.company || '').padEnd(28), r.size ? `${r.size}pp` : '', r.crossed_recently ? 'CROSSED<12mo' : '', r.buyer ? `→ ${r.buyer.name} (${r.buyer.tier}: ${r.buyer.title})` : '', r.why_not || ''].filter(Boolean).join(' ');
    console.log('  ' + line);
  }
  const landed = results.filter((r) => r.status === 'buyer_landed');
  log(`candidates ${candidates.length} · org credits ${orgCredits} · person credits ${personCredits} · qualified ${results.filter((r) => String(r.status).startsWith('qualified') || r.status === 'buyer_landed' || String(r.status).startsWith('buyer_')).length} · buyers landed ${landed.length}`);
  log(`ledger: ${LEDGER}`);
  if (landed.length) log(`next: node scripts/founder-queue.mjs --confirm --audience tech-execs --only <email> --trigger "<why-now>" per lead (trigger is in the ledger).`);
})().catch((e) => { console.error('SCOUT_ERROR:', e.message); process.exit(1); });
