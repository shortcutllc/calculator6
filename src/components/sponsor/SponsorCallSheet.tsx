import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import CallPicker, { type CallPickerStatus } from '../web/CallPicker';
import '../web/quote-sheet.css';
import {
  bookSponsorCall, callWhen, loadSponsorCallSlots, type CallLead, type CallSlot,
} from '../../services/sponsorCallService';
import { ACCOUNT_TEAM } from '../proposal/sidebar/AccountTeamCard';

/* ─────────────────────────────────────────────
   The sponsor page's "book a call" sheet (Will, 2026-10-22).

   Works the way the quote sheet on www.getshortcut.co does since its live
   picker (shortcut repo, components/QuoteSheet.vue + QuoteCallPicker.vue):
   the visitor fills in their name and email, picks one of the open times on
   the calendar, and "Book my call" puts the call on that calendar with a
   Google Meet link. Google emails the invite. Same look: the `.sw-q` sheet
   in ../web/quote-sheet.css.

   The difference: the times are the page's teammate's alone (Will, Marc,
   ...: sponsor_pages.contact_email, picked in Sponsor Pages), and the call
   books on their calendar. Server: netlify/functions/sponsor-call-slots.js
   and sponsor-call-book.js.

   Every booking button on the page opens it: the nav's "Talk to us", "Set
   up a call with ..." in Next steps, and the pricing card's "Get your quote",
   which also hands over the visitor's choices to show in the rail and send
   with the invite.
   ───────────────────────────────────────────── */

export interface SponsorCallHost { name: string; email: string }

interface Props {
  open: boolean;
  onClose: () => void;
  slug: string;
  password?: string;
  host: SponsorCallHost;
  organizerName: string;
  conferenceName: string;
  /** From the pricing card: [['Package', 'Signature'], ...]. */
  picked?: [string, string][];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name;

/* iOS: size the sheet to the visual viewport while it is open, as the quote
   sheet does (see the note in ../web/QuoteSheet.tsx). */
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
function syncViewport(sheet: HTMLElement | null) {
  const vv = window.visualViewport;
  if (!sheet || !vv || !isPhone()) return;
  sheet.style.setProperty('--swq-vh', `${Math.round(vv.height)}px`);
  sheet.style.setProperty('--swq-top', `${Math.round(vv.offsetTop)}px`);
}

interface Form { firstName: string; lastName: string; email: string; organization: string; phone: string; notes: string }

export default function SponsorCallSheet({ open, onClose, slug, password, host, organizerName, conferenceName, picked = [] }: Props) {
  const member = ACCOUNT_TEAM[host.email.toLowerCase()];
  const hostFirst = firstOf(host.name);

  const [form, setForm] = useState<Form>({ firstName: '', lastName: '', email: '', organization: organizerName, phone: '', notes: '' });
  const [invalid, setInvalid] = useState({ firstName: false, email: false });
  const [shortView, setShortView] = useState(true);
  const [start, setStart] = useState(0);
  const [calStatus, setCalStatus] = useState<CallPickerStatus>('loading');
  const [seed, setSeed] = useState<{ slots: CallSlot[]; note: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ head: string; body: string; meet: string } | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  /* Each open: fresh times (the picker only mounts while the sheet is open),
     the page locked behind the sheet, focus on first name, and focus back
     where it was on close. A booked sheet opens on the form again. */
  useLayoutEffect(() => {
    if (!open) return;
    setDone(null);
    setErrorMsg('');
    setSeed(null);

    const sheet = sheetRef.current;
    const returnTo = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = document.body.style.overflow;
    html.classList.toggle('sw-q-lock', isPhone());
    document.body.style.overflow = 'hidden';
    const sync = () => syncViewport(sheet);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    sync();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    const focusTimer = window.setTimeout(() => {
      try { formRef.current?.querySelector<HTMLInputElement>('input[name="firstName"]')?.focus({ preventScroll: true }); } catch { /* ignore */ }
    }, 60);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      html.classList.remove('sw-q-lock');
      document.body.style.overflow = prevOverflow;
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      sheet?.style.removeProperty('--swq-vh');
      sheet?.style.removeProperty('--swq-top');
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const field = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'firstName' || k === 'email') setInvalid((iv) => ({ ...iv, [k]: false }));
  };

  const load = useCallback(() => loadSponsorCallSlots(slug, password), [slug, password]);

  const calendarDown = calStatus === 'error' || calStatus === 'empty';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const bad = { firstName: !form.firstName.trim(), email: !EMAIL_RE.test(form.email.trim()) };
    setInvalid(bad);
    if (bad.firstName || bad.email) {
      setErrorMsg('Add your name and a valid email so we know where to send the invite.');
      formRef.current?.querySelector<HTMLInputElement>(`[name="${bad.firstName ? 'firstName' : 'email'}"]`)?.focus();
      return;
    }
    if (!start) {
      setErrorMsg('Pick a time for your call.');
      return;
    }
    setErrorMsg('');
    setSending(true);
    const lead: CallLead = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      organization: form.organization.trim(),
      notes: form.notes.trim(),
      picked: picked.map(([k, v]) => `${k}: ${v}`),
    };
    const r = await bookSponsorCall(slug, password, lead, start);
    setSending(false);
    if (r.status === 'booked') {
      setStart(0);
      setDone({
        head: `You’re booked, ${lead.firstName}.`,
        body: `We’ll talk on ${callWhen(r.start)} with ${hostFirst}. The invite with a Google Meet link is on its way to ${lead.email}.`,
        meet: r.meet,
      });
      return;
    }
    if (r.status === 'already') {
      setStart(0);
      setDone({
        head: `You’re already booked, ${lead.firstName}.`,
        body: `Your call is on ${callWhen(r.start)}. To move it, reply to the invite we sent to ${lead.email}.`,
        meet: '',
      });
      return;
    }
    if (r.status === 'taken') {
      setSeed({ slots: r.slots, note: 'That time was just taken. Here’s what’s open now.' });
      return;
    }
    setErrorMsg(`We couldn’t book that just now. Try again, or email ${host.email}.`);
  };

  const emailLink = <a href={`mailto:${host.email}`}>{host.email}</a>;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={sheetRef}
      className="sw-q"
      role="dialog"
      aria-modal="true"
      aria-label={`Book a call with ${hostFirst}`}
      data-open={open ? '1' : undefined}
      data-done={done ? '1' : undefined}
      data-short={shortView ? '1' : undefined}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sw-q-sheet">
        <button type="button" className="sw-q-close" aria-label="Close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 13L13 1M1 1l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <aside className="sw-q-side">
          <div>
            <span className="sw-q-kick">Let’s talk</span>
            <div className="sw-q-h" role="heading" aria-level={2}>A 15-minute call with {hostFirst}</div>
            <p className="sw-q-sub">
              We’ll go over how the lounge would work at {conferenceName} and answer your questions. Pick any open time on {hostFirst}’s calendar.
            </p>
          </div>

          <div className="sw-q-host">
            <span className="sw-q-host-av" aria-hidden="true">{member?.initial || hostFirst.charAt(0)}</span>
            <span className="sw-q-host-who">
              <b>{host.name}</b>
              {member?.title && <span>{member.title}</span>}
            </span>
          </div>

          {picked.length > 0 && (
            <div className="sw-q-sum">
              <span className="sw-q-sum-h">Your choices</span>
              <div className="sw-q-sum-body">
                {picked.map(([label, value]) => (
                  <div key={label} className="sw-q-row"><span>{label}</span><span>{value}</span></div>
                ))}
              </div>
            </div>
          )}

          <p className="sw-q-side-foot">Rather email? {emailLink}</p>
        </aside>

        <form ref={formRef} className="sw-q-form" noValidate onSubmit={submit}>
          <div className="sw-q-grid">
            <label className="sw-q-field">
              <span className="sw-q-label">First name</span>
              <input
                value={form.firstName} onChange={field('firstName')} className="sw-q-in" name="firstName"
                autoComplete="given-name" required aria-invalid={invalid.firstName ? 'true' : 'false'} placeholder="Alex"
              />
            </label>
            <label className="sw-q-field">
              <span className="sw-q-label">Last name</span>
              <input value={form.lastName} onChange={field('lastName')} className="sw-q-in" name="lastName" autoComplete="family-name" placeholder="Rivera" />
            </label>
            <label className="sw-q-field">
              <span className="sw-q-label">Work email</span>
              <input
                value={form.email} onChange={field('email')} className="sw-q-in" name="email" type="email"
                autoComplete="email" required aria-invalid={invalid.email ? 'true' : 'false'} placeholder="alex@organization.org"
              />
            </label>
            <label className="sw-q-field">
              <span className="sw-q-label">Organization</span>
              <input value={form.organization} onChange={field('organization')} className="sw-q-in" name="organization" autoComplete="organization" placeholder="Organization" />
            </label>

            <div className="sw-q-field sw-q-field--wide">
              <span className="sw-q-label">Pick a time for your call<span className="sw-q-label-sub"> · 15 min on Google Meet</span></span>
              {open && (
                <CallPicker
                  load={load}
                  value={start}
                  onChange={setStart}
                  seed={seed}
                  onStatus={setCalStatus}
                  fallback={(s) => (
                    <>
                      {s === 'empty' ? `${hostFirst} has no open times in the next two weeks.` : `We couldn’t load ${hostFirst}’s calendar just now.`}
                      {' '}Email {emailLink} to find a time.
                    </>
                  )}
                />
              )}
            </div>

            <button type="button" className="sw-q-more" onClick={() => setShortView(false)}>Add more details (optional)</button>

            <label className="sw-q-field" data-long="1">
              <span className="sw-q-label">Phone</span>
              <input value={form.phone} onChange={field('phone')} className="sw-q-in" name="phone" type="tel" autoComplete="tel" placeholder="(555) 555-0100" />
            </label>
            <label className="sw-q-field sw-q-field--wide" data-long="1">
              <span className="sw-q-label">Anything else</span>
              <textarea
                value={form.notes} onChange={field('notes')} className="sw-q-in" name="notes"
                placeholder="Your dates, expected attendance, who else should join the call…"
              />
            </label>
          </div>

          <p className="sw-q-err" role="alert" data-on={errorMsg ? '1' : undefined}>{errorMsg}</p>

          {!calendarDown && (
            <div className="sw-q-actions">
              <button type="submit" className="sw-btn sw-btn--coral" disabled={sending || calStatus !== 'ready'}>
                {sending ? 'Booking…' : 'Book my call'}
              </button>
              <span className="sw-q-fine">The invite comes from {host.email}.</span>
            </div>
          )}
        </form>

        <div className="sw-q-done">
          <span className="sw-q-kick">Call booked</span>
          <div className="sw-q-done-h" role="heading" aria-level={2}>{done?.head}</div>
          <p className="sw-q-done-p">{done?.body}</p>
          {done?.meet && (
            <p className="sw-q-done-p sw-q-done-meet">Google Meet: <a href={done.meet} target="_blank" rel="noreferrer">{done.meet.replace(/^https?:\/\//, '')}</a></p>
          )}
          <div className="sw-q-done-act">
            <button type="button" className="sw-btn sw-btn--navy" onClick={onClose}>Back to the page</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
