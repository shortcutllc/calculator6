import React, { useState } from 'react';
import { Mail, Circle, Sparkles } from 'lucide-react';
import { Eyebrow, T } from '../shared/primitives';

// Account team static map — sourced from existing references in the codebase.
// Override per-proposal by setting data.accountTeamMemberEmail. Defaults to
// Jaimie when unset.
export interface AccountTeamMember {
  email: string;
  name: string;
  title: string;
  /** Static initial-based avatar; can be replaced with a real photo later. */
  initial: string;
  /** Avatar bg color */
  avatarBg: string;
}

export const ACCOUNT_TEAM: Record<string, AccountTeamMember> = {
  'jaimie@getshortcut.co': {
    email: 'jaimie@getshortcut.co',
    name: 'Jaimie Pritchard',
    title: 'Head of Operations · Shortcut',
    initial: 'J',
    avatarBg: 'var(--pv-coral)',
  },
  'will@getshortcut.co': {
    email: 'will@getshortcut.co',
    name: 'Will Newton',
    title: 'Co-founder · Shortcut',
    initial: 'W',
    avatarBg: 'var(--pv-teal)',
  },
  'marc@getshortcut.co': {
    email: 'marc@getshortcut.co',
    name: 'Marc Levitan',
    title: 'Sales · Shortcut',
    initial: 'M',
    avatarBg: 'var(--pv-navy)',
  },
  'caren@getshortcut.co': {
    email: 'caren@getshortcut.co',
    name: 'Caren Skutch',
    title: 'Sales · Shortcut',
    initial: 'C',
    avatarBg: '#9F5BB2',
  },
};

export const DEFAULT_TEAM_EMAIL = 'jaimie@getshortcut.co';

export const resolveTeamMember = (email?: string): AccountTeamMember => {
  if (email && ACCOUNT_TEAM[email]) return ACCOUNT_TEAM[email];
  return ACCOUNT_TEAM[DEFAULT_TEAM_EMAIL];
};

interface AccountTeamCardProps {
  email?: string;
  /** Optional personal note from the rep ("A note from Shortcut"). Rendered
   *  inside this card with a read-more toggle instead of as a separate block
   *  in the main column. */
  note?: string;
}

const NOTE_CLAMP = 150;

const AccountTeamCard: React.FC<AccountTeamCardProps> = ({ email, note }) => {
  const member = resolveTeamMember(email);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const trimmedNote = (note || '').trim();
  const isLongNote = trimmedNote.length > NOTE_CLAMP;
  const shownNote =
    isLongNote && !noteExpanded
      ? `${trimmedNote.slice(0, NOTE_CLAMP).replace(/\s+\S*$/, '')}…`
      : trimmedNote;
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 24px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Eyebrow style={{ marginBottom: 14 }}>Your account team</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: member.avatarBg,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: T.fontD,
            fontWeight: 800,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {member.initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.fontD,
              fontWeight: 700,
              fontSize: 16,
              color: T.navy,
              letterSpacing: '-0.01em',
            }}
          >
            {member.name}
          </div>
          <div
            style={{
              fontFamily: T.fontD,
              fontSize: 12,
              color: T.fgMuted,
              marginTop: 2,
            }}
          >
            {member.title}
          </div>
        </div>
      </div>

      {trimmedNote && (
        <div
          style={{
            marginBottom: 12,
            paddingTop: 12,
            borderTop: '1px dashed rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
            }}
          >
            <Sparkles size={13} color={T.aqua} strokeWidth={2.25} />
            <Eyebrow>A note from Shortcut</Eyebrow>
          </div>
          <p
            style={{
              fontFamily: T.fontD,
              fontSize: 13.5,
              color: T.fgMuted,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {shownNote}
            {isLongNote && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => setNoteExpanded((v) => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: T.coral,
                  }}
                >
                  {noteExpanded ? 'Read less' : 'Read more'}
                </button>
              </>
            )}
          </p>
        </div>
      )}

      <a
        href={`mailto:${member.email}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: T.fontD,
          fontWeight: 600,
          fontSize: 13,
          color: T.navy,
          textDecoration: 'none',
          padding: '6px 0',
        }}
      >
        <Mail size={14} color={T.fgMuted} />
        {member.email}
      </a>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px dashed rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: T.fontD,
          fontSize: 12,
          color: T.success,
          fontWeight: 600,
        }}
      >
        <Circle size={8} fill="currentColor" />
        Typically replies within 1 hour
      </div>
    </div>
  );
};

export default AccountTeamCard;
