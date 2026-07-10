/**
 * generate-plays (shared core) — produces the three ranked deliverables the
 * /sales-intelligence page reads, read-only on source data, every Play B row
 * passed through the pre-flight gate:
 *   Play A  — active clients we under-serve that are big multi-office cos
 *   Play B  — net-new cold prospects that look like our real winners
 *   Reconciliation — closed vs replied-not-closed vs never-reached, by title/size
 *
 * Reused by the CLI (scripts/generate-plays.mjs, writeCsv=true) and the Netlify
 * scheduled function (writeCsv=false — the web reads the crm_play_* tables, and
 * Netlify has no repo-root CSV target). Uses the canonical lib/preflight.js;
 * its `recommendation` logic matches scripts/preflight.mjs (the only field used
 * here), and generate-plays passes both email+domain so there is no drift.
 * NO Anthropic.
 */
import { preflight } from './preflight.js';
import { assigneeForGmail, repFromCampaignName } from './assignee.js';
import { cleanCompany } from './clean-company.js';

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const sizeNum = (n) => parseInt(String(n || '').replace(/[^\d]/g, ''), 10) || 0;
const titleCat = (t) => {
  const s = (t || '').toLowerCase();
  if (/hr|people|talent|human resources/.test(s)) return 'HR/People';
  if (/office (manager|coordinator|admin)/.test(s)) return 'OfficeMgr';
  if (/employee experience/.test(s)) return 'EmployeeExp';
  if (/workplace/.test(s)) return 'Workplace';
  if (/facilit/.test(s)) return 'Facilities';
  return t ? 'Other' : null;
};
const GOOD = new Set(['HR/People', 'OfficeMgr', 'EmployeeExp']);
const csv = (rows) => rows.map((r) => r.map((c) => {
  const v = c == null ? '' : String(c);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}).join(',')).join('\n');

/**
 * @param {object}   o
 * @param {object}   o.sb        Supabase service-role client
 * @param {boolean}  [o.writeCsv] also write play_a/b + reconciliation CSVs (CLI only)
 * @param {string}   [o.csvDir]  where to write the CSVs (required if writeCsv)
 * @param {string}   [o.host]    heartbeat host tag
 * @param {function} [o.log]
 * @returns {Promise<object>} counts
 */
export async function generatePlays({ sb, writeCsv = false, csvDir = null, host = null, log = console.log }) {
  const readAll = async (t, cols, mod) => {
    const out = [];
    for (let f = 0; ; f += 1000) {
      let q = sb.from(t).select(cols).range(f, f + 999);
      if (mod) q = mod(q);
      const { data, error } = await q;
      if (error) throw new Error(`${t}: ${error.message}`);
      out.push(...data); if (data.length < 1000) break;
    }
    return out;
  };
  const replaceAll = async (table, rows) => {
    for (let a = 0; ; a += 1) {
      const { error } = await sb.from(table).delete().not('id', 'is', null);
      if (!error) break;
      if (a >= 4) throw new Error(`clear ${table}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (a + 1)));
    }
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      for (let a = 0; ; a += 1) {
        try {
          const { error } = await sb.from(table).insert(batch);
          if (error) throw new Error(error.message);
          break;
        } catch (e) {
          if (a >= 4) throw new Error(`insert ${table} after ${a} tries: ${e.message}`);
          await new Promise((r) => setTimeout(r, 1000 * 2 ** (a + 1)));
        }
      }
    }
  };

  const companies = await readAll('crm_companies',
    'id, canonical_key, display_name, trajectory, activity_status, completed_events, last_event_at, fit_score, fit_breakdown, ext_industry, ext_employee_size, contact_domains, contacts, is_internal, special_handling, demoed_not_closed');
  const sites = await readAll('crm_sites', 'company_id, city');
  const persons = await readAll('apollo_person_cache', 'email, email_domain, company_headcount, industry, linkedin_url, location');
  const ocs = await readAll('outreach_contacts', 'email, name, title, company, email_domain, crm_company_id, linkedin_url, location, source, mv_status, bounceban_status, in_campaign, smartlead_campaign_id, campaign_memberships');

  const sendsAll = await readAll('outreach_sends', 'email, sent_time, reply_time, sender_email, campaign_id');
  const campaignsAll = await readAll('outreach_campaigns', 'campaign_id, name');
  const campaignNameById = new Map(campaignsAll.map((c) => [String(c.campaign_id), c.name || null]));
  const sendByEmail = new Map();
  for (const s of sendsAll) {
    const e = lc(s.email); if (!e) continue;
    const cur = sendByEmail.get(e) || { count: 0, last: null, replied: false, latest_sender_email: null, latest_campaign_id: null };
    cur.count += 1;
    if (s.sent_time && (!cur.last || s.sent_time > cur.last)) {
      cur.last = s.sent_time;
      cur.latest_sender_email = s.sender_email || null;
      cur.latest_campaign_id = s.campaign_id ? String(s.campaign_id) : null;
    }
    if (s.reply_time) cur.replied = true;
    sendByEmail.set(e, cur);
  }
  const lastSenderByEmail = new Map();
  for (const [email, agg] of sendByEmail.entries()) {
    let name = null; const attribEmail = agg.latest_sender_email || null;
    if (attribEmail) name = assigneeForGmail(attribEmail);
    if (!name && agg.latest_campaign_id) name = repFromCampaignName(campaignNameById.get(agg.latest_campaign_id));
    if (name || attribEmail) lastSenderByEmail.set(email, { name, email: attribEmail });
  }
  const repliesAll = await readAll('outreach_replies', 'email, reply_sentiment, reply_date');
  const replyByEmail = new Map();
  for (const r of repliesAll) {
    const e = lc(r.email); if (!e) continue;
    const cur = replyByEmail.get(e);
    if (!cur || (r.reply_sentiment && !cur.sentiment)) replyByEmail.set(e, { sentiment: r.reply_sentiment || cur?.sentiment || null });
  }

  const apolloByEmail = new Map();
  const apolloByDom = new Map();
  for (const p of persons) {
    const em = lc(p.email);
    if (em && (p.linkedin_url || p.location) && !apolloByEmail.has(em)) apolloByEmail.set(em, { linkedin: p.linkedin_url || null, location: p.location || null });
    const d = lc(p.email_domain)?.replace(/^www\./, '');
    if (d && (p.linkedin_url || p.location) && !apolloByDom.has(d)) apolloByDom.set(d, { linkedin: p.linkedin_url || null, location: p.location || null });
  }

  const siteCount = new Map();
  const siteCities = new Map();
  for (const s of sites) {
    siteCount.set(s.company_id, (siteCount.get(s.company_id) || 0) + 1);
    if (s.city) { if (!siteCities.has(s.company_id)) siteCities.set(s.company_id, new Set()); siteCities.get(s.company_id).add(s.city); }
  }
  const byDom = new Map();
  for (const p of persons) {
    const d = p.email_domain; if (!d) continue;
    if (!byDom.has(d)) byDom.set(d, { ind: {}, hc: [] });
    const e = byDom.get(d);
    if (p.industry) e.ind[p.industry] = (e.ind[p.industry] || 0) + 1;
    const h = sizeNum(p.company_headcount); if (h) e.hc.push(h);
  }
  const domFirmo = (domains) => {
    for (const d of domains || []) {
      const e = byDom.get(lc(d)?.replace(/^www\./, ''));
      if (e) return { ind: Object.entries(e.ind).sort((a, b) => b[1] - a[1])[0]?.[0] || null, hc: e.hc.length ? e.hc.sort((a, b) => a - b)[e.hc.length >> 1] : 0 };
    }
    return { ind: null, hc: 0 };
  };
  const firmoOf = (co) => {
    if (co.ext_industry || co.ext_employee_size) return { ind: co.ext_industry, hc: sizeNum(co.ext_employee_size) };
    return domFirmo(co.contact_domains);
  };

  const real = companies.filter((c) => !c.is_internal && !c.special_handling);
  const winnerCos = real.filter((c) => c.fit_score >= 70 && !c.demoed_not_closed && c.completed_events > 0);
  const winInd = {};
  const winHC = [];
  for (const c of winnerCos) { const f = firmoOf(c); if (f.ind) winInd[f.ind] = (winInd[f.ind] || 0) + 1; if (f.hc > 0) winHC.push(f.hc); }
  winHC.sort((a, b) => a - b);
  const topInd = new Set(Object.entries(winInd).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k));
  const pct = (p) => (winHC.length ? winHC[Math.min(winHC.length - 1, Math.floor(p * winHC.length))] : 0);
  const P10 = pct(0.10); const P25 = pct(0.25); const P75 = pct(0.75); const P90 = pct(0.90);
  const sizeScore = (hc) => {
    if (!hc) return 8;
    if (hc >= P25 && hc <= P75) return 30;
    if (hc >= P10 && hc <= P90) return 18;
    if (hc < P10) return 8;
    return 4;
  };

  // ---------- PLAY A ----------
  const playA = [];
  for (const c of real) {
    if (!c.completed_events) continue;
    if (c.activity_status !== 'active' && c.activity_status !== 'lapsed') continue;
    const ourSites = siteCount.get(c.id) || 0;
    const f = firmoOf(c);
    if (f.hc < 500) continue;
    if (ourSites > Math.max(2, Math.ceil(f.hc / 4000))) continue;
    const headroom = Math.round(f.hc / Math.max(1, ourSites));
    const monthsSince = c.last_event_at
      ? Math.max(0, Math.floor((Date.now() - new Date(c.last_event_at).getTime()) / (30 * 86400000)))
      : null;
    const playStatus = monthsSince != null && monthsSince > 6 ? 're_engage' : 'expand';
    playA.push({
      company_id: c.id, company: c.display_name, fit: c.fit_score, trajectory: c.trajectory,
      our_sites: ourSites, cities: [...(siteCities.get(c.id) || [])].join(' / '),
      emp: f.hc, industry: f.ind || c.ext_industry || '?',
      last_event_at: c.last_event_at || null, months_since_event: monthsSince, play_status: playStatus,
      score: Math.round(c.fit_score * 0.5 + Math.min(50, headroom / 100)),
    });
  }
  playA.sort((a, b) => b.score - a.score);

  // ---------- PLAY B ----------
  const prospects = new Map();
  for (const o of ocs) {
    if (o.crm_company_id) continue;
    if (/broker/i.test(o.source || '')) continue;
    const dom = lc(o.email_domain); if (!dom) continue;
    const cat = titleCat(o.title);
    const cur = prospects.get(dom);
    const sendable = o.mv_status === 'ok' || o.bounceban_status === 'deliverable';
    const titleRank = cat && GOOD.has(cat) ? 2 : cat ? 1 : 0;
    const rank = (sendable ? 10 : 0) + titleRank;
    if (!cur || rank > cur._rank) prospects.set(dom, { domain: dom, company: o.company, email: o.email, name: o.name, title: o.title, linkedin: o.linkedin_url || null, location: o.location || null, source: o.source || null, mv_status: o.mv_status || null, bounceban_status: o.bounceban_status || null, in_campaign: o.in_campaign || false, smartlead_campaign_id: o.smartlead_campaign_id || null, campaign_memberships: o.campaign_memberships || null, cat, _rank: rank });
  }
  const playB = [];
  for (const p of prospects.values()) {
    const segment = /real ?estate/i.test(p.source || '') ? 'realestate'
      : (/leadgen-law|sheet:law|\blaw\b/i.test(p.source || '')) ? 'law' : 'general';
    const vertical = segment !== 'general';
    const e = byDom.get(p.domain);
    if (!e && !vertical) continue;
    const byDomInd = e ? (Object.entries(e.ind).sort((a, b) => b[1] - a[1])[0]?.[0] || null) : null;
    const hc = e && e.hc.length ? e.hc.sort((a, b) => a - b)[e.hc.length >> 1] : 0;
    const ind = segment === 'realestate' ? 'real estate' : segment === 'law' ? 'law practice' : byDomInd;
    let s = 0;
    if (vertical) s = 60;
    else { if (ind && topInd.has(ind)) s += 45; s += sizeScore(hc); if (p.cat && GOOD.has(p.cat)) s += 25; else if (p.cat) s += 8; }
    if (s < 40) continue;
    const gate = await preflight(sb, { email: p.email, domain: p.domain });
    if (gate.recommendation === 'skip_suppressed' || gate.recommendation === 'skip_already_client'
      || gate.recommendation === 'caution_recently_contacted') continue;
    const apoF = apolloByEmail.get(lc(p.email)) || apolloByDom.get(p.domain) || {};
    const em = lc(p.email);
    const snd = em ? sendByEmail.get(em) : null;
    const rep = em ? replyByEmail.get(em) : null;
    const isLeadgen = (p.source || '').includes('apollo-leadgen');
    let engagementState;
    if (snd && (snd.replied || rep)) engagementState = 'replied';
    else if (snd) engagementState = 'no_reply';
    else if (isLeadgen) engagementState = 'net_new';
    else engagementState = 're_engage';
    const ls = em ? lastSenderByEmail.get(em) : null;
    playB.push({
      company: p.company || p.domain, domain: p.domain, score: s, industry: ind, emp: hc,
      contact: p.name, title: p.title, title_cat: p.cat || '-',
      email: p.email || null,
      linkedin: p.linkedin || apoF.linkedin || null,
      location: p.location || apoF.location || null,
      engagement_state: engagementState,
      touches: snd ? snd.count : 0,
      last_contacted_at: snd ? snd.last : null,
      reply_sentiment: rep ? rep.sentiment : null,
      mv_status: p.mv_status || null,
      bounceban_status: p.bounceban_status || null,
      in_campaign: p.in_campaign || false,
      campaign_memberships: p.campaign_memberships || null,
      smartlead_campaign_id: p.smartlead_campaign_id || null,
      is_leadgen: isLeadgen,
      last_sender_name: ls?.name || null,
      last_sender_email: ls?.email || null,
    });
  }
  const stateRank = { replied: 0, no_reply: 1, net_new: 2, re_engage: 3 };
  playB.sort((a, b) => (stateRank[a.engagement_state] - stateRank[b.engagement_state]) || (b.score - a.score));

  // ---------- RECONCILIATION ----------
  const replies = await readAll('outreach_replies', 'email, reply_sentiment');
  const repByEmail = new Map(replies.map((r) => [r.email, r.reply_sentiment]));
  const recon = {};
  const bump = (bucket, cat) => { recon[bucket] = recon[bucket] || {}; recon[bucket][cat || 'NoTitle'] = (recon[bucket][cat || 'NoTitle'] || 0) + 1; };
  const clientDomains = new Set();
  for (const c of real) if (c.completed_events > 0) for (const d of c.contact_domains || []) clientDomains.add(lc(d));
  for (const o of ocs) {
    const cat = titleCat(o.title);
    const replied = repByEmail.has(o.email);
    const isClient = o.crm_company_id || (o.email_domain && clientDomains.has(lc(o.email_domain)));
    if (isClient) bump('closed_or_client', cat);
    else if (replied) bump('replied_no_close', cat);
    else bump('never_reached_or_no_reply', cat);
  }

  // ---------- optional CSVs (CLI only) ----------
  if (writeCsv && csvDir) {
    const { writeFileSync } = await import('fs');
    writeFileSync(`${csvDir}/play_a.csv`, csv([['rank', 'company', 'fit_score', 'trajectory', 'our_sites', 'cities_we_serve', 'company_employees', 'industry', 'expansion_score'],
      ...playA.map((r, i) => [i + 1, r.company, r.fit, r.trajectory, r.our_sites, r.cities, r.emp, r.industry, r.score])]));
    writeFileSync(`${csvDir}/play_b.csv`, csv([['rank', 'company', 'domain', 'lookalike_score', 'industry', 'employees', 'suggested_contact', 'title', 'title_category'],
      ...playB.map((r, i) => [i + 1, r.company, r.domain, r.score, r.industry, r.emp, r.contact, r.title, r.title_cat])]));
    writeFileSync(`${csvDir}/reconciliation.csv`, csv([['bucket', 'title_category', 'count'],
      ...Object.entries(recon).flatMap(([b, m]) => Object.entries(m).map(([t, n]) => [b, t, n]))]));
  }

  // ---------- persist for the /sales-intelligence page ----------
  const genAt = new Date().toISOString();
  await replaceAll('crm_play_a', playA.map((r, i) => ({
    rank: i + 1, play_score: r.score, fit_score: r.fit, company_id: r.company_id,
    company_name: cleanCompany(r.company), employees: String(r.emp), industry: r.industry,
    sites_served: r.our_sites, sites_list: r.cities,
    last_event_at: r.last_event_at, months_since_event: r.months_since_event, play_status: r.play_status,
    generated_at: genAt,
  })));
  await replaceAll('crm_play_b', playB.map((r, i) => ({
    rank: i + 1, score: r.score, company_name: cleanCompany(String(r.company)), domain: r.domain,
    employees: String(r.emp), industry: r.industry, contact_name: r.contact,
    contact_title: r.title, title_category: r.title_cat,
    contact_email: r.email, contact_linkedin: r.linkedin, contact_location: r.location,
    engagement_state: r.engagement_state, touches: r.touches,
    last_contacted_at: r.last_contacted_at, reply_sentiment: r.reply_sentiment,
    mv_status: r.mv_status || null,
    bounceban_status: r.bounceban_status || null,
    in_campaign: r.in_campaign || false,
    campaign_memberships: r.campaign_memberships || null,
    smartlead_campaign_id: r.smartlead_campaign_id || null,
    is_leadgen: r.is_leadgen,
    last_sender_name: r.last_sender_name, last_sender_email: r.last_sender_email,
    generated_at: genAt,
  })));
  await replaceAll('crm_reconciliation', Object.entries(recon).map(([bucket, m]) => ({
    bucket, total: Object.values(m).reduce((x, y) => x + y, 0), title_breakdown: m, generated_at: genAt,
  })));
  log(`Persisted to Supabase (crm_play_a/b/reconciliation) @ ${genAt} — A=${playA.length} B=${playB.length}`);

  if (host) await stampHeartbeatSafe(sb, host, log);
  return { play_a: playA.length, play_b: playB.length, recon_buckets: Object.keys(recon).length };
}

// stamp is imported lazily so a heartbeat failure can never break the run
async function stampHeartbeatSafe(sb, host, log) {
  try {
    const { stampHeartbeat } = await import('./heartbeat.js');
    await stampHeartbeat(sb, 'generate-plays', { host });
  } catch (e) { log(`heartbeat warn: ${e.message}`); }
}
