import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Eyebrow, CardHeading, T } from '../shared/primitives';

// SignupLinkCard — sidebar CTA card that surfaces a test-event URL the
// admin pasted in edit mode. The point isn't for the prospect to RSVP
// — it's to let them step through the *employee* booking flow on a
// sample event so they can feel the tech before greenlighting the
// real one. Mirrors the framing already shipped in our post-call
// email template ("experience our seamless booking technology from
// the employee perspective" → "Try the Demo"). Renders null when no
// URL is set so default proposals stay clean. The URL is read from
// `data.signupLink` on the proposal.

interface SignupLinkCardProps {
  url?: string | null;
  /** Optional copy override; defaults match the brand voice. */
  title?: string;
  description?: string;
}

const isProbablyValidUrl = (raw: string): boolean => {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // Accept anything that parses as a URL with an http(s) protocol, or
  // a bare domain that we can prefix with https:// safely.
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return !!u.host;
  } catch {
    return false;
  }
};

const normaliseUrl = (raw: string): string =>
  /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;

const SignupLinkCard: React.FC<SignupLinkCardProps> = ({
  url,
  title = 'See the employee booking flow',
  description = "Step through the same seamless sign-up your team will see on event day — book a sample appointment, no real reservation made.",
}) => {
  if (!url || !isProbablyValidUrl(url)) return null;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: '20px 22px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Eyebrow color={T.coral}>Try the booking flow</Eyebrow>
      <CardHeading size="card">{title}</CardHeading>
      <p
        style={{
          fontFamily: T.fontD,
          fontSize: 13,
          color: T.fgMuted,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {description}
      </p>
      <a
        href={normaliseUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '11px 16px',
          background: T.coral,
          color: '#fff',
          borderRadius: 10,
          fontFamily: T.fontUi,
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
        }}
      >
        Try the demo
        <ExternalLink size={14} />
      </a>
    </div>
  );
};

export default SignupLinkCard;
