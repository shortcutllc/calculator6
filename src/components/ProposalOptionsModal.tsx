import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ProposalOptionsModalProps {
  onClose: () => void;
  onGenerate: (options: ProposalOptions) => void;
}

interface ProposalOptions {
  customization: {
    contactFirstName: string;
    contactLastName: string;
    customNote: string;
    includeSummary: boolean;
    includeCalculations: boolean;
    includeCalculator: boolean;
  };
}

interface ValidationErrors {
  contactFirstName?: string;
  contactLastName?: string;
}

const ProposalOptionsModal: React.FC<ProposalOptionsModalProps> = ({ onClose, onGenerate }) => {
  const [options, setOptions] = useState<ProposalOptions>({
    customization: {
      contactFirstName: '',
      contactLastName: '',
      customNote: '',
      includeSummary: true,
      includeCalculations: true,
      includeCalculator: true
    }
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!options.customization.contactFirstName) {
      newErrors.contactFirstName = 'First name is required';
    }

    if (!options.customization.contactLastName) {
      newErrors.contactLastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const allTouched = ['contactFirstName', 'contactLastName'].reduce((acc, field) => ({
      ...acc,
      [field]: true
    }), {});
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onGenerate(options);
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert('Failed to generate proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setOptions(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ProposalOptions],
          [child]: value
        }
      }));
    } else {
      setOptions(prev => ({
        ...prev,
        [field]: value
      }));
    }

    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    validateForm();
  };

  const getFieldError = (field: string): string | undefined => {
    return touched[field] ? errors[field as keyof ValidationErrors] : undefined;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-[#175071]">Generate Proposal</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={options.customization.contactFirstName}
                    onChange={(e) => handleFieldChange('customization.contactFirstName', e.target.value)}
                    onBlur={() => handleBlur('contactFirstName')}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] ${
                      getFieldError('contactFirstName') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {getFieldError('contactFirstName') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('contactFirstName')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={options.customization.contactLastName}
                    onChange={(e) => handleFieldChange('customization.contactLastName', e.target.value)}
                    onBlur={() => handleBlur('contactLastName')}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] ${
                      getFieldError('contactLastName') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {getFieldError('contactLastName') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('contactLastName')}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Note from Shortcut</label>
              <textarea
                value={options.customization.customNote}
                onChange={(e) => handleFieldChange('customization.customNote', e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071]"
                placeholder="We are so excited to service your incredible staff! Our team is looking forward to providing an exceptional experience..."
                disabled={loading}
              />
            </div>
          </div>

          {Object.keys(errors).length > 0 && touched.contactFirstName && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Please complete all required fields before generating your proposal
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || Object.keys(errors).length > 0}
            >
              {loading ? 'Generating...' : 'Generate Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProposalOptionsModal;