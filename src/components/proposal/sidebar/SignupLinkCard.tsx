import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Eyebrow, CardHeading, T } from '../shared/primitives';

// SignupLinkCard — sidebar CTA card that surfaces a free-form demo /
// sign-up URL pasted by the admin in edit mode. Renders nothing when
// no URL is set so the sidebar stays clean for proposals that don't
// need a sign-up flow yet. Used in both V2 viewers (standalone +
// admin); the URL is read from `data.signupLink` on the proposal.

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
  title = 'Sign up for the demo',
  description = 'Reserve your spot or share the link with your team — it stays open until the event date.',
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
      <Eyebrow color={T.coral}>Demo sign-up</Eyebrow>
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
        Sign up now
        <ExternalLink size={14} />
      </a>
    </div>
  );
};

export default SignupLinkCard;
