import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { CardHeading, Eyebrow, T } from './shared/primitives';
import { formatCurrency } from './data';

// ApproveConfirmModal — confirmation step before locking in a proposal.
// Mirrors V1's pre-approve modal but rebuilt with V2 design tokens.
//
// The body summarises what the client is committing to (total, services
// count, locations) so the click-to-approve is intentional rather than
// accidental.

interface ApproveConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Disable the confirm button while the underlying approval is in flight */
  busy?: boolean;
  total: number;
  servicesIncluded: number;
  servicesTotal: number;
  /** Optional name of the option being approved (multi-option proposals) */
  optionName?: string | null;
  /** Optional client first-name personalization */
  clientFirstName?: string;
}

const ApproveConfirmModal: React.FC<ApproveConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  busy,
  total,
  servicesIncluded,
  servicesTotal,
  optionName,
  clientFirstName,
}) => {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(30,158,106,.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <CheckCircle2 size={28} color={T.success} strokeWidth={2.25} />
        </div>

        <Eyebrow color={T.coral}>Final step</Eyebrow>
        <CardHeading size="card" style={{ marginTop: 6, marginBottom: 10 }}>
          {clientFirstName ? `${clientFirstName}, approve ` : 'Approve '}
          {optionName ? `"${optionName}"` : 'this proposal'}?
        </CardHeading>
        <p
          style={{
            fontFamily: T.fontD,
            fontSize: 14,
            color: T.fgMuted,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          Confirming locks in your selections. Our team will follow up with
          logistics, scheduling, and an invoice. You can still view this page
          anytime for reference.
        </p>

        {/* Summary card */}
        <div
          style={{
            marginTop: 22,
            padding: '18px 20px',
            background: T.beige,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <Eyebrow>Total today</Eyebrow>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 30,
                color: T.coral,
                letterSpacing: '-0.025em',
                marginTop: 4,
              }}
            >
              {formatCurrency(total)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Eyebrow>Services</Eyebrow>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 700,
                fontSize: 18,
                color: T.navy,
                letterSpacing: '-0.01em',
                marginTop: 4,
              }}
            >
              {servicesIncluded} of {servicesTotal}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '11px 18px',
              background: '#fff',
              color: T.navy,
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
              opacity: busy ? 0.6 : 1,
            }}
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: '11px 22px',
              background: T.coral,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
              boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Approving…' : 'Yes, approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveConfirmModal;
