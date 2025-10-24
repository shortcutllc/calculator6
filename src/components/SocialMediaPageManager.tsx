import React, { useState } from 'react';
import { useSocialMediaPage } from '../contexts/SocialMediaPageContext';
import { SocialMediaContactRequest } from '../types/socialMediaPage';
import { Link } from 'lucide-react';

const SocialMediaPageManager: React.FC = () => {
  const { contactRequests, loading, updateContactRequestStatus } = useSocialMediaPage();
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'followed_up' | 'closed'>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'linkedin' | 'meta'>('all');
  const [utmSourceFilter, setUtmSourceFilter] = useState('all');
  const [leadScoreFilter, setLeadScoreFilter] = useState('all');

  const filteredRequests = contactRequests.filter(request => {
    const statusMatch = statusFilter === 'all' || request.status === statusFilter;
    const platformMatch = platformFilter === 'all' || request.platform === platformFilter;
    const utmSourceMatch = utmSourceFilter === 'all' || request.utmSource === utmSourceFilter;
    
    let leadScoreMatch = true;
    if (leadScoreFilter === 'high') {
      leadScoreMatch = request.leadScore >= 80;
    } else if (leadScoreFilter === 'medium') {
      leadScoreMatch = request.leadScore >= 50 && request.leadScore < 80;
    } else if (leadScoreFilter === 'low') {
      leadScoreMatch = request.leadScore < 50;
    }
    
    return statusMatch && platformMatch && utmSourceMatch && leadScoreMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'followed_up': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'linkedin': return 'bg-blue-100 text-blue-800';
      case 'meta': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'new' | 'contacted' | 'followed_up' | 'closed') => {
    try {
      await updateContactRequestStatus(id, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading contact requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Media Landing Pages</h1>
          <p className="text-gray-600 mt-2">Manage leads from LinkedIn and Meta campaigns</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => copyToClipboard(`${window.location.origin}/social-media/linkedin`, 'LinkedIn Page Link')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
            title="Copy LinkedIn page link"
          >
            <Link className="w-4 h-4 mr-2" />
            Copy LinkedIn Link
          </button>
          <button
            onClick={() => window.open('/social-media/linkedin', '_blank')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          >
            View LinkedIn Page
          </button>
          <button
            onClick={() => copyToClipboard(`${window.location.origin}/social-media/meta`, 'Meta Page Link')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
            title="Copy Meta page link"
          >
            <Link className="w-4 h-4 mr-2" />
            Copy Meta Link
          </button>
          <button
            onClick={() => window.open('/social-media/meta', '_blank')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 bg-white border border-purple-600 rounded-md hover:bg-purple-50 transition-colors"
          >
            View Meta Page
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="followed_up">Followed Up</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="meta">Meta (Facebook/Instagram)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by UTM Source</label>
            <select
              value={utmSourceFilter}
              onChange={(e) => setUtmSourceFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
              <option value="direct">Direct</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Lead Score</label>
            <select
              value={leadScoreFilter}
              onChange={(e) => setLeadScoreFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Scores</option>
              <option value="high">High (80+)</option>
              <option value="medium">Medium (50-79)</option>
              <option value="low">Low (0-49)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{contactRequests.length}</div>
          <div className="text-sm text-gray-600">Total Leads</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {contactRequests.filter(r => r.platform === 'linkedin').length}
          </div>
          <div className="text-sm text-gray-600">LinkedIn Leads</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {contactRequests.filter(r => r.platform === 'meta').length}
          </div>
          <div className="text-sm text-gray-600">Meta Leads</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {contactRequests.filter(r => r.leadScore >= 80).length}
          </div>
          <div className="text-sm text-gray-600">High Quality Leads</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">
            ${contactRequests.reduce((sum, r) => sum + (r.conversionValue || 0), 0).toFixed(0)}
          </div>
          <div className="text-sm text-gray-600">Total Conversion Value</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">
            {contactRequests.length > 0 ? Math.round(contactRequests.reduce((sum, r) => sum + r.leadScore, 0) / contactRequests.length) : 0}
          </div>
          <div className="text-sm text-gray-600">Avg Lead Score</div>
        </div>
      </div>

      {/* Contact Requests List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Contact Requests ({filteredRequests.length})</h2>
        </div>
        
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No contact requests found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.firstName} {request.lastName}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(request.platform)}`}>
                        {request.platform.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.leadScore >= 80 ? 'bg-green-100 text-green-800' :
                        request.leadScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Score: {request.leadScore}
                      </span>
                      {request.conversionValue > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ${request.conversionValue}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>Email:</strong> {request.email}
                      </div>
                      {request.phone && (
                        <div>
                          <strong>Phone:</strong> {request.phone}
                        </div>
                      )}
                      {request.company && (
                        <div>
                          <strong>Company:</strong> {request.company}
                        </div>
                      )}
                      {request.location && (
                        <div>
                          <strong>Location:</strong> {request.location}
                        </div>
                      )}
                      {request.serviceType && (
                        <div>
                          <strong>Service:</strong> {request.serviceType}
                        </div>
                      )}
                      {request.eventDate && (
                        <div>
                          <strong>Event Date:</strong> {new Date(request.eventDate).toLocaleDateString()}
                        </div>
                      )}
                      {request.appointmentCount && (
                        <div>
                          <strong>Appointments:</strong> {request.appointmentCount}
                        </div>
                      )}
                    </div>
                    
                    {request.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <strong className="text-sm text-gray-700">Message:</strong>
                        <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                      </div>
                    )}
                    
                    {/* UTM Tracking Information */}
                    {(request.utmSource || request.utmCampaign || request.referrer) && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <strong className="text-sm text-gray-700">Campaign Tracking:</strong>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                          {request.utmSource && (
                            <div><strong>Source:</strong> {request.utmSource}</div>
                          )}
                          {request.utmMedium && (
                            <div><strong>Medium:</strong> {request.utmMedium}</div>
                          )}
                          {request.utmCampaign && (
                            <div><strong>Campaign:</strong> {request.utmCampaign}</div>
                          )}
                          {request.utmContent && (
                            <div><strong>Content:</strong> {request.utmContent}</div>
                          )}
                          {request.referrer && (
                            <div><strong>Referrer:</strong> {request.referrer}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-gray-500">
                      Submitted: {new Date(request.createdAt).toLocaleString()}
                      {request.campaignId && (
                        <span className="ml-4">Campaign ID: {request.campaignId}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col gap-2">
                    <select
                      value={request.status}
                      onChange={(e) => handleStatusUpdate(request.id, e.target.value as any)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="followed_up">Followed Up</option>
                      <option value="closed">Closed</option>
                    </select>
                    
                    <a
                      href={`mailto:${request.email}`}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center"
                    >
                      Email
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialMediaPageManager;
