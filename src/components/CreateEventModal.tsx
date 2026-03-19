import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { Proposal, Service } from '../types/proposal';
import { Button } from './Button';
import { createCoordinatorEvents } from '../services/generateProposalApi';

// --- Types ---

interface CoordinatorService {
  id: string;
  title: string;
  type?: string; // Massage, Nails, Hair, Beauty, Photo, Mindfulness
  mainPhoto?: string;
}

interface EventFormAddress {
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface EventFormService {
  proposalServiceType: string;
  proposalNumPros: number;
  proposalTotalHours: number;
  proposalAppTime: number;
  coordinatorServiceId: string;
  coordinatorServiceTitle: string;
  coordinatorServiceType: string;
  price: number;
}

interface EventFormData {
  included: boolean;
  expanded: boolean;
  // Basic
  name: string;
  eventCode: string;
  category: string;
  description: string;
  locationName: string;
  // Address
  address: EventFormAddress;
  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  // Timing
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  eventDate: string;  // YYYY-MM-DD or display string
  lengthPerService: number;
  signupsPerTimeslot: number;
  // Services
  services: EventFormService[];
  // Financial
  numPros: number;
  hourlyRate: number;
  payment: number;
  taxRate: string;
  // Optional fields
  legacyName: string;
  eventLinkURL: string;
  sponsorName: string;
  overrideNameCheck: boolean;
  isTestEvent: boolean;
  isSecret: boolean;
  doesNotRequireTimeslots: boolean;
  sendAutoEmailsManually: boolean;
  allowMultipleReservations: boolean;
  managerPassword: string;
  staffNotes: string;
  adminNotes: string;
  clientLogoUrl: string;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal;
  proposalId: string;
  surveyResponse?: any | null;
  onSuccess?: (events: any[]) => void;
}

// --- Real coordinator services from Parse EventService table ---

const COORDINATOR_SERVICES: CoordinatorService[] = [
  // Massage
  { id: 'm_01', title: 'Compression Massage', type: 'Massage' },
  { id: 'm_02', title: 'Sports Massage', type: 'Massage' },
  { id: 'm_03', title: 'Chair Massage', type: 'Massage' },
  { id: 'm_04', title: 'Table Massage', type: 'Massage' },
  // Nails
  { id: 'mani_01', title: 'Classic Manicure', type: 'Nails' },
  { id: 'mani_02', title: 'Nail Clean Up', type: 'Nails' },
  { id: 'mani_03', title: 'Gel Manicure', type: 'Nails' },
  { id: 'mani_04', title: 'Gel Removal', type: 'Nails' },
  { id: 'nails_handmassage_01', title: 'Manicure + Hand Massage', type: 'Nails' },
  { id: 'pedi_01', title: 'Dry Pedicure', type: 'Nails' },
  // Hair
  { id: 'e_01', title: 'Haircut', type: 'Hair' },
  { id: 'e_02', title: 'Haircut and Beard Trim', type: 'Hair' },
  { id: 'e_03', title: 'Haircut with Styling', type: 'Hair' },
  { id: 'e_04', title: 'Blowout', type: 'Hair' },
  { id: 'e_05', title: 'Shave', type: 'Hair' },
  { id: 'e_06', title: "Men's Styling", type: 'Hair' },
  { id: 'e_07', title: 'Beard Trim', type: 'Hair' },
  { id: 'e_bb_01', title: 'Quick Clean Up', type: 'Hair' },
  { id: 'e_edc_01', title: 'Spray Color', type: 'Hair' },
  { id: 'e_k_01', title: 'Kids Cut', type: 'Hair' },
  { id: 'e_w_01', title: 'Quick Trim', type: 'Hair' },
  { id: 'e_w_02', title: "Women's Styling", type: 'Hair' },
  { id: 'hair_haircutblowout_01', title: 'Haircut with Blowout', type: 'Hair' },
  { id: 'hair_makeup_01', title: 'Hair + Makeup', type: 'Hair' },
  { id: 'med_nyc_01', title: 'Short Haircut', type: 'Hair' },
  { id: 'med_nyc_02', title: 'Long Haircut', type: 'Hair' },
  // Beauty
  { id: 'beauty_01', title: 'Brow Wax', type: 'Beauty' },
  { id: 'beauty_02', title: 'Brow Tweeze', type: 'Beauty' },
  { id: 'beauty_03', title: 'Brow Tint', type: 'Beauty' },
  { id: 'beauty_04', title: 'Eyelash Tint', type: 'Beauty' },
  { id: 'beauty_05', title: 'Lip Wax', type: 'Beauty' },
  { id: 'beauty_06', title: 'Facial', type: 'Beauty' },
  { id: 'makeup_01', title: 'Makeup', type: 'Beauty' },
  // Photo
  { id: 'headshot_01', title: 'Headshot, Hair + Make-up', type: 'Photo' },
  { id: 'headshot_02', title: 'Headshot + Make-up Only', type: 'Photo' },
  { id: 'headshot_03', title: 'Headshot + Hair Only', type: 'Photo' },
  { id: 'headshot_04', title: 'Headshot Only', type: 'Photo' },
  // Mindfulness
  { id: 'mindfulness_01', title: 'Introduction to Mindfulness', type: 'Mindfulness' },
  { id: 'mindfulness_02', title: 'Mindfulness Drop-in Session', type: 'Mindfulness' },
  { id: 'mindfulness_03', title: '6-Week Mindfulness Program', type: 'Mindfulness' },
];

// --- Service matching: proposal serviceType → coordinator service type ---

// Maps proposal service types to coordinator service types for filtering dropdowns
const PROPOSAL_TO_COORDINATOR_TYPE: Record<string, string> = {
  'massage': 'Massage',
  'chair-massage': 'Massage',
  'table-massage': 'Massage',
  'facial': 'Beauty',
  'hair': 'Hair',
  'nails': 'Nails',
  'nails-hand-massage': 'Nails',
  'headshot': 'Photo',
  'mindfulness': 'Mindfulness',
  'makeup': 'Beauty',
};

// Default auto-select for each proposal service type (best initial match)
const DEFAULT_SERVICE_MATCH: Record<string, string> = {
  'massage': 'm_03',           // Chair Massage
  'chair-massage': 'm_03',    // Chair Massage
  'table-massage': 'm_04',    // Table Massage
  'facial': 'beauty_06',      // Facial
  'hair': 'e_01',             // Haircut
  'nails': 'mani_01',         // Classic Manicure
  'nails-hand-massage': 'nails_handmassage_01',
  'headshot': 'headshot_04',  // Headshot Only
  'mindfulness': 'mindfulness_01', // Introduction to Mindfulness
  'makeup': 'makeup_01',      // Makeup
};

function findBestServiceMatch(proposalServiceType: string): CoordinatorService | null {
  const type = proposalServiceType.toLowerCase();

  // Try default match first
  const defaultId = DEFAULT_SERVICE_MATCH[type];
  if (defaultId) {
    const match = COORDINATOR_SERVICES.find(s => s.id === defaultId);
    if (match) return match;
  }

  // Fall back to type-based filter and pick first
  const coordinatorType = PROPOSAL_TO_COORDINATOR_TYPE[type];
  if (coordinatorType) {
    const match = COORDINATOR_SERVICES.find(s => s.type === coordinatorType);
    if (match) return match;
  }

  // Last resort: title keyword match
  const titleMatch = COORDINATOR_SERVICES.find(s =>
    s.title.toLowerCase().includes(type) || type.includes(s.title.toLowerCase())
  );
  return titleMatch || null;
}

/** Get filtered services for a proposal service type dropdown */
function getServicesForProposalType(proposalServiceType: string): CoordinatorService[] {
  const type = proposalServiceType.toLowerCase();
  const coordinatorType = PROPOSAL_TO_COORDINATOR_TYPE[type];
  if (coordinatorType) {
    return COORDINATOR_SERVICES.filter(s => s.type === coordinatorType);
  }
  // If no mapping, show all
  return COORDINATOR_SERVICES;
}

// --- Address parsing ---

function parseAddressString(addressStr: string): Partial<EventFormAddress> {
  if (!addressStr) return {};

  // Try to parse "123 Main St, New York, NY 10001" format
  const parts = addressStr.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 1].trim().split(/\s+/);
    return {
      street: parts.slice(0, parts.length - 2).join(', '),
      city: parts[parts.length - 2],
      state: stateZip[0] || '',
      zip: stateZip[1] || '',
    };
  } else if (parts.length === 2) {
    return { street: parts[0], city: parts[1] };
  }
  return { street: addressStr };
}

// --- Date helpers ---

function parseProposalDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function generateEventCode(clientName: string, dateStr: string): string {
  const prefix = (clientName || 'EVT')
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase();
  const d = new Date(dateStr);
  const suffix = !isNaN(d.getTime())
    ? `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    : Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

// --- Build initial form data from proposal ---

function buildInitialEvents(proposal: Proposal, surveyResponse?: any): EventFormData[] {
  const data = proposal.data;
  if (!data?.services) return [];

  const events: EventFormData[] = [];
  const clientName = data.clientName || proposal.clientName || '';
  const clientEmail = data.clientEmail || proposal.clientEmail || '';

  // Try to extract phone from survey point_of_contact
  let contactPhone = '';
  if (surveyResponse?.point_of_contact) {
    const phoneMatch = surveyResponse.point_of_contact.match(/[\d\-\(\)\+\s]{7,}/);
    if (phoneMatch) contactPhone = phoneMatch[0].trim();
  }

  for (const [location, dateMap] of Object.entries(data.services)) {
    for (const [dateStr, dateData] of Object.entries(dateMap as Record<string, any>)) {
      const services: Service[] = dateData.services || [];
      if (!services.length) continue;

      // Get address for this location
      let addressData: Partial<EventFormAddress> = {};
      if (data.officeLocations?.[location]) {
        addressData = parseAddressString(data.officeLocations[location]);
      } else if (data.officeLocation) {
        addressData = parseAddressString(data.officeLocation);
      } else if (surveyResponse?.office_address) {
        // Try parsing survey address (could be JSON for multi-location)
        try {
          const parsed = JSON.parse(surveyResponse.office_address);
          if (parsed[location]) {
            addressData = parseAddressString(parsed[location]);
          }
        } catch {
          addressData = parseAddressString(surveyResponse.office_address);
        }
      }

      // Map services with smart matching
      const formServices: EventFormService[] = services.map(s => {
        const match = findBestServiceMatch(s.serviceType || '');
        return {
          proposalServiceType: s.serviceType || '',
          proposalNumPros: s.numPros || 1,
          proposalTotalHours: s.totalHours || 4,
          proposalAppTime: s.appTime || 20,
          coordinatorServiceId: match?.id || '',
          coordinatorServiceTitle: match?.title || '',
          coordinatorServiceType: match?.type || '',
          price: s.serviceCost ? Math.round(s.serviceCost / (s.totalAppointments || 1)) : 0,
        };
      });

      const maxHours = Math.max(...services.map(s => s.totalHours || 4));
      const totalPros = services.reduce((sum, s) => sum + (s.numPros || 1), 0);
      const avgRate = Math.round(
        services.reduce((sum, s) => sum + (s.proHourly || 50), 0) / services.length
      );
      const totalPayment = Math.round(
        services.reduce((sum, s) => sum + (s.serviceCost || 0), 0)
      );
      const avgAppTime = Math.round(
        services.reduce((sum, s) => sum + (s.appTime || 20), 0) / services.length
      );

      events.push({
        included: true,
        expanded: events.length === 0,
        name: clientName,
        eventCode: generateEventCode(clientName, dateStr),
        category: 'Office',
        description: `Event for ${clientName}`,
        locationName: location,
        address: {
          street: addressData.street || '',
          unit: '',
          city: addressData.city || '',
          state: addressData.state || '',
          zip: addressData.zip || '',
          country: 'US',
        },
        contactName: clientName,
        contactEmail: clientEmail,
        contactPhone: contactPhone,
        startTime: '09:00',
        endTime: `${String(9 + maxHours).padStart(2, '0')}:00`,
        eventDate: parseProposalDate(dateStr),
        lengthPerService: avgAppTime,
        signupsPerTimeslot: 1,
        services: formServices,
        numPros: totalPros,
        hourlyRate: Math.max(30, Math.min(200, avgRate)),
        payment: totalPayment,
        taxRate: '',
        // Optional fields
        legacyName: '',
        eventLinkURL: '',
        sponsorName: totalPayment <= 0 ? clientName : '',
        overrideNameCheck: false,
        isTestEvent: false,
        isSecret: false,
        doesNotRequireTimeslots: false,
        sendAutoEmailsManually: false,
        allowMultipleReservations: false,
        managerPassword: '',
        staffNotes: '',
        adminNotes: '',
        clientLogoUrl: data.clientLogoUrl || proposal.clientLogoUrl || '',
      });
    }
  }

  return events;
}

// --- Validation ---

interface ValidationIssue {
  eventIndex: number;
  field: string;
  message: string;
}

function validateEvents(events: EventFormData[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  events.forEach((evt, i) => {
    if (!evt.included) return;
    if (!evt.name.trim()) issues.push({ eventIndex: i, field: 'name', message: 'Event name required' });
    if (!evt.locationName.trim()) issues.push({ eventIndex: i, field: 'locationName', message: 'Location description required' });
    if (!evt.contactEmail.trim()) issues.push({ eventIndex: i, field: 'contactEmail', message: 'Contact email required' });
    if (!evt.contactPhone.trim()) issues.push({ eventIndex: i, field: 'contactPhone', message: 'Contact phone missing' });
    if (!evt.address.street.trim()) issues.push({ eventIndex: i, field: 'address.street', message: 'Street address missing' });
    if (!evt.address.city.trim()) issues.push({ eventIndex: i, field: 'address.city', message: 'City missing' });
    if (!evt.address.state.trim()) issues.push({ eventIndex: i, field: 'address.state', message: 'State missing' });
    if (!evt.address.zip.trim()) issues.push({ eventIndex: i, field: 'address.zip', message: 'Zip code missing' });
    if (evt.services.some(s => !s.coordinatorServiceId)) {
      issues.push({ eventIndex: i, field: 'services', message: 'Service selection incomplete' });
    }
    if (evt.payment <= 0 && !evt.sponsorName.trim()) {
      issues.push({ eventIndex: i, field: 'sponsorName', message: 'Sponsor name required for free events' });
    }
  });
  return issues;
}

// --- Component ---

const CATEGORIES = ['Office', 'Hospital', 'Retail', 'Wedding', 'Festival', 'Residential', 'School', 'Pop-Up', 'Other'];

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  proposal,
  proposalId,
  surveyResponse,
  onSuccess
}) => {
  const [events, setEvents] = useState<EventFormData[]>([]);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && proposal) {
      setEvents(buildInitialEvents(proposal, surveyResponse));
      setResult(null);
    }
  }, [isOpen, proposal, surveyResponse]);

  const validationIssues = useMemo(() => validateEvents(events), [events]);
  const includedCount = events.filter(e => e.included).length;
  const warningCount = validationIssues.filter(v => {
    const evt = events[v.eventIndex];
    return evt?.included;
  }).length;

  if (!isOpen) return null;

  const updateEvent = (index: number, updates: Partial<EventFormData>) => {
    setEvents(prev => prev.map((e, i) => i === index ? { ...e, ...updates } : e));
  };

  const updateEventAddress = (index: number, field: keyof EventFormAddress, value: string) => {
    setEvents(prev => prev.map((e, i) =>
      i === index ? { ...e, address: { ...e.address, [field]: value } } : e
    ));
  };

  const updateEventService = (eventIndex: number, serviceIndex: number, serviceId: string) => {
    const service = COORDINATOR_SERVICES.find(s => s.id === serviceId);
    setEvents(prev => prev.map((e, i) => {
      if (i !== eventIndex) return e;
      const newServices = [...e.services];
      newServices[serviceIndex] = {
        ...newServices[serviceIndex],
        coordinatorServiceId: serviceId,
        coordinatorServiceTitle: service?.title || '',
        coordinatorServiceType: service?.type || '',
      };
      return { ...e, services: newServices };
    }));
  };

  const handleCreate = async () => {
    setCreating(true);
    setResult(null);
    try {
      const includedEvents = events.filter(e => e.included);
      const apiResult = await createCoordinatorEvents(proposalId, includedEvents);
      setResult({ success: true, message: `${apiResult.eventsCreated} event(s) created` });
      if (onSuccess) {
        onSuccess(apiResult.events || []);
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to create events' });
    } finally {
      setCreating(false);
    }
  };

  const hasFieldIssue = (eventIndex: number, field: string) => {
    return validationIssues.some(v => v.eventIndex === eventIndex && v.field === field);
  };

  const inputClass = (eventIndex: number, field: string) =>
    `w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
      hasFieldIssue(eventIndex, field) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-shortcut-blue">Create Events from Proposal</h2>
            <p className="text-sm text-text-dark-60 mt-1">
              Creating events for <span className="font-semibold">{proposal.data.clientName}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-text-dark-60 hover:text-shortcut-blue transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {events.length === 0 && (
            <div className="text-center text-text-dark-60 py-12">
              No events could be generated from this proposal.
            </div>
          )}

          {events.map((evt, eventIndex) => (
            <div
              key={eventIndex}
              className={`border-2 rounded-xl overflow-hidden transition-colors ${
                evt.included ? 'border-gray-200' : 'border-gray-100 opacity-50'
              }`}
            >
              {/* Event Card Header */}
              <div
                className="flex items-center justify-between px-5 py-3 bg-neutral-light-gray cursor-pointer"
                onClick={() => updateEvent(eventIndex, { expanded: !evt.expanded })}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={evt.included}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateEvent(eventIndex, { included: !evt.included });
                    }}
                    className="w-4 h-4 accent-shortcut-teal"
                  />
                  <div>
                    <span className="font-bold text-shortcut-blue text-sm">
                      EVENT {eventIndex + 1}
                    </span>
                    <span className="text-text-dark-60 text-sm ml-2">
                      {evt.locationName} &middot; {formatDisplayDate(evt.eventDate)}
                    </span>
                  </div>
                  {validationIssues.some(v => v.eventIndex === eventIndex) && evt.included && (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                {evt.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {/* Event Card Body */}
              {evt.expanded && (
                <div className="p-5 space-y-5">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Name *</label>
                      <input
                        value={evt.name}
                        onChange={(e) => updateEvent(eventIndex, { name: e.target.value })}
                        className={inputClass(eventIndex, 'name')}
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Code</label>
                      <input
                        value={evt.eventCode}
                        onChange={(e) => updateEvent(eventIndex, { eventCode: e.target.value.toUpperCase() })}
                        className={inputClass(eventIndex, 'eventCode')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Category</label>
                      <select
                        value={evt.category}
                        onChange={(e) => updateEvent(eventIndex, { category: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Location Description *</label>
                      <input
                        value={evt.locationName}
                        onChange={(e) => updateEvent(eventIndex, { locationName: e.target.value })}
                        className={inputClass(eventIndex, 'locationName')}
                        maxLength={40}
                        placeholder="e.g., Conference Room B"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Description</label>
                      <input
                        value={evt.description}
                        onChange={(e) => updateEvent(eventIndex, { description: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        maxLength={80}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-2">
                      Address {hasFieldIssue(eventIndex, 'address.street') && <span className="text-yellow-500 ml-1">⚠️</span>}
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        placeholder="Street address"
                        value={evt.address.street}
                        onChange={(e) => updateEventAddress(eventIndex, 'street', e.target.value)}
                        className={inputClass(eventIndex, 'address.street')}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="City"
                          value={evt.address.city}
                          onChange={(e) => updateEventAddress(eventIndex, 'city', e.target.value)}
                          className={inputClass(eventIndex, 'address.city')}
                        />
                        <input
                          placeholder="State"
                          value={evt.address.state}
                          onChange={(e) => updateEventAddress(eventIndex, 'state', e.target.value)}
                          className={inputClass(eventIndex, 'address.state')}
                          maxLength={2}
                        />
                        <input
                          placeholder="Zip"
                          value={evt.address.zip}
                          onChange={(e) => updateEventAddress(eventIndex, 'zip', e.target.value)}
                          className={inputClass(eventIndex, 'address.zip')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Contact Name</label>
                      <input
                        value={evt.contactName}
                        onChange={(e) => updateEvent(eventIndex, { contactName: e.target.value })}
                        className={inputClass(eventIndex, 'contactName')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Contact Email *</label>
                      <input
                        type="email"
                        value={evt.contactEmail}
                        onChange={(e) => updateEvent(eventIndex, { contactEmail: e.target.value })}
                        className={inputClass(eventIndex, 'contactEmail')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Contact Phone {hasFieldIssue(eventIndex, 'contactPhone') && <span className="text-yellow-500">⚠️</span>}
                      </label>
                      <input
                        type="tel"
                        value={evt.contactPhone}
                        onChange={(e) => updateEvent(eventIndex, { contactPhone: e.target.value })}
                        className={inputClass(eventIndex, 'contactPhone')}
                        placeholder="Required"
                      />
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Date</label>
                      <input
                        type="date"
                        value={evt.eventDate}
                        onChange={(e) => updateEvent(eventIndex, { eventDate: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Start Time</label>
                      <input
                        type="time"
                        value={evt.startTime}
                        onChange={(e) => updateEvent(eventIndex, { startTime: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">End Time</label>
                      <input
                        type="time"
                        value={evt.endTime}
                        onChange={(e) => updateEvent(eventIndex, { endTime: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Appt Length (min)</label>
                      <input
                        type="number"
                        value={evt.lengthPerService}
                        onChange={(e) => updateEvent(eventIndex, { lengthPerService: parseInt(e.target.value) || 20 })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        min={5}
                        max={120}
                      />
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-2">
                      Services {hasFieldIssue(eventIndex, 'services') && <span className="text-yellow-500">⚠️ Select coordinator service</span>}
                    </label>
                    <div className="space-y-2">
                      {evt.services.map((svc, svcIndex) => (
                        <div key={svcIndex} className="flex items-center gap-3 p-3 bg-neutral-light-gray rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-text-dark-60">
                              Proposal: <span className="font-semibold text-shortcut-blue">{svc.proposalServiceType}</span>
                              <span className="ml-2">({svc.proposalNumPros} pro{svc.proposalNumPros > 1 ? 's' : ''}, {svc.proposalTotalHours} hrs)</span>
                            </div>
                          </div>
                          <select
                            value={svc.coordinatorServiceId}
                            onChange={(e) => updateEventService(eventIndex, svcIndex, e.target.value)}
                            className={`px-3 py-1.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal ${
                              !svc.coordinatorServiceId ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                            }`}
                          >
                            <option value="">Select service...</option>
                            {/* Show filtered services matching the proposal type first, then all others */}
                            {(() => {
                              const filtered = getServicesForProposalType(svc.proposalServiceType);
                              const otherServices = COORDINATOR_SERVICES.filter(cs => !filtered.includes(cs));
                              return (
                                <>
                                  {filtered.map(cs => (
                                    <option key={cs.id} value={cs.id}>{cs.title}</option>
                                  ))}
                                  {otherServices.length > 0 && (
                                    <option disabled>── Other services ──</option>
                                  )}
                                  {otherServices.map(cs => (
                                    <option key={cs.id} value={cs.id}>{cs.title}</option>
                                  ))}
                                </>
                              );
                            })()}
                          </select>
                          <input
                            type="number"
                            value={svc.price}
                            onChange={(e) => {
                              setEvents(prev => prev.map((ev, i) => {
                                if (i !== eventIndex) return ev;
                                const newSvcs = [...ev.services];
                                newSvcs[svcIndex] = { ...newSvcs[svcIndex], price: parseInt(e.target.value) || 0 };
                                return { ...ev, services: newSvcs };
                              }));
                            }}
                            className="w-20 px-2 py-1.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal text-center"
                            placeholder="$"
                            min={0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Pros Required</label>
                      <input
                        type="number"
                        value={evt.numPros}
                        onChange={(e) => updateEvent(eventIndex, { numPros: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Hourly Rate ($)</label>
                      <input
                        type="number"
                        value={evt.hourlyRate}
                        onChange={(e) => updateEvent(eventIndex, { hourlyRate: parseInt(e.target.value) || 50 })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        min={30}
                        max={200}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Payment ($)</label>
                      <input
                        type="number"
                        value={evt.payment}
                        onChange={(e) => updateEvent(eventIndex, { payment: parseInt(e.target.value) || 0 })}
                        className={inputClass(eventIndex, 'payment')}
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">Tax Rate %</label>
                      <input
                        type="text"
                        value={evt.taxRate}
                        onChange={(e) => updateEvent(eventIndex, { taxRate: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Optional Settings (collapsible) */}
                  <details className="border-2 border-gray-100 rounded-lg">
                    <summary className="px-4 py-2.5 text-xs font-bold text-shortcut-blue cursor-pointer hover:bg-gray-50">
                      Additional Settings (optional)
                    </summary>
                    <div className="px-4 pb-4 pt-2 space-y-4">
                      {/* Names & Links */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-shortcut-blue mb-1">Previous Event Name</label>
                          <input
                            value={evt.legacyName}
                            onChange={(e) => updateEvent(eventIndex, { legacyName: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-shortcut-blue mb-1">
                            Event Sponsor {evt.payment <= 0 && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            value={evt.sponsorName}
                            onChange={(e) => updateEvent(eventIndex, { sponsorName: e.target.value })}
                            className={inputClass(eventIndex, 'sponsorName')}
                            placeholder={evt.payment <= 0 ? 'Required for free events' : 'Optional'}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-shortcut-blue mb-1">Event Link URL</label>
                          <input
                            value={evt.eventLinkURL}
                            onChange={(e) => updateEvent(eventIndex, { eventLinkURL: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="e.g., https://zoom.us/123"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-shortcut-blue mb-1">Manager Password</label>
                          <input
                            value={evt.managerPassword}
                            onChange={(e) => updateEvent(eventIndex, { managerPassword: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      {/* Logo */}
                      {evt.clientLogoUrl && (
                        <div className="flex items-center gap-3 p-3 bg-neutral-light-gray rounded-lg">
                          <img src={evt.clientLogoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
                          <span className="text-xs text-text-dark-60">Logo from proposal (will be uploaded to coordinator)</span>
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Notes for Pros</label>
                        <textarea
                          value={evt.staffNotes}
                          onChange={(e) => updateEvent(eventIndex, { staffNotes: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                          rows={2}
                          placeholder="Any notes for our Pros?"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Notes for Admins (private)</label>
                        <textarea
                          value={evt.adminNotes}
                          onChange={(e) => updateEvent(eventIndex, { adminNotes: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                          rows={2}
                          placeholder="Staffing requirements?"
                        />
                      </div>

                      {/* Checkboxes */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'isTestEvent', label: 'Test event' },
                          { key: 'isSecret', label: 'Hide from public' },
                          { key: 'doesNotRequireTimeslots', label: 'Do not require signups' },
                          { key: 'sendAutoEmailsManually', label: 'Send auto emails manually' },
                          { key: 'allowMultipleReservations', label: 'Allow multiple reservations' },
                          { key: 'overrideNameCheck', label: 'Override name check' },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 text-xs text-text-dark-60 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(evt as any)[key]}
                              onChange={(e) => updateEvent(eventIndex, { [key]: e.target.checked })}
                              className="w-3.5 h-3.5 accent-shortcut-teal"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-neutral-light-gray flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                {warningCount} field{warningCount > 1 ? 's' : ''} need{warningCount === 1 ? 's' : ''} attention
              </span>
            )}
            {warningCount === 0 && includedCount > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                Ready to create
              </span>
            )}
            {result && (
              <span className={`font-medium ${result.success ? 'text-green-600' : 'text-red-500'}`}>
                {result.message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              variant="primary"
              icon={creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              disabled={creating || includedCount === 0}
            >
              {creating ? 'Creating...' : `Create ${includedCount} Event${includedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
