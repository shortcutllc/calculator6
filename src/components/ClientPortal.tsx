import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Building, Calendar, DollarSign } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';

const ClientPortal: React.FC = () => {
  const navigate = useNavigate();
  const { proposals } = useProposal();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Client Portal</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-medium text-gray-900">
                    {proposal.data.clientName}
                  </h2>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Calendar className="mr-1.5 h-4 w-4" />
                    {new Date(proposal.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/proposal/${proposal.id}?shared=true`)}
                  className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660]"
                >
                  View Proposal
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Building className="mr-1.5 h-4 w-4" />
                  {proposal.data.locations?.join(', ')}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="mr-1.5 h-4 w-4" />
                  {proposal.data.eventDates?.length || 0} Events
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <DollarSign className="mr-1.5 h-4 w-4" />
                  ${proposal.data.summary?.totalEventCost.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClientPortal;