/**
 * Shared read-only pre-flight gate (the ONE check before any outreach).
 *
 * Given an email/domain it answers, read-only:
 *   - suppressed / do-not-contact?  (crm_suppression + live negative replies)
 *   - already a client?             (outreach_contacts.crm_company_id / domain)
 *   - already contacted?            (outreach_sends + latest reply)
 * Returns a verdict + a single actionable recommendation.
 *
 * Mirrors scripts/preflight.mjs. Used by draft-outreach.js (tone grounding)
 * and send-as-rep.js (HARD block before a real send). One source of truth so
 * the gate cannot drift between drafting and sending.
 */

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const DNC_RE = /\bunsubscribe\b|\bnot interested\b|\bremove me\b|\bdo not (contact|email)\b|\bopt[- ]?out\b|\bstop\b/i;

export async function preflight(sb, who) {
  const email = lc(who.email);
  const domain = who.domain ? lc(who.domain).replace(/^www\./, '') : null;
  const v = {
    email, domain,
    suppressed: false, suppression_reason: null,
    is_client: false, client: null,
    contacted: false, send_count: 0, last_contact: null,
    recommendation: 'ok_to_proceed',
  };

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

  let companyId = null;
  if (email) {
    const { data: oc } = await sb.from('outreach_contacts')
      .select('crm_company_id').eq('email', email).not('crm_company_id', 'is', null).maybeSingle();
    if (oc) companyId = oc.crm_company_id;
  }
  let company = null;
  if (companyId) {
    const { data: c } = await sb.from('crm_companies')
      .select('canonical_key, display_name, trajectory, activity_status, completed_events')
      .eq('id', companyId).maybeSingle();
    company = c;
  } else if (domain) {
    const { data: c } = await sb.from('crm_companies')
      .select('canonical_key, display_name, trajectory, activity_status, completed_events')
      .contains('contact_domains', [domain]).limit(1).maybeSingle();
    company = c;
  }
  if (company && company.completed_events > 0) {
    v.is_client = true;
    v.client = { name: company.display_name, trajectory: company.trajectory, activity: company.activity_status };
  }

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

  if (v.suppressed) v.recommendation = 'skip_suppressed';
  else if (v.is_client) v.recommendation = 'skip_already_client';
  else if (v.contacted && v.last_contact && !v.last_contact.replied
    && (Date.now() - new Date(v.last_contact.sent_at).getTime()) < 90 * 86400000) {
    v.recommendation = 'caution_recently_contacted';
  }
  return v;
}
