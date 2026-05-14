import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { StandaloneProposalViewer } from './StandaloneProposalViewer';
import StandaloneProposalViewerV2 from './StandaloneProposalViewerV2';
import { StandaloneMindfulnessProposalViewer } from './StandaloneMindfulnessProposalViewer';
import ProposalViewer from './ProposalViewer';
import ProposalViewerV2 from './ProposalViewerV2';
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
  // Partnership proposals (Meta-style employee-pay / subsidized / tri-option
  // pricing) only have V1 rendering. The V2 viewers don't render
  // PartnershipModelsSection at all, so a partnership proposal opened in V2
  // is missing its whole pricing surface. Route them to V1 until we port
  // the partnership models into the V2 design system.
  const [isPartnership, setIsPartnership] = useState(false);

  // Check if this is a shared view (from query param or /shared/ path)
  const isSharedView = location.pathname.startsWith('/shared/') ||
    location.search.includes('shared=true');

  // V2 (redesign-2026) is now the default viewer for event proposals.
  // `?legacy=1` is an emergency escape hatch that falls back to V1 — leave
  // it in place for ~1 release cycle in case a regression surfaces in prod;
  // we can drop V1 entirely once we're confident.
  const useLegacyV1 = location.search.includes('legacy=1');
  // Back-compat alias — old links saved by staff might still use `?redesign=1`;
  // honor them as V2 (it's already the default but a no-op flag is safer than
  // a 404 if anyone has it bookmarked).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _legacyRedesignFlag = location.search.includes('redesign=1');

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
          .select('proposal_type, partnership_type, data, user_id')
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
        setIsPartnership(!!data.partnership_type);

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

  // Mindfulness-program proposals always use the dedicated mindfulness
  // viewers — V2 doesn't have a mindfulness equivalent yet (Phase 5+ scope).
  if (proposalType === 'mindfulness-program') {
    if (isSharedView) return <StandaloneMindfulnessProposalViewer />;
    return isOwner ? <MindfulnessProposalViewer /> : <StandaloneMindfulnessProposalViewer />;
  }

  // Event proposals: V2 is the default. `?legacy=1` falls back to V1 as an
  // emergency escape during the cutover. Partnership proposals also fall
  // back to V1 because the V2 viewers don't yet render the
  // PartnershipModelsSection (Meta employee-pay / subsidized / tri-option
  // pricing). Restore the V2 path for these once the partnership section
  // is ported into the design system.
  if (useLegacyV1 || isPartnership) {
    if (isSharedView) return <StandaloneProposalViewer />;
    return isOwner ? <ProposalViewer /> : <StandaloneProposalViewer />;
  }
  if (isSharedView) return <StandaloneProposalViewerV2 />;
  return isOwner ? <ProposalViewerV2 /> : <StandaloneProposalViewerV2 />;
};

export default ProposalTypeRouter;

