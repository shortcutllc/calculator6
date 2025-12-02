import React, { useState } from 'react';
import { X, ExternalLink, Eye, CheckCircle, XCircle, Calendar, MapPin, User, Mail, DollarSign, AlertCircle, ArrowRight, FileText } from 'lucide-react';
import { Proposal, ProposalData } from '../types/proposal';
import { format, parseISO } from 'date-fns';
import { trackProposalChanges, getChangeDisplayInfo } from '../utils/changeTracker';
import { Button } from './Button';
import { ChangeSourceBadge } from './ChangeSourceBadge';

interface ChangeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalData: Proposal;
  surveyResponse?: any | null;
}

const ChangeReviewModal: React.FC<ChangeReviewModalProps> = ({
  isOpen,
  onClose,
  proposalId,
  proposalData,
  surveyResponse
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
      <div className="card-large max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="h2">Proposal Details</h2>
              {proposalData.hasChanges && (
                <ChangeSourceBadge 
                  changeSource={proposalData.changeSource} 
                  userId={proposalData.userId}
                  size="sm"
                />
              )}
            </div>
            <p className="text-sm text-text-dark-60 mt-1">
              Review proposal for {proposalData.data.clientName || 'Client'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-dark-60 hover:text-shortcut-blue transition-colors"
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
          <div className="bg-neutral-light-gray rounded-lg p-4 mb-6">
            <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-text-dark-60" />
                <div>
                  <p className="text-sm font-bold text-shortcut-blue">Client Name</p>
                  <p className="text-sm text-text-dark">{proposalData.data.clientName || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-text-dark-60" />
                <div>
                  <p className="text-sm font-bold text-shortcut-blue">Email</p>
                  <p className="text-sm text-text-dark">{proposalData.data.clientEmail || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-text-dark-60" />
                <div>
                  <p className="text-sm font-bold text-shortcut-blue">Created</p>
                  <p className="text-sm text-text-dark">{format(parseISO(proposalData.createdAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-text-dark-60" />
                <div>
                  <p className="text-sm font-bold text-shortcut-blue">Location</p>
                  <p className="text-sm text-text-dark">{proposalData.data.officeLocation || proposalData.data.locations?.[0] || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details */}
          {proposalData.data.eventDates && proposalData.data.eventDates.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-2">Event Details</h3>
              <p className="text-text-dark">Event Dates: {proposalData.data.eventDates.join(', ')}</p>
            </div>
          )}

          {/* Changes Section */}
          {proposalData.hasChanges && proposalData.originalData && (
            <div className="card-medium mb-6 border-l-4 border-shortcut-teal">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-shortcut-teal-blue" />
                  <h3 className="text-xl font-extrabold text-shortcut-blue">Changes Submitted</h3>
                </div>
                <ChangeSourceBadge 
                  changeSource={proposalData.changeSource} 
                  userId={proposalData.userId}
                  size="sm"
                />
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
                      <div className="p-4 bg-neutral-light-gray rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-text-dark">
                          Changes detected but no specific field changes found. This may be due to service modifications or other complex changes.
                        </p>
                      </div>
                    );
                  }
                  
                  return changes.map((change, index) => {
                    const displayInfo = getChangeDisplayInfo(change);
                    return (
                      <div key={index} className="card-small border-2 border-gray-200">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-extrabold text-shortcut-blue mb-2">{displayInfo.fieldName}</div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                            displayInfo.changeType === 'add' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                            displayInfo.changeType === 'remove' ? 'bg-red-100 text-red-700' :
                            'bg-neutral-light-gray text-shortcut-blue'
                          }`}>
                            {displayInfo.changeType === 'add' ? 'Added' :
                             displayInfo.changeType === 'remove' ? 'Removed' : 'Updated'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          {displayInfo.changeType === 'add' && (
                            <>
                              <span className="text-text-dark-60 italic">No previous value</span>
                              <span className="text-shortcut-navy-blue font-bold">→</span>
                              <span className="font-bold text-shortcut-navy-blue">{displayInfo.newValueDisplay}</span>
                            </>
                          )}
                          {displayInfo.changeType === 'remove' && (
                            <>
                              <span className="line-through text-text-dark-60">{displayInfo.oldValueDisplay}</span>
                              <span className="text-shortcut-navy-blue font-bold">→</span>
                              <span className="text-text-dark-60 italic">Removed</span>
                            </>
                          )}
                          {displayInfo.changeType === 'update' && (
                            <>
                              <span className="line-through text-text-dark-60">{displayInfo.oldValueDisplay}</span>
                              <span className="text-shortcut-teal-blue font-bold">→</span>
                              <span className="font-bold text-shortcut-navy-blue">{displayInfo.newValueDisplay}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {proposalData.clientComment && (
                <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-shortcut-teal shadow-sm">
                  <div className="text-xs font-extrabold text-shortcut-navy-blue mb-2 uppercase tracking-wide">Client Comment</div>
                  <p className="text-sm text-text-dark font-medium">{proposalData.clientComment}</p>
                </div>
              )}
            </div>
          )}

          {/* Proposal Summary */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">Proposal Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-shortcut-blue">Total Cost</p>
                  <p className="text-lg font-semibold text-green-600">${calculateTotalCost().toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-shortcut-blue">Status</p>
                  <p className="text-sm text-text-dark">
                    {proposalData.pendingReview ? 'Pending Review' : 
                     proposalData.status === 'approved' ? 'Approved' : 'Draft'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-shortcut-blue">Changes</p>
                  <p className="text-sm text-text-dark">
                    {proposalData.hasChanges ? 'Has Changes' : 'No Changes'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          {proposalData.data.services && Object.keys(proposalData.data.services).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">Services</h3>
              <div className="space-y-3">
                {Object.entries(proposalData.data.services).map(([location, locationData]: [string, any]) => (
                  <div key={location} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-bold text-shortcut-blue">{location}</h4>
                    {locationData.services && Object.entries(locationData.services).map(([service, serviceData]: [string, any]) => (
                      <div key={service} className="ml-4 mt-2 text-sm text-text-dark">
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
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-2">Notes</h3>
              <p className="text-text-dark">{proposalData.notes}</p>
            </div>
          )}

          {/* Survey Response */}
          {surveyResponse && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Event Details Survey</h3>
                <span className="text-xs text-blue-600 ml-auto">
                  Submitted: {format(parseISO(surveyResponse.submitted_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              
              <div className="space-y-3">
                {surveyResponse.table_or_chair_preference && (
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-1">1. Table or Chair Preference</p>
                    <p className="text-sm text-text-dark">{surveyResponse.table_or_chair_preference}</p>
                  </div>
                )}
                
                {surveyResponse.preferred_gender && (
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-1">2. Preferred Gender of Massage Professional</p>
                    <p className="text-sm text-text-dark">{surveyResponse.preferred_gender}</p>
                  </div>
                )}
                
                {surveyResponse.office_address && (
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-1">3. Office Address</p>
                    <p className="text-sm text-text-dark whitespace-pre-wrap">{surveyResponse.office_address}</p>
                  </div>
                )}
                
                {surveyResponse.massage_space_name && (
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-1">4. Name of Space(s) Where Massages Will Take Place</p>
                    <p className="text-sm text-text-dark">{surveyResponse.massage_space_name}</p>
                  </div>
                )}
                
                {surveyResponse.point_of_contact && (
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-1">5. Point of Contact (including phone number)</p>
                    <p className="text-sm text-text-dark whitespace-pre-wrap">{surveyResponse.point_of_contact}</p>
                  </div>
                )}
                
                {surveyResponse.billing_contact && (
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-1">6. Billing Contact / Who to Address Invoice To</p>
                    <p className="text-sm text-text-dark whitespace-pre-wrap">{surveyResponse.billing_contact}</p>
                  </div>
                )}
                
                {surveyResponse.coi_required !== null && (
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-bold text-shortcut-blue mb-1">7. Will a Certificate of Insurance (COI) be Required?</p>
                    <p className="text-sm text-text-dark">{surveyResponse.coi_required ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-neutral-light-gray flex-shrink-0">
          <Button
            onClick={onClose}
            variant="secondary"
          >
            Close
          </Button>
          
          <Button
            onClick={() => window.open(getProposalViewerUrl(), '_blank', 'noopener,noreferrer')}
            variant="primary"
            icon={<Eye className="w-4 h-4" />}
          >
            View Proposal
          </Button>
          
          <Button
            onClick={() => window.open(getStandaloneViewerUrl(), '_blank', 'noopener,noreferrer')}
            variant="green"
            icon={<ExternalLink className="w-4 h-4" />}
          >
            View Standalone
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChangeReviewModal;