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

export interface WhyShortcutBentoProps {
  /** Section kicker. */
  label?: string;
  /** Heading, navy clause then coral clause. */
  headA?: React.ReactNode;
  headB?: React.ReactNode;
  /** Wide manager card: heading, body, and the event it shows. */
  wideTitle?: string;
  wideBody?: string;
  eventName?: string;
  eventWhen?: string;
  /** Coverage card copy — a conference floor is not "the city". */
  cityTitle?: React.ReactNode;
  cityBody?: string;
  /** Pros card copy. */
  prosTitle?: string;
  prosBody?: string;
  /** Coral "handled" card: heading, body and checklist rows. */
  handledTitle?: string;
  handledBody?: string;
  checklist?: string[];
  /** Rendered in its own row under the three-across. The viewer leaves this
   *  empty because its sidebar already runs a live sign-up demo; a page with
   *  no sidebar passes the phone card here. */
  extraRow?: React.ReactNode;
}

const WhyShortcutBento: React.FC<WhyShortcutBentoProps> = ({
  label = 'What sets Shortcut apart',
  headA = 'Loved by employees.',
  headB = 'Effortless for employers.',
  wideTitle = 'Built for you.',
  wideBody = 'No spreadsheets. No scheduling headaches. Watch appointments fill, track participation, and read employee feedback, all live, in one place.',
  eventName = 'Massage Day',
  eventWhen = 'Thu, June 18 \u00b7 11:00 am to 4:00 pm',
  cityTitle,
  cityBody = 'One team, one contact, one invoice.',
  prosTitle = 'Pros you\u2019d book yourself.',
  prosBody = 'Licensed, insured, handpicked.',
  handledTitle = 'Handled, start to finish.',
  handledBody = 'COI, signage, setup, cleanup.',
  checklist = CHECKLIST,
  extraRow,
}) => {
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
        <p className="pv-sec-label">{label}</p>
        <h2 className="lt-h2">
          {headA}
          <br />
          <span className="lt-accent">{headB}</span>
        </h2>
      </div>

      {/* Wide card — the manager view. */}
      <article className="pv-bcard pv-bcard--wide pv-bcard--yellow">
        <div className="pv-bcard-copy">
          <h3>{wideTitle}</h3>
          <p>{wideBody}</p>
        </div>
        <div className="pv-bcard-art">
          <div className="mv-card">
            <div className="mv-hd">
              <span>
                <span className="mv-hd-t">{eventName}</span>
                <span className="mv-hd-s">{eventWhen}</span>
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
            <h3>{prosTitle}</h3>
            <p>{prosBody}</p>
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
              {cityTitle ?? (
                <>
                  You choose the city.
                  <br />
                  We bring the wellness.
                </>
              )}
            </h3>
            <p>{cityBody}</p>
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
            <h3>{handledTitle}</h3>
            <p>{handledBody}</p>
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
              {checklist.map((label, i) => (
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

      {extraRow}
    </div>
  );
};

export default WhyShortcutBento;
