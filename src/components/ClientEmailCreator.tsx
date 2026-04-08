import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, Copy, Save, Check, Plus, Trash2, Link, ExternalLink } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';
import { useClientEmail } from '../contexts/ClientEmailContext';
import { EmailType, ServiceVariant, WorkhumanDirection, PostCallTemplateData, KeyInfoTemplateData, WorkhumanOutreachTemplateData, ProInfo, ClientEmailDraft } from '../types/clientEmail';
import { Proposal } from '../types/proposal';
import { generatePostCallEmail, generateKeyInfoEmail, generateWorkhumanOutreachEmail, getWorkhumanSubject, detectServiceVariant, detectEmailType, getDefaultSubject } from '../utils/clientEmailTemplates';
import { copyHtmlToClipboard } from '../utils/clipboardHtml';
import { shortenUrl } from '../utils/shortenUrl';
import { getServiceTypesFromProposal, formatServiceType, formatDateAmerican } from '../utils/proposalUtils';
import { supabase } from '../lib/supabaseClient';

interface Props {
  editingDraft?: ClientEmailDraft | null;
  onClose: () => void;
}

const ClientEmailCreator: React.FC<Props> = ({ editingDraft, onClose }) => {
  const { proposals } = useProposal();
  const { createDraft, updateDraft } = useClientEmail();

  // Form state
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [emailType, setEmailType] = useState<EmailType>('post-call');
  const [serviceVariant, setServiceVariant] = useState<ServiceVariant>('generic');
  const [subject, setSubject] = useState('');

  // Post-call fields
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [eventType, setEventType] = useState('');
  const [proposalLink, setProposalLink] = useState('');
  const [testSignupLink, setTestSignupLink] = useState('');

  // Workhuman outreach fields
  const [workhumanDirection, setWorkhumanDirection] = useState<WorkhumanDirection>('medium');
  const [workhumanBookingLink, setWorkhumanBookingLink] = useState('https://proposals.getshortcut.co/workhuman/recharge');

  // Key-info fields
  const [eventDate, setEventDate] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [managerPageLink, setManagerPageLink] = useState('');
  const [proInfo, setProInfo] = useState<ProInfo[]>([{ name: '', type: '' }]);
  const [invoiceLink, setInvoiceLink] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [qrCodeSignLink, setQrCodeSignLink] = useState('');

  // Signup links for the selected proposal
  const [proposalSignupLinks, setProposalSignupLinks] = useState<Array<{ signupUrl: string; eventName: string; eventLocation: string; eventDate: string }>>([]);

  // UI state
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shortening, setShortening] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sorted proposals for dropdown (most recent first, non-test only)
  const sortedProposals = useMemo(() => {
    return proposals
      .filter(p => !p.isTest)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals]);

  // Load editing draft data
  useEffect(() => {
    if (editingDraft) {
      setSelectedProposalId(editingDraft.proposalId || '');
      setEmailType(editingDraft.emailType);
      setServiceVariant(editingDraft.serviceVariant || 'generic');
      setSubject(editingDraft.subject);

      const td = editingDraft.templateData as any;
      setContactName(td.contactName || '');
      setCompanyName(td.companyName || '');
      setEventType(td.eventType || '');
      setProposalLink(td.proposalLink || '');
      setTestSignupLink(td.testSignupLink || '');
      setEventDate(formatDateAmerican(td.eventDate || ''));
      setBookingLink(td.bookingLink || '');
      setManagerPageLink(td.managerPageLink || '');
      setProInfo(td.proInfo?.length ? td.proInfo : [{ name: '', type: '' }]);
      setInvoiceLink(td.invoiceLink || '');
      setPaymentDueDate(formatDateAmerican(td.paymentDueDate || ''));
      setQrCodeSignLink(td.qrCodeSignLink || '');
    }
  }, [editingDraft]);

  // Fetch signup links for a given proposal
  const fetchSignupLinksForProposal = useCallback(async (proposalId: string) => {
    if (!proposalId) {
      setProposalSignupLinks([]);
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('sign_up_links')
        .select('signup_url, event_name, event_location, event_date')
        .eq('proposal_id', proposalId)
        .not('signup_url', 'is', null);
      if (error) {
        console.warn('Could not fetch signup links:', error.message);
        setProposalSignupLinks([]);
        return [];
      }
      const links = (data || []).map((r: any) => ({
        signupUrl: r.signup_url,
        eventName: r.event_name || '',
        eventLocation: r.event_location || '',
        eventDate: r.event_date || '',
      }));
      setProposalSignupLinks(links);
      return links;
    } catch {
      setProposalSignupLinks([]);
      return [];
    }
  }, []);

  // When a proposal is selected, auto-populate fields
  const handleProposalSelect = useCallback(async (proposalId: string) => {
    setSelectedProposalId(proposalId);
    if (!proposalId) return;

    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    const detectedType = detectEmailType(proposal);
    const detectedVariant = detectServiceVariant(proposal);

    setEmailType(detectedType);
    setServiceVariant(detectedVariant);
    setCompanyName(proposal.data.clientName || '');
    setContactName(proposal.customization?.contactFirstName || '');
    setProposalLink(`${window.location.origin}/shared/${proposal.id}`);
    setSubject(getDefaultSubject(detectedType, detectedVariant, proposal.data.clientName || ''));

    // Auto-detect event type from services
    const serviceTypes = getServiceTypesFromProposal(proposal);
    if (serviceTypes.length > 0) {
      setEventType(formatServiceType(serviceTypes[0]));
    }

    // Auto-populate first event date in American format
    if (proposal.data.eventDates?.length) {
      setEventDate(formatDateAmerican(proposal.data.eventDates[0]));
    }

    // Fetch and auto-populate signup links (clear first so stale values don't persist)
    setTestSignupLink('');
    setBookingLink('');
    const links = await fetchSignupLinksForProposal(proposalId);
    if (links.length > 0) {
      const firstUrl = links[0].signupUrl;
      setTestSignupLink(firstUrl);
      setBookingLink(firstUrl);
    }
  }, [proposals, fetchSignupLinksForProposal]);

  // Generate HTML based on current form state
  const generatedHtml = useMemo(() => {
    if (emailType === 'workhuman-outreach') {
      const data: WorkhumanOutreachTemplateData = {
        contactName,
        companyName,
        bookingLink: workhumanBookingLink,
        direction: workhumanDirection,
      };
      return generateWorkhumanOutreachEmail(data);
    } else if (emailType === 'post-call') {
      const data: PostCallTemplateData = {
        contactName,
        companyName,
        eventType,
        proposalLink,
        testSignupLink,
      };
      return generatePostCallEmail(data);
    } else {
      const data: KeyInfoTemplateData = {
        contactName,
        companyName,
        eventDate,
        eventType,
        bookingLink,
        managerPageLink,
        proInfo,
        invoiceLink,
        paymentDueDate,
        qrCodeSignLink,
      };
      return generateKeyInfoEmail(data, serviceVariant);
    }
  }, [emailType, serviceVariant, workhumanDirection, contactName, companyName, eventType, proposalLink, testSignupLink, eventDate, bookingLink, managerPageLink, proInfo, invoiceLink, paymentDueDate, qrCodeSignLink, workhumanBookingLink]);

  const handleCopy = async () => {
    const success = await copyHtmlToClipboard(generatedHtml);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templateData = emailType === 'workhuman-outreach'
        ? { contactName, companyName, bookingLink: workhumanBookingLink, direction: workhumanDirection } as WorkhumanOutreachTemplateData
        : emailType === 'post-call'
        ? { contactName, companyName, eventType, proposalLink, testSignupLink } as PostCallTemplateData
        : { contactName, companyName, eventDate, eventType, bookingLink, managerPageLink, proInfo, invoiceLink, paymentDueDate, qrCodeSignLink } as KeyInfoTemplateData;

      if (editingDraft) {
        await updateDraft(editingDraft.id, {
          emailType,
          serviceVariant,
          subject,
          templateData,
          generatedHtml,
        });
      } else {
        await createDraft({
          proposalId: selectedProposalId || null,
          emailType,
          serviceVariant,
          subject,
          templateData,
          generatedHtml,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // Error is set in context
    } finally {
      setSaving(false);
    }
  };

  const addPro = () => setProInfo(prev => [...prev, { name: '', type: '' }]);
  const removePro = (index: number) => setProInfo(prev => prev.filter((_, i) => i !== index));
  const updatePro = (index: number, field: keyof ProInfo, value: string) => {
    setProInfo(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleShortenBookingLink = async () => {
    if (!bookingLink || shortening) return;
    setShortening(true);
    try {
      const shortened = await shortenUrl(bookingLink);
      setBookingLink(shortened);
    } finally {
      setShortening(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {editingDraft ? 'Edit Email' : 'New Client Email'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {saved ? <Check size={16} className="text-green-600" /> : <Save size={16} />}
            {saved ? 'Saved' : saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#09364f] rounded-lg hover:bg-[#0a4060] transition-colors"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Form */}
        <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-200 bg-gray-50 space-y-5">
          {/* Proposal selector (hidden for workhuman outreach) */}
          {emailType !== 'workhuman-outreach' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Proposal</label>
              <select
                value={selectedProposalId}
                onChange={(e) => handleProposalSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
              >
                <option value="">— Select a proposal (optional) —</option>
                {sortedProposals.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.data.clientName || 'Untitled'} — {p.status} — {new Date(p.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Email type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Type</label>
            <div className="flex gap-2">
              {([
                { type: 'post-call' as EmailType, label: 'Post-Call' },
                { type: 'key-info' as EmailType, label: 'Key Info' },
                { type: 'workhuman-outreach' as EmailType, label: 'Workhuman' },
              ]).map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => {
                    setEmailType(type);
                    if (type === 'workhuman-outreach') {
                      setSubject(getWorkhumanSubject(workhumanDirection));
                    } else {
                      setSubject(getDefaultSubject(type, serviceVariant, companyName));
                    }
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    emailType === type
                      ? 'bg-[#09364f] text-white border-[#09364f]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Workhuman direction selector */}
          {emailType === 'workhuman-outreach' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <div className="flex gap-2">
                {([
                  { dir: 'safe' as WorkhumanDirection, label: 'Safe' },
                  { dir: 'medium' as WorkhumanDirection, label: 'Medium' },
                  { dir: 'brave' as WorkhumanDirection, label: 'Brave' },
                ]).map(({ dir, label }) => (
                  <button
                    key={dir}
                    onClick={() => {
                      setWorkhumanDirection(dir);
                      setSubject(getWorkhumanSubject(dir));
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      workhumanDirection === dir
                        ? 'bg-[#09364f] text-white border-[#09364f]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}{dir === 'medium' ? ' ★' : ''}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">★ Recommended direction</p>
            </div>
          )}

          {/* Service variant (only for key-info) */}
          {emailType === 'key-info' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select
                value={serviceVariant}
                onChange={(e) => {
                  setServiceVariant(e.target.value as ServiceVariant);
                  setSubject(getDefaultSubject(emailType, e.target.value as ServiceVariant, companyName));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
              >
                <option value="generic">Generic / Wellness</option>
                <option value="massage">Massage</option>
                <option value="hair">Hair & Styling</option>
                <option value="nails">Nails / Manicure</option>
              </select>
            </div>
          )}

          {/* Subject line */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
              placeholder="Email subject line..."
            />
          </div>

          <hr className="border-gray-200" />

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                placeholder="Jaimie"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                placeholder="Acme Corp"
              />
            </div>
          </div>

          {emailType !== 'workhuman-outreach' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                placeholder="e.g. Chair Massage Event, Wellness Day"
              />
            </div>
          )}

          {/* Workhuman outreach specific */}
          {emailType === 'workhuman-outreach' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Page Link (CTA)</label>
              <input
                value={workhumanBookingLink}
                onChange={(e) => setWorkhumanBookingLink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                placeholder="https://proposals.getshortcut.co/workhuman/recharge"
              />
              <p className="text-xs text-gray-400 mt-1">Links to the Workhuman landing page (to be built)</p>
            </div>
          )}

          {/* Post-call specific */}
          {emailType === 'post-call' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Link</label>
                <input
                  value={proposalLink}
                  onChange={(e) => setProposalLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                  placeholder="https://proposals.getshortcut.co/shared/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Signup Link</label>
                {proposalSignupLinks.length > 1 ? (
                  <select
                    value={testSignupLink}
                    onChange={(e) => setTestSignupLink(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                  >
                    <option value="">— Select a signup link —</option>
                    {proposalSignupLinks.map((link, i) => (
                      <option key={i} value={link.signupUrl}>
                        {link.eventName || link.eventLocation || `Link ${i + 1}`} — {link.signupUrl.split('/').pop()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={testSignupLink}
                    onChange={(e) => setTestSignupLink(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                    placeholder="https://admin.shortcutpros.com/#/signup/..."
                  />
                )}
                {proposalSignupLinks.length > 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <ExternalLink size={12} />
                    {proposalSignupLinks.length} signup {proposalSignupLinks.length === 1 ? 'link' : 'links'} found for this proposal
                  </p>
                )}
              </div>
            </>
          )}

          {/* Key-info specific */}
          {emailType === 'key-info' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                  <input
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    onBlur={() => setEventDate(formatDateAmerican(eventDate))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                    placeholder="e.g. Tuesday, February 10th"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Date</label>
                  <input
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    onBlur={() => setPaymentDueDate(formatDateAmerican(paymentDueDate))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                    placeholder="e.g. February 7th"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking / Signup Link</label>
                {proposalSignupLinks.length > 1 ? (
                  <div className="space-y-2">
                    <select
                      value={bookingLink}
                      onChange={(e) => setBookingLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                    >
                      <option value="">— Select a signup link —</option>
                      {proposalSignupLinks.map((link, i) => (
                        <option key={i} value={link.signupUrl}>
                          {link.eventName || link.eventLocation || `Link ${i + 1}`} — {link.signupUrl.split('/').pop()}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        value={bookingLink}
                        onChange={(e) => setBookingLink(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                        placeholder="Or paste a custom URL..."
                      />
                      <button
                        onClick={handleShortenBookingLink}
                        disabled={!bookingLink || shortening || bookingLink.includes('tinyurl.com')}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#09364f] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Shorten URL with TinyURL"
                      >
                        <Link size={14} />
                        {shortening ? 'Shortening...' : 'Shorten'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={bookingLink}
                      onChange={(e) => setBookingLink(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                      placeholder="https://admin.shortcutpros.com/#/signup/..."
                    />
                    <button
                      onClick={handleShortenBookingLink}
                      disabled={!bookingLink || shortening || bookingLink.includes('tinyurl.com')}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#09364f] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      title="Shorten URL with TinyURL"
                    >
                      <Link size={14} />
                      {shortening ? 'Shortening...' : 'Shorten'}
                    </button>
                  </div>
                )}
                {proposalSignupLinks.length > 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <ExternalLink size={12} />
                    {proposalSignupLinks.length} signup {proposalSignupLinks.length === 1 ? 'link' : 'links'} found for this proposal
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">This full URL will be shown in the employee blurb (not hyperlinked)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager Page Link</label>
                <input
                  value={managerPageLink}
                  onChange={(e) => setManagerPageLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                  placeholder="https://admin.shortcutpros.com/#/manager/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice / Payment Link</label>
                <input
                  value={invoiceLink}
                  onChange={(e) => setInvoiceLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                  placeholder="Online payment page URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Sign Link</label>
                <input
                  value={qrCodeSignLink}
                  onChange={(e) => setQrCodeSignLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                  placeholder="https://proposals.getshortcut.co/qr-code-sign/..."
                />
              </div>

              {/* Pro Info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Pro Team</label>
                  <button
                    onClick={addPro}
                    className="flex items-center gap-1 text-xs font-medium text-[#09364f] hover:text-[#0a4060] transition-colors"
                  >
                    <Plus size={14} /> Add Pro
                  </button>
                </div>
                <div className="space-y-2">
                  {proInfo.map((pro, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={pro.name}
                        onChange={(e) => updatePro(i, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                        placeholder="Pro name"
                      />
                      <input
                        value={pro.type}
                        onChange={(e) => updatePro(i, 'type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#09364f] focus:border-[#09364f]"
                        placeholder="Service type"
                      />
                      {proInfo.length > 1 && (
                        <button
                          onClick={() => removePro(i)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right panel — Preview */}
        <div className="w-1/2 overflow-hidden flex flex-col bg-white">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Preview</div>
            {subject && <div className="text-sm font-medium text-gray-800 mt-1">Subject: {subject}</div>}
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              ref={iframeRef}
              srcDoc={generatedHtml}
              className="w-full h-full border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientEmailCreator;
