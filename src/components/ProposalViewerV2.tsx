import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileText,
  Receipt,
  Download,
  Edit,
  History as HistoryIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useProposal } from '../contexts/ProposalContext';
import { generatePDF } from '../utils/pdf';
import { getProposalUrl } from '../utils/url';
import {
  calculateServiceResults,
  generatePricingOptionsForService,
  recalculateServiceTotals,
} from '../utils/proposalGenerator';
import { trackProposalChanges } from '../utils/changeTracker';
import { ProposalChangeSet } from '../types/proposal';
import { LoadingSpinner } from './LoadingSpinner';
import ServiceCard from './proposal/ServiceCard';
import {
  CardHeading,
  Eyebrow,
  MiniStat,
  SectionLabel,
  StatusPill,
  T,
} from './proposal/shared/primitives';
import { formatCurrency, SERVICE_DISPLAY } from './proposal/data';
import AccountTeamCard, {
  ACCOUNT_TEAM,
  DEFAULT_TEAM_EMAIL,
} from './proposal/sidebar/AccountTeamCard';
import WhatsNextCard from './proposal/sidebar/WhatsNextCard';
import EventDaySummaryCard from './proposal/EventDaySummaryCard';
import DaySummaryBox from './proposal/DaySummaryBox';
import ServiceAgreementCard from './proposal/ServiceAgreementCard';
import WhyShortcutSection from './proposal/sections/WhyShortcutSection';
import ServiceDetailsSection from './proposal/sections/ServiceDetailsSection';
import ParticipantBenefitsSection from './proposal/sections/ParticipantBenefitsSection';
import AdditionalResourcesSection from './proposal/sections/AdditionalResourcesSection';
import CLEOutlineSection from './proposal/sections/CLEOutlineSection';
import CLEAccreditationSection from './proposal/sections/CLEAccreditationSection';
import FacilitatorCard from './proposal/sidebar/FacilitatorCard';
import { generateLineItems } from './StripeInvoiceButton';
import type { InvoiceLineItem } from './InvoiceConfirmationModal';
import InvoiceConfirmationModalV2 from './proposal/InvoiceConfirmationModalV2';

// ============================================================================
// ProposalViewerV2 — internal/admin proposal viewer in the redesign-2026 visual
// language. Parallel to StandaloneProposalViewerV2 (client view) but with the
// admin affordances V1 ProposalViewer.tsx provides: inline edit, save, send to
// client, multi-option management, logo upload, change-history drawer.
//
// Phase 3 baseline scope:
//   - V2 shell (header, hero, 2-col body, sidebar) mirroring the client viewer
//   - Editable client name, logo, custom note in hero
//   - Multi-option strip with reorder/remove/create/link
//   - Service blocks via shared ServiceCard with internalView + editing on
//   - Service-type, massage/nails/mindfulness sub-pickers, discount %
//   - Add/remove service, add/remove day
//   - Admin action sidebar replacing client "Live Total" card
//   - Send-to-Client modal, Link-existing-proposals modal
//   - Change-history drawer
//
// Deferred to later passes (Phase 4+): force-approve UI, account-team override
// dropdown, inline pricing-options editor, advanced gratuity/custom-line UI.
// ============================================================================

// ---------------------------------------------------------------------------
// Constants — service defaults (copied from V1 ProposalViewer.tsx so the V2
// shell can stand on its own; we keep them in sync if V1 ever changes).
// ---------------------------------------------------------------------------
const SERVICE_DEFAULTS: Record<string, any> = {
  massage: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
    massageType: 'massage',
  },
  facial: {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
  },
  hair: {
    appTime: 30,
    totalHours: 6,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
  },
  nails: {
    appTime: 30,
    totalHours: 6,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
    nailsType: 'nails',
  },
  makeup: {
    appTime: 30,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
  },
  headshot: {
    appTime: 12,
    totalHours: 5,
    numPros: 1,
    proHourly: 400,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 40,
  },
  mindfulness: {
    appTime: 45,
    totalHours: 0.75,
    numPros: 1,
    proHourly: 0,
    hourlyRate: 0,
    earlyArrival: 0,
    retouchingCost: 0,
    classLength: 45,
    participants: 'unlimited',
    fixedPrice: 1375,
    mindfulnessType: 'intro',
  },
  'hair-makeup': {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
  },
  'headshot-hair-makeup': {
    appTime: 20,
    totalHours: 4,
    numPros: 2,
    proHourly: 50,
    hourlyRate: 135,
    earlyArrival: 25,
    retouchingCost: 0,
  },
};

const SERVICE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'massage', label: 'Massage' },
  { value: 'facial', label: 'Facial' },
  { value: 'hair', label: 'Hair' },
  { value: 'nails', label: 'Nails' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'headshot', label: 'Headshot' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'hair-makeup', label: 'Hair + Makeup' },
  { value: 'headshot-hair-makeup', label: 'Hair + Makeup for Headshots' },
];

const MASSAGE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'massage', label: 'General' },
  { value: 'chair', label: 'Chair' },
  { value: 'table', label: 'Table' },
];

const NAILS_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'nails', label: 'Classic' },
  { value: 'nails-hand-massage', label: '+ Hand massage' },
];

const MINDFULNESS_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'intro', label: 'Intro (45 min, $1,375)' },
  { value: 'drop-in', label: 'Drop-in (30 min, $1,250)' },
  { value: 'mindful-movement', label: 'Mindful Movement (60 min, $1,500)' },
];

const MINDFULNESS_FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'in-person', label: 'In-person' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'blend', label: 'Hybrid (in-person + virtual)' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatDateLabel = (raw: string): string => {
  if (!raw || raw === 'TBD' || raw.startsWith('TBD')) return 'Date TBD';
  try {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return format(parsed, 'EEE, MMM d, yyyy');
  } catch {
    return raw;
  }
};

const formatDateForInput = (raw: string): string => {
  if (!raw || raw === 'TBD' || raw.startsWith('TBD')) return '';
  try {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return '';
  }
};

const sortDates = (a: string, b: string): number => {
  const aTbd = !a || a === 'TBD' || a.startsWith('TBD');
  const bTbd = !b || b === 'TBD' || b.startsWith('TBD');
  if (aTbd && bTbd) return a.localeCompare(b);
  if (aTbd) return 1;
  if (bTbd) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
};

const rebuildEventDates = (data: any): void => {
  const all = new Set<string>();
  Object.values(data.services || {}).forEach((locData: any) => {
    Object.keys(locData || {}).forEach((d) => all.add(d));
  });
  data.eventDates = Array.from(all).sort(sortDates);
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ProposalViewerV2: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getProposal, updateProposal, currentProposal, loading, error } = useProposal();

  // ---- Data state -------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showingOriginal, setShowingOriginal] = useState(false);

  // ---- Edit mode --------------------------------------------------------
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // ---- Action state -----------------------------------------------------
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  // ---- Send to client modal --------------------------------------------
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendName, setSendName] = useState('');
  const [sendEmail, setSendEmail] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSendSuccess, setShowSendSuccess] = useState(false);

  // ---- Logo upload ------------------------------------------------------
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // ---- Office address editing -------------------------------------------
  const [editingOfficeFor, setEditingOfficeFor] = useState<string | null>(null);

  // ---- Multi-option state ----------------------------------------------
  const [proposalOptions, setProposalOptions] = useState<any[]>([]);
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [editingOptionName, setEditingOptionName] = useState<string | null>(null);
  const [optionNameInput, setOptionNameInput] = useState('');
  const [showDeleteOptionConfirm, setShowDeleteOptionConfirm] = useState<string | null>(null);

  // ---- Link-existing modal ---------------------------------------------
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  const [selectedToLink, setSelectedToLink] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');

  // ---- Change history drawer -------------------------------------------
  const [changeSets, setChangeSets] = useState<ProposalChangeSet[]>([]);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [reviewBusyFor, setReviewBusyFor] = useState<string | null>(null);

  // ---- Admin notes (separate from Save Changes — flips pending_review) --
  const [adminNotes, setAdminNotes] = useState('');
  const [adminNotesSaving, setAdminNotesSaving] = useState(false);
  const [adminNotesSaved, setAdminNotesSaved] = useState(false);

  // ---- Status overrides (force-approve / mark-rejected / mark-sent) -----
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // ---- Collapsible location / date sections ----------------------------
  // Keyed by `${loc}` for locations and `${loc}|${date}` for dates.
  // Default-open in edit mode; default-open everywhere else for parity with
  // the V1 admin viewer's "expand all" load behavior.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // ---- Bulk service-type swap state -----------------------------------
  const [bulkSwapOpen, setBulkSwapOpen] = useState(false);
  const [bulkSwapFrom, setBulkSwapFrom] = useState<string>('');
  const [bulkSwapTo, setBulkSwapTo] = useState<string>('massage');

  // ---- Test-send (send proposal email to a staff address) -------------
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [testSendEmail, setTestSendEmail] = useState('');
  const [testSendBusy, setTestSendBusy] = useState(false);
  const [testSendSent, setTestSendSent] = useState(false);

  // ---- Invoice (V2-styled wrapper around the Stripe modal flow) --------
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoicePdf, setInvoicePdf] = useState<string | null>(null);
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceLinkCopied, setInvoiceLinkCopied] = useState(false);

  // -----------------------------------------------------------------------
  // Hydrate admin notes from proposal.notes when it loads
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (currentProposal?.notes && typeof currentProposal.notes === 'string') {
      setAdminNotes(currentProposal.notes);
    }
  }, [currentProposal?.notes]);

  // -----------------------------------------------------------------------
  // Initial load
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!id) {
      setLoadError('Proposal ID is required');
      return;
    }
    initializeProposal();
    fetchChangeSets();
    fetchProposalOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const initializeProposal = async () => {
    if (!id) return;
    try {
      setLoadError(null);
      setIsLoading(true);
      const proposal = await getProposal(id);
      if (!proposal) throw new Error('Proposal not found');
      if (
        proposal.proposal_type === 'mindfulness-program' ||
        proposal.data?.mindfulnessProgram
      ) {
        // Mindfulness gets its own viewer
        navigate(`/proposal/${id}${location.search}`, { replace: true });
        return;
      }
      if (!proposal.data?.services) {
        throw new Error('Invalid proposal data structure - no services');
      }

      // Attach pricing options to data.services before recalc so summaries
      // pick up the selected option's cost (same pattern as V1).
      if (proposal.pricingOptions && proposal.selectedOptions && proposal.data.services) {
        Object.entries(proposal.data.services).forEach(
          ([loc, locData]: [string, any]) => {
            if (Array.isArray(locData)) return;
            Object.entries(locData).forEach(([date, dateData]: [string, any]) => {
              dateData.services?.forEach((service: any, idx: number) => {
                const key = `${loc}-${date}-${idx}`;
                if (proposal.pricingOptions?.[key]) {
                  service.pricingOptions = proposal.pricingOptions[key];
                  service.selectedOption = proposal.selectedOptions?.[key] || 0;
                }
              });
            });
          }
        );
        proposal.data.hasPricingOptions = proposal.hasPricingOptions || false;
      }

      const gratuityType = proposal.data?.gratuityType || null;
      const gratuityValue = proposal.data?.gratuityValue ?? null;
      const calculatedData = recalculateServiceTotals(proposal.data);
      if (gratuityType) calculatedData.gratuityType = gratuityType;
      if (gratuityValue !== null) calculatedData.gratuityValue = gratuityValue;

      // Clean officeLocations to current locations only
      if (calculatedData.officeLocations && calculatedData.locations) {
        const cleaned: { [k: string]: string } = {};
        calculatedData.locations.forEach((loc: string) => {
          if (calculatedData.officeLocations?.[loc]) {
            cleaned[loc] = calculatedData.officeLocations[loc];
          }
        });
        calculatedData.officeLocations = Object.keys(cleaned).length > 0 ? cleaned : undefined;
      }
      if (proposal.hasPricingOptions) calculatedData.hasPricingOptions = true;

      setEditedData({ ...calculatedData, customization: proposal.customization });
      setDisplayData({ ...calculatedData, customization: proposal.customization });
      if (proposal.originalData) {
        const orig = recalculateServiceTotals(proposal.originalData);
        setOriginalData({ ...orig, customization: proposal.customization });
      }

      // Fetch invoice status if linked
      if (proposal.stripeInvoiceId) {
        try {
          const { data: inv } = await supabase
            .from('stripe_invoices')
            .select('status, invoice_url, invoice_pdf')
            .eq('proposal_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (inv) {
            setInvoiceStatus(inv.status);
            setInvoiceUrl(inv.invoice_url);
            setInvoicePdf(inv.invoice_pdf || null);
          }
        } catch {
          /* non-critical */
        }
      }
    } catch (err) {
      console.error('[ProposalViewerV2] load error:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load proposal');
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Change tracking — ported from V1 (lib/changeTracker)
  // -----------------------------------------------------------------------
  const fetchChangeSets = async () => {
    if (!id) return;
    try {
      const { data: pd } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();
      if (!pd?.original_data || !pd?.data) {
        setChangeSets([]);
        return;
      }
      if (JSON.stringify(pd.original_data) === JSON.stringify(pd.data)) {
        setChangeSets([]);
        return;
      }
      const sets: ProposalChangeSet[] = [];

      if (pd.client_data) {
        const clientChanges = trackProposalChanges(
          pd.original_data,
          pd.client_data,
          pd.client_email,
          pd.client_name
        );
        if (clientChanges.length > 0) {
          sets.push({
            id: `${pd.id}-client`,
            proposalId: pd.id,
            changes: clientChanges,
            clientEmail: pd.client_email,
            clientName: pd.client_name,
            clientComment: pd.client_comment || '',
            status: pd.pending_review
              ? 'pending'
              : pd.status === 'approved'
              ? 'approved'
              : 'pending',
            submittedAt: pd.updated_at,
            reviewedBy: pd.reviewed_by,
            reviewedAt: pd.reviewed_at,
            adminComment: pd.admin_comment,
            changeSource: 'client',
            userId: null,
          });
        }
      }
      if (pd.change_source === 'staff' || pd.change_source === 'admin') {
        const baseline = pd.client_data || pd.original_data;
        const staffChanges = trackProposalChanges(
          baseline,
          pd.data,
          pd.client_email,
          pd.client_name
        );
        if (staffChanges.length > 0) {
          sets.push({
            id: `${pd.id}-staff`,
            proposalId: pd.id,
            changes: staffChanges,
            clientEmail: pd.client_email,
            clientName: pd.client_name,
            clientComment: pd.client_comment || '',
            status: pd.pending_review
              ? 'pending'
              : pd.status === 'approved'
              ? 'approved'
              : 'pending',
            submittedAt: pd.updated_at,
            reviewedBy: pd.reviewed_by,
            reviewedAt: pd.reviewed_at,
            adminComment: pd.admin_comment,
            changeSource: 'staff',
            userId: pd.user_id,
          });
        }
      }
      setChangeSets(sets);
    } catch (err) {
      console.error('[ProposalViewerV2] fetchChangeSets failed:', err);
      setChangeSets([]);
    }
  };

  // -----------------------------------------------------------------------
  // Multi-option fetch
  // -----------------------------------------------------------------------
  const fetchProposalOptions = async () => {
    if (!id) return;
    try {
      const { data: cp } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();
      if (!cp) {
        setProposalOptions([]);
        return;
      }
      const groupId = cp.proposal_group_id || cp.id;
      const { data: opts } = await supabase
        .from('proposals')
        .select(
          'id, option_name, option_order, status, client_name, created_at, proposal_group_id'
        )
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`)
        .order('option_order', { ascending: true, nullsFirst: false });
      const sorted = (opts || []).sort((a, b) => {
        if (a.option_order !== null && b.option_order !== null) {
          return a.option_order - b.option_order;
        }
        if (a.option_order !== null) return -1;
        if (b.option_order !== null) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setProposalOptions(sorted);
    } catch (err) {
      console.error('[ProposalViewerV2] fetchProposalOptions failed:', err);
      setProposalOptions([]);
    }
  };

  // -----------------------------------------------------------------------
  // Edit handlers — port of V1 ProposalViewer's editing helpers but tightened
  // -----------------------------------------------------------------------
  const handleFieldChange = (path: string[], value: any) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    let target: any = updated;
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    target[path[path.length - 1]] = value;

    // If editing a service param, recalculate that service's totals
    if (path.length >= 5 && path[0] === 'services' && path[3] === 'services') {
      const service = target;
      // Sync mindfulness type when classLength changes
      if (
        path[path.length - 1] === 'classLength' &&
        service.serviceType === 'mindfulness'
      ) {
        const cl = typeof value === 'string' ? parseFloat(value) || 45 : value;
        if (cl === 30) {
          service.mindfulnessType = 'drop-in';
          service.fixedPrice = 1250;
        } else if (cl === 60) {
          service.mindfulnessType = 'mindful-movement';
          service.fixedPrice = 1500;
        } else {
          service.mindfulnessType = 'intro';
          service.fixedPrice = 1375;
        }
      }
      if (!service.pricingOptions || service.pricingOptions.length === 0) {
        const next = { ...service };
        if (path[path.length - 1] === 'discountPercent') {
          next.discountPercent = value;
        }
        const { totalAppointments, serviceCost, proRevenue } =
          calculateServiceResults(next);
        service.totalAppointments = totalAppointments;
        service.serviceCost = serviceCost;
        service.proRevenue = proRevenue;
        if (path[path.length - 1] === 'discountPercent') {
          service.discountPercent = value;
        }
      }
    }

    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  // Top-level (proposal-wide) field edits use the same path engine
  const setTopLevelField = (key: string, value: any) => handleFieldChange([key], value);
  const setCustomizationField = (key: string, value: any) =>
    handleFieldChange(['customization', key], value);

  const handleServiceTypeChange = (loc: string, date: string, idx: number, newType: string) => {
    if (!editedData || !isEditing) return;
    const defaults = SERVICE_DEFAULTS[newType] || {};
    const current = editedData.services[loc][date].services[idx];
    const next: any = {
      ...current,
      serviceType: newType,
      ...defaults,
      date: current.date || date,
      location: current.location || loc,
      discountPercent: current.discountPercent || 0,
      massageType: newType === 'massage' ? current.massageType || 'massage' : undefined,
      nailsType: newType === 'nails' ? current.nailsType || 'nails' : undefined,
      mindfulnessType:
        newType === 'mindfulness' ? current.mindfulnessType || 'intro' : undefined,
      classLength: newType === 'mindfulness' ? current.classLength || 45 : undefined,
      participants:
        newType === 'mindfulness' ? current.participants || 'unlimited' : undefined,
      fixedPrice: newType === 'mindfulness' ? current.fixedPrice || 1375 : undefined,
    };
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(next);
    next.totalAppointments = totalAppointments;
    next.serviceCost = serviceCost;
    next.proRevenue = proRevenue;
    handleFieldChange(['services', loc, date, 'services', idx], next);
  };

  const handleMindfulnessTypeChange = (loc: string, date: string, idx: number, mt: string) => {
    if (!editedData || !isEditing) return;
    const current = editedData.services[loc][date].services[idx];
    let cl = 45;
    let fp = 1375;
    if (mt === 'drop-in') {
      cl = 30;
      fp = 1250;
    } else if (mt === 'mindful-movement') {
      cl = 60;
      fp = 1500;
    }
    const next: any = {
      ...current,
      mindfulnessType: mt,
      classLength: cl,
      fixedPrice: fp,
    };
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(next);
    next.totalAppointments = totalAppointments;
    next.serviceCost = serviceCost;
    next.proRevenue = proRevenue;
    handleFieldChange(['services', loc, date, 'services', idx], next);
  };

  const handleNailsTypeChange = (loc: string, date: string, idx: number, nt: string) => {
    if (!editedData || !isEditing) return;
    const current = editedData.services[loc][date].services[idx];
    const newAppTime = nt === 'nails-hand-massage' ? 35 : 30;
    const next: any = { ...current, nailsType: nt, appTime: newAppTime };
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(next);
    next.totalAppointments = totalAppointments;
    next.serviceCost = serviceCost;
    next.proRevenue = proRevenue;
    handleFieldChange(['services', loc, date, 'services', idx], next);
  };

  const handleAddService = (loc: string, date: string) => {
    if (!editedData || !isEditing) return;
    const next: any = {
      serviceType: 'massage',
      ...SERVICE_DEFAULTS.massage,
      date,
      location: loc,
      discountPercent: 0,
      totalAppointments: 0,
      serviceCost: 0,
      proRevenue: 0,
    };
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(next);
    next.totalAppointments = totalAppointments;
    next.serviceCost = serviceCost;
    next.proRevenue = proRevenue;
    const updated = { ...editedData };
    if (!updated.services[loc][date].services) updated.services[loc][date].services = [];
    updated.services[loc][date].services.push(next);
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  const handleRemoveService = (loc: string, date: string, idx: number) => {
    if (!editedData || !isEditing) return;
    if (!window.confirm('Remove this service?')) return;
    const updated = { ...editedData };
    updated.services[loc][date].services.splice(idx, 1);
    if (updated.services[loc][date].services.length === 0) {
      delete updated.services[loc][date];
      rebuildEventDates(updated);
    }
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  const handleAddDay = (loc: string) => {
    if (!editedData || !isEditing) return;
    let key = 'TBD';
    let n = 2;
    while (editedData.services[loc]?.[key]) {
      key = `TBD-${n}`;
      n++;
    }
    const next: any = {
      serviceType: 'massage',
      ...SERVICE_DEFAULTS.massage,
      date: key,
      location: loc,
      discountPercent: 0,
      totalAppointments: 0,
      serviceCost: 0,
      proRevenue: 0,
    };
    const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(next);
    next.totalAppointments = totalAppointments;
    next.serviceCost = serviceCost;
    next.proRevenue = proRevenue;
    const updated = { ...editedData };
    updated.services[loc][key] = {
      services: [next],
      totalCost: serviceCost,
      totalAppointments,
    };
    rebuildEventDates(updated);
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  const handleRemoveDay = (loc: string, date: string) => {
    if (!editedData || !isEditing) return;
    const count = editedData.services[loc]?.[date]?.services?.length || 0;
    if (
      !window.confirm(
        `Remove this entire day${
          count > 0 ? ` and its ${count} service${count > 1 ? 's' : ''}` : ''
        }?`
      )
    )
      return;
    const updated = { ...editedData };
    delete updated.services[loc][date];
    rebuildEventDates(updated);
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  // -----------------------------------------------------------------------
  // Pricing-options editing
  // -----------------------------------------------------------------------
  /** Recalculate a single pricing option's derived fields (cost / appointments
   *  / proRevenue) from its current + base service params. Used after any
   *  per-option edit so admin margin math stays accurate. */
  const recalcOption = (baseService: any, option: any) => {
    const merged = {
      ...baseService,
      totalHours: option.totalHours ?? baseService.totalHours,
      hourlyRate: option.hourlyRate ?? baseService.hourlyRate,
      numPros: option.numPros ?? baseService.numPros,
      discountPercent:
        option.discountPercent !== undefined
          ? option.discountPercent
          : baseService.discountPercent || 0,
    };
    const { totalAppointments, serviceCost, originalPrice, proRevenue } =
      calculateServiceResults(merged);
    return {
      ...option,
      totalAppointments,
      serviceCost,
      proRevenue,
      originalPrice: originalPrice ?? option.originalPrice,
      discountPercent: merged.discountPercent,
    };
  };

  const handleEditPricingOption = (
    loc: string,
    date: string,
    idx: number,
    optIdx: number,
    field: string,
    value: any
  ) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const svc = updated.services[loc][date].services[idx];
    if (!svc?.pricingOptions?.[optIdx]) return;
    svc.pricingOptions[optIdx] = {
      ...svc.pricingOptions[optIdx],
      [field]: value,
    };
    svc.pricingOptions[optIdx] = recalcOption(svc, svc.pricingOptions[optIdx]);
    // If editing the currently-selected option, mirror its totals onto base
    if ((svc.selectedOption || 0) === optIdx) {
      svc.totalAppointments = svc.pricingOptions[optIdx].totalAppointments;
      svc.serviceCost = svc.pricingOptions[optIdx].serviceCost;
      svc.proRevenue = svc.pricingOptions[optIdx].proRevenue;
      svc.discountPercent = svc.pricingOptions[optIdx].discountPercent;
    }
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  const handleAddPricingOption = (loc: string, date: string, idx: number) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const svc = updated.services[loc][date].services[idx];
    if (!svc.pricingOptions) svc.pricingOptions = [];
    const optionNum = svc.pricingOptions.length + 1;
    const blank: any = {
      name: `Option ${optionNum}`,
      totalHours: svc.totalHours,
      hourlyRate: svc.hourlyRate,
      numPros: svc.numPros,
      discountPercent: svc.discountPercent || 0,
      serviceCost: 0,
      totalAppointments: 0,
    };
    svc.pricingOptions.push(recalcOption(svc, blank));
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  const handleRemovePricingOption = (
    loc: string,
    date: string,
    idx: number,
    optIdx: number
  ) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const svc = updated.services[loc][date].services[idx];
    if (!svc?.pricingOptions || svc.pricingOptions.length <= 1) return;
    svc.pricingOptions.splice(optIdx, 1);
    if ((svc.selectedOption || 0) >= svc.pricingOptions.length) {
      svc.selectedOption = svc.pricingOptions.length - 1;
    }
    const sel = svc.pricingOptions[svc.selectedOption || 0];
    if (sel) {
      svc.totalAppointments = sel.totalAppointments;
      svc.serviceCost = sel.serviceCost;
      svc.proRevenue = sel.proRevenue;
      if (sel.discountPercent !== undefined) svc.discountPercent = sel.discountPercent;
    }
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  const handleGeneratePricingOptions = (loc: string, date: string, idx: number) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const svc = updated.services[loc][date].services[idx];
    const generated = generatePricingOptionsForService(svc);
    if (!generated || generated.length === 0) {
      // Fallback — add a single blank option
      svc.pricingOptions = [];
      handleAddPricingOption(loc, date, idx);
      return;
    }
    svc.pricingOptions = generated;
    svc.selectedOption = 0;
    updated.hasPricingOptions = true;
    const sel = svc.pricingOptions[0];
    svc.totalAppointments = sel.totalAppointments;
    svc.serviceCost = sel.serviceCost;
    svc.proRevenue = sel.proRevenue ?? svc.proRevenue;
    if (sel.discountPercent !== undefined) svc.discountPercent = sel.discountPercent;
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  // -----------------------------------------------------------------------
  // Custom line items (data.customLineItems: Array<{id, name, description?, amount}>)
  // -----------------------------------------------------------------------
  const handleAddCustomLineItem = () => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const items: any[] = Array.isArray(updated.customLineItems)
      ? [...updated.customLineItems]
      : [];
    items.push({
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      description: '',
      amount: 0,
    });
    updated.customLineItems = items;
    setEditedData({ ...updated });
    setDisplayData({ ...updated });
  };

  const handleEditCustomLineItem = (idx: number, field: string, value: any) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const items: any[] = Array.isArray(updated.customLineItems)
      ? [...updated.customLineItems]
      : [];
    if (!items[idx]) return;
    items[idx] = { ...items[idx], [field]: value };
    updated.customLineItems = items;
    setEditedData({ ...updated });
    setDisplayData({ ...updated });
  };

  const handleRemoveCustomLineItem = (idx: number) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const items: any[] = Array.isArray(updated.customLineItems)
      ? [...updated.customLineItems]
      : [];
    items.splice(idx, 1);
    updated.customLineItems = items;
    setEditedData({ ...updated });
    setDisplayData({ ...updated });
  };

  // -----------------------------------------------------------------------
  // Gratuity
  // -----------------------------------------------------------------------
  const handleGratuityTypeChange = (type: '' | 'percentage' | 'dollar') => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    if (!type) {
      updated.gratuityType = null;
      updated.gratuityValue = null;
    } else {
      updated.gratuityType = type;
      if (updated.gratuityValue == null) {
        updated.gratuityValue = type === 'percentage' ? 18 : 0;
      }
    }
    setEditedData({ ...updated });
    setDisplayData({ ...updated });
  };

  const handleGratuityValueChange = (value: number) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData, gratuityValue: value };
    setEditedData({ ...updated });
    setDisplayData({ ...updated });
  };

  // -----------------------------------------------------------------------
  // Auto-recurring discount control
  //
  // `auto` — let `recalculateServiceTotals` decide based on date count.
  //          We clear the explicit flags so the auto-calc rule fires.
  // `off`  — staff has explicitly turned the discount off. We set
  //          `isAutoRecurring: false` and clear `autoRecurringDiscount`.
  // `fixed` — staff picked a specific %. We set `isAutoRecurring: true`
  //          and `autoRecurringDiscount: <value>`.
  //
  // Either way, we re-run `recalculateServiceTotals` so the per-service
  // discount math fires immediately and the pricing summary updates.
  // -----------------------------------------------------------------------
  const handleChangeAutoRecurring = (
    mode: 'auto' | 'off' | 'fixed',
    value?: number
  ) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    if (mode === 'auto') {
      // Drop both flags so the recalculator's date-count rule decides.
      delete updated.isAutoRecurring;
      delete updated.autoRecurringDiscount;
    } else if (mode === 'off') {
      updated.isAutoRecurring = false;
      updated.autoRecurringDiscount = undefined;
    } else {
      updated.isAutoRecurring = true;
      updated.autoRecurringDiscount = value || 15;
    }
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  // Resolve the current admin "mode" for the picker from the data shape.
  // V1 leaves `isAutoRecurring === undefined` to mean "auto", `false` to mean
  // "off", and `true + autoRecurringDiscount` to mean "fixed".
  const autoRecurringMode: 'auto' | 'off' | 'fixed' =
    displayData?.isAutoRecurring === false
      ? 'off'
      : displayData?.isAutoRecurring === true &&
        typeof displayData?.autoRecurringDiscount === 'number'
      ? 'fixed'
      : 'auto';

  // -----------------------------------------------------------------------
  // Office address per location
  // -----------------------------------------------------------------------
  const handleSetOfficeAddress = (loc: string, address: string) => {
    if (!editedData || !isEditing) return;
    const updated = { ...editedData };
    const existing =
      (updated.officeLocations && typeof updated.officeLocations === 'object'
        ? { ...updated.officeLocations }
        : {}) as { [k: string]: string };
    if (address.trim()) {
      existing[loc] = address.trim();
    } else {
      delete existing[loc];
    }
    updated.officeLocations = Object.keys(existing).length > 0 ? existing : undefined;
    // Clear legacy single-address field if multi-location is in play
    if (updated.officeLocations) updated.officeLocation = undefined;
    setEditedData({ ...updated });
    setDisplayData({ ...updated });
  };

  // Google Places autocomplete — wires up while editingOfficeFor is set
  useEffect(() => {
    if (!isEditing || !editingOfficeFor) return;
    const inputId = `office-edit-${editingOfficeFor}`;
    const tryInit = () => {
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      const gmaps = (window as any).google?.maps?.places;
      if (!input || !gmaps) return false;
      try {
        const ac = new gmaps.Autocomplete(input, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place?.formatted_address) {
            handleSetOfficeAddress(editingOfficeFor, place.formatted_address);
          }
        });
        return true;
      } catch (err) {
        console.warn('Places autocomplete init failed:', err);
        return false;
      }
    };
    if (tryInit()) return;
    const tick = setInterval(() => {
      if (tryInit()) clearInterval(tick);
    }, 200);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOfficeFor, isEditing]);

  const handleDateChange = (loc: string, oldDate: string, newDate: string) => {
    if (!editedData || !isEditing || !newDate || newDate === oldDate) return;
    const updated = { ...editedData };
    const block = updated.services[loc][oldDate];
    if (!block) return;
    if (updated.services[loc][newDate]) {
      // merge
      updated.services[loc][newDate].services.push(...block.services);
    } else {
      updated.services[loc][newDate] = { ...block };
    }
    // Re-tag each service's `date` field for downstream consumers
    updated.services[loc][newDate].services.forEach((s: any) => (s.date = newDate));
    delete updated.services[loc][oldDate];
    rebuildEventDates(updated);
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
  };

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------
  const toggleEditMode = () => {
    if (showingOriginal) {
      setShowingOriginal(false);
      setDisplayData({ ...editedData, customization: currentProposal?.customization });
    }
    setIsEditing(!isEditing);
    if (!isEditing) {
      const cur = currentProposal?.data || editedData;
      setEditedData(
        recalculateServiceTotals(JSON.parse(JSON.stringify(cur)))
      );
    }
  };

  const handleSaveChanges = async () => {
    if (!id || !editedData) return;
    try {
      setIsSavingChanges(true);
      const gratuityType = editedData?.gratuityType || null;
      const gratuityValue = editedData?.gratuityValue ?? null;
      const recalc = recalculateServiceTotals(editedData);
      if (gratuityType) recalc.gratuityType = gratuityType;
      if (gratuityValue !== null) recalc.gratuityValue = gratuityValue;

      if (recalc.officeLocations && recalc.locations) {
        const cleaned: { [k: string]: string } = {};
        recalc.locations.forEach((loc: string) => {
          if (recalc.officeLocations?.[loc]) cleaned[loc] = recalc.officeLocations[loc];
        });
        recalc.officeLocations = Object.keys(cleaned).length > 0 ? cleaned : undefined;
      }

      // Extract pricing options for the dedicated columns
      const pricingOptions: any = {};
      const selectedOptions: any = {};
      Object.entries(recalc.services || {}).forEach(([loc, locData]: [string, any]) => {
        Object.entries(locData).forEach(([date, dateData]: [string, any]) => {
          dateData.services?.forEach((service: any, idx: number) => {
            if (service.pricingOptions && service.pricingOptions.length > 0) {
              const key = `${loc}-${date}-${idx}`;
              pricingOptions[key] = service.pricingOptions;
              selectedOptions[key] = service.selectedOption || 0;
            }
          });
        });
      });

      await updateProposal(id, {
        data: recalc,
        customization: editedData?.customization || currentProposal?.customization,
        pricingOptions,
        selectedOptions,
        hasPricingOptions: recalc.hasPricingOptions || false,
        changeSource: 'staff',
      });

      setIsEditing(false);
      const cust = editedData?.customization || currentProposal?.customization;
      setEditedData({ ...recalc, customization: cust });
      setDisplayData({ ...recalc, customization: cust });
      await fetchChangeSets();
    } catch (err) {
      console.error('Save failed:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSavingChanges(false);
    }
  };

  const toggleVersion = () => {
    if (showingOriginal) {
      setDisplayData({ ...editedData, customization: currentProposal?.customization });
    } else if (currentProposal?.hasChanges && originalData) {
      const orig = recalculateServiceTotals(originalData);
      setDisplayData({ ...orig, customization: currentProposal?.customization });
    } else {
      return;
    }
    setShowingOriginal(!showingOriginal);
    setIsEditing(false);
  };

  // -----------------------------------------------------------------------
  // Admin actions
  // -----------------------------------------------------------------------
  const copyShareLink = async () => {
    if (!id) return;
    const url = getProposalUrl(id, true, currentProposal?.slug);
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy link');
    }
  };

  const handleDownload = async () => {
    if (!displayData) return;
    try {
      setIsDownloading(true);
      const safe = (displayData.clientName || 'proposal')
        .replace(/\s+/g, '-')
        .toLowerCase();
      await generatePDF('proposal-content', `${safe}-proposal.pdf`);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const openSendModal = () => {
    if (!displayData) return;
    setSendName(displayData.clientName || '');
    setSendEmail(currentProposal?.clientEmail || '');
    setSendNote(
      `Hi ${displayData.clientName || 'there'},\n\n` +
        `I'm excited to share your custom wellness proposal. Please review and let me know if you'd like any adjustments.\n\n` +
        `Best,\nThe Shortcut Team`
    );
    setShowSendModal(true);
  };

  const handleSendToClient = async () => {
    if (!id || !sendEmail.trim()) {
      alert('Please enter a client email');
      return;
    }
    try {
      setIsSending(true);
      if (sendEmail !== currentProposal?.clientEmail) {
        await supabase
          .from('proposals')
          .update({ client_email: sendEmail })
          .eq('id', id);
        if (currentProposal) currentProposal.clientEmail = sendEmail;
      }
      const res = await fetch(`${config.supabase.url}/functions/v1/proposal-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientEmail: sendEmail,
          clientName: sendName.trim() || displayData.clientName,
          shareNote: sendNote.trim(),
        }),
      });
      if (!res.ok) {
        const ed = await res.json();
        throw new Error(ed.error || 'Failed to send');
      }
      setShowSendModal(false);
      setShowSendSuccess(true);
      setTimeout(() => setShowSendSuccess(false), 4000);
    } catch (err) {
      console.error('Send failed:', err);
      alert('Failed to send proposal. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // -----------------------------------------------------------------------
  // Logo upload
  // -----------------------------------------------------------------------
  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo must be < 5MB');
      return;
    }
    if (!user) {
      setLogoUploadError('Sign in required to upload');
      return;
    }
    setLogoUploadError(null);
    setIsUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `logo-${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('client-logos')
        .upload(filename, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filename);
      setEditedData((prev: any) => ({ ...prev, clientLogoUrl: pub.publicUrl }));
      setDisplayData((prev: any) => ({ ...prev, clientLogoUrl: pub.publicUrl }));
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      setLogoUploadError(err?.message || 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // -----------------------------------------------------------------------
  // Phase 3D — admin polish handlers
  // -----------------------------------------------------------------------

  /** Account-team override — change which Shortcut staffer the client sees
   *  as their proposal owner. Persists to `data.accountTeamMemberEmail` and
   *  saves immediately so it sticks even outside Edit mode. */
  const handleChangeAccountOwner = async (email: string) => {
    if (!id) return;
    try {
      const next = { ...(editedData || displayData), accountTeamMemberEmail: email };
      setEditedData((prev: any) => ({ ...(prev || displayData), accountTeamMemberEmail: email }));
      setDisplayData((prev: any) => ({ ...(prev || displayData), accountTeamMemberEmail: email }));
      await supabase.from('proposals').update({ data: next }).eq('id', id);
    } catch (err) {
      console.error('Failed to set account owner:', err);
    }
  };

  /** Force-approve from admin. Skips the client-confirmation flow. */
  const handleForceApprove = async () => {
    if (!id) return;
    if (
      !window.confirm(
        'Force-approve this proposal? This locks in the current data without a client click.'
      )
    )
      return;
    try {
      setIsStatusUpdating(true);
      await supabase
        .from('proposals')
        .update({
          status: 'approved',
          pending_review: false,
          has_changes: false,
          change_source: 'staff',
          reviewed_by: user?.email || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      await getProposal(id);
      try {
        await fetch('/.netlify/functions/proposal-event-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'approve',
            proposalId: id,
            clientName: displayData?.clientName || 'Unknown',
            clientEmail: currentProposal?.clientEmail,
            proposalType: 'event',
            totalCost: grandTotal,
            eventDates: displayData?.eventDates || [],
            locations: displayData?.locations || [],
          }),
        });
      } catch (notifyErr) {
        console.warn('Force-approve notification failed (non-fatal):', notifyErr);
      }
    } catch (err) {
      console.error('Force-approve failed:', err);
      alert('Failed to force-approve.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  /** Mark proposal as rejected — useful for archiving a stalled deal. */
  const handleMarkRejected = async () => {
    if (!id) return;
    if (!window.confirm('Mark this proposal as rejected/closed?')) return;
    try {
      setIsStatusUpdating(true);
      await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          pending_review: false,
          reviewed_by: user?.email || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      await getProposal(id);
    } catch (err) {
      console.error('Mark-rejected failed:', err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  /** Open the client-facing version in a new tab for spot-checking. */
  const handleViewAsClient = () => {
    if (!id) return;
    const url = `${window.location.pathname.replace(/^\//, '')}`;
    // Use the existing slug-resolver shared URL pattern via getProposalUrl
    const target = getProposalUrl(id, true, currentProposal?.slug);
    window.open(target.includes('?') ? `${target}&redesign=1` : `${target}?redesign=1`, '_blank');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = url; // keep tsc happy if minifier warns
  };

  /** Mark a single changeset as Approved / Rejected. Updates the proposal
   *  row's review fields + the changeset status badge. */
  const handleReviewChangeset = async (
    changeSet: ProposalChangeSet,
    decision: 'approved' | 'rejected'
  ) => {
    if (!id) return;
    setReviewBusyFor(changeSet.id);
    try {
      await supabase
        .from('proposals')
        .update({
          status:
            decision === 'approved' && changeSet.changeSource === 'client'
              ? 'approved'
              : decision === 'rejected'
              ? 'rejected'
              : currentProposal?.status,
          pending_review: false,
          reviewed_by: user?.email || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      await Promise.all([getProposal(id), fetchChangeSets()]);
    } catch (err) {
      console.error('Mark-reviewed failed:', err);
    } finally {
      setReviewBusyFor(null);
    }
  };

  /** Save admin-only notes. Separate from Save Changes; doesn't recalculate
   *  service totals. Flips pending_review so staff oncall sees the update. */
  const handleSaveAdminNotes = async () => {
    if (!id) return;
    setAdminNotesSaving(true);
    try {
      await supabase
        .from('proposals')
        .update({ notes: adminNotes, pending_review: true })
        .eq('id', id);
      await getProposal(id);
      setAdminNotesSaved(true);
      setTimeout(() => setAdminNotesSaved(false), 3000);
    } catch (err) {
      console.error('Save notes failed:', err);
    } finally {
      setAdminNotesSaving(false);
    }
  };

  /** Toggle a collapsible section open/closed. */
  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  /** Bulk-swap every service of type X across the proposal to type Y.
   *  Handy for "switch all massage to facial across all dates / locations". */
  const handleBulkSwap = () => {
    if (!editedData || !isEditing) return;
    if (!bulkSwapFrom) {
      alert('Pick a source service type.');
      return;
    }
    if (bulkSwapFrom === bulkSwapTo) {
      alert('Source and target must differ.');
      return;
    }
    const updated = { ...editedData };
    Object.entries(updated.services || {}).forEach(([loc, ld]: [string, any]) => {
      Object.entries(ld).forEach(([date, dd]: [string, any]) => {
        (dd.services || []).forEach((s: any, idx: number) => {
          if (s.serviceType === bulkSwapFrom) {
            const defaults = SERVICE_DEFAULTS[bulkSwapTo] || {};
            const next: any = {
              ...s,
              serviceType: bulkSwapTo,
              ...defaults,
              date: s.date || date,
              location: s.location || loc,
              discountPercent: s.discountPercent || 0,
            };
            const { totalAppointments, serviceCost, proRevenue } =
              calculateServiceResults(next);
            next.totalAppointments = totalAppointments;
            next.serviceCost = serviceCost;
            next.proRevenue = proRevenue;
            updated.services[loc][date].services[idx] = next;
          }
        });
      });
    });
    const recalc = recalculateServiceTotals(updated);
    setEditedData({ ...recalc, customization: currentProposal?.customization });
    setDisplayData({ ...recalc, customization: currentProposal?.customization });
    setBulkSwapOpen(false);
  };

  /** Test-send: dispatches the proposal email to a staff address so we can
   *  preview the rendered email without spamming the real client. Uses the
   *  same /functions/v1/proposal-share endpoint but to a custom recipient. */
  const handleTestSend = async () => {
    if (!id || !testSendEmail.trim()) {
      alert('Enter a staff email.');
      return;
    }
    setTestSendBusy(true);
    try {
      const res = await fetch(`${config.supabase.url}/functions/v1/proposal-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientEmail: testSendEmail.trim(),
          clientName: `[TEST] ${displayData?.clientName || 'Proposal preview'}`,
          shareNote: '[Internal test send — not the real client copy]',
        }),
      });
      if (!res.ok) throw new Error('Test send failed');
      setTestSendSent(true);
      setTimeout(() => setTestSendSent(false), 4000);
      setTestSendOpen(false);
    } catch (err) {
      console.error('Test send failed:', err);
      alert('Test send failed. Check the staff email + try again.');
    } finally {
      setTestSendBusy(false);
    }
  };

  // -----------------------------------------------------------------------
  // Invoice flow (V2-styled trigger, reuses existing Stripe modal + function)
  // -----------------------------------------------------------------------
  const handleSendInvoice = async (data: {
    clientName: string;
    clientEmail: string;
    lineItems: InvoiceLineItem[];
    daysUntilDue: number;
    sendToClient?: boolean;
  }) => {
    if (!id) return;
    try {
      setInvoiceLoading(true);
      setInvoiceError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch('/.netlify/functions/create-stripe-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          lineItems: data.lineItems.map((li) => ({
            description: li.description,
            amount: li.amount,
          })),
          daysUntilDue: data.daysUntilDue,
          sendToClient: data.sendToClient ?? true,
        }),
      });
      const text = await res.text();
      let result: any;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(`Bad server response (${res.status})`);
      }
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create invoice');
      }
      setInvoiceUrl(result.invoiceUrl);
      setInvoicePdf(result.invoicePdf || null);
      setInvoiceStatus(result.status || 'open');
      setShowInvoiceConfirm(false);
      if (result.invoiceUrl) window.open(result.invoiceUrl, '_blank');
      if (id) await getProposal(id);
    } catch (err) {
      console.error('Invoice send failed:', err);
      setInvoiceError(err instanceof Error ? err.message : 'Failed to send invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleCopyInvoiceLink = async () => {
    if (!invoiceUrl) return;
    try {
      await navigator.clipboard.writeText(invoiceUrl);
      setInvoiceLinkCopied(true);
      setTimeout(() => setInvoiceLinkCopied(false), 2000);
    } catch {
      window.open(invoiceUrl, '_blank');
    }
  };

  const handleRemoveLogo = () => {
    setEditedData((prev: any) => ({ ...prev, clientLogoUrl: '' }));
    setDisplayData((prev: any) => ({ ...prev, clientLogoUrl: '' }));
  };

  // -----------------------------------------------------------------------
  // Multi-option management
  // -----------------------------------------------------------------------
  const handleCreateOption = async () => {
    if (!id || !currentProposal || !displayData) return;
    setIsCreatingOption(true);
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) throw new Error('Sign in required');
      const { data: cp } = await supabase
        .from('proposals')
        .select('proposal_group_id')
        .eq('id', id)
        .single();
      const groupId = cp?.proposal_group_id || id;
      const { data: existing } = await supabase
        .from('proposals')
        .select('option_order')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`);
      const maxOrder =
        existing?.reduce(
          (m, o) => (o.option_order !== null && o.option_order > m ? o.option_order : m),
          0
        ) || 0;
      const nextOrder = maxOrder + 1;

      const dupPricing: any = {};
      const dupSelected: any = {};
      Object.entries(displayData.services || {}).forEach(
        ([loc, ld]: [string, any]) => {
          Object.entries(ld).forEach(([dt, dd]: [string, any]) => {
            dd.services?.forEach((s: any, i: number) => {
              if (s.pricingOptions?.length > 0) {
                const k = `${loc}-${dt}-${i}`;
                dupPricing[k] = s.pricingOptions;
                dupSelected[k] = s.selectedOption || 0;
              }
            });
          });
        }
      );

      const payload = {
        data: displayData,
        customization: currentProposal.customization,
        is_editable: true,
        user_id: u.id,
        status: 'draft',
        pending_review: false,
        has_changes: false,
        original_data: displayData,
        client_name:
          displayData.clientName?.trim() ||
          currentProposal.data?.clientName?.trim() ||
          '',
        notes: '',
        proposal_group_id: groupId,
        option_name: `Option ${nextOrder}`,
        option_order: nextOrder,
        client_email: currentProposal.clientEmail,
        client_logo_url: currentProposal.clientLogoUrl,
        pricing_options: dupPricing,
        selected_options: dupSelected,
        has_pricing_options: Object.keys(dupPricing).length > 0,
      };
      if (!cp?.proposal_group_id) {
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: 'Option 1',
            option_order: 1,
          })
          .eq('id', id);
      }
      const { data: newP, error } = await supabase
        .from('proposals')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await fetchProposalOptions();
      navigate(`/proposal/${newP.id}${location.search}`);
    } catch (err) {
      console.error('Create option failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to create option');
    } finally {
      setIsCreatingOption(false);
    }
  };

  const handleReorderOption = async (optId: string, newOrder: number) => {
    try {
      await supabase
        .from('proposals')
        .update({ option_order: newOrder })
        .eq('id', optId);
      await fetchProposalOptions();
    } catch (err) {
      console.error('Reorder failed:', err);
    }
  };

  const handleUpdateOptionName = async (optId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await supabase
        .from('proposals')
        .update({ option_name: newName.trim() })
        .eq('id', optId);
      await fetchProposalOptions();
      setEditingOptionName(null);
      setOptionNameInput('');
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleRemoveOption = async (optId: string, optName: string) => {
    if (
      !window.confirm(
        `Remove "${optName || 'this option'}" from the group? The proposal stays but is unlinked.`
      )
    )
      return;
    try {
      await supabase
        .from('proposals')
        .update({ proposal_group_id: null, option_name: null, option_order: null })
        .eq('id', optId);
      await fetchProposalOptions();
      setShowDeleteOptionConfirm(null);
    } catch (err) {
      console.error('Remove option failed:', err);
    }
  };

  const handleOpenLinkModal = async () => {
    setShowLinkModal(true);
    setSelectedToLink([]);
    setLinkSearch('');
    if (!id) return;
    try {
      const { data: cp } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();
      const groupId = cp?.proposal_group_id || cp?.id;
      const { data: all } = await supabase
        .from('proposals')
        .select(
          'id, client_name, created_at, proposal_group_id, option_name, status, proposal_type'
        )
        .neq('id', id)
        .order('created_at', { ascending: false });
      const av = (all || []).filter((p: any) => {
        if (!p.proposal_group_id) return true;
        if (p.proposal_group_id === groupId) return false;
        return true;
      });
      setAvailableProposals(av);
    } catch (err) {
      console.error('Fetch available failed:', err);
      setAvailableProposals([]);
    }
  };

  const handleLinkProposals = async () => {
    if (!id || selectedToLink.length === 0) return;
    setIsLinking(true);
    try {
      const { data: cp } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();
      const groupId = cp?.proposal_group_id || cp?.id;
      if (!cp?.proposal_group_id) {
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: 'Option 1',
            option_order: 1,
          })
          .eq('id', id);
      }
      const { data: existing } = await supabase
        .from('proposals')
        .select('option_order')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`);
      const maxOrder =
        existing?.reduce(
          (m, o) => (o.option_order !== null && o.option_order > m ? o.option_order : m),
          0
        ) || 0;
      for (let i = 0; i < selectedToLink.length; i++) {
        const pid = selectedToLink[i];
        const order = maxOrder + i + 1;
        const { data: p } = await supabase
          .from('proposals')
          .select('option_name')
          .eq('id', pid)
          .single();
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: p?.option_name || `Option ${order}`,
            option_order: order,
          })
          .eq('id', pid);
      }
      await fetchProposalOptions();
      setShowLinkModal(false);
      setSelectedToLink([]);
    } catch (err) {
      console.error('Link failed:', err);
      alert('Failed to link proposals');
    } finally {
      setIsLinking(false);
    }
  };

  const filteredLink = availableProposals.filter((p: any) => {
    if (!linkSearch) return true;
    const s = linkSearch.toLowerCase();
    return (
      p.client_name?.toLowerCase().includes(s) ||
      p.id?.toLowerCase().includes(s) ||
      p.option_name?.toLowerCase().includes(s)
    );
  });

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------
  const stats = useMemo(() => {
    const services = displayData?.services || {};
    const locs = Object.keys(services).length;
    let dates = 0;
    let appts = 0;
    Object.values(services).forEach((byDate: any) => {
      Object.values(byDate || {}).forEach((dd: any) => {
        dates += 1;
        (dd?.services || []).forEach((s: any) => {
          const a = Number(s?.totalAppointments) || 0;
          appts += a;
        });
      });
    });
    return { locs, dates, appts };
  }, [displayData]);

  // Service-type mix — drives the same Phase-5 conditional sections as the
  // client viewer (Why Shortcut / ServiceDetails / mindfulness + CLE blocks).
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
  const isMindfulnessLike = (s: string) =>
    s === 'mindfulness' || s.startsWith('mindfulness-');
  const hasMindfulness = serviceTypes.some(isMindfulnessLike);
  const isMindfulnessOnly =
    serviceTypes.length > 0 && serviceTypes.every(isMindfulnessLike);
  const hasCLE = serviceTypes.some(
    (s) => s === 'mindfulness-cle' || s.startsWith('mindfulness-cle')
  );

  const pricingRows = useMemo(() => {
    const rows: Array<{
      key: string;
      type: string;
      location: string;
      date: string;
      lineCost: number;
      proRevenue: number;
      margin: number;
      marginPct: number;
    }> = [];
    Object.entries(displayData?.services || {}).forEach(([loc, ld]: [string, any]) => {
      Object.entries(ld || {}).forEach(([dt, dd]: [string, any]) => {
        (dd?.services || []).forEach((s: any, i: number) => {
          // Effective revenue + pro-pay: prefer the selected pricing option if
          // present, otherwise use the base service's stored fields.
          let revenue = Number(s.serviceCost) || 0;
          let proPay = Number(s.proRevenue) || 0;
          if (Array.isArray(s.pricingOptions) && s.pricingOptions.length > 0) {
            const sel = s.pricingOptions[s.selectedOption || 0];
            if (sel) {
              revenue = Number(sel.serviceCost) || revenue;
              proPay = Number(sel.proRevenue) || proPay;
            }
          }
          const margin = revenue - proPay;
          const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
          rows.push({
            key: `${loc}-${dt}-${i}`,
            type: s.serviceType,
            location: loc,
            date: dt,
            lineCost: revenue,
            proRevenue: proPay,
            margin,
            marginPct,
          });
        });
      });
    });
    return rows;
  }, [displayData]);

  const servicesSubtotal = useMemo(
    () => pricingRows.reduce((sum, r) => sum + r.lineCost, 0),
    [pricingRows]
  );

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

  const subtotal = servicesSubtotal + customItemsTotal;

  // Admin-only internal financials — totals across all services.
  const totalProCost = useMemo(
    () => pricingRows.reduce((sum, r) => sum + r.proRevenue, 0),
    [pricingRows]
  );
  const totalMargin = servicesSubtotal - totalProCost;
  const totalMarginPct = servicesSubtotal > 0 ? (totalMargin / servicesSubtotal) * 100 : 0;

  const gratuity = useMemo(() => {
    const type = displayData?.gratuityType as string | null | undefined;
    const v = displayData?.gratuityValue as number | null | undefined;
    if (!type || v == null) return null;
    const amount = type === 'percentage' ? (subtotal * v) / 100 : v;
    return { type, value: v, amount };
  }, [displayData?.gratuityType, displayData?.gratuityValue, subtotal]);

  const grandTotal = subtotal + (gratuity?.amount || 0);

  // -----------------------------------------------------------------------
  // Render — loading / error guards
  // -----------------------------------------------------------------------
  if (isLoading || loading) {
    return (
      <div
        className="pv-page"
        style={{ minHeight: '100vh', background: T.beige, padding: 80 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }
  if (loadError || error) {
    return (
      <div
        className="pv-page"
        style={{
          minHeight: '100vh',
          background: T.beige,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
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
          <p style={{ color: T.fgMuted, fontFamily: T.fontD, fontSize: 14 }}>
            {loadError || error}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: T.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Return home
          </button>
        </div>
      </div>
    );
  }
  if (!displayData || !displayData.services) {
    return (
      <div
        className="pv-page"
        style={{
          minHeight: '100vh',
          background: T.beige,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const clientName = displayData.clientName || currentProposal?.clientName || 'Client';
  const proposalLabel = currentProposal?.slug
    ? currentProposal.slug
    : (id || '').slice(0, 8).toUpperCase();
  const contactFirst =
    displayData?.customization?.contactFirstName || displayData?.contactFirstName;
  const customNote = displayData?.customization?.customNote || '';
  const clientLogoUrl =
    displayData?.clientLogoUrl || currentProposal?.clientLogoUrl || null;
  const initial = (clientName[0] || '?').toUpperCase();

  const resolveOfficeAddress = (loc: string): string | null => {
    const per = displayData?.officeLocations;
    if (per && typeof per === 'object' && per[loc]) return per[loc];
    if (displayData?.officeLocation && typeof displayData.officeLocation === 'string')
      return displayData.officeLocation;
    return null;
  };

  // Status from DB row
  const status = (currentProposal?.status as any) || 'draft';

  return (
    <div
      className="pv-page"
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
            <span
              style={{
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 10,
                color: T.coral,
                background: 'rgba(255,80,80,0.10)',
                padding: '2px 8px',
                borderRadius: 999,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              Admin
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <StatusPill status={status} />
            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSavingChanges}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: T.coral,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: isSavingChanges ? 'wait' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
                  opacity: isSavingChanges ? 0.7 : 1,
                }}
              >
                <Save size={14} />
                {isSavingChanges ? 'Saving…' : 'Save changes'}
              </button>
            ) : (
              !showingOriginal && (
                <button
                  type="button"
                  onClick={toggleEditMode}
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
                >
                  <Edit size={14} />
                  Edit
                </button>
              )
            )}
            <button
              type="button"
              onClick={handleDownload}
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
        {/* Client logo banner (or upload control in edit mode) */}
        {isEditing ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              background: '#fff',
              borderRadius: 16,
              border: '1px dashed rgba(0,0,0,0.18)',
              marginBottom: 20,
              maxWidth: 480,
              minHeight: 96,
            }}
          >
            {clientLogoUrl ? (
              <>
                <img
                  src={clientLogoUrl}
                  alt={`${clientName} logo`}
                  style={{
                    maxHeight: 64,
                    maxWidth: 160,
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    background: 'transparent',
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 12,
                    color: T.coral,
                  }}
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: T.lightGray,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageIcon size={20} color={T.fgMuted} />
                </div>
                <div style={{ flex: 1 }}>
                  <Eyebrow>No logo on file</Eyebrow>
                  <div
                    style={{
                      fontFamily: T.fontD,
                      fontSize: 12,
                      color: T.fgMuted,
                      marginTop: 2,
                    }}
                  >
                    PNG/JPG, &lt; 5MB
                  </div>
                </div>
              </>
            )}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: T.navy,
                color: '#fff',
                borderRadius: 10,
                cursor: isUploadingLogo ? 'wait' : 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                marginLeft: 'auto',
                opacity: isUploadingLogo ? 0.7 : 1,
              }}
            >
              <Upload size={13} />
              {isUploadingLogo ? 'Uploading…' : clientLogoUrl ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFile}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        ) : clientLogoUrl ? (
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

        {logoUploadError && (
          <div
            style={{
              color: T.error,
              fontFamily: T.fontD,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {logoUploadError}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <Eyebrow>Prepared for · {proposalLabel}</Eyebrow>
          {(contactFirst || currentProposal?.clientEmail) && (
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.fgMuted,
                marginTop: 4,
              }}
            >
              {contactFirst && <span>{contactFirst} · </span>}
              {currentProposal?.clientEmail}
            </div>
          )}
        </div>

        {/* Editable client name */}
        {isEditing ? (
          <input
            type="text"
            value={editedData.clientName || ''}
            onChange={(e) => setTopLevelField('clientName', e.target.value)}
            placeholder="Client name"
            style={{
              width: '100%',
              maxWidth: 720,
              padding: '8px 12px',
              fontFamily: T.fontD,
              fontWeight: 800,
              fontSize: 48,
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              color: T.navy,
              background: '#fff',
              border: '1.5px dashed rgba(0,0,0,0.18)',
              borderRadius: 12,
              outline: 'none',
              marginBottom: 12,
            }}
          />
        ) : (
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
        )}
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
          Internal admin view. Toggle Edit to adjust services, dates, and pricing — then
          Save to push the change. Client-facing view stays read-only.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            maxWidth: 760,
          }}
        >
          <MiniStat label="Locations" value={stats.locs} accent="navy" />
          <MiniStat label="Event dates" value={stats.dates} accent="navy" />
          <MiniStat
            label="Appointments"
            value={stats.appts.toLocaleString('en-US')}
            accent="navy"
          />
          <MiniStat label="Total" value={formatCurrency(grandTotal)} accent="coral" />
        </div>
      </section>

      {/* ===== Banners ===== */}
      {showSendSuccess && (
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 24px 12px',
          }}
        >
          <div
            style={{
              background: 'rgba(30,158,106,.12)',
              border: '1px solid rgba(30,158,106,.3)',
              borderRadius: 12,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <CheckCircle2 size={20} color={T.success} />
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 14,
                fontWeight: 600,
                color: T.navy,
              }}
            >
              Proposal sent to client.
            </div>
          </div>
        </div>
      )}

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
        <main style={{ display: 'flex', flexDirection: 'column', gap: 36, minWidth: 0 }}>
          {/* Multi-option strip */}
          <ProposalOptionsBar
            options={proposalOptions}
            currentId={id || ''}
            queryString={location.search}
            isCreating={isCreatingOption}
            onCreate={handleCreateOption}
            onOpenLinkModal={handleOpenLinkModal}
            onReorder={handleReorderOption}
            onUpdateName={handleUpdateOptionName}
            onRemove={handleRemoveOption}
            editingName={editingOptionName}
            setEditingName={setEditingOptionName}
            nameInput={optionNameInput}
            setNameInput={setOptionNameInput}
            deleteConfirmId={showDeleteOptionConfirm}
            setDeleteConfirmId={setShowDeleteOptionConfirm}
            onNavigate={(targetId) => navigate(`/proposal/${targetId}${location.search}`)}
          />

          {/* Showing-original banner */}
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
                  Viewing original (pre-change) version
                </div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                    marginTop: 2,
                  }}
                >
                  Read-only. Click View current to return to the live data.
                </div>
              </div>
            </div>
          )}

          {/* Custom note (editable in edit mode) */}
          {(customNote || isEditing) && (
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
              <div style={{ minWidth: 0, flex: 1 }}>
                <Eyebrow>A note from Shortcut</Eyebrow>
                {isEditing ? (
                  <textarea
                    value={editedData?.customization?.customNote || ''}
                    onChange={(e) => setCustomizationField('customNote', e.target.value)}
                    placeholder="Optional intro note to your client"
                    rows={3}
                    style={{
                      width: '100%',
                      marginTop: 6,
                      padding: 10,
                      fontFamily: T.fontD,
                      fontSize: 14,
                      color: T.navy,
                      background: '#fff',
                      border: '1.5px solid rgba(0,0,0,0.08)',
                      borderRadius: 8,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                ) : (
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
                )}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {Object.entries(displayData.services || {}).map(
                ([loc, byDate]: [string, any]) => {
                  const office = resolveOfficeAddress(loc);
                  return (
                    <div key={loc}>
                      {/* Location header — clickable to collapse the date stack */}
                      <div
                        style={{
                          marginBottom: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <button
                            type="button"
                            onClick={() => toggleCollapsed(loc)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              color: 'inherit',
                            }}
                            title={collapsed[loc] ? 'Expand location' : 'Collapse location'}
                          >
                            <ChevronDown
                              size={14}
                              color={T.fgMuted}
                              style={{
                                transform: collapsed[loc] ? 'rotate(-90deg)' : 'none',
                                transition: 'transform .15s',
                              }}
                            />
                            <MapPin size={16} color={T.fgMuted} />
                            <Eyebrow>{loc}</Eyebrow>
                          </button>
                          <div
                            style={{
                              marginLeft: 24,
                              marginTop: 2,
                              fontFamily: T.fontD,
                              fontSize: 13,
                              color: T.fgMuted,
                              lineHeight: 1.4,
                            }}
                          >
                            {isEditing && editingOfficeFor === loc ? (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                }}
                              >
                                <input
                                  id={`office-edit-${loc}`}
                                  type="text"
                                  defaultValue={office || ''}
                                  placeholder="Start typing an address…"
                                  onBlur={(e) => {
                                    handleSetOfficeAddress(loc, e.target.value);
                                    setEditingOfficeFor(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSetOfficeAddress(
                                        loc,
                                        (e.target as HTMLInputElement).value
                                      );
                                      setEditingOfficeFor(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingOfficeFor(null);
                                    }
                                  }}
                                  autoFocus
                                  style={{
                                    flex: 1,
                                    minWidth: 240,
                                    padding: '6px 10px',
                                    fontFamily: T.fontD,
                                    fontSize: 13,
                                    color: T.navy,
                                    border: '1.5px solid rgba(0,152,173,0.4)',
                                    borderRadius: 8,
                                    outline: 'none',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingOfficeFor(null)}
                                  style={{
                                    padding: 4,
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: T.fgMuted,
                                  }}
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span>{office || (isEditing ? 'No office address on file' : '')}</span>
                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingOfficeFor(loc)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '3px 8px',
                                      background: '#fff',
                                      border: '1.5px solid rgba(0,0,0,0.1)',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      fontFamily: T.fontUi,
                                      fontWeight: 700,
                                      fontSize: 11,
                                      color: T.navy,
                                    }}
                                  >
                                    <Pencil size={11} />
                                    {office ? 'Edit address' : 'Add address'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleAddDay(loc)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              background: '#fff',
                              border: '1.5px solid rgba(0,0,0,0.1)',
                              borderRadius: 10,
                              cursor: 'pointer',
                              fontFamily: T.fontUi,
                              fontWeight: 700,
                              fontSize: 12,
                              color: T.navy,
                            }}
                          >
                            <Plus size={13} />
                            Add day
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          display: collapsed[loc] ? 'none' : 'flex',
                          flexDirection: 'column',
                          gap: 18,
                        }}
                      >
                        {Object.entries(byDate || {}).map(
                          ([date, dateData]: [string, any], dateIndex: number) => {
                            // Day-level totals — admin sees the raw appointments
                            // and revenue per date. Mirrors V1's "Day N Summary"
                            // pattern; auto-recurring discount math feeds in once
                            // Phase 3D ships that picker.
                            let dayAppts = 0;
                            let dayCost = 0;
                            let hasUnlimited = false;
                            (dateData?.services || []).forEach((s: any) => {
                              const a = s?.totalAppointments;
                              if (a === 'unlimited' || a === '∞') {
                                hasUnlimited = true;
                              } else {
                                dayAppts += Number(a) || 0;
                              }
                              dayCost += Number(s?.serviceCost) || 0;
                            });
                            return (
                            <div key={date}>
                              {/* Date header */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: 8,
                                  gap: 8,
                                  flexWrap: 'wrap',
                                }}
                              >
                                {isEditing ? (
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    <input
                                      type="date"
                                      value={formatDateForInput(date)}
                                      onChange={(e) =>
                                        handleDateChange(loc, date, e.target.value)
                                      }
                                      style={{
                                        padding: '6px 10px',
                                        border: '1.5px solid rgba(0,0,0,0.12)',
                                        borderRadius: 8,
                                        fontFamily: T.fontUi,
                                        fontSize: 13,
                                        color: T.navy,
                                        background: '#fff',
                                      }}
                                    />
                                    {(date === 'TBD' || date.startsWith('TBD')) && (
                                      <span
                                        style={{
                                          fontFamily: T.fontUi,
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color: '#8C5A07',
                                          background: 'rgba(254,220,100,.4)',
                                          padding: '2px 8px',
                                          borderRadius: 999,
                                          textTransform: 'uppercase',
                                          letterSpacing: '.08em',
                                        }}
                                      >
                                        TBD
                                      </span>
                                    )}
                                  </div>
                                ) : (
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
                                )}
                                {isEditing && (
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleAddService(loc, date)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '5px 10px',
                                        background: '#fff',
                                        border: '1.5px solid rgba(0,0,0,0.1)',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontFamily: T.fontUi,
                                        fontWeight: 700,
                                        fontSize: 11,
                                        color: T.navy,
                                      }}
                                    >
                                      <Plus size={12} />
                                      Add service
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDay(loc, date)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '5px 10px',
                                        background: '#fff',
                                        border: '1.5px solid rgba(255,80,80,0.25)',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontFamily: T.fontUi,
                                        fontWeight: 700,
                                        fontSize: 11,
                                        color: T.coral,
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      Remove day
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 14,
                                }}
                              >
                                {(dateData?.services || []).map(
                                  (service: any, idx: number) => (
                                    <ServiceBlock
                                      key={`${loc}-${date}-${idx}`}
                                      service={service}
                                      location={loc}
                                      date={date}
                                      index={idx}
                                      isEditing={isEditing}
                                      onFieldChange={(field, value) =>
                                        handleFieldChange(
                                          ['services', loc, date, 'services', idx, field as string],
                                          value
                                        )
                                      }
                                      onSelectPricingOption={(optIdx) =>
                                        handleFieldChange(
                                          ['services', loc, date, 'services', idx, 'selectedOption'],
                                          optIdx
                                        )
                                      }
                                      onEditPricingOption={(optIdx, f, v) =>
                                        handleEditPricingOption(loc, date, idx, optIdx, f as string, v)
                                      }
                                      onAddPricingOption={() =>
                                        handleAddPricingOption(loc, date, idx)
                                      }
                                      onRemovePricingOption={(optIdx) =>
                                        handleRemovePricingOption(loc, date, idx, optIdx)
                                      }
                                      onGeneratePricingOptions={() =>
                                        handleGeneratePricingOptions(loc, date, idx)
                                      }
                                      onChangeServiceType={(t) =>
                                        handleServiceTypeChange(loc, date, idx, t)
                                      }
                                      onChangeMassageType={(t) =>
                                        handleFieldChange(
                                          ['services', loc, date, 'services', idx, 'massageType'],
                                          t
                                        )
                                      }
                                      onChangeNailsType={(t) =>
                                        handleNailsTypeChange(loc, date, idx, t)
                                      }
                                      onChangeMindfulnessType={(t) =>
                                        handleMindfulnessTypeChange(loc, date, idx, t)
                                      }
                                      onChangeMindfulnessFormat={(f) =>
                                        handleFieldChange(
                                          [
                                            'services',
                                            loc,
                                            date,
                                            'services',
                                            idx,
                                            'mindfulnessFormat',
                                          ],
                                          f
                                        )
                                      }
                                      onRemoveService={() =>
                                        handleRemoveService(loc, date, idx)
                                      }
                                    />
                                  )
                                )}
                              </div>
                              {(dateData?.services || []).length > 0 && (
                                <div style={{ marginTop: 12 }}>
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
                                </div>
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

          {/* Bulk service-type swap — admin power tool. Only visible in edit
              mode + when there's at least one service to swap. */}
          {isEditing && pricingRows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  // Default the "from" picker to whatever the most common type is.
                  const counts: Record<string, number> = {};
                  pricingRows.forEach((r) => {
                    counts[r.type] = (counts[r.type] || 0) + 1;
                  });
                  const top = Object.entries(counts).sort(
                    (a, b) => b[1] - a[1]
                  )[0];
                  setBulkSwapFrom(top ? top[0] : '');
                  setBulkSwapOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  background: '#fff',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 12,
                  color: T.navy,
                }}
              >
                <Sparkles size={13} />
                Bulk swap service type
              </button>
            </div>
          )}

          {/* Phase 5 marketing sections — mirror the client viewer so admins
              see the full payload they're about to ship. */}
          {serviceTypes.length > 0 && (
            <WhyShortcutSection serviceTypes={serviceTypes} />
          )}
          {(() => {
            const detail = serviceTypes.filter((s) => !isMindfulnessLike(s));
            return detail.length > 0 ? (
              <ServiceDetailsSection serviceTypes={detail} />
            ) : null;
          })()}
          {hasMindfulness && <ParticipantBenefitsSection />}
          {hasCLE && <CLEOutlineSection />}
          {hasCLE && <CLEAccreditationSection />}
          {hasMindfulness && <AdditionalResourcesSection />}

          {/* Service agreement preview — same V2 collapsed-by-default card the
              client sees, so staff can sanity-check the partner-name copy. */}
          <ServiceAgreementCard clientName={clientName} />

          {/* Event-day summary */}
          <EventDaySummaryCard
            servicesByLocation={displayData.services || {}}
            rows={pricingRows.map((r) => ({
              key: r.key,
              serviceType: r.type,
              location: r.location,
              date: r.date,
              unitCost: r.lineCost,
              lineCost: r.lineCost,
              frequency: 1,
              included: true,
            }))}
          />

          {/* Pricing extras (admin only, edit mode) */}
          {isEditing && (
            <PricingExtrasEditor
              customLineItems={customLineItems}
              onAddItem={handleAddCustomLineItem}
              onEditItem={handleEditCustomLineItem}
              onRemoveItem={handleRemoveCustomLineItem}
              gratuityType={
                (displayData?.gratuityType as 'percentage' | 'dollar' | null) || null
              }
              gratuityValue={(displayData?.gratuityValue as number | null) ?? null}
              onChangeGratuityType={handleGratuityTypeChange}
              onChangeGratuityValue={handleGratuityValueChange}
              autoRecurringMode={autoRecurringMode}
              autoRecurringDiscount={displayData?.autoRecurringDiscount}
              autoRecurringApplied={displayData?.autoRecurringDiscount}
              autoRecurringSavings={displayData?.autoRecurringSavings}
              onChangeAutoRecurring={handleChangeAutoRecurring}
            />
          )}

          {/* Pricing summary */}
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
              Current proposal totals
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                marginBottom: 24,
              }}
            >
              {pricingRows.map((row) => (
                <div
                  key={row.key}
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
                      alignItems: 'baseline',
                      gap: 10,
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
                      {SERVICE_DISPLAY[row.type] || row.type}
                    </span>
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
                <span style={{ color: '#fff' }}>{formatCurrency(subtotal)}</span>
              </div>
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

              {/* ---- Internal financials (admin-only) ----
                  Mirrors the V1 ProposalViewer pattern: Pro Revenue / Net Profit
                  / Profit Margin appear inside the same dark Event Summary box
                  as additional rows after Total. The "Admin only" eyebrow makes
                  the boundary clear so staff don't confuse it with client copy. */}
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Eyebrow color="rgba(255,255,255,0.55)">Internal · admin only</Eyebrow>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: T.fontD,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  <span>Pro revenue (paid to pros)</span>
                  <span style={{ color: '#fff' }}>{formatCurrency(totalProCost)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: T.fontD,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  <span>Net profit</span>
                  <span
                    style={{
                      color: totalMargin >= 0 ? T.aqua : T.coral,
                      fontWeight: 700,
                    }}
                  >
                    {formatCurrency(totalMargin)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: T.fontD,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  <span>Profit margin</span>
                  <span
                    style={{
                      color: totalMargin >= 0 ? T.aqua : T.coral,
                      fontWeight: 700,
                    }}
                  >
                    {totalMarginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* --- Sidebar — admin actions --- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <Eyebrow color="rgba(255,255,255,0.6)">Admin actions</Eyebrow>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 28,
                lineHeight: 1,
                color: '#fff',
                letterSpacing: '-0.02em',
                marginTop: 8,
              }}
            >
              {formatCurrency(grandTotal)}
            </div>
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
                marginTop: 6,
              }}
            >
              {pricingRows.length} service{pricingRows.length === 1 ? '' : 's'} ·{' '}
              {stats.locs} location{stats.locs === 1 ? '' : 's'}
            </div>

            <div
              style={{
                height: 1,
                background: 'rgba(255,255,255,0.12)',
                margin: '18px 0',
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={openSendModal}
                disabled={isSending}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: T.coral,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: isSending ? 'wait' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: isSending ? 0.7 : 1,
                }}
              >
                <Send size={14} />
                Send to client
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {showCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {showCopied ? 'Copied!' : 'Copy share link'}
              </button>
              {originalData && currentProposal?.hasChanges && (
                <button
                  type="button"
                  onClick={toggleVersion}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <HistoryIcon size={14} />
                  {showingOriginal ? 'View current' : 'View client changes'}
                </button>
              )}
              {changeSets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowChangeHistory(true)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <HistoryIcon size={14} />
                  Change history ({changeSets.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleViewAsClient}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                title="Open the client-facing version of this proposal in a new tab"
              >
                <ExternalLink size={14} />
                View as client
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestSendEmail(user?.email || '');
                  setTestSendOpen(true);
                }}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                title="Send the proposal email to a staff address for preview"
              >
                <Send size={14} />
                Test send
              </button>
              {status !== 'approved' && (
                <button
                  type="button"
                  onClick={handleForceApprove}
                  disabled={isStatusUpdating}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'rgba(30,158,106,0.18)',
                    color: '#9FE9C4',
                    border: '1.5px solid rgba(30,158,106,0.35)',
                    borderRadius: 10,
                    cursor: isStatusUpdating ? 'wait' : 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: isStatusUpdating ? 0.6 : 1,
                  }}
                  title="Skip the client click — lock in the current data now"
                >
                  <CheckCircle2 size={14} />
                  Force approve
                </button>
              )}
              {status !== 'rejected' && status !== 'approved' && (
                <button
                  type="button"
                  onClick={handleMarkRejected}
                  disabled={isStatusUpdating}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    background: 'transparent',
                    color: '#FFB3B3',
                    border: '1.5px solid rgba(255,80,80,0.3)',
                    borderRadius: 10,
                    cursor: isStatusUpdating ? 'wait' : 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: isStatusUpdating ? 0.6 : 1,
                  }}
                >
                  Mark rejected
                </button>
              )}
            </div>

            {/* Invoice — V2 styled. Trigger button matches the rest of the
                sidebar; the underlying confirm modal still uses V1 styling
                (restyle is queued for Phase 3D). */}
            <SidebarInvoicePanel
              invoiceUrl={invoiceUrl}
              invoicePdf={invoicePdf}
              invoiceStatus={invoiceStatus}
              copied={invoiceLinkCopied}
              onCopyLink={handleCopyInvoiceLink}
              onCreate={() => {
                setInvoiceError(null);
                setShowInvoiceConfirm(true);
              }}
            />

            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 14,
                textAlign: 'center',
              }}
            >
              {isEditing ? 'Edit mode — Save to publish.' : 'Read mode. Tap Edit to make changes.'}
            </div>
          </div>

          {/* Facilitator — mindfulness-only proposals get Courtney's bio in
              the right rail just like the client view does. */}
          {isMindfulnessOnly && <FacilitatorCard />}

          {/* Account team — shows the current owner + admin dropdown to override */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <AccountTeamCard email={displayData?.accountTeamMemberEmail} />
            <div
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderTop: 'none',
                borderRadius: '0 0 16px 16px',
                padding: '12px 18px 14px',
                marginTop: -8,
              }}
            >
              <Eyebrow style={{ marginBottom: 6 }}>Assigned owner (admin only)</Eyebrow>
              <select
                value={
                  (displayData?.accountTeamMemberEmail as string) ||
                  DEFAULT_TEAM_EMAIL
                }
                onChange={(e) => handleChangeAccountOwner(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontFamily: T.fontD,
                  fontWeight: 600,
                  fontSize: 13,
                  color: T.navy,
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  borderRadius: 8,
                  background: '#fff',
                  outline: 'none',
                }}
              >
                {Object.values(ACCOUNT_TEAM).map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.name} · {m.title.split(' · ')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Admin notes — staff-only memos that don't trigger a full save */}
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 16,
              padding: '18px 20px',
            }}
          >
            <Eyebrow style={{ marginBottom: 8 }}>Internal notes (staff only)</Eyebrow>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              placeholder="Reminders for the account team — not visible to the client."
              disabled={adminNotesSaving}
              style={{
                width: '100%',
                padding: 10,
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.navy,
                background: '#fff',
                border: '1.5px solid rgba(0,0,0,0.1)',
                borderRadius: 8,
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
                marginTop: 8,
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: T.fontD,
                  fontSize: 11,
                  color: adminNotesSaved ? T.success : T.fgMuted,
                }}
              >
                {adminNotesSaved ? 'Saved.' : ''}
              </span>
              <button
                type="button"
                onClick={handleSaveAdminNotes}
                disabled={
                  adminNotesSaving ||
                  adminNotes.trim() === (currentProposal?.notes || '').trim()
                }
                style={{
                  padding: '7px 14px',
                  background: T.navy,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: adminNotesSaving ? 'wait' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 12,
                  opacity:
                    adminNotesSaving ||
                    adminNotes.trim() === (currentProposal?.notes || '').trim()
                      ? 0.5
                      : 1,
                }}
              >
                {adminNotesSaving ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>

          {/* What's next reference — admin can see the client's expected flow */}
          <WhatsNextCard activeStep={status === 'approved' ? 3 : 1} />
        </aside>
      </section>

      {/* ===== Send to Client modal ===== */}
      {showSendModal && (
        <ModalBackdrop onClose={() => !isSending && setShowSendModal(false)}>
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 32,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            }}
          >
            <SectionLabel
              eyebrow="Share proposal"
              title="Send to client"
              size="card"
              mb={20}
            />

            <label
              style={{
                display: 'block',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 11,
                color: T.fgMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              Client name
            </label>
            <input
              type="text"
              value={sendName}
              onChange={(e) => setSendName(e.target.value)}
              style={inputStyle}
            />

            <label
              style={{
                display: 'block',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 11,
                color: T.fgMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
                marginTop: 14,
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              style={inputStyle}
            />

            <label
              style={{
                display: 'block',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 11,
                color: T.fgMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
                marginTop: 14,
              }}
            >
              Note
            </label>
            <textarea
              value={sendNote}
              onChange={(e) => setSendNote(e.target.value)}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                disabled={isSending}
                style={{
                  padding: '10px 18px',
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendToClient}
                disabled={isSending}
                style={{
                  padding: '10px 18px',
                  background: T.coral,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: isSending ? 'wait' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  opacity: isSending ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Send size={14} />
                {isSending ? 'Sending…' : 'Send proposal'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ===== Link-existing modal ===== */}
      {showLinkModal && (
        <ModalBackdrop onClose={() => !isLinking && setShowLinkModal(false)}>
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 28,
              maxWidth: 640,
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            }}
          >
            <SectionLabel
              eyebrow="Multi-option"
              title="Link an existing proposal"
              size="card"
              mb={16}
            />
            <input
              type="text"
              placeholder="Search by client, option name, or ID"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                padding: 4,
              }}
            >
              {filteredLink.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.fgMuted,
                    textAlign: 'center',
                  }}
                >
                  No proposals match.
                </div>
              ) : (
                filteredLink.map((p: any) => {
                  const sel = selectedToLink.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() =>
                        setSelectedToLink((prev) =>
                          prev.includes(p.id)
                            ? prev.filter((x) => x !== p.id)
                            : [...prev, p.id]
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: sel ? T.lightGray : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginBottom: 2,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: T.fontD,
                            fontWeight: 700,
                            fontSize: 14,
                            color: T.navy,
                          }}
                        >
                          {p.client_name || 'Unnamed'}{' '}
                          {p.option_name && (
                            <span style={{ color: T.fgMuted, fontWeight: 500 }}>
                              · {p.option_name}
                            </span>
                          )}
                          {p.proposal_group_id && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                fontFamily: T.fontUi,
                                fontWeight: 700,
                                color: '#8C5A07',
                                background: 'rgba(254,220,100,.4)',
                                padding: '1px 7px',
                                borderRadius: 999,
                                textTransform: 'uppercase',
                                letterSpacing: '.05em',
                              }}
                            >
                              In another group
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: T.fontD,
                            fontSize: 12,
                            color: T.fgMuted,
                            marginTop: 2,
                          }}
                        >
                          {p.id.slice(0, 8)} ·{' '}
                          {p.created_at
                            ? format(new Date(p.created_at), 'MMM d, yyyy')
                            : ''}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${sel ? T.success : 'rgba(0,0,0,.15)'}`,
                          background: sel ? T.success : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {sel && <Check size={14} color="#fff" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                style={{
                  padding: '10px 18px',
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkProposals}
                disabled={isLinking || selectedToLink.length === 0}
                style={{
                  padding: '10px 18px',
                  background: T.coral,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor:
                    isLinking || selectedToLink.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  opacity: isLinking || selectedToLink.length === 0 ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LinkIcon size={14} />
                Link {selectedToLink.length || ''}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ===== Change-history drawer ===== */}
      {showChangeHistory && (
        <ChangeHistoryDrawer
          changeSets={changeSets}
          onClose={() => setShowChangeHistory(false)}
          onReview={handleReviewChangeset}
          busyFor={reviewBusyFor}
        />
      )}

      {/* ===== Bulk service-type swap modal ===== */}
      {bulkSwapOpen && (
        <ModalBackdrop onClose={() => setBulkSwapOpen(false)}>
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 28,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            }}
          >
            <SectionLabel
              eyebrow="Bulk edit"
              title="Swap a service type across the proposal"
              size="card"
              mb={16}
            />
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.fgMuted,
                lineHeight: 1.5,
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              Replaces every instance of the source service with the target's
              defaults, preserving discount % and recalculating cost. Use it
              when a client decides to switch (e.g. all massage → facial).
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 10,
                alignItems: 'end',
              }}
            >
              <div>
                <Eyebrow style={{ marginBottom: 4 }}>From</Eyebrow>
                <select
                  value={bulkSwapFrom}
                  onChange={(e) => setBulkSwapFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontFamily: T.fontD,
                    fontWeight: 600,
                    fontSize: 14,
                    color: T.navy,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                    background: '#fff',
                    outline: 'none',
                  }}
                >
                  {Array.from(new Set(pricingRows.map((r) => r.type))).map(
                    (t) => (
                      <option key={t} value={t}>
                        {(SERVICE_DISPLAY as any)[t] || t}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 18,
                  color: T.fgMuted,
                  paddingBottom: 9,
                }}
              >
                →
              </div>
              <div>
                <Eyebrow style={{ marginBottom: 4 }}>To</Eyebrow>
                <select
                  value={bulkSwapTo}
                  onChange={(e) => setBulkSwapTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontFamily: T.fontD,
                    fontWeight: 600,
                    fontSize: 14,
                    color: T.navy,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                    background: '#fff',
                    outline: 'none',
                  }}
                >
                  {SERVICE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setBulkSwapOpen(false)}
                style={{
                  padding: '10px 18px',
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSwap}
                style={{
                  padding: '10px 18px',
                  background: T.coral,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Swap services
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ===== Test-send modal ===== */}
      {testSendOpen && (
        <ModalBackdrop onClose={() => !testSendBusy && setTestSendOpen(false)}>
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 28,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            }}
          >
            <SectionLabel
              eyebrow="Internal preview"
              title="Send a test copy to staff"
              size="card"
              mb={14}
            />
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.fgMuted,
                lineHeight: 1.5,
                marginTop: 0,
                marginBottom: 14,
              }}
            >
              Fires the real proposal-share email to whatever address you put
              here. Use it to QA the rendered email before sending to the
              actual client.
            </p>
            <Eyebrow style={{ marginBottom: 4 }}>Staff email</Eyebrow>
            <input
              type="email"
              value={testSendEmail}
              onChange={(e) => setTestSendEmail(e.target.value)}
              style={inputStyle}
            />
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() => setTestSendOpen(false)}
                disabled={testSendBusy}
                style={{
                  padding: '10px 18px',
                  background: '#fff',
                  color: T.navy,
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 10,
                  cursor: testSendBusy ? 'wait' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTestSend}
                disabled={testSendBusy || !testSendEmail.trim()}
                style={{
                  padding: '10px 18px',
                  background: T.navy,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: testSendBusy ? 'wait' : 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: testSendBusy || !testSendEmail.trim() ? 0.6 : 1,
                }}
              >
                <Send size={13} />
                {testSendBusy ? 'Sending…' : 'Send test'}
              </button>
            </div>
            {testSendSent && (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.success,
                }}
              >
                Test sent. Check your inbox.
              </div>
            )}
          </div>
        </ModalBackdrop>
      )}

      {/* ===== Invoice confirm modal (V2-styled) ===== */}
      <InvoiceConfirmationModalV2
        isOpen={showInvoiceConfirm}
        onClose={() => {
          setShowInvoiceConfirm(false);
          setInvoiceError(null);
        }}
        onSend={handleSendInvoice}
        initialName={displayData?.clientName || ''}
        initialEmail={currentProposal?.clientEmail || ''}
        initialItems={generateLineItems(
          displayData,
          currentProposal?.pricingOptions,
          currentProposal?.selectedOptions
        )}
        proposalId={id}
        loading={invoiceLoading}
        error={invoiceError}
      />
    </div>
  );
};

export default ProposalViewerV2;

// ============================================================================
// Inline subcomponents (kept local to the V2 admin viewer)
// ============================================================================

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontFamily: T.fontD,
  fontSize: 14,
  color: T.navy,
  background: '#fff',
  border: '1.5px solid rgba(0,0,0,0.12)',
  borderRadius: 10,
  outline: 'none',
};

interface ModalBackdropProps {
  children: React.ReactNode;
  onClose: () => void;
}
const ModalBackdrop: React.FC<ModalBackdropProps> = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9,54,79,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 60,
    }}
  >
    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720 }}>
      {children}
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// ServiceBlock — wraps ServiceCard with admin-only controls (service-type
// picker, sub-type pickers, remove). Keeps ServiceCard's edit-mode primitives
// intact and adds the bits ServiceCard doesn't ship with.
// ----------------------------------------------------------------------------
interface ServiceBlockProps {
  service: any;
  location: string;
  date: string;
  index: number;
  isEditing: boolean;
  onFieldChange: (field: string, value: any) => void;
  onSelectPricingOption: (idx: number) => void;
  onEditPricingOption: (optIdx: number, field: string, value: any) => void;
  onAddPricingOption: () => void;
  onRemovePricingOption: (optIdx: number) => void;
  onGeneratePricingOptions: () => void;
  onChangeServiceType: (t: string) => void;
  onChangeMassageType: (t: string) => void;
  onChangeNailsType: (t: string) => void;
  onChangeMindfulnessType: (t: string) => void;
  onChangeMindfulnessFormat: (f: string) => void;
  onRemoveService: () => void;
}
const ServiceBlock: React.FC<ServiceBlockProps> = ({
  service,
  isEditing,
  onFieldChange,
  onSelectPricingOption,
  onEditPricingOption,
  onAddPricingOption,
  onRemovePricingOption,
  onGeneratePricingOptions,
  onChangeServiceType,
  onChangeMassageType,
  onChangeNailsType,
  onChangeMindfulnessType,
  onChangeMindfulnessFormat,
  onRemoveService,
}) => {
  return (
    <div style={{ position: 'relative' }}>
      <ServiceCard
        service={service}
        editing={isEditing}
        internalView={true}
        showSelectionControls={false}
        onFieldChange={(field, value) => onFieldChange(field as string, value)}
        onSelectPricingOption={onSelectPricingOption}
        onEditPricingOption={(idx, f, v) =>
          onEditPricingOption(idx, f as string, v)
        }
        onAddPricingOption={onAddPricingOption}
        onRemovePricingOption={onRemovePricingOption}
        onGeneratePricingOptions={onGeneratePricingOptions}
      />

      {isEditing && (
        <div
          style={{
            marginTop: 10,
            background: '#fff',
            border: '1px dashed rgba(0,0,0,0.12)',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <SelectField
            label="Service type"
            value={service.serviceType}
            onChange={onChangeServiceType}
            options={SERVICE_TYPE_OPTIONS}
          />

          {service.serviceType === 'massage' && (
            <SelectField
              label="Massage type"
              value={service.massageType || 'massage'}
              onChange={onChangeMassageType}
              options={MASSAGE_TYPE_OPTIONS}
            />
          )}

          {service.serviceType === 'nails' && (
            <SelectField
              label="Nails type"
              value={service.nailsType || 'nails'}
              onChange={onChangeNailsType}
              options={NAILS_TYPE_OPTIONS}
            />
          )}

          {service.serviceType === 'mindfulness' && (
            <>
              <SelectField
                label="Mindfulness package"
                value={service.mindfulnessType || 'intro'}
                onChange={onChangeMindfulnessType}
                options={MINDFULNESS_TYPE_OPTIONS}
              />
              <SelectField
                label="Format"
                value={service.mindfulnessFormat || 'in-person'}
                onChange={onChangeMindfulnessFormat}
                options={MINDFULNESS_FORMAT_OPTIONS}
              />
            </>
          )}

          <NumberField
            label="Discount %"
            value={service.discountPercent ?? 0}
            onChange={(v) => onFieldChange('discountPercent', v)}
            suffix="%"
          />

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={onRemoveService}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: '#fff',
                border: '1.5px solid rgba(255,80,80,0.3)',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 12,
                color: T.coral,
              }}
            >
              <Trash2 size={13} />
              Remove service
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}
const SelectField: React.FC<SelectFieldProps> = ({ label, value, onChange, options }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span
      style={{
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 11,
        color: T.fgMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}
    >
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '7px 10px',
        fontFamily: T.fontD,
        fontWeight: 600,
        fontSize: 13,
        color: T.navy,
        border: '1.5px solid rgba(0,0,0,0.1)',
        borderRadius: 8,
        background: '#fff',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

interface NumberFieldProps {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  suffix?: string;
}
const NumberField: React.FC<NumberFieldProps> = ({ label, value, onChange, suffix }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span
      style={{
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 11,
        color: T.fgMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}
    >
      {label}
    </span>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <input
        type="number"
        value={value as any}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: 80,
          padding: '7px 10px',
          fontFamily: T.fontD,
          fontWeight: 600,
          fontSize: 13,
          color: T.navy,
          border: '1.5px solid rgba(0,0,0,0.1)',
          borderRadius: 8,
          background: '#fff',
          outline: 'none',
        }}
      />
      {suffix && (
        <span style={{ fontFamily: T.fontD, fontSize: 13, color: T.fgMuted }}>
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// ProposalOptionsBar — admin multi-option strip with reorder, rename, remove,
// and create/link controls. Renders nothing when there's only one proposal.
// ----------------------------------------------------------------------------
interface ProposalOptionsBarProps {
  options: any[];
  currentId: string;
  queryString: string;
  isCreating: boolean;
  onCreate: () => void;
  onOpenLinkModal: () => void;
  onReorder: (optId: string, newOrder: number) => void;
  onUpdateName: (optId: string, newName: string) => void;
  onRemove: (optId: string, optName: string) => void;
  editingName: string | null;
  setEditingName: (id: string | null) => void;
  nameInput: string;
  setNameInput: (v: string) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  onNavigate: (targetId: string) => void;
}
const ProposalOptionsBar: React.FC<ProposalOptionsBarProps> = ({
  options,
  currentId,
  isCreating,
  onCreate,
  onOpenLinkModal,
  onReorder,
  onUpdateName,
  onRemove,
  editingName,
  setEditingName,
  nameInput,
  setNameInput,
  deleteConfirmId,
  setDeleteConfirmId,
  onNavigate,
}) => {
  if (options.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px dashed rgba(0,0,0,0.12)',
          borderRadius: 16,
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Eyebrow>Multi-option</Eyebrow>
          <div
            style={{
              fontFamily: T.fontD,
              fontSize: 14,
              color: T.fgMuted,
              marginTop: 4,
            }}
          >
            Spin up a variation for this client to compare and choose between.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCreate}
            disabled={isCreating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: T.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: isCreating ? 'wait' : 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            <Plus size={13} />
            {isCreating ? 'Creating…' : 'New option'}
          </button>
          <button
            type="button"
            onClick={onOpenLinkModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
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
            <LinkIcon size={13} />
            Link existing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Eyebrow>Proposal options ({options.length})</Eyebrow>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCreate}
            disabled={isCreating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: T.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: isCreating ? 'wait' : 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 12,
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            <Plus size={12} />
            {isCreating ? 'Creating…' : 'New'}
          </button>
          <button
            type="button"
            onClick={onOpenLinkModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#fff',
              color: T.navy,
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            <LinkIcon size={12} />
            Link
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt: any, idx: number) => {
          const isCurrent = opt.id === currentId;
          const isApproved = opt.status === 'approved';
          return (
            <div
              key={opt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 12px',
                background: isCurrent ? T.lightGray : '#fff',
                border: `1.5px solid ${
                  isCurrent ? 'rgba(0,152,173,0.4)' : 'rgba(0,0,0,0.08)'
                }`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {editingName === opt.id ? (
                  <input
                    type="text"
                    value={nameInput}
                    autoFocus
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onUpdateName(opt.id, nameInput);
                      if (e.key === 'Escape') {
                        setEditingName(null);
                        setNameInput('');
                      }
                    }}
                    onBlur={() => onUpdateName(opt.id, nameInput)}
                    style={{
                      flex: 1,
                      padding: '5px 9px',
                      fontFamily: T.fontD,
                      fontWeight: 700,
                      fontSize: 14,
                      color: T.navy,
                      border: '1.5px solid rgba(0,152,173,0.4)',
                      borderRadius: 6,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: T.fontD,
                      fontWeight: 700,
                      fontSize: 14,
                      color: T.navy,
                    }}
                  >
                    {opt.option_name || `Option ${idx + 1}`}
                  </span>
                )}
                {isCurrent && (
                  <span
                    style={{
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 10,
                      color: T.navy,
                      background: T.aqua,
                      padding: '2px 8px',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                    }}
                  >
                    Current
                  </span>
                )}
                {isApproved && (
                  <span
                    style={{
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 10,
                      color: T.success,
                      background: 'rgba(30,158,106,.14)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                    }}
                  >
                    Approved
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {isCurrent && editingName !== opt.id && (
                  <IconBtn
                    onClick={() => {
                      setEditingName(opt.id);
                      setNameInput(opt.option_name || `Option ${idx + 1}`);
                    }}
                    title="Rename"
                  >
                    <Pencil size={14} />
                  </IconBtn>
                )}
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => onNavigate(opt.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#fff',
                      border: '1.5px solid rgba(0,0,0,0.12)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 11,
                      color: T.navy,
                    }}
                  >
                    Open
                  </button>
                )}
                {idx > 0 && (
                  <IconBtn
                    onClick={() => onReorder(opt.id, (opt.option_order ?? idx + 1) - 1)}
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </IconBtn>
                )}
                {idx < options.length - 1 && (
                  <IconBtn
                    onClick={() => onReorder(opt.id, (opt.option_order ?? idx + 1) + 1)}
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </IconBtn>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmId === opt.id) {
                      onRemove(opt.id, opt.option_name || `Option ${idx + 1}`);
                    } else {
                      setDeleteConfirmId(opt.id);
                    }
                  }}
                  title={
                    deleteConfirmId === opt.id ? 'Confirm remove' : 'Remove from group'
                  }
                  style={{
                    padding: 6,
                    background:
                      deleteConfirmId === opt.id ? 'rgba(255,80,80,0.12)' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: T.coral,
                    display: 'inline-flex',
                  }}
                >
                  {deleteConfirmId === opt.id ? (
                    <Check size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
                {deleteConfirmId === opt.id && (
                  <IconBtn
                    onClick={() => setDeleteConfirmId(null)}
                    title="Cancel"
                  >
                    <X size={14} />
                  </IconBtn>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const IconBtn: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}> = ({ children, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      padding: 6,
      background: 'transparent',
      border: 'none',
      borderRadius: 6,
      cursor: 'pointer',
      color: T.navy,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </button>
);

// ----------------------------------------------------------------------------
// ChangeHistoryDrawer — right slide-over showing client + staff change sets.
// ----------------------------------------------------------------------------
interface ChangeHistoryDrawerProps {
  changeSets: ProposalChangeSet[];
  onClose: () => void;
  onReview?: (
    changeSet: ProposalChangeSet,
    decision: 'approved' | 'rejected'
  ) => void;
  busyFor?: string | null;
}
const ChangeHistoryDrawer: React.FC<ChangeHistoryDrawerProps> = ({
  changeSets,
  onClose,
  onReview,
  busyFor,
}) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9,54,79,0.45)',
      zIndex: 70,
      display: 'flex',
      justifyContent: 'flex-end',
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 'min(520px, 95vw)',
        background: '#fff',
        height: '100%',
        overflowY: 'auto',
        padding: 28,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <SectionLabel
          eyebrow="Activity"
          title="Change history"
          size="card"
          mb={0}
        />
        <button
          type="button"
          onClick={onClose}
          title="Close"
          style={{
            padding: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: T.fgMuted,
            display: 'inline-flex',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {changeSets.length === 0 ? (
        <div
          style={{
            fontFamily: T.fontD,
            color: T.fgMuted,
            fontSize: 14,
            padding: 24,
            textAlign: 'center',
            background: T.beige,
            borderRadius: 12,
          }}
        >
          No tracked changes yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {changeSets.map((cs) => (
            <div
              key={cs.id}
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                    color: cs.changeSource === 'client' ? T.coral : T.navy,
                    background:
                      cs.changeSource === 'client'
                        ? 'rgba(255,80,80,0.10)'
                        : T.lightGray,
                    padding: '3px 9px',
                    borderRadius: 999,
                  }}
                >
                  {cs.changeSource}
                </span>
                <span
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                  }}
                >
                  {cs.submittedAt
                    ? format(new Date(cs.submittedAt), 'MMM d, yyyy · h:mm a')
                    : ''}
                </span>
              </div>
              {cs.clientComment && (
                <div
                  style={{
                    background: T.beige,
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.navy,
                    marginBottom: 10,
                    fontStyle: 'italic',
                  }}
                >
                  “{cs.clientComment}”
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cs.changes.map((ch, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: T.fontD,
                      fontSize: 13,
                      color: T.navy,
                      paddingLeft: 10,
                      borderLeft: '2px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: T.navy,
                      }}
                    >
                      {(ch as any).field || (ch as any).path || 'change'}
                    </span>
                    {(ch as any).oldValue !== undefined && (
                      <>
                        {' '}
                        <span style={{ color: T.fgMuted }}>
                          {String((ch as any).oldValue)}
                        </span>
                        {' → '}
                      </>
                    )}
                    {(ch as any).newValue !== undefined && (
                      <span style={{ fontWeight: 700 }}>
                        {String((ch as any).newValue)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Admin review actions per changeset (mark-reviewed flow).
                  Skipped if the changeset is already reviewed (not pending). */}
              {onReview && cs.status === 'pending' && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onReview(cs, 'rejected')}
                    disabled={busyFor === cs.id}
                    style={{
                      padding: '6px 12px',
                      background: '#fff',
                      color: T.coral,
                      border: '1.5px solid rgba(255,80,80,0.3)',
                      borderRadius: 8,
                      cursor: busyFor === cs.id ? 'wait' : 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 12,
                      opacity: busyFor === cs.id ? 0.6 : 1,
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(cs, 'approved')}
                    disabled={busyFor === cs.id}
                    style={{
                      padding: '6px 12px',
                      background: T.success,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: busyFor === cs.id ? 'wait' : 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: busyFor === cs.id ? 0.7 : 1,
                    }}
                  >
                    <Check size={12} />
                    {busyFor === cs.id ? 'Saving…' : 'Mark reviewed'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// SidebarInvoicePanel — V2-styled invoice section for the admin action card.
// Shows status + actions in the dark sidebar palette. No V1 Tailwind classes.
// ----------------------------------------------------------------------------
const INVOICE_STATUS_LABELS: Record<
  string,
  { label: string; dot: string; color: string }
> = {
  draft: { label: 'Draft', dot: '#9CA3AF', color: 'rgba(255,255,255,0.85)' },
  open: { label: 'Sent · awaiting payment', dot: '#F2A93B', color: '#FFE2A6' },
  sent: { label: 'Sent · awaiting payment', dot: '#F2A93B', color: '#FFE2A6' },
  paid: { label: 'Paid', dot: 'var(--pv-success)', color: '#9FE9C4' },
  uncollectible: { label: 'Uncollectible', dot: '#FF5050', color: '#FFB3B3' },
  void: { label: 'Void', dot: '#9CA3AF', color: 'rgba(255,255,255,0.5)' },
};

interface SidebarInvoicePanelProps {
  invoiceUrl: string | null;
  invoicePdf: string | null;
  invoiceStatus: string | null;
  copied: boolean;
  onCopyLink: () => void;
  onCreate: () => void;
}
const SidebarInvoicePanel: React.FC<SidebarInvoicePanelProps> = ({
  invoiceUrl,
  invoicePdf,
  invoiceStatus,
  copied,
  onCopyLink,
  onCreate,
}) => {
  const sStyle = invoiceStatus ? INVOICE_STATUS_LABELS[invoiceStatus] : null;
  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 8,
        }}
      >
        <Eyebrow color="rgba(255,255,255,0.55)">Invoice</Eyebrow>
        {sStyle && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 999,
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 11,
              color: sStyle.color,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: sStyle.dot,
              }}
            />
            {sStyle.label}
          </span>
        )}
      </div>

      {invoiceUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} />
            View invoice
          </a>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onCopyLink}
              style={{
                flex: 1,
                padding: '9px 12px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.85)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {invoicePdf && (
              <a
                href={invoicePdf}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <FileText size={13} />
                PDF
              </a>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onCreate}
          style={{
            width: '100%',
            padding: '11px 14px',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            cursor: 'pointer',
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Receipt size={14} />
          Create invoice
        </button>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// PricingExtrasEditor — admin-only panel for custom line items + gratuity.
// Sits above the dark pricing summary card. Hidden outside edit mode.
// ----------------------------------------------------------------------------
interface PricingExtrasEditorProps {
  customLineItems: any[];
  onAddItem: () => void;
  onEditItem: (idx: number, field: string, value: any) => void;
  onRemoveItem: (idx: number) => void;
  gratuityType: 'percentage' | 'dollar' | null;
  gratuityValue: number | null;
  onChangeGratuityType: (t: '' | 'percentage' | 'dollar') => void;
  onChangeGratuityValue: (v: number) => void;
  // Auto-recurring discount — picker controls
  autoRecurringMode: 'auto' | 'off' | 'fixed';
  autoRecurringDiscount: number | undefined;
  autoRecurringApplied: number | undefined;
  autoRecurringSavings: number | undefined;
  onChangeAutoRecurring: (mode: 'auto' | 'off' | 'fixed', value?: number) => void;
}
const PricingExtrasEditor: React.FC<PricingExtrasEditorProps> = ({
  customLineItems,
  onAddItem,
  onEditItem,
  onRemoveItem,
  gratuityType,
  gratuityValue,
  onChangeGratuityType,
  onChangeGratuityValue,
  autoRecurringMode,
  autoRecurringDiscount,
  autoRecurringApplied,
  autoRecurringSavings,
  onChangeAutoRecurring,
}) => (
  <div
    style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 16,
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}
  >
    <SectionLabel
      eyebrow="Pricing extras"
      title="Custom line items & gratuity"
      size="card"
      mb={0}
    />

    {/* Custom line items */}
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Eyebrow>Custom line items</Eyebrow>
        <button
          type="button"
          onClick={onAddItem}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: '#fff',
            border: '1.5px solid rgba(0,0,0,0.12)',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 12,
            color: T.navy,
          }}
        >
          <Plus size={12} />
          Add item
        </button>
      </div>
      {customLineItems.length === 0 ? (
        <div
          style={{
            fontFamily: T.fontD,
            fontSize: 13,
            color: T.fgMuted,
            padding: '12px 14px',
            background: T.beige,
            borderRadius: 10,
          }}
        >
          Optional. Add catering, travel, or anything outside the standard service list.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customLineItems.map((it: any, idx: number) => (
            <div
              key={it.id || idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr auto',
                gap: 10,
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  value={it.name || ''}
                  placeholder="Item name (e.g. Catering)"
                  onChange={(e) => onEditItem(idx, 'name', e.target.value)}
                  style={{
                    padding: '8px 10px',
                    fontFamily: T.fontD,
                    fontWeight: 600,
                    fontSize: 14,
                    color: T.navy,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                    background: '#fff',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  value={it.description || ''}
                  placeholder="Description (optional)"
                  onChange={(e) => onEditItem(idx, 'description', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                    border: '1.5px solid rgba(0,0,0,0.08)',
                    borderRadius: 8,
                    background: '#fff',
                    outline: 'none',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0 10px',
                  background: '#fff',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  borderRadius: 8,
                }}
              >
                <span style={{ color: T.fgMuted, fontFamily: T.fontD, fontSize: 14 }}>$</span>
                <input
                  type="number"
                  value={it.amount ?? 0}
                  onChange={(e) =>
                    onEditItem(idx, 'amount', parseFloat(e.target.value) || 0)
                  }
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.navy,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    textAlign: 'right',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(idx)}
                title="Remove"
                style={{
                  padding: 8,
                  background: 'transparent',
                  border: '1.5px solid rgba(255,80,80,0.25)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: T.coral,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Auto-recurring discount */}
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Eyebrow>Auto-recurring discount</Eyebrow>
        {autoRecurringApplied && autoRecurringApplied > 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              background: 'rgba(30,158,106,.12)',
              color: T.success,
              borderRadius: 999,
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.02em',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: T.success,
              }}
            />
            {autoRecurringApplied}% applied
            {typeof autoRecurringSavings === 'number' && autoRecurringSavings > 0 && (
              <span style={{ fontWeight: 600 }}>
                · saves {formatCurrency(autoRecurringSavings)}
              </span>
            )}
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <select
          value={
            autoRecurringMode === 'auto'
              ? 'auto'
              : autoRecurringMode === 'off'
              ? 'off'
              : String(autoRecurringDiscount ?? 15)
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'auto') onChangeAutoRecurring('auto');
            else if (v === 'off') onChangeAutoRecurring('off');
            else onChangeAutoRecurring('fixed', Number(v));
          }}
          style={{
            padding: '8px 12px',
            fontFamily: T.fontD,
            fontWeight: 600,
            fontSize: 14,
            color: T.navy,
            border: '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: 8,
            background: '#fff',
            outline: 'none',
          }}
        >
          <option value="auto">Auto (15% at 4+, 20% at 9+ dates)</option>
          <option value="off">No discount</option>
          <option value="10">Fixed 10%</option>
          <option value="15">Fixed 15%</option>
          <option value="20">Fixed 20%</option>
        </select>
      </div>
      <div
        style={{
          fontFamily: T.fontD,
          fontSize: 12,
          color: T.fgMuted,
          marginTop: 6,
          lineHeight: 1.5,
        }}
      >
        Applies a percentage discount across every service in this proposal.
        Headshot retouching is excluded from the discount. Per-service recurring
        contracts always win — set those on individual services if you need finer
        control.
      </div>
    </div>

    {/* Gratuity */}
    <div>
      <Eyebrow style={{ marginBottom: 10 }}>Gratuity</Eyebrow>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <select
          value={gratuityType || ''}
          onChange={(e) =>
            onChangeGratuityType(e.target.value as '' | 'percentage' | 'dollar')
          }
          style={{
            padding: '8px 12px',
            fontFamily: T.fontD,
            fontWeight: 600,
            fontSize: 14,
            color: T.navy,
            border: '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: 8,
            background: '#fff',
            outline: 'none',
          }}
        >
          <option value="">No gratuity</option>
          <option value="percentage">Percentage</option>
          <option value="dollar">Dollar amount</option>
        </select>
        {gratuityType && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              background: '#fff',
              border: '1.5px solid rgba(0,0,0,0.1)',
              borderRadius: 8,
            }}
          >
            {gratuityType === 'dollar' && (
              <span style={{ color: T.fgMuted, fontFamily: T.fontD, fontSize: 14 }}>$</span>
            )}
            <input
              type="number"
              value={gratuityValue ?? 0}
              onChange={(e) =>
                onChangeGratuityValue(parseFloat(e.target.value) || 0)
              }
              style={{
                width: 100,
                padding: '8px 0',
                fontFamily: T.fontD,
                fontWeight: 700,
                fontSize: 14,
                color: T.navy,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                textAlign: 'right',
              }}
            />
            {gratuityType === 'percentage' && (
              <span style={{ color: T.fgMuted, fontFamily: T.fontD, fontSize: 14 }}>%</span>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);

