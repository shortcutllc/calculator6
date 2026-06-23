import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, X } from 'lucide-react';
import { Eyebrow, CardHeading, T } from './shared/primitives';
import ServiceAgreement from '../ServiceAgreement';

// ServiceAgreementCard — design refresh: a compact pv-agreement-row that
// expands a pv-agreement-body with the key terms. "Read the full agreement"
// opens the real signed-terms doc (ServiceAgreement.tsx) in a modal, with the
// client's name substituted into the Partner field.

interface ServiceAgreementCardProps {
  /** Used in the modal to personalize the "Partner" references in the doc. */
  clientName?: string;
}

const ServiceAgreementCard: React.FC<ServiceAgreementCardProps> = ({ clientName }) => {
  const [expanded, setExpanded] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  // Close modal on Esc
  useEffect(() => {
    if (!showFullModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFullModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showFullModal]);

  return (
    <>
      <div
        className="pv-agreement-row"
        role="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="ic">
          <FileText size={19} />
        </div>
        <div>
          <h4>Service agreement</h4>
          <p>Payment, cancellation, on-site logistics</p>
        </div>
        <span className="qv">
          {expanded ? 'Hide' : 'Quick view'}
          <ChevronDown
            size={15}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform .2s',
            }}
          />
        </span>
      </div>
      <div className={'pv-agreement-body' + (expanded ? ' open' : '')}>
        <p>
          Invoice issued before each event. Payment due 48 hours prior to the first
          scheduled event. Cancellation: 72+ hours notice = no charge; 48 to 72 hours,
          a 25% service charge may apply; under 24 hours, 50%.
        </p>
        <p>
          Shortcut provides all professionals, equipment, and setup. The client provides
          the event space and standard building access. Full terms apply on approval.
        </p>
        <button
          type="button"
          onClick={() => setShowFullModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
            padding: '9px 16px',
            background: '#fff',
            border: `1.5px solid ${T.navy}`,
            borderRadius: 9999,
            cursor: 'pointer',
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 13,
            color: T.navy,
          }}
        >
          <FileText size={14} />
          Read the full agreement
        </button>
      </div>

      {/* Full-agreement modal */}
      {showFullModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowFullModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9,54,79,0.45)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 100,
            padding: '40px 16px',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 760,
              borderRadius: 20,
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowFullModal(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: T.navy,
                zIndex: 1,
              }}
            >
              <X size={16} />
            </button>
            <div style={{ padding: '24px 24px 8px' }}>
              <Eyebrow style={{ marginBottom: 6 }}>Full agreement</Eyebrow>
              <CardHeading size="card">Shortcut Events Service Agreement</CardHeading>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <ServiceAgreement clientName={clientName} forceExpanded />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceAgreementCard;
