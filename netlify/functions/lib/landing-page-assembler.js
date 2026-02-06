/**
 * Landing Page Assembler — creates and manages generic landing pages.
 * Matches the creation logic from GenericLandingPageContext.tsx.
 *
 * These are partner-branded marketing pages with contact forms,
 * pricing calculators, FAQs, and testimonials.
 */

/**
 * Generate a unique token for public page access.
 * Matches: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
 */
function generateUniqueToken() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Create a new generic landing page.
 *
 * @param {object} supabase - Supabase client (service role)
 * @param {string} userId - Current user's ID
 * @param {object} input - Page creation input
 * @param {string} input.partnerName - Partner/company name (required)
 * @param {string} input.partnerLogoUrl - Logo URL (optional)
 * @param {string} input.partnerLogoColor - SVG color override (optional, default: '#003756')
 * @param {string} input.clientEmail - Client email (optional)
 * @param {string} input.customMessage - Custom message on the page (optional)
 * @param {object} input.customization - Page customization options
 * @param {string} input.customization.contactFirstName - Contact first name
 * @param {string} input.customization.contactLastName - Contact last name
 * @param {string} input.customization.customNote - Custom note
 * @param {boolean} input.customization.includePricingCalculator - Show calculator (default: true)
 * @param {boolean} input.customization.includeTestimonials - Show testimonials (default: true)
 * @param {boolean} input.customization.includeFAQ - Show FAQ (default: true)
 * @param {string} input.customization.theme - 'default' or 'corporate' (default: 'default')
 * @param {boolean} input.isReturningClient - Show returning client messaging (default: false)
 * @param {string} input.status - 'draft' or 'published' (default: 'published')
 * @returns {object} { page, url, uniqueToken }
 */
async function createLandingPage(supabase, userId, input) {
  if (!input.partnerName) {
    throw new Error('partnerName is required');
  }

  const now = new Date().toISOString();
  const uniqueToken = generateUniqueToken();

  // Build the page data (matches GenericLandingPageData type)
  const pageData = {
    partnerName: input.partnerName,
    partnerLogoUrl: input.partnerLogoUrl || null,
    partnerLogoColor: input.partnerLogoColor || '#003756',
    clientEmail: input.clientEmail || null,
    customMessage: input.customMessage || null,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  // Build customization with defaults
  const customization = {
    contactFirstName: '',
    contactLastName: '',
    customNote: '',
    includePricingCalculator: true,
    includeTestimonials: true,
    includeFAQ: true,
    theme: 'default',
    ...(input.customization || {})
  };

  // Handle logo storage if a URL is provided
  if (input.partnerLogoUrl && input.storeLogoCopy !== false) {
    try {
      const storedUrl = await storePartnerLogo(supabase, input.partnerLogoUrl, input.partnerName);
      if (storedUrl) {
        pageData.partnerLogoUrl = storedUrl;
      }
    } catch (logoErr) {
      console.warn('Logo storage failed, using provided URL:', logoErr.message);
    }
  }

  // Insert into Supabase
  const insertData = {
    data: pageData,
    customization,
    is_editable: true,
    user_id: userId,
    status: input.status || 'published',
    unique_token: uniqueToken,
    custom_url: null,
    is_returning_client: input.isReturningClient || false
  };

  const { data: newPage, error } = await supabase
    .from('generic_landing_pages')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create landing page: ${error.message}`);
  }

  const url = `https://proposals.getshortcut.co/generic-landing-page/${uniqueToken}`;

  return {
    page: newPage,
    url,
    uniqueToken
  };
}

/**
 * Update an existing landing page.
 *
 * @param {object} supabase - Supabase client
 * @param {string} pageId - Landing page ID
 * @param {object} updates - Fields to update
 * @returns {object} { page, url }
 */
async function updateLandingPage(supabase, pageId, updates) {
  // Fetch existing page
  const { data: existing, error: fetchError } = await supabase
    .from('generic_landing_pages')
    .select('*')
    .eq('id', pageId)
    .single();

  if (fetchError || !existing) {
    throw new Error(`Landing page ${pageId} not found`);
  }

  const updatePayload = {
    updated_at: new Date().toISOString()
  };

  // Merge data updates
  if (updates.data) {
    const mergedData = {
      ...existing.data,
      ...updates.data,
      updatedAt: new Date().toISOString()
    };
    updatePayload.data = mergedData;
  }

  // Merge customization updates
  if (updates.customization) {
    updatePayload.customization = {
      ...(existing.customization || {}),
      ...updates.customization
    };
  }

  // Direct field updates
  if (updates.status !== undefined) {
    updatePayload.status = updates.status;
  }
  if (updates.isEditable !== undefined) {
    updatePayload.is_editable = updates.isEditable;
  }
  if (updates.isReturningClient !== undefined) {
    // Strict boolean conversion (matching context logic)
    updatePayload.is_returning_client =
      updates.isReturningClient === true ||
      updates.isReturningClient === 'true' ||
      updates.isReturningClient === 1 ||
      updates.isReturningClient === '1';
  }

  const { data: updated, error: updateError } = await supabase
    .from('generic_landing_pages')
    .update(updatePayload)
    .eq('id', pageId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update landing page: ${updateError.message}`);
  }

  const url = `https://proposals.getshortcut.co/generic-landing-page/${updated.unique_token}`;

  return { page: updated, url };
}

/**
 * Get a landing page by ID.
 *
 * @param {object} supabase - Supabase client
 * @param {string} pageId - Landing page ID
 * @returns {object} { page, url }
 */
async function getLandingPage(supabase, pageId) {
  const { data: page, error } = await supabase
    .from('generic_landing_pages')
    .select('*')
    .eq('id', pageId)
    .single();

  if (error || !page) {
    throw new Error(`Landing page ${pageId} not found`);
  }

  const url = `https://proposals.getshortcut.co/generic-landing-page/${page.unique_token}`;

  return { page, url };
}

/**
 * Search landing pages by partner name.
 *
 * @param {object} supabase - Supabase client
 * @param {string} searchTerm - Search term
 * @returns {object} { results }
 */
async function searchLandingPages(supabase, searchTerm) {
  const { data, error } = await supabase
    .from('generic_landing_pages')
    .select('id, data, status, unique_token, is_returning_client, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  // Filter by partner name (JSONB field, so we filter in JS)
  const term = searchTerm.toLowerCase();
  const results = (data || []).filter(page => {
    const name = page.data?.partnerName || '';
    return name.toLowerCase().includes(term);
  }).map(page => ({
    id: page.id,
    partnerName: page.data?.partnerName,
    partnerLogoUrl: page.data?.partnerLogoUrl,
    status: page.status,
    isReturningClient: page.is_returning_client,
    url: `https://proposals.getshortcut.co/generic-landing-page/${page.unique_token}`,
    createdAt: page.created_at,
    updatedAt: page.updated_at
  }));

  return { results };
}

/**
 * Store a partner logo in Supabase storage.
 * Tries the primary bucket, falls back to the holiday-page-assets bucket.
 *
 * @param {object} supabase - Supabase client
 * @param {string} logoUrl - URL to download the logo from
 * @param {string} partnerName - Partner name (for file naming)
 * @returns {string|null} Public URL of the stored logo, or null if storage failed
 */
async function storePartnerLogo(supabase, logoUrl, partnerName) {
  try {
    // Download the image
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.warn(`Failed to download logo from ${logoUrl}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    let ext = 'png';
    if (contentType.includes('svg')) ext = 'svg';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    else if (contentType.includes('webp')) ext = 'webp';

    const buffer = await response.arrayBuffer();
    const fileName = `partner-logos/${Date.now()}.${ext}`;

    // Try primary bucket
    let bucket = 'generic-landing-page-assets';
    let { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, { contentType });

    // Fallback to holiday-page-assets bucket
    if (uploadError) {
      bucket = 'holiday-page-assets';
      const fallback = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, { contentType });

      if (fallback.error) {
        console.warn('Logo upload failed on both buckets:', fallback.error.message);
        return null;
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err) {
    console.warn('Logo storage error:', err.message);
    return null;
  }
}

export {
  createLandingPage,
  updateLandingPage,
  getLandingPage,
  searchLandingPages,
  storePartnerLogo,
  generateUniqueToken
};
