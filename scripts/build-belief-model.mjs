/**
 * build-belief-model.mjs — the cold-campaign brain's FOUNDATION.
 *
 * Read-only. Turns real send/reply history into the belief state the loop
 * updates against: for every face of the customer model it computes the
 * measured reply rate WITH its sample size and a Wilson 95% lower bound, so
 * a 20% rate on 9 sends never outranks a 12% rate on 900. The Wilson lower
 * bound is the skeptic's math baked in — small samples sink on their own.
 *
 * Faces computed from data:
 *   WHO      — title_category, size_band, industry
 *   WHERE    — location hub, sending channel (cold vs personal)
 *   SOLUTION — per-campaign reply rate (which offer/message won),
 *              per-sender reply rate (the sender-vs-offer confound check)
 *   cross    — title_category x location hub (the grid, cells with n >= MIN_CROSS)
 *
 * PROBLEM face is left as an explicit hook: it lives in message copy, not in
 * send/reply rows. Populate solution.variants + problem from the messaging
 * research worktree once it lands.
 *
 * Writes belief_model.json (machine) + belief_model.md (the weekly read) to
 * repo root. Prints a ranked summary. No writes to Supabase, no Apollo spend.
 *
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/build-belief-model.mjs [--channel cold|personal|all] [--min-n 15]
 */

import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { assigneeForGmail, repFromCampaignName } from '../netlify/functions/lib/assignee.js';

const ROOT = '/Users/willnewton/Documents/GitHub/calculator6';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV'); process.exit(2); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);

const argVal = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const CHANNEL = argVal('channel', 'all');        // cold | personal | all
const MIN_N = parseInt(argVal('min-n', '15'), 10); // console display floor (JSON keeps everything)
const MIN_CROSS = 25;                              // sample floor for a cross-cell to display

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const sizeNum = (n) => parseInt(String(n || '').replace(/[^\d]/g, ''), 10) || 0;

// Same title taxonomy as score-companies.mjs / generate-plays.mjs — keep in sync.
const titleCat = (t) => {
  const s = (t || '').toLowerCase();
  if (/hr|people|talent|human resources/.test(s)) return 'HR/People';
  if (/office (manager|coordinator|admin)/.test(s)) return 'OfficeMgr';
  if (/employee experience/.test(s)) return 'EmployeeExp';
  if (/workplace/.test(s)) return 'Workplace';
  if (/facilit/.test(s)) return 'Facilities';
  return t ? 'Other' : 'NoTitle';
};
const sizeBand = (n) => {
  const x = sizeNum(n);
  if (!x) return 'unknown';
  if (x <= 50) return '1-50'; if (x <= 200) return '51-200'; if (x <= 500) return '201-500';
  if (x <= 1000) return '501-1000'; if (x <= 5000) return '1001-5000';
  if (x <= 10000) return '5001-10000'; return '10001+';
};
// Free-text location -> office hub. Order matters (NYC before generic state).
const hubOf = (loc) => {
  const s = (loc || '').toLowerCase();
  if (!s) return 'Unknown';
  if (/new york|nyc|manhattan|brooklyn|\bny\b/.test(s)) return 'New York';
  if (/san francisco|bay area|oakland|palo alto|san mateo|\bsf\b/.test(s)) return 'SF Bay';
  if (/los angeles|santa monica|\bla\b|culver city/.test(s)) return 'Los Angeles';
  if (/boston|cambridge/.test(s)) return 'Boston';
  if (/philadelphia|philly/.test(s)) return 'Philadelphia';
  if (/chicago/.test(s)) return 'Chicago';
  if (/miami|fort lauderdale/.test(s)) return 'Miami';
  if (/austin/.test(s)) return 'Austin';
  if (/seattle/.test(s)) return 'Seattle';
  if (/washington|d\.?c\.?\b/.test(s)) return 'Washington DC';
  if (/denver/.test(s)) return 'Denver';
  if (/atlanta/.test(s)) return 'Atlanta';
  return 'Other';
};
// Cold (Smartlead campaign) vs personal (rep Gmail) — inferred from campaign_id
// convention until an explicit `channel` column exists. Numeric id = Smartlead.
const channelOf = (campaignId) => {
  const c = String(campaignId || '');
  if (!c) return 'unknown';
  if (/gmail|personal|booth|workhuman-personal/i.test(c)) return 'personal';
  if (/^\d+$/.test(c) || /smartlead/i.test(c)) return 'cold';
  return 'other';
};

// Wilson score interval 95% lower bound — discounts small n automatically.
const wilsonLower = (pos, n, z = 1.96) => {
  if (!n) return 0;
  const p = pos / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (centre - margin) / d);
};
const confidence = (n) => (n >= 200 ? 'high' : n >= 50 ? 'medium' : n >= 15 ? 'low' : 'insufficient');

async function readAll(t, cols, mod) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    let q = sb.from(t).select(cols).range(f, f + 999);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

// A tally bucket accumulates sent / replied / positive for one belief value.
const bump = (map, key, replied, positive) => {
  if (key == null) return;
  const k = String(key);
  const cur = map.get(k) || { sent: 0, replied: 0, positive: 0 };
  cur.sent += 1; if (replied) cur.replied += 1; if (positive) cur.positive += 1;
  map.set(k, cur);
};
// Turn a tally map into ranked rows: reply rate, positive rate, Wilson lower
// bound (the honest floor), confidence. Sorted by lb95 so noise sinks.
const summarize = (map) => [...map.entries()].map(([value, c]) => ({
  value,
  sent: c.sent,
  replied: c.replied,
  positive: c.positive,
  reply_rate: +(c.replied / c.sent).toFixed(4),
  positive_rate: +(c.positive / c.sent).toFixed(4),
  reply_lb95: +wilsonLower(c.replied, c.sent).toFixed(4),
  confidence: confidence(c.sent),
})).sort((a, b) => b.reply_lb95 - a.reply_lb95 || b.sent - a.sent);

(async () => {
  log(`Building belief model — channel=${CHANNEL}, display floor n>=${MIN_N}`);

  // ---- load the joinable corpus ----
  const sends = await readAll('outreach_sends', 'email, sent_time, reply_time, sender_email, campaign_id');
  const replies = await readAll('outreach_replies', 'email, reply_sentiment');
  const contacts = await readAll('outreach_contacts', 'email, title, email_domain, location, source, crm_company_id');
  const persons = await readAll('apollo_person_cache', 'email_domain, company_headcount, industry');
  const companies = await readAll('crm_companies', 'id, ext_industry, ext_employee_size, contact_domains');
  const campaigns = await readAll('outreach_campaigns', 'campaign_id, name');
  const campaignName = new Map(campaigns.map((c) => [String(c.campaign_id), c.name || null]));

  // email -> best reply sentiment (positive wins over presence)
  const sentimentByEmail = new Map();
  for (const r of replies) {
    const e = lc(r.email); if (!e) continue;
    const cur = sentimentByEmail.get(e);
    if (!cur || (r.reply_sentiment && !cur)) sentimentByEmail.set(e, r.reply_sentiment || cur || null);
    else if (r.reply_sentiment === 'positive') sentimentByEmail.set(e, 'positive');
  }

  // domain -> firmographics fallback (modal industry, median headcount) from paid Apollo
  const byDom = new Map();
  for (const p of persons) {
    const d = lc(p.email_domain)?.replace(/^www\./, ''); if (!d) continue;
    if (!byDom.has(d)) byDom.set(d, { ind: {}, hc: [] });
    const e = byDom.get(d);
    if (p.industry) e.ind[p.industry] = (e.ind[p.industry] || 0) + 1;
    const h = sizeNum(p.company_headcount); if (h) e.hc.push(h);
  }
  const domFirmo = (dom) => {
    const e = byDom.get(dom); if (!e) return { ind: null, hc: 0 };
    return {
      ind: Object.entries(e.ind).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      hc: e.hc.length ? e.hc.sort((a, b) => a - b)[e.hc.length >> 1] : 0,
    };
  };
  // crm company firmographics keyed by id (preferred over domain fallback)
  const coById = new Map(companies.map((c) => [c.id, c]));

  // email -> contact attributes (title, domain, firmographics)
  const attrByEmail = new Map();
  for (const o of contacts) {
    const e = lc(o.email); if (!e) continue;
    const dom = lc(o.email_domain)?.replace(/^www\./, '') || (e.includes('@') ? e.split('@')[1] : null);
    let ind = null; let hc = 0;
    const co = o.crm_company_id ? coById.get(o.crm_company_id) : null;
    if (co && (co.ext_industry || co.ext_employee_size)) { ind = co.ext_industry || null; hc = sizeNum(co.ext_employee_size); }
    if (!ind && !hc && dom) { const f = domFirmo(dom); ind = f.ind; hc = f.hc; }
    attrByEmail.set(e, {
      title_cat: titleCat(o.title),
      size_band: sizeBand(hc),
      industry: ind || 'Unknown',
      hub: hubOf(o.location),
      source: o.source || null,
    });
  }

  // ---- walk every send (the unit of observation) ----
  const faces = {
    title_category: new Map(), size_band: new Map(), industry: new Map(),
    hub: new Map(), channel: new Map(), campaign: new Map(), sender: new Map(),
  };
  const cross = new Map(); // `${title_cat} | ${hub}`
  let total = 0; let skippedChannel = 0; let noContact = 0;

  for (const s of sends) {
    const ch = channelOf(s.campaign_id);
    if (CHANNEL !== 'all' && ch !== CHANNEL) { skippedChannel += 1; continue; }
    const e = lc(s.email); if (!e) continue;
    total += 1;
    const replied = !!s.reply_time || sentimentByEmail.has(e);
    const positive = sentimentByEmail.get(e) === 'positive';
    const a = attrByEmail.get(e);
    if (!a) noContact += 1;

    bump(faces.title_category, a ? a.title_cat : 'NoContact', replied, positive);
    bump(faces.size_band, a ? a.size_band : 'unknown', replied, positive);
    bump(faces.industry, a ? a.industry : 'Unknown', replied, positive);
    bump(faces.hub, a ? a.hub : 'Unknown', replied, positive);
    bump(faces.channel, ch, replied, positive);

    // sender attribution: explicit sender_email, else rep from campaign name
    let sender = s.sender_email ? assigneeForGmail(s.sender_email) : null;
    if (!sender) sender = repFromCampaignName(campaignName.get(String(s.campaign_id)));
    bump(faces.sender, sender || 'unknown', replied, positive);

    // campaign label: name if known, else the raw id
    const clabel = campaignName.get(String(s.campaign_id)) || String(s.campaign_id || 'unknown');
    bump(faces.campaign, clabel, replied, positive);

    if (a && a.title_cat !== 'NoTitle' && a.hub !== 'Unknown') {
      bump(cross, `${a.title_cat} | ${a.hub}`, replied, positive);
    }
  }

  // ---- assemble the belief model ----
  const model = {
    generated_at: new Date().toISOString(),
    channel_filter: CHANNEL,
    observations: { total_sends: total, sends_without_contact_record: noContact, skipped_other_channel: skippedChannel },
    method: {
      win_definition: 'replied = send.reply_time present OR email has a reply row',
      positive_definition: 'email-level reply_sentiment === positive (sparse; treat positive_rate as a lower bound)',
      ranking: 'Wilson 95% lower bound on reply rate (reply_lb95) — discounts small samples',
      confidence: 'high n>=200, medium n>=50, low n>=15, else insufficient',
    },
    who: {
      title_category: summarize(faces.title_category),
      size_band: summarize(faces.size_band),
      industry: summarize(faces.industry),
    },
    where: {
      hub: summarize(faces.hub),
      channel: summarize(faces.channel),
    },
    problem: {
      _hook: 'Not derivable from send/reply data. Populate from messaging-research worktree: map each pain hypothesis (RTO / morale / perks / budget) to the campaigns/variants that carried it, then read resonance off solution.campaign.',
    },
    solution: {
      campaign: summarize(faces.campaign),
      sender: summarize(faces.sender),
      _variants_hook: 'Map each campaign label above to its WHO/WHERE/PROBLEM/SOLUTION angle from the messaging research to turn raw campaign reply rates into named, comparable variants.',
    },
    cross_title_x_hub: summarize(cross),
  };

  writeFileSync(`${ROOT}/belief_model.json`, JSON.stringify(model, null, 2));

  // ---- human-readable digest (the weekly read — guards against comprehension rot) ----
  const fmtRows = (rows, label) => {
    const shown = rows.filter((r) => r.sent >= MIN_N);
    if (!shown.length) return `### ${label}\n_(no buckets with n>=${MIN_N})_\n`;
    const head = '| value | sent | reply % | reply floor (lb95) | positive % | confidence |\n|---|---:|---:|---:|---:|---|';
    const body = shown.map((r) => `| ${r.value} | ${r.sent} | ${(r.reply_rate * 100).toFixed(1)} | ${(r.reply_lb95 * 100).toFixed(1)} | ${(r.positive_rate * 100).toFixed(1)} | ${r.confidence} |`).join('\n');
    return `### ${label}\n${head}\n${body}\n`;
  };
  const md = [
    `# Cold-campaign belief model`,
    `Generated ${model.generated_at} · channel=${CHANNEL} · ${total} sends observed (${noContact} without a contact record)`,
    ``,
    `Ranked by **reply floor (Wilson 95% lower bound)** — the honest worst-case reply rate given the sample. A high headline rate on a tiny sample has a low floor and sinks. This is the skeptic's math: nothing is "proven" until the floor itself is high.`,
    ``,
    `## WHO`,
    fmtRows(model.who.title_category, 'Title category'),
    fmtRows(model.who.size_band, 'Company size band'),
    fmtRows(model.who.industry, 'Industry (top by floor)'),
    `## WHERE`,
    fmtRows(model.where.hub, 'Office hub'),
    fmtRows(model.where.channel, 'Channel'),
    `## SOLUTION (raw — needs messaging research to name variants)`,
    fmtRows(model.solution.campaign, 'Campaign (proxy for offer/message)'),
    fmtRows(model.solution.sender, 'Sender (confound check: does who-sent matter?)'),
    `## THE GRID — title x hub (cells with n>=${MIN_CROSS})`,
    fmtRows(model.cross_title_x_hub.filter((r) => r.sent >= MIN_CROSS), 'Title category x office hub'),
    `## PROBLEM`,
    `_Hook for the messaging worktree._ ${model.problem._hook}`,
    ``,
  ].join('\n');
  writeFileSync(`${ROOT}/belief_model.md`, md);

  // ---- console summary ----
  const top = (rows, label, n = 8) => {
    log(`\n=== ${label} (ranked by reply floor lb95, n>=${MIN_N}) ===`);
    for (const r of rows.filter((x) => x.sent >= MIN_N).slice(0, n)) {
      log(`  floor ${(r.reply_lb95 * 100).toFixed(1).padStart(5)}%  rate ${(r.reply_rate * 100).toFixed(1).padStart(5)}%  n=${String(r.sent).padStart(5)}  [${r.confidence.padEnd(12)}]  ${r.value}`);
    }
  };
  log(`\nObserved ${total} sends · ${noContact} had no contact record (title/firmo unknown) · skipped ${skippedChannel} off-channel`);
  top(model.who.title_category, 'WHO · title category');
  top(model.who.size_band, 'WHO · size band');
  top(model.where.hub, 'WHERE · office hub');
  top(model.where.channel, 'WHERE · channel', 5);
  top(model.solution.campaign, 'SOLUTION · campaign (raw)', 10);
  top(model.solution.sender, 'SOLUTION · sender (confound check)', 6);
  top(model.cross_title_x_hub.filter((r) => r.sent >= MIN_CROSS), 'GRID · title x hub', 12);
  log(`\nWrote belief_model.json + belief_model.md to repo root.`);
  log('DONE');
})().catch((e) => { console.error('BELIEF_ERROR:', e.message); process.exit(1); });
