import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';
import { useAuth } from '../hooks/useAuth';
import EditableField from './EditableField';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import { recalculateServiceTotals } from '../utils/proposalGenerator';
import { getProposalUrl } from '../utils/url';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';

const formatCurrency = (value: number): string => {
  return value.toFixed(2);
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

  const formatDate = (dateString: string): string => {
    try {
      console.log('Formatting date:', dateString);
      if (!dateString) return 'No Date';
      const date = new Date(dateString);
      console.log('Parsed date:', date);
      if (isNaN(date.getTime())) {
        console.error('Invalid date detected:', dateString);
        return 'Invalid Date';
      }
      return format(date, 'MMMM d, yyyy');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid Date';
    }
  };

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
      
      console.log('Raw proposal data:', proposal);
      const calculatedData = recalculateServiceTotals(proposal.data);
      console.log('Calculated data:', calculatedData);
      
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
        alert('Changes saved successfully');
      } else {
        setLoadError('Failed to save changes');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      setLoadError(errorMessage);
      console.error(error);
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
      const filename = `${displayData.clientName.replace(/\s+/g, '-').toLowerCase()}-proposal.pdf`;
      await generatePDF('proposal-content', filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#175071]"></div>
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
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660]"
          >
            Return Home
          </button>
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
      <header className="bg-white shadow-sm py-4 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {!isSharedView && (
              <button 
                onClick={() => navigate('/history')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-2xl font-semibold text-[#175071]">
              {displayData.clientName}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              variant="secondary"
              icon={<Download size={18} />}
            >
              Download PDF
            </Button>
            {originalData && (
              <button 
                onClick={toggleVersion}
                className={`px-4 py-2 ${
                  showingOriginal ? 'bg-blue-600' : 'bg-gray-600'
                } text-white rounded-md font-medium flex items-center`}
              >
                <HistoryIcon size={18} className="mr-2" />
                {showingOriginal ? 'View Current' : 'View Original'}
              </button>
            )}
            {!isSharedView && (
              <>
                {!showingOriginal && (
                  isEditing ? (
                    <button
                      onClick={handleSaveChanges}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                      <Save size={18} className="mr-2" />
                      Save Changes
                    </button>
                  ) : (
                    <button
                      onClick={toggleEditMode}
                      className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660] flex items-center"
                    >
                      <Edit size={18} className="mr-2" />
                      Edit
                    </button>
                  )
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleShared}
                    className={`px-4 py-2 ${
                      isShared ? 'bg-green-600' : 'bg-gray-600'
                    } text-white rounded-md hover:opacity-90 flex items-center`}
                  >
                    <Globe size={18} className="mr-2" />
                    {isShared ? 'Public' : 'Private'}
                  </button>
                  {isShared && (
                    <button
                      onClick={copyShareLink}
                      className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660] flex items-center"
                    >
                      {showCopied ? (
                        <>
                          <Check size={18} className="mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={18} className="mr-2" />
                          Copy Link
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4" id="proposal-content">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-medium text-gray-700 mb-2">Event Details</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Event Dates</p>
                    <p className="text-lg">
                      {Array.isArray(displayData.eventDates) ? 
                        displayData.eventDates.map((date: string) => formatDate(date)).join(', ') :
                        'No dates available'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Locations</p>
                    <p className="text-lg">{displayData.locations?.join(', ') || 'No locations available'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-700 mb-2">Summary</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Appointments</p>
                    <p className="text-lg">{displayData.summary?.totalAppointments}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Cost</p>
                    <p className="text-lg">${formatCurrency(displayData.summary?.totalEventCost || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {displayData.customization?.customNote && (
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-xl font-semibold mb-4">Custom Note</h2>
              <p className="text-gray-600 whitespace-pre-wrap">
                {displayData.customization.customNote}
              </p>
            </div>
          )}

          {Object.entries(displayData.services || {}).map(([location, locationData]: [string, any]) => (
            <div key={location} className="mb-8">
              <h2 className="text-2xl font-semibold mb-6 bg-white rounded-lg shadow-md p-6">
                {location}
              </h2>
              
              {Object.entries(locationData)
                .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                .map(([date, dateData]: [string, any], dateIndex: number) => (
                <div key={date} className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">
                    Day {dateIndex + 1} - {formatDate(date)}
                  </h3>
                  
                  {dateData.services.map((service: any, serviceIndex: number) => {
                    const originalService = originalData?.services?.[location]?.[date]?.services?.[serviceIndex];
                    
                    return (
                      <div key={serviceIndex} className="bg-gray-50 rounded-lg p-6 mb-4">
                        <h4 className="font-semibold mb-3">Service {serviceIndex + 1}: {service.serviceType}</h4>
                        <div className="grid gap-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Hours:</span>
                            <EditableField
                              value={service.totalHours}
                              onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'totalHours'], Number(value))}
                              isEditing={isEditing && !showingOriginal}
                              type="number"
                              suffix=" hours"
                              originalValue={originalService?.totalHours}
                              showChange={false}
                            />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Number of Professionals:</span>
                            <EditableField
                              value={service.numPros}
                              onChange={(value) => handleFieldChange(['services', location, date, 'services', serviceIndex, 'numPros'], Number(value))}
                              isEditing={isEditing && !showingOriginal}
                              type="number"
                              originalValue={originalService?.numPros}
                              showChange={false}
                            />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Appointments:</span>
                            <span>{service.totalAppointments}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Service Cost:</span>
                            <EditableField
                              value={service.serviceCost}
                              isEditing={false}
                              type="number"
                              prefix="$"
                              originalValue={originalService?.serviceCost}
                              showChange={false}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-semibold mb-3">Day {dateIndex + 1} Totals</h4>
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
              ))}

              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold mb-3">{location} Totals</h4>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Appointments:</span>
                    <span>{Object.values(locationData).reduce((sum: number, day: any) => sum + day.totalAppointments, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span>${formatCurrency(Object.values(locationData).reduce((sum: number, day: any) => sum + day.totalCost, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-shortcut-blue text-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold mb-6 text-white">Event Summary</h2>
            <div className="grid gap-4 text-white">
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

          <div className="bg-white rounded-lg shadow-md p-8 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-[#175071]">Notes</h2>
              {notes && (
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or comments about the proposal here..."
              className="w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#175071]"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProposalViewer;