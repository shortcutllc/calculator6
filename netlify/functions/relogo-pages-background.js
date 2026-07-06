/**
 * relogo-pages-background.js — finish the logo backfill without sync-fn timeouts.
 * Same chain as create-book-a-call-page's relogo (fetchLogoUrl → keyless homepage
 * scrape, visibility-gated), but as a BACKGROUND function that owns the whole
 * loop: processes pages one at a time for up to ~13 minutes per invocation,
 * flagging each attempt so re-invocations always advance. POST {} to run.
 */
import { createClient } from '@supabase/supabase-js';
import { fetchLogoUrl, storeProvidedLogo } from './lib/logo-fetcher.js';
import { scrapeVisibleLogo } from './create-workhuman-landing-page.js';

const BUDGET_MS = 13 * 60 * 1000;

export const handler = async () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const start = Date.now();
  const tally = { fixed: 0, nologo: 0, errors: 0 };
  for (;;) {
    if (Date.now() - start > BUDGET_MS) break;
    const { data: pages } = await sb.from('generic_landing_pages')
      .select('id, data').gte('created_at', '2026-07-01')
      .filter('data->>partnerLogoUrl', 'is', null)
      .filter('data->>logoAttempted', 'is', null).limit(5);
    if (!pages?.length) break;
    for (const pg of pages) {
      const company = pg.data?.partnerName;
      try {
        let domain = null;
        if (company) {
          const { data: oc } = await sb.from('outreach_contacts').select('email_domain').ilike('company', company).limit(1);
          domain = oc?.[0]?.email_domain || null;
        }
        let found = company ? await fetchLogoUrl(company, domain) : null;
        if (!found && domain) { const scraped = await scrapeVisibleLogo(domain); found = scraped?.url || null; }
        if (found) {
          const { logoUrl: storedUrl } = await storeProvidedLogo(sb, found, company);
          await sb.from('generic_landing_pages').update({ data: { ...pg.data, partnerLogoUrl: storedUrl || found, logoAttempted: true } }).eq('id', pg.id);
          tally.fixed += 1;
        } else {
          await sb.from('generic_landing_pages').update({ data: { ...pg.data, logoAttempted: true } }).eq('id', pg.id);
          tally.nologo += 1;
        }
      } catch (e) {
        tally.errors += 1;
        try { await sb.from('generic_landing_pages').update({ data: { ...pg.data, logoAttempted: true } }).eq('id', pg.id); } catch { /* noop */ }
      }
    }
  }
  const { count } = await sb.from('generic_landing_pages').select('id', { count: 'exact', head: true })
    .gte('created_at', '2026-07-01').filter('data->>partnerLogoUrl', 'is', null)
    .filter('data->>logoAttempted', 'is', null);
  console.log(`relogo background done: ${JSON.stringify(tally)} · remaining ${count}`);
  return { statusCode: 200, body: JSON.stringify({ ...tally, remaining: count ?? -1 }) };
};
