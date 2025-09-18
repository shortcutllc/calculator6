import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Users, CheckCircle, AlertCircle, XCircle, Trash2, Plus, Eye } from 'lucide-react';
import { Button } from './Button';
import { HeadshotService } from '../services/HeadshotService';
import { NotificationService } from '../services/NotificationService';
import { EmployeeGallery, PhotoUploadProgress } from '../types/headshot';
import { supabase } from '../lib/supabaseClient';

interface PhotoUploaderProps {
  eventId: string;
  onClose: () => void;
  onUploadComplete: () => void;
  specificEmployee?: { id: string; name: string } | null;
  uploadMode?: 'photos' | 'final';
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  eventId,
  onClose,
  onUploadComplete,
  specificEmployee,
  uploadMode = 'photos'
}) => {
  const [galleries, setGalleries] = useState<EmployeeGallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<EmployeeGallery | null>(null);
  const [uploadProgress, setUploadProgress] = useState<PhotoUploadProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [viewingPhotos, setViewingPhotos] = useState<EmployeeGallery | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadingFinalFor, setUploadingFinalFor] = useState<EmployeeGallery | null>(null);
  const [finalPhotoFile, setFinalPhotoFile] = useState<File | null>(null);
  const [uploadingFinal, setUploadingFinal] = useState(false);

  useEffect(() => {
    fetchGalleries();
  }, [eventId, specificEmployee, uploadMode]);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      console.log('Fetching galleries for eventId:', eventId);
      const data = await HeadshotService.getGalleriesByEvent(eventId);
      console.log('Fetched galleries:', data);
      setGalleries(data);
      
      // Auto-select specific employee if provided
      if (specificEmployee) {
        const targetGallery = data.find(gallery => gallery.id === specificEmployee.id);
        if (targetGallery) {
          setSelectedGallery(targetGallery);
          
          // If in final upload mode, automatically trigger final photo upload
          if (uploadMode === 'final') {
            setUploadingFinalFor(targetGallery);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching galleries:', err);
      setError('Failed to load employee galleries');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGallery = async (galleryId: string, employeeName: string) => {
    if (!confirm(`Are you sure you want to delete the gallery for ${employeeName}? This will also delete all associated photos.`)) {
      return;
    }

    try {
      // First, get all photos for this gallery to delete them from storage
      const gallery = galleries.find(g => g.id === galleryId);
      if (gallery?.photos) {
        for (const photo of gallery.photos) {
          try {
            await HeadshotService.deletePhoto(photo.id);
          } catch (err) {
            console.error('Error deleting photo:', err);
          }
        }
      }

      // Delete the gallery (this will cascade delete photos from database)
      await supabase
        .from('employee_galleries')
        .delete()
        .eq('id', galleryId);

      // Refresh galleries
      await fetchGalleries();
      
      // Clear selection if it was the deleted gallery
      if (selectedGallery?.id === galleryId) {
        setSelectedGallery(null);
      }

      alert(`Successfully deleted gallery for ${employeeName}`);
    } catch (err) {
      console.error('Error deleting gallery:', err);
      setError('Failed to delete gallery');
    }
  };

  const handleDeletePhoto = async (photoId: string, photoName: string) => {
    if (!confirm(`Are you sure you want to delete this photo?`)) {
      return;
    }

    try {
      await HeadshotService.deletePhoto(photoId);
      await fetchGalleries();
      
      // Update viewing photos if we're viewing that gallery
      if (viewingPhotos) {
        const updatedGallery = galleries.find(g => g.id === viewingPhotos.id);
        if (updatedGallery) {
          setViewingPhotos(updatedGallery);
        }
      }
      
      alert('Photo deleted successfully');
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo');
    }
  };

  const handleAddMorePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !viewingPhotos) return;

    setUploading(true);
    setError('');

    try {
      // Upload photos one by one
      for (const file of files) {
        await HeadshotService.uploadPhoto(viewingPhotos.id, file);
      }

      // Refresh galleries and update viewing photos
      await fetchGalleries();
      const updatedGallery = galleries.find(g => g.id === viewingPhotos.id);
      if (updatedGallery) {
        setViewingPhotos(updatedGallery);
      }

      alert(`Successfully added ${files.length} photo(s)`);
      
      // Clear file input
      e.target.value = '';
    } catch (err) {
      setError('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleFinalPhotoUpload = async () => {
    if (!finalPhotoFile || !uploadingFinalFor) return;

    try {
      setUploadingFinal(true);
      setError('');

      // Upload the final photo
      await HeadshotService.uploadFinalPhoto(uploadingFinalFor.id, finalPhotoFile);

      // Send notification to employee
      try {
        await NotificationService.sendFinalPhotoNotification(uploadingFinalFor.id);
        console.log('Final photo notification sent');
      } catch (error) {
        console.error('Failed to send final photo notification:', error);
        // Don't fail the upload if notification fails
      }

      // Refresh galleries
      await fetchGalleries();

      // Close the upload interface
      setUploadingFinalFor(null);
      setFinalPhotoFile(null);

      alert('Final photo uploaded successfully! Employee has been notified.');
    } catch (err) {
      console.error('Error uploading final photo:', err);
      setError('Failed to upload final photo. Please try again.');
    } finally {
      setUploadingFinal(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedGallery) return;

    setUploading(true);
    setError('');

    try {
      // Initialize progress tracking
      const progress: PhotoUploadProgress = {
        employeeId: selectedGallery.id,
        employeeName: selectedGallery.employee_name,
        totalPhotos: files.length,
        uploadedPhotos: 0,
        progress: 0,
        status: 'uploading'
      };
      setUploadProgress([progress]);

      // Upload photos one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          await HeadshotService.uploadPhoto(selectedGallery.id, file);
          
          // Update progress
          const updatedProgress = {
            ...progress,
            uploadedPhotos: i + 1,
            progress: Math.round(((i + 1) / files.length) * 100)
          };
          setUploadProgress([updatedProgress]);
          
        } catch (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          setUploadProgress([{
            ...progress,
            status: 'error',
            error: `Failed to upload ${file.name}`
          }]);
          return;
        }
      }

      // Mark as completed
      setUploadProgress([{
        ...progress,
        status: 'completed'
      }]);

      // Update gallery status
      await HeadshotService.updateGalleryStatus(selectedGallery.id, 'photos_uploaded');
      
      // Refresh galleries
      await fetchGalleries();
      
      // Reset selection
      setSelectedGallery(null);
      
      // Clear file input
      e.target.value = '';

    } catch (err) {
      setError('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: EmployeeGallery['status']) => {
    switch (status) {
      case 'pending':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'photos_uploaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'selection_made':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'retouching':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: EmployeeGallery['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-600';
      case 'photos_uploaded':
        return 'bg-green-100 text-green-800';
      case 'selection_made':
        return 'bg-blue-100 text-blue-800';
      case 'retouching':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Loading employee galleries...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Headshot Photos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Upload Instructions</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Select an employee from the list below</li>
              <li>• Upload 1-5 photos for that employee</li>
              <li>• Photos should be high-resolution JPEG files</li>
              <li>• You can upload photos for multiple employees</li>
            </ul>
          </div>

          {/* Employee Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Select Employee ({galleries.length} total)</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
              {galleries.map((gallery) => (
                <div
                  key={gallery.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all relative group ${
                    selectedGallery?.id === gallery.id
                      ? 'border-shortcut-blue bg-shortcut-blue/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedGallery(gallery)}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGallery(gallery.id, gallery.employee_name);
                    }}
                    className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete gallery"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(gallery.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(gallery.status)}`}>
                      {gallery.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{gallery.employee_name}</div>
                    <div className="text-gray-600">{gallery.email}</div>
                    {gallery.photos && (
                      <div className="text-gray-500 mt-1">
                        {gallery.photos.length} photo{gallery.photos.length !== 1 ? 's' : ''}
                        {gallery.selected_photo_id && (
                          <div className="text-green-600 text-xs mt-1">
                            ✓ Photo selected
                          </div>
                        )}
                        {gallery.photos?.some(p => p.is_final) && (
                          <div className="text-purple-600 text-xs mt-1">
                            🎉 Final photo ready
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  {gallery.photos && gallery.photos.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingPhotos(gallery);
                        }}
                        className="w-full text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                      >
                        <Eye className="w-3 h-3 inline mr-1" />
                        View Photos
                      </button>
                      
                      {gallery.selected_photo_id && !gallery.photos.some(p => p.is_final) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadingFinalFor(gallery);
                          }}
                          className="w-full text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                        >
                          <Upload className="w-3 h-3 inline mr-1" />
                          Upload Final
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* File Upload */}
          {selectedGallery && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                Upload Photos for {selectedGallery.employee_name}
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Select photos to upload
                  </p>
                  <p className="text-sm text-gray-600">
                    Choose 1-5 high-resolution JPEG files
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="mt-4"
                />
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Upload Progress</h3>
              {uploadProgress.map((progress, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{progress.employeeName}</span>
                    <span className="text-sm text-gray-600">
                      {progress.uploadedPhotos}/{progress.totalPhotos} photos
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-shortcut-blue h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    {progress.status === 'uploading' && (
                      <>
                        <div className="w-4 h-4 border-2 border-shortcut-blue border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-600">Uploading...</span>
                      </>
                    )}
                    {progress.status === 'completed' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Upload completed!</span>
                      </>
                    )}
                    {progress.status === 'error' && (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-600">{progress.error}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            {uploadProgress.some(p => p.status === 'completed') && (
              <Button
                onClick={() => {
                  onUploadComplete();
                  onClose();
                }}
                className="flex-1"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Photo Viewing Modal */}
      {viewingPhotos && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Photos for {viewingPhotos.employee_name}
                </h2>
                <p className="text-gray-600">{viewingPhotos.email}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/jpeg,image/jpg';
                    input.multiple = true;
                    input.onchange = handleAddMorePhotos;
                    input.click();
                  }}
                  disabled={uploading}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Photos</span>
                </Button>
                <button
                  onClick={() => setViewingPhotos(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Debug Info */}
            <div className="p-6 bg-gray-50 border-b">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Photos count: {viewingPhotos.photos?.length || 0}</div>
                {viewingPhotos.photos?.map((photo, index) => (
                  <div key={photo.id} className="break-all">
                    <div>Photo {index + 1}: {photo.photo_url}</div>
                    <a 
                      href={photo.photo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Test direct link
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos Grid */}
            <div className="p-6">
              {viewingPhotos.photos && viewingPhotos.photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {viewingPhotos.photos.map((photo) => (
                    <div key={photo.id} className={`relative group ${photo.is_selected ? 'ring-2 ring-green-500' : ''}`}>
                      <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt={photo.photo_name || 'Headshot photo'}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhoto(photo.photo_url)}
                          onLoad={() => {
                            console.log('Image loaded successfully:', photo.photo_url);
                          }}
                          onError={(e) => {
                            console.error('Image load error for URL:', photo.photo_url);
                            console.error('Error details:', e);
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback for broken images */}
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm" style={{display: 'none'}}>
                          <div className="text-center">
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <div>Image not found</div>
                            <div className="text-xs">{photo.photo_name}</div>
                          </div>
                        </div>
                        
                        {/* Selected indicator */}
                        {photo.is_selected && (
                          <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      {/* Photo Info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                        <div className="text-xs truncate">
                          {photo.photo_name || 'Untitled'}
                        </div>
                        {photo.is_selected && (
                          <div className="text-xs text-green-300 font-medium">
                            ✓ Selected
                          </div>
                        )}
                        {photo.is_final && (
                          <div className="text-xs text-blue-300 font-medium">
                            ✓ Final
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeletePhoto(photo.id, photo.photo_name || 'photo')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                  <p className="text-gray-600 mb-4">Upload some photos to get started</p>
                  <Button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/jpeg,image/jpg';
                      input.multiple = true;
                      input.onchange = handleAddMorePhotos;
                      input.click();
                    }}
                    disabled={uploading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Photos
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedPhoto}
              alt="Photo preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Final Photo Upload Modal */}
      {uploadingFinalFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Final Photo for {uploadingFinalFor.employee_name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Final Retouched Photo
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={(e) => setFinalPhotoFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {finalPhotoFile && (
                  <div className="text-sm text-gray-600">
                    Selected: {finalPhotoFile.name}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setUploadingFinalFor(null);
                    setFinalPhotoFile(null);
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalPhotoUpload}
                  disabled={!finalPhotoFile || uploadingFinal}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {uploadingFinal ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload Final Photo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
