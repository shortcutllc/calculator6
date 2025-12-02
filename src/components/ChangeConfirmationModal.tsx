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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="card-large max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-shortcut-teal bg-opacity-20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-shortcut-teal-blue" />
            </div>
            <div>
              <h2 className="h2">Review Your Changes</h2>
              <p className="text-sm text-text-dark-60 mt-1">Please review the changes you've made before submitting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-light-gray rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-dark-60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
          {/* Changes Summary */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-shortcut-teal-blue" />
              <h3 className="text-xl font-extrabold text-shortcut-blue">
                Changes Summary ({changes.length} {changes.length === 1 ? 'change' : 'changes'})
              </h3>
            </div>

            {/* Changes List */}
            <div className="space-y-3">
              {changes.map((change, index) => {
                const { fieldName, oldValueDisplay, newValueDisplay, changeType } = getChangeDisplayInfo(change);
                
                return (
                  <div key={change.id} className="card-small border-2 border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-shortcut-blue mb-2">{fieldName}</div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          {changeType === 'add' && (
                            <>
                              <span className="text-text-dark-60 italic">No previous value</span>
                              <span className="text-shortcut-navy-blue">→</span>
                              <span className="font-bold text-shortcut-navy-blue">{newValueDisplay}</span>
                            </>
                          )}
                          {changeType === 'remove' && (
                            <>
                              <span className="line-through text-text-dark-60">{oldValueDisplay}</span>
                              <span className="text-shortcut-navy-blue">→</span>
                              <span className="text-text-dark-60 italic">Removed</span>
                            </>
                          )}
                          {changeType === 'update' && (
                            <>
                              <span className="line-through text-text-dark-60">{oldValueDisplay}</span>
                              <span className="text-shortcut-teal-blue font-bold">→</span>
                              <span className="font-bold text-shortcut-navy-blue">{newValueDisplay}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                        changeType === 'add' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                        changeType === 'remove' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-light-gray text-shortcut-blue'
                      }`}>
                        {changeType === 'add' ? 'Added' : changeType === 'remove' ? 'Removed' : 'Updated'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client Comment */}
          <div className="mb-6">
            <label htmlFor="clientComment" className="block text-sm font-bold text-shortcut-blue mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              id="clientComment"
              value={clientComment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Please provide any additional context or reasoning for these changes..."
              className="w-full min-h-[100px] px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y font-medium text-base"
            />
          </div>

          {/* Info Message */}
          <div className="bg-neutral-light-gray border-l-4 border-shortcut-teal rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-shortcut-teal-blue mt-0.5 flex-shrink-0" />
              <div className="text-sm text-text-dark">
                <p className="font-bold mb-1">What happens next?</p>
                <p>
                  Your changes will be submitted for review by our team. We'll review your updates and get back to you via email once they've been approved or if any adjustments are needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-neutral-light-gray flex-shrink-0">
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
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Submit Changes for Review</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChangeConfirmationModal;
