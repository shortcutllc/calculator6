import React from 'react';
import { X, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from './Button';
import { ProposalChange, getChangeDisplayInfo } from '../utils/changeTracker';

interface ChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: ProposalChange[];
  clientName?: string;
  clientEmail?: string;
  clientComment: string;
  onCommentChange: (comment: string) => void;
  isSubmitting?: boolean;
}

const ChangeConfirmationModal: React.FC<ChangeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  changes,
  clientName,
  clientEmail,
  clientComment,
  onCommentChange,
  isSubmitting = false
}) => {
  if (!isOpen) return null;

  const changeGroups = changes.reduce((groups, change) => {
    const { fieldName } = getChangeDisplayInfo(change);
    const category = change.field.split('.')[0];
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(change);
    
    return groups;
  }, {} as { [key: string]: ProposalChange[] });

  const getCategoryTitle = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'clientName': 'Client Information',
      'clientEmail': 'Client Information',
      'eventDates': 'Event Details',
      'locations': 'Event Details',
      'services': 'Services',
      'customization': 'Customization',
      'summary': 'Summary'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Review Your Changes</h2>
              <p className="text-gray-600">Please review the changes you've made before submitting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Simple Changes Summary */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Changes Summary ({changes.length} change{changes.length !== 1 ? 's' : ''})
              </h3>
            </div>

            {/* Simplified Changes List */}
            <div className="space-y-3">
              {changes.slice(0, 5).map((change, index) => {
                const { fieldName, oldValueDisplay, newValueDisplay, changeType } = getChangeDisplayInfo(change);
                
                return (
                  <div key={change.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{fieldName}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {changeType === 'add' && `Added: ${newValueDisplay}`}
                          {changeType === 'remove' && `Removed: ${oldValueDisplay}`}
                          {changeType === 'update' && `${oldValueDisplay} → ${newValueDisplay}`}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        changeType === 'add' ? 'bg-green-100 text-green-800' :
                        changeType === 'remove' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {changeType === 'add' ? 'Added' : changeType === 'remove' ? 'Removed' : 'Updated'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {changes.length > 5 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  ... and {changes.length - 5} more changes
                </div>
              )}
            </div>
          </div>

          {/* Client Comment */}
          <div className="mb-6">
            <label htmlFor="clientComment" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              id="clientComment"
              value={clientComment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Please provide any additional context or reasoning for these changes..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Changes Require Approval</p>
                <p>
                  Your changes will be submitted for review by our team. You'll receive an email notification 
                  once they've been approved or if any revisions are needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="primary"
            disabled={isSubmitting}
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Submit for Review</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChangeConfirmationModal;
