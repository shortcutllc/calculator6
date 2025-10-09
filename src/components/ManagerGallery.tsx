import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Camera, Check, Clock, AlertCircle, Copy, Mail, ExternalLink, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { HeadshotService } from '../services/HeadshotService';
import { EmployeeGallery, HeadshotEvent } from '../types/headshot';

const ManagerGallery: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const [event, setEvent] = useState<HeadshotEvent | null>(null);
  const [galleries, setGalleries] = useState<EmployeeGallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'status' | 'email'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const statusDefinitions = {
    'Photos Ready': 'Initial photos have been uploaded and are ready for the employee to make a selection.',
    'Final In Progress': 'The employee has selected their preferred photo, and it is currently undergoing final retouching.',
    'Final Ready': 'The final retouched photo is complete and available for the employee to download.'
  };

  useEffect(() => {
    if (token) {
      fetchManagerData();
    }
  }, [token]);

  const fetchManagerData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, get the event by manager token
      const eventData = await HeadshotService.getEventByManagerToken(token);
      setEvent(eventData);

      // Then get all galleries for this event
      const galleriesData = await HeadshotService.getGalleriesByEvent(eventData.id);
      setGalleries(galleriesData);
      
    } catch (err) {
      console.error('Error fetching manager data:', err);
      setError('Failed to load manager dashboard. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (gallery: EmployeeGallery) => {
    const status = gallery.status;
    const hasPhotos = gallery.photos && gallery.photos.length > 0;
    const hasFinalPhoto = gallery.photos?.some(photo => photo.is_final);

    if (!hasPhotos) {
      return {
        text: 'No Photos',
        color: 'bg-gray-100 text-gray-800',
        icon: <AlertCircle className="w-4 h-4" />,
        sortOrder: 0
      };
    }

    if (hasFinalPhoto) {
      return {
        text: 'Final Ready',
        color: 'bg-green-100 text-green-800',
        icon: <Check className="w-4 h-4" />,
        sortOrder: 3
      };
    }

    if (status === 'selection_made' || status === 'retouching') {
      return {
        text: 'Final In Progress',
        color: 'bg-blue-100 text-blue-800',
        icon: <Clock className="w-4 h-4" />,
        sortOrder: 2
      };
    }

    return {
      text: 'Photos Ready',
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Camera className="w-4 h-4" />,
      sortOrder: 1
    };
  };

  const handleSort = (field: 'name' | 'status' | 'email') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedGalleries = useMemo(() => {
    return [...galleries].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.employee_name.localeCompare(b.employee_name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'status':
          const statusA = getStatusBadge(a);
          const statusB = getStatusBadge(b);
          comparison = statusA.sortOrder - statusB.sortOrder;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [galleries, sortField, sortDirection]);

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getGalleryUrl = (galleryToken: string) => {
    return `${window.location.origin}/gallery/${galleryToken}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading manager dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a 
            href="mailto:hello@getshortcut.co" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600">The requested event could not be found.</p>
        </div>
      </div>
    );
  }

  const statusCounts = galleries.reduce((acc, gallery) => {
    const status = getStatusBadge(gallery);
    acc[status.text] = (acc[status.text] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.event_name}</h1>
              <p className="text-gray-600 mt-1">Manager Dashboard</p>
            </div>
            {event.client_logo_url && (
              <div className="flex-shrink-0">
                <img 
                  src={event.client_logo_url} 
                  alt="Client Logo" 
                  className="h-12 w-auto object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Status Overview</h2>
            <div className="relative group ml-2">
              <Info className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <p className="font-semibold text-gray-800 mb-3">Status Definitions:</p>
                {Object.entries(statusDefinitions).map(([status, definition]) => (
                  <div key={status} className="mb-2">
                    <p className="text-sm font-medium text-gray-700">{status}:</p>
                    <p className="text-xs text-gray-600 ml-2">{definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{galleries.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Camera className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Photos Ready</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts['Photos Ready'] || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Final In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts['Final In Progress'] || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Final Ready</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts['Final Ready'] || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Employee Galleries</h2>
                <p className="text-sm text-gray-600">Click on gallery links to view individual employee galleries</p>
              </div>
              <div className="text-sm text-gray-500">
                Sorted by: <span className="font-medium capitalize">{sortField}</span> ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Employee</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Email</span>
                      {sortField === 'email' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedGalleries.map((gallery) => {
                  const status = getStatusBadge(gallery);
                  const galleryUrl = getGalleryUrl(gallery.unique_token);
                  
                  return (
                    <tr key={gallery.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {gallery.employee_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {gallery.email}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.icon}
                          <span className="ml-1">{status.text}</span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <a
                            href={galleryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Gallery
                          </a>
                          <button
                            onClick={() => copyToClipboard(galleryUrl, gallery.unique_token)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {copiedToken === gallery.unique_token && (
                            <span className="text-xs text-green-600">Copied!</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="text-xs">
                            {gallery.photos?.length || 0} photos
                          </span>
                          {gallery.photos?.some(photo => photo.is_final) && (
                            <span className="text-xs text-green-600 font-medium">
                              Final photo ready
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-gray-200">
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
                Need help or have questions about this dashboard?
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

export default ManagerGallery;
