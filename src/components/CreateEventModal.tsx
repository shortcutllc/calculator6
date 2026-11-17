import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { Proposal } from '../types/proposal';
import { Button } from './Button';
import { createCoordinatorEvents } from '../services/generateProposalApi';
import { formatClock } from '../../netlify/functions/lib/survey-start-times.js';
import {
  COORDINATOR_SERVICES,
  CATEGORIES,
  getServicesForProposalType,
  buildInitialEvents as buildInitialEventsShared,
  validateEvents as validateEventsShared,
} from '../../netlify/functions/lib/coordinator-event-form.js';

// --- Types ---

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
  /** The proposal's location label ("SoHo, NY"): the card header and the proposal record. */
  locationName: string;
  /** The room on site ("Banting conference room"), shown to attendees and Pros. */
  locationDescription: string;
  // Page copy (coordinator Add Event "Page copy"); blank keeps the automatic text
  signupTitle: string;
  signupHeadline: string;
  seriesIntro: string;
  attendeeInstructions: string;
  confirmationSubject: string;
  // Address
  address: EventFormAddress;
  /** Set when the survey's address differs from the proposal's (the survey wins). */
  addressNote?: string;
  /** Which fields were filled from the post-approval survey, for the "From the survey" hints. */
  fromSurvey: Partial<Record<'address' | 'locationDescription' | 'contact' | 'staffNotes' | 'adminNotes', boolean>>;
  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  // Timing
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  /** The start time the client asked for in the survey, when they gave one. */
  surveyStartTime?: string;
  eventDate: string;  // YYYY-MM-DD or display string
  lengthPerService: number;
  /** Group class: several people book each time; signupsPerTimeslot is how many. */
  groupClass: boolean;
  signupsPerTimeslot: number;
  enableGuests: boolean;
  maxGuests: number;
  optionalContact: boolean;
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
  oneReservationPerEvent: boolean;
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

// --- Proposal → event forms: the shared rules (lib/coordinator-event-form.js) ---

interface ValidationIssue {
  eventIndex: number;
  field: string;
  message: string;
}

const buildInitialEvents = buildInitialEventsShared as (proposal: Proposal, surveyResponse?: any) => EventFormData[];
const validateEvents = validateEventsShared as (events: EventFormData[]) => ValidationIssue[];

// --- Date helpers ---

function formatDisplayDate(dateStr: string): string {
  // "2027-06-10" read by new Date() is UTC midnight, which shows as Jun 9
  // anywhere west of UTC. Build date-only values in the local zone.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const d = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// --- Component ---

/** Small label tag on a field the post-approval survey filled in. */
const SurveyHint: React.FC<{ show?: boolean }> = ({ show }) =>
  show ? <span className="ml-2 text-[10px] font-semibold text-text-dark-60">From the survey</span> : null;


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
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-1">
                      Location Description *
                      <SurveyHint show={evt.fromSurvey.locationDescription} />
                    </label>
                    <input
                      value={evt.locationDescription}
                      onChange={(e) => updateEvent(eventIndex, { locationDescription: e.target.value })}
                      className={inputClass(eventIndex, 'locationDescription')}
                      maxLength={40}
                      placeholder="The room on site, e.g. Banting conference room"
                    />
                  </div>

                  {/* Sign-up page copy (the coordinator's "Page copy": this event) */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Sign-up page title</label>
                        <input
                          value={evt.signupTitle}
                          onChange={(e) => updateEvent(eventIndex, { signupTitle: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                          placeholder="Blank shows the service name, or the list page title"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">
                          Description
                          <span className={`ml-2 text-[10px] font-normal ${evt.description.length >= 75 ? 'text-yellow-700' : 'text-text-dark-60'}`}>
                            {evt.description.length}/80
                          </span>
                        </label>
                        <textarea
                          value={evt.description}
                          onChange={(e) => updateEvent(eventIndex, { description: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                          maxLength={80}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">"Before you come"</label>
                      <textarea
                        value={evt.attendeeInstructions}
                        onChange={(e) => updateEvent(eventIndex, { attendeeInstructions: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                        rows={2}
                        placeholder={'Blank shows the usual tips for the service. For your own, e.g.\nJoining In Person\n\n1. Location: Training Room, 1st Floor.'}
                      />
                      <p className="text-xs text-text-dark-60 mt-1">
                        Shown on the sign-up and confirmation pages, in the confirmation email and the calendar invite. Leave a blank line between sections. A short line with no full stop becomes a heading.
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-2">
                      Address {hasFieldIssue(eventIndex, 'address.street') && <span className="text-yellow-500 ml-1">⚠️</span>}
                      <SurveyHint show={evt.fromSurvey.address} />
                    </label>
                    {evt.addressNote && (
                      <p className="flex items-start gap-1.5 text-xs text-shortcut-navy-blue bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 mb-2">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-px" />
                        <span>{evt.addressNote} Check which one the Pros should go to.</span>
                      </p>
                    )}
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
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Contact Name
                        <SurveyHint show={evt.fromSurvey.contact} />
                      </label>
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

                  {/* Event Sponsor */}
                  <div>
                    <label className="block text-xs font-bold text-shortcut-blue mb-1">
                      Event Sponsor <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={evt.sponsorName}
                      onChange={(e) => updateEvent(eventIndex, { sponsorName: e.target.value })}
                      className={inputClass(eventIndex, 'sponsorName')}
                      placeholder="Client name sponsoring the event"
                    />
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
                      {evt.surveyStartTime && (
                        <p className="text-xs text-text-dark-60 mt-1">Client asked for {formatClock(evt.surveyStartTime)}</p>
                      )}
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
                          <span className="w-16 px-2 py-1.5 text-sm text-center text-text-dark-60">$0</span>
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

                  {/* Notes: prefilled from the survey (entry, equipment, the client's answers) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Notes for Pros
                        <SurveyHint show={evt.fromSurvey.staffNotes} />
                      </label>
                      <textarea
                        value={evt.staffNotes}
                        onChange={(e) => updateEvent(eventIndex, { staffNotes: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                        rows={3}
                        placeholder="Entry instructions, parking, what to bring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-shortcut-blue mb-1">
                        Notes for Admins (private)
                        <SurveyHint show={evt.fromSurvey.adminNotes} />
                      </label>
                      <textarea
                        value={evt.adminNotes}
                        onChange={(e) => updateEvent(eventIndex, { adminNotes: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                        rows={3}
                        placeholder="Staffing requirements?"
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

                      {/* Event list page: shared by every event with this code */}
                      <div>
                        <p className="text-xs font-bold text-shortcut-blue">Event list page</p>
                        <p className="text-xs text-text-dark-60 mb-2">
                          The top box above all the events with this code, shared by every one of them. Leave blank to keep the automatic text.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            value={evt.signupHeadline}
                            onChange={(e) => updateEvent(eventIndex, { signupHeadline: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                            placeholder="Title, e.g. Wellness at [event name]"
                          />
                          <textarea
                            value={evt.seriesIntro}
                            onChange={(e) => updateEvent(eventIndex, { seriesIntro: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal resize-y"
                            rows={2}
                            placeholder="Description. Blank shows the sign-up page description."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-shortcut-blue mb-1">Confirmation email subject</label>
                        <input
                          value={evt.confirmationSubject}
                          onChange={(e) => updateEvent(eventIndex, { confirmationSubject: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                          placeholder="Blank uses the standard subject"
                        />
                      </div>

                      {/* Who books, and how */}
                      <div className="space-y-2">
                        <label className="flex items-start gap-2 text-xs text-text-dark-60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={evt.groupClass}
                            onChange={(e) => updateEvent(eventIndex, {
                              groupClass: e.target.checked,
                              signupsPerTimeslot: e.target.checked ? Math.max(2, evt.signupsPerTimeslot) : 1,
                            })}
                            className="w-3.5 h-3.5 mt-0.5 accent-shortcut-teal"
                          />
                          <span><span className="font-bold text-shortcut-blue">Group class.</span> Several people book each time, like a sound bath or a yoga class.</span>
                        </label>
                        {evt.groupClass && (
                          <input
                            type="number"
                            min={2}
                            max={500}
                            value={evt.signupsPerTimeslot}
                            onChange={(e) => updateEvent(eventIndex, { signupsPerTimeslot: parseInt(e.target.value, 10) || 0 })}
                            className={`${inputClass(eventIndex, 'signupsPerTimeslot')} max-w-[220px] ml-5`}
                            placeholder="Spots per time (e.g. 20)"
                          />
                        )}
                        <label className="flex items-start gap-2 text-xs text-text-dark-60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={evt.enableGuests}
                            onChange={(e) => updateEvent(eventIndex, { enableGuests: e.target.checked, maxGuests: e.target.checked ? Math.max(1, evt.maxGuests) : 0 })}
                            className="w-3.5 h-3.5 mt-0.5 accent-shortcut-teal"
                          />
                          <span className="font-bold text-shortcut-blue">Let attendees bring additional guests</span>
                        </label>
                        {evt.enableGuests && (
                          <input
                            type="number"
                            min={1}
                            value={evt.maxGuests}
                            onChange={(e) => updateEvent(eventIndex, { maxGuests: parseInt(e.target.value, 10) || 0 })}
                            className={`${inputClass(eventIndex, 'maxGuests')} max-w-[220px] ml-5`}
                            placeholder="Most guests per booking"
                          />
                        )}
                        <label className="flex items-start gap-2 text-xs text-text-dark-60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={evt.optionalContact}
                            onChange={(e) => updateEvent(eventIndex, { optionalContact: e.target.checked })}
                            className="w-3.5 h-3.5 mt-0.5 accent-shortcut-teal"
                          />
                          <span><span className="font-bold text-shortcut-blue">Let attendees book without an email or phone number.</span> For events where the contact belongs to a guardian rather than the attendee.</span>
                        </label>
                      </div>

                      {/* Checkboxes */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'isTestEvent', label: 'Test event' },
                          { key: 'isSecret', label: 'Hide from public' },
                          { key: 'doesNotRequireTimeslots', label: 'Do not require signups' },
                          { key: 'sendAutoEmailsManually', label: 'Send auto emails manually' },
                          { key: 'allowMultipleReservations', label: 'Allow multiple reservations' },
                          { key: 'oneReservationPerEvent', label: 'One booking per attendee in this event' },
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
