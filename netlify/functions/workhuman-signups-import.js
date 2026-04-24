/**
 * workhuman-signups-import.js
 *
 * Accepts a JSON array of signup rows (parsed from CSV client-side) and:
 *   1. For each row, tries to match an existing workhuman_leads record by
 *      a) email exact, b) email domain + last name, c) fuzzy name.
 *   2. If no match, creates a fresh workhuman_leads row with
 *      source='whl_booth_signup', tier='tier_1', outreach_status='vip_booked',
 *      so every walk-in has a lead profile.
 *   3. Inserts a row into workhuman_signups with matched_lead_id + match_method.
 *
 * Expected row shape (flexible — we remap common aliases):
 *   { email, first_name, last_name, full_name, phone, company,
 *     appointment_time, day_label, time_slot, service_type, notes, external_id }
 *
 * Returns a summary: { inserted, matched, newLeads, errors, signups[] }.
 */

import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode, body) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// --- Helpers -----------------------------------------------------

const COLUMN_ALIASES = {
  email: ['email', 'email address', 'attendee email', 'work email'],
  first_name: ['first_name', 'first name', 'firstname', 'given name'],
  last_name: ['last_name', 'last name', 'lastname', 'surname', 'family name'],
  full_name: ['full_name', 'full name', 'name', 'attendee', 'attendee name'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'tel'],
  company: ['company', 'company name', 'organization', 'employer'],
  appointment_time: ['appointment_time', 'appointment time', 'start_time', 'start time', 'time', 'datetime', 'scheduled for'],
  day_label: ['day_label', 'day', 'date'],
  time_slot: ['time_slot', 'slot', 'timeslot'],
  service_type: ['service_type', 'service', 'appointment type', 'type'],
  notes: ['notes', 'comments', 'note'],
  external_id: ['external_id', 'booking_id', 'id', 'confirmation_number', 'appointment_id'],
};

function normalizeRow(raw) {
  const lower = {};
  for (const [k, v] of Object.entries(raw || {})) {
    lower[String(k).trim().toLowerCase()] = v;
  }
  const out = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const a of aliases) {
      const v = lower[a];
      if (v != null && String(v).trim()) { out[field] = String(v).trim(); break; }
    }
  }
  // Derive full_name if missing
  if (!out.full_name && (out.first_name || out.last_name)) {
    out.full_name = [out.first_name, out.last_name].filter(Boolean).join(' ').trim();
  }
  // Derive first/last from full_name if missing
  if (out.full_name && !out.first_name) {
    const parts = out.full_name.trim().split(/\s+/);
    out.first_name = parts[0] || null;
    out.last_name = parts.slice(1).join(' ') || null;
  }
  return out;
}

function parseAppointmentAt(row) {
  const raw = row.appointment_time;
  if (!raw) return null;
  // Try ISO first
  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso.toISOString();
  // Otherwise, give up and store raw as day_label + time_slot instead
  return null;
}

function normalizeEmail(e) {
  return e ? String(e).trim().toLowerCase() : null;
}

function emailDomain(e) {
  if (!e) return null;
  const at = e.lastIndexOf('@');
  return at === -1 ? null : e.slice(at + 1).toLowerCase();
}

function nameKey(first, last) {
  return [first, last].map(s => (s || '').toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean).join('|');
}

// --- Matching ----------------------------------------------------

async function matchLead(supabase, row) {
  const email = normalizeEmail(row.email);
  // 1. email exact
  if (email) {
    const { data } = await supabase
      .from('workhuman_leads')
      .select('id, name, email, assigned_to')
      .eq('email', email)
      .maybeSingle();
    if (data) return { lead: data, method: 'email_exact', confidence: 1.0 };
  }

  // 2. email domain + name (handles personal email cases if company is clear)
  if (email) {
    const domain = emailDomain(email);
    if (domain && row.last_name) {
      const lastNormalized = row.last_name.toLowerCase().replace(/[^a-z]/g, '');
      if (lastNormalized.length >= 3) {
        const { data } = await supabase
          .from('workhuman_leads')
          .select('id, name, email, assigned_to')
          .ilike('email', `%@${domain}`)
          .ilike('name', `%${row.last_name}%`)
          .limit(5);
        if (data && data.length === 1) return { lead: data[0], method: 'email_domain_name', confidence: 0.85 };
      }
    }
  }

  // 3. Fuzzy name within same company
  if (row.company && row.last_name) {
    const { data } = await supabase
      .from('workhuman_leads')
      .select('id, name, email, assigned_to')
      .ilike('company', `%${row.company}%`)
      .ilike('name', `%${row.last_name}%`)
      .limit(5);
    if (data && data.length === 1) return { lead: data[0], method: 'name_fuzzy_within_company', confidence: 0.7 };
  }

  // 4. Full-name exact match (last resort)
  if (row.full_name) {
    const { data } = await supabase
      .from('workhuman_leads')
      .select('id, name, email, assigned_to')
      .ilike('name', row.full_name)
      .limit(2);
    if (data && data.length === 1) return { lead: data[0], method: 'full_name_exact', confidence: 0.75 };
  }

  return { lead: null, method: null, confidence: 0 };
}

async function createNewLead(supabase, row) {
  const email = normalizeEmail(row.email);
  const payload = {
    name: row.full_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unknown',
    email: email || `booth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@no-email.placeholder`,
    company: row.company || null,
    phone: row.phone || null,
    mobile_phone: row.phone || null,
    phone_source: row.phone ? 'self_reported_at_booth' : null,
    tier: 'tier_1',
    tier_1a: false,
    tier_1b: false,
    outreach_status: 'vip_booked',
    lead_score: 0,
    source: 'whl_booth_signup',
    notes: 'Created from booth sign-up import.',
  };

  // Upsert in case of email collision (which shouldn't happen here, but safety)
  const { data, error } = await supabase
    .from('workhuman_leads')
    .upsert(payload, { onConflict: 'email' })
    .select('id, name, email, assigned_to')
    .maybeSingle();

  if (error) throw error;
  return data;
}

// --- Handler -----------------------------------------------------

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server misconfigured' });
  const supabase = createClient(supabaseUrl, serviceKey);

  let rows;
  try {
    const body = JSON.parse(event.body || '{}');
    rows = body.rows;
    if (!Array.isArray(rows)) return json(400, { error: 'rows must be an array' });
  } catch (err) {
    return json(400, { error: 'invalid JSON body' });
  }

  if (rows.length === 0) return json(400, { error: 'no rows to import' });
  if (rows.length > 1000) return json(400, { error: 'max 1000 rows per upload' });

  const batchId = crypto.randomUUID();
  const results = {
    batch_id: batchId,
    total: rows.length,
    inserted: 0,
    matched_existing: 0,
    new_leads_created: 0,
    errors: [],
    signup_ids: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const norm = normalizeRow(rows[i]);
    try {
      // Skip rows without any identity info
      if (!norm.email && !norm.full_name) {
        results.errors.push({ row: i + 1, reason: 'no email or name' });
        continue;
      }

      const match = await matchLead(supabase, norm);
      let leadId = match.lead?.id || null;
      let method = match.method;

      if (!leadId) {
        const newLead = await createNewLead(supabase, norm);
        leadId = newLead?.id || null;
        method = 'new_lead_created';
        results.new_leads_created++;
      } else {
        results.matched_existing++;
      }

      const appointmentAt = parseAppointmentAt(norm);

      const insertPayload = {
        external_id: norm.external_id || null,
        full_name: norm.full_name || null,
        first_name: norm.first_name || null,
        last_name: norm.last_name || null,
        email: normalizeEmail(norm.email),
        phone: norm.phone || null,
        company: norm.company || null,
        appointment_at: appointmentAt,
        service_type: norm.service_type || null,
        day_label: norm.day_label || null,
        time_slot: norm.time_slot || null,
        raw_notes: norm.notes || null,
        raw_row: rows[i],
        matched_lead_id: leadId,
        match_method: method,
        match_confidence: match.confidence || (method === 'new_lead_created' ? 1.0 : null),
        uploaded_batch_id: batchId,
      };

      let signup;
      if (norm.external_id) {
        // Upsert by external_id so re-uploads don't duplicate
        const { data, error } = await supabase
          .from('workhuman_signups')
          .upsert(insertPayload, { onConflict: 'external_id' })
          .select('id')
          .maybeSingle();
        if (error) throw error;
        signup = data;
      } else {
        const { data, error } = await supabase
          .from('workhuman_signups')
          .insert(insertPayload)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        signup = data;
      }

      if (signup?.id) results.signup_ids.push(signup.id);
      results.inserted++;
    } catch (err) {
      console.error(`[signups-import] row ${i + 1} error:`, err);
      results.errors.push({ row: i + 1, reason: err.message || String(err) });
    }
  }

  return json(200, results);
};
