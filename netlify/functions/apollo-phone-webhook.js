/**
 * apollo-phone-webhook.js — receives Apollo's async phone-reveal callbacks.
 *
 * Apollo's /people/match endpoint, when called with reveal_phone_number=true,
 * returns immediately but fires the actual reveal asynchronously. Apollo
 * POSTs the revealed data to whichever URL you passed as webhook_url in the
 * original request.
 *
 * We look up the lead by email (included in the original match request and
 * echoed in the webhook payload), then write the best available phone to the
 * workhuman_leads row.
 *
 * Payload (typical Apollo shape):
 *   {
 *     "request_id": "...",
 *     "status": "revealed",
 *     "person": {
 *       "email": "...",
 *       "first_name": "...",
 *       "last_name": "...",
 *       "phone_numbers": [ { "sanitized_number": "+1...", "type_cd": "mobile", ... } ],
 *       "mobile_phone": "...",
 *       "sanitized_phone": "...",
 *       "organization": { "primary_phone": { ... } }
 *     }
 *   }
 *
 * We tolerate small shape variations — Apollo has changed the payload
 * several times historically. Always fall back to scanning phone_numbers[].
 */

import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * Pick the "best" phone from an Apollo person object.
 * Priority: mobile > direct work > sanitized_phone > org primary phone.
 * Returns { mobile, work, best, source }.
 */
function extractPhones(person) {
  if (!person) return { mobile: null, work: null, best: null, source: null };

  const list = Array.isArray(person.phone_numbers) ? person.phone_numbers : [];
  const byType = (t) => list.find(p =>
    (p.type_cd || p.type || '').toLowerCase().includes(t)
  )?.sanitized_number || list.find(p =>
    (p.type_cd || p.type || '').toLowerCase().includes(t)
  )?.raw_number || null;

  // Mobile candidates
  const mobile =
    person.mobile_phone ||
    byType('mobile') ||
    byType('cell') ||
    null;

  // Direct work candidates
  const work =
    person.work_direct_phone ||
    person.direct_phone ||
    byType('work') ||
    byType('direct') ||
    null;

  // Fallback: any number at all
  const fallback = person.sanitized_phone || list[0]?.sanitized_number || list[0]?.raw_number || null;

  // Org primary
  const org =
    person.organization?.primary_phone?.sanitized_number ||
    person.organization?.primary_phone?.number ||
    person.organization?.phone ||
    null;

  let best = mobile || work || fallback || org || null;
  let source = null;
  if (mobile && best === mobile) source = 'apollo_mobile_reveal';
  else if (work && best === work) source = 'apollo_work_direct';
  else if (fallback && best === fallback) source = 'apollo_other';
  else if (org && best === org) source = 'apollo_org_hq';

  return { mobile, work, best, source };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('[apollo-phone-webhook] payload keys:', Object.keys(body));

    // Apollo nests person data a few ways; try both
    const person = body.person || body.data?.person || body.matched_person || body.contact || null;
    const email = (person?.email || body.email || '').toLowerCase().trim();

    if (!email) {
      console.error('[apollo-phone-webhook] no email in payload', JSON.stringify(body).substring(0, 500));
      return json(400, { error: 'no email in webhook payload' });
    }

    const phones = extractPhones(person);
    console.log(`[apollo-phone-webhook] email=${email} mobile=${phones.mobile||'—'} work=${phones.work||'—'} best=${phones.best||'—'} source=${phones.source||'—'}`);

    if (!phones.best) {
      return json(200, { ok: true, email, revealed: false, reason: 'no phone in payload' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('[apollo-phone-webhook] Missing Supabase env vars');
      return json(500, { error: 'Server misconfigured' });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find the lead by email
    const { data: lead, error: findErr } = await supabase
      .from('workhuman_leads')
      .select('id, phone, mobile_phone, work_phone')
      .eq('email', email)
      .maybeSingle();

    if (findErr) {
      console.error('[apollo-phone-webhook] lookup error:', findErr);
      return json(500, { error: findErr.message });
    }
    if (!lead) {
      console.warn('[apollo-phone-webhook] lead not found for email:', email);
      return json(200, { ok: true, email, revealed: false, reason: 'lead not found' });
    }

    const updates = {
      phone: phones.best,
      phone_source: phones.source,
      phone_enriched_at: new Date().toISOString(),
    };
    if (phones.mobile) updates.mobile_phone = phones.mobile;
    if (phones.work) updates.work_phone = phones.work;

    const { error: updErr } = await supabase
      .from('workhuman_leads')
      .update(updates)
      .eq('id', lead.id);

    if (updErr) {
      console.error('[apollo-phone-webhook] update error:', updErr);
      return json(500, { error: updErr.message });
    }

    return json(200, { ok: true, email, revealed: true, ...phones });
  } catch (err) {
    console.error('[apollo-phone-webhook] handler error:', err);
    return json(500, { error: err.message || 'Server error' });
  }
};
