/**
 * ingest-apollo-suppression.mjs — one-time (re-runnable) ingest of openclaw's
 * Apollo person cache + bad-email suppression into Supabase. NO Apollo spend
 * (reads existing files). Closes the pre-flight credit/dedup gaps.
 *
 *   cd /Users/willnewton/Documents/GitHub/calculator6
 *   source ~/.nvm/nvm.sh
 *   export SUPABASE_URL="$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"'"'"' \r\n')" \
 *          SUPABASE_SERVICE_ROLE_KEY="$(netlify env:get SUPABASE_SERVICE_ROLE_KEY | tr -d ' \r\n')"
 *   node .claude/worktrees/<wt>/scripts/ingest-apollo-suppression.mjs [--dry]
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const emailDomain = (e) => { const m = lc(e)?.match(/@([^@\s]+)$/); return m ? m[1].replace(/^www\./, '') : null; };
const tsv = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

async function upsert(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    let attempt = 0;
    for (;;) {
      try {
        const { error } = await sb.from(table).upsert(batch, { onConflict: conflict, ignoreDuplicates: false });
        if (error) throw new Error(error.message);
        break;
      } catch (e) {
        attempt += 1;
        if (attempt > 4) throw new Error(`upsert ${table} failed after ${attempt}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
    log(`  ${table}: ${Math.min(i + 500, rows.length)}/${rows.length}`);
  }
}

(async () => {
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN');

  // 1. apollo_person_cache <- apollo_contacts_cache.json
  const ac = JSON.parse(readFileSync(`${OPENCLAW}/apollo_contacts_cache.json`, 'utf8'));
  const cacheUpdated = tsv(ac.updated_at);
  const people = Object.entries(ac.contacts || {}).map(([id, c]) => ({
    apollo_contact_id: c.contact_id || id,
    email: lc(c.email),
    email_domain: emailDomain(c.email),
    name: c.name || null,
    title: c.title || null,
    company: c.company || null,
    company_headcount: c.company_headcount != null && c.company_headcount !== '' ? String(c.company_headcount) : null,
    location: c.location || null,
    industry: c.industry || null,
    company_url: c.company_url || null,
    linkedin_url: c.linkedin_url || null,
    email_status: c.email_status || null,
    start_date: c.start_date || null,
    cache_updated_at: cacheUpdated,
  }));

  // 2. crm_suppression <- rejected_emails.json (bad/undeliverable)
  const re = JSON.parse(readFileSync(`${OPENCLAW}/rejected_emails.json`, 'utf8'));
  const seen = new Set();
  const supp = [];
  for (const l of re.leads || []) {
    const em = lc(l.email);
    if (!em || seen.has(em)) continue;
    seen.add(em);
    supp.push({
      email: em,
      reason: 'bad_email',
      source: 'rejected_emails.json',
      detail: { email_status: l.email_status || null, mv_result: l.mv_result || null, mv_subresult: l.mv_subresult || null, src: l.source || null },
    });
  }

  const withFirmo = people.filter((p) => p.company_headcount || p.industry).length;
  log(`apollo_person_cache: ${people.length} people (${withFirmo} with headcount/industry), cache age ${cacheUpdated}`);
  log(`crm_suppression: ${supp.length} bad-email rows`);

  if (!DRY) {
    await upsert('apollo_person_cache', people, 'apollo_contact_id');
    if (supp.length) await upsert('crm_suppression', supp, 'email');
  }
  log('DONE');
})().catch((e) => { console.error('INGEST_ERROR:', e.message); process.exit(1); });
