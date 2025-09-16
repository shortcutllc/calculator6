import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  User, 
  Mail, 
  Calendar,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { Button } from './Button';
import { ProposalChangeSet, ChangeReviewData, getChangeDisplayInfo } from '../utils/changeTracker';

interface AdminChangeDashboardProps {
  changeSets: ProposalChangeSet[];
  onViewDetails: (changeSet: ProposalChangeSet) => void;
  isLoading?: boolean;
  totalCounts: { pending: number; approved: number };
}

const AdminChangeDashboard: React.FC<AdminChangeDashboardProps> = ({
  changeSets,
  onViewDetails,
  isLoading = false,
  totalCounts
}) => {

  // Since we're passing pre-filtered data, just use the changeSets directly
  const displayChanges = changeSets;


  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Change Review Dashboard</h1>
        <p className="text-gray-600">Review and approve client changes to proposals</p>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-800">Pending</span>
            </div>
            <div className="text-2xl font-bold text-orange-900 mt-1">{totalCounts.pending}</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Approved</span>
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">{totalCounts.approved}</div>
          </div>
        </div>
      </div>

      {/* Display Changes */}
      {displayChanges.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span>Changes ({displayChanges.length})</span>
          </h2>
          
          <div className="space-y-4">
            {displayChanges.map((changeSet) => (
              <div key={changeSet.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {changeSet.clientName || 'Unknown Client'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {changeSet.clientEmail || 'No email'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Submitted: {formatDate(changeSet.submittedAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{changeSet.changes.length} change{changeSet.changes.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    {changeSet.clientComment && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-blue-800 mb-1">Client Comment:</div>
                            <div className="text-sm text-blue-700">{changeSet.clientComment}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Change Summary */}
                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-1">Changes:</div>
                      <div className="space-y-1">
                        {changeSet.changes.slice(0, 3).map((change) => {
                          const { fieldName, oldValueDisplay, newValueDisplay } = getChangeDisplayInfo(change);
                          return (
                            <div key={change.id} className="flex items-center space-x-2">
                              <span className="font-medium">{fieldName}:</span>
                              <span className="text-red-600 line-through">{oldValueDisplay}</span>
                              <span>→</span>
                              <span className="text-green-600">{newValueDisplay}</span>
                            </div>
                          );
                        })}
                        {changeSet.changes.length > 3 && (
                          <div className="text-gray-500">
                            ... and {changeSet.changes.length - 3} more changes
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => onViewDetails(changeSet)}
                      variant="primary"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminChangeDashboard;
