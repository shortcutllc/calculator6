/**
 * Client Lookup — queries the existing proposals table to find
 * client data (email, logo, locations, contacts) from past proposals.
 *
 * No new database table needed — aggregates from existing proposal data.
 */

/**
 * Search for clients by name (partial match).
 * Returns aggregated client data from all matching proposals.
 *
 * @param {object} supabase - Initialized Supabase client (service role)
 * @param {string} searchTerm - Client name to search for
 * @returns {object} { found, results }
 */
async function searchClients(supabase, searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw new Error('searchTerm is required');
  }

  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id, client_name, client_email, client_logo_url, data, created_at, updated_at, status, proposal_type')
    .ilike('client_name', `%${searchTerm.trim()}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  if (!proposals || proposals.length === 0) {
    return { found: false, results: [] };
  }

  // Group by client name (case-insensitive)
  const clientMap = {};

  proposals.forEach(proposal => {
    const normalizedName = proposal.client_name.trim().toLowerCase();

    if (!clientMap[normalizedName]) {
      clientMap[normalizedName] = {
        name: proposal.client_name.trim(),
        emails: new Set(),
        logoUrls: new Set(),
        locations: new Set(),
        contacts: new Set(),
        proposalCount: 0,
        lastProposalDate: null,
        proposals: []
      };
    }

    const client = clientMap[normalizedName];
    client.proposalCount++;

    // Track most recent proposal date
    if (!client.lastProposalDate || proposal.created_at > client.lastProposalDate) {
      client.lastProposalDate = proposal.created_at;
    }

    // Collect email
    if (proposal.client_email) {
      client.emails.add(proposal.client_email);
    }

    // Collect logo URL
    if (proposal.client_logo_url) {
      client.logoUrls.add(proposal.client_logo_url);
    }

    // Extract locations and contacts from proposal data
    if (proposal.data) {
      if (proposal.data.locations && Array.isArray(proposal.data.locations)) {
        proposal.data.locations.forEach(loc => client.locations.add(loc));
      }
      if (proposal.data.clientEmail) {
        client.emails.add(proposal.data.clientEmail);
      }
      if (proposal.data.clientLogoUrl) {
        client.logoUrls.add(proposal.data.clientLogoUrl);
      }
    }

    // Extract contact names from customization
    if (proposal.data && proposal.data.customization) {
      const custom = proposal.data.customization;
      if (custom.contactFirstName || custom.contactLastName) {
        const name = `${custom.contactFirstName || ''} ${custom.contactLastName || ''}`.trim();
        if (name) client.contacts.add(name);
      }
    }

    // Add to proposals list (summary for search results)
    client.proposals.push({
      id: proposal.id,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      status: proposal.status,
      totalCost: proposal.data?.summary?.totalEventCost || 0,
      totalAppointments: proposal.data?.summary?.totalAppointments || 0,
      locations: proposal.data?.locations || [],
      eventDates: proposal.data?.eventDates || [],
      proposalType: proposal.proposal_type || 'event',
      serviceTypes: extractServiceTypes(proposal.data)
    });
  });

  // Convert Sets to Arrays and build result
  const results = Object.values(clientMap).map(client => ({
    name: client.name,
    email: Array.from(client.emails)[0] || null, // Most recent email
    emails: Array.from(client.emails),
    logoUrl: Array.from(client.logoUrls)[0] || null, // Most recent logo
    locations: Array.from(client.locations),
    contacts: Array.from(client.contacts),
    proposalCount: client.proposalCount,
    lastProposalDate: client.lastProposalDate,
    proposals: client.proposals,
    source: 'existing_proposals'
  }));

  return {
    found: results.length > 0,
    results
  };
}

/**
 * Get client data from the most recent proposal for an exact client name.
 * Used for auto-populating new proposals for repeat clients.
 *
 * @param {object} supabase - Initialized Supabase client (service role)
 * @param {string} clientName - Exact client name
 * @returns {object} { found, client }
 */
async function getClientByName(supabase, clientName) {
  if (!clientName || clientName.trim().length === 0) {
    throw new Error('clientName is required');
  }

  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id, client_name, client_email, client_logo_url, data, customization, created_at')
    .ilike('client_name', clientName.trim())
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  if (!proposals || proposals.length === 0) {
    return { found: false, client: null };
  }

  // Aggregate data from all proposals for this client
  const emails = new Set();
  const logoUrls = new Set();
  const locations = new Set();
  const contacts = new Set();

  proposals.forEach(proposal => {
    if (proposal.client_email) emails.add(proposal.client_email);
    if (proposal.client_logo_url) logoUrls.add(proposal.client_logo_url);

    if (proposal.data) {
      if (proposal.data.clientEmail) emails.add(proposal.data.clientEmail);
      if (proposal.data.clientLogoUrl) logoUrls.add(proposal.data.clientLogoUrl);
      if (proposal.data.locations) {
        proposal.data.locations.forEach(loc => locations.add(loc));
      }
    }

    if (proposal.customization) {
      const custom = proposal.customization;
      if (custom.contactFirstName || custom.contactLastName) {
        const name = `${custom.contactFirstName || ''} ${custom.contactLastName || ''}`.trim();
        if (name) contacts.add(name);
      }
    }
  });

  return {
    found: true,
    client: {
      name: proposals[0].client_name.trim(),
      email: Array.from(emails)[0] || null,
      logoUrl: Array.from(logoUrls)[0] || null,
      locations: Array.from(locations),
      contacts: Array.from(contacts),
      proposalCount: proposals.length,
      lastProposalDate: proposals[0].created_at,
      source: 'existing_proposals'
    }
  };
}

/**
 * Search proposals with summary data (used by the GET ?search= endpoint).
 *
 * @param {object} supabase - Initialized Supabase client
 * @param {string} searchTerm - Client name to search for
 * @returns {object} { results }
 */
async function searchProposals(supabase, searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw new Error('searchTerm is required');
  }

  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id, client_name, client_email, data, created_at, updated_at, status, proposal_type')
    .ilike('client_name', `%${searchTerm.trim()}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  const results = (proposals || []).map(proposal => ({
    id: proposal.id,
    clientName: proposal.client_name,
    createdAt: proposal.created_at,
    updatedAt: proposal.updated_at,
    status: proposal.status,
    totalCost: proposal.data?.summary?.totalEventCost || 0,
    totalAppointments: proposal.data?.summary?.totalAppointments || 0,
    locations: proposal.data?.locations || [],
    eventDates: proposal.data?.eventDates || [],
    proposalType: proposal.proposal_type || 'event',
    serviceTypes: extractServiceTypes(proposal.data)
  }));

  return { results };
}

/**
 * Extract unique service types from proposal data.
 */
function extractServiceTypes(data) {
  if (!data || !data.services) return [];

  const types = new Set();
  Object.values(data.services).forEach(locationData => {
    Object.values(locationData).forEach(dateData => {
      if (dateData.services && Array.isArray(dateData.services)) {
        dateData.services.forEach(service => {
          if (service.serviceType) types.add(service.serviceType);
        });
      }
    });
  });

  return Array.from(types);
}

export {
  searchClients,
  getClientByName,
  searchProposals
};
