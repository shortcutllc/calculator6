/**
 * contact-card — read-only full CRM picture for one contact.
 *
 * Thin wrapper around lib/lead-picture.js so the web CRM card and the Slack
 * `lookup_lead` tool render from the same data. Adds the web-only `plays`
 * lookup (Play A / Play B membership, which only the sales-companion UI uses).
 *
 * One brain, two surfaces. If you add a field to lead-picture, both Slack AND
 * the web card get it for free — don't add CRM/lead-data fetches here.
 *
 * POST { email, company?, domain?, companyId? }
 */

import { createClient } from '@supabase/supabase-js';
import { leadPicture } from './lib/lead-picture.js';

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
  const companyId = body.companyId || null;  // Play A is company-centric (no single contact email)
  const company = body.company || null;
  if (!email && !domain && !companyId && !company) {
    return json(400, { error: 'email, domain, companyId, or company required' });
  }

  // ----- 1. Lead picture (identity, workhuman, company, preflight, history,
  //         proposals, signups, multi-channel outreach log, booth signups) -----
  const pic = await leadPicture(sb, { email, domain, company });

  // ----- 2. Plays — web-only (Slack tool doesn't need them) -----
  const plays = { play_a: null, play_b: null };
  // Resolve crm company id: explicit companyId param wins, then the one from
  // lead-picture's company graph, then a domain-based lookup as last resort.
  let crmId = companyId || pic.company?.id || null;
  if (!crmId && domain) {
    const { data: c } = await sb.from('crm_companies')
      .select('id').contains('contact_domains', [domain]).limit(1).maybeSingle();
    crmId = c?.id || null;
  }
  if (crmId) {
    const { data: a } = await sb.from('crm_play_a')
      .select('rank, play_score, play_status, last_event_at, months_since_event')
      .eq('company_id', crmId).maybeSingle();
    if (a) plays.play_a = a;
  }
  if (email) {
    const { data: b } = await sb.from('crm_play_b')
      .select('rank, score, contact_title, title_category')
      .eq('contact_email', email).maybeSingle();
    if (b) plays.play_b = b;
  }

  return json(200, {
    success: true,
    // Surface the full lead-picture shape so the web card can render every
    // field Pro Slack sees: workhuman block, multi-channel outreach log,
    // booth signups, proposals, signup links.
    identity: pic.identity,
    workhuman: pic.workhuman,
    company: pic.company,
    preflight: pic.preflight,
    history: pic.history,
    proposals: pic.proposals || [],
    signups: pic.signups || [],
    plays,
  });
};
