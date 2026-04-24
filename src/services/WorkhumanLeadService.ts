import { supabase } from '../lib/supabaseClient';
import { WorkhumanLead, WorkhumanLeadCSVRow, OutreachStatus, LeadTier, VipSlotDay, LeadOutreachLog, OutreachChannel } from '../types/workhumanLead';
import { calculateWorkhumanLeadScore } from '../utils/workhumanLeadScoring';

// --- CSV Parsing ---

/** Parse a single CSV line respecting quoted fields (RFC 4180) */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Fuzzy match header to a field name */
function matchHeader(header: string): string | null {
  const h = header.toLowerCase().trim();

  // Name fields
  if (h === 'name' || h === 'full name' || h === 'full_name' || h === 'attendee name' || h === 'attendee') return 'name';
  if (h === 'first name' || h === 'first_name' || h === 'firstname') return 'firstName';
  if (h === 'last name' || h === 'last_name' || h === 'lastname') return 'lastName';

  // Email
  if (h.includes('email') || h.includes('e-mail')) return 'email';

  // Company
  if (h === 'company' || h === 'organization' || h === 'org' || h === 'employer' || h === 'company name' || h === 'company_name') return 'company';

  // Title
  if (h === 'title' || h === 'job title' || h === 'job_title' || h === 'role' || h === 'position') return 'title';

  // Company size
  if (h.includes('size') || h.includes('employees') || h.includes('headcount') || h === 'company size' || h === 'employee count') return 'companySize';

  // HQ Location
  if (h === 'location' || h === 'hq' || h === 'headquarters' || h === 'hq location' || h === 'city' || h === 'office location' || h === 'headquarter location') return 'hqLocation';

  // Industry
  if (h === 'industry' || h === 'sector' || h === 'vertical') return 'industry';

  // Multi-office
  if (h.includes('multi') && h.includes('office') || h.includes('multiple') && h.includes('location') || h === 'multi-office' || h === 'multi_office') return 'multiOffice';

  return null;
}

export function parseCSV(csvContent: string): WorkhumanLeadCSVRow[] {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headerFields = parseCSVLine(lines[0]);
  const fieldMap: Record<number, string> = {};

  for (let i = 0; i < headerFields.length; i++) {
    const match = matchHeader(headerFields[i]);
    if (match) fieldMap[i] = match;
  }

  const rows: WorkhumanLeadCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const raw: Record<string, string> = {};

    for (const [idx, field] of Object.entries(fieldMap)) {
      raw[field] = values[parseInt(idx)] || '';
    }

    // Handle separate first/last name columns
    let name = raw.name || '';
    if (!name && (raw.firstName || raw.lastName)) {
      name = [raw.firstName, raw.lastName].filter(Boolean).join(' ');
    }

    const email = raw.email || '';
    if (!name || !email) continue; // Skip rows without name or email

    rows.push({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: (raw.company || '').trim(),
      title: (raw.title || '').trim(),
      companySize: (raw.companySize || '').trim(),
      hqLocation: (raw.hqLocation || '').trim(),
      industry: (raw.industry || '').trim(),
      multiOffice: (raw.multiOffice || '').trim(),
    });
  }

  return rows;
}

// --- Bulk Import ---

export async function bulkInsertLeads(
  rows: WorkhumanLeadCSVRow[],
  onProgress?: (done: number, total: number) => void
): Promise<{ inserted: number; updated: number; errors: number }> {
  // Fetch existing leads with tier_override to preserve their tiers
  const { data: overrideLeads } = await supabase
    .from('workhuman_leads')
    .select('email, tier')
    .eq('tier_override', true);

  const overrideMap = new Map<string, string>();
  if (overrideLeads) {
    for (const lead of overrideLeads) {
      overrideMap.set(lead.email, lead.tier);
    }
  }

  const BATCH_SIZE = 50;
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const records = batch.map(row => {
      const result = calculateWorkhumanLeadScore(row);
      const existingTier = overrideMap.get(row.email);

      return {
        name: row.name,
        email: row.email,
        company: row.company || null,
        title: row.title || null,
        company_size: row.companySize || null,
        company_size_normalized: result.companySizeNormalized || null,
        hq_location: row.hqLocation || null,
        industry: row.industry || null,
        multi_office: result.multiOffice,
        lead_score: result.score,
        tier: existingTier || result.tier,
        tier_override: !!existingTier,
      };
    });

    const { data, error } = await supabase
      .from('workhuman_leads')
      .upsert(records, { onConflict: 'email' })
      .select();

    if (error) {
      console.error('Batch insert error:', error);
      errors += batch.length;
    } else if (data) {
      // Rough heuristic: new records have created_at close to now
      const now = Date.now();
      for (const record of data) {
        const createdAge = now - new Date(record.created_at).getTime();
        if (createdAge < 5000) inserted++;
        else updated++;
      }
    }

    onProgress?.(Math.min(i + BATCH_SIZE, rows.length), rows.length);
  }

  return { inserted, updated, errors };
}

// --- CRUD Operations ---

/**
 * Generic per-field update. Pass only the fields that changed.
 * Tier flags: pass tier_1a / tier_1b individually; the service enforces
 * mutual exclusivity (1A wins if both are true).
 */
export async function updateLead(id: string, fields: {
  name?: string;
  email?: string;
  company?: string | null;
  company_url?: string | null;
  title?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  work_phone?: string | null;
  linkedin_url?: string | null;
  industry?: string | null;
  company_size?: string | null;
  hq_location?: string | null;
  tier_1a?: boolean;
  tier_1b?: boolean;
  assigned_to?: string | null;
  notes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  // Mutual exclusivity: 1A wins if both flags sent
  const payload: Record<string, unknown> = { ...fields };
  if (payload.tier_1a === true) payload.tier_1b = false;

  // Normalize email to lowercase
  if (typeof payload.email === 'string') payload.email = payload.email.trim().toLowerCase();
  if (typeof payload.name === 'string') payload.name = payload.name.trim();

  const { error } = await supabase
    .from('workhuman_leads')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Failed to update lead:', error);
    return { ok: false, error: error.message || error.code || 'update failed' };
  }
  return { ok: true };
}

/**
 * Manually create a single lead in the CRM. Minimum is name + email;
 * other fields are optional. Returns the created row or null on error.
 */
export async function createLead(input: {
  name: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedin_url?: string;
  tier_1a?: boolean;
  tier_1b?: boolean;
  assigned_to?: string | null;
  notes?: string;
}): Promise<WorkhumanLead | null> {
  const payload = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company?.trim() || null,
    title: input.title?.trim() || null,
    phone: input.phone?.trim() || null,
    mobile_phone: input.phone?.trim() || null,
    phone_source: input.phone ? 'manual' : null,
    linkedin_url: input.linkedin_url?.trim() || null,
    tier: 'tier_1' as const,
    tier_1a: !!input.tier_1a,
    tier_1b: !!input.tier_1b && !input.tier_1a,
    assigned_to: input.assigned_to || null,
    outreach_status: 'not_contacted' as const,
    lead_score: 0,
    source: 'manual',
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('workhuman_leads')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to create lead:', error);
    return null;
  }
  return data;
}

/**
 * Record that a lead booked a massage appointment at the Workhuman booth.
 * Creates a workhuman_signups row AND updates the lead's vip_slot_day/time
 * + outreach_status so it appears in both the CRM and the Booth dashboard.
 */
export async function bookLeadAtBooth(input: {
  leadId: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  day: VipSlotDay;
  timeSlot: string;
  serviceType?: string;
  bookerNotes?: string;
  bookedBy?: string;
}): Promise<{ signupId: string | null; ok: boolean; error?: string }> {
  // Derive appointment_at from day_label + time_slot when possible
  // (Mon Apr 27, Tue Apr 28, Wed Apr 29)
  const dayToDate: Record<VipSlotDay, string> = {
    day_1: '2026-04-27',
    day_2: '2026-04-28',
    day_3: '2026-04-29',
  };
  const dayLabel = ['day_1', 'day_2', 'day_3'].includes(input.day)
    ? `${({ day_1: 'Mon', day_2: 'Tue', day_3: 'Wed' } as Record<VipSlotDay, string>)[input.day]} ${dayToDate[input.day]}`
    : null;

  // Try to parse a starting time from the time slot string (e.g. "8:00-10:00 AM")
  let appointmentAt: string | null = null;
  try {
    const startMatch = input.timeSlot.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (startMatch) {
      const h = parseInt(startMatch[1], 10);
      const m = parseInt(startMatch[2] || '0', 10);
      const meridiem = startMatch[3]?.toUpperCase();
      let hour24 = h;
      if (meridiem === 'PM' && h < 12) hour24 = h + 12;
      if (meridiem === 'AM' && h === 12) hour24 = 0;
      if (hour24 >= 0 && hour24 <= 23) {
        appointmentAt = `${dayToDate[input.day]}T${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000-04:00`;
      }
    }
  } catch { /* ignore parse errors */ }

  // 1. Create workhuman_signups row
  const firstLast = input.name.trim().split(/\s+/);
  const { data: signup, error: sErr } = await supabase
    .from('workhuman_signups')
    .insert({
      full_name: input.name.trim(),
      first_name: firstLast[0] || null,
      last_name: firstLast.slice(1).join(' ') || null,
      email: input.email.trim().toLowerCase(),
      phone: input.phone || null,
      company: input.company || null,
      appointment_at: appointmentAt,
      day_label: dayLabel,
      time_slot: input.timeSlot.trim(),
      service_type: input.serviceType || 'Chair Massage',
      raw_notes: input.bookerNotes || null,
      matched_lead_id: input.leadId,
      match_method: 'manual',
      match_confidence: 1.0,
      team_notes: input.bookedBy ? `Booked via CRM by ${input.bookedBy}.` : 'Booked via CRM.',
      team_status: 'scheduled',
    })
    .select('id')
    .maybeSingle();

  if (sErr) {
    console.error('Failed to create signup:', sErr);
    return { signupId: null, ok: false, error: `Signup insert failed: ${sErr.message || sErr.code || 'unknown'}${sErr.hint ? ' — ' + sErr.hint : ''}` };
  }
  if (!signup?.id) {
    return { signupId: null, ok: false, error: 'Signup insert returned no row (likely RLS blocked the response — check workhuman_signups policies).' };
  }

  // 2. Update the lead row
  const { error: lErr } = await supabase
    .from('workhuman_leads')
    .update({
      vip_slot_day: input.day,
      vip_slot_time: input.timeSlot.trim(),
      outreach_status: 'vip_booked',
    })
    .eq('id', input.leadId);

  if (lErr) {
    console.error('Failed to update lead with booking:', lErr);
    return { signupId: signup.id, ok: false, error: `Lead update failed: ${lErr.message || lErr.code || 'unknown'}` };
  }

  return { signupId: signup.id, ok: true };
}

export async function fetchLeads(): Promise<WorkhumanLead[]> {
  const { data, error } = await supabase
    .from('workhuman_leads')
    .select('*')
    .order('lead_score', { ascending: false });

  if (error) {
    console.error('Failed to fetch leads:', error);
    return [];
  }
  return data || [];
}

export async function updateLeadStatus(id: string, status: OutreachStatus): Promise<boolean> {
  const updates: Record<string, unknown> = { outreach_status: status };

  // Set corresponding timestamp
  const now = new Date().toISOString();
  if (status === 'emailed') updates.email_sent_at = now;
  if (status === 'responded') updates.responded_at = now;
  if (status === 'meeting_booked') updates.meeting_scheduled_at = now;

  const { error } = await supabase
    .from('workhuman_leads')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update status:', error);
    return false;
  }
  return true;
}

export async function updateLeadTier(id: string, tier: LeadTier): Promise<boolean> {
  const { error } = await supabase
    .from('workhuman_leads')
    .update({ tier, tier_override: true })
    .eq('id', id);

  if (error) {
    console.error('Failed to update tier:', error);
    return false;
  }
  return true;
}

export async function updateLeadVipSlot(id: string, day: VipSlotDay | null, time: string | null): Promise<boolean> {
  const updates: Record<string, unknown> = { vip_slot_day: day, vip_slot_time: time };
  if (day) updates.outreach_status = 'vip_booked';

  const { error } = await supabase
    .from('workhuman_leads')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update VIP slot:', error);
    return false;
  }
  return true;
}

export async function updateLeadAssignment(id: string, assignee: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('workhuman_leads')
    .update({ assigned_to: assignee })
    .eq('id', id);

  if (error) {
    console.error('Failed to update assignment:', error);
    return false;
  }
  return true;
}

export async function updateLeadNotes(id: string, notes: string): Promise<boolean> {
  const { error } = await supabase
    .from('workhuman_leads')
    .update({ notes: notes || null })
    .eq('id', id);

  if (error) {
    console.error('Failed to update notes:', error);
    return false;
  }
  return true;
}

export async function deleteLead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('workhuman_leads')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete lead:', error);
    return false;
  }
  return true;
}

// --- Landing Page Creation ---

export interface CreateLandingPageResult {
  success: boolean;
  url?: string;
  logoUrl?: string;
  logoSource?: string;
  error?: string;
}

/**
 * Create a personalized Workhuman Recharge landing page for a single lead.
 * Calls the netlify function which handles logo discovery + page creation.
 */
export async function createLandingPageForLead(
  lead: Pick<WorkhumanLead, 'id' | 'company' | 'company_url' | 'logo_url'>,
  overrideLogoUrl?: string
): Promise<CreateLandingPageResult> {
  if (!lead.company) {
    return { success: false, error: 'Company name is required' };
  }

  try {
    const resp = await fetch('/.netlify/functions/create-workhuman-landing-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        companyName: lead.company,
        companyDomain: lead.company_url,
        overrideLogoUrl: overrideLogoUrl || undefined,
      }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.success) {
      return { success: false, error: data.error || 'Unknown error' };
    }

    return {
      success: true,
      url: data.url,
      logoUrl: data.logoUrl,
      logoSource: data.logoSource,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// --- Outreach Log ---

/**
 * Log that an outreach message was sent to a lead on a given channel.
 */
export async function logOutreach(args: {
  leadId: string;
  channel: OutreachChannel;
  templateId: string;
  senderName: string;
  messagePreview: string;
}): Promise<boolean> {
  const { error } = await supabase.from('lead_outreach_log').insert({
    lead_id: args.leadId,
    channel: args.channel,
    template_id: args.templateId,
    sender_name: args.senderName,
    message_preview: args.messagePreview.substring(0, 500),
  });
  if (error) {
    console.error('Failed to log outreach:', error);
    return false;
  }
  return true;
}

/**
 * Fetch all outreach log entries for a single lead, newest first.
 */
export async function fetchOutreachLogForLead(leadId: string): Promise<LeadOutreachLog[]> {
  const { data, error } = await supabase
    .from('lead_outreach_log')
    .select('*')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch outreach log:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch a summary of which channels have been used for each lead.
 * Returns a map of leadId → set of channels.
 */
export async function fetchOutreachChannelsByLead(): Promise<Record<string, Set<OutreachChannel>>> {
  const { data, error } = await supabase
    .from('lead_outreach_log')
    .select('lead_id, channel');
  if (error || !data) return {};
  const result: Record<string, Set<OutreachChannel>> = {};
  for (const row of data) {
    if (!result[row.lead_id]) result[row.lead_id] = new Set();
    result[row.lead_id].add(row.channel as OutreachChannel);
  }
  return result;
}

/**
 * Bulk create landing pages for multiple leads in parallel (3 at a time).
 */
export async function bulkCreateLandingPages(
  leads: WorkhumanLead[],
  onProgress?: (done: number, total: number, lastResult?: { company: string; success: boolean }) => void
): Promise<{ succeeded: number; failed: number; results: Array<{ leadId: string; company: string; result: CreateLandingPageResult }> }> {
  const results: Array<{ leadId: string; company: string; result: CreateLandingPageResult }> = [];
  let succeeded = 0;
  let failed = 0;
  const CONCURRENCY = 3;

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async lead => {
        const result = await createLandingPageForLead(lead);
        return { leadId: lead.id, company: lead.company || '', result };
      })
    );

    for (const r of batchResults) {
      results.push(r);
      if (r.result.success) succeeded++;
      else failed++;
      onProgress?.(results.length, leads.length, { company: r.company, success: r.result.success });
    }
  }

  return { succeeded, failed, results };
}
