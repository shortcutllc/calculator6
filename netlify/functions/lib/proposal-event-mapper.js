/**
 * Maps a Supabase proposal record to one or more coordinator event payloads.
 *
 * A single proposal can produce multiple events — one per unique
 * (location, date) combination found in the proposal's services.
 *
 * The output matches the field schema expected by the coordinator's
 * `addEvent` Parse Cloud Function.
 */

// Service type mapping: proposal serviceType → coordinator service title
const SERVICE_TYPE_MAP = {
  'massage': 'Massage',
  'chair-massage': 'Chair Massage',
  'table-massage': 'Table Massage',
  'facial': 'Facial',
  'hair': 'Hair',
  'nails': 'Nails',
  'nails-hand-massage': 'Nails & Hand Massage',
  'headshot': 'Headshot',
  'mindfulness': 'Mindfulness',
  'makeup': 'Makeup',
};

// Category mapping for coordinator
const SERVICE_CATEGORY_MAP = {
  'massage': 'Office',
  'chair-massage': 'Office',
  'table-massage': 'Office',
  'facial': 'Office',
  'hair': 'Office',
  'nails': 'Office',
  'nails-hand-massage': 'Office',
  'headshot': 'Office',
  'mindfulness': 'Office',
  'makeup': 'Office',
};

/**
 * Parse a date string (e.g. "March 15, 2026" or "2026-03-15") into a Date object.
 */
function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Build the service offerings array for an event from the proposal services
 * at a specific location+date.
 */
function buildServiceOfferings(services) {
  const offerings = [];
  const seen = new Set();

  for (const service of services) {
    const serviceType = service.serviceType || '';
    const title = SERVICE_TYPE_MAP[serviceType] || serviceType;

    // Deduplicate by title
    if (seen.has(title)) continue;
    seen.add(title);

    offerings.push({
      id: serviceType, // placeholder — coordinator may assign real IDs
      serviceTitle: title,
      price: service.serviceCost ? Math.round(service.serviceCost / (service.totalAppointments || 1)) : 0
    });
  }

  return offerings;
}

/**
 * Calculate event timing from services.
 * Uses the earliest service start (defaults to 9 AM) and the longest totalHours.
 */
function buildEventTimes(dateStr, services) {
  const date = parseEventDate(dateStr);
  if (!date) return { startTime: null, endTime: null };

  // Default start at 9:00 AM
  const startTime = new Date(date);
  startTime.setHours(9, 0, 0, 0);

  // End time = start + max totalHours across all services
  const maxHours = Math.max(...services.map(s => s.totalHours || 4));
  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + maxHours);

  return { startTime, endTime };
}

/**
 * Calculate total pros needed (sum across services for this date+location).
 */
function calcTotalPros(services) {
  return services.reduce((sum, s) => sum + (s.numPros || 1), 0);
}

/**
 * Calculate average appointment length in minutes from services.
 */
function calcAvgAppointmentLength(services) {
  const lengths = services.map(s => s.appTime || 20).filter(Boolean);
  if (!lengths.length) return 20;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

/**
 * Calculate barber hourly rate (average proHourly across services).
 */
function calcBarberHourlyRate(services) {
  const rates = services.map(s => s.proHourly || 50).filter(Boolean);
  if (!rates.length) return 50;
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

/**
 * Calculate total event payment from services.
 */
function calcPayment(services) {
  return Math.round(services.reduce((sum, s) => sum + (s.serviceCost || 0), 0));
}

/**
 * Main mapping function.
 *
 * @param {Object} proposal - The raw proposal row from Supabase
 * @returns {Array<Object>} - Array of event payloads for the coordinator
 */
export function mapProposalToEvents(proposal) {
  const data = proposal.data;
  if (!data || !data.services) return [];

  const events = [];
  const clientName = data.clientName || proposal.client_name || 'Unknown Client';
  const clientEmail = data.clientEmail || proposal.client_email || '';

  // Iterate: location → date → services[]
  for (const [location, dateMap] of Object.entries(data.services)) {
    for (const [dateStr, dateData] of Object.entries(dateMap)) {
      const services = dateData.services || [];
      if (!services.length) continue;

      const { startTime, endTime } = buildEventTimes(dateStr, services);
      if (!startTime) continue;

      const serviceOfferings = buildServiceOfferings(services);
      const numBarbersRequired = calcTotalPros(services);
      const lengthPerService = calcAvgAppointmentLength(services);
      const barberHourlyRate = calcBarberHourlyRate(services);
      const payment = calcPayment(services);

      // Build the event payload matching the coordinator's addEvent schema
      const eventPayload = {
        // Basic info
        name: clientName,
        category: 'Office',
        description: `Event for ${clientName}`,
        mobileEventCode: generateEventCode(clientName, dateStr),
        locationDescription: location,

        // Address — placeholder, needs real address from proposal
        address: {
          street: location,
          city: '',
          state: '',
          zip: '',
          country: 'US'
        },

        // Contact from proposal
        contacts: [{
          name: clientName,
          phone: '',
          email: clientEmail
        }],

        // Financial
        payment,
        barberHourlyRate: Math.max(30, Math.min(200, barberHourlyRate)),
        numBarbersRequired,

        // Services
        serviceOfferings,

        // Timing
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        lengthPerService,
        signupsPerTimeslot: 1,

        // Defaults
        isSecret: false,
        doesNotRequireTimeslots: false,
        sendAutoEmailsManually: false,
        allowMultipleReservations: false,
        overrideNameCheck: false,
        isTestEvent: false,
        isOutbound: false,

        // Metadata — link back to proposal
        _proposalId: proposal.id,
        _proposalLocation: location,
        _proposalDate: dateStr,
      };

      events.push(eventPayload);
    }
  }

  return events;
}

/**
 * Generate a short event code from client name + date.
 * E.g., "BURB-0315" for Burberry on March 15.
 */
function generateEventCode(clientName, dateStr) {
  const prefix = (clientName || 'EVT')
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase();

  const date = parseEventDate(dateStr);
  const suffix = date
    ? `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    : Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${prefix}-${suffix}`;
}
