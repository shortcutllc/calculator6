/**
 * lead-picture — the single source of truth for "what do we know about
 * this contact". Used by the Slack bot (Pro), the web CRM card, and any
 * future surface. Aggregates:
 *   - identity         (outreach_contacts + apollo_person_cache merged)
 *   - workhuman lead   (tier, personal note + author/time, outreach_status,
 *                       landing page, conference attendance, vip slot)
 *   - company / CRM    (crm_companies trajectory/activity/events/sites)
 *   - history          (sends + replies w/ content + sentiment, deduped)
 *   - preflight        (suppression / client / contacted verdict)
 *   - proposals        (any existing proposals for this contact's company)
 *   - landing pages    (from workhuman lead or generic_landing_pages)
 *   - sign-up links    (any event sign-up links for the company)
 *
 * Treat the returned shape as the canonical "lead picture" — every surface
 * should render the same fields the same way. Refactor consumers to use this
 * rather than reinventing partial assemblers. The proposal-site / Pro-bot
 * intelligence and the sales-companion CRM are the same brain.
 *
 * Read-only. Never modifies state.
 */

import { preflight } from './preflight.js';
import { contactHistory } from './contact-history.js';

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const PERSONAL_NOTE_RE = /\[([^\[\]·]+?)·([^\[\]]*?)\]/;

/**
 * Resolve a name + company to a workhuman lead (best-effort, returns null if no
 * confident match). Used so "Beverly from Opensesame" can be looked up without
 * the rep knowing the email. Searches workhuman_leads first (the curated set
 * with personal notes), then outreach_contacts as a fallback.
 */
async function resolveLeadByName(sb, name, company) {
  const n = (name || '').trim();
  const c = (company || '').trim();
  if (!n) return null;
  const tokens = n.split(/\s+/).filter(Boolean);
  const first = tokens[0] || null;
  const last = tokens.length > 1 ? tokens[tokens.length - 1] : null;
  const fullEsc = n.replace(/[%,]/g, '');
  const compEsc = c.replace(/[%,]/g, '');

  // 1) workhuman_leads — exact full name + company first, then by first-token + company
  if (c) {
    let q = sb.from('workhuman_leads').select('email, name, company').ilike('company', `%${compEsc}%`).limit(10);
    const { data } = await q;
    if (data && data.length) {
      const fullLc = n.toLowerCase();
      const exact = data.find((r) => (r.name || '').toLowerCase() === fullLc);
      if (exact) return { email: exact.email, source: 'workhuman_leads:exact_name_company' };
      const firstLc = (first || '').toLowerCase();
      const lastLc = (last || '').toLowerCase();
      const byFirst = data.find((r) => {
        const nm = (r.name || '').toLowerCase();
        return firstLc && nm.startsWith(firstLc + ' ') && (!lastLc || nm.includes(lastLc));
      });
      if (byFirst) return { email: byFirst.email, source: 'workhuman_leads:first_company' };
      // If only one match in that company, take it
      if (data.length === 1) return { email: data[0].email, source: 'workhuman_leads:sole_company_match' };
    }
  }

  // 2) workhuman_leads by name alone
  {
    const { data } = await sb.from('workhuman_leads').select('email, name, company').ilike('name', `%${fullEsc}%`).limit(5);
    if (data && data.length === 1) return { email: data[0].email, source: 'workhuman_leads:unique_name' };
  }

  // 3) outreach_contacts fallback (name + company)
  if (c) {
    const { data } = await sb.from('outreach_contacts').select('email, name, company').ilike('company', `%${compEsc}%`).ilike('name', `%${fullEsc}%`).limit(5);
    if (data && data.length === 1) return { email: data[0].email, source: 'outreach_contacts:name_company' };
  }
  return null;
}

/**
 * Build the lead picture for one email (and optionally domain/company).
 * If only name+company is provided, attempts to resolve to a workhuman lead
 * first so personal notes / phone / outreach history all populate.
 * @param sb     Supabase service-role client
 * @param input  { email?, name?, domain?, company? }
 * @returns Promise<LeadPicture>
 */
export async function leadPicture(sb, input) {
  let email = lc(input?.email);
  let resolution = null;
  // Resolve email from name + company when caller didn't pass one
  if (!email && (input?.name || input?.company)) {
    const r = await resolveLeadByName(sb, input?.name, input?.company);
    if (r) { email = lc(r.email); resolution = r.source; }
  }
  const domain = input?.domain ? lc(input.domain).replace(/^www\./, '') : (email ? email.split('@')[1] : null);

  // ----- 1. Identity (outreach_contacts + apollo fallback) -----
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
    company: oc?.company || ap?.company || input?.company || null,
    domain: oc?.email_domain || domain,
    linkedin_url: oc?.linkedin_url || ap?.linkedin_url || null,
    location: oc?.location || ap?.location || null,
    headcount: oc?.headcount || ap?.company_headcount || null,
    industry: oc?.industry || ap?.industry || null,
    email_status: oc?.email_status || ap?.email_status || null,
    company_url: ap?.company_url || null,
    // The next three are rendered in the web CRM card's Identity section and
    // were missing — caused empty "Source", "Stage", "Yrs in role" rows.
    // Populated from outreach_contacts (Apollo / Smartlead enrichment) when
    // present; backfilled from workhuman below for Workhuman-only contacts.
    source: oc?.source || null,
    stage: oc?.stage || null,
    years_in_role: oc?.years_in_role || null,
  };

  // ----- 2. Workhuman lead (the rich one) -----
  let workhuman = null;
  if (email) {
    const r = await sb.from('workhuman_leads')
      .select(`
        id, name, email, title, company, assigned_to,
        tier, tier_1a, tier_1b, outreach_status, notes, linkedin_url,
        landing_page_url, page_view_count, page_last_viewed_at,
        workhuman_attendee_id, was_waitlisted,
        vip_slot_day, vip_slot_time,
        email_sent_at, responded_at, meeting_scheduled_at, lead_score,
        phone, mobile_phone, work_phone, phone_source, phone_enriched_at,
        personal_email, signup_phone, linked_main_lead_id,
        company_size, company_size_normalized, hq_location, industry, multi_office,
        logo_url, logo_source, source
      `)
      .eq('email', email).maybeSingle();
    if (r.data) {
      const w = r.data;
      // Parse the most recent personal-note stamp [Date, Time · Author]
      const noteMatches = (w.notes || '').matchAll(/\[([^\[\]·]+?)·([^\[\]]+?)\]\s*([^\[]*)/g);
      const notes_parsed = [];
      for (const m of noteMatches) {
        notes_parsed.push({ when: m[1].trim(), author: m[2].trim(), text: m[3].trim() });
      }

      // ----- 2a. Multi-channel outreach log for this lead -----
      let outreach_log = [];
      try {
        const { data: log } = await sb.from('lead_outreach_log')
          .select('channel, sender_name, sent_at, message_preview, template_id')
          .eq('lead_id', w.id).order('sent_at', { ascending: false }).limit(20);
        outreach_log = log || [];
      } catch { /* table missing — skip */ }

      // ----- 2b. Booth massage signups matched to this lead -----
      let signups_booth = [];
      try {
        const { data: bs } = await sb.from('workhuman_signups')
          .select('id, appointment_at, day_label, time_slot, service_type, team_status, team_notes, full_name')
          .eq('matched_lead_id', w.id).order('appointment_at', { ascending: true });
        signups_booth = bs || [];
      } catch { /* table missing — skip */ }

      // Best phone for outreach: explicit phone (curated) > mobile > work > signup_phone
      const best_phone = w.phone || w.mobile_phone || w.work_phone || w.signup_phone || null;

      workhuman = {
        id: w.id, assigned_to: w.assigned_to,
        tier: w.tier_1a ? 'tier_1a' : w.tier_1b ? 'tier_1b' : w.tier,
        outreach_status: w.outreach_status,
        lead_score: w.lead_score,
        notes_raw: w.notes || null,
        personal_note: notes_parsed[0]?.text || null,  // most recent / primary note
        personal_note_at: notes_parsed[0]?.when || null,
        personal_note_by: notes_parsed[0]?.author || null,
        notes_all: notes_parsed,
        // Contact channels
        linkedin_url: w.linkedin_url || identity.linkedin_url,
        phone: best_phone,
        mobile_phone: w.mobile_phone || null,
        work_phone: w.work_phone || null,
        signup_phone: w.signup_phone || null,
        phone_source: w.phone_source || null,
        phone_enriched_at: w.phone_enriched_at || null,
        personal_email: w.personal_email || null,
        // Firmographics (Workhuman-curated, often richer than Apollo)
        hq_location: w.hq_location || null,
        industry: w.industry || identity.industry,
        company_size: w.company_size || null,
        multi_office: !!w.multi_office,
        logo_url: w.logo_url || null,
        logo_source: w.logo_source || null,
        // Linkage to a main CRM lead (for booth-walk-in duplicates)
        linked_main_lead_id: w.linked_main_lead_id || null,
        source: w.source || null,
        // Landing page
        landing_page_url: w.landing_page_url || null,
        landing_page_views: w.page_view_count || 0,
        landing_page_last_viewed: w.page_last_viewed_at || null,
        // Conference attendance + VIP slot
        conference_attendee: !!w.workhuman_attendee_id,
        was_waitlisted: !!w.was_waitlisted,
        vip_slot: w.vip_slot_day ? { day: w.vip_slot_day, time: w.vip_slot_time } : null,
        // Engagement timing
        email_sent_at: w.email_sent_at, responded_at: w.responded_at, meeting_scheduled_at: w.meeting_scheduled_at,
        // Channel-level history (workhuman_dm, linkedin_connect, linkedin_dm, email, sms)
        outreach_log,
        outreach_log_count: outreach_log.length,
        // Booth massage signups
        booth_signups: signups_booth,
        booth_signups_count: signups_booth.length,
      };
    }
  }

  // ----- 2c. Backfill identity from workhuman when other sources were empty.
  // Workhuman-only contacts (e.g. booth signups never enriched via Apollo)
  // otherwise leave Location / Source blank on the CRM card.
  if (workhuman) {
    if (!identity.location && workhuman.hq_location) identity.location = workhuman.hq_location;
    if (!identity.industry && workhuman.industry) identity.industry = workhuman.industry;
    if (!identity.headcount && workhuman.company_size) identity.headcount = workhuman.company_size;
    if (!identity.linkedin_url && workhuman.linkedin_url) identity.linkedin_url = workhuman.linkedin_url;
    // source: show what we actually know about provenance
    if (!identity.source) {
      const parts = [];
      if (workhuman.source) parts.push(`workhuman:${workhuman.source}`);
      else if (workhuman.id) parts.push('workhuman_leads');
      if (ap) parts.push('apollo');
      identity.source = parts.length ? parts.join(' + ') : null;
    }
  }

  // ----- 3. Company / CRM-graph -----
  let company = null;
  let crmId = workhuman?.id ? null : (oc?.crm_company_id || null);
  if (!crmId && domain) {
    const r = await sb.from('crm_companies').select('id').contains('contact_domains', [domain]).limit(1).maybeSingle();
    crmId = r.data?.id || null;
  }
  if (crmId) {
    const { data: c } = await sb.from('crm_companies')
      .select('id, display_name, trajectory, activity_status, completed_events, last_event_at, fit_score, ext_industry, ext_employee_size, contact_domains')
      .eq('id', crmId).maybeSingle();
    if (c) {
      const { data: sites } = await sb.from('crm_sites').select('city').eq('company_id', c.id);
      const cities = [...new Set((sites || []).map((s) => s.city).filter(Boolean))];
      const monthsSince = c.last_event_at
        ? Math.max(0, Math.floor((Date.now() - new Date(c.last_event_at).getTime()) / (30 * 86400000)))
        : null;
      company = {
        id: c.id, name: c.display_name, trajectory: c.trajectory, activity_status: c.activity_status,
        completed_events: c.completed_events, last_event_at: c.last_event_at, months_since_event: monthsSince,
        fit_score: c.fit_score, industry: c.ext_industry || identity.industry,
        employees: c.ext_employee_size || identity.headcount,
        sites_we_serve: (sites || []).length, cities, domains: c.contact_domains || [],
      };
    }
  }

  // ----- 4. Pre-flight + history -----
  let gate = null;
  try { gate = await preflight(sb, { email, domain }); } catch (e) { gate = { recommendation: 'unknown', error: e.message }; }
  const history = await contactHistory(sb, email);

  // ----- 5. Proposals for this contact -----
  // Three match paths, deduped by proposal id:
  //   1. client_email exact match (set when Pro create_proposal had the email)
  //   2. client_name ILIKE %company% (when we know the company)
  //   3. slug ILIKE %domain-token% (catches "philadelphia-bar..." for jen@philabar.org
  //      when nothing else knew the company name)
  let proposals = [];
  try {
    const cname = identity.company || workhuman?.company || company?.name;
    const escCname = cname ? cname.replace(/[%,]/g, '') : null;
    // Derive a coarse "domain token" — the SLD without TLD/www, e.g. "philabar" from "philabar.org"
    const domainToken = domain ? domain.replace(/^www\./, '').split('.')[0] : null;
    const escDomainToken = domainToken && domainToken.length >= 4 ? domainToken : null;

    const byId = new Map();
    const merge = (rows) => {
      for (const r of (rows || [])) if (!byId.has(r.id)) byId.set(r.id, r);
    };

    if (email) {
      const { data } = await sb.from('proposals')
        .select('id, slug, client_name, client_email, status, proposal_type, created_at, updated_at')
        .eq('client_email', email).order('updated_at', { ascending: false }).limit(10);
      merge(data);
    }
    if (escCname) {
      const { data } = await sb.from('proposals')
        .select('id, slug, client_name, client_email, status, proposal_type, created_at, updated_at')
        .ilike('client_name', `%${escCname}%`).order('updated_at', { ascending: false }).limit(10);
      merge(data);
    }
    if (escDomainToken && byId.size === 0) {
      // Only fall back to domain matching when nothing else found — guard against
      // generic tokens (e.g. domain "company" → would match every proposal).
      const [a, b] = await Promise.all([
        sb.from('proposals')
          .select('id, slug, client_name, client_email, status, proposal_type, created_at, updated_at')
          .ilike('slug', `%${escDomainToken}%`).order('updated_at', { ascending: false }).limit(10),
        sb.from('proposals')
          .select('id, slug, client_name, client_email, status, proposal_type, created_at, updated_at')
          .ilike('client_name', `%${escDomainToken}%`).order('updated_at', { ascending: false }).limit(10),
      ]);
      merge(a.data); merge(b.data);
    }
    proposals = [...byId.values()].sort((x, y) => new Date(y.updated_at) - new Date(x.updated_at)).slice(0, 10);
  } catch { /* table or perms missing — skip */ }

  // ----- 6. Sign-up links for this contact -----
  // Two match paths, deduped by signup id:
  //   1. proposal_id IN (proposals we just found) — most reliable
  //   2. event_payload text match on company name — legacy fallback
  let signups = [];
  try {
    const byId = new Map();
    const merge = (rows) => { for (const r of (rows || [])) if (!byId.has(r.id)) byId.set(r.id, r); };

    // Path 1: join via proposal_id
    if (proposals.length > 0) {
      const { data } = await sb.from('sign_up_links')
        .select('id, proposal_id, signup_url, status, event_payload, created_at, coordinator_event_id')
        .in('proposal_id', proposals.map((p) => p.id)).eq('status', 'active');
      merge(data);
    }
    // Path 2: legacy text match (only when company is known)
    const cname = identity.company || workhuman?.company || company?.name;
    if (cname) {
      const { data } = await sb.from('sign_up_links')
        .select('id, proposal_id, signup_url, status, event_payload, created_at, coordinator_event_id')
        .order('created_at', { ascending: false }).limit(10);
      const matches = (data || []).filter((s) => {
        const payload = s.event_payload || {};
        return JSON.stringify(payload).toLowerCase().includes(cname.toLowerCase());
      });
      merge(matches);
    }
    signups = [...byId.values()].sort((x, y) => new Date(y.created_at) - new Date(x.created_at)).slice(0, 10);
  } catch { /* table or perms missing — skip */ }

  return { identity, workhuman, company, preflight: gate, history, proposals, signups, resolution };
}

/**
 * Reason over a lead picture and surface next-best actions (ranked).
 * Returned as a list, each with { action, priority, why, [params] }.
 * UI/Slack-formatted text rendering belongs to the consumer; this is data.
 */
export function suggestNextActions(p) {
  const out = [];
  if (!p) return out;
  const h = p.history || {};
  const wh = p.workhuman;
  const gate = p.preflight || {};
  const hasProposal = (p.proposals || []).length > 0;
  const hasLandingPage = !!wh?.landing_page_url;
  const hasSignup = (p.signups || []).length > 0;
  const repliedRecently = h.replied && h.replies?.length;
  const latestReplySentiment = h.replies?.[h.replies.length - 1]?.sentiment || null;

  // suppressed / client → don't push outreach
  if (gate.suppressed) {
    out.push({ action: 'do_not_contact', priority: 'critical', why: `Suppressed (${gate.suppression_reason || 'on DNC list'}). Do not contact under any circumstance.` });
    return out;
  }

  // Positive reply, no proposal yet → strongest signal to create one
  if (repliedRecently && latestReplySentiment === 'positive' && !hasProposal) {
    out.push({ action: 'create_proposal', priority: 'high', why: 'They replied positively and there is no proposal yet. Create one based on the conversation.' });
  }

  // Replied (any sentiment), no proposal → still create
  if (repliedRecently && !hasProposal && latestReplySentiment !== 'negative') {
    out.push({ action: 'create_proposal', priority: 'high', why: 'They engaged in conversation but no proposal exists yet.' });
  }

  // Replied → ensure a personalized landing page exists as a leave-behind
  if (repliedRecently && !hasLandingPage && wh) {
    out.push({ action: 'create_landing_page', priority: 'med', why: 'Personalized landing page can serve as a leave-behind / asset for the wellness team meeting.' });
  }

  // Has proposal but no sign-up link → create one for the event
  if (hasProposal && !hasSignup) {
    out.push({ action: 'create_signup_link', priority: 'med', why: 'Proposal exists but no employee sign-up link yet — needed before the event.' });
  }

  // Never emailed + has personal note → cold open grounded in the note
  if (!h.emailed_count && wh?.personal_note) {
    out.push({ action: 'draft_first_outreach', priority: 'high', why: 'Personal-note lead never emailed. Draft a cold open grounded in the in-person note.' });
  }

  // Emailed, no reply, within cap → follow-up
  if (h.emailed_count > 0 && !h.replied && gate.recommendation === 'ok_to_proceed') {
    out.push({ action: 'draft_followup', priority: 'med', why: 'Prior outreach, no reply yet. Draft a short threaded follow-up.' });
  }

  return out;
}
