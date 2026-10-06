import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  MdCopyContext,
  MobileSignupDemoCore,
  usePrefersReducedMotion,
  type MdState,
} from '../proposal/MobileSignupDemo';
import { Sec, Reveal, CountTo, swCheck } from './swMotion';
import { ROSTER, MAP_PINS, TURNOUT } from './sterlingData';

/* ─────────────────────────────────────────────
   6 · What sets Shortcut apart (#apart)

   Four sticky split cards that deal over each other. Transcribed from
   `Sterling Partner 1280 D.dc.html` (markup lines 465-745, the sign-up
   timeline `_initSignup()` 818-941, toggle copy in renderVals 1134-1147).
   Styles: sterling-apart.css (imported by SterlingPartnerPage).
   ───────────────────────────────────────────── */

/* ── Sign-up phone timeline (the design's `_initSignup()` steps) ───────── */

type DemoState = MdState & { notif: boolean };

const DEMO_NAME = 'Jordan Patel';
const DEMO_EMAIL = 'jordan@bcg.com';

function buildDemo() {
  const steps: { dur: number; set: Partial<DemoState> }[] = [];
  const push = (dur: number, set: Partial<DemoState>) => { steps.push({ dur, set }); };
  push(1600, {});
  push(1000, { scroll: 'services' });
  push(650, { dot: { target: 'svc-chair', tap: false } });
  push(320, { dot: { target: 'svc-chair', tap: true } });
  push(750, { service: 'chair', dot: { target: 'svc-chair', tap: false } });
  push(1000, { scroll: 'times', dot: null });
  push(650, { dot: { target: 'slot-12:40', tap: false } });
  push(320, { dot: { target: 'slot-12:40', tap: true } });
  push(750, { slot: '12:40', dot: { target: 'slot-12:40', tap: false } });
  push(1000, { scroll: 'details', dot: null });
  for (let i = 0; i < DEMO_NAME.length; i++) push(i ? 65 : 400, { name: DEMO_NAME.slice(0, i + 1), focus: 'name' });
  for (let i = 0; i < DEMO_EMAIL.length; i++) push(i ? 55 : 400, { email: DEMO_EMAIL.slice(0, i + 1), focus: 'email' });
  push(420, { focus: null });
  push(550, { dot: { target: 'consent', tap: false } });
  push(300, { dot: { target: 'consent', tap: true } });
  push(500, { consent: true, dot: { target: 'consent', tap: false } });
  push(550, { dot: { target: 'cta', tap: false } });
  push(320, { dot: { target: 'cta', tap: true } });
  push(450, { dot: null });
  push(500, { screen: 'confirmed' });
  push(1500, {});
  push(2600, { notif: true });
  push(700, { leaving: true, notif: false });

  const frames: DemoState[] = [];
  const ends: number[] = [];
  let cur: DemoState = {
    scroll: 'top', service: null, slot: null, name: '', email: '',
    focus: null, consent: false, screen: 'page', dot: null, leaving: false, notif: false,
  };
  let acc = 0;
  for (const s of steps) {
    cur = Object.assign({}, cur, s.set);
    frames.push(cur);
    acc += s.dur;
    ends.push(acc);
  }
  return { frames, ends, total: acc };
}
const DEMO = buildDemo();

/** The design's 50ms clock: time only accrues while the phone is on screen
 *  (`r.bottom < 0 || r.top > innerHeight` holds it), and the demo freezes on
 *  frame 0 under reduced motion. */
function useDemoTimeline(rootRef: React.RefObject<HTMLDivElement>, frozen: boolean): DemoState {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (frozen) return;
    let elapsed = 0;
    let prev = Date.now();
    let last = 0;
    const iv = window.setInterval(() => {
      const now = Date.now();
      const dt = now - prev;
      prev = now;
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      if (r.bottom < 0 || r.top > (window.innerHeight || 800)) return; // hold while off screen
      elapsed = (elapsed + dt) % DEMO.total;
      let k = 0;
      while (k < DEMO.ends.length - 1 && DEMO.ends[k] <= elapsed) k++;
      if (k === last) return;
      last = k;
      setI(k);
    }, 50);
    return () => window.clearInterval(iv);
  }, [rootRef, frozen]);
  return DEMO.frames[i];
}

/* The design parks each section 118px below the top of the screen, measured
   down the whole scrolling content (its offsetIn() walks up to .md-content).
   MobileSignupDemoCore measures from the section's offsetParent, the sheet,
   which starts 352px down the content: the 46px status-bar pad, the 330px
   hero, less the sheet's 24px overlap. The same park in sheet coordinates. */
const SHEET_TOP = 46 + 330 - 24;
const PARK_OFFSET = 118 - SHEET_TOP;

const EVENT_LINE = 'Seated massage with a licensed Massage Pro. Free for employees.';

function SignupPhone() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const demo = useDemoTimeline(rootRef, reduced);
  // Outside any provider this is the app's default copy; only the event line changes.
  const base = useContext(MdCopyContext);
  const copy = useMemo(() => ({ ...base, eventLine: EVENT_LINE }), [base]);
  return (
    <div className="sw-demo-stage">
      <div ref={rootRef} className="wd-msd">
        <div className="wd-phone">
          <div className="wd-island"></div>
          <div className="msd-host">
            <div className="msd-screen">
              <MdCopyContext.Provider value={copy}>
                <MobileSignupDemoCore state={demo} parkOffset={PARK_OFFSET} />
              </MdCopyContext.Provider>
              <div className={`md-notif${demo.notif ? ' sp-notif-on' : ''}`}>
                <span className="md-notif-ic"><img src="/proposal-refresh/shortcut-symbol.svg" alt="" /></span>
                <span className="sp-notif-txt">
                  <span className="md-notif-hd"><span>Shortcut</span><span className="md-notif-when">now</span></span>
                  <span className="md-notif-b">Reminder: chair massage tomorrow, 12:40 pm, 11th floor lounge.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TICK = 'M5 12.5l4.5 4.5L19 7.5';

function ManagerView() {
  return (
    <div className="sp-mv-stage">
      <div className="mv-card">
        <div className="sp-mv-hd">
          <span>
            <span className="sp-mv-t">Massage Day</span>
            <span className="sp-mv-s">Thu, June 18 · 11:00 am to 4:00 pm</span>
          </span>
          <span className="sp-mv-live">Live</span>
        </div>
        <div className="sp-mv-stat">
          <span className="sp-mv-n"><CountTo to={28} />{' '}<span className="sp-mv-of">of 40 booked</span></span>
          <span className="sp-mv-pct">70%</span>
        </div>
        <div className="mv-bar"><i></i></div>
        <div className="sp-mv-rows">
          {ROSTER.map((r, i) => (
            // The design sets each row's animation-delay on the row, where it
            // has no effect (the tick does not inherit it), so the ticks pop
            // together. Kept as drawn.
            <div key={r.ini} className="mv-row" style={{ animationDelay: `${(0.2 + i * 0.5).toFixed(2)}s` }}>
              <span className="mv-av" style={{ background: r.av }}>{r.ini}</span>
              <span className="sp-mv-name">{r.name}</span>
              <span className="sp-mv-meta">{r.slot}</span>
              <span className="mv-tick">
                <svg viewBox="0 0 24 24" fill="none"><path d={TICK} stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              </span>
            </div>
          ))}
        </div>
        <div className="sp-mv-foot">
          <span className="sp-mv-meta">12 slots still open</span>
          <span className="sp-mv-add">Add a Pro</span>
        </div>
      </div>
    </div>
  );
}

export default function SterlingApart() {
  const [view, setView] = useState<'team' | 'manager'>('team');
  const team = view === 'team';
  // The roster's count-up waits for its span to have a box; re-test once the
  // manager view is shown.
  useEffect(() => { if (!team) swCheck(); }, [team]);

  return (
    <Sec id="apart" className="sw-sec--lap sp-apart" label="What sets Shortcut apart">
      <div className="sw-wrap">
        <div className="sw-head sw-head--center">
          <p className="sw-kicker sw-in-fade">What sets Shortcut apart</p>
          <h2 className="sw-h2 sw-in-rise">Why Shortcut is the vendor<br /><span className="sp-coral">your clients keep.</span></h2>
        </div>
        <div className="sw-wdstack">
          {/* 1 · Sign-up phone / manager view */}
          <Reveal as="article" className="sp-wd-card">
            <div className="sp-wd-art sp-wd-art--surface">
              <div hidden={!team}><SignupPhone /></div>
              <div hidden={team}><ManagerView /></div>
            </div>
            <div className="sp-wd-panel sp-wd-panel--navy sp-wd-panel--toggle">
              <div className="sp-wd-toggle">
                <button type="button" className={`sp-wd-btn${team ? ' is-on' : ''}`} aria-pressed={team} onClick={() => setView('team')}>Employee view</button>
                <button type="button" className={`sp-wd-btn${team ? '' : ' is-on'}`} aria-pressed={!team} onClick={() => setView('manager')}>Manager view</button>
              </div>
              <h3 className="sp-wd-h">{team ? 'Employees book in three taps.' : 'You watch it fill, live.'}</h3>
              <p className="sp-wd-p">
                {team
                  ? 'We build the sign-up page. Everyone picks their Pro, service and time, and reminders go out on their own.'
                  : 'Every slot as it books, in one live view. Add a Pro when demand runs hot, and never touch a spreadsheet.'}
              </p>
            </div>
          </Reveal>

          {/* 2 · Pros */}
          <Reveal as="article" className="sp-wd-card">
            <div className="sp-wd-art sp-wd-art--aqua">
              <span className="sp-wd-pro"></span>
            </div>
            <div className="sp-wd-panel sp-wd-panel--aqua sp-wd-panel--gap">
              <h3 className="sp-wd-h">Pros you’d book yourself.</h3>
              <p className="sp-wd-p">Handpicked, licensed and insured. We hire a small fraction of the Pros who apply.</p>
            </div>
          </Reveal>

          {/* 3 · Coverage map */}
          <Reveal as="article" className="sp-wd-card">
            <div className="sp-wd-art sp-wd-art--navy">
              <div className="wd-mapwrap">
                <div className="wd-map">
                  <img src="/proposal-refresh/bento/us-map.svg" alt="Shortcut coverage across the United States" />
                  {MAP_PINS.map(([title, left, top, inDelay, pulseDelay]) => (
                    <span
                      key={title}
                      className="wd-pin"
                      title={title}
                      style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${inDelay}s, ${pulseDelay}s` }}
                    ></span>
                  ))}
                </div>
              </div>
            </div>
            <div className="sp-wd-panel sp-wd-panel--navy sp-wd-panel--gap">
              <h3 className="sp-wd-h">One vendor. Every office.</h3>
              <p className="sp-wd-p">One vetted network across all 50 states. One vendor across your whole book, one team to call.</p>
            </div>
          </Reveal>

          {/* 4 · Turnout checklist */}
          <Reveal as="article" className="sp-wd-card">
            <div className="sp-wd-art sp-wd-art--coral">
              <div className="sp-wd-fill">
                <div className="sw-demo-stage">
                  <div className="wd-mfwrap">
                    <div className="wd-mf">
                      <div className="wd-mf-hd"><span className="wd-mf-t">Turnout checklist</span><span className="wd-mf-c">Included</span></div>
                      <div className="wd-mf-bar"><i></i></div>
                      {TURNOUT.map((t, i) => (
                        <div key={t} className="wd-mf-row">
                          <span className="wd-mf-tick" style={{ animationDelay: `${(i * 0.42).toFixed(2)}s` }}>
                            <svg viewBox="0 0 24 24" fill="none"><path d={TICK} stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                          </span>
                          <span className="wd-mf-l">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="sp-wd-panel sp-wd-panel--aqua sp-wd-panel--gap">
              <h3 className="sp-wd-h">Turnout, handled.</h3>
              <p className="sp-wd-p">Digital invites and onsite signage fill the calendar for you. 92% of booked slots get used.</p>
            </div>
          </Reveal>

          <span aria-hidden="true" className="sp-wd-tail"></span>
        </div>
      </div>
    </Sec>
  );
}
