import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const banner = (s) => console.log(`\n===== ${s} =====`);

banner('1. workhuman_leads with page_view_count > 0 (top 20 by recency)');
{
  const { data } = await sb.from('workhuman_leads')
    .select('email, name, company, assigned_to, page_view_count, page_last_viewed_at, landing_page_url')
    .gt('page_view_count', 0).order('page_last_viewed_at', { ascending: false }).limit(20);
  console.table(data);
  console.log(`total leads with views: ${data?.length || 0}`);
}

banner('2. generic_landing_pages with view_count > 0 (top 20)');
{
  const { data } = await sb.from('generic_landing_pages')
    .select('unique_token, status, view_count, last_viewed_at, page_data')
    .gt('view_count', 0).order('last_viewed_at', { ascending: false }).limit(20);
  // Show abbreviated page_data
  const trimmed = (data || []).map((d) => ({
    token: d.unique_token, status: d.status,
    view_count: d.view_count, last_viewed_at: d.last_viewed_at,
    company: d.page_data?.company_name || d.page_data?.clientName || '?',
  }));
  console.table(trimmed);
}

banner('3. Views in last 24h?');
{
  const cutoff = new Date(Date.now() - 24 * 3600000).toISOString();
  const { data: wl } = await sb.from('workhuman_leads')
    .select('email, name, page_view_count, page_last_viewed_at, assigned_to')
    .gte('page_last_viewed_at', cutoff).order('page_last_viewed_at', { ascending: false });
  console.log(`workhuman_leads with view in last 24h: ${wl?.length || 0}`);
  if (wl?.length) console.table(wl);
}
