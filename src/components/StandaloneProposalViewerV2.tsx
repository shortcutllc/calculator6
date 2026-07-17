import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, X, Download, History as HistoryIcon, HelpCircle, MapPin, Calendar, Users, Check, Play, FileText, Image as ImageIcon, Sparkles, CheckCircle2, MoreHorizontal, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { generatePDF } from '../utils/pdf';
import { parseLocalDate } from '../utils/dateHelpers';
import {
  calculateServiceResults,
  recalculateServiceTotals,
} from '../utils/proposalGenerator';
import ProposalSurveyForm from './ProposalSurveyForm';
import ServiceCard from './proposal/ServiceCard';
import ServiceCardRefresh from './proposal/ServiceCardRefresh';
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
import { useProposalGallery, type GalleryItem } from './proposal/useProposalGallery';
import ProposalGallery, { type GalleryPhoto } from './proposal/ProposalGallery';
import { formatCurrency, SERVICE_DISPLAY, SERVICE_IMAGE_PATH } from './proposal/data';
import { isMovementServiceType } from '../utils/movementCatalog';
import AccountTeamCard from './proposal/sidebar/AccountTeamCard';
import WhatsNextCard from './proposal/sidebar/WhatsNextCard';
import TrustCard from './proposal/sidebar/TrustCard';
import FaqCard from './proposal/sidebar/FaqCard';
import GalleryCard from './proposal/sidebar/GalleryCard';
import MobileSignupModule from './proposal/MobileSignupModule';
import OptionsTabs, { ProposalOption } from './proposal/OptionsTabs';
import EventDaySummaryCard from './proposal/EventDaySummaryCard';
import DayByDayCards from './proposal/DayByDayCards';
import DaySummaryBox from './proposal/DaySummaryBox';
import ServiceAgreementCard from './proposal/ServiceAgreementCard';
import RequestChangesModal from './proposal/RequestChangesModal';
import ApproveConfirmModal from './proposal/ApproveConfirmModal';
import HelpModal from './proposal/HelpModal';
import '../styles/proposal-refresh.css';
import '../styles/proposal-refresh-mobile.css';
import MobileServiceCard from './proposal/mobile/MobileServiceCard';
import MobileDayByDay from './proposal/mobile/MobileDayByDay';
import ServiceAgreement from './ServiceAgreement';
import { resolveTeamMember } from './proposal/sidebar/AccountTeamCard';
import {
  UNIFIED_WHY_SHORTCUT,
  CLE_WHY_SHORTCUT,
  SERVICE_CONTENT as SERVICE_CONTENT_MAP,
  FACILITATOR_KIRSTEN,
} from './proposal/sections/serviceContent';
import WhyShortcutSection from './proposal/sections/WhyShortcutSection';
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
// Gallery media can be a video (.mp4/.mov uploads) as well as a still. An <img>
// can't play those, so detect by extension and render a <video> instead.
const isVideoSrc = (src?: string): boolean =>
  !!src && /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(src);

// Hero preview videos tease the first few seconds on a loop; the lightbox plays
// the full clip with controls.
const HERO_PREVIEW_SECONDS = 5;
const loopHeroPreview = (e: React.SyntheticEvent<HTMLVideoElement>) => {
  const v = e.currentTarget;
  if (v.currentTime >= HERO_PREVIEW_SECONDS) v.currentTime = 0;
};

// Photo strips stay image-only: a video contributes its poster frame, and a
// poster-less video is skipped (there's no still to show). The hero mosaic and
// lightbox take the items directly so they can play the video instead.
const toStripImages = (items?: GalleryItem[]): string[] =>
  (items || [])
    .filter((it) => it.type === 'image' || it.poster)
    .map((it) => (it.type === 'video' ? (it.poster as string) : it.url));

// Event dates are date-only keys ("2026-07-24"). Parsing those with `new Date`
// treats them as UTC midnight, which renders as the previous day for any client
// west of UTC — a Jul 24 event would read "Jul 23" to the prospect. parseLocalDate
// builds the date in the local zone so the label matches the booked day.
const formatDateLabel = (raw: string): string => {
  if (!raw || raw === 'TBD') return 'Date TBD';
  try {
    const parsed = parseLocalDate(raw);
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

// Header overflow-menu row. Icon + label, full-width hover target. Kept local
// to the viewer since it's the only surface that uses the ⋯ menu.
const HeaderMenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 12px',
        background: hover && !disabled ? T.lightGray : 'transparent',
        border: 'none',
        borderRadius: 8,
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 13,
        color: T.navy,
        textAlign: 'left',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ display: 'inline-flex', color: T.fgMuted, flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </button>
  );
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
  // Real per-service gallery photos (proposal_gallery, grouped by service_type)
  // for each ServiceCard's photo strip.
  const galleryByService = useProposalGallery();
  const [isApproving, setIsApproving] = useState(false);
  const [postApproval, setPostApproval] = useState(false);
  const [requestChangesOpen, setRequestChangesOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showingOriginal, setShowingOriginal] = useState(false);

  // ---- Mobile (≤767px) shell state — Airbnb-model viewer ------------------
  // Declared above the loading/not-found early returns to keep the hook count
  // stable. Drives the pricing bottom-sheet, the demo expand, the agreement
  // modal, the FAQ accordion, and the shared photo lightbox.
  const [mSheetOpen, setMSheetOpen] = useState(false);
  const [mDemoOpen, setMDemoOpen] = useState(false);
  const [mAgreeOpen, setMAgreeOpen] = useState(false);
  const [mFaqOpen, setMFaqOpen] = useState<number | null>(0);
  const [mLightbox, setMLightbox] = useState<{ images: string[]; caps?: string[]; index: number } | null>(null);

  // ---- Right-column dock (design refresh) --------------------------------
  // The navy pricing card sticks (top:88) while the user scrolls the service
  // cards, then RELEASES at the bottom of the day-by-day breakdown. A dock
  // wrapper is sized to that distance so position:sticky lets go there rather
  // than floating over the cards below. A "see the demo" pill rides under the
  // docked card and collapses once the demo scrolls into view. Desktop only.
  // (Declared here, above the loading/not-found early returns, so the hook
  // count is stable across renders.)
  const asideRef = useRef<HTMLElement>(null);
  const dockReleaseRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const [dockHeight, setDockHeight] = useState<number | undefined>(undefined);
  const [demoRevealed, setDemoRevealed] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setDockHeight(undefined);
      return;
    }
    let raf = 0;
    const compute = () => {
      const aside = asideRef.current;
      const rel = dockReleaseRef.current;
      if (aside && rel) {
        const top = aside.getBoundingClientRect().top + window.scrollY;
        const bottom = rel.getBoundingClientRect().bottom + window.scrollY;
        setDockHeight(Math.max(0, Math.round(bottom - top)));
      }
      // Bidirectional pill ↔ demo (mirrors the design's updateReveal): reveal
      // the demo + collapse the pill once the demo scrolls into view; restore
      // the pill + hide the demo when scrolled back up. 0.72 viewport trigger.
      const demo = demoRef.current;
      if (demo) {
        setDemoRevealed(
          demo.getBoundingClientRect().top < window.innerHeight * 0.72
        );
      }
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };
    compute();
    // The release marker's position only settles after the service cards +
    // images lay out, and shifts as cards expand. Recompute on scroll, resize,
    // any document growth, and once after async content lands.
    const ro = new ResizeObserver(schedule);
    ro.observe(document.documentElement);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    const settle = setTimeout(compute, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      clearTimeout(settle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile, loading]);

  // On mobile the sidebar stacks below; the demo is always shown (no dock/pill).
  useEffect(() => {
    if (isMobile) setDemoRevealed(true);
  }, [isMobile]);

  // Close the header overflow menu on outside-click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
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
  //
  // Defensive recalc: we pipe whatever data we picked through
  // `recalculateServiceTotals` on every render. The persisted JSON can be
  // stale — proposals saved before discount-propagation was fixed have
  // options with `serviceCost` that don't reflect the current service-level
  // discount, and `autoRecurringSavings` that doesn't reflect the selected
  // option. Recalc is deterministic and cheap, so we always re-derive in
  // memory before showing the client. Stored data is only mutated on an
  // explicit user action.
  const liveData = proposal?.data;
  const originalData = proposal?.original_data;
  const rawDisplayData =
    isClientEditing && clientEditedData
      ? clientEditedData
      : showingOriginal && originalData
      ? originalData
      : liveData;
  const displayData = useMemo(() => {
    if (!rawDisplayData) return rawDisplayData;
    try {
      // Splice the top-level proposal.customization column INTO the rendered
      // data so customNote (and contactFirstName / etc) appear in the viewer.
      // Customization lives in two places historically:
      //   - proposal.customization (top-level jsonb column, where Pro + the
      //     proposal calculator both write it)
      //   - proposal.data.customization (legacy in-jsonb fallback)
      // Prefer the top-level when present so admin edits + Pro writes are
      // both honored. Falls back to in-data when older proposals don't have
      // the top-level column populated.
      const cloned = JSON.parse(JSON.stringify(rawDisplayData));
      const topLevelCust = (proposal as { customization?: unknown } | null)?.customization;
      if (topLevelCust && typeof topLevelCust === 'object') {
        cloned.customization = { ...(cloned.customization || {}), ...topLevelCust };
      }
      return recalculateServiceTotals(cloned);
    } catch (err) {
      // Don't crash the viewer if recalc throws on malformed data.
      console.warn('[StandaloneProposalViewerV2] recalc failed, using raw:', err);
      return rawDisplayData;
    }
  }, [rawDisplayData, proposal]);
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
  const { get, setIncluded, setFrequency, summary, state: selectionState } = useServiceSelections({
    servicesByLocation: displayData?.services || {},
    initialState: displayData?.optionsState,
    onChange: persistOptionsState,
    readOnly: isApproved,
    // When the admin set "let the client build it" on this proposal, every
    // service starts unchecked so the price reflects only what the client
    // opts into. Persisted state still wins on subsequent loads.
    startUnselected: displayData?.startUnselected === true,
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

  // Massage formats actually selected across the proposal ('chair' / 'table') —
  // feeds the survey's proposal-aware table/chair question.
  const massageFormats = useMemo(() => {
    const set = new Set<'chair' | 'table'>();
    Object.values(displayData?.services || {}).forEach((byDate: any) => {
      Object.values(byDate || {}).forEach((dd: any) => {
        (dd?.services || []).forEach((s: any) => {
          if (s?.serviceType === 'massage') {
            set.add(s?.massageType === 'table' ? 'table' : 'chair');
          }
        });
      });
    });
    return Array.from(set);
  }, [displayData]);

  const isMindfulnessLike = (s: string) => s === 'mindfulness' || s.startsWith('mindfulness-');
  // Pricing-summary line label: append the unit so each row reads
  // "Massage event" / "Nails event". Session-based services (mindfulness,
  // yoga, sound bath) use "session" instead of "event".
  const serviceLineLabel = (s: string) => {
    const name = SERVICE_DISPLAY[s] || s;
    const isSession =
      isMindfulnessLike(s) || s === 'yoga' || s === 'sound-bath' || isMovementServiceType(s);
    return `${name} ${isSession ? 'session' : 'event'}`;
  };
  const isMindfulnessOnly =
    serviceTypes.length > 0 && serviceTypes.every(isMindfulnessLike);
  // Kirsten leads the 2026 movement & sound services (reiki + group classes).
  const isKirstenService = (s: string) => s === 'reiki' || isMovementServiceType(s);
  const isKirstenOnly =
    serviceTypes.length > 0 && serviceTypes.every(isKirstenService);

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

  // Selection-aware appointment count for the intro meta-row. Unlike
  // `stats.appointmentCount` (which sums every service regardless of state),
  // this counts only services the client has currently included, so the
  // number tracks their toggles in real time. When nothing is included yet
  // the meta-row hides the appointment pill entirely (count 0, no unlimited).
  const includedAppointments = useMemo(() => {
    let count = 0;
    let hasUnlimited = false;
    Object.entries(displayData?.services || {}).forEach(
      ([loc, byDate]: [string, any]) => {
        Object.entries(byDate || {}).forEach(([date, dd]: [string, any]) => {
          (dd?.services || []).forEach((svc: any, idx: number) => {
            const sel = selectionState[selectionKey(loc, date, idx)];
            // Undefined state defaults to included (matches the hook DEFAULT).
            if (sel && !sel.included) return;
            const a = svc?.totalAppointments;
            if (a === 'unlimited' || a === '∞') hasUnlimited = true;
            else count += Number(a) || 0;
          });
        });
      }
    );
    return { count, hasUnlimited };
  }, [displayData, selectionState]);

  // Date-range label for the intro meta-row (reference `.pv-meta-row`):
  // earliest–latest event date across the proposal, or null if unparseable.
  const proposalDateLabel = useMemo(() => {
    const dates: string[] = [];
    Object.values(displayData?.services || {}).forEach((byDate: any) =>
      Object.keys(byDate || {}).forEach((d) => dates.push(d))
    );
    const parsed = dates
      .map((d) => ({ raw: d, t: new Date(d).getTime() }))
      .filter((x) => !isNaN(x.t))
      .sort((a, b) => a.t - b.t);
    if (!parsed.length) return null;
    const a = formatDateLabel(parsed[0].raw);
    const b = formatDateLabel(parsed[parsed.length - 1].raw);
    return a === b ? a : `${a} – ${b}`;
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
  // Per-event total for the sidebar — frequency never moves this; only the
  // bottom Pricing summary annualizes. No volume discount (it's annual).
  const perEventGrandTotal =
    summary.perEventTotal + customItemsTotal + (gratuity?.amount || 0);

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
      // Best-effort Slack notification — reuses the existing function.
      // keepalive lets the request finish even if the client closes/navigates
      // right after approving (the likely reason approve pings were getting
      // dropped while view/changes pings, sent while the client lingers, land).
      try {
        await fetch('/.netlify/functions/proposal-event-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
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
      // Run a full recalc on the proposal data — this re-derives every
      // option's serviceCost against the current service.discountPercent,
      // mirrors the new selected option's price onto the service, AND
      // refreshes auto-recurring savings against the new total. Without
      // this, the displayed dollar discount stays frozen at whatever was
      // computed at proposal-creation time and doesn't change when the
      // client clicks between options.
      const recalculated = recalculateServiceTotals(next);
      setProposal((p: any) => ({ ...p, data: recalculated }));
      const key = `${loc}-${date}-${idx}`;
      const so = { ...(proposal.selected_options || {}), [key]: optIdx };
      try {
        await supabase
          .from('proposals')
          .update({ data: recalculated, selected_options: so })
          .eq('id', id);
      } catch (err) {
        console.error('Persist selectedOption failed:', err);
      }
    },
    [id, proposal, isApproved]
  );

  // Client-facing massage format pick (chair / table). This only swaps the
  // format label + description copy — it deliberately does NOT change
  // appointment length, count, or pricing (those stay exactly as the admin
  // built them). So we just set massageType and persist; no recalc.
  const handleChangeMassageType = useCallback(
    async (loc: string, date: string, idx: number, type: 'chair' | 'table') => {
      if (!id || isApproved || !proposal?.data) return;
      const next = JSON.parse(JSON.stringify(proposal.data));
      const svc = next.services?.[loc]?.[date]?.services?.[idx];
      if (!svc) return;
      svc.massageType = type;
      setProposal((p: any) => ({ ...p, data: next }));
      try {
        await supabase.from('proposals').update({ data: next }).eq('id', id);
      } catch (err) {
        console.error('Persist massageType failed:', err);
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

  // ---- Auto-scroll to the pre-event survey on the approval transition ------
  // When the client approves (isApproved flips false→true) and we don't yet
  // have a survey response, smooth-scroll to the survey so they're guided
  // straight into completing it. Fires once per transition, desktop + mobile
  // (targets the shared #proposal-survey-form anchor).
  const prevApprovedRef = useRef(false);
  useEffect(() => {
    if (isApproved && !prevApprovedRef.current && !hasSurveyResponse) {
      const t = setTimeout(() => {
        document
          .getElementById('proposal-survey-form')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 450);
      prevApprovedRef.current = isApproved;
      return () => clearTimeout(t);
    }
    prevApprovedRef.current = isApproved;
  }, [isApproved, hasSurveyResponse]);

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


  // ======================================================================
  //  MOBILE (≤767px) — "Airbnb listing" rendering (Proposal V2 Mobile)
  //  A distinct presentation over the SAME selection/pricing/approval state
  //  as desktop. Activated for true phones only (isCompact); tablets keep the
  //  reflowed desktop layout below.
  // ======================================================================
  if (isCompact && proposal) {
    // Hero + lightbox photos: prefer gallery-admin 'hero' photos, else this
    // proposal's per-service photos (mirrors the desktop top mosaic).
    const baseType = (s: string) => s.replace(/s$/, '').split('-')[0];
    const heroTagged = (galleryByService['hero'] || []).map((it) => ({
      src: it.url,
      cap: clientName,
    }));
    const wantedTypes = new Set(serviceTypes.map(baseType));
    const dbPerService =
      heroTagged.length > 0
        ? heroTagged
        : Object.entries(galleryByService)
            .filter(([t]) => t !== 'hero' && wantedTypes.has(baseType(t)))
            .flatMap(([t, items]) =>
              (items || []).map((it) => ({
                src: it.url,
                cap: SERVICE_DISPLAY[t] || t,
              }))
            );
    // Cover-photo fallback for services with no DB media (mirrors the desktop
    // mosaic), so newly-added services still show their service image.
    const mStaticPhotos =
      heroTagged.length > 0
        ? []
        : serviceTypes.flatMap((st) => {
            const hasDb = Object.keys(galleryByService).some(
              (t) => t !== 'hero' && baseType(t) === baseType(st)
            );
            if (hasDb) return [];
            const cover = SERVICE_IMAGE_PATH[st];
            return cover ? [{ src: cover, cap: SERVICE_DISPLAY[st] || st }] : [];
          });
    const mPhotos = [...dbPerService, ...mStaticPhotos];
    const heroSrc =
      mPhotos[0]?.src ||
      SERVICE_IMAGE_PATH[serviceTypes[0]] ||
      '/proposal-refresh/massage-office.png';
    const openLightbox = (images: string[], start = 0, caps?: string[]) =>
      setMLightbox(images.length ? { images, caps, index: start } : null);
    const lbStep = (d: number) =>
      setMLightbox((s) =>
        s
          ? { ...s, index: (s.index + d + s.images.length) % s.images.length }
          : s
      );

    // Roll up included appointments / service count + dates / location.
    let mApptTotal = 0;
    let mUnlimited = false;
    const mTypeSet = new Set<string>();
    const allDates: string[] = [];
    Object.entries(displayData.services || {}).forEach(([loc, byDate]: [string, any]) => {
      Object.entries(byDate || {}).forEach(([date, dd]: [string, any]) => {
        allDates.push(date);
        (dd?.services || []).forEach((svc: any, idx: number) => {
          if (!get(selectionKey(loc, date, idx)).included) return;
          mTypeSet.add(svc.serviceType);
          const a = svc?.totalAppointments;
          if (a === 'unlimited' || a === '∞') mUnlimited = true;
          else mApptTotal += Number(a) || 0;
        });
      });
    });
    const mServiceCount = mTypeSet.size;
    const mLocations = Object.keys(displayData.services || {});
    const mMultiLoc = mLocations.length > 1;
    const parsedDates = allDates
      .map((d) => ({ raw: d, t: new Date(d).getTime() }))
      .filter((x) => !isNaN(x.t))
      .sort((a, b) => a.t - b.t);
    let mDateLabel = 'Dates to be confirmed';
    if (parsedDates.length) {
      const a = formatDateLabel(parsedDates[0].raw);
      const b = formatDateLabel(parsedDates[parsedDates.length - 1].raw);
      mDateLabel = a === b ? a : `${a} – ${b}`;
    }
    const mAddress = resolveOfficeAddress(mLocations[0]) || mLocations[0] || '';

    // Why-Shortcut variant (mirrors WhyShortcutSection's resolution).
    const isCleProposal = serviceTypes.some((t) => t.startsWith('mindfulness-cle'));
    const whyBullets = isCleProposal
      ? CLE_WHY_SHORTCUT
      : serviceTypes.length === 1 && SERVICE_CONTENT_MAP[serviceTypes[0]]
      ? SERVICE_CONTENT_MAP[serviceTypes[0]].whyShortcut
      : UNIFIED_WHY_SHORTCUT;

    const team = resolveTeamMember(displayData?.accountTeamMemberEmail);
    const includedRows = summary.rows.filter((r: any) => r.included);
    const MOBILE_LOGOS = [
      'DraftKings',
      'NFL',
      'Paramount',
      'Warner Bros',
      'PwC',
      'BCG',
    ].map((n) => `/Holiday Proposal/Parnter Logos/${n}.svg`);
    const MOBILE_FAQ = [
      {
        q: 'What happens if we need to cancel?',
        a: "With 72+ hours notice there's no penalty. From 48–72 hours out, a 25% service charge may apply. Under 24 hours, a 50% charge may apply — often waived if you reschedule.",
      },
      {
        q: 'When and how do we pay?',
        a: 'We invoice before each event. Payment is due 48 hours before the first scheduled event. Pay via ACH or card.',
      },
      {
        q: 'Are equipment and supplies included?',
        a: 'Yes. We bring all equipment, supplies, and fully insured pros. You provide the space.',
      },
    ];

    return (
      <div className="pv-root pvm-page" id="proposal-content">
        {/* HERO */}
        <div className="pvm-hero">
          {isVideoSrc(heroSrc) ? (
            <video
              src={heroSrc}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              onTimeUpdate={loopHeroPreview}
            />
          ) : (
            <img src={heroSrc} alt={clientName} />
          )}
          <div className="pvm-hero-chrome">
            <button
              className="pvm-circle"
              aria-label="Back"
              onClick={() => window.history.back()}
            >
              <ArrowLeft />
            </button>
            <span className="pvm-brand-pill">
              {clientLogoUrl ? (
                <img className="partner" src={clientLogoUrl} alt={clientName} />
              ) : (
                <span className="nm">{clientName}</span>
              )}
              <span className="div" />
              <span className="pw">with Shortcut</span>
            </span>
          </div>
          {mPhotos.length > 0 && (
            <button
              className="pvm-photocount"
              onClick={() =>
                openLightbox(
                  mPhotos.map((p) => p.src),
                  0,
                  mPhotos.map((p) => p.cap)
                )
              }
            >
              <ImageIcon /> 1 / {mPhotos.length}
            </button>
          )}
        </div>

        {/* SHEET */}
        <div className="pvm-sheet">
          <p className="pvm-eyebrow">
            Prepared for {clientName}
            {contactFirst ? ` · ${contactFirst}` : ''}
          </p>
          <h1 className="pvm-h1">
            {displayData?.heroTitle || 'Employee Happiness Delivered.'}
          </h1>
          <div className="pvm-meta">
            <span>
              <Calendar /> {mDateLabel}
            </span>
            {mAddress && (
              <span>
                <MapPin /> {mAddress}
              </span>
            )}
            {(mApptTotal > 0 || mUnlimited) && (
              <span>
                <Users /> {mUnlimited ? 'Unlimited' : mApptTotal.toLocaleString('en-US')}{' '}
                appointments across {mServiceCount} service
                {mServiceCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="pvm-savings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="m17 2 4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
            <span className="t">
              Sign up for more, save more. Commit to 4 events a year and{' '}
              <strong>save 15%</strong>, or go with 9 and <strong>save 20%</strong>.
            </span>
          </div>

          {/* Post-approval pre-event survey — prominent, auto-scrolled to on
              approval. Shares #proposal-survey-form so the scroll effect works. */}
          {isApproved && id && (
            <>
              <hr className="pvm-divider" />
              <div
                id="proposal-survey-form"
                style={{
                  border: hasSurveyResponse ? 'none' : '2px solid var(--sc-coral)',
                  borderRadius: 18,
                  padding: hasSurveyResponse ? 0 : 16,
                  boxShadow: hasSurveyResponse
                    ? 'none'
                    : '0 8px 24px rgba(255,80,80,0.14)',
                  scrollMarginTop: 16,
                }}
              >
                {!hasSurveyResponse && (
                  <>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,80,80,0.12)',
                    color: 'var(--sc-coral)',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    borderRadius: 9999,
                    padding: '5px 11px',
                  }}
                >
                  <Sparkles size={12} /> One last step
                </span>
                <h2 className="pvm-h2" style={{ marginTop: 10 }}>
                  Tell us your event details
                </h2>
                <p
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 13.5,
                    color: 'rgba(3,34,50,0.6)',
                    lineHeight: 1.5,
                    margin: '4px 0 14px',
                  }}
                >
                  You're approved. Now help us prep the day. It takes about 3
                  minutes, and our team can't finalize logistics without it.
                </p>
                  </>
                )}
                <ProposalSurveyForm
                  proposalId={id}
                  includesMassage={massageFormats.length > 0}
                  massageFormats={massageFormats}
                  serviceTypes={serviceTypes}
                  locations={Object.keys(displayData?.services || {})}
                  officeLocation={displayData?.officeLocation}
                  officeLocations={displayData?.officeLocations}
                  onSuccess={() => setHasSurveyResponse(true)}
                />
              </div>
            </>
          )}

          <hr className="pvm-divider" />

          {/* SERVICES */}
          <p className="pvm-label">Your services</p>
          {Object.entries(displayData.services || {}).map(
            ([loc, byDate]: [string, any]) => (
              <div key={loc}>
                {mMultiLoc && (
                  <div className="pvm-loc">
                    <MapPin /> {loc}
                  </div>
                )}
                {Object.entries(byDate || {}).flatMap(
                  ([date, dd]: [string, any]) =>
                    (dd?.services || []).map((service: any, idx: number) => {
                      const key = selectionKey(loc, date, idx);
                      const sel = get(key);
                      return (
                        <MobileServiceCard
                          key={key}
                          service={service}
                          included={sel.included}
                          frequency={sel.frequency}
                          onToggleInclude={(next) => setIncluded(key, next)}
                          onChangeFrequency={(next) => setFrequency(key, next)}
                          onChangeMassageType={(type) =>
                            handleChangeMassageType(loc, date, idx, type)
                          }
                          galleryImages={toStripImages(galleryByService[service.serviceType])}
                          autoRecurringDiscount={displayData?.autoRecurringDiscount}
                          onSelectPricingOption={(optIdx) =>
                            handleSelectPricingOption(loc, date, idx, optIdx)
                          }
                          onOpenLightbox={openLightbox}
                        />
                      );
                    })
                )}
              </div>
            )
          )}

          <hr className="pvm-divider" />

          {/* DAY BY DAY */}
          <p className="pvm-label">Day-by-day breakdown</p>
          <MobileDayByDay
            servicesByLocation={displayData.services || {}}
            isIncluded={(l, d, i) => get(selectionKey(l, d, i)).included}
          />

          <hr className="pvm-divider" />

          {/* DEMO */}
          <button
            className="pvm-demo"
            aria-expanded={mDemoOpen}
            onClick={() => setMDemoOpen((v) => !v)}
          >
            <span className="ic">
              <Play fill="currentColor" stroke="none" />
            </span>
            <span className="tx">
              See the sign-up demo
              <small>Watch how your team books in seconds</small>
            </span>
            <span className="chev">
              <ChevronRight />
            </span>
          </button>
          {mDemoOpen && (
            <div className="pvm-demo-panel">
              <MobileSignupModule
                url={displayData?.signupLink}
                title={displayData?.signupLinkTitle}
                description={displayData?.signupLinkDescription}
              />
            </div>
          )}

          <hr className="pvm-divider" />

          {/* WHY SHORTCUT */}
          <p className="pvm-label">Why Shortcut</p>
          <h2 className="pvm-h2">Wellness that works.</h2>
          <div className="pvm-why">
            {whyBullets.map((b, i) => (
              <div className="pvm-bullet" key={i}>
                <span className="bi" />
                <div>
                  <h5>{b.title}</h5>
                  <p>{b.description}</p>
                </div>
              </div>
            ))}
          </div>

          <hr className="pvm-divider" />

          {/* GETTING STARTED */}
          <p className="pvm-label">Getting started</p>
          <h2 className="pvm-h2">You approve. We handle the rest.</h2>
          <div style={{ marginTop: 8 }}>
            <div className="pvm-step">
              <span className="n">1</span>
              <div>
                <h5>Your sign-up link goes out</h5>
                <p>Employees book their own slots from any device, up to two weeks ahead.</p>
              </div>
            </div>
            <div className="pvm-step">
              <span className="n">2</span>
              <div>
                <h5>We promote it for you</h5>
                <p>Digital invites and on-site signage drive turnout.</p>
              </div>
            </div>
            <div className="pvm-step">
              <span className="n">3</span>
              <div>
                <h5>We run the day</h5>
                <p>Our pros, equipment, and signage arrive — you do nothing.</p>
              </div>
            </div>
          </div>

          <hr className="pvm-divider" />

          {/* ACCOUNT TEAM */}
          <p className="pvm-label">Your account team</p>
          <div className="pvm-team">
            <div className="av">{team.initial}</div>
            <div>
              <div className="nm">{team.name}</div>
              <div className="rl">{team.title}</div>
            </div>
          </div>
          {customNote && (
            <div className="pvm-note">
              <div className="nh">
                <Sparkles size={15} color="var(--sc-teal)" />
                <span
                  className="pvm-eyebrow"
                  style={{ margin: 0, color: 'var(--sc-teal)' }}
                >
                  A note from Shortcut
                </span>
              </div>
              <p>{customNote}</p>
            </div>
          )}

          <hr className="pvm-divider" />

          {/* TRUST */}
          <p className="pvm-label">Trusted by 500+ companies</p>
          <div className="pvm-stat">
            <span className="big">87%</span>
            <span className="lbl">rebook with Shortcut</span>
          </div>
          <div className="pvm-logos">
            {MOBILE_LOGOS.map((src) => (
              <div className="pvm-logo" key={src}>
                <img src={src} alt="" />
              </div>
            ))}
          </div>

          <hr className="pvm-divider" />

          {/* FAQ */}
          <p className="pvm-label">Common questions</p>
          <div className="pvm-faq">
            {MOBILE_FAQ.map((item, i) => (
              <div
                className={'pvm-faq-item' + (mFaqOpen === i ? ' open' : '')}
                key={i}
              >
                <div
                  className="pvm-faq-q"
                  onClick={() => setMFaqOpen(mFaqOpen === i ? null : i)}
                >
                  {item.q}
                  <ChevronDown />
                </div>
                <div className="pvm-faq-a">{item.a}</div>
              </div>
            ))}
          </div>

          <hr className="pvm-divider" />

          {/* SERVICE AGREEMENT */}
          <button className="pvm-agree" onClick={() => setMAgreeOpen(true)}>
            <div className="ic">
              <FileText />
            </div>
            <div>
              <h5>Service agreement</h5>
              <p>Payment, cancellation, on-site logistics</p>
            </div>
            <span className="chev">
              <ChevronRight />
            </span>
          </button>

          <div className="pvm-footer">
            <p style={{ marginBottom: 8 }}>proposals.getshortcut.co</p>
            <button onClick={handleDownloadPdf}>
              <Download /> Download PDF
            </button>
          </div>
        </div>

        {/* STICKY BOTTOM CTA */}
        <div className="pvm-cta-bar">
          <button className="pvm-cta-total" onClick={() => setMSheetOpen((v) => !v)}>
            <span className="v">
              {formatCurrency(grandTotal)}
              {mSheetOpen ? <ChevronDown /> : <ChevronDown style={{ transform: 'rotate(180deg)' }} />}
            </span>
            <span className="k">
              {mServiceCount} service{mServiceCount === 1 ? '' : 's'} · view breakdown
            </span>
          </button>
          {isApproved ? (
            <span className="pvm-approved-pill">
              <Check /> Approved
            </span>
          ) : (
            <button
              className="pvm-approve"
              onClick={() => setApproveConfirmOpen(true)}
            >
              <Check /> Approve
            </button>
          )}
        </div>

        {/* PRICING SHEET */}
        <div
          className={'pvm-scrim' + (mSheetOpen ? ' open' : '')}
          onClick={() => setMSheetOpen(false)}
        />
        <div className={'pvm-pricesheet' + (mSheetOpen ? ' open' : '')}>
          <div className="pvm-grab" />
          <h3>Pricing summary</h3>
          {includedRows.map((row: any) => (
            <div className="pvm-pl" key={row.key}>
              <span className="k">
                {serviceLineLabel(row.serviceType)}
                {row.frequency > 1 ? ` · ×${row.frequency}/yr` : ''}{' '}
                <small>· {row.location}</small>
              </span>
              <span className="v">{formatCurrency(row.lineCost)}</span>
            </div>
          ))}
          {customLineItems
            .filter((it: any) => (Number(it.amount) || 0) > 0 || it.name)
            .map((it: any, i: number) => (
              <div className="pvm-pl" key={it.id || `c-${i}`}>
                <span className="k">{it.name || 'Custom item'}</span>
                <span className="v">{formatCurrency(Number(it.amount) || 0)}</span>
              </div>
            ))}
          <div className="pvm-pl-div" />
          <div className="pvm-pl">
            <span className="k">Subtotal</span>
            <span className="v">
              {formatCurrency(summary.originalSubtotal + customItemsTotal)}
            </span>
          </div>
          {summary.serviceDiscountAmount > 0 && (
            <div className="pvm-pl discount">
              <span className="k">Service discount</span>
              <span className="v">−{formatCurrency(summary.serviceDiscountAmount)}</span>
            </div>
          )}
          {summary.discountPercent > 0 && (
            <div className="pvm-pl discount">
              <span className="k">Volume discount · {summary.discountPercent}%</span>
              <span className="v">−{formatCurrency(summary.discountAmount)}</span>
            </div>
          )}
          {typeof displayData?.autoRecurringDiscount === 'number' &&
            displayData.autoRecurringDiscount > 0 &&
            typeof displayData?.autoRecurringSavings === 'number' &&
            displayData.autoRecurringSavings > 0 && (
              <div className="pvm-pl discount">
                <span className="k">
                  Recurring discount · {displayData.autoRecurringDiscount}%
                </span>
                <span className="v">
                  −{formatCurrency(displayData.autoRecurringSavings)}
                </span>
              </div>
            )}
          {gratuity && (
            <div className="pvm-pl">
              <span className="k">
                Gratuity
                {gratuity.type === 'percentage' ? ` · ${gratuity.value}%` : ''}
              </span>
              <span className="v">{formatCurrency(gratuity.amount)}</span>
            </div>
          )}
          <div className="pvm-pl-total">
            <span className="k">
              {summary.totalEvents > includedRows.length ? 'Annual total' : 'Total'}
            </span>
            <span className="v">{formatCurrency(grandTotal)}</span>
          </div>
          <p className="pvm-pl-fine">
            Invoice issued before each event. Payment due 48 hours prior to the
            first scheduled event. Cancellation: 72+ hrs notice = no charge.
          </p>
          {!isApproved && (
            <button
              className="pvm-pl-btn"
              onClick={() => {
                setMSheetOpen(false);
                setApproveConfirmOpen(true);
              }}
            >
              <Check /> Approve proposal
            </button>
          )}
        </div>

        {/* LIGHTBOX */}
        <div className={'pvm-lb' + (mLightbox ? ' open' : '')}>
          <button
            className="pvm-lb-close"
            aria-label="Close"
            onClick={() => setMLightbox(null)}
          >
            <X />
          </button>
          {mLightbox && mLightbox.images.length > 1 && (
            <button className="pvm-lb-nav pvm-lb-prev" aria-label="Previous" onClick={() => lbStep(-1)}>
              <ChevronLeft />
            </button>
          )}
          {mLightbox &&
            (isVideoSrc(mLightbox.images[mLightbox.index]) ? (
              <video
                key={mLightbox.images[mLightbox.index]}
                src={mLightbox.images[mLightbox.index]}
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img src={mLightbox.images[mLightbox.index]} alt="" />
            ))}
          {mLightbox && mLightbox.images.length > 1 && (
            <button className="pvm-lb-nav pvm-lb-next" aria-label="Next" onClick={() => lbStep(1)}>
              <ChevronRight />
            </button>
          )}
          {mLightbox && (
            <div className="pvm-lb-counter">
              {mLightbox.index + 1} / {mLightbox.images.length}
              {mLightbox.caps?.[mLightbox.index]
                ? `  ·  ${mLightbox.caps[mLightbox.index]}`
                : ''}
            </div>
          )}
        </div>

        {/* AGREEMENT MODAL */}
        {mAgreeOpen && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setMAgreeOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(9,54,79,0.45)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: '32px 12px',
              overflowY: 'auto',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                width: '100%',
                maxWidth: 640,
                borderRadius: 18,
                padding: '20px 18px',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setMAgreeOpen(false)}
                aria-label="Close"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
              <ServiceAgreement clientName={clientName} forceExpanded />
            </div>
          </div>
        )}

        {/* Shared approve / request-changes modals (same state as desktop) */}
        <RequestChangesModal
          open={requestChangesOpen}
          onClose={() => setRequestChangesOpen(false)}
          onSubmit={handleSubmitChangeRequest}
          previousNote={displayData?.clientChangesNote}
        />
        <ApproveConfirmModal
          open={approveConfirmOpen}
          onClose={() => !isApproving && setApproveConfirmOpen(false)}
          onConfirm={async () => {
            await handleApprove();
            setApproveConfirmOpen(false);
          }}
          busy={isApproving}
          total={grandTotal}
          servicesIncluded={includedRows.length}
          servicesTotal={summary.rows.length}
          optionName={
            proposalOptions.find((o: any) => o.id === id)?.option_name || null
          }
          clientFirstName={contactFirst || undefined}
        />
      </div>
    );
  }

  // ---- Main render -------------------------------------------------------
  return (
    <div
      className="pv-page pv-page--client pv-root"
      id="proposal-content"
      style={{ minHeight: '100vh', background: '#fff' }}
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
          {/* Design refresh (#6): partner/client logo lives in the nav, followed
              by a divider + lowercase "with [Shortcut]" lockup. */}
          <div className="pv-brand" style={{ minWidth: 0 }}>
            {clientLogoUrl ? (
              <img
                className="pv-partner"
                src={clientLogoUrl}
                alt={clientName || 'Client'}
                style={{ height: 26, width: 'auto', display: 'block', flexShrink: 0 }}
              />
            ) : (
              <span
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: '-0.02em',
                  color: T.navy,
                  whiteSpace: 'nowrap',
                }}
              >
                {clientName || 'Proposal'}
              </span>
            )}
            <span className="pv-brand-divider" />
            <span className="pv-powered">
              <span>with</span>
              <img src="/shortcut-logo-blue.svg" alt="Shortcut" />
            </span>
          </div>

          <div
            ref={menuRef}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: isCompact ? 6 : 10,
              flexShrink: 0,
              flexWrap: isCompact ? 'wrap' : 'nowrap',
              justifyContent: isCompact ? 'flex-start' : 'flex-end',
            }}
          >
            <StatusPill status={(status as any) || 'draft'} />
            {isClientEditing ? (
              // While editing, the in-progress task actions stay visible —
              // they're what the client came to the header to do.
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
              // Design refresh: surface Help (round icon) + Download PDF
              // (secondary pill) + Approve (coral) as visible header actions.
              // Edit / View original stay in a compact overflow menu.
              <>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  title="How to review"
                  aria-label="Help"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9999,
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: T.navy,
                    flexShrink: 0,
                  }}
                >
                  <HelpCircle size={18} />
                </button>
                {!isCompact && (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '9px 18px',
                      background: 'transparent',
                      border: `2px solid ${T.navy}`,
                      borderRadius: 9999,
                      cursor: isDownloading ? 'wait' : 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 13,
                      color: T.navy,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Download size={15} />
                    {isDownloading ? 'Generating…' : 'Download PDF'}
                  </button>
                )}
                {!isApproved && (
                  <button
                    type="button"
                    onClick={() => setApproveConfirmOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '11px 20px',
                      background: T.coral,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 9999,
                      cursor: 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    Approve proposal
                  </button>
                )}
                {(!isApproved || isCompact) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      title="More actions"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 38,
                        height: 38,
                        background: menuOpen ? T.lightGray : 'transparent',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 9999,
                        cursor: 'pointer',
                        color: T.navy,
                        flexShrink: 0,
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {menuOpen && (
                      <div
                        role="menu"
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          minWidth: 210,
                          background: '#fff',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 12,
                          boxShadow: '0 14px 36px rgba(0,0,0,0.16)',
                          padding: 6,
                          zIndex: 40,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        {!isApproved && !showingOriginal && (
                          <HeaderMenuItem
                            icon={<Pencil size={15} />}
                            label="Edit proposal"
                            onClick={() => {
                              setMenuOpen(false);
                              enterClientEditMode();
                            }}
                          />
                        )}
                        {hasOriginalSnapshot && !isApproved && (
                          <HeaderMenuItem
                            icon={<HistoryIcon size={15} />}
                            label={showingOriginal ? 'View current' : 'View original'}
                            onClick={() => {
                              setMenuOpen(false);
                              setShowingOriginal((v) => !v);
                            }}
                          />
                        )}
                        {isCompact && (
                          <HeaderMenuItem
                            icon={<Download size={15} />}
                            label={isDownloading ? 'Generating…' : 'Download PDF'}
                            disabled={isDownloading}
                            onClick={() => {
                              setMenuOpen(false);
                              handleDownloadPdf();
                            }}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
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
          {/* Design refresh: title-led hero. The client logo moved to the nav
              bar (#6), so no logo/avatar block here. */}
          <div style={{ minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 4 }}>
              Prepared for · {clientName}
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
              {displayData?.heroTitle || 'Employee Happiness Delivered.'}
            </h1>
          </div>
        </div>

        {/* Hero subtitle removed — it duplicated the "Toggle, repeat, or
            expand any row" helper and the location row below, and added bulk
            before the first service card on mobile. */}

        {/* Hero mini-stats grid removed — the lifted Pricing summary card
            below carries the same numbers (services, dates, total) and the
            dark sidebar Live Total card keeps it sticky for scroll. */}
      </section>

      {/* ===== Hero photo gallery (design refresh) =====
          Real proposal_gallery photos for this proposal's services, topped up
          with curated office stock so the mosaic always reads full. */}
      <section
        style={{
          padding: isCompact ? '0 16px' : '0 24px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <ProposalGallery
          photos={(() => {
            // Prefer photos explicitly tagged 'hero' in the gallery admin (the
            // top-of-proposal mosaic). If none are set, fall back to THIS
            // proposal's per-service photos (normalize plurals + subtypes so
            // 'nails'→'nail', 'mindfulness-cle'→'mindfulness').
            const hero = (galleryByService['hero'] || []).map(
              (it): GalleryPhoto => ({ src: it.url, cap: it.caption })
            );
            if (hero.length) return hero;
            const base = (s: string) => s.replace(/s$/, '').split('-')[0];
            const wanted = new Set(serviceTypes.map(base));
            const dbPhotos = Object.entries(galleryByService)
              .filter(([type]) => type !== 'hero' && wanted.has(base(type)))
              .flatMap(([type, items]): GalleryPhoto[] =>
                (items || []).map((it) => ({
                  src: it.url,
                  cap: it.caption || type.charAt(0).toUpperCase() + type.slice(1),
                }))
              );
            // Fall back to each service's cover photo (one clean image per
            // service) for service types with no DB media, so newly-added
            // services still populate the mosaic instead of showing only
            // curated stock. Uses the cover, not the full gallery, so the
            // mosaic features the actual service images.
            const staticPhotos = serviceTypes.flatMap((st): GalleryPhoto[] => {
              const hasDb = Object.keys(galleryByService).some(
                (t) => t !== 'hero' && base(t) === base(st)
              );
              if (hasDb) return [];
              const cover = SERVICE_IMAGE_PATH[st];
              return cover ? [{ src: cover, cap: SERVICE_DISPLAY[st] || st }] : [];
            });
            return [...dbPhotos, ...staticPhotos];
          })()}
        />
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
        {/* Block flow (not flex+gap) so the design's section margins
            (.pv-sec-label 40px, .pv-getstarted, .pv-why-block, .pv-final …)
            collapse exactly like the reference. A flex gap stacks on top of
            those margins and the zero-height dock marker eats an extra gap
            slot, which over-spaced the day-by-day / getting-started sections. */}
        <main style={{ minWidth: 0 }}>
          {/* Options tabs — only when there's a sibling group */}
          {proposalOptions.length > 1 && id && (
            <div style={{ marginBottom: 32 }}>
              <OptionsTabs
                options={proposalOptions}
                currentId={id}
                queryString={queryString}
              />
            </div>
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
                marginBottom: 32,
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
                marginBottom: 32,
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

          {/* Custom note moved to the sidebar AccountTeamCard (it reads as a
              note from the rep, and clearing it here lets the services move up
              into the first viewport). */}

          {/* Services per location/date. Single-service proposals get review
              copy instead of "pick" copy — there's nothing to pick when the
              one service always arrives included. */}
          <div>
            <SectionLabel
              eyebrow="Your Proposal"
              title={
                summary.rows.length === 1
                  ? `Build your ${serviceLineLabel(
                      summary.rows[0].serviceType
                    ).toLowerCase()}.`
                  : 'Build your ideal wellness program.'
              }
              size="section"
              mb={10}
            />
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 15,
                color: T.fgMuted,
                lineHeight: 1.55,
                margin: '0 0 18px',
                maxWidth: 680,
              }}
            >
              {summary.rows.length === 1
                ? 'Set how often you’d like it, adjust the details, and approve when you’re ready.'
                : 'Select the services you’d like to include, then set how often you want them. Toggle any service on or off. Your proposal updates automatically.'}
            </p>
            {/* Savings callout (design refresh) — recurring-volume framing.
                Uses the repeat icon + "make it recurring" copy to match the
                reference + the mobile viewer. */}
            <div className="pv-savings" style={{ marginBottom: 0 }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1E9E6A"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m17 2 4 4-4 4" />
                <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
                <path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </svg>
              <span className="txt">
                Sign up for more, save more. Commit to 4 events a year and{' '}
                <strong>save 15%</strong>, or go with 9 and <strong>save 20%</strong>.
              </span>
            </div>
            {/* Intro meta-row (reference `.pv-meta-row`): date · location · appts. */}
            <div className="pv-meta-row">
              {proposalDateLabel && (
                <span className="lt-meta">
                  <Calendar size={18} /> {proposalDateLabel}
                </span>
              )}
              {(() => {
                const locs = Object.keys(displayData?.services || {});
                const addr = resolveOfficeAddress(locs[0]) || locs[0];
                return addr ? (
                  <span className="lt-meta">
                    <MapPin size={18} /> {addr}
                  </span>
                ) : null;
              })()}
              {(includedAppointments.count > 0 ||
                includedAppointments.hasUnlimited) && (
                <span className="lt-meta">
                  <Users size={18} />{' '}
                  {includedAppointments.hasUnlimited
                    ? 'Unlimited'
                    : includedAppointments.count.toLocaleString('en-US')}{' '}
                  appointments
                </span>
              )}
            </div>
            {/* "Your services" section label (design refresh). */}
            <p className="pv-sec-label">Your services</p>
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
                          // Per-event — frequency only annualizes the bottom
                          // Pricing summary, never the left-column rollups.
                          locAppts += Number(a) || 0;
                        }
                        locCost += Number(svc?.serviceCost) || 0;
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
                            {/* Per-location subtotal only when there's more
                                than one location — for a single-location
                                proposal this just duplicates the sidebar
                                Proposal Total, so we let the sidebar own the
                                number and keep this row to date + appt context. */}
                            {Object.keys(displayData.services || {}).length > 1 && (
                              <>
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
                            )}
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
                          let dayServiceCount = 0;
                          let hasUnlimited = false;
                          (dateData?.services || []).forEach(
                            (service: any, idx: number) => {
                              const k = selectionKey(loc, date, idx);
                              const s = get(k);
                              if (!s.included) return;
                              dayServiceCount += 1;
                              const a = service?.totalAppointments;
                              if (a === 'unlimited' || a === '∞') {
                                hasUnlimited = true;
                              } else {
                                // Per-event — the day breakdown shows one
                                // event day, not the annualized figure.
                                dayAppts += Number(a) || 0;
                              }
                              dayCost += Number(service?.serviceCost) || 0;
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
                              {/* Day heading (reference `.pv-day-head`): navy
                                  date + "N services · M appts" sub-count. */}
                              <div className="pv-day-head">
                                <h3>{formatDateLabel(date)}</h3>
                                <span className="sub">
                                  {dayServiceCount} service
                                  {dayServiceCount === 1 ? '' : 's'}
                                  {' · '}
                                  {hasUnlimited
                                    ? '∞'
                                    : dayAppts.toLocaleString('en-US')}{' '}
                                  appts
                                </span>
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
                                      <ServiceCardRefresh
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
                                        onChangeMassageType={(type) =>
                                          handleChangeMassageType(loc, date, idx, type)
                                        }
                                        galleryImages={toStripImages(galleryByService[service.serviceType])}
                                        autoRecurringDiscount={displayData?.autoRecurringDiscount}
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
                              {/* Per-day "Day N summary" module removed (design
                                  refresh) — the Day-by-day breakdown covers it. */}
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

          {/* Dock release anchor — the docked navy pricing card (right column)
              unsticks at the bottom of the LAST service day, before the
              day-by-day breakdown (matches the design's lastDay measurement). */}
          <div ref={dockReleaseRef} aria-hidden style={{ height: 0 }} />

          {/* Pricing summary removed from the LEFT column (design refresh) — it
              now lives only in the right column as the docked navy card. */}
          {false && (
          <div
            style={{
              background: 'linear-gradient(160deg, #00496F 0%, #003C5E 100%)',
              color: '#fff',
              borderRadius: 24,
              padding: isCompact ? '24px 22px' : isMobile ? '28px 28px' : '36px 40px',
              border: '1px solid rgba(158,250,255,0.18)',
              boxShadow: '0 12px 32px rgba(0,60,94,0.28)',
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
              {summary.rows.filter((row) => row.included).map((row) => (
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
                      {serviceLineLabel(row.serviceType)}
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
                  {formatCurrency(summary.originalSubtotal + customItemsTotal)}
                </span>
              </div>
              {summary.serviceDiscountAmount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: T.fontD,
                    fontSize: 14,
                    color: T.aqua,
                  }}
                >
                  <span>Service discount</span>
                  <span>−{formatCurrency(summary.serviceDiscountAmount)}</span>
                </div>
              )}
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
                  {summary.totalEvents >
                  summary.rows.filter((r) => r.included).length
                    ? 'Annual total'
                    : 'Total'}
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
          )}

          {/* Day-by-day breakdown */}
          <DayByDayCards
            servicesByLocation={displayData.services || {}}
            isIncluded={(loc, date, idx) => get(selectionKey(loc, date, idx)).included}
          />

          {/* Getting started — Wise-style 3-step module (design refresh).
              Replaces the sidebar WhatsNextCard; post-event-survey step dropped. */}
          <div className="pv-getstarted">
            <p className="pv-sec-label">Getting started</p>
            <h2 className="lt-h2">You approve. We handle the rest.</h2>
            <div className="pv-steps-grid">
              <div className="pv-step-card">
                <div className="num">1</div>
                <h4>Your sign-up link goes out</h4>
                <p>Up to two weeks before, employees book their own slots from any device.</p>
              </div>
              <div className="pv-step-card">
                <div className="num">2</div>
                <h4>We promote it for you</h4>
                <p>Digital invites and on-site signage drive turnout, so the day fills up.</p>
              </div>
              <div className="pv-step-card">
                <div className="num">3</div>
                <h4>We run the day</h4>
                <p>Our pros, equipment, and setup arrive on-site. You do nothing.</p>
              </div>
            </div>
          </div>

          {/* Why Shortcut — variant resolves from serviceTypes (single service,
              multi-service unified, or CLE). Sits after Getting started, before
              the final CTA (design order). */}
          {serviceTypes.length > 0 && (
            <WhyShortcutSection serviceTypes={serviceTypes} />
          )}

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
              <Eyebrow color={T.coral}>
                {summary.rows.every((r) => !r.included) ? 'Build your proposal' : 'Final step'}
              </Eyebrow>
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
                {summary.rows.every((r) => !r.included)
                  ? summary.rows.length === 1
                    ? 'Add your service back to continue.'
                    : 'Pick the services you want.'
                  : 'Ready to move forward?'}
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
                {summary.rows.every((r) => !r.included) ? (
                  <>
                    Toggle any service above to see your total here. Approve once it looks right, and we'll follow up with logistics.
                  </>
                ) : (
                  <>
                    Approving locks in your selections at{' '}
                    <strong style={{ color: T.navy }}>{formatCurrency(grandTotal)}</strong>{' '}
                    for {summary.rows.filter((r) => r.included).length} service
                    {summary.rows.filter((r) => r.included).length === 1 ? '' : 's'}. Our team will follow up with logistics.
                  </>
                )}
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
          {isApproved && id && (
            <div
              id="proposal-survey-form"
              style={{
                background: hasSurveyResponse ? 'transparent' : '#fff',
                border: hasSurveyResponse ? 'none' : `2px solid ${T.coral}`,
                borderRadius: 20,
                padding: hasSurveyResponse ? 0 : '28px 32px',
                boxShadow: hasSurveyResponse
                  ? 'none'
                  : '0 8px 28px rgba(255,80,80,0.14)',
                scrollMarginTop: 96,
              }}
            >
              {!hasSurveyResponse && (
                <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(255,80,80,0.12)',
                  color: T.coral,
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderRadius: 9999,
                  padding: '6px 12px',
                  marginBottom: 12,
                }}
              >
                <Sparkles size={13} color={T.coral} /> One last step
              </span>
              <CardHeading size="card" style={{ margin: 0 }}>
                Tell us your event details
              </CardHeading>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: T.fgMuted,
                  lineHeight: 1.55,
                  margin: '6px 0 18px',
                }}
              >
                You're approved. Now help us prep the day. It takes about 3
                minutes, and our team can't finalize logistics without it.
              </p>
                </>
              )}
              <ProposalSurveyForm
                proposalId={id}
                includesMassage={massageFormats.length > 0}
                massageFormats={massageFormats}
                serviceTypes={serviceTypes}
                locations={Object.keys(displayData?.services || {})}
                officeLocation={displayData?.officeLocation}
                officeLocations={displayData?.officeLocations}
                onSuccess={() => setHasSurveyResponse(true)}
              />
            </div>
          )}

          {/* Service agreement — sits below the final CTA (design order). */}
          <ServiceAgreementCard clientName={clientName} />
        </main>

        {/* --- Sidebar --- */}
        <aside ref={asideRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Live Total card — desktop only.
              On desktop this is sticky so price + Approve stay visible
              as the user scrolls. On mobile the sidebar stacks below the
              main column, so this card lands directly under the white
              Approve CTA and renders a duplicate Approve button. The
              bottom Approve CTA already shows the locked-in total and
              serves the conversion role, so we skip this entirely on
              mobile. */}
          {!isMobile && (
          <div className="pv-price-dock" style={{ height: dockHeight }}>
            <div className="pv-dock-sticky">
          <div
            style={{
              // Design refresh: navy gradient + aqua hairline + deeper shadow.
              background: 'linear-gradient(160deg, #00496F 0%, #003C5E 100%)',
              color: '#fff',
              borderRadius: 16,
              padding: '22px 24px',
              border: '1px solid rgba(158,250,255,0.18)',
              boxShadow: '0 12px 32px rgba(0,60,94,0.28)',
              // Deliberately not sticky: with the app-shell overflow fix the
              // sticky would now actually engage, and a pinned card floats
              // over the sibling cards as they scroll underneath it.
            }}
          >
            {(() => {
              const nothingSelected = summary.rows.every((r) => !r.included);
              const includedCount = summary.rows.filter((r) => r.included).length;
              const hasRepeats = summary.totalEvents > includedCount;
              // Volume discount, expressed two ways for the sidebar:
              //  • per event — the slice of one event's subtotal the discount
              //    removes, so the "Per event" total reflects what each event
              //    actually costs once the 4+/9+ threshold is met.
              //  • annual — summary.discountAmount, the total saved across the
              //    year (shown as the savings banner).
              const perEventVolumeDiscount =
                summary.discountPercent > 0
                  ? summary.perEventSubtotal * (summary.discountPercent / 100)
                  : 0;
              const perEventTotalNet = perEventGrandTotal - perEventVolumeDiscount;
              // Per-event auto-recurring discount: the gap between the pre-
              // discount subtotal and the post-discount line items that ISN'T
              // the per-service discount. Itemizing it keeps the sidebar math
              // self-consistent (Subtotal − discounts = Total) the same way
              // the mobile sheet does.
              const perEventRecurringDiscount =
                summary.perEventOriginalSubtotal -
                summary.perEventSubtotal -
                summary.perEventServiceDiscount;
              return (
                <>
                  {/* Heading — mirrors the bottom Pricing summary card, compact */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <CardHeading size="item" style={{ color: '#fff', fontSize: 19 }}>
                      {nothingSelected ? 'Build your proposal' : 'Pricing summary'}
                    </CardHeading>
                    <Eyebrow color="rgba(255,255,255,0.55)">
                      {includedCount} of {summary.rows.length}
                    </Eyebrow>
                  </div>

                  {nothingSelected ? (
                    <div
                      style={{
                        fontFamily: T.fontD,
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.45,
                        marginBottom: 16,
                      }}
                    >
                      Select services below to see your price.
                    </div>
                  ) : (
                    <>
                      {/* Per-event line items (same layout as the bottom card) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
                        {summary.rows.filter((row) => row.included).map((row) => (
                          <div
                            key={row.key}
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              gap: 8,
                              opacity: row.included ? 1 : 0.45,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: T.fontD,
                                  fontWeight: 600,
                                  fontSize: 13.5,
                                  color: '#fff',
                                  textDecoration: row.included ? 'none' : 'line-through',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {serviceLineLabel(row.serviceType)}
                              </span>
                              {/* Repeat indicator — mirrors the bottom Pricing
                                  summary. The pill only flags the frequency;
                                  the price beside it stays per-event (the
                                  annual roll-up lives in the bottom card). */}
                              {row.frequency > 1 && row.included && (
                                <span
                                  style={{
                                    flexShrink: 0,
                                    background: T.aqua,
                                    color: T.navy,
                                    padding: '1px 7px',
                                    borderRadius: 9999,
                                    fontFamily: T.fontUi,
                                    fontWeight: 700,
                                    fontSize: 10,
                                    letterSpacing: '.02em',
                                  }}
                                >
                                  ×{row.frequency} / yr
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontFamily: T.fontD,
                                fontWeight: 700,
                                fontSize: 13.5,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                textDecoration: row.included ? 'none' : 'line-through',
                              }}
                            >
                              {formatCurrency(row.unitCost)}
                            </span>
                          </div>
                        ))}
                        {customLineItems
                          .filter((it: any) => (Number(it.amount) || 0) > 0 || it.name)
                          .map((it: any, i: number) => (
                            <div
                              key={it.id || `c-${i}`}
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
                            >
                              <span style={{ fontFamily: T.fontD, fontWeight: 600, fontSize: 13.5, color: '#fff' }}>
                                {it.name || 'Custom item'}
                              </span>
                              <span style={{ fontFamily: T.fontD, fontWeight: 700, fontSize: 13.5, color: '#fff', whiteSpace: 'nowrap' }}>
                                {formatCurrency(Number(it.amount) || 0)}
                              </span>
                            </div>
                          ))}
                      </div>

                      <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', marginBottom: 12 }} />

                      {/* Totals — per event. Frequency never changes these. */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fontD, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                          <span>Subtotal</span>
                          <span style={{ color: '#fff' }}>
                            {formatCurrency(summary.perEventOriginalSubtotal + customItemsTotal)}
                          </span>
                        </div>
                        {summary.perEventServiceDiscount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fontD, fontSize: 13, color: T.aqua }}>
                            <span>Service discount</span>
                            <span>−{formatCurrency(summary.perEventServiceDiscount)}</span>
                          </div>
                        )}
                        {perEventRecurringDiscount > 0.01 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fontD, fontSize: 13, color: T.aqua }}>
                            <span>
                              Recurring discount
                              {typeof displayData?.autoRecurringDiscount === 'number' &&
                              displayData.autoRecurringDiscount > 0
                                ? ` · ${displayData.autoRecurringDiscount}%`
                                : ''}
                            </span>
                            <span>−{formatCurrency(perEventRecurringDiscount)}</span>
                          </div>
                        )}
                        {/* Volume discount — applied PER EVENT so the "Per event"
                            total below reflects what each event costs once the
                            4+ (15%) / 9+ (20%) threshold is met. */}
                        {summary.discountPercent > 0 && perEventVolumeDiscount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fontD, fontSize: 13, color: T.aqua }}>
                            <span>Volume discount · {summary.discountPercent}%</span>
                            <span>−{formatCurrency(perEventVolumeDiscount)}</span>
                          </div>
                        )}
                        {gratuity && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fontD, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                            <span>Gratuity{gratuity.type === 'percentage' ? ` · ${gratuity.value}%` : ''}</span>
                            <span style={{ color: '#fff' }}>{formatCurrency(gratuity.amount)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                          <span style={{ fontFamily: T.fontD, fontWeight: 700, fontSize: 15, color: '#fff' }}>
                            {hasRepeats ? 'Per event' : 'Total'}
                          </span>
                          <span style={{ fontFamily: T.fontD, fontWeight: 800, fontSize: 30, lineHeight: 1, color: T.aqua, letterSpacing: '-0.02em' }}>
                            {formatCurrency(perEventTotalNet)}
                          </span>
                        </div>
                      </div>

                      {/* Annual savings banner. The discount line above is per
                          event; this surfaces the total saved across the year
                          (summary.discountAmount) with the discount tag, so the
                          client sees both the per-event price and the annual win
                          without a separate bottom card. */}
                      {summary.discountPercent > 0 && summary.discountAmount > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: '10px 12px',
                            background: 'rgba(30,158,106,0.16)',
                            border: '1px solid rgba(30,158,106,0.38)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              background: '#1E9E6A',
                              color: '#fff',
                              fontFamily: T.fontUi,
                              fontWeight: 700,
                              fontSize: 10.5,
                              letterSpacing: '.04em',
                              textTransform: 'uppercase',
                              padding: '3px 9px',
                              borderRadius: 9999,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {summary.discountPercent}% volume discount
                          </span>
                          <span
                            style={{
                              fontFamily: T.fontD,
                              fontWeight: 700,
                              fontSize: 13,
                              color: '#9FE9C4',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            You save {formatCurrency(summary.discountAmount)}/yr
                          </span>
                        </div>
                      )}

                      {hasRepeats && (
                        <div style={{ fontFamily: T.fontD, fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 10, lineHeight: 1.45 }}>
                          Price shown is per event. You have {summary.totalEvents} events booked across the year.
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}

            <div
              style={{
                height: 1,
                background: 'rgba(255,255,255,0.12)',
                margin: '16px 0',
              }}
            />

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
            {/* Demo pill — rides under the docked pricing card, collapses once
                the demo scrolls into view (desktop only). */}
            {/* Always mounted so the collapse animates; is-hidden toggles with
                scroll. Clicking smooth-scrolls to the demo (it never vanishes —
                it returns when the user scrolls back up to the services). */}
            <button
              type="button"
              className={'pv-demo-pill' + (demoRevealed ? ' is-hidden' : '')}
              style={{ display: 'flex' }}
              onClick={() => {
                const el = demoRef.current;
                if (!el) return;
                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }}
            >
              <span className="ic">
                <svg viewBox="0 0 24 24" width="15" height="15"><path d="M8 5v14l11-7z" /></svg>
              </span>
              <span className="tx">
                See the sign-up demo
                <small>How employees book in seconds</small>
              </span>
              <span className="chev">
                <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
              </span>
            </button>
            </div>
          </div>
          )}

          {/* The employee sign-up — self-playing mobile demo inside an iPhone
              frame with a dynamic zoom camera. Autoplays + loops; freezes on a
              static fitted frame under prefers-reduced-motion. When an admin has
              set a test-event URL (data.signupLink), the Copy link + Try it
              yourself CTAs render below the demo; otherwise the demo shows alone.
              Replaces the old MP4 SignupLinkCard. */}
          <div
            ref={demoRef}
            style={{
              transition: 'opacity .5s ease, transform .5s ease',
              opacity: isMobile || demoRevealed ? 1 : 0,
              transform: isMobile || demoRevealed ? 'none' : 'translateY(14px)',
            }}
          >
            <MobileSignupModule
              url={displayData?.signupLink}
              title={displayData?.signupLinkTitle}
              description={displayData?.signupLinkDescription}
            />
          </div>

          {/* Facilitator — Courtney for mindfulness-only proposals, Kirsten for
              the movement & sound services. Right-rail photo + bio. */}
          {isMindfulnessOnly && <FacilitatorCard />}
          {isKirstenOnly && <FacilitatorCard facilitator={FACILITATOR_KIRSTEN} />}

          {/* Account team — driven by data.accountTeamMemberEmail, defaults to Jaimie */}
          <AccountTeamCard
            email={displayData?.accountTeamMemberEmail}
            note={customNote}
          />

          {/* Sidebar gallery removed (design refresh) — gallery now lives as the
              top hero mosaic. "What's next" moved to the left-column "Getting
              started" module. */}

          {/* Trust — 87% rebook + client logos */}
          <TrustCard />

          {/* FAQ — common questions, accordion */}
          <FaqCard />
        </aside>
      </section>

      {/* Footer (design refresh) — centered Shortcut mark + URL. */}
      <div className="pv-footer">
        <img src="/shortcut-logo-blue.svg" alt="Shortcut" />
        <p>proposals.getshortcut.co</p>
      </div>

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
