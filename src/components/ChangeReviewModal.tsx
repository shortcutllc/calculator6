import React, { useState } from 'react';
import { X, ExternalLink, Eye, CheckCircle, XCircle, Calendar, MapPin, User, Mail } from 'lucide-react';
import { ProposalChangeSet, ProposalData } from '../types/proposal';
import { getChangeDisplayInfo } from '../utils/changeTracker';

interface ChangeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  changeSet: ProposalChangeSet | null;
  proposalId?: string;
}

const ChangeReviewModal: React.FC<ChangeReviewModalProps> = ({
  isOpen,
  onClose,
  changeSet,
  proposalId
}) => {
  if (!isOpen || !changeSet) return null;

  const getProposalViewerUrl = () => {
    if (!proposalId) {
      console.log('No proposalId provided to ChangeReviewModal');
      return '#';
    }
    const url = `/proposal/${proposalId}`;
    console.log('Proposal Viewer URL:', url);
    return url;
  };

  const getStandaloneViewerUrl = () => {
    if (!proposalId) {
      console.log('No proposalId provided to ChangeReviewModal');
      return '#';
    }
    const url = `/proposal/${proposalId}?shared=true`;
    console.log('Standalone Viewer URL:', url);
    return url;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Change Review</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review changes submitted by {changeSet.clientName || 'Client'}
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
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User size={16} className="text-gray-500" />
                <span className="font-medium">{changeSet.clientName || 'Unknown Client'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">{changeSet.clientEmail || 'No email'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date(changeSet.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            {changeSet.clientComment && (
              <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">
                  <strong>Client Comment:</strong> {changeSet.clientComment}
                </p>
              </div>
            )}
          </div>

          {/* Changes Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Changes Summary ({changeSet.changes.length} changes)
            </h3>
            <div className="space-y-3">
              {changeSet.changes.map((change, index) => {
                const { fieldName, oldValueDisplay, newValueDisplay, changeType } = getChangeDisplayInfo(change);
                return (
                  <div key={change.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{fieldName}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          changeType === 'add' ? 'bg-green-100 text-green-800' :
                          changeType === 'remove' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {changeType === 'add' ? 'Added' : changeType === 'remove' ? 'Removed' : 'Updated'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {changeType === 'add' && (
                        <span className="text-green-700">Added: {newValueDisplay}</span>
                      )}
                      {changeType === 'remove' && (
                        <span className="text-red-700">Removed: {oldValueDisplay}</span>
                      )}
                      {changeType === 'update' && (
                        <span>
                          <span className="text-red-600 line-through">{oldValueDisplay}</span>
                          <span className="mx-2">→</span>
                          <span className="text-green-600 font-medium">{newValueDisplay}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href={getProposalViewerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye size={16} className="mr-2" />
                View in Proposal Viewer
              </a>
              <a
                href={getStandaloneViewerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ExternalLink size={16} className="mr-2" />
                View Standalone Proposal
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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

export default ChangeReviewModal;