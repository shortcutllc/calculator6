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

const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKHUMAN_USER_ID = process.env.WORKHUMAN_LANDING_PAGE_USER_ID || '42c7eb9e-7ab1-4ba4-bfc7-f23d367d4884';
const PUBLIC_BASE_URL = 'https://proposals.getshortcut.co/workhuman/recharge';

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

    for (const logo of sorted) {
      const formats = logo.formats || [];
      const svg = formats.find(f => f.format === 'svg');
      const png = formats.find(f => f.format === 'png');
      const webp = formats.find(f => f.format === 'webp');
      const pick = svg || png || webp || formats[0];
      if (pick?.src) {
        return { url: pick.src, source: 'brandfetch', method: `${logo.type}/${pick.format}` };
      }
    }
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

async function findLogo(companyName, domain, overrideLogoUrl) {
  if (overrideLogoUrl) {
    const stored = await storeLogoInSupabase(overrideLogoUrl, companyName);
    return { url: stored || overrideLogoUrl, source: 'override', method: 'manual', stored: !!stored };
  }
  let result = await getLogoFromBrandfetch(domain);
  if (!result) result = await getLogoFromSchemaOrg(domain);
  if (!result) result = await getLogoFromImgTags(domain);
  if (!result) result = await getLogoFromIcon(domain);
  if (!result) return { url: null, source: null, stored: false };
  const stored = await storeLogoInSupabase(result.url, companyName);
  return { url: stored || result.url, source: result.source, method: result.method, stored: !!stored };
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
    const { leadId, companyName, companyDomain, overrideLogoUrl, contactFirstName } = body;
    if (!companyName) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'companyName required' }) };

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

    const url = `${PUBLIC_BASE_URL}/${uniqueToken}`;

    // 3. Update workhuman_leads if leadId provided
    if (leadId) {
      const { error: updErr } = await supabase
        .from('workhuman_leads')
        .update({
          landing_page_url: url,
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
        url,
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
