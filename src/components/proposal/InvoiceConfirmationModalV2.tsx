import React, { useEffect, useState } from 'react';
import { Plus, Send, Trash2, X } from 'lucide-react';
import { CardHeading, Eyebrow, T } from './shared/primitives';
import { formatCurrency } from './data';
import {
  addDays,
  defaultPaymentDue,
  longDate,
  parseIsoDate,
  paymentDueNote,
  toIsoDate,
} from '../../../netlify/functions/lib/invoice-defaults.js';
import type { PaymentDueDefault } from '../../../netlify/functions/lib/invoice-defaults.js';

// InvoiceConfirmationModalV2 — V2-styled drop-in replacement for
// `InvoiceConfirmationModal`. Same props (`isOpen`, `onClose`, `onSend`, etc.)
// so the admin viewer can swap it in without changing call-sites.

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

interface InvoiceConfirmationModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: {
    clientName: string;
    clientEmail: string;
    lineItems: InvoiceLineItem[];
    /** Calendar day payment is due, "YYYY-MM-DD". */
    dueDate: string;
    proposalId?: string;
    sendToClient?: boolean;
  }) => Promise<void>;
  initialName?: string;
  initialEmail?: string;
  initialItems?: InvoiceLineItem[];
  /** Where the due date starts (48 hours before the event); 30 days out without one. */
  paymentDue?: PaymentDueDefault;
  /** The survey's billing contact answer, shown so staff can check name and email against it. */
  billingContactText?: string | null;
  proposalId?: string;
  loading?: boolean;
  error?: string | null;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontFamily: T.fontD,
  fontSize: 14,
  color: T.navy,
  background: '#fff',
  border: '1.5px solid rgba(0,0,0,0.12)',
  borderRadius: 10,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: T.fontUi,
  fontWeight: 700,
  fontSize: 11,
  color: T.fgMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 6,
};

export const InvoiceConfirmationModalV2: React.FC<InvoiceConfirmationModalV2Props> = ({
  isOpen,
  onClose,
  onSend,
  initialName = '',
  initialEmail = '',
  initialItems = [],
  paymentDue,
  billingContactText,
  proposalId,
  loading = false,
  error: externalError = null,
}) => {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [items, setItems] = useState<InvoiceLineItem[]>(initialItems);
  const due = paymentDue || defaultPaymentDue(null);
  const [dueDate, setDueDate] = useState(due.dueDate);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync state when the parent passes new initial values (e.g. proposal switch).
  useEffect(() => {
    setName(initialName);
    setEmail(initialEmail);
    setItems(initialItems);
    setDueDate(due.dueDate);
    setLocalError(null);
  }, [initialName, initialEmail, initialItems, due.dueDate]);

  if (!isOpen) return null;

  const displayError = externalError || localError;
  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const tomorrow = addDays(toIsoDate(new Date()), 1) as string;
  const dueNote = paymentDueNote(due);

  const updateItem = (idx: number, field: keyof InvoiceLineItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () =>
    setItems((prev) => [...prev, { description: '', amount: 0 }]);

  const submit = (sendToClient: boolean) => {
    if (sendToClient && (!email.trim() || !email.includes('@'))) {
      setLocalError('Enter a valid email address to send the invoice.');
      return;
    }
    if (!name.trim()) {
      setLocalError('Client name is required.');
      return;
    }
    if (items.length === 0) {
      setLocalError('Add at least one line item.');
      return;
    }
    if (!parseIsoDate(dueDate)) {
      setLocalError('Pick the date payment is due.');
      return;
    }
    if (dueDate < tomorrow) {
      setLocalError('Pick a due date after today. Stripe does not take today or earlier.');
      return;
    }
    setLocalError(null);
    onSend({
      clientName: name.trim(),
      clientEmail: email.trim(),
      lineItems: items,
      dueDate,
      proposalId,
      sendToClient,
    });
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9,54,79,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '24px 28px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 1,
          }}
        >
          <div>
            <Eyebrow>Stripe invoice</Eyebrow>
            <CardHeading size="card" style={{ marginTop: 4 }}>
              Review and send
            </CardHeading>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: T.fgMuted,
              display: 'inline-flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '20px 28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Client + due date */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Client name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Client email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {billingContactText && (
            <div
              style={{
                padding: '10px 14px',
                background: T.beige,
                borderRadius: 10,
              }}
            >
              <span style={labelStyle}>Billing contact on the survey</span>
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.navy,
                  whiteSpace: 'pre-line',
                }}
              >
                {billingContactText}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="invoice-due-date-v2" style={labelStyle}>
              Payment due
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input
                id="invoice-due-date-v2"
                type="date"
                value={dueDate}
                min={tomorrow}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inputStyle, width: 'auto' }}
              />
              {parseIsoDate(dueDate) && (
                <span style={{ fontFamily: T.fontD, fontSize: 14, color: T.navy }}>
                  {longDate(dueDate)}
                </span>
              )}
            </div>
            {dueNote && (
              <div
                style={{
                  marginTop: 6,
                  fontFamily: T.fontD,
                  fontSize: 12,
                  color: T.fgMuted,
                }}
              >
                {dueNote}
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <Eyebrow>Line items</Eyebrow>
              <button
                type="button"
                onClick={addItem}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: '#fff',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 12,
                  color: T.navy,
                }}
              >
                <Plus size={12} />
                Add item
              </button>
            </div>

            {items.length === 0 ? (
              <div
                style={{
                  padding: '14px 16px',
                  background: T.beige,
                  borderRadius: 10,
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.fgMuted,
                }}
              >
                No line items yet. Add at least one before sending.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 40px',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      value={it.description}
                      placeholder="Description"
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      style={inputStyle}
                    />
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0 10px',
                        background: '#fff',
                        border: '1.5px solid rgba(0,0,0,0.12)',
                        borderRadius: 10,
                      }}
                    >
                      <span style={{ color: T.fgMuted, fontFamily: T.fontD, fontSize: 14 }}>
                        $
                      </span>
                      <input
                        type="number"
                        value={it.amount}
                        onChange={(e) =>
                          updateItem(idx, 'amount', parseFloat(e.target.value) || 0)
                        }
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          fontFamily: T.fontD,
                          fontWeight: 700,
                          fontSize: 14,
                          color: T.navy,
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      title="Remove"
                      style={{
                        padding: 8,
                        background: 'transparent',
                        border: '1.5px solid rgba(255,80,80,0.25)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        color: T.coral,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: T.navy,
              color: '#fff',
              borderRadius: 14,
            }}
          >
            <Eyebrow color="rgba(255,255,255,0.55)">Invoice total</Eyebrow>
            <span
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 28,
                color: T.aqua,
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(total)}
            </span>
          </div>

          {displayError && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255,80,80,0.10)',
                border: '1px solid rgba(255,80,80,0.30)',
                borderRadius: 10,
                color: T.coral,
                fontFamily: T.fontD,
                fontSize: 13,
              }}
            >
              {displayError}
            </div>
          )}
        </div>

        {/* Footer actions — sticky so they stay visible on long item lists */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: '#fff',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            padding: '16px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '11px 18px',
              background: '#fff',
              color: T.navy,
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 13,
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={loading}
              style={{
                padding: '11px 18px',
                background: 'transparent',
                color: T.navy,
                border: '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: 10,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                opacity: loading ? 0.6 : 1,
              }}
              title="Create the invoice in Stripe without emailing the client yet"
            >
              {loading ? 'Saving…' : 'Save as draft'}
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={loading}
              style={{
                padding: '11px 22px',
                background: T.coral,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Send size={13} />
              {loading ? 'Sending…' : 'Send to client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceConfirmationModalV2;
