import React, { useState } from 'react';
import { Award, ChevronDown } from 'lucide-react';
import { CardHeading, Eyebrow, T } from '../shared/primitives';
import { IconSwatch } from './SectionPrimitives';
import { CLE_ACCREDITATION_BULLETS } from './serviceContent';

// CLEAccreditationSection — collapsible explainer of Shortcut's CLE
// administration. Closed by default; tap to open. Renders only for CLE
// mindfulness proposals.

const CLEAccreditationSection: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 20,
        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '24px 28px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconSwatch name="Award" />
          <div>
            <Eyebrow>Continuing Legal Education</Eyebrow>
            <CardHeading size="card" style={{ marginTop: 4 }}>
              Accreditation & administration
            </CardHeading>
            {!open && (
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.fgMuted,
                  marginTop: 6,
                  lineHeight: 1.5,
                  maxWidth: 520,
                }}
              >
                Shortcut handles the full CLE workflow so your firm doesn't
                touch the paperwork. Tap to see what we manage.
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: T.lightGray,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transform: open ? 'none' : 'rotate(-90deg)',
            transition: 'transform .2s',
          }}
        >
          <ChevronDown size={18} color={T.navy} strokeWidth={2.5} />
        </div>
      </button>
      {open && (
        <div
          style={{
            padding: '0 28px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              background: 'rgba(158,250,255,.18)',
              borderRadius: 12,
              fontFamily: T.fontD,
              fontSize: 14,
              color: T.navy,
              lineHeight: 1.55,
            }}
          >
            This program is offered as an accredited Continuing Legal Education
            (CLE) course, approved for{' '}
            <strong>Ethics & Professionalism credit</strong> in the
            jurisdictions we serve.
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {CLE_ACCREDITATION_BULLETS.map((b, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  background: T.beige,
                  borderRadius: 10,
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: T.navy,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: T.success,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CLEAccreditationSection;
