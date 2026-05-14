import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, X } from 'lucide-react';
import { Eyebrow, CardHeading, T } from './shared/primitives';
import ServiceAgreement from '../ServiceAgreement';

// ServiceAgreementCard — collapsed-by-default summary of the *real* Shortcut
// Events Service Agreement. The 4 quick-reads pull directly from the
// signed-terms doc (ServiceAgreement.tsx). The "Read full agreement" link
// opens a modal that renders that full doc verbatim, with the client's name
// substituted into the Partner field (the only per-client customization
// the agreement currently has).

interface ServiceAgreementCardProps {
  /** Used in the modal to personalize the "Partner" references in the doc. */
  clientName?: string;
}

const QUICK_READS: { title: string; body: string }[] = [
  {
    title: 'Payment terms',
    body: 'Shortcut invoices before each event. Payment is due 48 hours prior to the first scheduled event. Late payments past the grace period may incur a 5% fee.',
  },
  {
    title: 'Cancellation',
    body: '72+ hours notice: no penalty. 48–72 hours: may be a 25% service charge. Less than 24 hours: may be a 50% service charge. Charges are at our discretion and often waived if you reschedule.',
  },
  {
    title: 'On-site logistics',
    body: 'We bring all equipment, supplies, and fully insured pros. You provide the space and ensure minimum participant requirements are met. Additional providers or hours need 5 days notice; new events need 7.',
  },
  {
    title: 'Insurance & liability',
    body: 'Shortcut maintains $2M general liability per occurrence. Each party indemnifies the other for its own negligence. Confidentiality protections apply during and after the term.',
  },
];

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
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            width: '100%',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 16,
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: T.lightGray,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={18} color={T.navy} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 700,
                  fontSize: 15,
                  color: T.navy,
                }}
              >
                Service agreement
              </div>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 12,
                  color: T.fgMuted,
                }}
              >
                Payment, cancellation, on-site logistics
              </div>
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 12,
              color: T.coral,
              letterSpacing: '0.02em',
            }}
          >
            Quick view
            <ChevronDown size={14} />
          </span>
        </button>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 18,
              gap: 16,
            }}
          >
            <div>
              <Eyebrow style={{ marginBottom: 6 }}>Service agreement</Eyebrow>
              <CardHeading size="section">The key terms</CardHeading>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                color: T.coral,
              }}
            >
              Hide
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 14,
            }}
          >
            {QUICK_READS.map((t) => (
              <div
                key={t.title}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '20px 22px',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 15,
                    color: T.navy,
                    marginBottom: 6,
                  }}
                >
                  {t.title}
                </div>
                <p
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.fgMuted,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {t.body}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFullModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              background: '#fff',
              border: `1.5px solid ${T.navy}`,
              borderRadius: 10,
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
      )}

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
            {/* Re-use the existing ServiceAgreement component but force the
                "expanded" state by rendering it inside a wrapper that hides
                the original collapse button. We pass clientName so the doc
                substitutes "{clientName} (Partner)" properly. */}
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
