import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronDown, Download, History as HistoryIcon, HelpCircle, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
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
  CollapseHead,
  StatusPill,
  MiniStat,
  SectionLabel,
  T,
} from './proposal/shared/primitives';
import { useIsCompact, useIsMobile } from './proposal/shared/useIsMobile';
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

/** Compact range like "May 14–22, 2026" (same month/year) or
 *  "May 14 – Jun 2, 2026" (cross-month). Used in the hero subtitle. */
const formatDateRange = (first: Date, last: Date): string => {
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return '';
  if (
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth() &&
    first.getDate() === last.getDate()
  ) {
    return format(first, 'MMM d, yyyy');
  }
  if (first.getFullYear() === last.getFullYear()) {
    if (first.getMonth() === last.getMonth()) {
      return `${format(first, 'MMM d')}–${format(last, 'd, yyyy')}`;
    }
    return `${format(first, 'MMM d')} – ${format(last, 'MMM d, yyyy')}`;
  }
  return `${format(first, 'MMM d, yyyy')} – ${format(last, 'MMM d, yyyy')}`;
};

const StandaloneProposalViewerV2: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // Responsive flags drive inline-style switches for the major layout
  // surfaces (body grid columns, hero type scale, card padding).
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
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
  // Client edit mode — lets the client tweak totalHours, numPros, classLength
  // and pricing-option params, then submit changes for staff review.
  const [isClientEditing, setIsClientEditing] = useState(false);
  const [clientEditedData, setClientEditedData] = useState<any>(null);
  const [isSubmittingClientChanges, setIsSubmittingClientChanges] = useState(false);
  const [clientEditCommentOpen, setClientEditCommentOpen] = useState(false);
  // Collapsible location sections (keyed by location string). Default-open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
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

  // ---- Pricing-option click (read-only client view) --------------------
  // Always-on path so clients can pick Half day / Full day / Premium tiers
  // without entering edit mode. Mirrors the selected option's cost +
  // appointments + proRevenue onto the base service, persists the new
  // `selectedOption` in both data.services and the dedicated selected_options
  // JSONB column (V1 parity), and updates local state so the price flips
  // immediately.
  const handleSelectPricingOption = useCallback(
    async (loc: string, date: string, idx: number, optIdx: number) => {
      if (!id || isApproved || !proposal?.data) return;
      const next = JSON.parse(JSON.stringify(proposal.data));
      const svc = next.services?.[loc]?.[date]?.services?.[idx];
      if (!svc?.pricingOptions?.[optIdx]) return;
      svc.selectedOption = optIdx;
      const sel = svc.pricingOptions[optIdx];
      if (sel) {
        if (sel.totalAppointments !== undefined) svc.totalAppointments = sel.totalAppointments;
        if (sel.serviceCost !== undefined) svc.serviceCost = sel.serviceCost;
        if (sel.proRevenue !== undefined) svc.proRevenue = sel.proRevenue;
        if (sel.discountPercent !== undefined) svc.discountPercent = sel.discountPercent;
      }
      setProposal((p: any) => ({ ...p, data: next }));
      const key = `${loc}-${date}-${idx}`;
      const so = { ...(proposal.selected_options || {}), [key]: optIdx };
      try {
        await supabase
          .from('proposals')
          .update({ data: next, selected_options: so })
          .eq('id', id);
      } catch (err) {
        console.error('Persist selectedOption failed:', err);
      }
    },
    [id, proposal, isApproved]
  );

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
  const queryString = location.search || '?shared=true';

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
          padding: isCompact ? '10px 16px' : '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            // Phones: stack logo/name row on top, buttons row below.
            // Flex-wrap alone wouldn't trigger because the right cluster
            // has no width constraint — column direction sidesteps that.
            flexDirection: isCompact ? 'column' : 'row',
            alignItems: isCompact ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isCompact ? 8 : 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <img
              src="/shortcut-logo-blue.svg"
              alt="Shortcut"
              style={{
                height: 22,
                width: 'auto',
                display: 'block',
                flexShrink: 0,
              }}
            />
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
                fontSize: 14,
                color: T.fgMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              <span style={{ fontWeight: 600 }}>{clientName}</span>
              {(() => {
                const current = proposalOptions.find((o: any) => o.id === id);
                if (proposalOptions.length > 1 && current?.option_name) {
                  return (
                    <>
                      <span style={{ margin: '0 6px' }}> · </span>
                      <span
                        style={{ fontWeight: 700, color: T.navy }}
                      >{current.option_name}</span>
                    </>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCompact ? 6 : 10,
              flexShrink: 0,
              // Phones: allow Edit / How it works / PDF to wrap onto a
              // second line if they collectively outgrow the row.
              flexWrap: isCompact ? 'wrap' : 'nowrap',
              justifyContent: isCompact ? 'flex-start' : 'flex-end',
            }}
          >
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

      {/* ===== Hero (compact) =====
          Compressed from the original ~700px to ~260px so the meat of the
          proposal (services + pricing) is one short scroll away. Logo sits
          inline next to the client name; verbose subtitle removed (the new
          help modal covers that ground for first-time visitors). */}
      <section
        style={{
          padding: isCompact ? '16px 16px 8px' : '24px 24px 12px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          {clientLogoUrl ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#fff',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.06)',
                maxWidth: 220,
                height: 64,
                flexShrink: 0,
              }}
            >
              <img
                src={clientLogoUrl}
                alt={`${clientName} logo`}
                style={{
                  maxWidth: '100%',
                  maxHeight: 44,
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
                width: 56,
                height: 56,
                borderRadius: 12,
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 26,
                color: T.navy,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 4 }}>
              Prepared for · {proposalLabel}
              {contactFirst && ` · ${contactFirst}`}
            </Eyebrow>
            <h1
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                // Scale h1 from 38px desktop → 28px compact phones so it
                // doesn't wrap to four lines on the smallest devices.
                fontSize: isCompact ? 26 : isMobile ? 30 : 38,
                lineHeight: 1.12,
                letterSpacing: '-0.025em',
                color: T.navy,
                margin: 0,
              }}
            >
              {displayData?.heroTitle || `${clientName} wellness proposal`}
            </h1>
          </div>
        </div>

        {/* Hero subtitle — short, dynamic. Pulls from displayData.eventDates +
            location count so it stays current with the proposal contents.
            Matches the V2 design reference copy. */}
        {(() => {
          // Word form for small counts ("Two offices") feels more like real
          // copy than "2 offices". Fall back to digits at 10+.
          const NUM_WORDS = [
            'Zero',
            'One',
            'Two',
            'Three',
            'Four',
            'Five',
            'Six',
            'Seven',
            'Eight',
            'Nine',
          ];
          const officeWord =
            stats.locationCount < NUM_WORDS.length
              ? `${NUM_WORDS[stats.locationCount]} office${
                  stats.locationCount === 1 ? '' : 's'
                }`
              : `${stats.locationCount} offices`;
          const dates = (displayData?.eventDates || []).filter(
            (d: string) => d && d !== 'TBD' && !d.startsWith('TBD')
          );
          let dateRange = '';
          if (dates.length > 0) {
            try {
              const sorted = [...dates].sort();
              const first = new Date(sorted[0]);
              const last = new Date(sorted[sorted.length - 1]);
              dateRange = formatDateRange(first, last);
            } catch {
              dateRange = '';
            }
          }
          const optionVerb = proposalOptions.length > 1 ? 'Pick an option below, ' : '';
          return (
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 15,
                lineHeight: 1.55,
                color: T.fgMuted,
                margin: '12px 0 24px',
                maxWidth: 720,
              }}
            >
              {officeWord}
              {dateRange ? `, ${dateRange}` : ''}. {optionVerb}toggle services on or off,
              and approve when you're ready.
            </p>
          );
        })()}

        {/* Hero mini-stats grid removed — the lifted Pricing summary card
            below carries the same numbers (services, dates, total) and the
            dark sidebar Live Total card keeps it sticky for scroll. */}
      </section>

      {/* ===== 2-col body grid ===== */}
      <section
        style={{
          padding: isCompact ? '16px 16px 80px' : '24px 24px 96px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          // Mobile/tablet: drop to a single column so the sidebar stacks
          // below the main column. The Live Total + change-status banner
          // ride along for the scroll on phones.
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 340px',
          gap: isMobile ? 20 : 32,
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

          {/* Banner — proposal approved. Pinned high so it's the first thing
              clients see when they come back to a locked-in proposal. The
              StatusPill in the sticky header carries the same signal; this
              card makes it impossible to miss. */}
          {isApproved && (
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(30,158,106,.16), rgba(30,158,106,.06))',
                border: '1px solid rgba(30,158,106,.30)',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: T.success,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={22} color="#fff" strokeWidth={2.5} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Eyebrow color={T.success}>Approved</Eyebrow>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 800,
                    fontSize: 20,
                    color: T.navy,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                    marginTop: 4,
                  }}
                >
                  This proposal is locked in
                  {contactFirst ? `, ${contactFirst}` : ''}.
                </div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.fgMuted,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  We're scheduling next steps — check back here anytime for the
                  full details. Need to change something? Reach out to your
                  account team.
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  flexShrink: 0,
                  paddingLeft: 16,
                  borderLeft: '1px solid rgba(30,158,106,.25)',
                }}
              >
                <Eyebrow>Total committed</Eyebrow>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 800,
                    fontSize: 26,
                    color: T.coral,
                    letterSpacing: '-0.02em',
                    marginTop: 4,
                  }}
                >
                  {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>
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
              action={<Eyebrow>Toggle, repeat, or expand any row</Eyebrow>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(displayData.services || {}).map(
                ([loc, byDate]: [string, any]) => {
                  const officeAddress = resolveOfficeAddress(loc);
                  // Roll up per-location stats for the CollapseHead right-rail
                  // (date count · included appts · location subtotal). Pulls
                  // from the selection state so the numbers track client
                  // toggles in real time.
                  let locAppts = 0;
                  let locCost = 0;
                  let locUnlimited = false;
                  Object.entries(byDate || {}).forEach(
                    ([d, dd]: [string, any]) => {
                      (dd?.services || []).forEach((svc: any, idx: number) => {
                        const k = selectionKey(loc, d, idx);
                        const s = get(k);
                        if (!s.included) return;
                        const a = svc?.totalAppointments;
                        if (a === 'unlimited' || a === '∞') {
                          locUnlimited = true;
                        } else {
                          locAppts += (Number(a) || 0) * (s.frequency || 1);
                        }
                        locCost +=
                          (Number(svc?.serviceCost) || 0) * (s.frequency || 1);
                      });
                    }
                  );
                  const dateCount = Object.keys(byDate || {}).length;
                  return (
                  <div key={loc}>
                    {/* Location header — uses the V2 CollapseHead primitive
                        (aqua-tile chevron + clickable row). Right side shows
                        per-location stats. Default-open; chevron rotates when
                        closed. */}
                    <div style={{ marginBottom: 14 }}>
                      <CollapseHead
                        open={!collapsed[loc]}
                        onClick={() => toggleCollapsed(loc)}
                        left={
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 2,
                              }}
                            >
                              <MapPin size={14} color={T.fgMuted} />
                              <Eyebrow>Location</Eyebrow>
                            </div>
                            <CardHeading size="item">{loc}</CardHeading>
                            {officeAddress && (
                              <div
                                style={{
                                  fontFamily: T.fontD,
                                  fontSize: 13,
                                  color: T.fgMuted,
                                  marginTop: 4,
                                  lineHeight: 1.4,
                                }}
                              >
                                {officeAddress}
                              </div>
                            )}
                          </div>
                        }
                        right={
                          <>
                            <span
                              style={{
                                fontFamily: T.fontUi,
                                fontSize: 12,
                                color: T.fgMuted,
                              }}
                            >
                              {dateCount} date{dateCount === 1 ? '' : 's'}
                            </span>
                            <span
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.2)',
                              }}
                            />
                            <span
                              style={{
                                fontFamily: T.fontUi,
                                fontSize: 12,
                                color: T.fgMuted,
                              }}
                            >
                              {locUnlimited ? '∞' : locAppts.toLocaleString('en-US')} appts
                            </span>
                            <span
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.2)',
                              }}
                            />
                            <span
                              style={{
                                fontFamily: T.fontD,
                                fontWeight: 700,
                                fontSize: 14,
                                color: T.navy,
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {formatCurrency(locCost)}
                            </span>
                          </>
                        }
                      />
                    </div>

                    <div
                      style={{
                        display: collapsed[loc] ? 'none' : 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
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
                                        onSelectPricingOption={(optIdx) => {
                                          if (isClientEditing) {
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
                                            );
                                          } else {
                                            handleSelectPricingOption(loc, date, idx, optIdx);
                                          }
                                        }}
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

          {/* Pricing summary card — lifted above Why Shortcut so the bottom-
              line lands within the first scroll. Same dark-navy treatment as
              before; the Approve CTA still anchors the page bottom. */}
          <div
            style={{
              background: T.navy,
              color: '#fff',
              borderRadius: 24,
              padding: isCompact ? '24px 22px' : isMobile ? '28px 28px' : '36px 40px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            {/* Heading row — design has the title on the left + an
                "N of total included" eyebrow on the right. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 22,
              }}
            >
              <CardHeading
                size="section"
                style={{ color: '#fff', fontSize: 28 }}
              >
                Pricing summary
              </CardHeading>
              <Eyebrow color="rgba(255,255,255,0.55)">
                {summary.rows.filter((r) => r.included).length} of {summary.rows.length} included
              </Eyebrow>
            </div>

            {/* Line items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
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
                        fontSize: 15,
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
                        fontSize: 12,
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
                      fontSize: 15,
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
                          fontSize: 15,
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
                        fontSize: 15,
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
                marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 22,
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
                    fontSize: 48,
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
                marginTop: 12,
                marginBottom: 0,
              }}
            >
              Invoice issued before each event. Payment due 48 hours prior to the first scheduled event.
              Cancellation: 72+ hrs notice = no charge. See the service agreement below for full terms.
            </p>
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



          {/* Approve CTA — pre-approval is the call-to-action; post-approval
              the same card flips to a success state with the option to fill
              the event-details survey. Keeps the page consistent so clients
              who come back later see the bottom-line + status, not a
              suddenly-empty section. */}
          {isApproved ? (
            <div
              style={{
                background: '#fff',
                border: `2px solid ${T.success}`,
                borderRadius: 24,
                padding: '32px 36px',
                boxShadow: '0 8px 32px rgba(30,158,106,0.14)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'rgba(30,158,106,.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={24} color={T.success} strokeWidth={2.5} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Eyebrow color={T.success}>You're all set</Eyebrow>
                  <div
                    style={{
                      fontFamily: T.fontD,
                      fontWeight: 800,
                      fontSize: 24,
                      color: T.navy,
                      letterSpacing: '-0.015em',
                      lineHeight: 1.2,
                      marginTop: 2,
                    }}
                  >
                    Proposal approved · {formatCurrency(grandTotal)}
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: T.fgMuted,
                  lineHeight: 1.55,
                  margin: '0 0 18px',
                  maxWidth: 560,
                }}
              >
                Your account team has the green light. Need to tweak something?
                Use Request changes below and we'll get back to you — your
                selections stay saved either way.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {!hasSurveyResponse && (
                  <a
                    href="#proposal-survey-form"
                    style={{
                      padding: '11px 20px',
                      background: T.coral,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
                    }}
                  >
                    <Sparkles size={14} />
                    Fill the event-day form
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setRequestChangesOpen(true)}
                  style={{
                    padding: '11px 20px',
                    background: '#fff',
                    color: T.navy,
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Request changes
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#fff',
                border: `2px solid ${T.coral}`,
                borderRadius: 24,
                padding: isCompact ? '28px 22px' : isMobile ? '32px 28px' : '40px 44px',
                boxShadow: '0 8px 32px rgba(255,80,80,0.16)',
              }}
            >
              <Eyebrow color={T.coral}>Final step</Eyebrow>
              <h2
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 700,
                  fontSize: isCompact ? 22 : isMobile ? 26 : 30,
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
          )}

          {/* Post-approval event-details survey — anchor target for the
              "Fill the event-day form" link above. Only renders for approved
              proposals that haven't been surveyed yet. */}
          {isApproved && !hasSurveyResponse && id && (
            <div
              id="proposal-survey-form"
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 20,
                padding: '28px 32px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <Sparkles size={20} color={T.coral} />
                <CardHeading size="card" style={{ margin: 0 }}>
                  Quick event-details form
                </CardHeading>
              </div>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: T.fgMuted,
                  lineHeight: 1.55,
                  margin: '0 0 18px',
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
        </main>

        {/* --- Sidebar --- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Compact change-request notice — lives in the sidebar so it
              doesn't eat hero space. Tracks `requestSent` (just submitted
              this session) or `proposal.has_changes` (persisted). */}
          {(requestSent || proposal?.has_changes) && !isApproved && !showingOriginal && (
            <div
              style={{
                background: 'rgba(255,80,80,0.08)',
                border: '1px solid rgba(255,80,80,0.25)',
                borderRadius: 12,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: T.coral,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 12,
                    color: T.navy,
                    lineHeight: 1.3,
                  }}
                >
                  Changes sent
                </div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 11,
                    color: T.fgMuted,
                    lineHeight: 1.4,
                  }}
                >
                  Your account team will follow up shortly.
                </div>
              </div>
            </div>
          )}

          {/* Live Total card — desktop only.
              On desktop this is sticky so price + Approve stay visible
              as the user scrolls. On mobile the sidebar stacks below the
              main column, so this card lands directly under the white
              Approve CTA and renders a duplicate Approve button. The
              bottom Approve CTA already shows the locked-in total and
              serves the conversion role, so we skip this entirely on
              mobile. */}
          {!isMobile && (
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
            <Eyebrow color="rgba(255,255,255,0.6)">Proposal total</Eyebrow>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: isCompact ? 36 : 44,
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

            {isApproved ? (
              <div
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(30,158,106,.18)',
                  color: '#9FE9C4',
                  border: '1.5px solid rgba(30,158,106,.40)',
                  borderRadius: 10,
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <CheckCircle2 size={15} strokeWidth={2.5} />
                Approved
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setApproveConfirmOpen(true)}
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
            )}
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
              {isApproved
                ? 'Approved — selections are locked.'
                : 'Selections auto-save as you toggle.'}
            </div>
          </div>
          )}

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
