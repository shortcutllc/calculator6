// One-off: trace why Larcy Allen's recent follow-up isn't reflected.
// Reads service-role from worktree .env.local (gitignored).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const SUPA_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

// 1) Will's gmail_accounts row
banner('1. gmail_accounts (will@getshortcut.co)');
{
  const { data, error } = await sb.from('gmail_accounts')
    .select('email, sent_crawl_enabled, last_sent_crawl_at, watch_expires_at, updated_at, supabase_user_id')
    .eq('email', 'will@getshortcut.co').maybeSingle();
  if (error) console.error('error:', error.message);
  else console.log(JSON.stringify(data, null, 2) || 'NO ROW');
}

// 2) All gmail_accounts (to see who else is connected + opt-in)
banner('2. all gmail_accounts');
{
  const { data, error } = await sb.from('gmail_accounts')
    .select('email, sent_crawl_enabled, last_sent_crawl_at')
    .order('email');
  if (error) console.error('error:', error.message);
  else console.table(data);
}

// 3) Find Larcy in outreach_contacts (loose name/email match)
banner('3. outreach_contacts — name OR email contains "larcy"/"allen"');
{
  const { data, error } = await sb.from('outreach_contacts')
    .select('email, name, company, source, ingested_at')
    .or('name.ilike.%larcy%,email.ilike.%larcy%,name.ilike.%lacy%,email.ilike.%lacy%')
    .order('ingested_at', { ascending: false }).limit(20);
  if (error) console.error('error:', error.message);
  else console.table(data);
}

// 4) outreach_sends for any email matching larcy*
banner('4. outreach_sends — any email containing "larcy"');
{
  const { data, error } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time, sender_email, reply_time, touch_count, message_id, thread_id')
    .ilike('email', '%larcy%').order('sent_time', { ascending: false }).limit(20);
  if (error) console.error('error:', error.message);
  else console.table(data);
}

// 5) Sanity: most recent outreach_sends rows from Will in last 48h
banner('5. outreach_sends — sender_email=will@getshortcut.co, sent_time >= now-48h');
{
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data, error } = await sb.from('outreach_sends')
    .select('email, campaign_id, sent_time, sender_email, reply_time, touch_count, message_id')
    .eq('sender_email', 'will@getshortcut.co')
    .gte('sent_time', since).order('sent_time', { ascending: false }).limit(30);
  if (error) console.error('error:', error.message);
  else { console.log(`count: ${data.length}`); console.table(data); }
}

// 6) Workhuman lead for Larcy (in case she's a personal-note lead)
banner('6. workhuman_leads — name contains "larcy" or "allen"');
{
  const { data, error } = await sb.from('workhuman_leads')
    .select('email, name, company, assigned_to, tier, outreach_status, notes, email_sent_at, responded_at')
    .or('name.ilike.%larcy%,name.ilike.%allen%').limit(20);
  if (error) console.error('error:', error.message);
  else console.table(data);
}
