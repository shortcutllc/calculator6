import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';
import { useAuth } from '../contexts/AuthContext';
import EditableField from './EditableField';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import { recalculateServiceTotals } from '../utils/proposalGenerator';
import { getProposalUrl } from '../utils/url';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';
import ServiceAgreement from './ServiceAgreement';
import LocationSummary from './LocationSummary';
import { StripeInvoiceButton } from './StripeInvoiceButton';

const formatCurrency = (value: number): string => {
  return value.toFixed(2);
};

// Helper function to capitalize service type
const capitalizeServiceType = (serviceType: string): string => {
  if (!serviceType) return '';
  return serviceType.charAt(0).toUpperCase() + serviceType.slice(1).toLowerCase();
};

// Helper function to format date for display
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'No Date';
    
    // If it's already in YYYY-MM-DD format, parse it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMMM d, yyyy');
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMMM d, yyyy');
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid Date';
  }
};

// Helper function to format date for input (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  try {
    if (!dateString) return '';
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error('Error formatting date for input:', err);
    return '';
  }
};

const ProposalViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getProposal, updateProposal, currentProposal, loading, error } = useProposal();
  const { user } = useAuth();
  const isSharedView = location.search.includes('shared=true');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [displayData, setDisplayData] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<{[key: string]: boolean}>({});
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  const handleDateChange = (path: string[], newDate: string) => {
    if (!editedData || !isEditing) return;
    
    let updatedData = { ...editedData };
    
    // If updating a service date
    if (path.includes('services')) {
      const [_, location, oldDate, serviceIndex] = path;
      
      // Create new date entry if it doesn't exist
      if (!updatedData.services[location][newDate]) {
        updatedData.services[location][newDate] = {
          services: [],
          totalCost: 0,
          totalAppointments: 0
        };
      }

      // Move the service to the new date
      const serviceToMove = updatedData.services[location][oldDate].services[serviceIndex];
      updatedData.services[location][newDate].services.push({
        ...serviceToMove,
        date: newDate
      });

      // Remove service from old date
      updatedData.services[location][oldDate].services.splice(serviceIndex, 1);

      // Clean up old date if no services remain
      if (updatedData.services[location][oldDate].services.length === 0) {
        delete updatedData.services[location][oldDate];
      }
    } 
    // If updating event dates directly
    else if (path[0] === 'eventDates') {
      const index = parseInt(path[1]);
      updatedData.eventDates[index] = newDate;
    }

    // Update eventDates array to match all service dates
    const allDates = new Set<string>();
    Object.values(updatedData.services || {}).forEach((locationData: any) => {
      Object.keys(locationData).forEach(date => allDates.add(date));
    });
    updatedData.eventDates = Array.from(allDates).sort();

    // Recalculate totals and update state
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
    setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
  };

  useEffect(() => {
    if (displayData?.services) {
      const initialLocations: {[key: string]: boolean} = {};
      const initialDates: {[key: string]: boolean} = {};
      
      Object.keys(displayData.services).forEach(location => {
        initialLocations[location] = true;
        Object.keys(displayData.services[location]).forEach(date => {
          initialDates[date] = true;
        });
      });
      
      setExpandedLocations(initialLocations);
      setExpandedDates(initialDates);
    }
  }, [displayData]);

  useEffect(() => {
    if (!id) {
      setLoadError('Proposal ID is required');
      return;
    }
    
    initializeProposal();
  }, [id]);

  const initializeProposal = async () => {
    try {
      setLoadError(null);
      setIsLoading(true);
      
      const proposal = await getProposal(id!);
      if (!proposal) {
        throw new Error('Proposal not found');
      }
      
      const calculatedData = recalculateServiceTotals(proposal.data);
      
      setEditedData({ ...calculatedData, customization: proposal.customization });
      setDisplayData({ ...calculatedData, customization: proposal.customization });
      setNotes(proposal.notes || '');
      setIsShared(proposal.is_shared || false);
      
      if (proposal.originalData) {
        const originalCalculated = recalculateServiceTotals(proposal.originalData);
        setOriginalData({ ...originalCalculated, customization: proposal.customization });
        
        if (proposal.hasChanges) {
          setHasChanges(true);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load proposal';
      setLoadError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVersion = () => {
    if (showingOriginal) {
      setDisplayData({ ...editedData, customization: currentProposal?.customization });
    } else {
      const originalCalculated = recalculateServiceTotals(originalData);
      setDisplayData({ ...originalCalculated, customization: currentProposal?.customization });
    }
    setShowingOriginal(!showingOriginal);
    setIsEditing(false);
  };

  const toggleEditMode = () => {
    if (showingOriginal) {
      setShowingOriginal(false);
      setDisplayData({ ...editedData, customization: currentProposal?.customization });
    }
    setIsEditing(!isEditing);
    if (!isEditing) {
      const currentData = currentProposal?.data || editedData;
      setEditedData(recalculateServiceTotals(JSON.parse(JSON.stringify(currentData))));
    }
  };

  const handleFieldChange = (path: string[], value: any) => {
    if (!editedData || !isEditing) return;
    
    let updatedData = { ...editedData };
    let target = updatedData;
    
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    
    target[path[path.length - 1]] = value;
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
    setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
  };

  const handleSaveChanges = async () => {
    if (!id || !editedData) return;
    
    try {
      setIsSavingChanges(true);
      const recalculatedData = recalculateServiceTotals(editedData);
      const success = await updateProposal(id, {
        ...recalculatedData,
        customization: currentProposal?.customization
      });
      
      if (success) {
        setIsEditing(false);
        setEditedData({ ...recalculatedData, customization: currentProposal?.customization });
        setDisplayData({ ...recalculatedData, customization: currentProposal?.customization });
        setHasChanges(true);
      } else {
        setLoadError('Failed to save changes');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      setLoadError(errorMessage);
      console.error(error);
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      setIsSavingNotes(true);
      
      const { error } = await supabase
        .from('proposals')
        .update({
          notes,
          has_changes: true,
          pending_review: true
        })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving notes:', err);
      setLoadError('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const toggleShared = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .update({ is_shared: !isShared })
        .eq('id', id);

      if (error) throw error;
      setIsShared(!isShared);
    } catch (err) {
      console.error('Error toggling share status:', err);
      alert('Failed to update sharing status');
    }
  };

  const copyShareLink = async () => {
    const shareUrl = getProposalUrl(id!, true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const filename = `${displayData.clientName.replace(/\s+/g, '-').toLowerCase()}-proposal.pdf`;
      await generatePDF('proposal-content', filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleLocation = (location: string) => {
    setExpandedLocations(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shortcut-blue"></div>
      </div>
    );
  }

  if (loadError || error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 mb-4">
            <X size={48} className="mx-auto" />
          </div>
          <p className="text-xl text-red-500 mb-4">{loadError || error}</p>
          <Button 
            onClick={() => navigate('/')}
            variant="primary"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-500">No proposal data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm py-4 px-4 sm:px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            {!isSharedView && (
              <Button 
                onClick={() => navigate('/history')}
                variant="secondary"
                icon={<ArrowLeft size={20} />}
              >
                Back
              </Button>
            )}
            <img 
              src="/shortcut-logo blue.svg" 
              alt="Shortcut Logo" 
              className="h-8 w-auto"
            />
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleDownload}
              variant="secondary"
              icon={<Download size={18} />}
              loading={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            {!isSharedView && <StripeInvoiceButton proposalData={displayData} />}
            {originalData && (
              <Button
                onClick={toggleVersion}
                variant="secondary"
                icon={<HistoryIcon size={18} />}
              >
                {showingOriginal ? 'View Current' : 'View Original'}
              </Button>
            )}
            {!isSharedView && (
              <>
                {!showingOriginal && (
                  isEditing ? (
                    <Button
                      onClick={handleSaveChanges}
                      variant="primary"
                      icon={<Save size={18} />}
                      loading={isSavingChanges}
                    >
                      {isSavingChanges ? 'Saving...' : 'Save Changes'}
                    </Button>
                  ) : (
                    <Button
                      onClick={toggleEditMode}
                      variant="primary"
                      icon={<Edit size={18} />}
                    >
                      Edit
                    </Button>
                  )
                )}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={toggleShared}
                    variant={isShared ? 'primary' : 'secondary'}
                    icon={<Globe size={18} />}
                  >
                    {isShared ? 'Public' : 'Private'}
                  </Button>
                  {isShared && (
                    <Button
                      onClick={copyShareLink}
                      variant="secondary"
                      icon={showCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    >
                      {showCopied ? 'Copied!' : 'Copy Link'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4" id="proposal-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-shortcut-blue mb-4">
                {displayData.clientName}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Event Dates</p>
                  {isEditing ? (
                    <div className="space-y-2">
                      {Array.isArray(displayData.eventDates) ? 
                        displayData.eventDates.map((date: string, index: number) => (
                          <input
                            key={index}
                            type="date"
                            value={formatDateForInput(date)}
                            onChange={(e) => handleDateChange(['eventDates', index], e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
                          />
                        )) :
                        <p className="text-lg">No dates available</p>
                      }
                    </div>
                  ) : (
                    <p className="text-lg">
                      {Array.isArray(displayData.eventDates) ? 
                        displayData.eventDates.map((date: string) => formatDate(date)).join(', ') :
                        'No dates available'
                      }
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Locations</p>
                  <p className="text-lg">{displayData.locations?.join(', ') || 'No locations available'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {Object.entries(displayData.services || {}).map(([location, locationData]: [string, any]) => (
                <div key={location} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 flex justify-between items-center bg-gray-50">
                    <button
                      onClick={() => toggleLocation(location)}
                      className="flex-1 flex items-center justify-between hover:bg-shortcut-teal/20 transition-colors"
                    >
                      <h2 className="text-2xl font-bold text-shortcut-blue">
                        {location}
                      </h2>
                      {expandedLocations[location] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {!showingOriginal && !isSharedView && (
                      <div className="ml-4">
                        {isEditing ? (
                          <Button
                            onClick={handleSaveChanges}
                            variant="primary"
                            size="sm"
                            icon={<Save size={16} />}
                            loading={isSavingChanges}
                          >
                            {isSavingChanges ? 'Saving...' : 'Save'}
                          </Button>
                        ) : (
                          <Button
                            onClick={toggleEditMode}
                            variant="secondary"
                            size="sm"
                            icon={<Edit size={16} />}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {expandedLocations[location] && (
                    <div className="p-8 space-y-8">
                      {Object.entries(locationData)
                        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                        .map(([date, dateData]: [string, any], dateIndex: number) => (
                          <div key={date} className="border border-gray-300 rounded-xl overflow-hidden">
                            <button
                              onClick={() => toggleDate(date)}
                              className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-shortcut-teal/20 transition-colors"
                            >
                              <h3 className="text-xl font-bold text-shortcut-blue">
                                Day {dateIndex + 1} - {formatDate(date)}
                              </h3>
                              {expandedDates[date] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {expandedDates[date] && (
                              <div className="p-8">
                                {dateData.services.map((service: any, serviceIndex: number) => (
                                  <div 
                                    key={serviceIndex} 
                                    className="bg-gray-50 rounded-lg p-6 mb-6"
                                  >
                                    <h4 className="text-xl font-bold text-shortcut-blue mb-4">
                                      Service Type: {capitalizeServiceType(service.serviceType)}
                                    </h4>
                                    <div className="grid gap-0">
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base text-gray-700">Service Date:</span>
                                        <div className="font-semibold">
                                          {isEditing ? (
                                            <input
                                              type="date"
                                              value={formatDateForInput(date)}
                                              onChange={(e) => handleDateChange(['services', location, date, serviceIndex], e.target.value)}
                                              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
                                            />
                                          ) : (
                                            formatDate(date)
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base text-gray-700">Total Hours:</span>
                                        <div className="font-semibold">
                                          <EditableField
                                            value={service.totalHours}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'totalHours'], Number(value))}
                                            isEditing={isEditing}
                                            type="number"
                                            suffix=" hours"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base text-gray-700">Number of Professionals:</span>
                                        <div className="font-semibold">
                                          <EditableField
                                            value={service.numPros}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'numPros'], Number(value))}
                                            isEditing={isEditing}
                                            type="number"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base text-gray-700">Total Appointments:</span>
                                        <span className="font-semibold">{service.totalAppointments}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-3">
                                        <span className="text-base text-gray-700">Service Cost:</span>
                                        <span className="font-semibold">${formatCurrency(service.serviceCost)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                <div className="bg-blue-50 rounded-lg p-8">
                                  <h4 className="text-lg font-bold text-shortcut-blue mb-3">Day {dateIndex + 1} Summary</h4>
                                  <div className="grid gap-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total Appointments:</span>
                                      <span>{dateData.totalAppointments || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total Cost:</span>
                                      <span>${formatCurrency(dateData.totalCost || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <ServiceAgreement />
          </div>

          <div className="lg:sticky lg:top-24 space-y-8 self-start">
            {Object.entries(displayData.services || {}).map(([location, locationData]) => (
              <LocationSummary 
                key={location}
                location={location}
                services={locationData}
              />
            ))}

            <div className="bg-shortcut-blue text-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6 text-white">Event Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Total Appointments:</span>
                  <span className="font-semibold">{displayData.summary?.totalAppointments}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Total Event Cost:</span>
                  <span className="font-semibold">${formatCurrency(displayData.summary?.totalEventCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Professional Revenue:</span>
                  <span className="font-semibold">${formatCurrency(displayData.summary?.totalProRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span>Net Profit:</span>
                  <span className="font-semibold">${formatCurrency(displayData.summary?.netProfit || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>Profit Margin:</span>
                  <span className="font-semibold">{displayData.summary?.profitMargin.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-shortcut-blue">Notes</h2>
                {notes && (
                  <Button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    variant="primary"
                    icon={<Save size={18} />}
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about the proposal here..."
                className="w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProposalViewer;