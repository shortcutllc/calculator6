// One-off: hide pmkmsw@gmail.com (Will's therapist) from the CRM until the
// suppress_lead Pro tool lands (deploy is blocked on Netlify credit limit).
// Writes to BOTH:
//   - gmail_accounts.muted_lead_emails  (per-rep — filters from the digest,
//     using filter logic already in the deployed slack-rep-digest.js)
//   - crm_suppression                   (shared — filters from preflight,
//     followups tab, web CRM card, Pro lookup_lead)
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const EMAIL = 'pmkmsw@gmail.com';
const REP_EMAIL = 'will@getshortcut.co';

// 1. crm_suppression (shared)
{
  const { error } = await sb.from('crm_suppression').upsert({
    email: EMAIL, reason: 'personal', source: 'slack_pro',
    detail: { note: "Will's therapist — not a sales contact", suppressed_by: REP_EMAIL, suppressed_at: new Date().toISOString() },
  }, { onConflict: 'email' });
  console.log(error ? `crm_suppression error: ${error.message}` : `crm_suppression: inserted ${EMAIL}`);
}

// 2. muted_lead_emails on gmail_accounts (per-rep)
{
  const { data: cur } = await sb.from('gmail_accounts').select('muted_lead_emails').eq('email', REP_EMAIL).maybeSingle();
  const set = new Set([...(cur?.muted_lead_emails || []), EMAIL]);
  const { error } = await sb.from('gmail_accounts').update({ muted_lead_emails: [...set] }).eq('email', REP_EMAIL);
  console.log(error ? `mute error: ${error.message}` : `muted_lead_emails: ${[...set].join(', ')}`);
}
