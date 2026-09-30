import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Users } from 'lucide-react';
import { Modal, Card, CoralButton, OutlineButton, SOFT, LINE } from './headshot/brand';
import { supabase } from '../lib/supabaseClient';
import { HeadshotService } from '../services/HeadshotService';
import { CSVEmployeeData } from '../types/headshot';

interface CoordinatorSignup {
  timeslotId: string | null;
  name: string;
  email: string;
  phone: string | null;
  startTime: string | null;
  checkedIn: boolean;
  noShow: boolean;
  guests: string[];
  service: string | null;
}

interface FetchResult {
  eventId: string;
  eventName: string | null;
  timezoneOffset: number | null;
  signups: CoordinatorSignup[];
}

interface CoordinatorSignupImporterProps {
  eventId: string;
  onClose: () => void;
  onUpload: (employees: CSVEmployeeData[]) => Promise<void>;
}

// Coordinator offsets are positive minutes behind UTC (240 = EDT).
function formatSlot(iso: string | null, offset: number | null): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() - (offset ?? 0) * 60000);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const CoordinatorSignupImporter: React.FC<CoordinatorSignupImporterProps> = ({
  eventId,
  onClose,
  onUpload,
}) => {
  const [link, setLink] = useState('');
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FetchResult | null>(null);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    HeadshotService.getGalleriesByEvent(eventId)
      .then(galleries => setExistingEmails(new Set(galleries.map(g => g.email.trim().toLowerCase()))))
      .catch(err => console.warn('Could not load existing galleries:', err));
  }, [eventId]);

  const rows = useMemo(() => {
    if (!result) return [];
    const seen = new Set<string>();
    return result.signups.map(s => {
      let blocked: string | null = null;
      if (!s.name || !s.email) blocked = 'No email on the booking';
      else if (existingEmails.has(s.email)) blocked = 'Already has a gallery';
      else if (seen.has(s.email)) blocked = 'Booked more than once';
      if (s.email) seen.add(s.email);
      return { ...s, blocked };
    });
  }, [result, existingEmails]);

  const fetchSignups = async () => {
    setError('');
    setResult(null);
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You are signed out. Sign in again and retry.');

      const params = new URLSearchParams({ eventId: link });
      const response = await fetch(`/.netlify/functions/fetch-coordinator-signups?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not reach the coordinator');

      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the coordinator');
    } finally {
      setFetching(false);
    }
  };

  // Once rows are known, pre-select everyone importable who did not no-show.
  useEffect(() => {
    setSelected(new Set(rows.map((r, i) => (!r.blocked && !r.noShow ? i : -1)).filter(i => i >= 0)));
  }, [rows]);

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleImport = async () => {
    const employees: CSVEmployeeData[] = rows
      .filter((r, i) => selected.has(i) && !r.blocked)
      .map(r => ({ name: r.name, email: r.email, phone: r.phone || undefined }));
    if (!employees.length) return;

    setImporting(true);
    try {
      await onUpload(employees);
    } catch {
      setError('Import failed. Nobody was added, so it is safe to try again.');
    } finally {
      setImporting(false);
    }
  };

  const guestCount = rows.reduce((n, r) => n + r.guests.length, 0);
  const noShowCount = rows.filter(r => r.noShow).length;

  return (
    <Modal
      onClose={onClose}
      title="Import sign-ups from the coordinator"
      sub="Everyone who booked a timeslot gets their own gallery."
      wide
    >
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.09em] text-[#45596A]">
            Sign-up or timeslots link
          </label>
          <div className="flex flex-wrap gap-3">
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && link.trim()) fetchSignups(); }}
              placeholder="https://admin.shortcutpros.com/#/timeslots/..."
              className={`min-w-0 flex-1 rounded-[12px] border ${LINE} px-4 py-2.5 text-[14.5px] text-[#032232] outline-none focus:border-[#003756]`}
            />
            <OutlineButton onClick={fetchSignups} disabled={!link.trim() || fetching}>
              <Download className="h-4 w-4" />
              {fetching ? 'Loading...' : 'Load sign-ups'}
            </OutlineButton>
          </div>
          <p className={`mt-2 text-[13.5px] ${SOFT}`}>The event ID on its own works too.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-[14px] border-2 border-[#FF5050] bg-white px-5 py-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-[#FF5050]" />
            <p className="text-[14px] text-[#032232]">{error}</p>
          </div>
        )}

        {result && (
          <div>
            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-[#003756]">
              <Users className="h-4 w-4" />
              {result.eventName || 'Coordinator event'}
            </h3>
            <p className={`mb-3 text-[13.5px] ${SOFT}`}>
              {rows.length} booked
              {noShowCount > 0 && `, ${noShowCount} marked no-show (left unticked)`}
              {guestCount > 0 && `. ${guestCount} guest${guestCount === 1 ? '' : 's'} came without an email, add them by hand if needed`}
            </p>

            {rows.length === 0 ? (
              <Card tone="mist" className="p-5">
                <p className={`text-[14px] ${SOFT}`}>Nobody has booked this event yet.</p>
              </Card>
            ) : (
              <Card tone="mist" className="max-h-80 overflow-y-auto p-3">
                {rows.map((r, i) => (
                  <label
                    key={r.timeslotId || i}
                    className={`flex items-center gap-3 rounded-[10px] px-3 py-2 ${
                      r.blocked ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i) && !r.blocked}
                      disabled={!!r.blocked}
                      onChange={() => toggle(i)}
                      className="h-4 w-4 flex-none accent-[#003756]"
                    />
                    <span className="w-16 flex-none text-[13px] font-bold text-[#45596A]">
                      {formatSlot(r.startTime, result.timezoneOffset)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-bold text-[#003756]">
                        {r.name || 'No name'}
                        {r.noShow && <span className="ml-2 text-[12px] font-bold text-[#FF5050]">No-show</span>}
                        {r.checkedIn && <span className="ml-2 text-[12px] font-bold text-[#45596A]">Checked in</span>}
                      </span>
                      <span className={`block truncate text-[13px] ${SOFT}`}>
                        {r.blocked || [r.email, r.phone].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                ))}
              </Card>
            )}
          </div>
        )}

        <div className={`flex gap-3 border-t ${LINE} pt-5`}>
          <OutlineButton type="button" onClick={onClose} className="flex-1 justify-center">
            Cancel
          </OutlineButton>
          <CoralButton
            onClick={handleImport}
            disabled={selected.size === 0 || importing}
            className="flex-1 justify-center"
          >
            {importing ? 'Importing...' : `Import ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`}
          </CoralButton>
        </div>
      </div>
    </Modal>
  );
};
