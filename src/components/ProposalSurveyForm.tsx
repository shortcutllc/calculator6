import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Edit } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './Button';
import { format, parseISO } from 'date-fns';

interface ProposalSurveyFormProps {
  proposalId: string;
  onSuccess?: () => void;
}

interface SurveyFormData {
  table_or_chair_preference: string;
  preferred_gender: string;
  office_address: string;
  massage_space_name: string;
  point_of_contact: string;
  billing_contact: string;
  coi_required: boolean | null;
}

const ProposalSurveyForm: React.FC<ProposalSurveyFormProps> = ({ proposalId, onSuccess }) => {
  const [formData, setFormData] = useState<SurveyFormData>({
    table_or_chair_preference: '',
    preferred_gender: '',
    office_address: '',
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

  // Initialize Google Maps autocomplete for office address
  useEffect(() => {
    const initializeGoogleMaps = () => {
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
  }, []);

  // Load existing survey response if it exists
  useEffect(() => {
    const loadExistingResponse = async () => {
      try {
        const { data, error } = await supabase
          .from('proposal_survey_responses')
          .select('*')
          .eq('proposal_id', proposalId)
          .single();

        if (error) {
          // PGRST116 = no rows returned (this is expected if no survey exists yet)
          // PGRST301 = relation does not exist (table hasn't been created yet)
          if (error.code === 'PGRST116') {
            // No survey exists yet, this is fine
            return;
          }
          if (error.code === 'PGRST301' || error.message?.includes('does not exist')) {
            console.error('Survey table does not exist. Please apply the database migration first.');
            setError('Database migration required. Please contact support.');
            return;
          }
          console.error('Error loading survey response:', error);
          return;
        }

        if (data) {
          console.log('📋 Loaded survey response:', data);
          setExistingResponse(data);
          setFormData({
            table_or_chair_preference: data.table_or_chair_preference || '',
            preferred_gender: data.preferred_gender || '',
            office_address: data.office_address || '',
            massage_space_name: data.massage_space_name || '',
            point_of_contact: data.point_of_contact || '',
            billing_contact: data.billing_contact || '',
            coi_required: data.coi_required,
          });
          setSuccess(true);
          setShowReadOnlyView(true); // Show read-only view if response exists
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
      const surveyData = {
        proposal_id: proposalId,
        table_or_chair_preference: formData.table_or_chair_preference || null,
        preferred_gender: formData.preferred_gender || null,
        office_address: formData.office_address || null,
        massage_space_name: formData.massage_space_name || null,
        point_of_contact: formData.point_of_contact || null,
        billing_contact: formData.billing_contact || null,
        coi_required: formData.coi_required,
      };

      if (existingResponse) {
        // Update existing response
        const { error: updateError } = await supabase
          .from('proposal_survey_responses')
          .update(surveyData)
          .eq('proposal_id', proposalId);

        if (updateError) throw updateError;
      } else {
        // Insert new response
        const { error: insertError } = await supabase
          .from('proposal_survey_responses')
          .insert(surveyData);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setShowSuccessBanner(true);
      setShowReadOnlyView(true); // Switch to read-only view after submission
      // Reload the response to get the full data including submitted_at
      const { data: updatedData } = await supabase
        .from('proposal_survey_responses')
        .select('*')
        .eq('proposal_id', proposalId)
        .single();
      
      if (updatedData) {
        setExistingResponse(updatedData);
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
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">1. Table or Chair Preference</p>
              <p className="text-gray-700">
                {existingResponse.table_or_chair_preference || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">2. Preferred Gender of Massage Professional</p>
              <p className="text-gray-700">
                {existingResponse.preferred_gender || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">3. Office Address</p>
              <p className="text-gray-700 whitespace-pre-wrap">
                {existingResponse.office_address || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">4. Name of Space(s) Where Massages Will Take Place</p>
              <p className="text-gray-700">
                {existingResponse.massage_space_name || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">5. Point of Contact (including phone number)</p>
              <p className="text-gray-700 whitespace-pre-wrap">
                {existingResponse.point_of_contact || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">6. Billing Contact / Who to Address Invoice To</p>
              <p className="text-gray-700 whitespace-pre-wrap">
                {existingResponse.billing_contact || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            
            <div className="bg-white rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">7. Will a Certificate of Insurance (COI) be Required?</p>
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
        {/* Question 1: Table or Chair Preference */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            1. Table or chair preference <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
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
            value={formData.table_or_chair_preference && !['Table', 'Chair', 'No preference'].includes(formData.table_or_chair_preference) ? formData.table_or_chair_preference : ''}
            onChange={(e) => handleChange('table_or_chair_preference', e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 2: Preferred Gender */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            2. Preferred gender of the massage professional <span className="text-gray-500 font-normal">(Optional)</span>
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
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 3: Office Address */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            3. Office address
          </label>
          <input
            id="office-address-input"
            type="text"
            value={formData.office_address}
            onChange={(e) => handleChange('office_address', e.target.value)}
            placeholder="Start typing an address..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
          <p className="text-xs text-gray-500 mt-1">
            Address autocomplete will appear as you type
          </p>
        </div>

        {/* Question 4: Massage Space Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            4. Name of the space(s) where massages will take place
          </label>
          <input
            type="text"
            value={formData.massage_space_name}
            onChange={(e) => handleChange('massage_space_name', e.target.value)}
            placeholder="e.g., Conference Room A, Wellness Room, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 5: Point of Contact */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            5. Point of contact (including phone number)
          </label>
          <textarea
            value={formData.point_of_contact}
            onChange={(e) => handleChange('point_of_contact', e.target.value)}
            placeholder="Name and phone number of the person we should contact on-site"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 6: Billing Contact */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            6. Billing contact / who to address the invoice to
          </label>
          <textarea
            value={formData.billing_contact}
            onChange={(e) => handleChange('billing_contact', e.target.value)}
            placeholder="Name, email, and mailing address for billing"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
          />
        </div>

        {/* Question 7: COI Required */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            7. Will a Certificate of Insurance (COI) be required?
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

