/**
 * Logo Fetcher — finds company logos and stores them in Supabase storage.
 *
 * Strategy:
 * 1. Try Clearbit Logo API (most reliable, free, no API key needed)
 * 2. If Clearbit fails, return null (OpenClaw can use Brave Search as fallback)
 * 3. Always store a copy in Supabase — external URLs break over time
 */

/**
 * Attempt to fetch a company logo URL via Clearbit.
 * Clearbit serves logos at https://logo.clearbit.com/{domain}
 *
 * @param {string} companyName - Company name (e.g., "Burberry")
 * @param {string} [domain] - Optional explicit domain (e.g., "burberry.com")
 * @returns {string|null} Logo URL or null if not found
 */
async function fetchLogoUrl(companyName, domain) {
  // Try to construct the domain from the company name if not provided
  const domains = [];
  if (domain) {
    domains.push(domain);
  }
  // Common domain patterns
  const sanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  domains.push(`${sanitized}.com`);
  domains.push(`${sanitized}.co`);
  domains.push(`${sanitized}.io`);

  for (const d of domains) {
    const url = `https://logo.clearbit.com/${d}`;
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (response.ok) {
        // Verify it's actually an image
        const contentType = response.headers.get('content-type') || '';
        if (contentType.startsWith('image/')) {
          return url;
        }
      }
    } catch (err) {
      // Clearbit didn't have this domain, try next
      continue;
    }
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

export {
  fetchLogoUrl,
  storeLogo,
  fetchAndStoreLogo,
  storeProvidedLogo
};
