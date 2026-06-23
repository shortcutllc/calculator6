import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Edit } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './Button';
import { format, parseISO } from 'date-fns';
import type { SurveyAnswer, SurveyQuestion } from '../types/survey';
import {
  getServiceSurveyBlocks,
  buildQuestionPromptMap,
} from '../utils/serviceSurveyQuestions';

interface ProposalSurveyFormProps {
  proposalId: string;
  includesMassage?: boolean;
  /** Massage formats actually selected in the proposal ('chair' / 'table').
   *  Drives the proposal-aware table/chair question (pre-fill + "both"). */
  massageFormats?: Array<'chair' | 'table'>;
  /** All service-type slugs present in the proposal — drives which per-service
   *  question blocks (hair, headshot, nails, facial, …) render. */
  serviceTypes?: string[];
  locations?: string[];
  officeLocation?: string; // Single office location from proposal (legacy)
  officeLocations?: { [location: string]: string }; // Multiple office locations from proposal
  onSuccess?: () => void;
}

// Per-service answers: { [serviceType]: { [questionId]: answer } }
type ServiceResponses = Record<string, Record<string, SurveyAnswer>>;

// Renders one per-service survey question (single/multi choice, open text, yes/no)
// using the form's existing Tailwind styling.
const QuestionField: React.FC<{
  question: SurveyQuestion;
  value: SurveyAnswer | undefined;
  onChange: (next: SurveyAnswer) => void;
}> = ({ question, value, onChange }) => {
  const { type, prompt, helpText, options } = question;
  return (
    <div>
      <label className="block text-sm font-bold text-shortcut-blue mb-2">
        {prompt}
        {!question.required && (
          <span className="text-gray-500 font-normal"> (Optional)</span>
        )}
      </label>
      {helpText && <p className="text-xs text-gray-500 mb-2">{helpText}</p>}

      {type === 'open_text' && (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
        />
      )}

      {type === 'yes_no' && (
        <div className="space-y-2">
          {['Yes', 'No'].map((opt) => (
            <label key={opt} className="flex items-center">
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="mr-2"
              />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'single_choice' && (
        <div className="space-y-2">
          {(options || []).map((opt) => (
            <label key={opt} className="flex items-center">
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="mr-2"
              />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'multi_choice' && (
        <div className="space-y-2">
          {(options || []).map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt);
            return (
              <label key={opt} className="flex items-center">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked ? arr.filter((v) => v !== opt) : [...arr, opt]
                    )
                  }
                  className="mr-2"
                />
                <span className="text-gray-700">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SurveyFormData {
  table_or_chair_preference: string;
  preferred_gender: string;
  office_address: string; // Single address (legacy) or JSON string for multiple
  office_addresses?: { [location: string]: string }; // Multiple addresses by location
  massage_space_name: string;
  point_of_contact: string;
  billing_contact: string;
  coi_required: boolean | null;
}

const ProposalSurveyForm: React.FC<ProposalSurveyFormProps> = ({
  proposalId,
  includesMassage = true,
  massageFormats = [],
  serviceTypes = [],
  locations = [],
  officeLocation,
  officeLocations,
  onSuccess
}) => {
  // Per-service question blocks present in this proposal (hair, headshot, …).
  const serviceBlocks = getServiceSurveyBlocks(serviceTypes);
  const promptMap = buildQuestionPromptMap();
  // Per-service answers (stored in the `responses` JSONB column).
  const [responses, setResponses] = useState<ServiceResponses>({});
  const setResponse = (
    serviceType: string,
    questionId: string,
    value: SurveyAnswer
  ) => {
    setResponses((prev) => ({
      ...prev,
      [serviceType]: { ...(prev[serviceType] || {}), [questionId]: value },
    }));
    setError(null);
  };

  // Proposal-aware table/chair default: derive a sensible preset from the
  // formats actually chosen in the proposal (chair-only, table-only, or both).
  const uniqueFormats = Array.from(new Set(massageFormats));
  const massageFormatDefault =
    uniqueFormats.length > 1
      ? 'Both (Chair + Table)'
      : uniqueFormats[0] === 'table'
      ? 'Table'
      : uniqueFormats[0] === 'chair'
      ? 'Chair'
      : '';
  // Initialize form data with office addresses from proposal if available
  const getInitialOfficeAddresses = () => {
    if (officeLocations && Object.keys(officeLocations).length > 0) {
      return officeLocations;
    }
    return {};
  };

  const getInitialOfficeAddress = () => {
    if (officeLocation) {
      return officeLocation;
    }
    return '';
  };

  const [formData, setFormData] = useState<SurveyFormData>({
    table_or_chair_preference: '',
    preferred_gender: '',
    office_address: getInitialOfficeAddress(),
    office_addresses: getInitialOfficeAddresses(),
    massage_space_name: '',
    point_of_contact: '',
    billing_contact: '',
    coi_required: null,
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingResponse, setExistingResponse] = useState<any>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showReadOnlyView, setShowReadOnlyView] = useState(false);

  // Initialize Google Maps autocomplete for office address(es)
  useEffect(() => {
    const initializeGoogleMaps = () => {
      // If multiple locations, initialize autocomplete for each
      if (locations.length > 1) {
        locations.forEach((location, index) => {
          const inputId = `office-address-input-${location}`;
          const input = document.getElementById(inputId) as HTMLInputElement;
          if (input && window.google && window.google.maps && window.google.maps.places) {
            try {
              const autocomplete = new window.google.maps.places.Autocomplete(input, {
                types: ['address'],
                componentRestrictions: { country: 'us' }
              });

              autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place.formatted_address) {
                  setFormData(prev => ({
                    ...prev,
                    office_addresses: {
                      ...prev.office_addresses,
                      [location]: place.formatted_address
                    }
                  }));
                }
              });

              console.log(`Google Maps Places Autocomplete initialized for ${location}`);
            } catch (error) {
              console.error(`Error initializing Google Maps Places Autocomplete for ${location}:`, error);
            }
          }
        });
      } else {
        // Single location - use the original input
        const input = document.getElementById('office-address-input') as HTMLInputElement;
        if (input && window.google && window.google.maps && window.google.maps.places) {
          try {
            const autocomplete = new window.google.maps.places.Autocomplete(input, {
              types: ['address'],
              componentRestrictions: { country: 'us' }
            });

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place.formatted_address) {
                setFormData(prev => ({
                  ...prev,
                  office_address: place.formatted_address
                }));
              }
            });

            console.log('Google Maps Places Autocomplete initialized for survey');
          } catch (error) {
            console.error('Error initializing Google Maps Places Autocomplete:', error);
          }
        }
      }
    };

    // Initialize Google Maps if not loaded
    if (!window.google || !window.google.maps) {
      if (window.initGoogleMaps) {
        window.initGoogleMaps();
      }
    }

    // Check for Google Maps availability and initialize
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initializeGoogleMaps();
        clearInterval(checkGoogleMaps);
      }
    }, 100);

    return () => {
      clearInterval(checkGoogleMaps);
    };
  }, [locations]);

  // Update form data when proposal office addresses change (if no existing survey response)
  useEffect(() => {
    if (!existingResponse) {
      if (officeLocations && Object.keys(officeLocations).length > 0) {
        setFormData(prev => ({
          ...prev,
          office_addresses: officeLocations
        }));
      } else if (officeLocation) {
        setFormData(prev => ({
          ...prev,
          office_address: officeLocation
        }));
      }
    }
  }, [officeLocation, officeLocations, existingResponse]);

  // Load existing survey response if it exists
  useEffect(() => {
    const loadExistingResponse = async () => {
      try {
        const { data, error } = await supabase
          .from('proposal_survey_responses')
          .select('*')
          .eq('proposal_id', proposalId)
          .maybeSingle(); // Use maybeSingle to handle no rows gracefully

        if (error) {
          // PGRST116 = no rows returned (this is expected if no survey exists yet)
          // PGRST301 = relation does not exist (table hasn't been created yet)
          // 406 = Not Acceptable (may indicate RLS or schema issue)
          if (error.code === 'PGRST116') {
            // No survey exists yet, this is fine
            return;
          }
          if (error.code === 'PGRST301' || error.message?.includes('does not exist')) {
            console.error('Survey table does not exist. Please apply the database migration first.');
            setError('Database migration required. Please contact support.');
            return;
          }
          // Handle 406 errors gracefully
          if (error.code === 'PGRST406' || error.message?.includes('406')) {
            console.warn('Survey table access issue (406). This may indicate a migration needs to be applied.');
            return;
          }
          console.error('Error loading survey response:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          return;
        }

        if (data) {
          console.log('📋 Loaded survey response:', data);
          setExistingResponse(data);
          
          // Parse office_address - could be JSON string (multiple) or plain string (single)
          let officeAddresses = {};
          let officeAddress = '';
          if (data.office_address) {
            try {
              const parsed = JSON.parse(data.office_address);
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                // It's a JSON object with multiple addresses
                officeAddresses = parsed;
              } else {
                // It's a single address string
                officeAddress = data.office_address;
              }
            } catch {
              // Not JSON, treat as single address
              officeAddress = data.office_address;
            }
          } else {
            // No existing survey data, but we might have proposal office addresses to pre-fill
            if (officeLocations && Object.keys(officeLocations).length > 0) {
              officeAddresses = officeLocations;
            } else if (officeLocation) {
              officeAddress = officeLocation;
            }
          }
          
          setFormData({
            table_or_chair_preference: data.table_or_chair_preference || '',
            preferred_gender: data.preferred_gender || '',
            office_address: officeAddress || getInitialOfficeAddress(),
            office_addresses: Object.keys(officeAddresses).length > 0 ? officeAddresses : getInitialOfficeAddresses(),
            massage_space_name: data.massage_space_name || '',
            point_of_contact: data.point_of_contact || '',
            billing_contact: data.billing_contact || '',
            coi_required: data.coi_required,
          });
          // Per-service answers (hair / headshot / nails / facial …)
          if (data.responses && typeof data.responses === 'object') {
            setResponses(data.responses as ServiceResponses);
          }
          setSuccess(true);
          setShowReadOnlyView(true); // Show read-only view if response exists
        } else {
          // No existing survey response — pre-fill from the proposal: office
          // addresses, and the table/chair preference derived from the massage
          // format(s) the client actually selected (#2).
          setFormData(prev => ({
            ...prev,
            ...(officeLocations && Object.keys(officeLocations).length > 0
              ? { office_addresses: officeLocations }
              : officeLocation
              ? { office_address: officeLocation }
              : {}),
            table_or_chair_preference:
              prev.table_or_chair_preference || massageFormatDefault,
          }));
        }
      } catch (err) {
        console.error('Error loading survey response:', err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadExistingResponse();
  }, [proposalId]);

  const handleChange = (field: keyof SurveyFormData, value: string | boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // If multiple locations, store addresses as JSON; otherwise store as single string
      let officeAddressValue: string | null = null;
      if (locations.length > 1 && formData.office_addresses && Object.keys(formData.office_addresses).length > 0) {
        // Store as JSON string
        officeAddressValue = JSON.stringify(formData.office_addresses);
      } else {
        // Single address (legacy or single location)
        officeAddressValue = formData.office_address || null;
      }
      
      const surveyData = {
        proposal_id: proposalId,
        table_or_chair_preference: formData.table_or_chair_preference || null,
        preferred_gender: formData.preferred_gender || null,
        office_address: officeAddressValue,
        massage_space_name: formData.massage_space_name || null,
        point_of_contact: formData.point_of_contact || null,
        billing_contact: formData.billing_contact || null,
        coi_required: formData.coi_required,
        // Per-service answers (hair / headshot / nails / facial …)
        responses,
      };

      const writeSurvey = (payload: any) =>
        existingResponse
          ? supabase
              .from('proposal_survey_responses')
              .update(payload)
              .eq('proposal_id', proposalId)
          : supabase.from('proposal_survey_responses').insert(payload);

      // The per-service `responses` JSONB column ships with migration
      // 20260622000000. If a deploy lands before that migration runs, degrade
      // gracefully: save everything else (massage + logistics) without the
      // per-service answers rather than failing the whole submission. They
      // start persisting again automatically once the column exists.
      const isMissingResponsesCol = (err: any) => {
        const code = err?.code || '';
        const msg = (err?.message || '') + (err?.details || '');
        return (
          code === '42703' ||
          code === 'PGRST204' ||
          (/responses/i.test(msg) && /column|schema cache/i.test(msg))
        );
      };

      let { error: writeError } = await writeSurvey(surveyData);
      if (writeError && isMissingResponsesCol(writeError)) {
        const { responses: _omitResponses, ...withoutResponses } = surveyData;
        console.warn(
          'proposal_survey_responses.responses missing — saving without per-service answers (apply migration 20260622000000).'
        );
        ({ error: writeError } = await writeSurvey(withoutResponses));
      }
      if (writeError) throw writeError;

      setSuccess(true);
      setShowSuccessBanner(true);
      setShowReadOnlyView(true); // Switch to read-only view after submission
      // Reload the response to get the full data including submitted_at
      const { data: updatedData, error: reloadError } = await supabase
        .from('proposal_survey_responses')
        .select('*')
        .eq('proposal_id', proposalId)
        .maybeSingle(); // Use maybeSingle to handle potential errors gracefully
      
      if (reloadError) {
        console.warn('Error reloading survey response:', reloadError);
      }
      
      if (updatedData) {
        setExistingResponse(updatedData);
      }
      
      // Send Slack notification with survey results
      try {
        // Fetch proposal data to get client info
        const { data: proposalData } = await supabase
          .from('proposals')
          .select('client_name, client_email, proposal_type, data')
          .eq('id', proposalId)
          .single();

        if (proposalData) {
          const displayData = proposalData.data || {};
          await fetch('/.netlify/functions/proposal-event-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventType: 'survey_completed',
              proposalId: proposalId,
              clientName: proposalData.client_name || displayData?.clientName || 'Unknown',
              clientEmail: proposalData.client_email || displayData?.clientEmail,
              proposalType: proposalData.proposal_type || 'event',
              totalCost: displayData?.summary?.totalEventCost || displayData?.mindfulnessProgram?.pricing?.totalCost || 0,
              eventDates: displayData?.eventDates || [],
              locations: displayData?.locations || [],
              surveyResults: updatedData || surveyData // Include full survey results
            })
          });
        }
      } catch (slackError) {
        console.error('Error sending Slack notification for survey completion:', slackError);
        // Don't fail the form submission if Slack fails
      }
      
      // Scroll to top of form to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error saving survey response:', err);
      if (err?.code === 'PGRST301' || err?.message?.includes('does not exist')) {
        setError('Database migration required. The survey table has not been created yet. Please contact support to apply the migration.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save survey response');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-shortcut-blue" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-shortcut-blue mb-2">
          {showReadOnlyView && existingResponse ? 'Event Details Survey - Responses' : 'Event Details Survey'}
        </h2>
        {!showReadOnlyView && (
          <p className="text-gray-600">
            Please provide the following information to help us prepare for your event.
          </p>
        )}
        {showReadOnlyView && existingResponse && (
          <p className="text-gray-600">
            View the submitted survey responses below. Click "Edit Responses" to make changes.
          </p>
        )}
      </div>

      {showSuccessBanner && success && !submitting && (
        <div className="mb-6 bg-green-500 text-white px-6 py-4 rounded-lg flex items-start gap-3 shadow-lg">
          <CheckCircle2 className="w-6 h-6 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-lg">✓ Survey {existingResponse ? 'Updated' : 'Completed'} Successfully!</p>
            <p className="text-sm mt-1 text-green-50">Thank you for providing this information. Our team will review it shortly.</p>
          </div>
          <button
            onClick={() => setShowSuccessBanner(false)}
            className="text-white hover:text-green-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Read-only view of submitted survey */}
      {showReadOnlyView && existingResponse && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Survey Responses</h3>
              {existingResponse.submitted_at && (
                <p className="text-sm text-blue-600 mt-1">
                  Submitted on {format(parseISO(existingResponse.submitted_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowReadOnlyView(false)}
              variant="secondary"
              icon={<Edit size={16} />}
              size="sm"
            >
              Edit Responses
            </Button>
          </div>
          
          <div className="space-y-4">
            {includesMassage && (
              <>
                <div className="bg-white rounded p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">1. Table or Chair Preference</p>
                  <p className="text-gray-700">
                    {existingResponse.table_or_chair_preference || <span className="text-gray-400 italic">Not provided</span>}
                  </p>
                </div>
                
                <div className="bg-white rounded p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Preferred Gender of Massage Professional</p>
                  <p className="text-gray-700">
                    {existingResponse.preferred_gender || <span className="text-gray-400 italic">Not provided</span>}
                  </p>
                </div>
              </>
            )}

            {/* Per-service answers (hair / headshot / nails / facial …) */}
            {serviceBlocks.map((block) => {
              const svcKey = block.serviceTypes[0];
              const ans = (existingResponse.responses || {})[svcKey] || {};
              return (
                <div key={block.label} className="bg-white rounded p-4">
                  <p className="text-sm font-bold text-shortcut-navy-blue mb-2">{block.label}</p>
                  <div className="space-y-2">
                    {block.questions.map((q) => {
                      const v = ans[q.id];
                      const display = Array.isArray(v) ? v.join(', ') : v;
                      return (
                        <div key={q.id}>
                          <p className="text-xs font-semibold text-gray-600">
                            {promptMap[q.id] || q.prompt}
                          </p>
                          <p className="text-gray-700">
                            {display || <span className="text-gray-400 italic">Not provided</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Office Address(es) - Show multiple if available or if multiple locations exist */}
            {(() => {
              let officeAddresses: { [key: string]: string } = {};
              let singleAddress = '';
              
              if (existingResponse.office_address) {
                try {
                  const parsed = JSON.parse(existingResponse.office_address);
                  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    officeAddresses = parsed;
                  } else {
                    singleAddress = existingResponse.office_address;
                  }
                } catch {
                  singleAddress = existingResponse.office_address;
                }
              }
              
              const hasMultipleAddresses = Object.keys(officeAddresses).length > 0;
              const shouldShowMultiple = locations.length > 1 || hasMultipleAddresses;
              
              return (
                <div className="bg-white rounded p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Office Address{shouldShowMultiple ? 'es' : ''}</p>
                  {shouldShowMultiple ? (
                    <div className="space-y-2">
                      {locations.length > 1 ? (
                        // Show all locations, even if some don't have addresses
                        locations.map((location) => {
                          const address = officeAddresses[location] || (singleAddress && location === locations[0] ? singleAddress : '');
                          return (
                            <div key={location} className="border-l-2 border-shortcut-teal pl-3">
                              <p className="text-xs font-bold text-shortcut-navy-blue mb-1">{location}:</p>
                              <p className="text-gray-700">{address || <span className="text-gray-400 italic">Not provided</span>}</p>
                            </div>
                          );
                        })
                      ) : (
                        // Show multiple addresses from JSON
                        Object.entries(officeAddresses).map(([location, address]) => (
                          <div key={location} className="border-l-2 border-shortcut-teal pl-3">
                            <p className="text-xs font-bold text-shortcut-navy-blue mb-1">{location}:</p>
                            <p className="text-gray-700">{address || <span className="text-gray-400 italic">Not provided</span>}</p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {singleAddress || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>
              );
            })()}
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Name of the Space(s) Where Services Will Take Place</p>
              <p className="text-gray-700">
                {existingResponse.massage_space_name || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Point of Contact (including phone number)</p>
              <p className="text-gray-700 whitespace-pre-wrap">
                {existingResponse.point_of_contact || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Billing Contact / Who to Address Invoice To</p>
              <p className="text-gray-700 whitespace-pre-wrap">
                {existingResponse.billing_contact || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Will a Certificate of Insurance (COI) be Required?</p>
              <p className="text-gray-700">
                {existingResponse.coi_required !== null 
                  ? (existingResponse.coi_required ? 'Yes' : 'No')
                  : <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editable form - only show if not in read-only view or if user clicks edit */}
      {!showReadOnlyView && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Massage section header */}
        {includesMassage && (
          <h3 className="text-base font-bold text-shortcut-navy-blue pt-2">Massage</h3>
        )}

        {/* Question 1: Table or Chair Preference - Only show if massage is included */}
        {includesMassage && (
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Table or chair preference <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            {massageFormatDefault && (
              <p className="text-xs text-shortcut-navy-blue bg-shortcut-teal bg-opacity-10 rounded px-3 py-2 mb-2">
                {uniqueFormats.length > 1
                  ? 'Your proposal includes both Chair and Table massage, so we set this to “Both.” Adjust it if you need to.'
                  : `Your proposal is set up for ${massageFormatDefault} massage. Change it below if you'd prefer otherwise.`}
              </p>
            )}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="table_or_chair_preference"
                  value="Table"
                  checked={formData.table_or_chair_preference === 'Table'}
                  onChange={(e) => handleChange('table_or_chair_preference', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">Table</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="table_or_chair_preference"
                  value="Chair"
                  checked={formData.table_or_chair_preference === 'Chair'}
                  onChange={(e) => handleChange('table_or_chair_preference', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">Chair</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="table_or_chair_preference"
                  value="Both (Chair + Table)"
                  checked={formData.table_or_chair_preference === 'Both (Chair + Table)'}
                  onChange={(e) => handleChange('table_or_chair_preference', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">Both (Chair + Table)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="table_or_chair_preference"
                  value="No preference"
                  checked={formData.table_or_chair_preference === 'No preference'}
                  onChange={(e) => handleChange('table_or_chair_preference', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">No preference</span>
              </label>
            </div>
            <input
              type="text"
              placeholder="Or enter custom preference"
              value={formData.table_or_chair_preference && !['Table', 'Chair', 'Both (Chair + Table)', 'No preference'].includes(formData.table_or_chair_preference) ? formData.table_or_chair_preference : ''}
              onChange={(e) => handleChange('table_or_chair_preference', e.target.value)}
              className="mt-2 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            />
          </div>
        )}

        {/* Question 2: Preferred Gender - Only show if massage is included */}
        {includesMassage && (
          <div>
            <label className="block text-sm font-bold text-shortcut-blue mb-2">
              Do you have a preferred gender for the massage professionals? <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferred_gender"
                  value="Male"
                  checked={formData.preferred_gender === 'Male'}
                  onChange={(e) => handleChange('preferred_gender', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">Male</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferred_gender"
                  value="Female"
                  checked={formData.preferred_gender === 'Female'}
                  onChange={(e) => handleChange('preferred_gender', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">Female</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferred_gender"
                  value="No preference"
                  checked={formData.preferred_gender === 'No preference'}
                  onChange={(e) => handleChange('preferred_gender', e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">No preference</span>
              </label>
            </div>
            <input
              type="text"
              placeholder="Or enter custom preference"
              value={formData.preferred_gender && !['Male', 'Female', 'No preference'].includes(formData.preferred_gender) ? formData.preferred_gender : ''}
              onChange={(e) => handleChange('preferred_gender', e.target.value)}
              className="mt-2 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            />
          </div>
        )}

        {/* Per-service question blocks (hair / headshot / nails / facial …) */}
        {serviceBlocks.map((block) => (
          <div key={block.label} className="space-y-4">
            <div className="pt-2">
              <h3 className="text-base font-bold text-shortcut-navy-blue">{block.label}</h3>
              {block.blurb && <p className="text-xs text-gray-500 mt-0.5">{block.blurb}</p>}
            </div>
            {block.questions.map((q) => {
              const svcKey = block.serviceTypes[0];
              return (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={responses[svcKey]?.[q.id]}
                  onChange={(next) => setResponse(svcKey, q.id, next)}
                />
              );
            })}
          </div>
        ))}

        {/* Shared event logistics (asked once for the whole event) */}
        <h3 className="text-base font-bold text-shortcut-navy-blue pt-2">Event logistics</h3>

        {/* Office Address(es) */}
        {locations.length > 1 ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Office addresses
            </label>
            <div className="space-y-4">
              {locations.map((location) => {
                const hasPrefilledAddress = officeLocations?.[location] || (officeLocation && location === locations[0]);
                const currentAddress = formData.office_addresses?.[location] || '';
                return (
                  <div key={location} className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-shortcut-teal transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-shortcut-navy-blue">
                        Office Address for {location}
                      </label>
                      {hasPrefilledAddress && !existingResponse && (
                        <span className="text-xs font-semibold text-shortcut-navy-blue bg-shortcut-teal bg-opacity-10 px-2 py-1 rounded">
                          Pre-filled from proposal
                        </span>
                      )}
                    </div>
                    <input
                      id={`office-address-input-${location}`}
                      type="text"
                      value={currentAddress}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          office_addresses: {
                            ...prev.office_addresses,
                            [location]: e.target.value
                          }
                        }));
                      }}
                      placeholder={`Start typing an address for ${location}...`}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                    />
                    <p className="text-xs text-text-dark-60 mt-2">
                      Address autocomplete will appear as you type
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Office address
              </label>
              {officeLocation && !existingResponse && (
                <span className="text-xs font-semibold text-shortcut-navy-blue bg-shortcut-teal bg-opacity-10 px-2 py-1 rounded">
                  Pre-filled from proposal
                </span>
              )}
            </div>
            <input
              id="office-address-input"
              type="text"
              value={formData.office_address}
              onChange={(e) => handleChange('office_address', e.target.value)}
              placeholder="Start typing an address..."
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
            />
            <p className="text-xs text-text-dark-60 mt-2">
              Address autocomplete will appear as you type
            </p>
          </div>
        )}

        {/* Question 4 (or 2): Service Space Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Name of the space(s) where services will take place
          </label>
          <input
            type="text"
            value={formData.massage_space_name}
            onChange={(e) => handleChange('massage_space_name', e.target.value)}
            placeholder="e.g., Conference Room A, Wellness Room, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 5 (or 3): Point of Contact */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Point of contact (including phone number)
          </label>
          <textarea
            value={formData.point_of_contact}
            onChange={(e) => handleChange('point_of_contact', e.target.value)}
            placeholder="Name and phone number of the person we should contact on-site"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 6 (or 4): Billing Contact */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Billing contact / who to address the invoice to
          </label>
          <textarea
            value={formData.billing_contact}
            onChange={(e) => handleChange('billing_contact', e.target.value)}
            placeholder="Name, email, and mailing address for billing"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 7 (or 5): COI Required */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Will a Certificate of Insurance (COI) be required?
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="coi_required"
                value="yes"
                checked={formData.coi_required === true}
                onChange={() => handleChange('coi_required', true)}
                className="mr-2"
              />
              <span className="text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="coi_required"
                value="no"
                checked={formData.coi_required === false}
                onChange={() => handleChange('coi_required', false)}
                className="mr-2"
              />
              <span className="text-gray-700">No</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            loading={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? 'Saving...' : existingResponse ? 'Update Survey' : 'Submit Survey'}
          </Button>
        </div>
      </form>
      )}
    </div>
  );
};

export default ProposalSurveyForm;

