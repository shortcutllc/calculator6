/**
 * smartlead-launch.mjs — builds + launches one cold campaign on Smartlead using
 * the canonical campaign-config (right inboxes, schedule, settings). Clones the
 * sequence (copy) from a proven template campaign; uploads skeptic-approved leads.
 *
 * fetch is injectable so the whole launch is testable with a mock — no key, no
 * real campaign. dryRun returns the PLAN (resolved senders, schedule, settings)
 * without creating anything.
 *
 *   const plan = await launchCampaign({ apiKey, name, cloneFromId, leads, dryRun: true });
 */

import { campaignSchedule, CAMPAIGN_SETTINGS, resolveSenderIds } from './campaign-config.mjs';
import { toSmartleadSequences } from './sequence-composer.mjs';

const BASE = 'https://server.smartlead.ai/api/v1';

async function sl(fetchImpl, method, path, apiKey, body) {
  const r = await fetchImpl(`${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 160)}`);
  return json;
}

// Strip a template's GET-sequence rows down to the fields Smartlead accepts on POST.
function sanitizeSequences(rows) {
  return (rows || []).map((s) => ({
    seq_number: s.seq_number,
    seq_delay_details: s.seq_delay_details || { delay_in_days: s.seq_delay_details?.delay_in_days ?? 1 },
    subject: s.subject || '',
    email_body: s.email_body || '',
    sequence_variants: (s.sequence_variants || []).map((v) => ({
      subject: v.subject || '',
      email_body: v.email_body || '',
    })),
  }));
}

const leadList = (leads) => (leads || []).map((l) => ({
  email: l.email,
  first_name: l.first_name || '',
  last_name: l.last_name || '',
  company_name: l.company_name || '',
  custom_fields: l.custom_fields || {},
}));

/**
 * @param {Object} a
 * @param {string} a.apiKey
 * @param {string} a.name           new campaign name
 * @param {number|string} a.cloneFromId  proven template campaign id (sequence source)
 * @param {Array}  a.leads          skeptic-approved leads (with first_name/last_name/company_name)
 * @param {Function} [a.fetchImpl]  injectable fetch (defaults to global)
 * @param {boolean} [a.dryRun]      resolve the plan but create nothing
 */
// HARD INVARIANT at the upload boundary: only MillionVerifier-'ok', Apollo-
// provenance leads ever reach a Smartlead campaign. This sits BEHIND the
// cold-list-evaluator + the cold-engine provenance guard as a last line of
// defence — no code path can push an unverified or guessed address into a
// sending campaign (the 3557935 hard-bounce class). Returns only safe leads.
export function verifiedOnly(leads) {
  return (leads || []).filter((l) => {
    const cf = l.custom_fields || {};
    const mv = cf.mv ?? l.mv_status;
    const bb = cf.bb ?? l.bounceban_status;
    const src = String(cf.source ?? l.source ?? '');
    // Apollo provenance: MV-'ok' OR BounceBan-'deliverable'. Sheet provenance:
    // ONLY a BounceBan-'deliverable' (the strong, real-deliverability probe) —
    // never MV-'ok' alone (that false-OK'd guessed sheet emails and bounced).
    return src.startsWith('sheet:') ? (bb === 'deliverable') : (mv === 'ok' || bb === 'deliverable');
  });
}

export async function launchCampaign({ apiKey, name, cloneFromId, sequence, leads = [], fetchImpl = fetch, dryRun = false }) {
  if (!apiKey) throw new Error('launchCampaign: SMARTLEAD_API_KEY required');
  const safe = verifiedOnly(leads);
  const rejected = (leads || []).length - safe.length;
  if (rejected > 0) console.warn(`launchCampaign: REFUSED ${rejected} unverified lead(s) (not MV-ok or sheet-sourced) — only verified leads are uploaded.`);
  if ((leads || []).length && !safe.length) throw new Error('launchCampaign: every lead failed the MV-ok/provenance check — refusing to create an all-unverified campaign.');
  leads = safe;
  const { ids: senderIds, source: senderSource } = await resolveSenderIds(apiKey, fetchImpl);
  const schedule = campaignSchedule(senderIds.length);
  const plan = {
    name, lead_count: leads.length,
    copy_source: sequence ? (sequence.label || 'composed sequence') : (cloneFromId ? `clone:${cloneFromId}` : 'none'),
    sender_ids: senderIds, sender_source: senderSource, sender_count: senderIds.length,
    schedule, settings: CAMPAIGN_SETTINGS,
  };
  if (dryRun) return { ...plan, dry: true };
  if (!cloneFromId && !sequence) throw new Error('launchCampaign: provide a composed sequence OR a cloneFromId');
  if (!senderIds.length) throw new Error('launchCampaign: no sender accounts resolved on the allowed domains');

  // 1. create
  const camp = await sl(fetchImpl, 'POST', '/campaigns/create', apiKey, { name });
  const id = camp.id;
  if (!id) throw new Error(`create failed: ${JSON.stringify(camp).slice(0, 160)}`);
  // 2. sequence — use the composed copy if given, else clone the proven template
  let sequences;
  if (sequence) {
    sequences = toSmartleadSequences(sequence.steps || sequence);
  } else {
    const tmpl = await sl(fetchImpl, 'GET', `/campaigns/${cloneFromId}/sequences`, apiKey);
    sequences = sanitizeSequences(Array.isArray(tmpl) ? tmpl : tmpl.sequences || tmpl.data || []);
  }
  if (!sequences.length) throw new Error('no sequences to add (composed sequence empty or clone template has none)');
  await sl(fetchImpl, 'POST', `/campaigns/${id}/sequences`, apiKey, { sequences });
  // 3. schedule + 4. settings (canonical)
  await sl(fetchImpl, 'POST', `/campaigns/${id}/schedule`, apiKey, schedule);
  await sl(fetchImpl, 'POST', `/campaigns/${id}/settings`, apiKey, CAMPAIGN_SETTINGS);
  // 5. assign every allowed inbox
  let assigned = 0;
  for (const sid of senderIds) {
    try { await sl(fetchImpl, 'POST', `/campaigns/${id}/email-accounts`, apiKey, { email_account_ids: [sid] }); assigned += 1; } catch { /* skip one bad sender */ }
  }
  // 6. upload leads (batched)
  let uploaded = 0;
  const rows = leadList(leads);
  for (let i = 0; i < rows.length; i += 100) {
    await sl(fetchImpl, 'POST', `/campaigns/${id}/leads`, apiKey, { lead_list: rows.slice(i, i + 100) });
    uploaded += Math.min(100, rows.length - i);
  }
  return { ...plan, dry: false, campaign_id: id, assigned_senders: assigned, uploaded, url: `https://app.smartlead.ai/app/email-campaign/${id}/sequences` };
}

/**
 * Edit an EXISTING campaign's copy IN PLACE (no new campaign). Smartlead has no
 * safe one-shot replace, so: GET existing steps, DELETE each, POST the new ones.
 * Use when Will submits draft edits to a live campaign. Leads/senders untouched.
 * @param {Object} a  { apiKey, campaignId, sequence, fetchImpl?, dryRun? }
 */
export async function updateCampaignSequence({ apiKey, campaignId, sequence, fetchImpl = fetch, dryRun = false }) {
  if (!apiKey) throw new Error('updateCampaignSequence: apiKey required');
  if (!campaignId) throw new Error('updateCampaignSequence: campaignId required');
  const newSeqs = toSmartleadSequences(sequence.steps || sequence);
  if (!newSeqs.length) throw new Error('updateCampaignSequence: empty sequence');
  if (dryRun) return { campaign_id: campaignId, would_write_steps: newSeqs.length, dry: true };
  // Smartlead POST /sequences is a full "save sequences" that REPLACES the whole
  // set (there is no per-step DELETE endpoint), so just POST the new sequence.
  await sl(fetchImpl, 'POST', `/campaigns/${campaignId}/sequences`, apiKey, { sequences: newSeqs });
  return { campaign_id: campaignId, wrote_steps: newSeqs.length, url: `https://app.smartlead.ai/app/email-campaign/${campaignId}/sequences` };
}
