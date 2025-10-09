import React from 'react';
import { CustomUrlManager } from './CustomUrlManager';
import { ClientNameExtractor } from '../utils/clientNameExtractor';

interface ProposalCustomUrlExampleProps {
  proposalId: string;
  proposalTitle: string;
  clientName?: string;
}

/**
 * Example component showing how to integrate CustomUrlManager with proposals
 * This would typically be used in the ProposalViewer or AdminDashboard
 */
export const ProposalCustomUrlExample: React.FC<ProposalCustomUrlExampleProps> = ({
  proposalId,
  proposalTitle,
  clientName
}) => {
  // Extract client name from proposal title if not provided
  const extractedClientName = clientName || ClientNameExtractor.fromEventName(proposalTitle);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Custom Proposal URL
      </h3>
      <p className="text-gray-600 mb-6">
        Create a custom, branded URL for this proposal to make sharing easier and more professional.
      </p>
      
      <CustomUrlManager
        originalId={proposalId}
        type="proposal"
        clientName={extractedClientName}
        currentName={proposalTitle}
        onUrlChange={(customUrl) => {
          console.log('Custom URL created:', customUrl);
          // You could update the UI or show a notification here
        }}
      />
    </div>
  );
};

