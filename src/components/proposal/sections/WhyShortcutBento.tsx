import React, { useEffect, useRef, useState } from 'react';

// WhyShortcutBento — the "What sets Shortcut apart" band from getshortcut.co,
// adapted to the proposal's 860px content column.
//
// Ported from shortcut/frontend/components/HomeDeliver.vue (markup) plus the
// wd-*/mv-* art styles in shortcut/frontend/assets/web-home.css. Four of the
// homepage's five cards: the wide manager-view card, then the three-across row.
// The homepage's fifth card (the sign-up phone) is deliberately left out — the
// proposal sidebar already runs a live MobileSignupDemo, and two sign-up demos
// on one page read as a mistake.
//
// The homepage gates its loops on a `.hd-in` class so a visitor never lands
// mid-cycle. We do the same with a one-shot IntersectionObserver rather than
// letting three infinite loops run behind the fold.

/** Manager-view roster. Mirrors HomeDeliver.vue's ROSTER. */
const ROSTER: { name: string; ini: string; av: string; slot: string }[] = [
  { name: 'Maya R.', ini: 'MR', av: '#9EFAFF', slot: '11:00 am' },
  { name: 'Devon K.', ini: 'DK', av: '#FEDC64', slot: '11:20 am' },
  { name: 'Priya S.', ini: 'PS', av: '#F7BBFF', slot: '11:40 am' },
  { name: 'Tom B.', ini: 'TB', av: '#C7CBFB', slot: '12:00 pm' },
  { name: 'Alex N.', ini: 'AN', av: '#A9F0CC', slot: '12:20 pm' },
];

/** Setup-checklist rows. Mirrors the homepage's coral card. */
const CHECKLIST = [
  'Sign-up link',
  'Promotional signage',
  'COI to building mgmt',
  'Shortcut rep on site',
  'Equipment and cleanup',
];

/** Coverage pins, as percentages of the map artwork. Copied from HomeDeliver.vue. */
const PINS: { left: string; top: string; title: string }[] = [
  { left: '15.646%', top: '13.086%', title: 'Seattle' },
  { left: '14.031%', top: '19.342%', title: 'Portland' },
  { left: '10.094%', top: '43.794%', title: 'San Francisco' },
  { left: '14.688%', top: '58.297%', title: 'Los Angeles' },
  { left: '15.823%', top: '63.187%', title: 'San Diego' },
  { left: '24.427%', top: '63.524%', title: 'Phoenix' },
  { left: '37.250%', top: '45.565%', title: 'Denver' },
  { left: '49.594%', top: '69.325%', title: 'Dallas' },
  { left: '47.927%', top: '77.454%', title: 'Austin' },
  { left: '52.021%', top: '79.140%', title: 'Houston' },
  { left: '54.781%', top: '29.444%', title: 'Minneapolis' },
  { left: '63.281%', top: '38.735%', title: 'Chicago' },
  { left: '69.885%', top: '36.054%', title: 'Detroit' },
  { left: '65.656%', top: '57.150%', title: 'Nashville' },
  { left: '70.042%', top: '64.283%', title: 'Atlanta' },
  { left: '79.552%', top: '88.179%', title: 'Miami' },
  { left: '79.958%', top: '44.621%', title: 'Washington DC' },
  { left: '83.687%', top: '37.268%', title: 'New York' },
  { left: '87.125%', top: '30.320%', title: 'Boston' },
];

const Tick: React.FC<{ stroke?: string; width?: number }> = ({
  stroke = '#fff',
  width = 3.2,
}) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WhyShortcutBento: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`pv-bento${inView ? ' is-in' : ''}`}>
      <div className="pv-bento-head">
        <p className="pv-sec-label">What sets Shortcut apart</p>
        <h2 className="lt-h2">
          Loved by employees.
          <br />
          <span className="lt-accent">Effortless for employers.</span>
        </h2>
      </div>

      {/* Wide card — the manager view. */}
      <article className="pv-bcard pv-bcard--wide pv-bcard--yellow">
        <div className="pv-bcard-copy">
          <h3>Built for you.</h3>
          <p>
            No spreadsheets. No scheduling headaches. Watch appointments fill,
            track participation, and read employee feedback, all live, in one
            place.
          </p>
        </div>
        <div className="pv-bcard-art">
          <div className="mv-card">
            <div className="mv-hd">
              <span>
                <span className="mv-hd-t">Massage Day</span>
                <span className="mv-hd-s">Thu, June 18 · 11:00 am to 4:00 pm</span>
              </span>
              <span className="mv-live">Live</span>
            </div>
            <div className="mv-stat">
              <span className="mv-stat-n">
                28 <span className="mv-stat-l">of 40 booked</span>
              </span>
              <span className="mv-stat-p">70%</span>
            </div>
            <div className="mv-bar">
              <i />
            </div>
            <div className="mv-rows">
              {ROSTER.map((r) => (
                <div className="mv-row" key={r.ini}>
                  <span className="mv-av" style={{ background: r.av }}>
                    {r.ini}
                  </span>
                  <span className="mv-name">{r.name}</span>
                  <span className="mv-slot">{r.slot}</span>
                  <span className="mv-tick">
                    <Tick />
                  </span>
                </div>
              ))}
            </div>
            <div className="mv-foot">
              <span className="mv-foot-l">12 slots still open</span>
              <span className="mv-foot-b">Add a Pro</span>
            </div>
          </div>
        </div>
      </article>

      {/* Three across. */}
      <div className="pv-bento-row">
        <article className="pv-bcard pv-bcard--aqua">
          <div className="pv-bcard-copy">
            <h3>Pros you&rsquo;d book yourself.</h3>
            <p>Licensed, insured, handpicked.</p>
          </div>
          <div className="pv-bcard-art">
            <span
              className="wd-photo"
              role="img"
              aria-label="A Shortcut pro"
            />
          </div>
        </article>

        <article className="pv-bcard pv-bcard--navy">
          <div className="pv-bcard-copy">
            <h3>
              You choose the city.
              <br />
              We bring the wellness.
            </h3>
            <p>One team, one contact, one invoice.</p>
          </div>
          <div className="pv-bcard-art">
            <div className="wd-map">
              <img
                src="/proposal-refresh/bento/us-map.svg"
                alt="Shortcut coverage across the United States"
              />
              {PINS.map((p, i) => (
                <span
                  className="wd-pin"
                  key={p.title}
                  title={p.title}
                  style={{
                    left: p.left,
                    top: p.top,
                    animationDelay: `${(0.35 + i * 0.055).toFixed(3)}s, ${(
                      0.9 + i * 0.11
                    ).toFixed(2)}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </article>

        <article className="pv-bcard pv-bcard--coral">
          <div className="pv-bcard-copy">
            <h3>Handled, start to finish.</h3>
            <p>COI, signage, setup, cleanup.</p>
          </div>
          <div className="pv-bcard-art">
            <div className="wd-mf">
              <div className="wd-mf-hd">
                <span className="wd-mf-t">Setup checklist</span>
                <span className="wd-mf-c">Included</span>
              </div>
              <div className="wd-mf-bar">
                <i />
              </div>
              {CHECKLIST.map((label, i) => (
                <div className="wd-mf-row" key={label}>
                  <span
                    className="wd-mf-tick"
                    style={{ animationDelay: `${(0.2 + i * 0.42).toFixed(2)}s` }}
                  >
                    <Tick width={3} />
                  </span>
                  <span className="wd-mf-l">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default WhyShortcutBento;
