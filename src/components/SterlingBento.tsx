import { useEffect, useRef, useState } from 'react';
import { PINS, Tick } from './proposal/sections/WhyShortcutBento';
import '../styles/proposal-refresh.css';

/* ─────────────────────────────────────────────
   "What sets us apart" on the SterlingRisk partner page, built on the same
   website bento module as the conference partner page's How it works
   (sponsor/SponsorBento.tsx): pv-bcard shells and the mv-/wd- art from
   proposal-refresh.css.

     Row 1  Booking in three taps (the employee's phone)  |  Turnout.
            Solved. (the manager view, fully booked)
     Row 2  One vendor, every office  |  Pros  |  The paperwork the
            carrier needs

   The module's animations run here: the phone cycles its three screens,
   the manager view's bar fills and its rows tick, the map pins land and
   the paperwork statuses pop in. They wait until the bento is on screen.
   ───────────────────────────────────────────── */

const ROSTER = [
  { ini: 'MR', av: '#9EFAFF', name: 'Maya R.', slot: '11:00 am' },
  { ini: 'DK', av: '#FEDC64', name: 'Devon K.', slot: '11:20 am' },
  { ini: 'PS', av: '#F7BBFF', name: 'Priya S.', slot: '11:40 am' },
  { ini: 'TB', av: '#C7CBFB', name: 'Tom B.', slot: '12:00 pm' },
  { ini: 'AN', av: '#A9F0CC', name: 'Alex N.', slot: '12:20 pm' },
];

/* What goes back to the carrier, drawn as the packet the client receives. */
const PAPERWORK = [
  { ini: '1', av: 'bg-[#9EFAFF]', name: 'Pre-approval request', sub: 'To the carrier consultant', status: 'Approved' },
  { ini: '2', av: 'bg-[#FEDC64]', name: 'Invoice', sub: 'Formatted for the carrier', status: 'Sent' },
  { ini: '3', av: 'bg-[#F7BBFF]', name: 'Participation summary', sub: 'Who joined, by service', status: 'Ready' },
  { ini: '4', av: 'bg-[#C7CBFB]', name: 'W-9', sub: 'For the carrier’s file', status: 'On file' },
];

/* The art sits in a clipped well, pinned to the top so the white card
   hangs off the card's bottom edge (same as SponsorBento). */
const WELL = 'pv-bcard-art !m-0 max-[980px]:!-mx-6 max-[980px]:!h-[390px]';
const HANG = 'absolute left-1/2 top-6 w-[calc(100%-32px)] max-w-[372px] -translate-x-1/2';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "Booking in three taps": the employee's three booking screens, cycling. */
function MiniPhone({ run }: { run: boolean }) {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    if (!run || prefersReducedMotion()) return;
    const t = window.setInterval(() => setScreen(i => (i + 1) % 3), 2400);
    return () => window.clearInterval(t);
  }, [run]);
  const show = (i: number) => `absolute inset-0 transition-opacity duration-500 ${screen === i ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;
  const opt = 'mb-2 flex items-center justify-between rounded-xl border-[1.5px] px-3.5 py-2.5 text-[14px] font-bold tracking-[-.01em] text-shortcut-blue';
  const btn = 'rounded-xl bg-shortcut-coral py-2.5 text-center text-[14px] font-bold text-white';
  return (
    <div className="min-h-[520px] rounded-t-[26px] bg-white px-5 pt-5 pb-6 text-left shadow-[0_20px_48px_rgba(0,0,0,.3)]">
      <div className="mb-3 flex items-center gap-2 border-b border-[#003756]/[.09] pb-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-shortcut-coral text-[11px] font-extrabold text-white">A</span>
        <span className="text-[15px] font-extrabold tracking-[-.018em] text-shortcut-blue">Wellness Day</span>
        <span className="ml-auto text-[12.5px] font-semibold text-[#45596A]">{screen + 1} of 3</span>
      </div>
      <div className="relative h-[330px]">
        <div className={show(0)}>
          <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#45596A]">Pick your service</div>
          {['Chair massage', 'Table massage', 'Assisted stretch', 'Mindfulness'].map((svc, i) => (
            <div key={svc} className={`${opt} ${i === 0 ? 'border-shortcut-coral bg-shortcut-coral/[.06]' : 'border-[#E2E9E8]'}`}>
              {svc}
              <i className={`h-4 w-4 rounded-full border-[1.5px] ${i === 0 ? 'border-shortcut-coral bg-shortcut-coral shadow-[inset_0_0_0_3px_#fff]' : 'border-[#cfd9d8]'}`} />
            </div>
          ))}
          <div className={`${btn} mt-3`}>Next</div>
        </div>
        <div className={show(1)}>
          <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#45596A]">Pick your time</div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-center text-[14px] font-bold text-shortcut-blue">
            {['11:00', '11:20', '11:40', '12:00', '12:20', '12:40', '1:00', '1:20'].map(t => (
              <span
                key={t}
                className={`rounded-xl border-[1.5px] py-2 ${t === '11:40' ? 'border-shortcut-coral bg-shortcut-coral text-white' : t === '11:20' || t === '12:40' ? 'border-[#E2E9E8] line-through opacity-35' : 'border-[#E2E9E8]'}`}
              >
                {t}
              </span>
            ))}
          </div>
          <div className={btn}>Book my slot</div>
        </div>
        <div className={show(2)}>
          <div className="mx-auto mb-3 mt-5 grid h-12 w-12 place-items-center rounded-full bg-[#55BA90]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-white [stroke-width:3]"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div className="text-center text-[18px] font-extrabold tracking-[-.018em] text-shortcut-blue">You&rsquo;re booked!</div>
          <div className="mt-1 text-center text-[13px] font-semibold text-[#45596A]">Chair massage · 11:40 AM</div>
          <div className="mt-5 flex flex-col gap-2">
            <div className={`${opt} !mb-0 border-[#E2E9E8]`}>Added to your calendar<i className="h-2 w-2 rounded-full bg-[#55BA90]" /></div>
            <div className={`${opt} !mb-0 border-[#E2E9E8]`}>Reminder the day before<i className="h-2 w-2 rounded-full bg-[#55BA90]" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SterlingBento() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); } },
      { rootMargin: '0px 0px -12% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="pv-root !bg-transparent">
      <div ref={ref} className={`pv-bento !mt-0 flex flex-col gap-5${inView ? ' is-in' : ''}`}>

        {/* Row 1: how people book, and how the day fills. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <article className="pv-bcard pv-bcard--coral md:!h-[560px]">
            <div className="pv-bcard-copy">
              <h3>Booking in three taps.</h3>
              <p>Employees pick their own slot, no spreadsheets, no chasing.</p>
            </div>
            <div className={WELL}>
              <div className={HANG}><MiniPhone run={inView} /></div>
            </div>
          </article>

          <article className="pv-bcard pv-bcard--yellow md:!h-[560px]">
            <div className="pv-bcard-copy">
              <h3>Turnout. Solved.</h3>
              <p>Digital invites and onsite signage fill the calendar for you.</p>
            </div>
            <div className={`${WELL} [&_.mv-card]:!static [&_.mv-card]:!transform-none [&_.mv-bar_i]:[animation-name:pv-mf-bar] max-[980px]:[&_.mv-card]:!px-5`}>
              <div className={HANG}>
                <div className="mv-card !w-full">
                  <div className="mv-hd">
                    <span>
                      <span className="mv-hd-t">Wellness Day · Chair massage</span>
                      <span className="mv-hd-s">Invites sent · Signage up</span>
                    </span>
                    <span className="mv-live">Full</span>
                  </div>
                  <div className="mv-stat">
                    <span className="mv-stat-n">40 <span className="mv-stat-l">of 40 booked</span></span>
                    <span className="mv-stat-p">100%</span>
                  </div>
                  <div className="mv-bar"><i /></div>
                  <div className="mv-rows">
                    {ROSTER.map((r, i) => (
                      <div className="mv-row" key={r.ini}>
                        <span className="mv-av" style={{ background: r.av }}>{r.ini}</span>
                        <span className="mv-name">{r.name}</span>
                        <span className="mv-slot">{r.slot}</span>
                        <span className="mv-tick" style={{ animationDelay: `${(i * 0.25).toFixed(2)}s` }}><Tick /></span>
                      </div>
                    ))}
                  </div>
                  <div className="mv-foot">
                    <span className="mv-foot-l">0 admin work for you</span>
                    <span className="mv-foot-b">Add a Pro</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Row 2: the reach, the people, and the paperwork. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <article className="pv-bcard pv-bcard--navy lg:!h-[440px]">
            <div className="pv-bcard-copy">
              <h3>One vendor. Every office.</h3>
              <p>One vetted network across all 50 states, one team to call.</p>
            </div>
            <div className="pv-bcard-art">
              <div className="wd-map">
                <img src="/proposal-refresh/bento/us-map.svg" alt="Shortcut coverage across the United States" />
                {PINS.map((p, i) => (
                  <span
                    className="wd-pin"
                    key={p.title}
                    title={p.title}
                    style={{ left: p.left, top: p.top, animationDelay: `${(0.35 + i * 0.055).toFixed(3)}s, ${(0.9 + i * 0.11).toFixed(2)}s` }}
                  />
                ))}
              </div>
            </div>
          </article>

          <article className="pv-bcard pv-bcard--aqua lg:!h-[440px]">
            <div className="pv-bcard-copy">
              <h3>Pros you&rsquo;d book yourself.</h3>
              <p>Licensed, vetted and insured, professional, personal, reliable.</p>
            </div>
            <div className="pv-bcard-art">
              <span className="wd-photo" role="img" aria-label="A Shortcut Pro" />
            </div>
          </article>

          <article className="pv-bcard pv-bcard--navy lg:!h-[440px]">
            <div className="pv-bcard-copy">
              <h3>Paperwork the carrier accepts.</h3>
              <p>Pre-approval, invoice and participation summary, formatted the way the carrier needs.</p>
            </div>
            <div className={WELL}>
              <div className={`${HANG} rounded-[26px] bg-white p-5 text-left shadow-[0_20px_48px_rgba(0,0,0,.3)]`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[15px] font-extrabold tracking-[-.018em] !text-shortcut-blue">Wellness fund packet</p>
                    <p className="m-0 mt-0.5 text-[12.5px] font-semibold !text-[#45596A]">4 documents</p>
                  </div>
                  <span className="inline-flex h-[30px] items-center rounded-full bg-shortcut-blue px-3.5 text-[12.5px] font-bold text-white">Download</span>
                </div>
                <div className="mt-3 flex flex-col">
                  {PAPERWORK.map((d, i) => (
                    <div key={d.ini} className="flex items-center gap-2.5 border-t border-[#003756]/[.09] py-2.5">
                      <span className={`grid h-7 w-7 flex-none place-items-center rounded-full text-[11px] font-extrabold text-shortcut-blue ${d.av}`}>{d.ini}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold tracking-[-.01em] text-shortcut-blue">{d.name}</span>
                        <span className="block truncate text-[11.5px] font-semibold text-[#45596A]">{d.sub}</span>
                      </span>
                      <span
                        className={`inline-flex h-[22px] flex-none items-center rounded-full bg-[#E7F7EE] px-2 text-[10.5px] font-extrabold uppercase tracking-[.03em] text-[#08694A] ${inView ? 'motion-safe:[animation:pv-mv-tick_6s_cubic-bezier(.34,1.56,.64,1)_infinite_both]' : ''}`}
                        style={{ animationDelay: `${(0.4 + i * 0.3).toFixed(2)}s` }}
                      >
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
