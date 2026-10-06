import { useEffect, useRef, useState } from 'react';
import { useQuoteSheet, type QuoteServiceId } from '../web/QuoteSheet';
import { Sec } from './swMotion';
import {
  CADENCES, PACKAGES, PKG_TABS, bookByLabel, buildSummary, money, pkgFrom,
  type Cadence, type PkgGroup,
} from './sterlingData';

/* The year-end package builder (handoff section 4): the holiday page's
   three-step shell with the brokers page's pricing band. Pricing lives in
   sterlingData.ts; this file is layout and state. */

const ART = '/conference/services/';

function Tick({ size, stroke }: { size: number; stroke: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#003756" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SterlingPackages() {
  const [g, setG] = useState(50);
  const [gCustom, setGCustom] = useState(false);
  const [gVal, setGVal] = useState('');
  const [tab, setTab] = useState<PkgGroup>('fund');
  // Starts empty, so the summary reads $0 on first load (Will, 2026-10-06).
  // The handoff preselected The Reset Zone and The Mindful Reset.
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [cad, setCad] = useState<Cadence>('once');
  const inputRef = useRef<HTMLInputElement>(null);
  const { set: setQuote } = useQuoteSheet();

  const sum = buildSummary(sel, g, cad);
  const bookBy = bookByLabel();
  const selKey = Object.keys(sel).filter((k) => sel[k]).sort().join(',');

  // Every "Book my call" opens the quote sheet pre-filled with this package.
  useEffect(() => {
    setQuote({
      page: 'SterlingRisk year-end package',
      services: sum.quoteServices as QuoteServiceId[],
      guests: g,
      format: 'On-site',
      cadence: sum.cadO.label,
      estimate: sum.chosen.length ? `${money(sum.total)} per visit` : '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, g, cad, setQuote]);

  const steps = [
    { n: '01', t: 'How many people?', v: `${g} people`, href: '#pk-1', fill: '#9EFAFF' },
    { n: '02', t: 'Choose packages', v: sum.chosen.length ? `${sum.chosen.length} ${sum.chosen.length === 1 ? 'package' : 'packages'}` : 'None yet', href: '#pk-2', fill: '#FEDC64' },
    { n: '03', t: 'How often?', v: sum.cadO.label, href: '#pk-3', fill: '#F7BBFF' },
  ];

  const pickCustom = () => {
    setGCustom(true);
    setGVal(gVal || String(g));
    window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 60);
  };
  const bump = (d: number) => {
    const n = Math.max(1, Math.min(5000, (parseInt(gVal, 10) || g) + d));
    setG(n);
    setGVal(String(n));
  };
  const typeG = (raw: string) => {
    const v = raw.replace(/[^0-9]/g, '').slice(0, 4);
    const n = parseInt(v, 10);
    setGVal(v);
    if (n > 0) setG(Math.min(5000, n));
  };

  const cards = PACKAGES.filter((p) => p.grp === tab);

  return (
    <Sec id="packages" className="sw-sec--lap sp-packages" label="Year-end packages">
      <div className="sw-wrap">
        <div className="sw-head">
          <p className="sw-kicker sw-in-fade">Year-end packages</p>
          <h2 className="sw-h2 sw-in-rise">Build your client’s package<br /><span className="sp-coral">in three steps.</span></h2>
        </div>

        <ol className="sw-in-rise sp-steps">
          {steps.map((s, i) => (
            <li key={s.n} className="sp-step-li">
              <a href={s.href} className="sp-step" style={{ background: s.fill }}>
                <span aria-hidden="true" className="sp-step-n">{s.n}</span>
                <span className="sp-step-k">Step {s.n}</span>
                <span className="sp-step-t">{s.t}</span>
                <span className="sp-step-vw"><span className="sp-step-v"><span className="sp-step-dot" />{s.v}</span></span>
              </a>
              {i < steps.length - 1 && (
                <span aria-hidden="true" className="sp-step-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12.5 6l6 6-6 6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className="sp-pk-grid">
          <div className="sp-pk-main">
            <div className="sw-in-rise sp-offer">
              <div className="sp-offer-txt">
                <p className="sp-offer-k">Holiday offer</p>
                <p className="sp-offer-t">Use this year’s fund before it runs out.</p>
                <p className="sp-offer-s">Combine two services, save 10%. Plus a special holiday treat.</p>
              </div>
              <span className="sp-offer-chip">{bookBy}</span>
            </div>

            <section id="pk-1" className="sp-pk-sec">
              <div className="sp-pk-h">
                <span className="sp-pk-num" style={{ background: '#9EFAFF' }}>1</span>
                <h3 className="sp-pk-h3">How many people at the client?</h3>
              </div>
              <div role="group" aria-label="People at the client" className="sp-heads">
                {[25, 50, 75].map((n) => {
                  const on = !gCustom && g === n;
                  return (
                    <button key={n} type="button" aria-pressed={on} className={`sp-tile${on ? ' sp-on' : ''}`} onClick={() => { setG(n); setGCustom(false); }}>
                      <span className="sp-tile-n">{n}</span>
                      <span className="sp-tile-s">people</span>
                    </button>
                  );
                })}
                <div className={`sp-tile sp-custom${gCustom ? ' sp-on' : ''}`}>
                  {!gCustom ? (
                    <button type="button" className="sp-custom-btn" onClick={pickCustom}>
                      <span className="sp-custom-t">Custom</span>
                      <span className="sp-custom-s">Enter a number</span>
                    </button>
                  ) : (
                    <div className="sp-custom-on">
                      <label className="sp-custom-l">
                        <input
                          ref={inputRef}
                          id="sp-count"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={5000}
                          placeholder="0"
                          value={gVal}
                          onChange={(e) => typeG(e.target.value)}
                          aria-label="Number of people"
                          className="sp-custom-in"
                        />
                        <span className="sp-custom-ppl">people</span>
                      </label>
                      <div className="sp-custom-steps">
                        <button type="button" className="sp-custom-step" onClick={() => bump(5)} aria-label="Add 5 people">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <button type="button" className="sp-custom-step" onClick={() => bump(-5)} aria-label="Remove 5 people">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section id="pk-2" className="sp-pk-sec">
              <div className="sp-pk-hrow">
                <div className="sp-pk-h">
                  <span className="sp-pk-num" style={{ background: '#FEDC64' }}>2</span>
                  <h3 className="sp-pk-h3">Choose packages</h3>
                </div>
                <div className="sp-pk-tabs">
                  {PKG_TABS.map((c) => (
                    <button key={c.key} type="button" className={`sc-dot-pill${tab === c.key ? ' is-on' : ''}`} onClick={() => setTab(c.key)}>
                      <span className="sc-dot" style={{ background: c.dot }} />{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sp-cards">
                {cards.map((p, i) => {
                  const on = !!sel[p.id];
                  const span = cards.length % 2 === 1 && i === cards.length - 1;
                  const label = (p.grp === 'hol' ? '' : p.grp === 'fund' ? 'Fund eligible · ' : '10% off · ') + p.inside;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      className={`sp-card${on ? ' sp-card--on' : ''}${span ? ' sp-card--span' : ''}`}
                      onClick={() => setSel((s) => ({ ...s, [p.id]: !s[p.id] }))}
                    >
                      <span className="sp-card-tick"><Tick size={14} stroke={3.4} /></span>
                      <span className="sp-card-strip">
                        {p.art.map(([file, tint]) => (
                          <span key={file} className="sp-card-panel" style={{ background: tint }}>
                            <span className="sp-card-art" style={{ backgroundImage: `url('${ART}${file}')` }} />
                          </span>
                        ))}
                      </span>
                      <span className="sp-card-body">
                        <span className="sp-card-in">{label}</span>
                        <span className="sp-card-name">{p.name}</span>
                        <span className="sp-card-from">From {money(pkgFrom(p, g))}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section id="pk-3" className="sp-pk-sec">
              <div className="sp-pk-h">
                <span className="sp-pk-num" style={{ background: '#F7BBFF' }}>3</span>
                <h3 className="sp-pk-h3">How often?</h3>
              </div>
              <div role="radiogroup" aria-label="Cadence" className="sp-cads">
                {CADENCES.map((c) => {
                  const on = c.k === cad;
                  return (
                    <button key={c.k} type="button" role="radio" aria-checked={on} className={`sp-tile sp-cad${on ? ' sp-on' : ''}`} onClick={() => setCad(c.k)}>
                      <span className="sp-cad-l">{c.label}</span>
                      <span className="sp-cad-s">{c.sub}</span>
                      <span className={`sp-cad-save${c.bg ? '' : ' sp-cad-save--plain'}`} style={c.bg ? { background: c.bg } : undefined}>
                        {c.save || 'Standard rate'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <p className="sp-pk-foot">Setup, travel and equipment included. Gratuity always optional.</p>
          </div>

          <aside className="sp-sum-wrap">
            <div className="sp-sum">
              <p className="sp-sum-k">Your client’s package</p>
              <h3 className="sp-sum-h">{sum.name}</h3>
              <p className="sp-sum-meta">{sum.meta}</p>
              <div className="sp-sum-lines">
                {sum.lines.map((l) => (
                  <div key={l.id} className="sp-sum-line">
                    <span className="sp-sum-lk"><span className="sp-sum-dot" style={{ background: l.dot }} /><span className="sp-sum-ln">{l.k}</span></span>
                    <span className="sp-sum-lv">{l.v}</span>
                  </div>
                ))}
                {sum.chosen.length === 0 && <p className="sp-sum-empty">Pick a package to start.</p>}
              </div>
              {sum.saves.map((s) => (
                <div key={s.k} className="sp-sum-save"><span className="sp-sum-save-k">{s.k}</span><span className="sp-sum-save-v">Save {s.v}</span></div>
              ))}
              {sum.nSvc === 1 && <p className="sp-sum-nudge">Add one more service to save 10%.</p>}
              <div className="sp-sum-total">
                <span className="sp-sum-total-k">Per visit</span>
                <span className="sp-sum-amt">{money(sum.total)}</span>
              </div>
              {sum.split && <p className="sp-sum-split">{sum.split}</p>}
              <div className="sp-sum-treat">
                <span className="sp-sum-tick"><Tick size={12} stroke={3.4} /></span>
                <span className="sp-sum-treat-t">All packages come with a special holiday treat</span>
              </div>
              <a href="#quote" className="sw-btn sp-sum-cta">Book my call</a>
              <p className="sp-sum-by">{bookBy}. We call within one business day.</p>
            </div>
          </aside>
        </div>

        <div className="sw-in-rise sp-aetna">
          <span aria-hidden="true" className="sp-aetna-ic">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5l7 3v5.2c0 4.3-3 7.6-7 8.8-4-1.2-7-4.5-7-8.8V6.5l7-3z" stroke="#003756" strokeWidth="2" strokeLinejoin="round" /><path d="M12 8.5v6M9 11.5h6" stroke="#003756" strokeWidth="2" strokeLinecap="round" /></svg>
          </span>
          <p className="sp-aetna-t">Nothing up front with Aetna. <span>The fund often pays us directly.</span></p>
          <span className="sp-aetna-fill" />
          <span aria-label="Aetna, Cigna and Anthem" className="sp-aetna-chips">
            <span className="sp-aetna-chip" style={{ background: '#7D3F98' }}>Aetna</span>
            <span className="sp-aetna-chip" style={{ background: '#0E7C3A' }}>Cigna</span>
            <span className="sp-aetna-chip" style={{ background: '#1A4FA3' }}>Anthem</span>
          </span>
        </div>
      </div>
    </Sec>
  );
}
