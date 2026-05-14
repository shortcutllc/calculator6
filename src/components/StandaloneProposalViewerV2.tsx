import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Download, History as HistoryIcon, HelpCircle, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { generatePDF } from '../utils/pdf';
import {
  calculateServiceResults,
  recalculateServiceTotals,
} from '../utils/proposalGenerator';
import ProposalSurveyForm from './ProposalSurveyForm';
import ServiceCard from './proposal/ServiceCard';
import {
  Eyebrow,
  CardHeading,
  StatusPill,
  MiniStat,
  SectionLabel,
  T,
} from './proposal/shared/primitives';
import {
  useServiceSelections,
  selectionKey,
  ServiceSelection,
} from './proposal/useServiceSelections';
import { formatCurrency, SERVICE_DISPLAY } from './proposal/data';
import AccountTeamCard from './proposal/sidebar/AccountTeamCard';
import WhatsNextCard from './proposal/sidebar/WhatsNextCard';
import TrustCard from './proposal/sidebar/TrustCard';
import FaqCard from './proposal/sidebar/FaqCard';
import GalleryCard from './proposal/sidebar/GalleryCard';
import OptionsTabs, { ProposalOption } from './proposal/OptionsTabs';
import EventDaySummaryCard from './proposal/EventDaySummaryCard';
import DaySummaryBox from './proposal/DaySummaryBox';
import ServiceAgreementCard from './proposal/ServiceAgreementCard';
import RequestChangesModal from './proposal/RequestChangesModal';
import ApproveConfirmModal from './proposal/ApproveConfirmModal';
import HelpModal from './proposal/HelpModal';
import WhyShortcutSection from './proposal/sections/WhyShortcutSection';
import ServiceDetailsSection from './proposal/sections/ServiceDetailsSection';
import ParticipantBenefitsSection from './proposal/sections/ParticipantBenefitsSection';
import AdditionalResourcesSection from './proposal/sections/AdditionalResourcesSection';
import CLEOutlineSection from './proposal/sections/CLEOutlineSection';
import CLEAccreditationSection from './proposal/sections/CLEAccreditationSection';
import FacilitatorCard from './proposal/sidebar/FacilitatorCard';

// ============================================================================
// StandaloneProposalViewerV2 — the new client-facing proposal viewer.
//
// Phase 2A scope:  shell, header, hero, 2-col body, service blocks, Live Total
// Phase 2B scope:  + pricing summary, custom note, approve flow, DB persist
// Phase 2C scope:  + sidebar modules (Account team / Gallery / What's next /
//                    Trust / FAQ), survey CTA
// Phase 2D scope:  + options tabs (multi-option), event-day summary, service
//                    agreement, request-changes flow
// ============================================================================

// ----- Helpers ---------------------------------------------------------------
const formatDateLabel = (raw: string): string => {
  if (!raw || raw === 'TBD') return 'Date TBD';
  // Try ISO first, then fall back to the raw string if parsing fails
  try {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return format(parsed, 'EEE, MMM d, yyyy');
  } catch {
    return raw;
  }
};

const StandaloneProposalViewerV2: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [postApproval, setPostApproval] = useState(false);
  const [requestChangesOpen, setRequestChangesOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [clientNote, setClientNote] = useState('');
  const [clientNoteSaving, setClientNoteSaving] = useState(false);
  const [clientNoteSaved, setClientNoteSaved] = useState(false);
  // Client edit mode — lets the client tweak totalHours, numPros, classLength
  // and pricing-option params, then submit changes for staff review.
  const [isClientEditing, setIsClientEditing] = useState(false);
  const [clientEditedData, setClientEditedData] = useState<any>(null);
  const [isSubmittingClientChanges, setIsSubmittingClientChanges] = useState(false);
  const [clientEditCommentOpen, setClientEditCommentOpen] = useState(false);
  const [proposalOptions, setProposalOptions] = useState<ProposalOption[]>([]);

  // ---- Load proposal ------------------------------------------------------
  useEffect(() => {
    if (!id) {
      setError('Proposal ID is required');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .single();
        if (cancelled) return;
        if (error) throw error;
        if (!data) throw new Error('Proposal not found');
        setProposal(data);
        // Fetch sibling proposals in the same group (for the options tabs).
        // Only fetch when this proposal has a group_id; single-option proposals
        // skip this entirely.
        if (data.proposal_group_id) {
          try {
            const { data: siblings } = await supabase
              .from('proposals')
              .select('id, option_name, option_order, status, data')
              .eq('proposal_group_id', data.proposal_group_id)
              .order('option_order', { ascending: true, nullsFirst: false });
            if (!cancelled && siblings && siblings.length > 1) {
              setProposalOptions(siblings as ProposalOption[]);
            }
          } catch (groupErr) {
            console.warn('Failed to load proposal group siblings:', groupErr);
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load proposal:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Data resolution priority:
  // 1. If the client is actively editing → render the edit buffer
  // 2. If the client toggled "view original" → render the pre-change snapshot
  // 3. Otherwise → render the live persisted `proposal.data`
  const liveData = proposal?.data;
  const originalData = proposal?.original_data;
  const displayData =
    isClientEditing && clientEditedData
      ? clientEditedData
      : showingOriginal && originalData
      ? originalData
      : liveData;
  const status = proposal?.status as string | undefined;
  const isApproved = status === 'approved' || postApproval;
  const hasOriginalSnapshot = !!originalData && proposal?.has_changes;

  // Hydrate the client-side note (data.clientNote) once the proposal lands.
  // This is the textarea V1 had at the bottom of the standalone viewer.
  useEffect(() => {
    if (proposal?.data?.clientNote && typeof proposal.data.clientNote === 'string') {
      setClientNote(proposal.data.clientNote);
    }
  }, [proposal?.data?.clientNote]);

  // ---- DB persistence of selection state ---------------------------------
  // Fires when the hook's internal state changes. Writes the new optionsState
  // back to the proposals row's `data` JSONB. We keep this simple: every
  // change → full data write. The hook debounces by 200ms so rapid changes
  // coalesce into one network call.
  const persistOptionsState = useCallback(
    async (state: Record<string, ServiceSelection>) => {
      if (!id || !displayData || isApproved) return;
      const nextData = { ...displayData, optionsState: state };
      try {
        const { error } = await supabase
          .from('proposals')
          .update({ data: nextData })
          .eq('id', id);
        if (error) console.error('Failed to persist optionsState:', error);
      } catch (err) {
        console.error('Failed to persist optionsState:', err);
      }
    },
    [id, displayData, isApproved]
  );

  // ---- Selection state ----------------------------------------------------
  const { get, setIncluded, setFrequency, summary } = useServiceSelections({
    servicesByLocation: displayData?.services || {},
    initialState: displayData?.optionsState,
    onChange: persistOptionsState,
    readOnly: isApproved,
  });

  // ---- Service-type mix (drives Phase 5 conditional sections) -----------
  // Builds a unique-list of service slugs from displayData. Used to pick the
  // right "Why Shortcut" variant, decide whether to render mindfulness-only
  // sections (Participant Benefits / Additional Resources / Facilitator) and
  // whether the proposal needs CLE-specific sections.
  const serviceTypes = useMemo(() => {
    const set = new Set<string>();
    Object.values(displayData?.services || {}).forEach((byDate: any) => {
      Object.values(byDate || {}).forEach((dd: any) => {
        (dd?.services || []).forEach((s: any) => {
          if (s?.serviceType) set.add(String(s.serviceType));
        });
      });
    });
    return Array.from(set);
  }, [displayData]);

  const isMindfulnessLike = (s: string) => s === 'mindfulness' || s.startsWith('mindfulness-');
  const hasMindfulness = serviceTypes.some(isMindfulnessLike);
  const isMindfulnessOnly =
    serviceTypes.length > 0 && serviceTypes.every(isMindfulnessLike);
  const hasCLE = serviceTypes.some(
    (s) => s === 'mindfulness-cle' || s.startsWith('mindfulness-cle')
  );

  // ---- Derived stats ------------------------------------------------------
  const stats = useMemo(() => {
    const services = displayData?.services || {};
    const locationCount = Object.keys(services).length;
    let dateCount = 0;
    let appointmentCount = 0;
    // Headshot-specific roll-up for "cost per headshot" stat (V1 parity).
    let headshotCost = 0;
    let headshotAppts = 0;
    let hasHeadshot = false;
    Object.values(services).forEach((byDate: any) => {
      Object.values(byDate || {}).forEach((dateData: any) => {
        dateCount += 1;
        (dateData?.services || []).forEach((s: any) => {
          const apt = Number(s?.totalAppointments) || 0;
          appointmentCount += apt;
          if (s?.serviceType === 'headshot' || s?.serviceType === 'headshots') {
            hasHeadshot = true;
            headshotCost += Number(s?.serviceCost) || 0;
            headshotAppts += apt;
          }
        });
      });
    });
    const costPerHeadshot =
      hasHeadshot && headshotAppts > 0 ? headshotCost / headshotAppts : 0;
    return {
      locationCount,
      dateCount,
      appointmentCount,
      hasHeadshot,
      costPerHeadshot,
    };
  }, [displayData]);

  // ---- Custom line items (staff-set extras: catering, travel, etc.) -----
  const customLineItems = useMemo<any[]>(
    () =>
      Array.isArray(displayData?.customLineItems) ? displayData.customLineItems : [],
    [displayData?.customLineItems]
  );
  const customItemsTotal = useMemo(
    () =>
      customLineItems.reduce(
        (sum: number, it: any) => sum + (Number(it.amount) || 0),
        0
      ),
    [customLineItems]
  );

  // ---- Gratuity (staff-set add-on, optional per project decision) --------
  const gratuityBase = summary.subtotal + customItemsTotal;
  const gratuity = useMemo(() => {
    const type = displayData?.gratuityType as string | null | undefined;
    const value = displayData?.gratuityValue as number | null | undefined;
    if (!type || value == null) return null;
    const amount =
      type === 'percentage' ? (gratuityBase * value) / 100 : value;
    return { type, value, amount };
  }, [displayData?.gratuityType, displayData?.gratuityValue, gratuityBase]);

  const grandTotal = summary.total + customItemsTotal + (gratuity?.amount || 0);

  // ---- Approve flow -------------------------------------------------------
  const handleApprove = useCallback(async () => {
    if (!id || !displayData || isApproved) return;
    setIsApproving(true);
    try {
      // Final write includes the latest optionsState (already persisted) and
      // flips status to approved.
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'approved',
          pending_review: false,
          has_changes: false,
          change_source: 'client',
        })
        .eq('id', id);
      if (error) throw error;
      setPostApproval(true);
      // Best-effort Slack notification — reuses the existing function
      try {
        await fetch('/.netlify/functions/proposal-event-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'approve',
            proposalId: id,
            clientName: displayData.clientName || 'Unknown',
            clientEmail: displayData.clientEmail,
            proposalType: 'event',
            totalCost: grandTotal,
            eventDates: displayData.eventDates || [],
            locations: displayData.locations || [],
          }),
        });
      } catch (notifyErr) {
        console.warn('Approval notification failed (non-fatal):', notifyErr);
      }
    } catch (err) {
      console.error('Approval failed:', err);
      alert('We hit an issue approving your proposal. Please try again.');
    } finally {
      setIsApproving(false);
    }
  }, [id, displayData, isApproved, grandTotal]);

  // ---- Request changes flow ----------------------------------------------
  const handleSubmitChangeRequest = useCallback(
    async (note: string) => {
      if (!id || !displayData || isApproved) return;
      const nextData = {
        ...displayData,
        clientChangesNote: note,
        clientChangesAt: new Date().toISOString(),
      };
      try {
        const { error } = await supabase
          .from('proposals')
          .update({
            data: nextData,
            has_changes: true,
            pending_review: true,
            change_source: 'client',
          })
          .eq('id', id);
        if (error) throw error;
        // Best-effort Slack notification — reuses existing function
        try {
          await fetch('/.netlify/functions/proposal-event-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'changes_submitted',
              proposalId: id,
              clientName: displayData.clientName || 'Unknown',
              clientEmail: displayData.clientEmail,
              proposalType: 'event',
              totalCost: 0,
              eventDates: displayData.eventDates || [],
              locations: displayData.locations || [],
            }),
          });
        } catch (notifyErr) {
          console.warn('Change-request notification failed (non-fatal):', notifyErr);
        }
        setRequestSent(true);
        setRequestChangesOpen(false);
      } catch (err) {
        console.error('Request changes submit failed:', err);
        alert('We hit an issue sending your request. Please try again.');
      }
    },
    [id, displayData, isApproved]
  );

  // ---- Client edit mode handlers ----------------------------------------
  // Mirrors the V1 standalone viewer pattern: clients can tweak basic params
  // (totalHours / numPros / classLength / mindfulnessFormat) plus pricing-
  // option params. Submitting writes the new `data` snapshot and lets the
  // server-side trigger handle client_data / original_data attribution.
  const enterClientEditMode = useCallback(() => {
    if (!liveData) return;
    setShowingOriginal(false);
    setClientEditedData(
      recalculateServiceTotals(JSON.parse(JSON.stringify(liveData)))
    );
    setIsClientEditing(true);
  }, [liveData]);

  const cancelClientEditMode = useCallback(() => {
    if (
      JSON.stringify(clientEditedData) !== JSON.stringify(liveData) &&
      !window.confirm('Discard your unsaved changes?')
    ) {
      return;
    }
    setClientEditedData(null);
    setIsClientEditing(false);
  }, [clientEditedData, liveData]);

  // Generic field-change handler used by ServiceCard's `editing` mode for the
  // client. Path mirrors the admin viewer's handleFieldChange shape:
  // ['services', location, date, 'services', index, field]. We only allow
  // client-safe fields here — internal fields are gated by ServiceCard's
  // `internalView={false}` rendering.
  const clientHandleFieldChange = useCallback(
    (path: string[], value: any) => {
      if (!isClientEditing || !clientEditedData) return;
      const next = JSON.parse(JSON.stringify(clientEditedData));
      let target: any = next;
      for (let i = 0; i < path.length - 1; i++) target = target[path[i]];
      target[path[path.length - 1]] = value;
      // Service-level recalc when we touched a service param
      if (path.length >= 6 && path[0] === 'services' && path[3] === 'services') {
        const service = target;
        if (!service.pricingOptions || service.pricingOptions.length === 0) {
          const recalc = calculateServiceResults({ ...service });
          service.totalAppointments = recalc.totalAppointments;
          service.serviceCost = recalc.serviceCost;
          service.proRevenue = recalc.proRevenue;
        }
      }
      setClientEditedData(recalculateServiceTotals(next));
    },
    [isClientEditing, clientEditedData]
  );

  const clientEditPricingOption = useCallback(
    (
      loc: string,
      date: string,
      idx: number,
      optIdx: number,
      field: string,
      value: any
    ) => {
      if (!isClientEditing || !clientEditedData) return;
      const next = JSON.parse(JSON.stringify(clientEditedData));
      const svc = next.services?.[loc]?.[date]?.services?.[idx];
      if (!svc?.pricingOptions?.[optIdx]) return;
      svc.pricingOptions[optIdx] = {
        ...svc.pricingOptions[optIdx],
        [field]: value,
      };
      // Recalc the affected option from the merged service params
      const opt = svc.pricingOptions[optIdx];
      const merged = {
        ...svc,
        totalHours: opt.totalHours ?? svc.totalHours,
        hourlyRate: opt.hourlyRate ?? svc.hourlyRate,
        numPros: opt.numPros ?? svc.numPros,
        discountPercent:
          opt.discountPercent !== undefined
            ? opt.discountPercent
            : svc.discountPercent || 0,
      };
      const { totalAppointments, serviceCost, proRevenue } =
        calculateServiceResults(merged);
      svc.pricingOptions[optIdx] = {
        ...opt,
        totalAppointments,
        serviceCost,
        proRevenue,
        discountPercent: merged.discountPercent,
      };
      // Mirror onto base service if this is the selected option
      if ((svc.selectedOption || 0) === optIdx) {
        svc.totalAppointments = totalAppointments;
        svc.serviceCost = serviceCost;
        svc.proRevenue = proRevenue;
        svc.discountPercent = merged.discountPercent;
      }
      setClientEditedData(recalculateServiceTotals(next));
    },
    [isClientEditing, clientEditedData]
  );

  // Submit the client's edits. Comment captured via RequestChangesModal flow
  // for consistency. Writes the new `data` snapshot + flips the change flags;
  // the proposals trigger sorts out `original_data` / `client_data` history.
  const submitClientChanges = useCallback(
    async (note: string) => {
      if (!id || !clientEditedData || isApproved) return;
      setIsSubmittingClientChanges(true);
      try {
        const nextData = {
          ...clientEditedData,
          clientChangesNote: note,
          clientChangesAt: new Date().toISOString(),
        };
        const { error } = await supabase
          .from('proposals')
          .update({
            data: nextData,
            has_changes: true,
            pending_review: true,
            change_source: 'client',
          })
          .eq('id', id);
        if (error) throw error;
        try {
          await fetch('/.netlify/functions/proposal-event-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'changes_submitted',
              proposalId: id,
              clientName: nextData.clientName || 'Unknown',
              clientEmail: nextData.clientEmail,
              proposalType: 'event',
              totalCost: nextData?.summary?.totalEventCost || 0,
              eventDates: nextData.eventDates || [],
              locations: nextData.locations || [],
            }),
          });
        } catch (notifyErr) {
          console.warn('Change notification failed (non-fatal):', notifyErr);
        }
        // Refresh the persisted proposal + drop out of edit mode
        const { data: refreshed } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .single();
        if (refreshed) setProposal(refreshed);
        setClientEditedData(null);
        setIsClientEditing(false);
        setClientEditCommentOpen(false);
        setRequestSent(true);
      } catch (err) {
        console.error('Submit client changes failed:', err);
        alert('We hit an issue sending your changes. Please try again.');
      } finally {
        setIsSubmittingClientChanges(false);
      }
    },
    [id, clientEditedData, isApproved]
  );

  // ---- Save client note (textarea at bottom of body) --------------------
  // Persists to `data.clientNote`. Sets `pending_review` so staff get notified
  // via the existing change-source flow without flipping the full has_changes
  // state — V1 separates "Save Notes" from "Submit Changes" the same way.
  const handleSaveClientNote = useCallback(async () => {
    if (!id || !liveData || isApproved) return;
    setClientNoteSaving(true);
    try {
      const nextData = { ...liveData, clientNote };
      const { error } = await supabase
        .from('proposals')
        .update({ data: nextData, pending_review: true })
        .eq('id', id);
      if (error) throw error;
      setClientNoteSaved(true);
      setTimeout(() => setClientNoteSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save client note:', err);
      alert('We hit an issue saving your note. Please try again.');
    } finally {
      setClientNoteSaving(false);
    }
  }, [id, liveData, isApproved, clientNote]);

  // ---- PDF download — same flow as V1: html2canvas on #proposal-content
  const [isDownloading, setIsDownloading] = useState(false);
  const handleDownloadPdf = useCallback(async () => {
    if (!displayData || isDownloading) return;
    try {
      setIsDownloading(true);
      const safeName = (displayData.clientName || 'proposal')
        .replace(/\s+/g, '-')
        .toLowerCase();
      const filename = `${safeName}-proposal.pdf`;
      await generatePDF('proposal-content', filename);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('We hit a snag generating the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [displayData, isDownloading]);

  // ---- Survey response check — hide the CTA if we already have a response
  const [hasSurveyResponse, setHasSurveyResponse] = useState(false);
  useEffect(() => {
    if (!id || !isApproved) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('proposal_survey_responses')
          .select('id')
          .eq('proposal_id', id)
          .limit(1);
        if (!cancelled && data && data.length > 0) setHasSurveyResponse(true);
      } catch (err) {
        // Table may not exist in some envs — silent fallback
        console.warn('Survey response check failed (non-fatal):', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isApproved]);

  // ---- Loading + error states --------------------------------------------
  if (loading) {
    return (
      <div className="pv-page pv-page--client" style={{ minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="pv-page pv-page--client" style={{ minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div
            style={{
              background: '#fff',
              padding: 32,
              borderRadius: 20,
              border: '1px solid rgba(0,0,0,0.06)',
              maxWidth: 480,
              textAlign: 'center',
            }}
          >
            <CardHeading size="card" style={{ marginBottom: 8 }}>
              We hit a snag
            </CardHeading>
            <p style={{ color: T.fgMuted, fontFamily: T.fontD, fontSize: 14 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!displayData) return null;

  // Preserve current query string when navigating between options
  const queryString = location.search || '?shared=true&redesign=1';

  const clientName = displayData.clientName || proposal?.client_name || 'Client';
  // Prefer slug for proposal label; fall back to first 8 chars of UUID
  const proposalLabel = proposal?.slug
    ? proposal.slug
    : (proposal?.id || '').slice(0, 8).toUpperCase();
  const contactFirst = displayData?.customization?.contactFirstName || displayData?.contactFirstName;
  const customNote = displayData?.customization?.customNote;
  const initial = (clientName[0] || '?').toUpperCase();
  const clientLogoUrl = displayData?.clientLogoUrl || proposal?.client_logo_url || null;

  // Resolve the office address for a given location.
  //  1. `data.officeLocations` (per-location map) — preferred
  //  2. `data.officeLocation` (legacy single address) — fallback
  const resolveOfficeAddress = (locationName: string): string | null => {
    const perLoc = displayData?.officeLocations;
    if (perLoc && typeof perLoc === 'object' && perLoc[locationName]) {
      return perLoc[locationName];
    }
    if (displayData?.officeLocation && typeof displayData.officeLocation === 'string') {
      return displayData.officeLocation;
    }
    return null;
  };

  // ---- Approved state -----------------------------------------------------
  if (isApproved) {
    return (
      <div
        className="pv-page pv-page--client"
        id="proposal-content"
        style={{ minHeight: '100vh', background: T.beige }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '80px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 20px',
              borderRadius: 36,
              background: 'rgba(30,158,106,.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={36} color={T.success} strokeWidth={2.25} />
          </div>
          <h1
            style={{
              fontFamily: T.fontD,
              fontWeight: 800,
              fontSize: 44,
              letterSpacing: '-0.02em',
              color: T.navy,
              margin: 0,
            }}
          >
            Proposal approved.
          </h1>
          <p
            style={{
              fontFamily: T.fontD,
              fontSize: 16,
              color: T.fgMuted,
              lineHeight: 1.55,
              marginTop: 14,
              marginBottom: 32,
            }}
          >
            Thanks{contactFirst ? `, ${contactFirst}` : ''}. We've locked in your
            selections and our team will be in touch with next steps. You can
            still view this page anytime for reference.
          </p>
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              maxWidth: 380,
              margin: '0 auto',
            }}
          >
            <Eyebrow style={{ marginBottom: 6 }}>Total committed</Eyebrow>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 36,
                letterSpacing: '-0.02em',
                color: T.coral,
              }}
            >
              {formatCurrency(grandTotal)}
            </div>
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.fgMuted,
                marginTop: 6,
              }}
            >
              {summary.rows.filter((r) => r.included).length} service
              {summary.rows.filter((r) => r.included).length === 1 ? '' : 's'} ·{' '}
              {summary.totalEvents} event{summary.totalEvents === 1 ? '' : 's'}/year
            </div>
          </div>

          {/* Post-approval survey — same component + flow as V1, just rendered
              inside the new layout. Hidden once a response is already on file. */}
          {!hasSurveyResponse && id && (
            <div
              id="proposal-survey-form"
              style={{
                marginTop: 40,
                maxWidth: 720,
                marginLeft: 'auto',
                marginRight: 'auto',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={20} color={T.coral} />
                <CardHeading size="item" style={{ margin: 0 }}>
                  Quick event-details form
                </CardHeading>
              </div>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: T.fgMuted,
                  textAlign: 'center',
                  marginBottom: 18,
                }}
              >
                Helps us prep day-of logistics — takes about 3 minutes.
              </p>
              <ProposalSurveyForm
                proposalId={id}
                includesMassage={Object.values(displayData?.services || {}).some(
                  (byDate: any) =>
                    Object.values(byDate || {}).some((dd: any) =>
                      (dd?.services || []).some((s: any) => s.serviceType === 'massage')
                    )
                )}
                locations={Object.keys(displayData?.services || {})}
                officeLocation={displayData?.officeLocation}
                officeLocations={displayData?.officeLocations}
                onSuccess={() => setHasSurveyResponse(true)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Main render -------------------------------------------------------
  return (
    <div
      className="pv-page pv-page--client"
      id="proposal-content"
      style={{ minHeight: '100vh', background: T.beige }}
    >
      {/* ===== Sticky header ===== */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 18,
                color: T.navy,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              Shortcut
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: 'rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 600,
                fontSize: 14,
                color: T.navy,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {clientName}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <StatusPill status={(status as any) || 'draft'} />
            {isClientEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelClientEditMode}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    background: 'transparent',
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    color: T.navy,
                  }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => setClientEditCommentOpen(true)}
                  disabled={isSubmittingClientChanges}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: T.coral,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    cursor: isSubmittingClientChanges ? 'wait' : 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
                    opacity: isSubmittingClientChanges ? 0.7 : 1,
                  }}
                >
                  {isSubmittingClientChanges ? 'Sending…' : 'Submit changes'}
                </button>
              </>
            ) : (
              !isApproved &&
              !showingOriginal && (
                <button
                  type="button"
                  onClick={enterClientEditMode}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    background: T.navy,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                  title="Tweak hours, pros, and pricing options"
                >
                  Edit
                </button>
              )
            )}
            {hasOriginalSnapshot && !isApproved && !isClientEditing && (
              <button
                type="button"
                onClick={() => setShowingOriginal((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: showingOriginal ? T.lightGray : 'transparent',
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.navy,
                }}
                title={
                  showingOriginal
                    ? 'View your current selections'
                    : 'View the proposal as originally sent'
                }
              >
                <HistoryIcon size={14} />
                {showingOriginal ? 'View current' : 'View original'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: 'transparent',
                border: '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                color: T.navy,
              }}
              title="How this works"
            >
              <HelpCircle size={14} />
              How it works
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'transparent',
                border: '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: 10,
                cursor: isDownloading ? 'wait' : 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                color: T.navy,
                opacity: isDownloading ? 0.6 : 1,
              }}
            >
              <Download size={14} />
              {isDownloading ? 'Generating…' : 'PDF'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section style={{ padding: '40px 24px 24px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Client logo banner — full-width, brand-forward. Falls back to the
            52×52 initial tile when no logo is on file. */}
        {clientLogoUrl ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '20px 24px',
              background: '#fff',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              marginBottom: 20,
              maxWidth: 320,
              minHeight: 96,
            }}
          >
            <img
              src={clientLogoUrl}
              alt={`${clientName} logo`}
              style={{
                maxWidth: '100%',
                maxHeight: 64,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T.fontD,
              fontWeight: 800,
              fontSize: 24,
              color: T.navy,
              marginBottom: 18,
            }}
          >
            {initial}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <Eyebrow>Prepared for · {proposalLabel}</Eyebrow>
          {(contactFirst || proposal?.client_email) && (
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.fgMuted,
                marginTop: 4,
              }}
            >
              {contactFirst && <span>{contactFirst} · </span>}
              {proposal?.client_email}
            </div>
          )}
        </div>

        <h1
          style={{
            fontFamily: T.fontD,
            fontWeight: 800,
            fontSize: 56,
            lineHeight: 1.06,
            letterSpacing: '-0.025em',
            color: T.navy,
            margin: 0,
          }}
        >
          {clientName} wellness proposal
        </h1>
        <p
          style={{
            fontFamily: T.fontD,
            fontSize: 16,
            color: T.fgMuted,
            lineHeight: 1.55,
            marginTop: 12,
            marginBottom: 32,
            maxWidth: 720,
          }}
        >
          Review the services we've put together, adjust what's included and how
          often, then approve when you're ready.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            maxWidth: 760,
          }}
        >
          <MiniStat label="Locations" value={stats.locationCount} accent="navy" />
          <MiniStat label="Event dates" value={stats.dateCount} accent="navy" />
          <MiniStat
            label="Appointments"
            value={stats.appointmentCount.toLocaleString('en-US')}
            accent="navy"
          />
          <MiniStat label="Total" value={formatCurrency(grandTotal)} accent="coral" />
        </div>

        {/* Optional: cost-per-headshot stat for headshot proposals.
            Mirrors V1 (lines ~2440 of StandaloneProposalViewer). Only renders
            when at least one headshot service has appointments on the books. */}
        {stats.hasHeadshot && stats.costPerHeadshot > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 14,
              padding: '10px 16px',
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 12,
            }}
          >
            <Eyebrow>Cost per headshot</Eyebrow>
            <span
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 20,
                color: T.navy,
                letterSpacing: '-0.015em',
              }}
            >
              {formatCurrency(stats.costPerHeadshot)}
            </span>
          </div>
        )}
      </section>

      {/* ===== 2-col body grid ===== */}
      <section
        style={{
          padding: '24px 24px 96px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        {/* --- Main column --- */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 48, minWidth: 0 }}>
          {/* Options tabs — only when there's a sibling group */}
          {proposalOptions.length > 1 && id && (
            <OptionsTabs
              options={proposalOptions}
              currentId={id}
              queryString={queryString}
            />
          )}

          {/* Banner — you're in client edit mode */}
          {isClientEditing && (
            <div
              style={{
                background: 'rgba(158,250,255,.22)',
                border: '1px solid rgba(0,152,173,.25)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: T.aqua,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={16} color={T.navy} strokeWidth={2.25} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.navy,
                  }}
                >
                  You're editing this proposal
                </div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                    marginTop: 2,
                  }}
                >
                  Tweak hours, professionals, class lengths, and pricing options inline.
                  Submit changes when you're ready and we'll review.
                </div>
              </div>
            </div>
          )}

          {/* Banner — viewing the original (pre-change) snapshot */}
          {showingOriginal && (
            <div
              style={{
                background: 'rgba(254,220,100,.25)',
                border: '1px solid rgba(140,90,7,.25)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <HistoryIcon size={18} color="#8C5A07" />
              <div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.navy,
                  }}
                >
                  Viewing the proposal as originally sent
                </div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                    marginTop: 2,
                  }}
                >
                  Click "View current" in the header to return to your selections.
                </div>
              </div>
            </div>
          )}

          {/* Banner — changes requested confirmation */}
          {(requestSent || proposal?.has_changes) && !isApproved && !showingOriginal && (
            <div
              style={{
                background: 'rgba(255,80,80,0.08)',
                border: `1px solid rgba(255,80,80,0.25)`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: T.coral,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.navy,
                  }}
                >
                  Change request sent to your account team
                </div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                    marginTop: 2,
                  }}
                >
                  We'll follow up shortly — you can keep this page open or check back later.
                </div>
              </div>
            </div>
          )}

          {/* Custom note (from staff) */}
          {customNote && (
            <div
              style={{
                background: 'rgba(158,250,255,.18)',
                border: '1px solid rgba(0,152,173,.18)',
                borderRadius: 16,
                padding: '22px 24px',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: T.aqua,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} color={T.navy} strokeWidth={2.25} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Eyebrow>A note from Shortcut</Eyebrow>
                <p
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 15,
                    color: T.navy,
                    lineHeight: 1.55,
                    margin: '6px 0 0',
                  }}
                >
                  {customNote}
                </p>
              </div>
            </div>
          )}

          {/* Services per location/date */}
          <div>
            <SectionLabel
              eyebrow="What's included"
              title="Services, dates, and locations"
              size="section"
              mb={24}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(displayData.services || {}).map(
                ([loc, byDate]: [string, any]) => {
                  const officeAddress = resolveOfficeAddress(loc);
                  return (
                  <div key={loc}>
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <MapPin size={16} color={T.fgMuted} />
                        <Eyebrow>{loc}</Eyebrow>
                      </div>
                      {officeAddress && (
                        <div
                          style={{
                            fontFamily: T.fontD,
                            fontSize: 13,
                            color: T.fgMuted,
                            marginLeft: 24,
                            marginTop: 2,
                            lineHeight: 1.4,
                          }}
                        >
                          {officeAddress}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {Object.entries(byDate || {}).map(
                        ([date, dateData]: [string, any], dateIndex: number) => {
                          // Day-level totals — sum included services + their frequency.
                          // Mirrors what shows in the live pricing summary so the client
                          // sees a consistent number when looking at one date.
                          let dayAppts = 0;
                          let dayCost = 0;
                          let hasUnlimited = false;
                          (dateData?.services || []).forEach(
                            (service: any, idx: number) => {
                              const k = selectionKey(loc, date, idx);
                              const s = get(k);
                              if (!s.included) return;
                              const a = service?.totalAppointments;
                              if (a === 'unlimited' || a === '∞') {
                                hasUnlimited = true;
                              } else {
                                dayAppts += (Number(a) || 0) * (s.frequency || 1);
                              }
                              dayCost +=
                                (Number(service?.serviceCost) || 0) *
                                (s.frequency || 1);
                            }
                          );
                          return (
                            <div
                              key={date}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: T.fontUi,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  color: T.fgMuted,
                                }}
                              >
                                {formatDateLabel(date)}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 12,
                                }}
                              >
                                {(dateData?.services || []).map(
                                  (service: any, idx: number) => {
                                    const key = selectionKey(loc, date, idx);
                                    const sel = get(key);
                                    return (
                                      <ServiceCard
                                        key={key}
                                        service={service}
                                        included={sel.included}
                                        frequency={sel.frequency}
                                        onToggleInclude={(next) =>
                                          setIncluded(key, next)
                                        }
                                        onChangeFrequency={(next) =>
                                          setFrequency(key, next)
                                        }
                                        internalView={false}
                                        editing={isClientEditing}
                                        onFieldChange={
                                          isClientEditing
                                            ? (field, value) =>
                                                clientHandleFieldChange(
                                                  [
                                                    'services',
                                                    loc,
                                                    date,
                                                    'services',
                                                    String(idx),
                                                    field as string,
                                                  ],
                                                  value
                                                )
                                            : undefined
                                        }
                                        onSelectPricingOption={
                                          isClientEditing
                                            ? (optIdx) =>
                                                clientHandleFieldChange(
                                                  [
                                                    'services',
                                                    loc,
                                                    date,
                                                    'services',
                                                    String(idx),
                                                    'selectedOption',
                                                  ],
                                                  optIdx
                                                )
                                            : undefined
                                        }
                                        onEditPricingOption={
                                          isClientEditing
                                            ? (optIdx, field, value) =>
                                                clientEditPricingOption(
                                                  loc,
                                                  date,
                                                  idx,
                                                  optIdx,
                                                  field as string,
                                                  value
                                                )
                                            : undefined
                                        }
                                      />
                                    );
                                  }
                                )}
                              </div>
                              {(dateData?.services || []).length > 0 && (
                                <DaySummaryBox
                                  dayNumber={dateIndex + 1}
                                  appointments={hasUnlimited ? 'unlimited' : dayAppts}
                                  totalCost={dayCost}
                                  originalCost={
                                    typeof dateData?.originalTotalCost === 'number'
                                      ? dateData.originalTotalCost
                                      : undefined
                                  }
                                  discountLabel={
                                    typeof displayData?.autoRecurringDiscount ===
                                      'number' &&
                                    displayData.autoRecurringDiscount > 0
                                      ? `${displayData.autoRecurringDiscount}% recurring discount`
                                      : undefined
                                  }
                                />
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                  );
                }
              )}
              {Object.keys(displayData.services || {}).length === 0 && (
                <div
                  style={{
                    background: '#fff',
                    padding: 32,
                    borderRadius: 16,
                    border: '1px solid rgba(0,0,0,0.06)',
                    textAlign: 'center',
                    color: T.fgMuted,
                    fontFamily: T.fontD,
                  }}
                >
                  No services yet.
                </div>
              )}
            </div>
          </div>

          {/* Why Shortcut — variant resolves from serviceTypes (single service,
              multi-service unified, or CLE). Rendered for every proposal. */}
          {serviceTypes.length > 0 && (
            <WhyShortcutSection serviceTypes={serviceTypes} />
          )}

          {/* Per-service details (Benefits + What's Included + features) for
              every non-mindfulness service in the proposal. Mindfulness gets
              its own ParticipantBenefits + AdditionalResources sections
              below instead, so we filter mindfulness out here. */}
          {(() => {
            const detail = serviceTypes.filter((s) => !isMindfulnessLike(s));
            return detail.length > 0 ? (
              <ServiceDetailsSection serviceTypes={detail} />
            ) : null;
          })()}

          {/* Mindfulness-only sections — only render when at least one
              mindfulness service exists in the proposal. */}
          {hasMindfulness && <ParticipantBenefitsSection />}
          {hasCLE && <CLEOutlineSection />}
          {hasCLE && <CLEAccreditationSection />}
          {hasMindfulness && <AdditionalResourcesSection />}

          {/* Event-day summary — per-location at-a-glance */}
          <EventDaySummaryCard
            servicesByLocation={displayData.services || {}}
            rows={summary.rows}
          />

          {/* Service agreement — collapsed by default. Pulls real terms from
              the existing ServiceAgreement.tsx; modal personalizes "Partner". */}
          <ServiceAgreementCard clientName={clientName} />

          {/* Pricing summary card */}
          <div
            style={{
              background: T.navy,
              color: '#fff',
              borderRadius: 24,
              padding: '40px 44px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            <Eyebrow color="rgba(255,255,255,0.55)">Pricing summary</Eyebrow>
            <h2
              style={{
                fontFamily: T.fontD,
                fontWeight: 700,
                fontSize: 32,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#fff',
                margin: '8px 0 28px',
              }}
            >
              What you're approving
            </h2>

            {/* Line items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {summary.rows.map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 12,
                    opacity: row.included ? 1 : 0.45,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: T.fontD,
                        fontWeight: 600,
                        fontSize: 16,
                        color: '#fff',
                        textDecoration: row.included ? 'none' : 'line-through',
                      }}
                    >
                      {SERVICE_DISPLAY[row.serviceType] || row.serviceType}
                    </span>
                    {row.frequency > 1 && row.included && (
                      <span
                        style={{
                          background: T.aqua,
                          color: T.navy,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontFamily: T.fontUi,
                          fontWeight: 700,
                          fontSize: 11,
                          letterSpacing: '.02em',
                        }}
                      >
                        ×{row.frequency} / yr
                      </span>
                    )}
                    {!row.included && (
                      <span
                        style={{
                          fontFamily: T.fontUi,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '.05em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        Excluded
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: T.fontD,
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.55)',
                      }}
                    >
                      · {row.location}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: T.fontD,
                      fontWeight: 700,
                      fontSize: 16,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      textDecoration: row.included ? 'none' : 'line-through',
                    }}
                  >
                    {formatCurrency(row.lineCost)}
                  </span>
                </div>
              ))}
              {customLineItems
                .filter((it: any) => (Number(it.amount) || 0) > 0 || it.name)
                .map((it: any, i: number) => (
                  <div
                    key={it.id || `custom-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: T.fontD,
                          fontWeight: 600,
                          fontSize: 16,
                          color: '#fff',
                        }}
                      >
                        {it.name || 'Custom item'}
                      </span>
                      {it.description && (
                        <span
                          style={{
                            fontFamily: T.fontD,
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.55)',
                          }}
                        >
                          {it.description}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontFamily: T.fontD,
                        fontWeight: 700,
                        fontSize: 16,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrency(Number(it.amount) || 0)}
                    </span>
                  </div>
                ))}
            </div>

            {/* Totals */}
            <div
              style={{
                height: 1,
                background: 'rgba(255,255,255,0.12)',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                <span>Subtotal</span>
                <span style={{ color: '#fff' }}>
                  {formatCurrency(summary.subtotal + customItemsTotal)}
                </span>
              </div>
              {summary.discountPercent > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: T.fontD,
                    fontSize: 14,
                    color: T.aqua,
                  }}
                >
                  <span>Volume discount · {summary.discountPercent}%</span>
                  <span>−{formatCurrency(summary.discountAmount)}</span>
                </div>
              )}
              {typeof displayData?.autoRecurringDiscount === 'number' &&
                displayData.autoRecurringDiscount > 0 &&
                typeof displayData?.autoRecurringSavings === 'number' &&
                displayData.autoRecurringSavings > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: T.fontD,
                      fontSize: 14,
                      color: T.aqua,
                    }}
                  >
                    <span>
                      Recurring discount · {displayData.autoRecurringDiscount}%
                    </span>
                    <span>−{formatCurrency(displayData.autoRecurringSavings)}</span>
                  </div>
                )}
              {gratuity && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: T.fontD,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  <span>
                    Gratuity
                    {gratuity.type === 'percentage' ? ` · ${gratuity.value}%` : ''}
                  </span>
                  <span style={{ color: '#fff' }}>
                    {formatCurrency(gratuity.amount)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 24,
                    color: '#fff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 800,
                    fontSize: 56,
                    lineHeight: 1,
                    color: T.aqua,
                    letterSpacing: '-0.025em',
                  }}
                >
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 14,
                marginBottom: 0,
              }}
            >
              Invoice issued before each event. Payment due 48 hours prior to the first scheduled event.
              Cancellation: 72+ hrs notice = no charge. See the service agreement above for full terms.
            </p>
          </div>

          {/* Client notes textarea — quick way for the client to leave a note
              for the account team without going through the full Request
              Changes flow. Persists to `data.clientNote` and sets
              pending_review so the team gets the same notification. */}
          {!isApproved && !showingOriginal && (
            <div
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 16,
                padding: '22px 24px',
              }}
            >
              <Eyebrow style={{ marginBottom: 6 }}>Notes for our team</Eyebrow>
              <CardHeading size="item" style={{ marginBottom: 12 }}>
                Anything else we should know?
              </CardHeading>
              <textarea
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                rows={4}
                placeholder="Optional — questions, day-of preferences, special accommodations…"
                disabled={clientNoteSaving}
                style={{
                  width: '100%',
                  padding: 12,
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: T.navy,
                  background: '#fff',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  borderRadius: 10,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 10,
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: clientNoteSaved ? T.success : T.fgMuted,
                  }}
                >
                  {clientNoteSaved
                    ? 'Saved — your account team will see this.'
                    : 'Not a binding edit — just a heads-up.'}
                </span>
                <button
                  type="button"
                  onClick={handleSaveClientNote}
                  disabled={
                    clientNoteSaving ||
                    (clientNote.trim() ===
                      (liveData?.clientNote || '').trim())
                  }
                  style={{
                    padding: '8px 16px',
                    background: T.navy,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    cursor: clientNoteSaving ? 'wait' : 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    opacity:
                      clientNoteSaving ||
                      clientNote.trim() === (liveData?.clientNote || '').trim()
                        ? 0.5
                        : 1,
                  }}
                >
                  {clientNoteSaving ? 'Saving…' : 'Save note'}
                </button>
              </div>
            </div>
          )}

          {/* Approve CTA */}
          <div
            style={{
              background: '#fff',
              border: `2px solid ${T.coral}`,
              borderRadius: 24,
              padding: '40px 44px',
              boxShadow: '0 8px 32px rgba(255,80,80,0.16)',
            }}
          >
            <Eyebrow color={T.coral}>Final step</Eyebrow>
            <h2
              style={{
                fontFamily: T.fontD,
                fontWeight: 700,
                fontSize: 30,
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                color: T.navy,
                margin: '8px 0 12px',
              }}
            >
              Ready to move forward?
            </h2>
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 15,
                color: T.fgMuted,
                lineHeight: 1.55,
                margin: '0 0 24px',
                maxWidth: 560,
              }}
            >
              Approving locks in your selections at <strong style={{ color: T.navy }}>
                {formatCurrency(grandTotal)}
              </strong>{' '}
              for {summary.rows.filter((r) => r.included).length} service
              {summary.rows.filter((r) => r.included).length === 1 ? '' : 's'}.
              Our team will follow up with logistics.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setRequestChangesOpen(true)}
                style={{
                  padding: '12px 20px',
                  background: '#fff',
                  color: T.navy,
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Request changes
              </button>
              <button
                type="button"
                onClick={() => setApproveConfirmOpen(true)}
                disabled={isApproving || summary.rows.every((r) => !r.included)}
                style={{
                  padding: '12px 24px',
                  background: T.coral,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: isApproving ? 'wait' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 14,
                  opacity: summary.rows.every((r) => !r.included) ? 0.5 : 1,
                }}
              >
                {isApproving ? 'Approving…' : 'Approve proposal'}
              </button>
            </div>
          </div>
        </main>

        {/* --- Sidebar --- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Live Total card */}
          <div
            style={{
              background: T.navy,
              color: '#fff',
              borderRadius: 16,
              padding: '22px 24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              position: 'sticky',
              top: 80,
            }}
          >
            <Eyebrow color="rgba(255,255,255,0.6)">Your total today</Eyebrow>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 44,
                lineHeight: 1,
                color: T.aqua,
                letterSpacing: '-0.025em',
                marginTop: 8,
              }}
            >
              {formatCurrency(grandTotal)}
            </div>
            {summary.discountPercent > 0 && (
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 6,
                }}
              >
                Subtotal {formatCurrency(summary.subtotal)} · saving{' '}
                {formatCurrency(summary.discountAmount)} ({summary.discountPercent}%)
              </div>
            )}
            {summary.discountPercent === 0 && summary.totalEvents > 0 && summary.totalEvents < 4 && (
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.65)',
                  marginTop: 6,
                }}
              >
                Add {4 - summary.totalEvents} more event
                {4 - summary.totalEvents === 1 ? '' : 's'} for a 15% volume discount.
              </div>
            )}

            <div
              style={{
                height: 1,
                background: 'rgba(255,255,255,0.12)',
                margin: '18px 0',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                Services included
              </span>
              <span
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                {summary.rows.filter((r) => r.included).length} of {summary.rows.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || summary.rows.every((r) => !r.included)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: T.coral,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 14,
                cursor: isApproving ? 'wait' : 'pointer',
                marginBottom: 8,
                opacity: summary.rows.every((r) => !r.included) ? 0.5 : 1,
              }}
            >
              {isApproving ? 'Approving…' : 'Approve proposal'}
            </button>
            <button
              type="button"
              onClick={() => setRequestChangesOpen(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.85)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Request changes
            </button>
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 10,
                textAlign: 'center',
              }}
            >
              Selections auto-save as you toggle.
            </div>
          </div>

          {/* Facilitator — only for mindfulness-only proposals. Courtney
              photo + bio mirroring V1 StandaloneProposalViewer (right rail). */}
          {isMindfulnessOnly && <FacilitatorCard />}

          {/* Account team — driven by data.accountTeamMemberEmail, defaults to Jaimie */}
          <AccountTeamCard email={displayData?.accountTeamMemberEmail} />

          {/* Gallery — placeholder for now, real media wires in Phase 6 */}
          <GalleryCard
            serviceTypes={Array.from(
              new Set(
                Object.values(displayData?.services || {}).flatMap((byDate: any) =>
                  Object.values(byDate || {}).flatMap((dd: any) =>
                    (dd?.services || []).map((s: any) => s.serviceType)
                  )
                )
              )
            )}
          />

          {/* What's next — 4-step process */}
          <WhatsNextCard activeStep={isApproved ? 3 : 1} />

          {/* Trust — 87% rebook + client logos */}
          <TrustCard />

          {/* FAQ — common questions, accordion */}
          <FaqCard />
        </aside>
      </section>

      {/* Request-changes modal — overlays the page */}
      <RequestChangesModal
        open={requestChangesOpen}
        onClose={() => setRequestChangesOpen(false)}
        onSubmit={handleSubmitChangeRequest}
        previousNote={displayData?.clientChangesNote}
      />

      {/* Approve confirmation modal — soft gate before locking in */}
      <ApproveConfirmModal
        open={approveConfirmOpen}
        onClose={() => !isApproving && setApproveConfirmOpen(false)}
        onConfirm={async () => {
          await handleApprove();
          setApproveConfirmOpen(false);
        }}
        busy={isApproving}
        total={grandTotal}
        servicesIncluded={summary.rows.filter((r) => r.included).length}
        servicesTotal={summary.rows.length}
        optionName={
          proposalOptions.find((o: any) => o.id === id)?.option_name || null
        }
        clientFirstName={contactFirst || undefined}
      />

      {/* Help / "how this works" modal */}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Submit-changes comment modal — opens from the header "Submit changes"
          button while the client is in edit mode. Reuses RequestChangesModal
          for its proven comment-capture UX. */}
      <RequestChangesModal
        open={clientEditCommentOpen}
        onClose={() => !isSubmittingClientChanges && setClientEditCommentOpen(false)}
        onSubmit={submitClientChanges}
        previousNote=""
      />
    </div>
  );
};

export default StandaloneProposalViewerV2;
