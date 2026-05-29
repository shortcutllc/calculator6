/**
 * Logo Fetcher — finds company logos and stores them in Supabase storage.
 *
 * Strategy (in order):
 *   1. Brandfetch (rich logos, SVG-preferred, multi-format, requires API key)
 *      — same pipeline create-workhuman-landing-page uses, so Pro tools get
 *      the same logo quality the Workhuman landing-page flow gets.
 *   2. Clearbit Logo API (fallback — no API key, fast, but lower-quality PNGs)
 *   3. Return null (caller can fall back to Brave Search etc.)
 *
 * Always stores a copy in Supabase — external URLs break over time.
 */

const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY;

/**
 * Brandfetch is the higher-quality source — returns SVG/PNG with explicit type
 * metadata (logo vs symbol vs icon, light vs dark theme). Mirrors the ranking
 * in create-workhuman-landing-page so Pro tools and the Workhuman landing-page
 * flow produce the same logo for the same company.
 */
async function fetchLogoFromBrandfetch(domain) {
  if (!domain || !BRANDFETCH_API_KEY) return null;
  try {
    const resp = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${BRANDFETCH_API_KEY}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const logos = data.logos || [];
    if (logos.length === 0) return null;
    // Prefer wordmark logos, light theme, SVG > PNG > WebP > anything.
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
      const svg = formats.find((f) => f.format === 'svg');
      const png = formats.find((f) => f.format === 'png');
      const webp = formats.find((f) => f.format === 'webp');
      const pick = svg || png || webp || formats[0];
      if (pick?.src) return pick.src;
    }
  } catch (e) {
    console.warn('Brandfetch error:', e.message);
  }
  return null;
}

/**
 * Attempt to fetch a company logo URL.
 * Tries Brandfetch first (rich, SVG-preferred), falls back to Clearbit.
 *
 * @param {string} companyName - Company name (e.g., "Burberry")
 * @param {string} [domain] - Optional explicit domain (e.g., "burberry.com")
 * @returns {string|null} Logo URL or null if not found
 */
async function fetchLogoUrl(companyName, domain) {
  // Try to construct the domain from the company name if not provided
  const domains = [];
  if (domain) domains.push(domain);
  const sanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  domains.push(`${sanitized}.com`);
  domains.push(`${sanitized}.co`);
  domains.push(`${sanitized}.io`);

  // 1) Brandfetch first — try each candidate domain. First hit wins.
  for (const d of domains) {
    const bf = await fetchLogoFromBrandfetch(d);
    if (bf) return bf;
  }

  // 2) Clearbit fallback — fast HEAD probes.
  for (const d of domains) {
    const url = `https://logo.clearbit.com/${d}`;
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.startsWith('image/')) return url;
      }
    } catch (err) { /* try next domain */ }
  }

  return null;
}

/**
 * Download an image from a URL and upload it to Supabase storage.
 * Returns a permanent Supabase storage URL.
 *
 * @param {object} supabase - Initialized Supabase client (service role)
 * @param {string} imageUrl - URL of the image to download
 * @param {string} companyName - Company name for the filename
 * @returns {string|null} Supabase storage URL or null on failure
 */
async function storeLogo(supabase, imageUrl, companyName) {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to download logo from ${imageUrl}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    // Determine file extension from content type
    let ext = 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    if (contentType.includes('svg')) ext = 'svg';
    if (contentType.includes('webp')) ext = 'webp';

    // Create a clean filename
    const sanitizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const timestamp = Date.now();
    const filePath = `logos/${sanitizedName}-${timestamp}.${ext}`;

    // Upload to Supabase storage (brochures bucket)
    const { data, error } = await supabase.storage
      .from('brochures')
      .upload(filePath, buffer, {
        contentType,
        upsert: false
      });

    if (error) {
      console.warn(`Failed to upload logo to Supabase: ${error.message}`);
      return null;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('brochures')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.warn(`Error storing logo for ${companyName}:`, err.message);
    return null;
  }
}

/**
 * Full pipeline: find a logo and store it.
 * Returns the Supabase storage URL (permanent) or the Clearbit URL (fallback).
 *
 * @param {object} supabase - Initialized Supabase client
 * @param {string} companyName - Company name
 * @param {string} [domain] - Optional explicit domain
 * @returns {object} { logoUrl, source, stored }
 */
async function fetchAndStoreLogo(supabase, companyName, domain) {
  // Step 1: Find the logo
  const clearbitUrl = await fetchLogoUrl(companyName, domain);

  if (!clearbitUrl) {
    return {
      logoUrl: null,
      source: null,
      stored: false,
      message: `No logo found for "${companyName}". Try providing a direct image URL.`
    };
  }

  // Step 2: Store a permanent copy
  const storedUrl = await storeLogo(supabase, clearbitUrl, companyName);

  if (storedUrl) {
    return {
      logoUrl: storedUrl,
      source: 'clearbit',
      stored: true
    };
  }

  // Fallback: return the Clearbit URL directly (less reliable long-term)
  return {
    logoUrl: clearbitUrl,
    source: 'clearbit',
    stored: false,
    message: 'Logo found but could not be stored in Supabase. Using external URL.'
  };
}

/**
 * Store a logo from a provided URL (e.g., from Brave Search via OpenClaw).
 *
 * @param {object} supabase - Initialized Supabase client
 * @param {string} imageUrl - Direct image URL
 * @param {string} companyName - Company name for the filename
 * @returns {object} { logoUrl, stored }
 */
async function storeProvidedLogo(supabase, imageUrl, companyName) {
  const storedUrl = await storeLogo(supabase, imageUrl, companyName);

  if (storedUrl) {
    return { logoUrl: storedUrl, stored: true };
  }

  // Fallback to the provided URL
  return {
    logoUrl: imageUrl,
    stored: false,
    message: 'Could not store logo in Supabase. Using provided URL directly.'
  };
}

/**
 * Try Brave Image Search for a logo. Returns the first result that looks
 * like a logo (avoids favicons, prefers titles/URLs containing "logo").
 * Returns null on no match / no API key / Brave API error.
 */
async function fetchLogoFromBrave(companyName) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;
  try {
    const query = `${companyName} company logo transparent png`;
    const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=5&safesearch=strict`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });
    if (!response.ok) {
      console.warn(`Brave Search API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const results = data.results || [];
    for (const result of results) {
      const src = result.properties?.url || result.url;
      if (!src) continue;
      const lowerSrc = src.toLowerCase();
      if (lowerSrc.includes('favicon') && !lowerSrc.includes('apple-touch')) continue;
      const title = (result.title || '').toLowerCase();
      const isLikelyLogo = title.includes('logo') || lowerSrc.includes('logo');
      if (isLikelyLogo || results.indexOf(result) === 0) return src;
    }
  } catch (err) {
    console.warn(`Brave Search error for ${companyName}:`, err.message);
  }
  return null;
}

/**
 * Find a company logo. Order (Will's call: Brandfetch default, Brave backup):
 *   1) Brandfetch on provided domain
 *   2) Brandfetch on guessed domains (companyname.com / .co / .io)
 *   3) Brave Image Search (fuzzy match by company name — last resort because
 *      it's image-search noisy: random PowerPoint slides, blog hero images
 *      with the wrong logo, etc.)
 *   4) Clearbit on any candidate domain (rarely better than Brandfetch but
 *      sometimes catches obscure companies Brandfetch hasn't indexed)
 *
 * Caller passes `domain` when known (better Brandfetch hit rate). Without
 * domain, we guess from the company name and try several TLDs.
 *
 * Used by Pro's create_proposal / create_landing_page / search_logo tools.
 */
async function searchLogoViaBrave(companyName, domain) {
  const candidateDomains = [];
  if (domain) candidateDomains.push(domain);
  const sanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (sanitized.length >= 3) {
    candidateDomains.push(`${sanitized}.com`, `${sanitized}.co`, `${sanitized}.io`);
  }

  // 1+2) Brandfetch on every candidate domain. First hit wins.
  for (const d of candidateDomains) {
    const bf = await fetchLogoFromBrandfetch(d);
    if (bf) return { logoUrl: bf, source: 'brandfetch' };
  }

  // 3) Brave fallback.
  const brave = await fetchLogoFromBrave(companyName);
  if (brave) return { logoUrl: brave, source: 'brave_search' };

  // 4) Clearbit last-resort.
  for (const d of candidateDomains) {
    try {
      const url = `https://logo.clearbit.com/${d}`;
      const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
        return { logoUrl: url, source: 'clearbit' };
      }
    } catch { /* try next */ }
  }

  return { logoUrl: null, source: null, message: `No logo found for "${companyName}". Try providing a direct image URL.` };
}

export {
  fetchLogoUrl,
  storeLogo,
  fetchAndStoreLogo,
  storeProvidedLogo,
  searchLogoViaBrave
};
