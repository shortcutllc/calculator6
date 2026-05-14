import React, { useState } from 'react';
import { Eyebrow, T } from '../shared/primitives';

// TrustCard — big rebooking stat + client-logo grid. Real logos drop into
// `/public/clients/{slug}.svg|png|webp`. The component attempts to load each
// logo image and falls back to a styled initials tile if the asset 404s, so
// rolling out the real logos is just "add the file, set has404=false".

interface TrustClient {
  name: string;
  /** Public asset path. Leave empty to skip the <img> attempt. */
  logoSrc?: string;
  /** Tile background to use when no logo asset is found. */
  bg: string;
  /** Initials displayed in the fallback. */
  initials: string;
}

// Real client roster — same SVG set used on the V1 HolidayProposal trusted-by
// grid (public/Holiday Proposal/Parnter Logos/). Initials/bg are fallbacks
// only used when the asset 404s. Order favors well-known names.
const TRUSTED_CLIENTS: TrustClient[] = [
  { name: 'DraftKings', logoSrc: '/Holiday Proposal/Parnter Logos/DraftKings.svg', initials: 'DK', bg: '#1F2937' },
  { name: 'NFL', logoSrc: '/Holiday Proposal/Parnter Logos/NFL.svg', initials: 'NFL', bg: '#013369' },
  { name: 'Paramount', logoSrc: '/Holiday Proposal/Parnter Logos/Paramount.svg', initials: 'PM', bg: '#0064FF' },
  { name: 'Warner Bros.', logoSrc: '/Holiday Proposal/Parnter Logos/Warner Bros.svg', initials: 'WB', bg: '#0F1F4B' },
  { name: 'PwC', logoSrc: '/Holiday Proposal/Parnter Logos/PwC.svg', initials: 'PwC', bg: '#DC6900' },
  { name: 'BCG', logoSrc: '/Holiday Proposal/Parnter Logos/BCG.svg', initials: 'BCG', bg: '#16573B' },
  { name: 'Wix', logoSrc: '/Holiday Proposal/Parnter Logos/Wix.svg', initials: 'Wix', bg: '#000000' },
  { name: 'Tripadvisor', logoSrc: '/Holiday Proposal/Parnter Logos/Tripadvisor.svg', initials: 'TA', bg: '#34E0A1' },
  { name: 'Betterment', logoSrc: '/Holiday Proposal/Parnter Logos/betterment-logo-vector-2023.svg', initials: 'BM', bg: '#003B49' },
];

interface TrustClientTileProps {
  client: TrustClient;
}
const TrustClientTile: React.FC<TrustClientTileProps> = ({ client }) => {
  const [imgFailed, setImgFailed] = useState(!client.logoSrc);
  return (
    <div
      title={client.name}
      style={{
        aspectRatio: '16 / 9',
        borderRadius: 8,
        background: imgFailed ? client.bg : '#fff',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.fontD,
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: '0.04em',
        overflow: 'hidden',
        border: imgFailed ? 'none' : '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {!imgFailed && client.logoSrc ? (
        <img
          src={client.logoSrc}
          alt={client.name}
          onError={() => setImgFailed(true)}
          style={{
            maxWidth: '70%',
            maxHeight: '60%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        client.initials
      )}
    </div>
  );
};

const TrustCard: React.FC = () => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 24px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Eyebrow style={{ marginBottom: 12 }}>Trusted by 500+ companies</Eyebrow>

      <div
        style={{
          background: 'rgba(158,250,255,.2)',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: T.fontD,
            fontWeight: 800,
            fontSize: 44,
            color: T.navy,
            letterSpacing: '-0.025em',
            lineHeight: 1,
          }}
        >
          87%
        </span>
        <span
          style={{
            fontFamily: T.fontD,
            fontWeight: 600,
            fontSize: 14,
            color: T.navy,
          }}
        >
          rebook within 6 months
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {TRUSTED_CLIENTS.map((c) => (
          <TrustClientTile key={c.name} client={c} />
        ))}
      </div>
    </div>
  );
};

export default TrustCard;
