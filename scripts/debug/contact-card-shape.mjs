// Verify contact-card now returns the full lead-picture shape.
// Runs the same logic the deployed function does, prints the result for Beverly.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { leadPicture } = await import('../../netlify/functions/lib/lead-picture.js');

const pic = await leadPicture(sb, { email: 'beverly.marsters@opensesame.com' });
const keep = {
  identity: pic.identity,
  workhuman_summary: pic.workhuman ? {
    tier: pic.workhuman.tier, assigned_to: pic.workhuman.assigned_to,
    personal_note: pic.workhuman.personal_note?.slice(0, 80),
    phone: pic.workhuman.phone, phone_source: pic.workhuman.phone_source,
    personal_email: pic.workhuman.personal_email,
    linkedin_url: pic.workhuman.linkedin_url,
    hq_location: pic.workhuman.hq_location, industry: pic.workhuman.industry, company_size: pic.workhuman.company_size,
    conference_attendee: pic.workhuman.conference_attendee,
    booth_signups_count: pic.workhuman.booth_signups_count,
    outreach_log_count: pic.workhuman.outreach_log_count,
  } : 'no workhuman row',
  company_name: pic.company?.name,
  history_emailed: pic.history?.emailed_count,
  proposals_count: (pic.proposals || []).length,
  signups_count: (pic.signups || []).length,
};
console.log(JSON.stringify(keep, null, 2));
