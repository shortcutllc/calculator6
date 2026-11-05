import React from 'react';
import type { OpsAgreements, OpsAgreementState } from '../../services/opsService';

// The paperwork and readiness badges for one Pro: the two DocuSeal packs from
// /pro-agreements (contractor agreement, workers' comp waiver), whether they still need
// an orientation (no event worked yet), and on an event seat whether they've confirmed it
// in the Pros app. Missing paperwork links to the Agreements page to send it.

function docBadge(label: string, state: OpsAgreementState | undefined) {
  if (state === 'signed') return { text: `${label} ✓`, cls: 'is-ok' };
  if (state === 'sent' || state === 'opened' || state === 'pending') return { text: `${label} sent, not signed`, cls: 'is-wait' };
  if (state === 'declined' || state === 'expired') return { text: `${label} ${state}`, cls: 'is-bad' };
  return { text: `No ${label.toLowerCase()}`, cls: 'is-bad' };
}

export const ProBadges: React.FC<{
  agreements?: OpsAgreements;
  orientation?: 'done' | 'new';
  confirmedInApp?: boolean;
  showSendLink?: boolean;
}> = ({ agreements, orientation, confirmedInApp, showSendLink }) => {
  if (!agreements && !orientation && confirmedInApp === undefined) return null;
  const badges: { text: string; cls: string }[] = [];
  if (confirmedInApp !== undefined) {
    badges.push(confirmedInApp ? { text: 'Confirmed in app ✓', cls: 'is-ok' } : { text: 'Not confirmed in app yet', cls: 'is-wait' });
  }
  if (agreements) {
    badges.push(docBadge('Agreement', agreements.contractor));
    badges.push(docBadge('Workers comp', agreements.workersComp));
  }
  if (orientation === 'new') badges.push({ text: 'New Pro: needs orientation', cls: 'is-wait' });
  const missing = agreements && (agreements.contractor !== 'signed' || agreements.workersComp !== 'signed');
  return (
    <div className="ops-badges">
      {badges.map((b) => (
        <span key={b.text} className={`ops-badge ${b.cls}`}>
          {b.text}
        </span>
      ))}
      {showSendLink && missing && (
        <a className="ops-badge-link" href="/pro-agreements" target="_blank" rel="noreferrer">
          Send documents
        </a>
      )}
    </div>
  );
};

/** "2 not confirmed · 1 missing agreement · 1 new Pro" for a set of seats. */
export function seatSummary(
  seats: { placeholder: boolean; confirmedInApp: boolean; agreements?: OpsAgreements; orientation?: 'done' | 'new' }[]
): string {
  const real = seats.filter((s) => !s.placeholder);
  if (!real.length) return '';
  const notConfirmed = real.filter((s) => !s.confirmedInApp).length;
  const noAgreement = real.filter((s) => s.agreements && s.agreements.contractor !== 'signed').length;
  const noWC = real.filter((s) => s.agreements && s.agreements.workersComp !== 'signed').length;
  const fresh = real.filter((s) => s.orientation === 'new').length;
  const parts = [
    notConfirmed ? `${notConfirmed} not confirmed in app` : '',
    noAgreement ? `${noAgreement} missing the agreement` : '',
    noWC ? `${noWC} missing workers comp` : '',
    fresh ? `${fresh} new Pro${fresh === 1 ? '' : 's'} needing orientation` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Everyone confirmed, signed and oriented.';
}
