import React, { useState, useMemo } from 'react';
import { X, CalendarCheck, Loader2 } from 'lucide-react';
import { bookLeadAtBooth } from '../services/WorkhumanLeadService';
import { WorkhumanLead, VipSlotDay } from '../types/workhumanLead';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  lead: WorkhumanLead;
  onClose: () => void;
  onBooked: (updatedLead: Partial<WorkhumanLead> & { id: string }) => void;
}

const SENDER_MAP: Record<string, string> = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

const DAY_OPTIONS: { value: VipSlotDay; label: string }[] = [
  { value: 'day_1', label: 'Mon · Apr 27' },
  { value: 'day_2', label: 'Tue · Apr 28' },
  { value: 'day_3', label: 'Wed · Apr 29' },
];

// Preset time slots matching the landing page schedule
const PRESET_SLOTS: Record<VipSlotDay, string[]> = {
  day_1: ['1:00-3:00 PM', '3:00-5:30 PM'],
  day_2: ['8:00-10:00 AM', '10:00 AM-12:00 PM', '12:00-2:00 PM', '2:00-4:00 PM', '4:00-5:00 PM'],
  day_3: ['8:00-10:00 AM', '10:00 AM-12:00 PM', '12:00-2:00 PM', '2:00-4:00 PM'],
};

export const WorkhumanBookBoothModal: React.FC<Props> = ({ lead, onClose, onBooked }) => {
  const { user } = useAuth();
  const bookedBy = useMemo(() =>
    SENDER_MAP[user?.email?.toLowerCase() || ''] || user?.email || 'team', [user]);

  const [day, setDay] = useState<VipSlotDay>(lead.vip_slot_day || 'day_1');
  const [timeSlot, setTimeSlot] = useState<string>(lead.vip_slot_time || '');
  const [serviceType, setServiceType] = useState('Chair Massage');
  const [bookerNotes, setBookerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot.trim()) {
      setError('Time slot is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await bookLeadAtBooth({
        leadId: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        phone: lead.phone || lead.mobile_phone,
        day,
        timeSlot: timeSlot.trim(),
        serviceType,
        bookerNotes: bookerNotes.trim() || undefined,
        bookedBy,
      });
      if (!result.ok) {
        setError('Booking saved partially. Check the lead + Booth dashboard.');
        setSubmitting(false);
        return;
      }
      onBooked({
        id: lead.id,
        vip_slot_day: day,
        vip_slot_time: timeSlot.trim(),
        outreach_status: 'vip_booked',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Book Booth Appointment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
          <div className="text-sm">
            <div className="font-medium text-gray-900">{lead.name}</div>
            <div className="text-gray-500 text-xs">
              {lead.title ? `${lead.title} · ` : ''}{lead.company || '—'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Day</label>
            <div className="grid grid-cols-3 gap-2">
              {DAY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setDay(opt.value); setTimeSlot(''); }}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    day === opt.value
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Time slot</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {PRESET_SLOTS[day].map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={`px-2 py-1.5 rounded-lg text-xs transition-colors border ${
                    timeSlot === slot
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              placeholder="Or type custom (e.g. 3:15 PM)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="Chair Massage">Chair Massage</option>
              <option value="10-min Chair Massage">10-min Chair Massage</option>
              <option value="15-min Chair Massage">15-min Chair Massage</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={bookerNotes}
              onChange={e => setBookerNotes(e.target.value)}
              rows={2}
              placeholder="Anything the team should know about this booking..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Booking as <span className="font-medium text-gray-700">{bookedBy}</span>.
            This will update the lead's VIP slot <em>and</em> add them to the Booth day-of dashboard.
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !timeSlot.trim()}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><CalendarCheck size={14} /> Confirm booking</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
