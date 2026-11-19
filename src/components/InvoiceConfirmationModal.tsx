import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Trash2, X, Link2, Send } from 'lucide-react';
import { Button } from './Button';
import {
  addDays,
  defaultPaymentDue,
  longDate,
  parseIsoDate,
  paymentDueNote,
  toIsoDate,
} from '../../netlify/functions/lib/invoice-defaults.js';
import type { PaymentDueDefault } from '../../netlify/functions/lib/invoice-defaults.js';

export interface InvoiceLineItem {
  description: string;
  amount: number; // dollars
}

interface InvoiceConfirmationModalProps {
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

export const InvoiceConfirmationModal: React.FC<InvoiceConfirmationModalProps> = ({
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
  error: externalError = null
}) => {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [items, setItems] = useState<InvoiceLineItem[]>(initialItems);
  const due = paymentDue || defaultPaymentDue(null);
  const [dueDate, setDueDate] = useState(due.dueDate);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync when props change (e.g. different proposal selected)
  useEffect(() => {
    setName(initialName);
    setEmail(initialEmail);
    setItems(initialItems);
    setDueDate(due.dueDate);
    setLocalError(null);
  }, [initialName, initialEmail, initialItems, due.dueDate]);

  if (!isOpen) return null;

  const displayError = externalError || localError;

  const updateItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', amount: 0 }]);
  };

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const tomorrow = addDays(toIsoDate(new Date()), 1) as string;
  const dueNote = paymentDueNote(due);

  const handleSubmit = (sendToClient: boolean) => {
    if (sendToClient && (!email.trim() || !email.includes('@'))) {
      setLocalError('Please enter a valid email address to send the invoice');
      return;
    }
    if (!name.trim()) {
      setLocalError('Client name is required');
      return;
    }
    if (items.length === 0) {
      setLocalError('At least one line item is required');
      return;
    }
    if (!parseIsoDate(dueDate)) {
      setLocalError('Pick the date payment is due');
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
      sendToClient
    });
  };

  const handleClose = () => {
    setLocalError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Review Invoice</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Client Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Client Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
              />
            </div>
          </div>

          {billingContactText && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Billing contact on the survey</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{billingContactText}</p>
            </div>
          )}

          {/* Line Items */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Line Items</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      value={item.amount || ''}
                      onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent text-right"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-shortcut-blue hover:text-shortcut-teal transition-colors"
            >
              <Plus size={14} />
              Add Line Item
            </button>
          </div>

          {/* Payment Due */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="invoice-due-date" className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Due</label>
              <input
                id="invoice-due-date"
                type="date"
                value={dueDate}
                min={tomorrow}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent"
              />
              {parseIsoDate(dueDate) && (
                <span className="text-sm text-gray-600">{longDate(dueDate)}</span>
              )}
            </div>
            {dueNote && <p className="mt-1.5 text-xs text-gray-600">{dueNote}</p>}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold text-gray-900">
              ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Error */}
          {displayError && (
            <p className="text-red-600 text-sm">{displayError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <Button
            onClick={handleClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading || items.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Create invoice without emailing the client — get the link and PDF to share yourself"
            >
              <Link2 size={16} />
              {loading ? 'Creating...' : 'Create Only'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading || items.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#635BFF] hover:bg-[#4B45C6] text-white font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Send size={16} />
              {loading ? 'Sending...' : 'Send to Client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
