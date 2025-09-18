import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Phone, User } from 'lucide-react';
import { HeadshotService } from '../services/HeadshotService';
import { EmployeeGallery } from '../types/headshot';

interface EmployeeLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export const EmployeeLinksModal: React.FC<EmployeeLinksModalProps> = ({
  isOpen,
  onClose,
  eventId
}) => {
  const [galleries, setGalleries] = useState<EmployeeGallery[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchGalleries();
    }
  }, [isOpen, eventId]);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const data = await HeadshotService.getGalleriesByEvent(eventId);
      setGalleries(data);
    } catch (error) {
      console.error('Error fetching galleries:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateGalleryUrl = (token: string) => {
    return `${window.location.origin}/gallery/${token}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Employee Gallery Links</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : galleries.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Found</h3>
              <p className="text-gray-600">Import employees using the CSV uploader first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {galleries.map((gallery) => {
                const galleryUrl = generateGalleryUrl(gallery.unique_token);
                const isCopied = copiedToken === gallery.unique_token;
                
                return (
                  <div key={gallery.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <User className="w-5 h-5 text-gray-500" />
                          <h3 className="font-medium text-gray-900">{gallery.employee_name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            gallery.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                            gallery.status === 'photos_uploaded' ? 'bg-blue-100 text-blue-600' :
                            gallery.status === 'selection_made' ? 'bg-green-100 text-green-600' :
                            gallery.status === 'retouching' ? 'bg-orange-100 text-orange-600' :
                            gallery.status === 'completed' ? 'bg-purple-100 text-purple-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {gallery.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {/* Selected Photo Preview */}
                        {gallery.selected_photo_id && gallery.photos && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Selected Photo:</div>
                            <div className="flex items-center space-x-3">
                              {(() => {
                                const selectedPhoto = gallery.photos.find(p => p.id === gallery.selected_photo_id);
                                return selectedPhoto ? (
                                  <>
                                    <img
                                      src={selectedPhoto.photo_url}
                                      alt="Selected photo"
                                      className="w-16 h-16 object-cover rounded border-2 border-green-500"
                                    />
                                    <div className="text-sm text-gray-600">
                                      <div className="font-medium">{selectedPhoto.photo_name || 'Selected Photo'}</div>
                                      <div className="text-xs text-gray-500">Selected for retouching</div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-sm text-gray-500 italic">Selected photo not found</div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{gallery.email}</span>
                          </div>
                          {gallery.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{gallery.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-500 mb-1">Gallery Link:</div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={galleryUrl}
                              readOnly
                              className="flex-1 text-sm bg-white border border-gray-300 rounded px-3 py-2 font-mono"
                            />
                            <button
                              onClick={() => copyToClipboard(galleryUrl, gallery.unique_token)}
                              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span className="text-sm">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span className="text-sm">Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
