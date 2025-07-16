import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { config } from '../config';
import { recalculateServiceTotals } from '../utils/proposalGenerator';
import { getServiceBorderClass } from '../utils/styleHelpers';
import EditableField from './EditableField';
import { format } from 'date-fns';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';
import InstructionalScroller from './InstructionalScroller';
import ServiceAgreement from './ServiceAgreement';
import LocationSummary from './LocationSummary';




const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
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

export const StandaloneProposalViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showChangesSaved, setShowChangesSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<{[key: string]: boolean}>({});
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});
  const [isCustomNoteExpanded, setIsCustomNoteExpanded] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);



  usePageTitle('View Proposal');

  const toggleVersion = () => {
    if (showingOriginal) {
      setDisplayData({ ...editedData, customization: proposal?.customization });
    } else {
      const originalCalculated = recalculateServiceTotals(originalData);
      setDisplayData({ ...originalCalculated, customization: proposal?.customization });
    }
    setShowingOriginal(!showingOriginal);
    setIsEditing(false);
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
    const fetchProposal = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Proposal not found');

        const calculatedData = recalculateServiceTotals(data.data);
        setProposal(data);
        setDisplayData({ ...calculatedData, customization: data.customization });
        setEditedData({ ...calculatedData, customization: data.customization });
        setNotes(data.notes || '');
        
        if (data.original_data) {
          const originalCalculated = recalculateServiceTotals(data.original_data);
          setOriginalData({ ...originalCalculated, customization: data.customization });
        }
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [id]);

  const handleFieldChange = (path: string[], value: string | number | undefined) => {
    if (!editedData || !isEditing) return;
    
    let updatedData = { ...editedData };
    let target = updatedData;
    
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    
    target[path[path.length - 1]] = value;
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: proposal?.customization });
    setDisplayData({ ...recalculatedData, customization: proposal?.customization });
  };

  const handleSaveChanges = async () => {
    if (!id || !editedData) return;
    
    try {
      setIsSavingChanges(true);
      
      const { error } = await supabase
        .from('proposals')
        .update({
          data: editedData,
          has_changes: true,
          pending_review: true,
          original_data: originalData || proposal.data,
          customization: proposal.customization
        })
        .eq('id', id);

      if (error) throw error;

      setDisplayData({ ...editedData, customization: proposal.customization });
      setIsEditing(false);

      setShowChangesSaved(true);
      setTimeout(() => setShowChangesSaved(false), 3000);
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes');
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

      if (error)
        throw error;

      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
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

  const handleApproval = async () => {
    if (!id || !displayData) return;
    
    try {
      setIsApproving(true);
      
      // First, update the proposal status in the database
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          status: 'approved',
          pending_review: false,
          has_changes: false
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Then, send the approval notification
      const response = await fetch(`${config.supabase.url}/functions/v1/proposal-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientName: displayData.clientName,
          totalCost: displayData.summary?.totalEventCost || 0,
          eventDates: displayData.eventDates,
          locations: displayData.locations
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send approval notification');
      }

      setShowApprovalSuccess(true);
      setTimeout(() => setShowApprovalSuccess(false), 5000);
    } catch (err) {
      console.error('Error approving proposal:', err);
      alert('Failed to approve proposal. Please try again.');
    } finally {
      setIsApproving(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !displayData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error Loading Proposal</h2>
          <p className="text-gray-600 mb-6">{error || 'No proposal data available'}</p>
          <Button
            onClick={() => navigate(config.app.routes.home)}
            variant="primary"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/shortcut-logo blue.svg" 
                alt="Shortcut Logo" 
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              {showChangesSaved && (
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={18} className="mr-2" />
                  <span>Changes saved!</span>
                </div>
              )}
              {showApprovalSuccess && (
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={18} className="mr-2" />
                  <span>Proposal approved! Team notified.</span>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => setShowApprovalConfirm(true)}
                  variant="primary"
                  icon={<Check size={18} />}
                  loading={isApproving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isApproving ? 'Approving...' : 'Approve Proposal'}
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  icon={<Download size={18} />}
                  loading={isDownloading}
                >
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </Button>

                {originalData && (
                  <Button
                    onClick={toggleVersion}
                    variant="secondary"
                    icon={<HistoryIcon size={18} />}
                  >
                    {showingOriginal ? 'View Current' : 'View Original'}
                  </Button>
                )}
                {proposal?.is_editable && !showingOriginal && (
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
                      onClick={() => setIsEditing(true)}
                      variant="primary"
                      icon={<Edit size={18} />}
                    >
                      Edit
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4" id="proposal-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-shortcut-blue mb-4">
                {displayData.clientName}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Event Dates</p>
                  <p className="text-lg">
                    {Array.isArray(displayData.eventDates) ? 
                      displayData.eventDates.map((date: string) => formatDate(date)).join(', ') :
                      'No dates available'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Locations</p>
                  <p className="text-lg">{displayData.locations?.join(', ') || 'No locations available'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <InstructionalScroller />

              {displayData.customization?.customNote && (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => setIsCustomNoteExpanded(!isCustomNoteExpanded)}
                    className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-shortcut-teal/20 transition-colors"
                  >
                    <h2 className="text-2xl font-bold text-shortcut-blue">
                      Note from Shortcut
                    </h2>
                    {isCustomNoteExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  
                  {isCustomNoteExpanded && (
                    <div className="p-8">
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {displayData.customization.customNote.replace('above', 'below')}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                    {proposal?.is_editable && !showingOriginal && (
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
                            onClick={() => setIsEditing(true)}
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
                                    className={`bg-gray-50 rounded-lg p-6 mb-6 ${getServiceBorderClass(service.serviceType)}`}
                                  >
                                    <h4 className="text-xl font-bold text-shortcut-blue mb-4">
                                      Service Type: {capitalizeServiceType(service.serviceType)}
                                    </h4>
                                    <div className="grid gap-0">
                                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-base text-gray-700">Total Hours:</span>
                                        <div className="font-semibold">
                                          <EditableField
                                            value={service.totalHours}
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'totalHours'], value)}
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
                                            onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'numPros'], value)}
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

            <div className="mt-16">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-shortcut-blue">
                  The Shortcut Difference
                </h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const container = document.getElementById('carousel');
                      if (container) {
                        container.scrollBy({ left: -400, behavior: 'smooth' });
                      }
                    }}
                    className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={24} className="text-shortcut-blue" />
                  </button>
                  <button 
                    onClick={() => {
                      const container = document.getElementById('carousel');
                      if (container) {
                        container.scrollBy({ left: 400, behavior: 'smooth' });
                      }
                    }}
                    className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={24} className="text-shortcut-blue" />
                  </button>
                </div>
              </div>
              
              <div id="carousel" className="flex overflow-x-auto pb-6 gap-8 hide-scrollbar">
                <div className="bg-white rounded-2xl min-w-[360px] max-w-[420px] flex-none shadow-lg overflow-hidden flex flex-col">
                  <div className="w-full h-64">
                    <img 
                      src="/Seamless Experience.png"
                      alt="Seamless wellness experiences by Shortcut"
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Image failed to load:', (e.target as HTMLImageElement).src)}
                    />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-shortcut-blue mb-3">
                      Seamless Experiences
                    </h3>
                    <p className="text-base text-gray-700 leading-relaxed flex-grow">
                      We make wellness effortless. Easily integrate our services and create experiences your team will love.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl min-w-[360px] max-w-[420px] flex-none shadow-lg overflow-hidden flex flex-col">
                  <div className="w-full h-64">
                    <img 
                      src="/Revitalizing Impact.png"
                      alt="Revitalizing impact of Shortcut's wellness services"
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Image failed to load:', (e.target as HTMLImageElement).src)}
                    />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-shortcut-blue mb-3">
                      Revitalizing Impact
                    </h3>
                    <p className="text-base text-gray-700 leading-relaxed flex-grow">
                      Transform office days into feel-good moments. Boost engagement and watch your team thrive with our revitalizing services.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl min-w-[360px] max-w-[420px] flex-none shadow-lg overflow-hidden flex flex-col">
                  <div className="w-full h-64">
                    <img 
                      src="/All-in-One Wellness.png"
                      alt="All-in-one corporate wellness solutions by Shortcut"
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Image failed to load:', (e.target as HTMLImageElement).src)}
                    />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-shortcut-blue mb-3">
                      All-in-One Wellness
                    </h3>
                    <p className="text-base text-gray-700 leading-relaxed flex-grow">
                      All your corporate wellness needs, simplified. Discover inspiring services that energize your team, all in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                <div className="flex justify-between items-center py-2">
                  <span>Total Event Cost:</span>
                  <span className="font-semibold">${formatCurrency(displayData.summary?.totalEventCost || 0)}</span>
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
                className="w-full min-h-[120px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue resize-y"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Approval Confirmation Modal */}
      {showApprovalConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Approve Proposal
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve this proposal? This will notify our team and mark the proposal as approved.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => setShowApprovalConfirm(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowApprovalConfirm(false);
                  handleApproval();
                }}
                variant="primary"
                className="flex-1 bg-green-600 hover:bg-green-700"
                loading={isApproving}
              >
                {isApproving ? 'Approving...' : 'Yes, Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default StandaloneProposalViewer;