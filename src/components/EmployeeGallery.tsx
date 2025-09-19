import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Check, AlertCircle, Download, Mail } from 'lucide-react';
import { HeadshotService } from '../services/HeadshotService';
import { EmployeeGallery as EmployeeGalleryType, GalleryPhoto } from '../types/headshot';
import { supabase } from '../lib/supabaseClient';

const EmployeeGallery: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const [gallery, setGallery] = useState<EmployeeGalleryType | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canChangeSelection, setCanChangeSelection] = useState(false);
  const [eventData, setEventData] = useState<{ event_name: string; client_logo_url?: string } | null>(null);

  useEffect(() => {
    if (token) {
      fetchGallery();
    }
  }, [token]);

  const fetchGallery = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const galleryData = await HeadshotService.getGalleryByToken(token!);
      if (galleryData) {
        setGallery(galleryData);
        setPhotos(galleryData.photos || []);
        
        // Check if a photo is already selected
        const selected = galleryData.photos?.find(photo => photo.is_selected);
        if (selected) {
          setSelectedPhoto(selected.id);
        }
        
        // Determine if selection can be changed
        const isSelectionMade = galleryData.status === 'selection_made' || 
                               galleryData.status === 'retouching' || 
                               galleryData.status === 'completed';
        setCanChangeSelection(!isSelectionMade);

        // Fetch event data for client logo
        try {
          const { data: event, error } = await supabase
            .from('headshot_events')
            .select('event_name, client_logo_url')
            .eq('id', galleryData.event_id)
            .single();

          if (!error && event) {
            setEventData(event);
          }
        } catch (eventErr) {
          console.error('Error fetching event data:', eventErr);
          // Don't fail the whole operation if event data fails
        }
      } else {
        setError('Gallery not found. Please check your link or contact support.');
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Failed to load your photos. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (photoId: string) => {
    if (canChangeSelection) {
      setSelectedPhoto(photoId);
    }
  };

  const handleSubmitSelection = async () => {
    if (!selectedPhoto || !gallery) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Update the gallery with the selected photo
      await HeadshotService.updateGalleryStatus(gallery.id, 'selection_made', selectedPhoto);
      
      setSuccess('Photo selected successfully! We\'ll notify you when your retouched photo is ready for download.');
      
      // Update local state to reflect the change
      setCanChangeSelection(false);
      
      // Refresh the gallery data
      await fetchGallery();
      
    } catch (err) {
      console.error('Error submitting selection:', err);
      setError('Failed to submit your selection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (photoUrl: string, photoName: string) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photoName || 'headshot.jpg';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
      // Fallback to opening in new tab
      window.open(photoUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your photos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            If you have any questions, please contact hello@getshortcut.co
          </p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gallery Not Found</h1>
          <p className="text-gray-600 mb-6">The gallery you're looking for doesn't exist or has expired.</p>
          <p className="text-sm text-gray-500">
            If you have any questions, please contact hello@getshortcut.co
          </p>
        </div>
      </div>
    );
  }

  const isSelectionMade = gallery.status === 'selection_made' || gallery.status === 'retouching' || gallery.status === 'completed';
  const hasFinalPhoto = photos.some(photo => photo.is_final);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client Logo Header */}
      {eventData?.client_logo_url && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-center">
              <img 
                src={eventData.client_logo_url} 
                alt="Client Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Your Headshot Gallery</h1>
              <p className="text-lg text-gray-600">Welcome back, {gallery.employee_name}</p>
              {eventData?.event_name && (
                <p className="text-sm text-gray-500">{eventData.event_name}</p>
              )}
            </div>
            
            {/* Status Badge */}
            <div className="flex-shrink-0">
              {hasFinalPhoto ? (
                <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>Final Photo Ready</span>
                  </div>
                </div>
              ) : isSelectionMade ? (
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>Selection Confirmed</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium border border-amber-200">
                  <div className="flex items-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>Awaiting Selection</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Gallery Status */}
        <div className="mb-8">
          {isSelectionMade && !hasFinalPhoto && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Selection Confirmed</h3>
              <p className="text-blue-800 mb-3">
                Thank you for selecting your photo! We're currently retouching it and will notify you when it's ready for download.
              </p>
              {!canChangeSelection && (
                <button
                  onClick={() => setCanChangeSelection(true)}
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  Change Selection
                </button>
              )}
            </div>
          )}

          {hasFinalPhoto && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Your Final Photo is Ready!</h3>
              <p className="text-green-800">
                Your retouched photo is ready for download. Click the download button below to get your final headshot.
              </p>
            </div>
          )}

          {!isSelectionMade && !hasFinalPhoto && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">Please Select Your Photo</h3>
              <p className="text-amber-800">
                Please review the photos below and select the one you'd like us to retouch. You can only select one photo.
              </p>
            </div>
          )}
        </div>

        {/* Photos Grid */}
        {photos.length > 0 ? (
          <div className="space-y-8">
            {/* Final Photo Section */}
            {hasFinalPhoto && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Your Final Photo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {photos.filter(photo => photo.is_final).map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group bg-white rounded-lg shadow-lg border-2 border-purple-500 ring-2 ring-purple-200 transition-all duration-200"
                    >
                      {/* Photo */}
                      <div className="aspect-square overflow-hidden rounded-t-lg">
                        <img
                          src={photo.photo_url}
                          alt={photo.photo_name || 'Final headshot photo'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Final photo indicator */}
                      <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>

                      {/* Photo info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {photo.photo_name || 'Final Headshot'}
                            </p>
                            <p className="text-xs text-purple-600 font-medium">Final Retouched Photo</p>
                          </div>
                          
                          {/* Download button for final photos */}
                          <button
                            onClick={() => handleDownload(photo.photo_url, photo.photo_name || 'final-headshot.jpg')}
                            className="flex items-center text-purple-600 hover:text-purple-800 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            <span className="text-sm">Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selection Photos Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {hasFinalPhoto ? 'Your Original Photos' : 'Select Your Photo'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.filter(photo => !photo.is_final).map((photo) => (
                    <div
                      key={photo.id}
                      className={`relative group bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${
                        selectedPhoto === photo.id
                          ? canChangeSelection 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : hasFinalPhoto
                            ? 'border-purple-500 ring-2 ring-purple-200'
                            : 'border-green-500 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Photo */}
                      <div className="aspect-square overflow-hidden rounded-t-lg">
                        <img
                          src={photo.photo_url}
                          alt={photo.photo_name || 'Headshot photo'}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => handlePhotoSelect(photo.id)}
                        />
                      </div>

                      {/* Overlay for selection */}
                      {selectedPhoto === photo.id && (
                        <div className={`absolute inset-0 flex items-center justify-center ${
                          canChangeSelection ? 'bg-blue-500 bg-opacity-20' : 
                          hasFinalPhoto ? 'bg-purple-500 bg-opacity-20' : 'bg-green-500 bg-opacity-20'
                        }`}>
                          <div className={`text-white rounded-full p-2 ${
                            canChangeSelection ? 'bg-blue-600' : 
                            hasFinalPhoto ? 'bg-purple-600' : 'bg-green-600'
                          }`}>
                            <Check className="w-6 h-6" />
                          </div>
                        </div>
                      )}

                      {/* Selected indicator for final photo context */}
                      {hasFinalPhoto && selectedPhoto === photo.id && (
                        <div className="absolute top-2 left-2 bg-purple-600 text-white rounded-full px-2 py-1 text-xs font-medium">
                          Selected for Retouching
                        </div>
                      )}

                      {/* Photo info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {photo.photo_name || 'Headshot'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            {/* Submit button */}
            {canChangeSelection && !hasFinalPhoto && selectedPhoto && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleSubmitSelection}
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Selection
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Available</h3>
            <p className="text-gray-600">
              Your photos haven't been uploaded yet. Please contact support if you believe this is an error.
            </p>
          </div>
        )}

        {/* Contact Information */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <span className="text-gray-600 font-medium">Powered by</span>
                <img 
                  src="/shortcut-logo blue.svg" 
                  alt="Shortcut" 
                  className="h-6 w-auto ml-1"
                />
              </div>
              <p className="text-gray-600 mb-2">
                Need help or have questions about your headshots?
              </p>
              <a 
                href="mailto:hello@getshortcut.co" 
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                hello@getshortcut.co
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeGallery;
