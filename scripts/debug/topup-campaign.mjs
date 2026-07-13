/**
 * topup-campaign.mjs — add banked, verified-sendable net-new DIRECT leads to an
 * existing (drafted) Smartlead campaign until it hits --target, minting the E3
 * book-a-call landing page per company + carrying the same custom fields the
 * campaign's existing leads use. Marks added leads in_campaign so next Monday's
 * run won't re-pull them; leftovers stay banked.
 *
 *   node scripts/debug/topup-campaign.mjs --campaign 3631640 --target 200          # DRY
 *   node scripts/debug/topup-campaign.mjs --campaign 3631640 --target 200 --confirm # live
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { mintLandingPages, landingUrlFor } from '../lib/landing-pages.mjs';
import { cleanCompany } from '../lib/clean-company.mjs';

const val = (f, d) => { const i = process.argv.indexOf(f); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CONFIRM = process.argv.includes('--confirm');
const CAMPAIGN = val('--campaign', '3631640');
const TARGET = parseInt(val('--target', '200'), 10);
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return (process.env[n] || '').trim(); } };
const SL = process.env.SMARTLEAD_API_KEY || envKey('SMARTLEAD_API_KEY');
const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const log = (...a) => console.log(...a);
const BASE = 'https://server.smartlead.ai/api/v1';
const EAST = /new york|nyc|manhattan|brooklyn|miami|fort lauderdale|boston|cambridge|philadelph|washington|d\.?c\.?/i;
async function rA(t, c, m) { const o = []; for (let f = 0; ; f += 1000) { let q = sb.from(t).select(c).range(f, f + 999); if (m) q = m(q); const { data, error } = await q; if (error) throw new Error(`${t}: ${error.message}`); o.push(...data); if (data.length < 1000) break; } return o; }

(async () => {
  // current campaign lead count
  const cr = await fetch(`${BASE}/campaigns/${CAMPAIGN}/leads?api_key=${SL}&limit=1`);
  const cj = await cr.json();
  const current = cj.total_leads ?? cj.total ?? 0;
  const toAdd = Math.max(0, TARGET - current);
  log(`Campaign ${CAMPAIGN}: ${current} leads · target ${TARGET} · need +${toAdd}`);
  if (!toAdd) { log('already at/over target — nothing to add.'); return; }

  // banked pool: DIRECT, eastern, verified-sendable, unsent, not-in-campaign, not suppressed
  const sends = new Set((await rA('outreach_sends', 'email')).map((s) => lc(s.email)));
  const supp = new Set((await rA('crm_suppression', 'email')).map((r) => lc(r.email)));
  const firms = new Set((await rA('crm_target_firms', 'domain')).map((r) => lc(r.domain)?.replace(/^www\./, '')).filter(Boolean));
  const contacts = await rA('outreach_contacts', 'email,name,company,title,location,email_domain,source,broker_track,channel,graduated_at,in_campaign,mv_status,bounceban_status');
  const titleCat = (t) => { const s = (t || '').toLowerCase(); if (/hr|people|talent|human resources/.test(s)) return 'HR/People'; if (/office (manager|coordinator|admin)/.test(s)) return 'OfficeMgr'; if (/employee experience/.test(s)) return 'EmployeeExp'; if (/workplace/.test(s)) return 'Workplace'; if (/facilit/.test(s)) return 'Facilities'; return t ? 'Other' : 'NoTitle'; };
  const sizeBand = () => 'unknown'; // headcount not needed for the custom field here; kept for parity
  const sendable = (c) => c.mv_status === 'ok' || c.bounceban_status === 'deliverable';
  const srcl = (s) => (s || '').toLowerCase();
  const isDirect = (c) => { const dom = lc(c.email_domain); if (c.broker_track || (dom && firms.has(dom))) return false; if (/real[\s_-]?estate/.test(srcl(c.source))) return false; if (/\blaw\b/.test(srcl(c.source))) return false; return true; };
  const pool = contacts.filter((c) => c.email && isDirect(c) && c.channel !== 'personal' && !c.graduated_at
    && !sends.has(lc(c.email)) && !supp.has(lc(c.email)) && !c.in_campaign
    && EAST.test(c.location || '') && sendable(c)
    && !((c.source || '').startsWith('sheet:') && c.bounceban_status !== 'deliverable'));
  log(`Banked eligible (direct/eastern/verified/unsent/not-in-campaign): ${pool.length}`);
  const pick = pool.slice(0, toAdd);
  log(`Selecting ${pick.length}${pick.length < toAdd ? ` (SHORT by ${toAdd - pick.length} — BounceBan may still be filling; re-run later)` : ''}`);
  if (!pick.length) return;

  // mint landing pages for the picked companies
  const companies = pick.map((l) => ({ company: l.company, domain: l.email_domain }));
  const pageMap = CONFIRM
    ? await mintLandingPages({ sb, companies, log })
    : new Map(); // dry: skip minting
  const rows = pick.map((l) => {
    const [first, ...rest] = String(l.name || '').trim().split(/\s+/);
    return {
      email: l.email, first_name: first || '', last_name: rest.join(' '),
      company_name: cleanCompany(l.company) || '',
      custom_fields: {
        title_cat: titleCat(l.title), size_band: sizeBand(), mv: l.mv_status || '', bb: l.bounceban_status || '', source: l.source || '',
        landing_url: CONFIRM ? landingUrlFor(pageMap, l.company) : '(minted on --confirm)',
      },
    };
  });

  if (!CONFIRM) {
    log('\nDRY — would add these (first 8):');
    for (const r of rows.slice(0, 8)) log(`  ${r.email}  ${r.company_name}  [${r.custom_fields.title_cat}]`);
    log(`\nRe-run with --confirm to mint ${new Set(companies.map((c) => lc(c.company))).size} landing pages + add ${rows.length} leads to ${CAMPAIGN}.`);
    return;
  }

  // add to campaign in batches of 100
  let added = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const r = await fetch(`${BASE}/campaigns/${CAMPAIGN}/leads?api_key=${SL}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_list: batch }) });
    const j = await r.json().catch(() => ({}));
    log(`  batch ${i / 100 + 1}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
    if (r.ok) added += batch.length;
  }
  // mark in_campaign so next Monday won't re-pull
  const marks = pick.map((l) => ({ email: l.email, in_campaign: true, smartlead_campaign_id: String(CAMPAIGN) }));
  for (let i = 0; i < marks.length; i += 200) { const { error } = await sb.from('outreach_contacts').upsert(marks.slice(i, i + 200), { onConflict: 'email' }); if (error) log(`  mark warn: ${error.message}`); }
  const cr2 = await fetch(`${BASE}/campaigns/${CAMPAIGN}/leads?api_key=${SL}&limit=1`);
  const cj2 = await cr2.json();
  log(`\nDONE: added ${added} · campaign now ${cj2.total_leads ?? cj2.total ?? '?'} leads (stays DRAFTED for your review).`);
})().catch((e) => { console.error('TOPUP_ERROR:', e.message); process.exit(1); });
