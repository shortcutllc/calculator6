import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { StandaloneProposalViewer } from './StandaloneProposalViewer';
import StandaloneProposalViewerV2 from './StandaloneProposalViewerV2';
import { StandaloneMindfulnessProposalViewer } from './StandaloneMindfulnessProposalViewer';
import ProposalViewer from './ProposalViewer';
import MindfulnessProposalViewer from './MindfulnessProposalViewer';
import { useAuth } from '../contexts/AuthContext';

/**
 * Router component that checks proposal type and renders the appropriate viewer
 * Routes to admin view (ProposalViewer) for all authenticated users, otherwise to client view
 */
export const ProposalTypeRouter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [proposalType, setProposalType] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a shared view (from query param or /shared/ path)
  const isSharedView = location.pathname.startsWith('/shared/') ||
    location.search.includes('shared=true');

  // Feature flag: ?redesign=1 routes the shared/client view to the V2 viewer
  // currently being built on the redesign-2026 branch. Once V2 is feature
  // complete this branches gets dropped and V2 becomes the only viewer.
  const useRedesignV2 = location.search.includes('redesign=1');

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

        // All authenticated users get the admin view (non-shared only)
        setIsOwner(!isSharedView && !!user);
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
    if (useRedesignV2) {
      return <StandaloneProposalViewerV2 />;
    }
    return <StandaloneProposalViewer />;
  }

  // For non-shared views: route to admin view if owner, otherwise client view
  if (proposalType === 'mindfulness-program') {
    return isOwner ? <MindfulnessProposalViewer /> : <StandaloneMindfulnessProposalViewer />;
  }

  // For event proposals: route to admin view if owner, otherwise client view
  if (!isOwner && useRedesignV2) {
    return <StandaloneProposalViewerV2 />;
  }
  return isOwner ? <ProposalViewer /> : <StandaloneProposalViewer />;
};

export default ProposalTypeRouter;

