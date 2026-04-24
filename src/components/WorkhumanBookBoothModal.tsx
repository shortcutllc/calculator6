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

/**
 * Build exact 15-minute-increment start times between `startMinutes` and
 * `endMinutes` (inclusive of start, exclusive of end so the last massage
 * finishes by close). Returns formatted strings like "8:00 AM", "8:15 AM".
 *
 * Booth hours (wall-clock, Orlando local):
 *   Mon Apr 27: 1:00 PM – 5:30 PM   (last start 5:15 PM)
 *   Tue Apr 28: 8:00 AM – 5:00 PM   (last start 4:45 PM)
 *   Wed Apr 29: 8:00 AM – 4:00 PM   (last start 3:45 PM)
 * Each massage = 15 minutes.
 */
function format12Hour(hour24: number, minute: number): string {
  const h = ((hour24 + 11) % 12) + 1; // 0→12, 13→1, etc.
  const meridiem = hour24 < 12 ? 'AM' : 'PM';
  return `${h}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

function buildSlots(startHour: number, startMin: number, endHour: number, endMin: number): string[] {
  const slots: string[] = [];
  const startTotal = startHour * 60 + startMin;
  const endTotal = endHour * 60 + endMin;
  // 15-min session → last start = close − 15
  const lastStart = endTotal - 15;
  for (let t = startTotal; t <= lastStart; t += 15) {
    slots.push(format12Hour(Math.floor(t / 60), t % 60));
  }
  return slots;
}

const DAY_SLOTS: Record<VipSlotDay, string[]> = {
  day_1: buildSlots(13, 0, 17, 30),  // Mon 1:00 PM – 5:30 PM
  day_2: buildSlots(8, 0, 17, 0),    // Tue 8:00 AM – 5:00 PM
  day_3: buildSlots(8, 0, 16, 0),    // Wed 8:00 AM – 4:00 PM
};

/** "8:15 AM" → "8:30 AM" (adds 15 minutes) */
function endTimeFromStart(start: string): string {
  const m = start.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  let total = h * 60 + min + 15;
  total = total % (24 * 60);
  return format12Hour(Math.floor(total / 60), total % 60);
}

export const WorkhumanBookBoothModal: React.FC<Props> = ({ lead, onClose, onBooked }) => {
  const { user } = useAuth();
  const bookedBy = useMemo(() =>
    SENDER_MAP[user?.email?.toLowerCase() || ''] || user?.email || 'team', [user]);

  const [day, setDay] = useState<VipSlotDay>(lead.vip_slot_day || 'day_1');
  const [timeSlot, setTimeSlot] = useState<string>(lead.vip_slot_time || '');
  const [serviceType, setServiceType] = useState('15-min Chair Massage');
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
                  onClick={() => {
                    setDay(opt.value);
                    // Clear slot if it's not valid for the new day
                    if (!DAY_SLOTS[opt.value].includes(timeSlot)) setTimeSlot('');
                  }}
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Start time <span className="text-gray-400 font-normal">(15-min increments, 15-min session)</span>
            </label>
            <select
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              required
            >
              <option value="">Select a start time</option>
              {DAY_SLOTS[day].map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
            {timeSlot && (
              <div className="mt-1.5 text-xs text-gray-500">
                15-min session ends at {endTimeFromStart(timeSlot)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="15-min Chair Massage">15-min Chair Massage</option>
              <option value="10-min Chair Massage">10-min Chair Massage</option>
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
