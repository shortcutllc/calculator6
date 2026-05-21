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
 * Build the lead picture for one email (and optionally domain/company).
 * @param sb     Supabase service-role client
 * @param input  { email?, domain?, company? }
 * @returns Promise<LeadPicture>
 */
export async function leadPicture(sb, input) {
  const email = lc(input?.email);
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
  };

  // ----- 2. Workhuman lead (the rich one) -----
  let workhuman = null;
  if (email) {
    const r = await sb.from('workhuman_leads')
      .select('id, name, email, title, company, assigned_to, tier, tier_1a, tier_1b, outreach_status, notes, linkedin_url, landing_page_url, page_view_count, page_last_viewed_at, workhuman_attendee_id, was_waitlisted, vip_slot_day, vip_slot_time, email_sent_at, responded_at, meeting_scheduled_at, lead_score')
      .eq('email', email).maybeSingle();
    if (r.data) {
      const w = r.data;
      // Parse the most recent personal-note stamp [Date, Time · Author]
      const noteMatches = (w.notes || '').matchAll(/\[([^\[\]·]+?)·([^\[\]]+?)\]\s*([^\[]*)/g);
      const notes_parsed = [];
      for (const m of noteMatches) {
        notes_parsed.push({ when: m[1].trim(), author: m[2].trim(), text: m[3].trim() });
      }
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
        linkedin_url: w.linkedin_url || identity.linkedin_url,
        landing_page_url: w.landing_page_url || null,
        landing_page_views: w.page_view_count || 0,
        landing_page_last_viewed: w.page_last_viewed_at || null,
        conference_attendee: !!w.workhuman_attendee_id,
        was_waitlisted: !!w.was_waitlisted,
        vip_slot: w.vip_slot_day ? { day: w.vip_slot_day, time: w.vip_slot_time } : null,
        email_sent_at: w.email_sent_at, responded_at: w.responded_at, meeting_scheduled_at: w.meeting_scheduled_at,
      };
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

  // ----- 5. Proposals for this contact's company -----
  let proposals = [];
  try {
    const cname = identity.company || workhuman?.company || company?.name;
    if (cname || email) {
      let q = sb.from('proposals')
        .select('id, client_name, client_email, status, proposal_type, created_at, updated_at')
        .order('updated_at', { ascending: false }).limit(10);
      if (email) q = q.or(`client_email.eq.${email}${cname ? `,client_name.ilike.%${cname.replace(/[%,]/g, '')}%` : ''}`);
      else if (cname) q = q.ilike('client_name', `%${cname.replace(/[%,]/g, '')}%`);
      const { data } = await q;
      proposals = data || [];
    }
  } catch { /* table or perms missing — skip */ }

  // ----- 6. Sign-up links for the company -----
  let signups = [];
  try {
    const cname = identity.company || workhuman?.company || company?.name;
    if (cname) {
      const { data } = await sb.from('sign_up_links')
        .select('id, proposal_id, signup_url, status, event_payload, created_at')
        .order('created_at', { ascending: false }).limit(5);
      signups = (data || []).filter((s) => {
        const payload = s.event_payload || {};
        const inPayload = JSON.stringify(payload).toLowerCase().includes((cname || '').toLowerCase());
        return inPayload;
      });
    }
  } catch { /* table or perms missing — skip */ }

  return { identity, workhuman, company, preflight: gate, history, proposals, signups };
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
