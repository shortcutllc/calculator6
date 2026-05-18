/**
 * preflight.mjs — the ONE gate everything calls before any search, enrich,
 * or outreach. Given an email (and/or domain) it answers, read-only:
 *   - suppressed / do-not-contact?  (crm_suppression + live negative replies)
 *   - already a client?             (outreach_contacts.crm_company_id / domain → crm_companies)
 *   - already Apollo-enriched?      (apollo_person_cache / crm_companies.ext_*) → don't re-spend
 *   - already contacted?            (outreach_sends + latest reply/sentiment)
 * Returns a verdict + a single actionable recommendation.
 *
 * Import:  import { preflight } from './preflight.mjs'
 * Self-test (read-only, real data):
 *   node .claude/worktrees/<wt>/scripts/preflight.mjs --selftest
 */

import { createClient } from '@supabase/supabase-js';

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const emailDomain = (e) => { const m = lc(e)?.match(/@([^@\s]+)$/); return m ? m[1].replace(/^www\./, '') : null; };
const DNC_RE = /\bunsubscribe\b|\bnot interested\b|\bremove me\b|\bdo not (contact|email)\b|\bopt[- ]?out\b|\bstop\b/i;

/**
 * @param sb  Supabase client (service role)
 * @param {{email?:string, domain?:string}} who
 */
export async function preflight(sb, who) {
  const email = lc(who.email);
  const domain = who.domain ? lc(who.domain).replace(/^www\./, '') : emailDomain(email);
  const v = {
    email, domain,
    suppressed: false, suppression_reason: null,
    is_client: false, client: null,
    apollo_enriched: false, apollo_source: null,
    contacted: false, send_count: 0, last_contact: null,
    recommendation: 'ok_to_proceed',
  };

  // 1. Suppression — crm_suppression (hard) + live negative/unsub replies (DNC)
  if (email) {
    const { data: s } = await sb.from('crm_suppression').select('reason').eq('email', email).maybeSingle();
    if (s) { v.suppressed = true; v.suppression_reason = s.reason; }
    if (!v.suppressed) {
      const { data: reps } = await sb.from('outreach_replies')
        .select('reply_sentiment, manual_category, reply_content').eq('email', email);
      for (const r of reps || []) {
        const txt = `${r.manual_category || ''} ${r.reply_content || ''}`;
        if (r.reply_sentiment === 'negative' || DNC_RE.test(txt)) {
          v.suppressed = true; v.suppression_reason = 'dnc_reply'; break;
        }
      }
    }
  }

  // 2. Already a client (email → linked company, else domain → crm_companies)
  let companyId = null;
  if (email) {
    const { data: oc } = await sb.from('outreach_contacts')
      .select('crm_company_id').eq('email', email).not('crm_company_id', 'is', null).maybeSingle();
    if (oc) companyId = oc.crm_company_id;
  }
  let company = null;
  if (companyId) {
    const { data: c } = await sb.from('crm_companies')
      .select('canonical_key, display_name, trajectory, activity_status, completed_events, ext_enriched_at')
      .eq('id', companyId).maybeSingle();
    company = c;
  } else if (domain) {
    const { data: c } = await sb.from('crm_companies')
      .select('canonical_key, display_name, trajectory, activity_status, completed_events, ext_enriched_at')
      .contains('contact_domains', [domain]).limit(1).maybeSingle();
    company = c;
  }
  if (company && (company.completed_events > 0)) {
    v.is_client = true;
    v.client = { key: company.canonical_key, name: company.display_name, trajectory: company.trajectory, activity: company.activity_status };
  }

  // 3. Already Apollo-enriched (don't re-spend)
  if (company && company.ext_enriched_at) { v.apollo_enriched = true; v.apollo_source = 'company'; }
  if (!v.apollo_enriched && email) {
    const { data: ap } = await sb.from('apollo_person_cache').select('apollo_contact_id').eq('email', email).maybeSingle();
    if (ap) { v.apollo_enriched = true; v.apollo_source = 'person'; }
  }
  if (!v.apollo_enriched && domain) {
    const { data: ap } = await sb.from('apollo_person_cache').select('apollo_contact_id').eq('email_domain', domain).limit(1).maybeSingle();
    if (ap) { v.apollo_enriched = true; v.apollo_source = 'person_domain'; }
  }

  // 4. Already contacted
  if (email) {
    const { data: sends } = await sb.from('outreach_sends')
      .select('campaign_id, sent_time, reply_time').eq('email', email).order('sent_time', { ascending: false });
    if (sends && sends.length) {
      v.contacted = true;
      v.send_count = sends.length;
      const latest = sends[0];
      v.last_contact = { campaign_id: latest.campaign_id, sent_at: latest.sent_time, replied: !!latest.reply_time };
    }
  }

  // 5. Single actionable recommendation (priority order)
  if (v.suppressed) v.recommendation = 'skip_suppressed';
  else if (v.is_client) v.recommendation = 'skip_already_client';
  else if (v.contacted && v.last_contact && !v.last_contact.replied
    && (Date.now() - new Date(v.last_contact.sent_at).getTime()) < 90 * 86400000) {
    v.recommendation = 'caution_recently_contacted';
  } else v.recommendation = 'ok_to_proceed';
  return v;
}

// ---------- self-test (read-only, samples real data) ----------
if (process.argv.includes('--selftest')) {
  const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV'); process.exit(2); }
  const sb = createClient(URL, KEY, { auth: { persistSession: false } });
  const redact = (e) => (e ? e.replace(/^(.).*(@.*)$/, '$1***$2') : e);
  (async () => {
    const cases = [];
    const { data: sup } = await sb.from('crm_suppression').select('email').limit(1);
    if (sup?.[0]) cases.push(['SUPPRESSED', { email: sup[0].email }]);
    const { data: ap } = await sb.from('apollo_person_cache').select('email').not('email', 'is', null).limit(1);
    if (ap?.[0]) cases.push(['ENRICHED PERSON', { email: ap[0].email }]);
    const { data: cl } = await sb.from('outreach_contacts').select('email').not('crm_company_id', 'is', null).limit(1);
    if (cl?.[0]) cases.push(['CLIENT-LINKED', { email: cl[0].email }]);
    const { data: snt } = await sb.from('outreach_sends').select('email').not('reply_time', 'is', null).limit(1);
    if (snt?.[0]) cases.push(['CONTACTED+REPLIED', { email: snt[0].email }]);
    cases.push(['FRESH/UNKNOWN', { email: `noone-${Date.now()}@example-unknown-xyz.com` }]);

    console.log('=== PREFLIGHT SELF-TEST (read-only) ===');
    for (const [label, who] of cases) {
      const r = await preflight(sb, who);
      console.log(`\n[${label}] ${redact(r.email)}  domain=${r.domain}`);
      console.log(`  suppressed=${r.suppressed}(${r.suppression_reason||'-'}) client=${r.is_client}${r.client?`(${r.client.name}/${r.client.trajectory}/${r.client.activity})`:''}`);
      console.log(`  apollo_enriched=${r.apollo_enriched}(${r.apollo_source||'-'}) contacted=${r.contacted}(x${r.send_count})`);
      console.log(`  >> RECOMMENDATION: ${r.recommendation}`);
    }
    console.log('\n=== DONE ===');
  })().catch((e) => { console.error('SELFTEST_ERROR:', e.message); process.exit(1); });
}
