import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CallSlot } from '../../services/sponsorCallService';

/* ─────────────────────────────────────────────
   <CallPicker>: live call times, on a booking form.

   Ported from www's components/QuoteCallPicker.vue (shortcut repo, the
   inline placement), with its `.sw-q-pick*` styles in ./quote-sheet.css.
   The pattern is the one Google's booking pages, Zocdoc and OpenTable share:
   a Mon–Fri week strip with arrows to page weeks, then the chosen day's
   times, two rows of them until "Show all N times". About 200px tall at any
   width.

   Days are Eastern business days (the team's); times show in the visitor's
   own time zone, named in the picker, so a Denver visitor never has to
   convert.

   The picker loads its own times through `load`. The form books the picked
   start (`value`) when the visitor presses its button; if that time went in
   the meantime, the form hands back the fresh times as `seed` with a note.
   One departure from www: week ranges read "October 26 to 30", because
   user-facing copy here never uses a dash as punctuation.
   ───────────────────────────────────────────── */

export type CallPickerStatus = 'loading' | 'ready' | 'empty' | 'error';

interface Props {
  load: () => Promise<CallSlot[]>;
  value: number;
  onChange: (ms: number) => void;
  /** Fresh times after a failed booking. A new object each time. */
  seed?: { slots: CallSlot[]; note: string } | null;
  onStatus?: (s: CallPickerStatus) => void;
  /** What to say when there are no times or the calendar can't be read. */
  fallback: (s: 'empty' | 'error') => ReactNode;
}

const tidy = (s: string) => s.replace(' AM', ' am').replace(' PM', ' pm');
const timeOf = (ms: number) => tidy(new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

/* 'YYYY-MM-DD' as a calendar date, read in UTC so no zone can shift it. */
const ymd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const keyOf = (dt: Date) => dt.toISOString().slice(0, 10);
const utcFmt = (dt: Date, opts: Intl.DateTimeFormatOptions) => dt.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

interface Week { label: string; cells: { key: string; wd: string; n: number; open: boolean }[] }

export default function CallPicker({ load, value, onChange, seed, onStatus, fallback }: Props) {
  const [status, setStatusState] = useState<CallPickerStatus>('loading');
  const [slots, setSlots] = useState<CallSlot[]>([]);
  const [day, setDay] = useState('');
  const [week, setWeek] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState('');
  const [narrow, setNarrow] = useState(false);
  const [tzName, setTzName] = useState('');

  const setStatus = useCallback((s: CallPickerStatus) => { setStatusState(s); onStatus?.(s); }, [onStatus]);

  const byDay = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of slots) {
      if (!m.has(s.day)) m.set(s.day, []);
      m.get(s.day)!.push(s.start);
    }
    return m;
  }, [slots]);

  /* Every Mon–Fri week from the first open day's to the last open day's. A
     day with no openings, or already past, is shown but disabled, so the
     strip always reads Monday to Friday. */
  const weeks = useMemo<Week[]>(() => {
    const days = [...byDay.keys()].sort();
    if (!days.length) return [];
    const last = ymd(days[days.length - 1]);
    const cur = ymd(days[0]);
    cur.setUTCDate(cur.getUTCDate() - ((cur.getUTCDay() + 6) % 7));
    const out: Week[] = [];
    while (cur <= last) {
      const mon = new Date(cur);
      const fri = new Date(cur); fri.setUTCDate(fri.getUTCDate() + 4);
      const label = mon.getUTCMonth() === fri.getUTCMonth()
        ? `${utcFmt(mon, { month: 'long' })} ${mon.getUTCDate()} to ${fri.getUTCDate()}`
        : `${utcFmt(mon, { month: 'short', day: 'numeric' })} to ${utcFmt(fri, { month: 'short', day: 'numeric' })}`;
      const cells: Week['cells'] = [];
      for (let i = 0; i < 5; i++) {
        const key = keyOf(cur);
        cells.push({ key, wd: utcFmt(cur, { weekday: 'short' }), n: cur.getUTCDate(), open: byDay.has(key) });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      cur.setUTCDate(cur.getUTCDate() + 2);
      out.push({ label, cells });
    }
    return out;
  }, [byDay]);
  const thisWeek = weeks[week] || null;

  const times = byDay.get(day) || [];
  /* Two rows until "Show all": eight at four across, six at three. */
  const fold = narrow ? 6 : 8;
  const shownTimes = showAll ? times : times.slice(0, fold);
  const hidden = Math.max(0, times.length - fold);
  const dayLabel = day ? utcFmt(ymd(day), { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  /* Take a list of times: keep the pick if it is still open, else open on
     the first day with times. */
  const valueRef = useRef(value);
  valueRef.current = value;
  const takeSlots = useCallback((list: CallSlot[]) => {
    setSlots(list);
    if (!list.length) { setStatus('empty'); return; }
    const kept = list.find((s) => s.start === valueRef.current);
    if (!kept && valueRef.current) onChange(0);
    setDay((prev) => (kept ? kept.day : list.some((s) => s.day === prev) ? prev : list[0].day));
    setShowAll(false);
    setStatus('ready');
  }, [onChange, setStatus]);

  /* Keep the week strip on the chosen day. */
  useEffect(() => {
    const i = weeks.findIndex((w) => w.cells.some((c) => c.key === day));
    if (i >= 0) setWeek(i);
  }, [day, weeks]);

  useEffect(() => {
    let live = true;
    setStatus('loading');
    load()
      .then((list) => { if (live) takeSlots(list); })
      .catch((e) => { console.error('call slots', e); if (live) setStatus('error'); });
    return () => { live = false; };
    // Load once per mount; the sheet remounts the picker when it reopens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!seed) return;
    takeSlots(seed.slots);
    setNote(seed.note);
  }, [seed, takeSlots]);

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const onMq = () => setNarrow(!!mq?.matches);
    try { mq = window.matchMedia('(max-width: 760px)'); onMq(); mq.addEventListener('change', onMq); } catch { /* four across */ }
    try {
      setTzName(new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value || '');
    } catch { /* leave it unnamed */ }
    return () => { try { mq?.removeEventListener('change', onMq); } catch { /* ignore */ } };
  }, []);

  const pickDay = (key: string) => {
    if (key === day) return;
    setDay(key);
    setShowAll(false);
    onChange(0);
    setNote('');
  };

  /* Paging a week also moves the chosen day to that week's first opening,
     so the times below always belong to a day in view. */
  const pageWeek = (step: number) => {
    const i = Math.min(Math.max(week + step, 0), weeks.length - 1);
    if (i === week) return;
    setWeek(i);
    const firstOpen = weeks[i].cells.find((c) => c.open);
    if (firstOpen) pickDay(firstOpen.key);
  };

  const pickTime = (t: number) => {
    onChange(value === t ? 0 : t);
    setNote('');
  };

  return (
    <div className="sw-q-pick" data-inline="1" data-status={status}>
      {status === 'loading' && <p className="sw-q-pick-msg">Loading open times…</p>}

      {(status === 'error' || status === 'empty') && <p className="sw-q-pick-msg">{fallback(status)}</p>}

      {status === 'ready' && (
        <>
          <div className="sw-q-pick-head">
            <span className="sw-q-pick-range">{thisWeek?.label}</span>
            <span className="sw-q-pick-nav">
              <button type="button" aria-label="Previous week" disabled={week === 0} onClick={() => pageWeek(-1)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" aria-label="Next week" disabled={week >= weeks.length - 1} onClick={() => pageWeek(1)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </span>
          </div>
          <div className="sw-q-pick-week" role="group" aria-label={`Days, ${thisWeek?.label || ''}`}>
            {(thisWeek?.cells || []).map((c) => (
              <button
                key={c.key}
                type="button"
                className="sw-q-pick-day"
                disabled={!c.open}
                aria-pressed={day === c.key ? 'true' : 'false'}
                onClick={() => pickDay(c.key)}
              ><span>{c.wd}</span><b>{c.n}</b></button>
            ))}
          </div>

          <div className="sw-q-pick-when">
            {dayLabel}{tzName && <span className="sw-q-pick-tz"> · times in {tzName}</span>}
          </div>
          <div className="sw-q-pick-times" role="group" aria-label={`Times on ${dayLabel}`}>
            {shownTimes.map((t) => (
              <button
                key={t}
                type="button"
                className="sw-q-pick-time"
                aria-pressed={value === t ? 'true' : 'false'}
                onClick={() => pickTime(t)}
              >{timeOf(t)}</button>
            ))}
          </div>

          {hidden > 0 && (
            <button type="button" className="sw-q-pick-more" aria-expanded={showAll ? 'true' : 'false'} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer times' : `Show all ${times.length} times`}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          {note && <p className="sw-q-pick-note" role="alert">{note}</p>}
        </>
      )}
    </div>
  );
}
