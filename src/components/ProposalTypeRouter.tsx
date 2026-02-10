import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { StandaloneProposalViewer } from './StandaloneProposalViewer';
import { StandaloneMindfulnessProposalViewer } from './StandaloneMindfulnessProposalViewer';
import ProposalViewer from './ProposalViewer';
import MindfulnessProposalViewer from './MindfulnessProposalViewer';
import { useAuth } from '../contexts/AuthContext';
import { isMasterAccount } from '../utils/isMasterAccount';

/**
 * Router component that checks proposal type and renders the appropriate viewer
 * Routes to admin view (ProposalViewer) if user is the owner OR is an admin/master account, otherwise to client view
 */
export const ProposalTypeRouter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [proposalType, setProposalType] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a shared view (from query param or /shared/ path)
  const isSharedView = location.pathname.startsWith('/shared/') || 
    location.search.includes('shared=true');

  useEffect(() => {
    if (!id) {
      setError('Proposal ID is required');
      setLoading(false);
      return;
    }

    const checkProposalType = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('proposals')
          .select('proposal_type, data, user_id')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Proposal not found');

        // Check if it's a full mindfulness program (with programId/sessions structure)
        // API-created mindfulness proposals use standard event structure and should use the event viewer
        const isMindfulness =
          (data.proposal_type === 'mindfulness-program' || data.data?.mindfulnessProgram) &&
          data.data?.mindfulnessProgram?.programId;

        setProposalType(isMindfulness ? 'mindfulness-program' : 'event');

        // Check if current user is the owner OR is an admin/master account (only if not a shared view)
        if (!isSharedView && user) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const isOwner = currentUser?.id === data.user_id;
          const isAdmin = isMasterAccount(currentUser);
          // Show admin view if user is owner OR is admin/master account
          setIsOwner(isOwner || isAdmin);
        } else {
          setIsOwner(false);
        }
      } catch (err) {
        console.error('Error checking proposal type:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    checkProposalType();
  }, [id, user, isSharedView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-medium text-center">
          <p className="text-xl text-red-500 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  // For shared views, always use standalone viewers
  if (isSharedView) {
    if (proposalType === 'mindfulness-program') {
      return <StandaloneMindfulnessProposalViewer />;
    }
    return <StandaloneProposalViewer />;
  }

  // For non-shared views: route to admin view if owner, otherwise client view
  if (proposalType === 'mindfulness-program') {
    return isOwner ? <MindfulnessProposalViewer /> : <StandaloneMindfulnessProposalViewer />;
  }

  // For event proposals: route to admin view if owner, otherwise client view
  return isOwner ? <ProposalViewer /> : <StandaloneProposalViewer />;
};

export default ProposalTypeRouter;

