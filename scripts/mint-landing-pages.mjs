/**
 * mint-landing-pages.mjs — backfill personalized book-a-call pages onto an
 * EXISTING Smartlead campaign's leads (the {{landing_url}} custom field the E3
 * link A/B needs). New campaigns get this automatically at launch (cold-engine
 * E3LINK); this script covers campaigns built before the feature.
 *
 * Per lead: one page per COMPANY (reused if it already exists — no sprawl),
 * Brandfetch-first logo via the create-book-a-call-page Netlify fn, generic
 * /book-a-call fallback when a company is missing/unmintable. Custom fields are
 * MERGED by Smartlead on re-POST (verified: existing fields survive).
 *
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/mint-landing-pages.mjs --campaign 3557935            # dry: counts
 *   node scripts/mint-landing-pages.mjs --campaign 3557935 --confirm  # mint + set fields
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { cleanCompany } from './lib/clean-company.mjs';
import { mintLandingPages, landingUrlFor, GENERIC_BOOK_A_CALL } from './lib/landing-pages.mjs';

const val = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CAMPAIGN = val('--campaign', null);
const CONFIRM = process.argv.includes('--confirm');
const envKey = (n) => { try { return (readFileSync('/Users/willnewton/.openclaw/workspace/.env', 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const SL = process.env.SMARTLEAD_API_KEY || envKey('SMARTLEAD_API_KEY');
const base = 'https://server.smartlead.ai/api/v1';
const log = (...a) => console.log(...a);

(async () => {
  if (!CAMPAIGN) { console.error('usage: node scripts/mint-landing-pages.mjs --campaign <id> [--confirm]'); process.exit(2); }
  if (!SL) { console.error('MISSING SMARTLEAD_API_KEY'); process.exit(2); }
  const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });

  // 1) all campaign leads
  const leads = [];
  for (let offset = 0; ; offset += 100) {
    const j = await (await fetch(`${base}/campaigns/${CAMPAIGN}/leads?api_key=${SL}&limit=100&offset=${offset}`)).json();
    const rows = j.data || [];
    for (const r of rows) {
      const L = r.lead || r;
      if (L?.email) leads.push({ email: L.email, company: cleanCompany(L.company_name || '') || null, has_url: !!(L.custom_fields?.landing_url) });
    }
    if (rows.length < 100) break;
  }
  const need = leads.filter((l) => !l.has_url);
  const companies = [...new Set(need.map((l) => l.company).filter(Boolean))];
  log(`campaign ${CAMPAIGN}: ${leads.length} leads · ${need.length} missing landing_url · ${companies.length} companies to resolve · ${need.filter((l) => !l.company).length} no-company (generic fallback)`);
  if (!CONFIRM) { log('DRY RUN — re-run with --confirm to mint pages + set custom fields.'); return; }

  // 2) one page per company (reuse-first)
  const pageMap = await mintLandingPages({ sb, companies: need.filter((l) => l.company).map((l) => ({ company: l.company, domain: l.email.split('@')[1] })), log });

  // 3) merge landing_url onto each lead (batches of 100; Smartlead merges custom fields)
  let set = 0;
  for (let i = 0; i < need.length; i += 100) {
    const batch = need.slice(i, i + 100).map((l) => ({ email: l.email, custom_fields: { landing_url: l.company ? landingUrlFor(pageMap, l.company) : GENERIC_BOOK_A_CALL } }));
    const r = await fetch(`${base}/campaigns/${CAMPAIGN}/leads?api_key=${SL}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_list: batch, settings: { ignore_global_block_list: false, ignore_duplicate_leads_in_other_campaign: true } }),
    });
    const j = await r.json().catch(() => ({}));
    set += batch.length;
    log(`  fields set ${Math.min(i + 100, need.length)}/${need.length} (already_in_campaign ${j.already_added_to_campaign ?? '?'})`);
  }
  const personalized = need.filter((l) => l.company && pageMap.has(String(l.company).trim().toLowerCase())).length;
  log(`\nDONE — ${set} leads updated: ${personalized} personalized pages, ${set - personalized} generic fallback.`);
})().catch((e) => { console.error('MINT_ERROR:', e.message); process.exit(1); });
