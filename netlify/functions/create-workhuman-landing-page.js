/**
 * create-workhuman-landing-page.js
 *
 * Creates a Workhuman Recharge landing page for a given lead.
 * Logo pipeline: override → Brandfetch → schema.org → homepage img → favicon
 *
 * POST body:
 *   {
 *     leadId:          string (workhuman_leads.id, optional — if provided we update that row)
 *     companyName:     string (required)
 *     companyDomain:   string (optional; falls back to guessed domain)
 *     overrideLogoUrl: string (optional; skip auto-discovery)
 *     contactFirstName: string (optional; defaults to "Will")
 *
 *     // For non-Workhuman contacts (e.g. Jen @ Philly Bar from rep's Gmail):
 *     // pass these instead of leadId. We'll find-or-create a workhuman_leads
 *     // row for them so the URL + page_view_count + page_last_viewed_at
 *     // persist on the contact card across visits.
 *     contactEmail:    string (optional)
 *     contactName:     string (optional)
 *     assignedTo:      string (optional, falls back to "Will Newton")
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     pageId, pageToken, url,
 *     logoUrl, logoSource, logoMethod
 *   }
 */

import { createClient } from '@supabase/supabase-js';
import { svgLikelyInvisibleOnLight, fetchSvgText } from './lib/logo-fetcher.js';

const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKHUMAN_USER_ID = process.env.WORKHUMAN_LANDING_PAGE_USER_ID || '42c7eb9e-7ab1-4ba4-bfc7-f23d367d4884';
const PUBLIC_BASE_URL = 'https://proposals.getshortcut.co/workhuman/recharge';
const SHORT_BASE_URL = 'https://proposals.getshortcut.co/r';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---- Logo pipeline ----

async function getLogoFromBrandfetch(domain) {
  if (!domain || !BRANDFETCH_API_KEY) return null;
  try {
    const resp = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`, {
      headers: { 'Authorization': `Bearer ${BRANDFETCH_API_KEY}` }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const logos = data.logos || [];
    if (logos.length === 0) return null;

    const rank = (l) => {
      let s = 0;
      if (l.type === 'logo') s += 100;
      else if (l.type === 'symbol') s += 60;
      else if (l.type === 'icon') s += 40;
      if (l.theme === 'light') s += 10;
      if (l.theme === 'dark') s -= 10;
      return s;
    };
    const sorted = [...logos].sort((a, b) => rank(b) - rank(a));

    // Prefer PNG (dark wordmark) over SVG: SVG wordmarks are often
    // white-on-transparent and render blank on the page's light background.
    // SVG is only accepted after the visibility check passes.
    let rawFallback = null;
    for (const logo of sorted) {
      const formats = logo.formats || [];
      const png = formats.find(f => f.format === 'png');
      const webp = formats.find(f => f.format === 'webp');
      const svg = formats.find(f => f.format === 'svg');
      if (png?.src) return { url: png.src, source: 'brandfetch', method: `${logo.type}/png` };
      if (webp?.src) return { url: webp.src, source: 'brandfetch', method: `${logo.type}/webp` };
      if (svg?.src) {
        const svgText = await fetchSvgText(svg.src);
        if (!svgText || !svgLikelyInvisibleOnLight(svgText)) {
          return { url: svg.src, source: 'brandfetch', method: `${logo.type}/svg` };
        }
      }
      if (!rawFallback && formats[0]?.src) {
        rawFallback = { url: formats[0].src, source: 'brandfetch', method: `${logo.type}/${formats[0].format}` };
      }
    }
    if (rawFallback) return rawFallback;
  } catch (e) {
    console.warn('Brandfetch error:', e.message);
  }
  return null;
}

function resolveUrl(base, rel) { try { return new URL(rel, base).href; } catch (e) { return null; } }

async function fetchHtml(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Shortcut-LogoBot/1.0)' }
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('html')) return null;
    return { html: await resp.text(), finalUrl: resp.url };
  } catch (e) { return null; } finally { clearTimeout(timer); }
}

async function getLogoFromSchemaOrg(domain) {
  if (!domain) return null;
  let pageData = null;
  for (const u of [`https://${domain}`, `https://www.${domain}`]) {
    pageData = await fetchHtml(u); if (pageData) break;
  }
  if (!pageData) return null;
  const blocks = [...pageData.html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1].trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const graph = item['@graph'] || [item];
        for (const g of graph) {
          if (!g?.logo) continue;
          const logo = g.logo;
          const logoUrl = typeof logo === 'string' ? logo : (logo.url || logo.contentUrl);
          if (logoUrl) {
            const resolved = resolveUrl(pageData.finalUrl, logoUrl);
            if (resolved) return { url: resolved, source: 'homepage', method: 'schema.org' };
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

async function getLogoFromImgTags(domain) {
  if (!domain) return null;
  let pageData = null;
  for (const u of [`https://${domain}`, `https://www.${domain}`]) {
    pageData = await fetchHtml(u); if (pageData) break;
  }
  if (!pageData) return null;
  const candidates = [];
  const matches = pageData.html.match(/<img\b[^>]+>/gi) || [];
  for (const tag of matches) {
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    const alt = (tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || '').toLowerCase();
    const cls = (tag.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] || '').toLowerCase();
    if (!src) continue;
    const isLogoAttr = /\blogo\b|brand[- ]?mark|wordmark/i.test(alt) || /\blogo\b|brand[- ]?mark|wordmark/i.test(cls);
    const isLogoUrl = /\blogo\b/i.test(src);
    if (!isLogoAttr && !isLogoUrl) continue;
    const resolved = resolveUrl(pageData.finalUrl, src);
    if (!resolved) continue;
    let score = isLogoAttr ? 50 : 20;
    if (/\.svg/i.test(resolved)) score += 40;
    else if (/\.png/i.test(resolved)) score += 30;
    else if (/\.webp/i.test(resolved)) score += 15;
    else if (/\.jpe?g/i.test(resolved)) score -= 10;
    if (/footer|sprite|placeholder/i.test(cls + ' ' + src)) score -= 30;
    candidates.push({ url: resolved, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates.slice(0, 3)) {
    try {
      const r = await fetch(c.url, { method: 'HEAD', redirect: 'follow' });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
        return { url: c.url, source: 'homepage', method: 'img_tag' };
      }
    } catch (e) {}
  }
  return null;
}

async function getLogoFromIcon(domain) {
  if (!domain) return null;
  let pageData = null;
  for (const u of [`https://${domain}`, `https://www.${domain}`]) {
    pageData = await fetchHtml(u); if (pageData) break;
  }
  if (!pageData) return null;
  const svgMatch = pageData.html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+type=["']image\/svg\+xml["'][^>]+href=["']([^"']+)["']/i);
  if (svgMatch) {
    const resolved = resolveUrl(pageData.finalUrl, svgMatch[1]);
    if (resolved) return { url: resolved, source: 'homepage', method: 'svg_icon' };
  }
  const appleMatches = [...pageData.html.matchAll(/<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]*>/gi)];
  for (const m of appleMatches) {
    const href = m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) {
      const resolved = resolveUrl(pageData.finalUrl, href);
      if (resolved) return { url: resolved, source: 'homepage', method: 'apple-touch-icon' };
    }
  }
  return null;
}

async function storeLogoInSupabase(imageUrl, companyName) {
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 500) return null;
    let ext = 'png';
    if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg';
    if (ct.includes('svg')) ext = 'svg';
    if (ct.includes('webp')) ext = 'webp';
    const safeName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const filePath = `logos/${safeName}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('brochures').upload(filePath, buf, { contentType: ct, upsert: false });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('brochures').getPublicUrl(filePath);
    return publicUrl;
  } catch (e) { return null; }
}

function extractDomain(u) {
  if (!u) return null;
  try { return u.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0] || null; } catch (e) { return null; }
}
function guessDomain(company) {
  const s = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  return s.length >= 3 ? s + '.com' : null;
}
function generateUniqueToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Reachable ≠ visible. A white/transparent SVG loads fine but renders blank on
 * the page's light background. For SVGs we inspect the markup; raster formats we
 * trust (can't decode pixels here). Returns true unless we can prove it's blank.
 */
async function isLogoVisible(url) {
  if (!url) return false;
  const isSvg = url.toLowerCase().split('?')[0].endsWith('.svg');
  if (!isSvg) return true;
  const svgText = await fetchSvgText(url);
  if (!svgText) return true; // couldn't fetch markup — don't over-reject
  return !svgLikelyInvisibleOnLight(svgText);
}

async function findLogo(companyName, domain, overrideLogoUrl) {
  if (overrideLogoUrl) {
    const stored = await storeLogoInSupabase(overrideLogoUrl, companyName);
    return { url: stored || overrideLogoUrl, source: 'override', method: 'manual', stored: !!stored };
  }
  // Try each source in priority order; accept the first that's actually visible.
  // Any source can return a white SVG (the homepage <img> scorer even prefers
  // SVG), so the visibility gate applies across all of them — not just Brandfetch.
  const sources = [getLogoFromBrandfetch, getLogoFromSchemaOrg, getLogoFromImgTags, getLogoFromIcon];
  let firstFound = null;
  for (const getLogo of sources) {
    const result = await getLogo(domain);
    if (!result?.url) continue;
    if (!firstFound) firstFound = result;
    if (await isLogoVisible(result.url)) {
      const stored = await storeLogoInSupabase(result.url, companyName);
      return { url: stored || result.url, source: result.source, method: result.method, stored: !!stored };
    }
  }
  // Everything we found was an invisible-on-light SVG — fall back to the first
  // hit rather than shipping no logo at all.
  if (firstFound) {
    const stored = await storeLogoInSupabase(firstFound.url, companyName);
    return { url: stored || firstFound.url, source: firstFound.source, method: firstFound.method, stored: !!stored, visibilityWarning: true };
  }
  return { url: null, source: null, stored: false };
}

// ---- Handler ----

export const handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'POST only' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      leadId: providedLeadId, companyName, companyDomain, overrideLogoUrl, contactFirstName,
      contactEmail, contactName, assignedTo,
    } = body;
    if (!companyName) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'companyName required' }) };
    let leadId = providedLeadId;

    // For non-Workhuman contacts: find-or-create a workhuman_leads row keyed
    // by email so the URL + view stats persist on the contact card across
    // visits. Idempotent: same email maps to the same row.
    if (!leadId && contactEmail) {
      const cleanedEmail = String(contactEmail).trim().toLowerCase();
      const { data: existing } = await supabase
        .from('workhuman_leads')
        .select('id').eq('email', cleanedEmail).maybeSingle();
      if (existing?.id) {
        leadId = existing.id;
      } else {
        const { data: created, error: createErr } = await supabase
          .from('workhuman_leads')
          .insert({
            email: cleanedEmail,
            name: contactName || cleanedEmail.split('@')[0],
            company: companyName,
            company_url: companyDomain || null,
            assigned_to: assignedTo || 'Will Newton',
            tier: 'tier_3',
            source: 'sales_intelligence_landing_page',
            outreach_status: 'not_contacted',
            notes: `[${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · system] Auto-created from Sales Intelligence landing-page action.`,
          })
          .select('id').single();
        if (!createErr && created?.id) leadId = created.id;
        else console.warn('auto-create workhuman_leads failed (non-fatal):', createErr?.message);
      }
    }

    const domain = extractDomain(companyDomain) || guessDomain(companyName);

    // 1. Find/store logo
    const logo = await findLogo(companyName, domain, overrideLogoUrl);

    // 2. Create landing page
    const uniqueToken = generateUniqueToken();
    const now = new Date().toISOString();
    const { data: pageData, error: pageErr } = await supabase
      .from('generic_landing_pages')
      .insert({
        data: {
          partnerName: companyName,
          partnerLogoUrl: logo.url,
          partnerLogoColor: '#003756',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        customization: {
          contactFirstName: contactFirstName || 'Will',
          contactLastName: 'Newton',
          customNote: '',
          includePricingCalculator: false,
          includeTestimonials: true,
          includeFAQ: true,
          theme: 'default',
        },
        is_editable: true,
        user_id: WORKHUMAN_USER_ID,
        status: 'published',
        unique_token: uniqueToken,
        page_type: 'workhuman',
      })
      .select()
      .single();

    if (pageErr) {
      console.error('Landing page insert error:', pageErr);
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: pageErr.message }) };
    }

    const longUrl = `${PUBLIC_BASE_URL}/${uniqueToken}`;
    const shortUrl = pageData.slug ? `${SHORT_BASE_URL}/${pageData.slug}` : longUrl;

    // 3. Update workhuman_leads if leadId provided (store the short URL as primary)
    if (leadId) {
      const { error: updErr } = await supabase
        .from('workhuman_leads')
        .update({
          landing_page_url: shortUrl,
          landing_page_id: pageData.id,
          logo_url: logo.url,
          logo_source: `${logo.source || 'unknown'}${logo.method ? '/' + logo.method : ''}`,
        })
        .eq('id', leadId);
      if (updErr) console.warn('Lead update warning:', updErr.message);
    }

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        pageId: pageData.id,
        pageToken: uniqueToken,
        slug: pageData.slug,
        url: shortUrl,
        longUrl,
        logoUrl: logo.url,
        logoSource: logo.source,
        logoMethod: logo.method,
      }),
    };
  } catch (e) {
    console.error('Handler error:', e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};

// Exported for the book-a-call relogo path (2026-07-06): the keyless scrape chain
// (schema.org -> homepage img tags -> icons), each candidate visibility-gated so a
// white-on-transparent mark never ships to a light header. Brandfetch-independent.
export async function scrapeVisibleLogo(domain) {
  if (!domain) return null;
  for (const f of [getLogoFromSchemaOrg, getLogoFromImgTags, getLogoFromIcon]) {
    try {
      const r = await f(domain);
      if (r?.url && await isLogoVisible(r.url)) return r;
    } catch { /* next source */ }
  }
  return null;
}
