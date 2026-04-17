export type LeadTier = 'tier_1' | 'tier_2' | 'tier_3';

export type OutreachStatus =
  | 'not_contacted'
  | 'emailed'
  | 'responded'
  | 'meeting_booked'
  | 'vip_booked'
  | 'declined'
  | 'no_response';

export type VipSlotDay = 'day_1' | 'day_2' | 'day_3';

export interface WorkhumanLead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  title: string | null;
  company_size: string | null;
  company_size_normalized: number | null;
  hq_location: string | null;
  industry: string | null;
  multi_office: boolean;
  lead_score: number;
  tier: LeadTier;
  tier_override: boolean;
  outreach_status: OutreachStatus;
  vip_slot_day: VipSlotDay | null;
  vip_slot_time: string | null;
  notes: string | null;
  email_sent_at: string | null;
  responded_at: string | null;
  meeting_scheduled_at: string | null;
  linkedin_url: string | null;
  company_url: string | null;
  landing_page_url: string | null;
  landing_page_id: string | null;
  logo_url: string | null;
  logo_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkhumanLeadCSVRow {
  name: string;
  email: string;
  company: string;
  title: string;
  companySize: string;
  hqLocation: string;
  industry: string;
  multiOffice: string;
}
