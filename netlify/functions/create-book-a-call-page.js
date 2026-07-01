/**
 * create-book-a-call-page.js — generate per-lead, partner-branded "book a call"
 * landing pages for cold + graduation outreach. This is the shared primitive both
 * lanes call; it runs in Netlify because BRANDFETCH_API_KEY + the logo/assembler
 * libs live here (the host cold-engine POSTs to it, like graduation-notify).
 *
 * Logo is BRANDFETCH-FIRST (fetchLogoUrl: Brandfetch on the real domain -> guessed
 * domains -> Brave -> Clearbit), unlike the older Pro create_landing_page path
 * which was Brave-first. Passing the lead's domain gives the best Brandfetch hit.
 * Pages are lean by default (no pricing calculator) — a cold prospect wants a clean
 * branded page with proof + a contact form, not a configurator.
 *
 * First-party URL (proposals.getshortcut.co/generic-landing-page/<token>) — the
 * deliverability-safe link shape (no wrapped/tracked redirect), and the page's own
 * view counter is the buying signal.
 *
 * POST body:
 *   { leads: [{ company, domain?, first_name?, last_name? }], owner_email?, options? }
 *   options: { includePricingCalculator?:false, includeTestimonials?:true, includeFAQ?:false, customMessage? }
 * Returns: { results: [{ company, url, logoSource, logoApplied }] }
 * Env: SUPABASE_*, BRANDFETCH_API_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchLogoUrl, storeProvidedLogo } from './lib/logo-fetcher.js';
import { createLandingPage } from './lib/landing-page-assembler.js';

const DEFAULT_OWNER = process.env.BOOK_A_CALL_OWNER_EMAIL || 'will@getshortcut.co';

const lc = (s) => (s == null ? '' : String(s).trim().toLowerCase());

export const handler = async (event) => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 500, body: 'misconfigured (SUPABASE)' };
  const sb = createClient(url, key, { auth: { persistSession: false } });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'bad JSON' }; }
  const leads = Array.isArray(body.leads) ? body.leads : [];
  if (!leads.length) return { statusCode: 400, body: 'no leads' };
  const opts = body.options || {};

  // Resolve the owning user (pages need an owner id).
  const ownerEmail = lc(body.owner_email) || DEFAULT_OWNER;
  const { data: acct } = await sb.from('gmail_accounts').select('supabase_user_id').eq('email', ownerEmail).maybeSingle();
  const userId = acct?.supabase_user_id || null;
  if (!userId) return { statusCode: 500, body: `no supabase_user_id for owner ${ownerEmail}` };

  const results = [];
  for (const lead of leads.slice(0, 500)) {
    const company = String(lead.company || '').trim();
    if (!company) { results.push({ company: null, error: 'no company' }); continue; }
    try {
      // BRANDFETCH-FIRST logo (domain-aware). fetchLogoUrl returns a URL string.
      let logoUrl = null; let logoSource = null;
      const found = await fetchLogoUrl(company, lead.domain || null);
      if (found) {
        const { logoUrl: storedUrl } = await storeProvidedLogo(sb, found, company);
        logoUrl = storedUrl || found; logoSource = 'brandfetch_or_fallback';
      }
      const { uniqueToken } = await createLandingPage(sb, userId, {
        partnerName: company,
        partnerLogoUrl: logoUrl,
        customMessage: opts.customMessage || null,
        customization: {
          contactFirstName: lead.first_name || null,
          contactLastName: lead.last_name || null,
          includePricingCalculator: opts.includePricingCalculator ?? false,
          includeTestimonials: opts.includeTestimonials ?? true,
          includeFAQ: opts.includeFAQ ?? false,
          theme: opts.theme || 'default',
        },
        status: 'published',
      });
      // The BOOK-A-CALL render (not the generic marketing page) — same data row,
      // different route/component. This is the personalized book-a-call page.
      const pageUrl = `https://proposals.getshortcut.co/book-a-call/${uniqueToken}`;
      results.push({ company, url: pageUrl, logoSource, logoApplied: !!logoUrl });
    } catch (e) {
      results.push({ company, error: e.message });
    }
  }
  return { statusCode: 200, body: JSON.stringify({ results }) };
};
