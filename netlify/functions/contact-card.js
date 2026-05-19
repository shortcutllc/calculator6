/**
 * contact-card — read-only full CRM picture for one contact.
 *
 * Powers the standalone CRM card (see history + full CRM data WITHOUT
 * entering draft mode). Auth: Supabase JWT. Pure read: identity, company /
 * CRM-graph, pre-flight verdict, full send/reply history, and which plays
 * the contact appears in. Reply text is untrusted inbound content — the UI
 * renders it as quoted data only.
 *
 * POST { email, company?, domain? }
 */

import { createClient } from '@supabase/supabase-js';
import { preflight } from './lib/preflight.js';
import { contactHistory } from './lib/contact-history.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'Server misconfigured' });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const email = lc(body.email);
  const domain = body.domain ? lc(body.domain).replace(/^www\./, '') : (email ? email.split('@')[1] : null);
  const companyId = body.companyId || null; // Play A is company-centric (no single contact email)
  if (!email && !domain && !companyId) return json(400, { error: 'email, domain, or companyId required' });

  // 1. Identity — outreach_contacts (primary) + apollo_person_cache (fill gaps)
  let oc = null;
  if (email) {
    const r = await sb.from('outreach_contacts')
      .select('email, name, title, company, email_domain, crm_company_id, linkedin_url, location, headcount, industry, source, stage, years_in_role, email_status')
      .eq('email', email).maybeSingle();
    oc = r.data || null;
  }
  let ap = null;
  if (email) {
    const r = await sb.from('apollo_person_cache')
      .select('name, title, company, location, industry, company_headcount, linkedin_url, company_url, email_status')
      .eq('email', email).maybeSingle();
    ap = r.data || null;
  }
  const identity = {
    email,
    name: oc?.name || ap?.name || null,
    title: oc?.title || ap?.title || null,
    company: oc?.company || ap?.company || body.company || null,
    domain: oc?.email_domain || domain,
    linkedin_url: oc?.linkedin_url || ap?.linkedin_url || null,
    location: oc?.location || ap?.location || null,
    headcount: oc?.headcount || ap?.company_headcount || null,
    industry: oc?.industry || ap?.industry || null,
    source: oc?.source || (ap ? 'apollo_person_cache' : null),
    stage: oc?.stage || null,
    years_in_role: oc?.years_in_role || null,
    email_status: oc?.email_status || ap?.email_status || null,
  };

  // 2. Company / CRM graph
  let company = null;
  let crmId = companyId || oc?.crm_company_id || null;
  if (!crmId && domain) {
    const { data: c } = await sb.from('crm_companies')
      .select('id').contains('contact_domains', [domain]).limit(1).maybeSingle();
    crmId = c?.id || null;
  }
  if (crmId) {
    const { data: c } = await sb.from('crm_companies')
      .select('id, display_name, trajectory, activity_status, completed_events, last_event_at, fit_score, ext_industry, ext_employee_size')
      .eq('id', crmId).maybeSingle();
    if (c) {
      const { data: sites } = await sb.from('crm_sites').select('city').eq('company_id', c.id);
      const cities = [...new Set((sites || []).map((s) => s.city).filter(Boolean))];
      const monthsSince = c.last_event_at
        ? Math.max(0, Math.floor((Date.now() - new Date(c.last_event_at).getTime()) / (30 * 86400000)))
        : null;
      company = {
        name: c.display_name, trajectory: c.trajectory, activity_status: c.activity_status,
        completed_events: c.completed_events, last_event_at: c.last_event_at,
        months_since_event: monthsSince, fit_score: c.fit_score,
        industry: c.ext_industry || identity.industry, employees: c.ext_employee_size || identity.headcount,
        sites_we_serve: (sites || []).length, cities,
      };
    }
  }

  // 3. Pre-flight verdict + 4. full history
  let gate = null;
  try { gate = await preflight(sb, { email, domain }); } catch (e) { gate = { recommendation: 'unknown', error: e.message }; }
  const history = await contactHistory(sb, email);

  // 5. Which plays it appears in
  const plays = { play_a: null, play_b: null };
  if (crmId) {
    const { data: a } = await sb.from('crm_play_a')
      .select('rank, play_score, play_status, last_event_at, months_since_event').eq('company_id', crmId).maybeSingle();
    if (a) plays.play_a = a;
  }
  if (email) {
    const { data: b } = await sb.from('crm_play_b')
      .select('rank, score, contact_title, title_category').eq('contact_email', email).maybeSingle();
    if (b) plays.play_b = b;
  }

  return json(200, { success: true, identity, company, preflight: gate, history, plays });
};
