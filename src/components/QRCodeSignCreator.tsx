import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQRCodeSign } from '../contexts/QRCodeSignContext';
import { useProposal } from '../contexts/ProposalContext';
import { QRCodeSignCustomization, ServiceType } from '../types/qrCodeSign';
import { mapProposalServiceToQRType, getMultiServiceDisplayName } from '../utils/qrCodeSignUtils';
import { getServiceTypesFromProposal, formatDateAmerican } from '../utils/proposalUtils';
import { generateSignTitle, getAvailableTitles } from '../utils/qrSignTitleGenerator';
import { Button } from './Button';
import { RefreshCw } from 'lucide-react';

interface QRCodeSignCreatorProps {
  onClose?: () => void;
  editingSign?: any; // QR code sign to edit (if provided)
}

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'massage', label: 'Massage' },
  { value: 'hair-beauty', label: 'Hair + Beauty' },
  { value: 'headshot', label: 'Headshots' },
  { value: 'nails', label: 'Nails' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'facial', label: 'Facials' },
];

const QRCodeSignCreator: React.FC<QRCodeSignCreatorProps> = ({ onClose, editingSign }) => {
  const navigate = useNavigate();
  const { createQRCodeSign, updateQRCodeSign, uploadPartnerLogo } = useQRCodeSign();
  const { proposals } = useProposal();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedProposalId, setSelectedProposalId] = useState<string>(editingSign?.data?.proposalId || '');

  // Parse existing event details if editing
  const parseEventDetails = (details: string) => {
    const lines = details?.split('\n').map(l => l.trim()).filter(l => l) || [];
    const result = { serviceTypeText: '', date: '', time: '', location: '' };

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('service') || lowerLine.includes('type')) {
        result.serviceTypeText = line.replace(/^[^:]+:\s*/, '');
      } else if (lowerLine.includes('date:') || lowerLine.includes('when:')) {
        result.date = line.replace(/^[^:]+:\s*/, '');
      } else if (lowerLine.includes('time:')) {
        result.time = line.replace(/^[^:]+:\s*/, '');
      } else if (lowerLine.includes('location:') || lowerLine.includes('where:')) {
        result.location = line.replace(/^[^:]+:\s*/, '');
      }
    });

    return result;
  };

  const existingDetails = editingSign ? parseEventDetails(editingSign.data?.eventDetails) : null;

  // Initialize selectedServices from existing sign data
  const getInitialServices = (): ServiceType[] => {
    if (editingSign?.data?.serviceTypes?.length) return editingSign.data.serviceTypes;
    if (editingSign?.data?.serviceType) return [editingSign.data.serviceType];
    return [];
  };

  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(getInitialServices());

  const [options, setOptions] = useState({
    title: editingSign?.data?.title || '',
    serviceType: editingSign?.data?.serviceType || 'massage',
    serviceTypeText: existingDetails?.serviceTypeText || '',
    eventDate: existingDetails?.date || '',
    eventTime: existingDetails?.time || '',
    location: existingDetails?.location || '',
    qrCodeUrl: editingSign?.data?.qrCodeUrl || '',
    partnerLogoFile: null as File | null,
    partnerLogoUrl: editingSign?.data?.partnerLogoUrl || '',
    partnerName: editingSign?.data?.partnerName || '',
    customization: editingSign?.customization || {}
  });

  // Update options when editingSign changes
  React.useEffect(() => {
    if (editingSign) {
      const details = parseEventDetails(editingSign.data?.eventDetails);
      setOptions({
        title: editingSign.data?.title || '',
        serviceType: editingSign.data?.serviceType || 'massage',
        serviceTypeText: details.serviceTypeText || '',
        eventDate: details.date || '',
        eventTime: details.time || '',
        location: details.location || '',
        qrCodeUrl: editingSign.data?.qrCodeUrl || '',
        partnerLogoFile: null,
        partnerLogoUrl: editingSign.data?.partnerLogoUrl || '',
        partnerName: editingSign.data?.partnerName || '',
        customization: editingSign.customization || {}
      });
      setUpdatedLogoUrl(null);
      if (editingSign.data?.serviceTypes?.length) {
        setSelectedServices(editingSign.data.serviceTypes);
      } else if (editingSign.data?.serviceType) {
        setSelectedServices([editingSign.data.serviceType]);
      }
      setSelectedProposalId(editingSign.data?.proposalId || '');
    }
  }, [editingSign]);

  const [logoInputType, setLogoInputType] = useState<'file' | 'url'>('file');
  const [updatedLogoUrl, setUpdatedLogoUrl] = useState<string | null>(null);

  // Sort proposals by most recent, exclude test proposals
  const sortedProposals = useMemo(() => {
    return [...proposals]
      .filter(p => !p.data.clientName?.toLowerCase().includes('test'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals]);

  // Handle service checkbox toggle
  const handleServiceToggle = (serviceType: ServiceType) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceType)) {
        return prev.filter(s => s !== serviceType);
      }
      if (prev.length >= 3) return prev; // Max 3
      return [...prev, serviceType];
    });
  };

  // Handle proposal selection and auto-fill
  const handleProposalSelect = useCallback((proposalId: string) => {
    setSelectedProposalId(proposalId);
    if (!proposalId) return;

    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    // Extract service types from proposal
    const proposalServiceTypes = getServiceTypesFromProposal(proposal);
    const mappedTypes = [...new Set(proposalServiceTypes.map(mapProposalServiceToQRType))];
    const limitedTypes = mappedTypes.slice(0, 3); // Max 3

    // Set selected services
    setSelectedServices(limitedTypes);

    // Auto-generate title
    const title = generateSignTitle(limitedTypes as ServiceType[], proposal.data.clientName);

    // Auto-fill fields
    setOptions(prev => ({
      ...prev,
      title,
      serviceType: limitedTypes[0] || prev.serviceType,
      serviceTypeText: getMultiServiceDisplayName(limitedTypes as ServiceType[]),
      partnerName: proposal.data.clientName || '',
      partnerLogoUrl: proposal.data.clientLogoUrl || '',
      qrCodeUrl: `${window.location.origin}/shared/${proposal.id}`,
      eventDate: proposal.data.eventDates?.[0] ? formatDateAmerican(proposal.data.eventDates[0]) : '',
      location: proposal.data.locations?.[0] || '',
    }));

    // Clear errors on auto-fill
    setErrors({});
  }, [proposals]);

  // Regenerate title from current selected services
  const handleRegenerateTitle = () => {
    const titles = getAvailableTitles(selectedServices);
    // Pick a random title that's different from current
    const available = titles.filter(t => t !== options.title);
    if (available.length > 0) {
      const randomTitle = available[Math.floor(Math.random() * available.length)];
      setOptions(prev => ({ ...prev, title: randomTitle }));
    }
  };

  // Auto-update service type text when services change
  React.useEffect(() => {
    if (selectedServices.length > 0) {
      const displayName = getMultiServiceDisplayName(selectedServices);
      setOptions(prev => ({
        ...prev,
        serviceType: selectedServices[0],
        serviceTypeText: displayName,
      }));
    }
  }, [selectedServices]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!options.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (options.title.length > 60) {
      newErrors.title = 'Title must be 60 characters or less';
    }

    if (!options.qrCodeUrl.trim()) {
      newErrors.qrCodeUrl = 'QR code URL is required';
    } else {
      try {
        new URL(options.qrCodeUrl);
      } catch {
        newErrors.qrCodeUrl = 'Please enter a valid URL';
      }
    }

    if (selectedServices.length === 0) {
      newErrors.serviceType = 'Select at least one service type';
    }

    if (options.partnerLogoUrl && !validateLogoUrl(options.partnerLogoUrl)) {
      // Error already set in validateLogoUrl function
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setOptions(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setOptions(prev => ({
        ...prev,
        [field]: value
      }));
    }

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('svg') && !file.type.includes('image/')) {
        setErrors(prev => ({
          ...prev,
          partnerLogoFile: 'Please upload an SVG or image file'
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          partnerLogoFile: 'File size must be less than 5MB'
        }));
        return;
      }

      setErrors(prev => ({ ...prev, partnerLogoFile: '', partnerLogoUrl: '' }));
      setOptions(prev => ({
        ...prev,
        partnerLogoFile: file,
        partnerLogoUrl: ''
      }));
    }
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setOptions(prev => ({
      ...prev,
      partnerLogoUrl: url,
      partnerLogoFile: null
    }));
    setErrors(prev => ({ ...prev, partnerLogoUrl: '' }));
  };

  const validateLogoUrl = (url: string): boolean => {
    if (!url) return true;

    try {
      new URL(url);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
      const hasImageExtension = imageExtensions.some(ext =>
        url.toLowerCase().includes(ext)
      );

      if (!hasImageExtension && !url.includes('data:image/') && !url.includes('supabase')) {
        setErrors(prev => ({
          ...prev,
          partnerLogoUrl: 'Please enter a valid image URL'
        }));
        return false;
      }

      return true;
    } catch {
      setErrors(prev => ({
        ...prev,
        partnerLogoUrl: 'Please enter a valid URL'
      }));
      return false;
    }
  };

  // Build event details string from individual fields
  const buildEventDetails = () => {
    const parts = [];
    if (options.serviceTypeText) parts.push(`Service Type: ${options.serviceTypeText}`);
    if (options.eventDate) parts.push(`Date: ${options.eventDate}`);
    if (options.eventTime) parts.push(`Time: ${options.eventTime}`);
    if (options.location) parts.push(`Location: ${options.location}`);
    return parts.join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const finalCustomization: QRCodeSignCustomization = {
        ...options.customization
      };

      const eventDetails = buildEventDetails();

      const qrCodeSignOptions = {
        title: options.title.trim(),
        eventDetails: eventDetails,
        qrCodeUrl: options.qrCodeUrl.trim(),
        serviceType: selectedServices[0] || options.serviceType,
        serviceTypes: selectedServices,
        proposalId: selectedProposalId || undefined,
        partnerLogoFile: options.partnerLogoFile || undefined,
        partnerLogoUrl: options.partnerLogoUrl || undefined,
        partnerName: options.partnerName.trim() || undefined,
        customization: finalCustomization
      };

      let qrCodeSignId;

      if (editingSign) {
        let logoUrl = editingSign.data.partnerLogoUrl || '';

        if (options.partnerLogoFile) {
          logoUrl = await uploadPartnerLogo(options.partnerLogoFile);
        } else if (options.partnerLogoUrl && options.partnerLogoUrl !== editingSign.data.partnerLogoUrl) {
          logoUrl = options.partnerLogoUrl;
        }

        const updateData = {
          ...editingSign.data,
          title: options.title.trim(),
          eventDetails: eventDetails,
          qrCodeUrl: options.qrCodeUrl.trim(),
          serviceType: selectedServices[0] || options.serviceType,
          serviceTypes: selectedServices,
          proposalId: selectedProposalId || undefined,
          partnerLogoUrl: logoUrl,
          partnerName: options.partnerName.trim() || undefined,
          updatedAt: new Date().toISOString()
        };

        await updateQRCodeSign(editingSign.id, {
          data: updateData,
          customization: finalCustomization
        });

        qrCodeSignId = editingSign.id;
        setUpdatedLogoUrl(logoUrl);
      } else {
        qrCodeSignId = await createQRCodeSign(qrCodeSignOptions);
      }

      if (onClose) {
        onClose();
      }

      navigate(`/qr-code-sign/${qrCodeSignId}`);
    } catch (error) {
      console.error('Error creating QR code sign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create QR code sign. Please try again.';
      alert(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 lg:p-12 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-shortcut-navy-blue">
            {editingSign ? 'Edit QR Code Sign' : 'Create QR Code Sign'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-shortcut-navy-blue opacity-40 hover:opacity-60 text-3xl leading-none transition-opacity"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Proposal Link (Optional) */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Link to Proposal</h3>
              <span className="text-sm font-medium text-shortcut-navy-blue opacity-40">Optional</span>
            </div>
            <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium">
              Select a proposal to auto-fill sign details (company, services, date, location, QR code link)
            </p>
            <select
              value={selectedProposalId}
              onChange={(e) => handleProposalSelect(e.target.value)}
              className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
            >
              <option value="">— Select a proposal —</option>
              {sortedProposals.map(p => {
                const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <option key={p.id} value={p.id}>
                    {p.data.clientName || 'Untitled'} — {p.status} — {date}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sign Content */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Sign Content</h3>

            {/* Event Title with character count and regenerate */}
            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Event Title *
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={options.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    maxLength={60}
                    className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                      errors.title ? 'border-accent-coral' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Your Massage Break Awaits"
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                    options.title.length > 55 ? 'text-accent-coral' : 'text-shortcut-navy-blue opacity-40'
                  }`}>
                    {options.title.length}/60
                  </span>
                </div>
                {selectedServices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRegenerateTitle}
                    className="px-3 py-3 border-2 border-gray-300 rounded-lg hover:border-shortcut-teal hover:bg-shortcut-teal/5 transition-all"
                    title="Generate a new title"
                  >
                    <RefreshCw size={18} className="text-shortcut-navy-blue opacity-60" />
                  </button>
                )}
              </div>
              {errors.title && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.title}</p>
              )}
            </div>

            {/* Service Types — Multi-select checkboxes */}
            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Service Type(s) * <span className="font-medium opacity-60">(select up to 3)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICE_TYPE_OPTIONS.map((type) => {
                  const isSelected = selectedServices.includes(type.value);
                  const isDisabled = !isSelected && selectedServices.length >= 3;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => !isDisabled && handleServiceToggle(type.value)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${
                        isSelected
                          ? 'border-shortcut-teal bg-shortcut-teal/10 text-shortcut-navy-blue'
                          : isDisabled
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 text-shortcut-navy-blue hover:border-shortcut-teal/50'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
              {errors.serviceType && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.serviceType}</p>
              )}
              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                The first selected service determines the hero image on the sign
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                QR Code URL *
              </label>
              <input
                type="url"
                value={options.qrCodeUrl}
                onChange={(e) => handleFieldChange('qrCodeUrl', e.target.value)}
                className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                  errors.qrCodeUrl ? 'border-accent-coral' : 'border-gray-300'
                }`}
                placeholder="https://example.com/book-appointment"
              />
              {errors.qrCodeUrl && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.qrCodeUrl}</p>
              )}
              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                This URL will be encoded in the QR code (booking/signup link)
              </p>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Event Details</h3>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Service Type (Display Text)
              </label>
              <input
                type="text"
                value={options.serviceTypeText}
                onChange={(e) => handleFieldChange('serviceTypeText', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., Compression & Sports"
              />
              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                Auto-generated from selected services. Override if you want custom text.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Event Date
              </label>
              <input
                type="text"
                value={options.eventDate}
                onChange={(e) => handleFieldChange('eventDate', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., March 5th"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Event Time
              </label>
              <input
                type="text"
                value={options.eventTime}
                onChange={(e) => handleFieldChange('eventTime', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., 1:00 PM - 5:00 PM"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Location
              </label>
              <input
                type="text"
                value={options.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., Quiet Room"
              />
            </div>
          </div>

          {/* Partner Information (Optional) */}
          <div className="space-y-6">
            <h3 className="text-xl lg:text-2xl font-extrabold text-shortcut-navy-blue">Partner Information (Optional)</h3>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Partner Name
              </label>
              <input
                type="text"
                value={options.partnerName}
                onChange={(e) => handleFieldChange('partnerName', e.target.value)}
                className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                placeholder="e.g., Powin"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-shortcut-navy-blue mb-2">
                Partner Logo
              </label>

              {/* Current logo display */}
              {(() => {
                const currentLogoUrl = updatedLogoUrl || options.partnerLogoUrl || editingSign?.data?.partnerLogoUrl;
                const shouldShowLogo = currentLogoUrl && !options.partnerLogoFile;

                return shouldShowLogo && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                    <p className="text-sm font-medium text-shortcut-navy-blue mb-2">Current logo:</p>
                    <img
                      src={currentLogoUrl}
                      alt="Current logo"
                      className="h-12 w-auto object-contain"
                      onError={(e) => console.error('Logo image failed to load:', currentLogoUrl)}
                    />
                    <p className="text-xs font-medium text-shortcut-navy-blue opacity-60 mt-2">Upload a new file or paste a URL to replace this logo</p>
                  </div>
                );
              })()}

              {/* Input type toggle */}
              <div className="mb-4">
                <div className="flex space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="logoInputType"
                      value="file"
                      checked={logoInputType === 'file'}
                      onChange={(e) => setLogoInputType(e.target.value as 'file' | 'url')}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-shortcut-navy-blue">Upload File</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="logoInputType"
                      value="url"
                      checked={logoInputType === 'url'}
                      onChange={(e) => setLogoInputType(e.target.value as 'file' | 'url')}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-shortcut-navy-blue">Paste URL</span>
                  </label>
                </div>
              </div>

              {/* File upload input */}
              {logoInputType === 'file' && (
                <input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp"
                  onChange={handleLogoFileChange}
                  className="w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                />
              )}

              {/* URL input */}
              {logoInputType === 'url' && (
                <input
                  type="url"
                  value={options.partnerLogoUrl}
                  onChange={handleLogoUrlChange}
                  placeholder="https://example.com/logo.png"
                  className={`w-full px-4 py-3 text-base font-medium border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all ${
                    errors.partnerLogoUrl ? 'border-accent-coral' : 'border-gray-300'
                  }`}
                />
              )}

              {/* Error messages */}
              {errors.partnerLogoFile && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.partnerLogoFile}</p>
              )}
              {errors.partnerLogoUrl && (
                <p className="text-accent-coral text-sm font-medium mt-2">{errors.partnerLogoUrl}</p>
              )}

              <p className="text-shortcut-navy-blue opacity-60 text-sm font-medium mt-2">
                {logoInputType === 'file'
                  ? 'SVG files are preferred for color customization. Max size: 5MB'
                  : 'Paste a direct link to an image (PNG, JPG, SVG, etc.)'
                }
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-8">
            {onClose && (
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (editingSign ? 'Updating...' : 'Creating...') : (editingSign ? 'Update QR Code Sign' : 'Create QR Code Sign')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QRCodeSignCreator;
