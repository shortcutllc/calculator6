import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Eye, Share2, ArrowLeft, Check, X, History as HistoryIcon, Globe, Copy, CheckCircle2, Download } from 'lucide-react';
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

  usePageTitle('View Proposal');

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

  const toggleVersion = () => {
    if (showingOriginal) {
      setDisplayData({ ...editedData, customization: proposal?.customization });
    } else {
      const originalCalculated = recalculateServiceTotals(originalData);
      setDisplayData({ ...originalCalculated, customization: proposal?.customization });
    }
    setShowingOriginal(!showingOriginal);
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

  const handleFieldChange = (path: string[], value: any) => {
    if (!editedData || !isEditing) return;
    
    let updatedData = { ...editedData };
    let target = updatedData;
    
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    
    target[path[path.length - 1]] = value;
    const recalculatedData = recalculateServiceTotals(updatedData);
    setEditedData({ ...recalculatedData, customization: proposal.customization });
    setDisplayData({ ...recalculatedData, customization: proposal.customization });
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
          <button
            onClick={() => navigate(config.app.routes.home)}
            className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660]"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#175071] line-clamp-1">
              {displayData.clientName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleDownload}
                variant="secondary"
                icon={<Download size={18} />}
                loading={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
              {showChangesSaved && (
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={18} className="mr-2" />
                  <span>Changes saved!</span>
                </div>
              )}
              {originalData && (
                <button 
                  onClick={toggleVersion}
                  className={`px-4 py-2 ${
                    showingOriginal ? 'bg-blue-600' : 'bg-gray-600'
                  } text-white rounded-full font-medium flex items-center gap-2 transition-colors`}
                >
                  <HistoryIcon size={18} />
                  <span className="hidden sm:inline">{showingOriginal ? 'View Current' : 'View Original'}</span>
                </button>
              )}
              {proposal?.is_editable && !showingOriginal && (
                isEditing ? (
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSavingChanges}
                    className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {isSavingChanges ? (
                      <>
                        <LoadingSpinner size="small" className="mr-2" />
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span className="hidden sm:inline">Save Changes</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[#175071] text-white rounded-full hover:bg-[#134660] flex items-center gap-2 transition-colors"
                  >
                    <Edit size={18} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8" id="proposal-content">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-medium text-gray-700 mb-2">Event Details</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Event Dates</p>
                    <p className="text-lg">
                      {Array.isArray(displayData.eventDates) 
                        ? displayData.eventDates
                            .map((date: string) => formatDate(date))
                            .join(', ')
                        : 'No dates available'}
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Custom Note</h2>
              <p className="text-gray-600 whitespace-pre-wrap">
                {displayData.customization.customNote}
              </p>
            </div>
          )}

          {Object.entries(displayData.services || {}).map(([location, locationData]: [string, any]) => (
            <div key={location} className="space-y-6">
              <h2 className="text-2xl font-semibold bg-white rounded-lg shadow-md p-6">
                {location}
              </h2>
              
              {Object.entries(locationData)
                .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                .map(([date, dateData]: [string, any], dateIndex: number) => (
                <div key={date} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    Day {dateIndex + 1} - {formatDate(date)}
                  </h3>
                  
                  <div className="space-y-4">
                    {dateData.services.map((service: any, serviceIndex: number) => {
                      const originalService = originalData?.services?.[location]?.[date]?.services?.[serviceIndex];
                      
                      return (
                        <div key={serviceIndex} className="bg-gray-50 rounded-lg p-6">
                          <h4 className="font-semibold mb-4">Service {serviceIndex + 1}: {service.serviceType}</h4>
                          <div className="grid gap-4">
                            <div className="flex justify-between items-center">
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
                            <div className="flex justify-between items-center">
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
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total Appointments:</span>
                              <span>{service.totalAppointments}</span>
                            </div>
                            <div className="flex justify-between items-center">
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
                      <h4 className="font-semibold mb-4">Day {dateIndex + 1} Summary</h4>
                      <div className="grid gap-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Appointments:</span>
                          <span>{dateData.totalAppointments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Cost:</span>
                          <span>${formatCurrency(dateData.totalCost || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold mb-4">{location} Summary</h4>
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Appointments:</span>
                    <span>{Object.values(locationData).reduce((sum: number, day: any) => sum + day.totalAppointments, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Cost:</span>
                    <span>${formatCurrency(Object.values(locationData).reduce((sum: number, day: any) => sum + day.totalCost, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-shortcut-blue text-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-6">Event Summary</h2>
              <div className="grid gap-4">
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
                  <span className="font-semibold">{(displayData.summary?.profitMargin || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-2xl font-semibold text-[#175071]">Notes</h2>
              <div className="flex items-center gap-4">
                {showSaveSuccess && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 size={18} className="mr-2" />
                    <span>Notes saved!</span>
                  </div>
                )}
                {notes && (
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {isSavingNotes ? (
                      <>
                        <LoadingSpinner size="small" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Notes
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or comments about the proposal here..."
              className="w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#175071] focus:border-transparent transition-shadow"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default StandaloneProposalViewer;

export { StandaloneProposalViewer };