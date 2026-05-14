import React from 'react';
import { CheckCircle2, MousePointerClick, Pencil, X } from 'lucide-react';
import { CardHeading, Eyebrow, T } from './shared/primitives';

// HelpModal — "How this works" cards. Three-step explainer V1 had behind the
// info icon. Rebuilt with V2 design tokens; opens from a `?` button in the
// sticky header of StandaloneProposalViewerV2.

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS: Array<{
  icon: React.ReactElement;
  eyebrow: string;
  title: string;
  body: string;
}> = [
  {
    icon: <MousePointerClick size={22} color={T.navy} strokeWidth={2.25} />,
    eyebrow: '01 · Review',
    title: "Look over everything we've put together",
    body:
      'Every service, date, and location is laid out below. Frequencies and totals update live as you toggle services in or out.',
  },
  {
    icon: <Pencil size={22} color={T.navy} strokeWidth={2.25} />,
    eyebrow: '02 · Tune it',
    title: 'Edit anything that needs to flex',
    body:
      'Adjust hours, pros, or how often each service runs. Need something different? Hit Request changes and your account lead will take a look.',
  },
  {
    icon: <CheckCircle2 size={22} color={T.success} strokeWidth={2.25} />,
    eyebrow: '03 · Confirm',
    title: 'Approve when it looks right',
    body:
      'One click locks in your selections at the live total. Our team handles the rest — scheduling, invoicing, day-of logistics.',
  },
];

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
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
          maxWidth: 720,
          background: '#fff',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
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
          <div>
            <Eyebrow>How this works</Eyebrow>
            <CardHeading size="card" style={{ marginTop: 4 }}>
              Three steps from review to approval
            </CardHeading>
          </div>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              style={{
                padding: '18px 20px',
                background: T.beige,
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step.icon}
              </div>
              <Eyebrow>{step.eyebrow}</Eyebrow>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 700,
                  fontSize: 16,
                  color: T.navy,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.25,
                }}
              >
                {step.title}
              </div>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.fgMuted,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '11px 22px',
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
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
