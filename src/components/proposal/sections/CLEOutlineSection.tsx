import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CardHeading, Eyebrow, T } from '../shared/primitives';
import { CLE_OUTLINE } from './serviceContent';

// CLEOutlineSection — collapsible 60-minute CLE class agenda. Closed by
// default (matching V1) — clients tap the header to open. Each row is its
// own card with the time range as an aqua eyebrow + bullet list.

const CLEOutlineSection: React.FC = () => {
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
        <div>
          <Eyebrow>60-minute agenda</Eyebrow>
          <CardHeading size="card" style={{ marginTop: 4 }}>
            CLE class outline
          </CardHeading>
          {!open && (
            <div
              style={{
                fontFamily: T.fontD,
                fontSize: 13,
                color: T.fgMuted,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Timed agenda covering ethics, mindfulness practice, and
              professional application. Tap to expand.
            </div>
          )}
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
            gap: 10,
          }}
        >
          {CLE_OUTLINE.map((row, i) => (
            <div
              key={i}
              style={{
                padding: '16px 18px',
                background: i % 2 === 0 ? 'rgba(158,250,255,.10)' : '#fff',
                border: '1px solid rgba(0,0,0,0.04)',
                borderRadius: 12,
              }}
            >
              <Eyebrow color={T.coral}>{row.timeRange}</Eyebrow>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontWeight: 700,
                  fontSize: 16,
                  color: T.navy,
                  letterSpacing: '-0.005em',
                  margin: '6px 0 10px',
                }}
              >
                {row.title}
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {row.bullets.map((b, j) => (
                  <li
                    key={j}
                    style={{
                      fontFamily: T.fontD,
                      fontSize: 13,
                      color: T.fgMuted,
                      lineHeight: 1.55,
                    }}
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CLEOutlineSection;
