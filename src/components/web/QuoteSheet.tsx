import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import './quote-sheet.css';

/* ─────────────────────────────────────────────
   The "Get a quote" sheet from www.getshortcut.co, ported to React.

   Source (shortcut repo): frontend/components/QuoteSheet.vue,
   frontend/composables/useQuoteSheet.js and the `.sw-q*` rules in
   frontend/assets/web.css (now ./quote-sheet.css). Markup is node for node,
   copy is verbatim, and the payload is the same ten-field createAnEvent body.

   Mount <QuoteSheetProvider> once around a page. Any `a[href="#quote"]` (or
   `[data-sw-quote]`, whose value may carry JSON prefill, as sw-web.js allowed)
   anywhere in the document opens the sheet, through one delegated listener.
   Pages publish their calculator state with useQuoteSheet().set({...}).

   SHORT IS THE DEFAULT EVERYWHERE (Will, 2026-10-05). Every page gets the
   short form unless it passes `short: false`. Same for the calendar:
   QUOTE_CAL_URL unless a page passes its own `calUrl` (or '' for the slot chips).

   THE PAYLOAD IS LOAD-BEARING. It goes to the same Parse Cloud Function the
   live site uses, with the same ten fields and the same app-id header. The
   shape is fixed server-side, so estimator state that has no field of its own
   rides in `otherInfo` and multiple offices are joined with '; ' into
   `location`. Every value must be a string. See buildQuotePayload below.

   Carried over from www's own departures from the handoff:
   1. A failed POST surfaces the error. The handoff showed the success state
      anyway, which would tell someone their request was received when it was
      never sent.
   2. Validation follows the page's mode: a short-form page asks for first name
      and email only, expanded or not.

   Not ported from www, on purpose:
   - The /api/lead backup copy (useLeadBackup.js). See the note in submit().
   - GA4 / Meta / Google Ads conversion calls. calculator6 has no tracker.
   - The first-touch attribution lines www appends to otherInfo (from its
     analytics plugin, which has no counterpart here).

   Added for calculator6's modal convention (sponsor/StationModal.tsx): focus
   returns to whatever opened the sheet, and the page's previous body overflow
   is restored on close rather than cleared.
   ───────────────────────────────────────────── */

/* ── Constants and payload helpers (www composables/useQuoteSheet.js) ── */

export type QuoteServiceId =
  | 'massage' | 'hair' | 'nails' | 'facials' | 'headshots' | 'assisted-stretch'
  | 'mindfulness' | 'sound-bath' | 'yoga' | 'strength-sculpt' | 'dance-cardio' | 'somatic-movement';

export interface QuoteService {
  id: QuoteServiceId;
  name: string;
  tint: string;
}

/**
 * The twelve services offered as chips, transcribed from QUOTE_SERVICES in
 * sw-web.js. Order and colours are verbatim.
 */
export const QUOTE_SERVICES: readonly QuoteService[] = [
  { id: 'massage', name: 'Massage', tint: '#9EFAFF' },
  { id: 'hair', name: 'Hair', tint: '#FEDC64' },
  { id: 'nails', name: 'Nails', tint: '#F7BBFF' },
  { id: 'facials', name: 'Facials', tint: '#F7BBFF' },
  { id: 'headshots', name: 'Headshots', tint: '#9EFAFF' },
  { id: 'assisted-stretch', name: 'Assisted stretch', tint: '#FFCBA6' },
  { id: 'mindfulness', name: 'Mindfulness', tint: '#C7CBFB' },
  { id: 'sound-bath', name: 'Sound bath', tint: '#C7CBFB' },
  { id: 'yoga', name: 'Yoga', tint: '#A9F0CC' },
  { id: 'strength-sculpt', name: 'Strength & sculpt', tint: '#FFCBA6' },
  { id: 'dance-cardio', name: 'Dance cardio', tint: '#A9F0CC' },
  { id: 'somatic-movement', name: 'Somatic movement', tint: '#C7CBFB' },
];

/**
 * The site-wide call scheduler: Will's Google Calendar appointment schedule
 * ("Schedule a call with Will @ Shortcut").
 *
 * The link we were given is the short form, https://calendar.app.google/XWDvcifZawExC4bY7.
 * It CANNOT be framed: its 302 carries `X-Frame-Options: SAMEORIGIN`, and the
 * iframe renders blank (checked 2026-10-05). It redirects to the URL below,
 * which carries no X-Frame-Options or frame-ancestors, and `?gv=true` is the
 * embed form Google's own "Website embed" snippet uses. Verified rendering in an
 * iframe from another origin. If the schedule is ever recreated, resolve the new
 * short link with `curl -sI <short link>` and paste its `location` here with
 * `?gv=true` on the end.
 */
export const QUOTE_CAL_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ32vKfzSRhuWGXuzgv0w3x21bOQnmWva5xVuPtCsMF3iq25Oh_vInOsmmHr13npkewS-GnsQRqu?gv=true';

/**
 * The lead-capture endpoint. Unchanged from www's components/popupcontact.vue
 * and confirmed by the handoff, which posts to the same place.
 *
 * NOTE: `https://api.shortcutpros.com/createAnEvent` no longer runs an API — it
 * serves the Coordinator static site via CloudFront and 403s every POST. The
 * working endpoint is below. The app id is a public client identifier, not a
 * secret.
 *
 * A POST here creates a real inquiry in the Coordinator CRM. Never submit the
 * sheet against it while testing: stub window.fetch first.
 */
export const QUOTE_ENDPOINT = 'https://parse.getshortcut.co/parse/functions/createAnEvent';
export const QUOTE_APP_ID = '9XfHVi9UJIxa3IPioC8FJN2Lc2dqFnpvTZljsl7C';

/** The scheduler URL with the visitor's name and email pre-filled (sw-web.js done()). */
export function quoteCalSrc(calUrl: string, firstName: string, lastName: string, email: string): string {
  let u = calUrl;
  try {
    const uu = new URL(u);
    uu.searchParams.set('name', `${firstName} ${lastName}`.trim());
    uu.searchParams.set('email', email);
    u = uu.toString();
  } catch { /* leave a malformed URL as given, like the reference */ }
  return u;
}

export interface QuoteSlot {
  /** Day label, e.g. "Wed, Oct 7". */
  d: string;
  /** Time label, e.g. "10:00 am". */
  t: string;
  /** The value sent in otherInfo, e.g. "Wed, Oct 7 at 10:00 am ET". */
  v: string;
}

/**
 * Three next business days x three call windows, Eastern time, because the
 * partnerships team is. Shown only when there is no calUrl. Verbatim from
 * quoteSlotList() in sw-web.js.
 */
export function quoteSlotList(from: Date = new Date()): QuoteSlot[] {
  const out: QuoteSlot[] = [];
  const d = new Date(from.getTime());
  let n = 0;
  while (n < 3) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    n++;
    const lab = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    ['10:00 am', '1:00 pm', '3:30 pm'].forEach((t) => out.push({ d: lab, t, v: `${lab} at ${t} ET` }));
  }
  return out;
}

/** The exact createAnEvent body. Ten fields, every one a string. */
export interface QuotePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  type: string;
  date: string;
  numPeople: string;
  otherInfo: string;
}

type Loose = string | number | null | undefined;

/** Form values as a caller might hold them. Anything goes in; strings come out. */
export interface QuoteFormValues {
  firstName?: Loose;
  lastName?: Loose;
  email?: Loose;
  phone?: Loose;
  company?: Loose;
  date?: Loose;
  numPeople?: Loose;
  otherInfo?: Loose;
}

/**
 * Build the exact createAnEvent body the live site sends. The shape is fixed by
 * the Parse Cloud Function — ten named fields, no more — so anything the
 * estimator knows that does not have a field of its own rides in `otherInfo`,
 * and multiple office locations are joined with '; ' into the single
 * `location` field. Both conventions come from the handoff.
 *
 * EVERY VALUE HERE MUST BE A STRING. Parse locks a column to the type of the
 * first thing written to it, and `EventRequest.numPeople` has been a String
 * since the original popup form — which read `.value` off a DOM node, so it
 * could never have sent anything else. Send a Number and the save throws
 * `schema mismatch for EventRequest.numPeople; expected String but got Number`
 * BEFORE the row is written, so the lead is lost outright, not just recorded
 * oddly. Changing the column type is not an escape hatch either: it means
 * dropping the column and everything in it.
 *
 * The trap on www was that `v-model` on `<input type="number">` hands back a
 * Number, not a string. Most fields here are saved by their `.trim()`, which
 * coerces on the way past; `numPeople` has nothing to trim and went out raw.
 * React hands back a string from the input, but a page can still publish
 * `guests: 36` as a Number and a prefill can leave a null, so the coercion
 * stays. Do not remove str() from any field.
 */
export function buildQuotePayload({ form, services, locations, detail }: {
  form: QuoteFormValues;
  services?: Loose[];
  locations?: Loose[];
  detail?: Loose[];
}): QuotePayload {
  // Every field through str(): a Number from an <input type="number">, or a
  // null left by a prefill, must reach Parse as a string or the lead is lost.
  const str = (v: Loose): string => (v == null ? '' : String(v));
  return {
    firstName: str(form.firstName).trim(),
    lastName: str(form.lastName).trim(),
    email: str(form.email).trim(),
    phone: str(form.phone).trim(),
    company: str(form.company).trim(),
    location: (locations || []).map(str).join('; '),
    type: (services || []).map(str).join(', '),
    date: str(form.date),
    // String(), not `+ ''`, so a null or undefined headcount cannot reach Parse
    // as the literal text 'null'. An empty box stays '' and the column stays
    // happy.
    numPeople: str(form.numPeople).trim(),
    otherInfo: [str(form.otherInfo).trim(), ...(detail || []).map(str)].filter(Boolean).join('\n'),
  };
}

export interface QuoteFollowUp {
  pref: 'call' | 'email';
  slot?: string;
}

/**
 * The estimator lines that ride along in otherInfo. Order matches quoteSubmit()
 * in the holiday handoff's sw-web.js: format, session, hours, cadence,
 * estimate, location count, page, then the follow-up preference and (only for
 * a call with no live calendar) the slot the visitor picked.
 *
 * `follow` is optional so an old caller still gets the estimator lines alone.
 */
export function buildQuoteDetail(state: QuoteState, locationCount: number, follow?: QuoteFollowUp): string[] {
  const detail: string[] = [];
  if (state.format) detail.push(`Format: ${state.format}`);
  if (state.session) detail.push(`${state.sessionLabel || 'Appointment'}: ${state.session} min`);
  if (state.hours) detail.push(`Time on site: ${state.hours}`);
  if (state.cadence) detail.push(`Cadence: ${state.cadence}`);
  if (state.estimate) detail.push(`Estimate: ${state.estimate}`);
  if (locationCount > 1) detail.push(`Locations: ${locationCount}`);
  if (state.page) detail.push(`From: ${state.page}`);
  if (follow) {
    detail.push(follow.pref === 'email' ? 'Follow up: email only' : 'Follow up: call');
    if (follow.slot) detail.push(`Preferred call: ${follow.slot}`);
  }
  return detail;
}

/* ── Shared state (www useQuoteSheet) ── */

/**
 * What a page publishes. Every key is optional and `set` merges.
 *
 *   const quote = useQuoteSheet();
 *   quote.set({ page: 'Service · Massage', services: ['massage'], guests: 36,
 *               session: 15, sessionLabel: 'Appointment', format: 'Chair',
 *               hours: '3 hours', cadence: 'Quarterly' });
 *   quote.open();
 */
export interface QuoteState {
  /** Where the lead came from; sent as "From: …" in otherInfo. */
  page?: string;
  /** Service ids to pre-pick as chips. */
  services?: Array<QuoteServiceId | { id: QuoteServiceId }>;
  /** Headcount; prefills the Headcount field. */
  guests?: number | string;
  /** Session length in minutes. */
  session?: number | string;
  /** Label for the session row; defaults to "Appointment". */
  sessionLabel?: string;
  format?: string;
  /** A bare number reads as "N hours" in the summary. */
  hours?: number | string;
  cadence?: string;
  /** e.g. '$7,560'; shown in the default rows and sent in otherInfo. */
  estimate?: string | number;
  /** [[label, value], …] replaces the default summary rows. */
  summary?: Array<[string, string | number | null | undefined]>;
  /** The short form is the default; pass `false` for the long form. */
  short?: boolean;
  /** Google Calendar schedule embedded after submit. Defaults to QUOTE_CAL_URL;
   *  pass '' to fall back to the three-day x three-time slot chips. */
  calUrl?: string | null;
  /** Replaces the intro paragraph in the navy rail. */
  sideSub?: string;
  /** Adds "Edit my selection", which closes and scrolls to this selector. */
  editHref?: string;
  /* Also read once on open, as www's sheet does. */
  locations?: string[];
  location?: string;
  note?: string;
}

export interface QuoteSheetApi {
  open: (extra?: QuoteState) => void;
  close: () => void;
  set: (patch: QuoteState) => void;
  isOpen: boolean;
  state: QuoteState;
}

const QuoteSheetContext = createContext<QuoteSheetApi | null>(null);

export function useQuoteSheet(): QuoteSheetApi {
  const api = useContext(QuoteSheetContext);
  if (!api) throw new Error('useQuoteSheet() must be used inside <QuoteSheetProvider>.');
  return api;
}

const QUOTE_TRIGGER = 'a[href="#quote"], a[href$="#quote"], [data-sw-quote]';

export function QuoteSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<QuoteState>({});

  /* Merge, don't replace: a page publishes services and cadence from one
     module and headcount from another, and neither should clear the other. */
  const set = useCallback((patch: QuoteState) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const open = useCallback((extra?: QuoteState) => {
    if (extra) set(extra);
    setIsOpen(true);
  }, [set]);

  const close = useCallback(() => setIsOpen(false), []);

  /* Any href="#quote" anywhere on the page opens the sheet. */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest(QUOTE_TRIGGER) : null;
      if (!a) return;
      e.preventDefault();
      let pre: QuoteState | undefined;
      const raw = a.getAttribute('data-sw-quote');
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) pre = parsed as QuoteState;
        } catch { /* a bare flag, not JSON */ }
      }
      open(pre);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const api = useMemo<QuoteSheetApi>(
    () => ({ open, close, set, isOpen, state }),
    [open, close, set, isOpen, state],
  );

  return (
    <QuoteSheetContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(<QuoteSheet isOpen={isOpen} state={state} close={close} />, document.body)}
    </QuoteSheetContext.Provider>
  );
}

/* ── The sheet (www QuoteSheet.vue) ── */

interface QuoteForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  date: string;
  numPeople: string;
  otherInfo: string;
}

const EMPTY_FORM: QuoteForm = {
  firstName: '', lastName: '', email: '', phone: '',
  company: '', date: '', numPeople: '', otherInfo: '',
};

const DEFAULT_SUB =
  'Tell us about your people and where they work. We’ll reach out within one business day to set up a quick call, and follow it with a full, itemized proposal, for a first visit or a standing program.';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* iOS: the sheet is `position:fixed; inset:0` with its own scroll. When the
   keyboard opens, Safari shrinks the VISUAL viewport but leaves fixed boxes
   on the layout viewport, and a focused sub-16px input zooms the page on top
   of that. Both make taps land above where the finger is: Will (2026-09-15)
   pressed the "−" on a second location row and the "+" one row up fired, so
   the row count went up instead of down. Same fix as www's chat widget: size
   the sheet to the visual viewport while it is open, lock the page behind it,
   and keep every field at 16px (quote-sheet.css). */
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;

function syncViewport(sheet: HTMLElement | null) {
  const vv = window.visualViewport;
  if (!sheet || !vv || !isPhone()) return;
  sheet.style.setProperty('--swq-vh', `${Math.round(vv.height)}px`);
  sheet.style.setProperty('--swq-top', `${Math.round(vv.offsetTop)}px`);
}

/** Lock the page behind the sheet; returns the unlock, which restores what was there. */
function lockPage(): () => void {
  const html = document.documentElement;
  const prevOverflow = document.body.style.overflow;
  html.classList.toggle('sw-q-lock', isPhone());
  document.body.style.overflow = 'hidden';
  return () => {
    html.classList.remove('sw-q-lock');
    document.body.style.overflow = prevOverflow;
  };
}

type Row = [string, string | number];

function QuoteSheet({ isOpen, state, close }: {
  isOpen: boolean;
  state: QuoteState;
  close: () => void;
}) {
  const [form, setForm] = useState<QuoteForm>(EMPTY_FORM);
  const [locations, setLocations] = useState<string[]>(['']);
  const [picked, setPicked] = useState<string[]>([]); // service ids
  const [invalid, setInvalid] = useState({ firstName: false, lastName: false, email: false });
  const [errorMsg, setErrorMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [doneName, setDoneName] = useState('');
  const [doneBody, setDoneBody] = useState('');

  /* `shortView` is the page's mode until "Add more details" opens the rest;
     `pref` and the picked slot persist across opens, as in the reference. */
  const [shortView, setShortView] = useState(true);
  const [pref, setPref] = useState<'call' | 'email'>('call');
  const [slots] = useState<QuoteSlot[]>(() => quoteSlotList()); // date-dependent, built once on mount
  const [slotPicked, setSlotPicked] = useState('');
  const [calStep, setCalStep] = useState<'1' | '0' | null>(null); // set once submitted, as data-calstep
  const [calSrc, setCalSrc] = useState('');

  const sheetRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusNewLocation = useRef(false);

  const pageShort = state.short !== false;
  const calUrl = state.calUrl === undefined || state.calUrl === null ? QUOTE_CAL_URL : String(state.calUrl);
  const hasCal = !!calUrl;
  const editHref = state.editHref || '';
  const sideSub = state.sideSub || DEFAULT_SUB;

  const filledLocations = useMemo(() => locations.map((l) => l.trim()).filter(Boolean), [locations]);
  const pickedServices = QUOTE_SERVICES.filter((s) => picked.includes(s.id));
  const pickedNames = pickedServices.map((s) => s.name);

  /* Prefill from whatever the page's estimator last published, on the open
     transition only (www's watch on isOpen). A layout effect so the reset
     lands before the sheet paints. */
  useLayoutEffect(() => {
    if (!isOpen) return;
    const pre = state;
    const ids = (pre.services || []).map((s) => (typeof s === 'string' ? s : s.id));
    if (ids.length) setPicked(ids);
    if (pre.guests) setForm((f) => ({ ...f, numPeople: String(pre.guests) }));
    const locs = pre.locations || (pre.location ? [pre.location] : []);
    if (locs.length) setLocations([...locs]);
    const note = pre.note;
    if (note) setForm((f) => ({ ...f, otherInfo: note }));
    setShortView(pageShort);
    setDone(false);
    setErrorMsg('');

    const sheet = sheetRef.current;
    const returnTo = document.activeElement as HTMLElement | null;
    const unlock = lockPage();
    const sync = () => syncViewport(sheet);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    sync();

    /* sw-web.js quoteOpen(): focus first name if it is empty. */
    let focusTimer: number | undefined;
    if (!form.firstName) {
      focusTimer = window.setTimeout(() => {
        try { formRef.current?.querySelector<HTMLInputElement>('input[name="firstName"]')?.focus(); } catch { /* ignore */ }
      }, 60);
    }

    return () => {
      window.clearTimeout(focusTimer);
      unlock();
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      sheet?.style.removeProperty('--swq-vh');
      sheet?.style.removeProperty('--swq-top');
      returnTo?.focus?.({ preventScroll: true });
    };
    // The open transition only: state, pageShort and firstName are read as they
    // stand at that moment, exactly as www's watch reads them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* addLocation(): focus the row it just added. */
  useEffect(() => {
    if (!focusNewLocation.current) return;
    focusNewLocation.current = false;
    const rows = formRef.current?.querySelectorAll<HTMLInputElement>('.sw-q-loc input');
    rows?.[rows.length - 1]?.focus();
  }, [locations.length]);

  /* The summary rail — mirrors quoteSummary() row for row. A page's own
     `summary` replaces the default rows; its People row shows the headcount the
     visitor typed, if they typed one. */
  const usesPageSummary = !!(state.summary && state.summary.length);
  const summaryRows: Row[] = (() => {
    const s = state;
    if (s.summary && s.summary.length) {
      return s.summary
        .map(([label, value]) => [label, label === 'People' && form.numPeople ? form.numPeople : value] as const)
        .filter((r): r is readonly [string, string | number] => !!r[1])
        .map(([label, value]): Row => [label, value]);
    }
    const rows: Row[] = [];
    if (form.numPeople) rows.push(['People', form.numPeople]);
    if (s.format) rows.push(['Format', s.format]);
    if (s.session) rows.push([s.sessionLabel || 'Appointment', `${s.session} min`]);
    if (s.hours) rows.push(['Time on site', /^\d+$/.test(String(s.hours)) ? `${s.hours} hours` : s.hours]);
    if (s.cadence) rows.push(['Cadence', s.cadence]);
    if (s.estimate) rows.push(['Estimate', s.estimate]);
    if (form.date) rows.push(['Date', form.date]);
    if (filledLocations.length) {
      rows.push([filledLocations.length > 1 ? `${filledLocations.length} locations` : 'Where', filledLocations.join(' · ')]);
    }
    return rows;
  })();
  const hasSummary = pickedNames.length > 0 || summaryRows.length > 0;

  const submitLabel = sending ? 'Sending…' : pref === 'email' ? 'Send my request' : 'Book my call';

  const field = (k: keyof QuoteForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggleChip = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const toggleSlot = (v: string) => setSlotPicked((cur) => (cur === v ? '' : v));

  const addLocation = () => {
    focusNewLocation.current = true;
    setLocations((l) => [...l, '']);
  };
  const removeLocation = (i: number) => setLocations((l) => l.filter((_, j) => j !== i));
  const setLocation = (i: number, v: string) => setLocations((l) => l.map((x, j) => (j === i ? v : x)));

  /* "Edit my selection →": close, then scroll to the page's builder, 110px
     clear of the fixed nav (sw-web.js). flushSync so the page is unlocked
     before it scrolls. */
  const onEdit = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = editHref;
    flushSync(close);
    let t: Element | null = null;
    try { t = sel ? document.querySelector(sel) : null; } catch { t = null; }
    if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;

    const bad = {
      firstName: !form.firstName.trim(),
      lastName: !pageShort && !form.lastName.trim(),
      email: !EMAIL_RE.test(form.email.trim()),
    };
    setInvalid(bad);

    if (bad.firstName || bad.lastName || bad.email) {
      setErrorMsg('Add your name and a valid email so we know where to send the proposal.');
      const name = bad.firstName ? 'firstName' : bad.lastName ? 'lastName' : 'email';
      formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
      return;
    }
    setErrorMsg('');
    setSending(true);

    const st = state;
    const choice = pref;
    const withCal = hasCal;
    const slotV = choice === 'call' && !withCal ? slotPicked : '';

    const payload = buildQuotePayload({
      form,
      services: pickedNames,
      locations: filledLocations,
      detail: buildQuoteDetail(st, filledLocations.length, { pref: choice, slot: slotV }),
    });

    let parseOk = false;
    try {
      const res = await fetch(QUOTE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Parse-Application-Id': QUOTE_APP_ID },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      parseOk = true;
    } catch (err) {
      /* Never fake success. A lost lead is worse than a visible error, because
         nobody follows up on a request that was never sent. */
      console.error('createAnEvent failed:', err);
    }

    /* www also sends a second copy of every submit, success AND failure, to its
       own /api/lead Netlify function (useLeadBackup.js). That function lives on
       getshortcut.co and sends no CORS headers, and this host has no backup
       endpoint yet, so the Parse POST above is the only copy from here. */

    if (!parseOk) {
      setErrorMsg('Something went wrong on our end. Please try again or email us at hello@getshortcut.co.');
      setSending(false);
      return;
    }

    setDoneName(payload.firstName);

    const useCal = choice === 'call' && withCal;
    setCalStep(useCal ? '1' : '0');
    if (useCal) setCalSrc(quoteCalSrc(calUrl, payload.firstName, payload.lastName, payload.email));
    setDoneBody(
      useCal
        ? `Last step: pick a time that suits you. These are live openings on our partnerships team’s calendar, and the invite lands in ${payload.email}.`
        : choice === 'email'
          ? `We have your request. Our partnerships team will email ${payload.email} within one business day with your itemized proposal. No call needed.`
          : slotV
            ? `We have your request. A calendar invite for ${slotV} is on its way to ${payload.email}. If that time stops working, just reply to it.`
            : `We have your ${pickedNames.length ? `${pickedNames.join(' + ').toLowerCase()} ` : ''}` +
              `request. Someone from our partnerships team will email ${payload.email} within one business day ` +
              'to find fifteen minutes that suit you, then send the full proposal.',
    );
    setDone(true);
    setSending(false);
  };

  return (
    <div
      ref={sheetRef}
      className="sw-q"
      role="dialog"
      aria-modal="true"
      aria-label="Get a quote"
      data-open={isOpen ? '1' : undefined}
      data-done={done ? '1' : undefined}
      data-short={shortView ? '1' : undefined}
      data-pref={pref}
      data-cal={hasCal ? '1' : '0'}
      data-calstep={calStep ?? undefined}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="sw-q-sheet">
        <button type="button" className="sw-q-close" aria-label="Close" onClick={close}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 13L13 1M1 1l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <aside className="sw-q-side">
          <div>
            <span className="sw-q-kick">Let’s talk</span>
            <div className="sw-q-h" role="heading" aria-level={2}>A short call, then a plan built for your team.</div>
            <p className="sw-q-sub">{sideSub}</p>
          </div>

          <div className="sw-q-sum">
            <span className="sw-q-sum-h">What you’ve dialed in</span>
            <div className="sw-q-sum-body">
              {pickedNames.length > 0 && (
                <div className="sw-q-pills">
                  {pickedServices.map((s) => (
                    <span key={s.id} className="sw-q-pill" style={{ background: s.tint }}>{s.name}</span>
                  ))}
                </div>
              )}
              {summaryRows.map(([label, value], i) => (
                <div key={`${label}-${i}`} className="sw-q-row">
                  <span>{label}</span><span>{value}</span>
                </div>
              ))}
              {!hasSummary && !usesPageSummary && (
                <p className="sw-q-empty">Pick services, headcount and locations and the summary fills in here.</p>
              )}
            </div>
            {editHref && (
              <a className="sw-q-edit" href="#" onClick={onEdit}>
                Edit my selection
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </div>

          <p className="sw-q-side-foot">
            Prefer to talk?{' '}
            <a href="mailto:hello@getshortcut.co">hello@getshortcut.co</a>
          </p>
        </aside>

        <form ref={formRef} className="sw-q-form" noValidate onSubmit={submit}>
          <div className="sw-q-grid">
            <label className="sw-q-field">
              <span className="sw-q-label">First name</span>
              <input
                value={form.firstName} onChange={field('firstName')} className="sw-q-in" name="firstName"
                autoComplete="given-name" required aria-invalid={invalid.firstName} placeholder="Alex"
              />
            </label>
            <label className="sw-q-field" data-long="1">
              <span className="sw-q-label">Last name</span>
              <input
                value={form.lastName} onChange={field('lastName')} className="sw-q-in" name="lastName"
                autoComplete="family-name" required={!pageShort} aria-invalid={invalid.lastName} placeholder="Rivera"
              />
            </label>
            <label className="sw-q-field">
              <span className="sw-q-label">Work email</span>
              <input
                value={form.email} onChange={field('email')} className="sw-q-in" name="email" type="email"
                autoComplete="email" required aria-invalid={invalid.email} placeholder="alex@company.com"
              />
            </label>
            <label className="sw-q-field" data-long="1">
              <span className="sw-q-label">Phone</span>
              <input
                value={form.phone} onChange={field('phone')} className="sw-q-in" name="phone" type="tel"
                autoComplete="tel" placeholder="(555) 555-0100"
              />
            </label>
            <label className="sw-q-field">
              <span className="sw-q-label">Company</span>
              <input
                value={form.company} onChange={field('company')} className="sw-q-in" name="company"
                autoComplete="organization" placeholder="Company"
              />
            </label>
            <label className="sw-q-field">
              <span className="sw-q-label">Headcount</span>
              <input
                value={form.numPeople} onChange={field('numPeople')} className="sw-q-in" name="numPeople" type="number"
                min="1" inputMode="numeric" placeholder="36"
              />
            </label>

            <div className="sw-q-field sw-q-field--wide">
              <span className="sw-q-label">Office locations<span className="sw-q-label-sub"> · one or many</span></span>
              <div className="sw-q-locs">
                {locations.map((loc, i) => (
                  <div key={i} className="sw-q-loc">
                    <input
                      value={loc} onChange={(e) => setLocation(i, e.target.value)} className="sw-q-in" name="location"
                      autoComplete="address-level2" placeholder={i === 0 ? 'City or address' : 'Another office'}
                    />
                    {i === 0 ? (
                      <button type="button" className="sw-q-loc-add" aria-label="Add another location" onClick={addLocation}>+</button>
                    ) : (
                      <button type="button" className="sw-q-loc-rm" aria-label="Remove location" onClick={() => removeLocation(i)}>&times;</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="sw-q-field sw-q-field--wide sw-q-datef">
              <span className="sw-q-label">Desired date</span>
              <input value={form.date} onChange={field('date')} className="sw-q-in" name="date" type="date" />
            </label>

            <div className="sw-q-field sw-q-field--wide" data-long="1">
              <span className="sw-q-label">Services</span>
              <div className="sw-q-chips">
                {QUOTE_SERVICES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="sw-q-chip"
                    data-id={s.id}
                    aria-pressed={picked.includes(s.id)}
                    onClick={() => toggleChip(s.id)}
                  >
                    <i style={{ background: s.tint }} />{s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sw-q-field sw-q-field--wide">
              <span className="sw-q-label">How should we follow up?</span>
              <div className="sw-q-pref" role="radiogroup">
                <button type="button" role="radio" data-v="call" aria-checked={pref === 'call'} onClick={() => setPref('call')}>
                  Book a 15 minute call
                </button>
                <button type="button" role="radio" data-v="email" aria-checked={pref === 'email'} onClick={() => setPref('email')}>
                  Email is fine
                </button>
              </div>
            </div>

            <div className="sw-q-field sw-q-field--wide sw-q-callf">
              <span className="sw-q-label">Best time for a call<span className="sw-q-label-sub"> · optional, Eastern time</span></span>
              <div className="sw-q-slots">
                {slots.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    className="sw-q-slot"
                    aria-pressed={slotPicked === s.v}
                    data-v={s.v}
                    onClick={() => toggleSlot(s.v)}
                  >
                    <b>{s.d}</b><span>{s.t}</span>
                  </button>
                ))}
              </div>
              <p className="sw-q-calnote">You’ll pick a live time from our team’s calendar on the next step.</p>
            </div>

            <button type="button" className="sw-q-more" onClick={() => setShortView(false)}>Add more details (optional)</button>

            <label className="sw-q-field sw-q-field--wide" data-long="1">
              <span className="sw-q-label">Anything else</span>
              <textarea
                value={form.otherInfo} onChange={field('otherInfo')} className="sw-q-in" name="otherInfo"
                placeholder="Timing, cadence, a wellness budget to work to, best times for a call…"
              />
            </label>
          </div>

          <p className="sw-q-err" role="alert" data-on={errorMsg ? '1' : undefined}>{errorMsg}</p>

          <div className="sw-q-actions">
            <button type="submit" className="sw-btn sw-btn--coral" disabled={sending}>{submitLabel}</button>
            <span className="sw-q-fine">
              A 15-minute conversation, no commitment. Prefer email only? Say so in the notes.
            </span>
          </div>
        </form>

        <div className="sw-q-done">
          <span className="sw-q-kick">You’re on our list</span>
          <div className="sw-q-done-h" role="heading" aria-level={2}>You’re in, {doneName}.</div>
          <p className="sw-q-done-p">{doneBody}</p>
          <div className="sw-q-calwrap">
            <iframe className="sw-q-calframe" title="Pick a call time" loading="lazy" src={calSrc || undefined} />
          </div>
          <div className="sw-q-done-act">
            <button type="button" className="sw-btn sw-btn--navy sw-q-back" onClick={close}>
              Back to the site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
