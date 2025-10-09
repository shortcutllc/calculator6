import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Camera, 
  Users, 
  Calendar, 
  Upload, 
  Eye, 
  Settings, 
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { HeadshotService } from '../services/HeadshotService';
import { HeadshotEvent, HeadshotEventStats } from '../types/headshot';
import { PhotographerAccess } from '../types/photographer';

const PhotographerDashboard: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const [access, setAccess] = useState<PhotographerAccess | null>(null);
  const [events, setEvents] = useState<HeadshotEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateAccess();
    }
  }, [token]);

  const validateAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const photographerAccess = await PhotographerService.validateToken(token!);
      if (!photographerAccess) {
        setError('Invalid or expired photographer access. Please contact support.');
        return;
      }

      setAccess(photographerAccess);
      await fetchEvents();
      
    } catch (err) {
      console.error('Error validating photographer access:', err);
      setError('Failed to validate access. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      // Only fetch events assigned to this photographer
      const eventsData = await PhotographerService.getAssignedEventsForPhotographer(token!);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating photographer access...</p>
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
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Not Found</h1>
          <p className="text-gray-600">The requested photographer access could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Photographer Portal</h1>
              <p className="text-gray-600 mt-1">Welcome, {access.photographer_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Photographer Access</p>
              <p className="text-sm font-medium text-gray-900">{access.token}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter(e => e.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.reduce((sum, event) => sum + event.total_employees, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Camera className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter(e => e.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Headshot Events</h2>
            <p className="text-sm text-gray-600">Manage and view all headshot events</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {event.event_name}
                        </div>
                        {event.client_logo_url && (
                          <div className="mt-1">
                            <img 
                              src={event.client_logo_url} 
                              alt="Client Logo" 
                              className="h-6 w-auto object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                        {getStatusIcon(event.status)}
                        <span className="ml-1">{event.status}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(event.event_date).toLocaleDateString()}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.total_employees}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => {
                            // Navigate to event management
                            window.location.href = `/photographer/${token}/event/${event.id}`;
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Manage
                        </button>
                        
                        {event.manager_token && (
                          <button
                            onClick={() => {
                              const managerUrl = `${window.location.origin}/manager/${event.manager_token}`;
                              navigator.clipboard.writeText(managerUrl);
                            }}
                            className="text-green-600 hover:text-green-800 flex items-center"
                            title="Copy manager link"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Manager Link
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                Photographer Portal - Need help or have questions?
              </p>
              <a 
                href="mailto:hello@getshortcut.co" 
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                hello@getshortcut.co
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotographerDashboard;
