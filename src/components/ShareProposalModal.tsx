import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { getProposalUrl } from '../utils/url';

interface ShareProposalModalProps {
  proposalId: string;
  slug?: string | null;
  onClose: () => void;
}

const ShareProposalModal: React.FC<ShareProposalModalProps> = ({
  proposalId,
  slug,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const proposalUrl = getProposalUrl(proposalId, true, slug);
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-[#175071] p-3 rounded-full">
            <Share2 className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold text-center text-[#175071] mb-2">
          Share Proposal
        </h2>
        
        <p className="text-gray-600 text-center mb-6">
          Share this proposal using the link below.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Proposal Link</label>
          <div className="flex">
            <div className="flex-grow bg-gray-50 border border-gray-300 rounded-l-md p-3 text-gray-700 overflow-hidden text-ellipsis">
              {proposalUrl}
            </div>
            <button
              onClick={() => copyToClipboard(proposalUrl)}
              className="flex items-center justify-center bg-[#175071] text-white px-4 rounded-r-md hover:bg-[#134660] transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareProposalModal;