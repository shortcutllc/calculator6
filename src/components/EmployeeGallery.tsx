import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Check, AlertCircle, Download, ArrowLeft } from 'lucide-react';
import { HeadshotService } from '../services/HeadshotService';
import { EmployeeGallery as EmployeeGalleryType, GalleryPhoto } from '../types/headshot';

const EmployeeGallery: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [gallery, setGallery] = useState<EmployeeGalleryType | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canChangeSelection, setCanChangeSelection] = useState(false);

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

  const handleDownload = (photoUrl: string, photoName: string) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = photoName || 'headshot.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
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
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isSelectionMade = gallery.status === 'selection_made' || gallery.status === 'retouching' || gallery.status === 'completed';
  const hasFinalPhoto = photos.some(photo => photo.is_final);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Headshot Gallery</h1>
              <p className="text-gray-600">Hello {gallery.employee_name}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </button>
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
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {hasFinalPhoto ? 'Your Final Photo' : 'Select Your Photo'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative group bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${
                    selectedPhoto === photo.id
                      ? canChangeSelection 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-green-500 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${photo.is_final ? 'ring-2 ring-green-200 border-green-500' : ''}`}
                >
                  {/* Photo */}
                  <div className="aspect-square overflow-hidden rounded-t-lg">
                    <img
                      src={photo.photo_url}
                      alt={photo.photo_name || 'Headshot photo'}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => !hasFinalPhoto && handlePhotoSelect(photo.id)}
                    />
                  </div>

                  {/* Overlay for selection */}
                  {!hasFinalPhoto && selectedPhoto === photo.id && (
                    <div className={`absolute inset-0 flex items-center justify-center ${
                      canChangeSelection ? 'bg-blue-500 bg-opacity-20' : 'bg-green-500 bg-opacity-20'
                    }`}>
                      <div className={`text-white rounded-full p-2 ${
                        canChangeSelection ? 'bg-blue-600' : 'bg-green-600'
                      }`}>
                        <Check className="w-6 h-6" />
                      </div>
                    </div>
                  )}

                  {/* Final photo indicator */}
                  {photo.is_final && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  {/* Photo info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {photo.photo_name || 'Headshot'}
                        </p>
                        {photo.is_final && (
                          <p className="text-xs text-green-600 font-medium">Final Photo</p>
                        )}
                      </div>
                      
                      {/* Download button for final photos */}
                      {photo.is_final && (
                        <button
                          onClick={() => handleDownload(photo.photo_url, photo.photo_name || 'headshot.jpg')}
                          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          <span className="text-sm">Download</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  );
};

export default EmployeeGallery;
