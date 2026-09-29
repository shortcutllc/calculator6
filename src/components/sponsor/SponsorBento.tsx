import { useEffect, useRef, useState } from 'react';
import { PINS, Tick } from '../proposal/sections/WhyShortcutBento';
import '../../styles/proposal-refresh.css';

/* ─────────────────────────────────────────────
   How it works, on the website's bento module (pv-bcard shells and the
   mv-/wd- art from proposal-refresh.css, ported from shortcut/frontend/
   components/HomeDeliver.vue), laid out for the white label story:

     Row 1  Built in their brand (the setup checklist)  |  A booking
            platform that runs the day (the manager view, fully booked)
     Row 2  One vendor, every venue  |  Pros  |  What the sponsor takes home

   The module's own animations run here: the checklist ticks in row by row
   and its bar fills, the manager view's bar fills to 40 of 40 and its rows
   tick, the map pins land, and the lead list's statuses pop in. Like the
   homepage, they wait until the bento is on screen (`.is-in`).

   The section heading is the page's own SectionHead, so it matches every
   other section. `.pv-root` supplies the design tokens the cards read.
   ───────────────────────────────────────────── */

const BRAND_ITEMS = [
  'Branded booking page',
  'Custom reminders',
  'Signage and screens',
  'Pro uniforms',
  'The lounge build',
  'COI to the venue',
  'Shortcut lead on site',
  'Setup and cleanup',
];

const ROSTER = [
  { ini: 'MR', av: '#9EFAFF', name: 'Maya R.', slot: '11:00 am' },
  { ini: 'DK', av: '#FEDC64', name: 'Devon K.', slot: '11:20 am' },
  { ini: 'PS', av: '#F7BBFF', name: 'Priya S.', slot: '11:40 am' },
  { ini: 'TB', av: '#C7CBFB', name: 'Tom B.', slot: '12:00 pm' },
  { ini: 'AN', av: '#A9F0CC', name: 'Alex N.', slot: '12:20 pm' },
];

/* The sponsor's lead list, drawn as the export they get: the same people
   as the schedule, now with title and company, opted in. */
const LEADS = [
  { ini: 'MR', av: 'bg-[#9EFAFF]', name: 'Maya Rivera', role: 'VP People · Northwind', showed: true },
  { ini: 'DK', av: 'bg-[#FEDC64]', name: 'Devon Kim', role: 'Head of HR · Brightline', showed: true },
  { ini: 'PS', av: 'bg-[#F7BBFF]', name: 'Priya Shah', role: 'Chief of Staff · Lumen', showed: true },
  { ini: 'TB', av: 'bg-[#C7CBFB]', name: 'Tom Baker', role: 'Talent Director · Harbor', showed: false },
];

/* The module's art is absolutely placed in a clipped well. These pin it to
   the top of the well so the white card hangs off the card's bottom edge,
   the way the homepage's manager view does. */
const WELL = 'pv-bcard-art !m-0 max-[980px]:!-mx-6 max-[980px]:!h-[390px]';
const HANG = 'absolute left-1/2 top-6 w-[calc(100%-32px)] max-w-[372px] -translate-x-1/2';

export default function SponsorBento({ conferenceName, dateLabel }: {
  conferenceName: string; dateLabel: string;
}) {
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

        {/* Row 1: what we build, and the platform that runs the day. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <article className="pv-bcard pv-bcard--coral md:!h-[560px]">
            <div className="pv-bcard-copy">
              <h3>Built in their brand.</h3>
              <p>Everything attendees see carries the sponsor&rsquo;s name. Everything behind it is ours.</p>
            </div>
            <div className={`${WELL} [&_.wd-mf]:![transform:translate(-50%,-50%)_scale(.94)] max-[980px]:[&_.wd-mf]:![transform:translate(-50%,-50%)_scale(.82)]`}>
              <div className="wd-mf">
                <div className="wd-mf-hd">
                  <span className="wd-mf-t">The sponsor package</span>
                  <span className="wd-mf-c">Included</span>
                </div>
                <div className="wd-mf-bar"><i /></div>
                {BRAND_ITEMS.map((label, i) => (
                  <div className="wd-mf-row" key={label}>
                    <span className="wd-mf-tick" style={{ animationDelay: `${(0.2 + i * 0.3).toFixed(2)}s` }}>
                      <Tick width={3} />
                    </span>
                    <span className="wd-mf-l">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="pv-bcard pv-bcard--yellow md:!h-[560px]">
            <div className="pv-bcard-copy">
              <h3>A booking platform that runs the day.</h3>
              <p>Bookings, reminders, the waitlist and last minute changes, all in the sponsor&rsquo;s name. Their team just shows up.</p>
            </div>
            <div className={`${WELL} [&_.mv-card]:!static [&_.mv-card]:!transform-none [&_.mv-bar_i]:[animation-name:pv-mf-bar] max-[980px]:[&_.mv-card]:!px-5`}>
              <div className={HANG}>
                <div className="mv-card !w-full">
                  <div className="mv-hd">
                    <span>
                      <span className="mv-hd-t">Wellness Lounge · {conferenceName}</span>
                      <span className="mv-hd-s">{dateLabel}</span>
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
                    <span className="mv-foot-l">12 on the waitlist</span>
                    <span className="mv-foot-b">Add a Pro</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Row 2: the reach, the people, and the payoff. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <article className="pv-bcard pv-bcard--navy lg:!h-[440px]">
            <div className="pv-bcard-copy">
              <h3>One vendor. Every venue.</h3>
              <p>Hotels, convention centers and offsites, coast to coast.</p>
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
              <p>Licensed, insured, handpicked.</p>
            </div>
            <div className="pv-bcard-art">
              <span className="wd-photo" role="img" aria-label="A Shortcut Pro" />
            </div>
          </article>

          <article className="pv-bcard pv-bcard--navy lg:!h-[440px]">
            <div className="pv-bcard-copy">
              <h3>What the sponsor takes home.</h3>
              <p>Every name, title, company and email, opted in.</p>
            </div>
            <div className={WELL}>
              <div className={`${HANG} rounded-[26px] bg-white p-5 text-left shadow-[0_20px_48px_rgba(0,0,0,.3)]`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[15px] font-extrabold tracking-[-.018em] !text-shortcut-blue">Sponsor leads</p>
                    <p className="m-0 mt-0.5 text-[12.5px] font-semibold !text-[#45596A]">40 contacts</p>
                  </div>
                  <span className="inline-flex h-[30px] items-center rounded-full bg-shortcut-blue px-3.5 text-[12.5px] font-bold text-white">Export</span>
                </div>
                <div className="mt-3 flex flex-col">
                  {LEADS.map((l, i) => (
                    <div key={l.ini} className="flex items-center gap-2.5 border-t border-[#003756]/[.09] py-2.5">
                      <span className={`grid h-7 w-7 flex-none place-items-center rounded-full text-[10.5px] font-extrabold text-shortcut-blue ${l.av}`}>{l.ini}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold tracking-[-.01em] text-shortcut-blue">{l.name}</span>
                        <span className="block truncate text-[11.5px] font-semibold text-[#45596A]">{l.role}</span>
                      </span>
                      <span
                        className={`inline-flex h-[22px] flex-none items-center rounded-full px-2 text-[10.5px] font-extrabold uppercase tracking-[.03em] ${l.showed ? 'bg-[#E7F7EE] text-[#08694A]' : 'bg-[#EEF2F4] text-[#45596A]'} ${inView ? 'motion-safe:[animation:pv-mv-tick_6s_cubic-bezier(.34,1.56,.64,1)_infinite_both]' : ''}`}
                        style={{ animationDelay: `${(0.4 + i * 0.3).toFixed(2)}s` }}
                      >
                        {l.showed ? 'Showed' : 'Booked'}
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
