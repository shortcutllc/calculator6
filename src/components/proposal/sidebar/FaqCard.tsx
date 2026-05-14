import React, { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { Eyebrow, T } from '../shared/primitives';

// FAQ card — short list of common questions. Static content for v1.

// Pulled from the Shortcut Events Service Agreement (ServiceAgreement.tsx).
// Update these when the master agreement updates.
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What happens if we need to cancel?',
    a: 'With 72+ hours notice there\'s no penalty. From 48–72 hours out, a 25% service charge may apply. Under 24 hours, a 50% charge may apply. Charges are at our discretion and often waived if you reschedule.',
  },
  {
    q: 'When and how do we pay?',
    a: 'We invoice before each event. Payment is due 48 hours before the first scheduled event. Late payments past the grace period may incur a 5% fee. Pay via ACH or card.',
  },
  {
    q: 'Are equipment and supplies included?',
    a: 'Yes. We bring all equipment, supplies, and fully insured pros. You provide the space and confirm minimum participant requirements are met.',
  },
  {
    q: 'Can we add more services later?',
    a: 'Yes — give us 5+ days notice for additional providers or hours on an existing event, and 7+ days notice for an entirely new event.',
  },
];

const FaqCard: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 24px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Eyebrow style={{ marginBottom: 14 }}>Common questions</Eyebrow>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {FAQ_ITEMS.map((item, i) => {
          const open = openIdx === i;
          return (
            <div
              key={item.q}
              style={{
                borderTop: i === 0 ? 'none' : '1px dashed rgba(0,0,0,0.08)',
                paddingTop: i === 0 ? 0 : 12,
                paddingBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 12,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: T.fontD,
                  fontWeight: 600,
                  fontSize: 14,
                  color: T.navy,
                  lineHeight: 1.35,
                }}
              >
                <span style={{ flex: 1 }}>{item.q}</span>
                <ChevronDown
                  size={16}
                  color={T.fgMuted}
                  style={{
                    flexShrink: 0,
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .2s',
                    marginTop: 2,
                  }}
                />
              </button>
              {open && (
                <p
                  style={{
                    fontFamily: T.fontD,
                    fontSize: 13,
                    color: T.fgMuted,
                    lineHeight: 1.55,
                    margin: '8px 0 0',
                  }}
                >
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <a
        href="mailto:hello@getshortcut.co?subject=Question%20about%20my%20proposal"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 8,
          fontFamily: T.fontUi,
          fontWeight: 700,
          fontSize: 13,
          color: T.coral,
          textDecoration: 'none',
        }}
      >
        Ask us anything
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
};

export default FaqCard;
