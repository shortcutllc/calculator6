import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';
import { Eyebrow, CardHeading, T } from './shared/primitives';

// RequestChangesModal — client-facing modal triggered from the Approve CTA.
// User types what they'd like adjusted, hits submit. On submit:
//   - proposals.has_changes = true
//   - proposals.pending_review = true
//   - proposals.change_source = 'client'
//   - proposals.data.clientChangesNote = the text (appended history if existing)
//
// The proposal owner sees these on the internal viewer (Phase 3) and acts on
// them via the change-history drawer (Phase 4).

interface RequestChangesModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
  /** Previously-submitted note shown read-only at the top, if any. */
  previousNote?: string | null;
}

const RequestChangesModal: React.FC<RequestChangesModalProps> = ({
  open,
  onClose,
  onSubmit,
  previousNote,
}) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNote('');
      setSubmitting(false);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!note.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(note.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9,54,79,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 580,
          borderRadius: 20,
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 28px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255,80,80,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={20} color={T.coral} strokeWidth={2.25} />
            </div>
            <div>
              <Eyebrow color={T.coral} style={{ marginBottom: 4 }}>
                Request changes
              </Eyebrow>
              <CardHeading size="card">What would you like to adjust?</CardHeading>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 8,
              color: T.fgMuted,
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px' }}>
          {previousNote && (
            <div
              style={{
                background: T.lightGray,
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 14,
              }}
            >
              <Eyebrow style={{ marginBottom: 4 }}>Your previous note</Eyebrow>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.navy,
                  lineHeight: 1.5,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {previousNote}
              </p>
            </div>
          )}

          <p
            style={{
              fontFamily: T.fontD,
              fontSize: 14,
              color: T.fgMuted,
              lineHeight: 1.55,
              margin: '0 0 12px',
            }}
          >
            Let us know what you'd like changed — pricing, dates, services, anything.
            Your account team will review and follow up.
          </p>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Could we shift the May 14 massage event to May 21? Also curious about adding a second nail tech."
            disabled={submitting}
            rows={6}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1.5px solid #D5DDE3',
              borderRadius: 10,
              fontFamily: T.fontD,
              fontSize: 14,
              lineHeight: 1.5,
              color: T.navy,
              resize: 'vertical',
              outline: 'none',
              background: '#fff',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = T.coral;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D5DDE3';
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px 22px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: '1.5px solid rgba(0,0,0,0.12)',
              color: T.navy,
              borderRadius: 10,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !note.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              background: T.coral,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: submitting ? 'wait' : 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
              opacity: !note.trim() || submitting ? 0.6 : 1,
            }}
          >
            <Send size={14} />
            {submitting ? 'Sending…' : 'Send to team'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestChangesModal;
