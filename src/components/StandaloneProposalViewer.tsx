import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { config } from '../config';
import { recalculateServiceTotals } from '../utils/proposalGenerator';
import EditableField from './EditableField';
import { format } from 'date-fns';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';

const formatCurrency = (value: number): string => {
  return value.toFixed(2);
};

const StandaloneProposalViewer: React.FC = () => {
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

  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) return 'No Date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'MMMM d, yyyy');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid Date';
    }
  };

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

  const handleFieldChange = (path: string[], value: any) => {
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

      if (error) throw error;

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
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
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
              <div className="flex gap-2">
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
          <div className="lg:col-span-2 space-y-8">
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

            {displayData.customization?.customNote && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-shortcut-blue mb-4">Custom Note</h2>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {displayData.customization.customNote}
                </p>
              </div>
            )}

            {Object.entries(displayData.services || {}).map(([location, locationData]: [string, any]) => (
              <div key={location} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleLocation(location)}
                  className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-shortcut-blue">
                    {location}
                  </h2>
                  {expandedLocations[location] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandedLocations[location] && (
                  <div className="p-8 space-y-8">
                    {Object.entries(locationData)
                      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                      .map(([date, dateData]: [string, any], dateIndex: number) => (
                        <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleDate(date)}
                            className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <h3 className="text-xl font-bold text-shortcut-blue">
                              Day {dateIndex + 1} - {formatDate(date)}
                            </h3>
                            {expandedDates[date] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {expandedDates[date] && (
                            <div className="p-4">
                              {dateData.services.map((service: any, serviceIndex: number) => (
                                <div key={serviceIndex} className="bg-gray-50 rounded-lg p-8 mb-6">
                                  <h4 className="text-lg font-bold text-shortcut-blue mb-3">
                                    Service {serviceIndex + 1}: {service.serviceType}
                                  </h4>
                                  <div className="grid gap-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total Hours:</span>
                                      <EditableField
                                        value={service.totalHours}
                                        onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'totalHours'], Number(value))}
                                        isEditing={isEditing}
                                        type="number"
                                        suffix=" hours"
                                      />
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Number of Professionals:</span>
                                      <EditableField
                                        value={service.numPros}
                                        onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'numPros'], Number(value))}
                                        isEditing={isEditing}
                                        type="number"
                                      />
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total Appointments:</span>
                                      <span>{service.totalAppointments}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Service Cost:</span>
                                      <span>${formatCurrency(service.serviceCost)}</span>
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

          <div className="lg:sticky lg:top-24 space-y-8 self-start">
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
                {proposal?.is_editable && notes && (
                  <div className="flex items-center gap-2">
                    {showSaveSuccess && (
                      <span className="text-green-600 text-sm flex items-center">
                        <CheckCircle2 size={14} className="mr-1" />
                        Saved
                      </span>
                    )}
                    <Button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      variant="primary"
                      size="sm"
                      icon={<Save size={14} />}
                    >
                      {isSavingNotes ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
              <textarea
                value={notes}
                onChange={proposal?.is_editable ? (e) => setNotes(e.target.value) : undefined}
                className="w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
                readOnly={!proposal?.is_editable}
                placeholder={proposal?.is_editable ? "Add any notes or comments about the proposal here..." : "No notes available"}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StandaloneProposalViewer;

export { StandaloneProposalViewer };