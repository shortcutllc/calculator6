import React from 'react';
import { Eyebrow, CardHeading, T } from '../shared/primitives';

// "What's next" — 4 numbered steps connected by a vertical line. Step 1 is
// always the current step (filled coral); the rest are outlined.
//
// The active step can be driven by proposal status:
//   draft / pending_review → step 1 (review)
//   approved → step 3 (we coordinate)
//   completed (after event) → step 4 (survey)
//
// For v1 we hard-code step 1 active. Wire to proposal status when survey
// + completion states are added.

interface WhatsNextCardProps {
  /** Index (1-based) of the current step. Default 1. */
  activeStep?: 1 | 2 | 3 | 4;
}

const STEPS: { title: string; copy: string }[] = [
  {
    title: 'Review and approve',
    copy: 'Adjust the services and frequencies above, then click approve.',
  },
  {
    title: 'Quick logistics call',
    copy: 'We confirm dates, venues, and any onsite specifics with you.',
  },
  {
    title: 'We coordinate everything',
    copy: 'Our pros, equipment, and signage show up day-of, no work on your side.',
  },
  {
    title: 'Post-event survey',
    copy: 'Light feedback so we can keep raising the bar each event.',
  },
];

const WhatsNextCard: React.FC<WhatsNextCardProps> = ({ activeStep = 1 }) => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 24px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Eyebrow style={{ marginBottom: 6 }}>What's next</Eyebrow>
      <CardHeading size="item" style={{ marginBottom: 18 }}>
        Here's the flow from here
      </CardHeading>

      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          position: 'relative',
        }}
      >
        {/* Vertical line connecting steps */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 13,
            top: 13,
            bottom: 13,
            width: 2,
            background: 'rgba(0,0,0,0.06)',
            zIndex: 0,
          }}
        />

        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === activeStep;
          const isPast = stepNum < activeStep;
          return (
            <li
              key={step.title}
              style={{
                display: 'flex',
                gap: 14,
                marginBottom: i === STEPS.length - 1 ? 0 : 18,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isActive ? T.coral : isPast ? T.success : '#fff',
                  border: isActive
                    ? 'none'
                    : isPast
                    ? 'none'
                    : '1.5px solid rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 12,
                  color: isActive || isPast ? '#fff' : T.fgMuted,
                  flexShrink: 0,
                  boxShadow: isActive
                    ? '0 2px 6px rgba(255,80,80,0.3)'
                    : 'none',
                }}
              >
                {isPast ? '✓' : stepNum}
              </div>
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.navy,
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                    lineHeight: 1.5,
                    marginTop: 2,
                  }}
                >
                  {step.copy}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default WhatsNextCard;
