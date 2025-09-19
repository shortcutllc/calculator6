import React, { useState } from 'react';
import { X, ExternalLink, Eye, CheckCircle, XCircle, Calendar, MapPin, User, Mail, DollarSign, AlertCircle, ArrowRight } from 'lucide-react';
import { Proposal, ProposalData } from '../types/proposal';
import { format, parseISO } from 'date-fns';
import { trackProposalChanges, getChangeDisplayInfo } from '../utils/changeTracker';

interface ChangeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalData: Proposal;
}

const ChangeReviewModal: React.FC<ChangeReviewModalProps> = ({
  isOpen,
  onClose,
  proposalId,
  proposalData
}) => {
  if (!isOpen || !proposalData) return null;

  const getProposalViewerUrl = () => {
    return `/proposal/${proposalId}`;
  };

  const getStandaloneViewerUrl = () => {
    return `/proposal/${proposalId}?shared=true`;
  };

  const calculateTotalCost = () => {
    return proposalData.data.summary?.totalEventCost || 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Proposal Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review proposal for {proposalData.data.clientName || 'Client'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f3f4f6',
            scrollBehavior: 'smooth'
          }}
        >
          {/* Client Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Client Name</p>
                  <p className="text-sm text-gray-600">{proposalData.data.clientName || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{proposalData.data.clientEmail || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">{format(parseISO(proposalData.createdAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{proposalData.data.officeLocation || proposalData.data.locations?.[0] || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details */}
          {proposalData.data.eventDates && proposalData.data.eventDates.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Details</h3>
              <p className="text-gray-700">Event Dates: {proposalData.data.eventDates.join(', ')}</p>
            </div>
          )}

          {/* Changes Section */}
          {proposalData.hasChanges && proposalData.originalData && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-900">Changes Submitted</h3>
              </div>
              
              <div className="space-y-3">
                {(() => {
                  const changes = trackProposalChanges(
                    proposalData.originalData, 
                    proposalData.data, 
                    proposalData.clientEmail, 
                    proposalData.clientName
                  );
                  
                  if (changes.length === 0) {
                    return (
                      <p className="text-orange-700 text-sm">
                        Changes detected but no specific field changes found. This may be due to service modifications or other complex changes.
                      </p>
                    );
                  }
                  
                  return changes.map((change, index) => {
                    const displayInfo = getChangeDisplayInfo(change);
                    return (
                      <div key={index} className="bg-white rounded border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{displayInfo.fieldName}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            displayInfo.changeType === 'add' ? 'bg-green-100 text-green-800' :
                            displayInfo.changeType === 'remove' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {displayInfo.changeType === 'add' ? 'Added' :
                             displayInfo.changeType === 'remove' ? 'Removed' : 'Updated'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500 line-through">{displayInfo.oldValueDisplay}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 font-medium">{displayInfo.newValueDisplay}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {proposalData.clientComment && (
                <div className="mt-4 p-3 bg-white rounded border">
                  <h4 className="font-medium text-gray-900 mb-1">Client Comment:</h4>
                  <p className="text-gray-700 text-sm">{proposalData.clientComment}</p>
                </div>
              )}
            </div>
          )}

          {/* Proposal Summary */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Proposal Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Cost</p>
                  <p className="text-lg font-semibold text-green-600">${calculateTotalCost().toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-sm text-gray-600">
                    {proposalData.pendingReview ? 'Pending Review' : 
                     proposalData.status === 'approved' ? 'Approved' : 'Draft'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Changes</p>
                  <p className="text-sm text-gray-600">
                    {proposalData.hasChanges ? 'Has Changes' : 'No Changes'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          {proposalData.data.services && Object.keys(proposalData.data.services).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
              <div className="space-y-3">
                {Object.entries(proposalData.data.services).map(([location, locationData]: [string, any]) => (
                  <div key={location} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">{location}</h4>
                    {locationData.services && Object.entries(locationData.services).map(([service, serviceData]: [string, any]) => (
                      <div key={service} className="ml-4 mt-2 text-sm text-gray-600">
                        <span className="font-medium">{service}:</span> {serviceData.quantity || 0} units
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {proposalData.notes && (
            <div className="bg-yellow-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700">{proposalData.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          
          <a
            href={getProposalViewerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>View Proposal</span>
          </a>
          
          <a
            href={getStandaloneViewerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Standalone</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChangeReviewModal;