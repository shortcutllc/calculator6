import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MENU_SERVICES, MENU_GALLERY_KEYS } from '../utils/menuServices';
import StationModal, { useGalleryByKey, type ModalStation } from './sponsor/StationModal';
import { QuoteSheetProvider } from './web/QuoteSheet';
import ShortcutLockup from './sterling/ShortcutLockup';
import SterlingPackages from './sterling/SterlingPackages';
import SterlingApart from './sterling/SterlingApart';
import { Sec, CountTo } from './sterling/swMotion';
import {
  BENEFITS, CARRIERS, GALLERY, HANDOFF, HERO_PILLS, LOGOS, QUIP, RAIL_CATS, RAIL_SERVICES, STATS, TINT,
  type RailService,
} from './sterling/sterlingData';
import './sterling/sterling-partner.css';
import './sterling/sterling-sections.css';
import './sterling/sterling-packages.css';
import './sterling/sterling-apart.css';

/**
 * SterlingRisk partner page, /partners/sterling (noindex like every path on
 * this site). A personalised page for SterlingRisk's account team: what we
 * deploy with a client's carrier wellness fund, what carries the 10% partner
 * rate, a year-end package builder, then a call.
 *
 * Built to design_handoff_sterling_partner (2026-10-06), `Sterling Partner
 * 1280 D.dc.html`, on the website design language (the sw- layer). Desktop
 * matches the 1280 reference; there is no 390 design yet, so phones get a
 * best-effort single column (Will, 2026-10-06).
 *
 *   sterling/sterlingData.ts      copy, packages, pricing
 *   sterling/SterlingPackages.tsx the year-end package builder
 *   sterling/SterlingApart.tsx    the sticky "What sets Shortcut apart" stack
 *   web/QuoteSheet.tsx            every "Book my call" (port of the www sheet)
 */

const LOGO_DIR = '/ds-assets/logos/';
const SERVICE_ART = '/conference/services/';

function Arrow({ size = 13, stroke = 2.6 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h13M12.5 6l6 6-6 6" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhiteLogo({ file, alt, h }: { file: string; alt: string; h: number }) {
  return (
    <span
      role="img"
      aria-label={alt}
      className="sp-logo"
      style={{ height: h, backgroundImage: `url('${LOGO_DIR}${file}-white.svg')` }}
    />
  );
}

/* ── 0 · Nav ──────────────────────────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled((window.scrollY || 0) > 120);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <div className="sw-nav" data-scrolled={scrolled ? '1' : '0'}>
      <a className="sw-nav-logo" href="https://getshortcut.co" aria-label="Shortcut">
        <ShortcutLockup width={164} className="sw-logo-w" />
        <ShortcutLockup width={164} className="sw-logo-n" />
      </a>
      <div className="sp-nav-r">
        <span className="sw-co">
          <span className="sw-co-logo"><img src="/partners/sterlingrisk-logo.png" alt="SterlingRisk Insurance" /></span>
          <span className="sw-co-t">Prepared for SterlingRisk</span>
        </span>
        <a className="sw-nav-cta" href="#packages">Build my package</a>
      </div>
    </div>
  );
}

/* ── 1 · Hero ─────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <Sec className="sw-sec--navy sp-hero" label="Sterling hero">
      <div className="sw-wrap">
        <div className="sp-hero-top">
          <h1 className="sw-h1 sw-in-rise sp-hero-h1">
            A wellness vendor you can <span className="sp-aqua">put your name behind.</span>
          </h1>
          <p className="sw-lead sw-in-rise sp-hero-lead">
            A partner you can trust with your best clients, and their carrier fund. We bring on-site massage, mindfulness and movement to their offices, and handle every step from pre-approval to reporting.
          </p>
          <div className="sp-hero-row">
            <div className="sw-in-rise sp-hero-ctas">
              <a className="sw-btn sw-btn--coral" href="#packages">Build my package</a>
              <a href="#quote" className="sp-hero-talk">Or talk to us</a>
            </div>
            <div className="hb-pile" aria-label="Fund-eligible services">
              {HERO_PILLS.map((row, r) => (
                <div key={r} className="hb-pile-row">
                  {row.map((p) => (
                    <a
                      key={p.label}
                      href="#menu"
                      className="hb-pill"
                      style={{ background: p.fill, animationDelay: `${p.delay}s` }}
                    >
                      <span className="hb-pill-in">{p.label}<Arrow /></span>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hpm sw-in-rise" data-screen-label="Hero module">
          {/* Photo tile: five event photos cross-fading on a 31s loop. */}
          <div className="hpm-photo">
            <div className="hpm-photo-frame">
              <span className="gg-ph gg-ph1"><img src="/ds-assets/gallery/tile-massage.webp" alt="A Shortcut massage therapist at work" /></span>
              <span className="gg-ph gg-ph2"><img src="/ds-assets/gallery/cencora-massage-poster.webp" alt="Chair massage at Cencora" loading="lazy" /></span>
              <span className="gg-ph gg-ph3"><img src="/ds-assets/gallery/sound-bath-rooftop-hero.webp" alt="A rooftop sound bath" loading="lazy" /></span>
              <span className="gg-ph gg-ph4"><img src="/ds-assets/gallery/somatic-event.webp" alt="A somatic movement session" loading="lazy" /></span>
              <span className="gg-ph gg-ph5"><img src="/ds-assets/gallery/massage-bcg-poster.jpg" alt="Massage at BCG" loading="lazy" /></span>
              <span className="hpm-shade" />
              <span className="gg-cap gg-cap2" style={{ background: '#9EFAFF' }}>Chair massage <span className="hpm-at">@</span> Cencora</span>
              <span className="gg-cap gg-cap3" style={{ background: '#C7CBFB' }}>Sound bath</span>
              <span className="gg-cap gg-cap4" style={{ background: '#C7CBFB' }}>Somatic movement</span>
              <span className="gg-cap gg-cap5" style={{ background: '#9EFAFF' }}>Massage <span className="hpm-at">@</span> BCG</span>
              <span className="hpm-dots">
                <span className="gg-dot gg-dot1" /><span className="gg-dot gg-dot2" /><span className="gg-dot gg-dot3" /><span className="gg-dot gg-dot4" /><span className="gg-dot gg-dot5" />
              </span>
            </div>
          </div>

          {/* Booking tile: three panels cycling every 12s. */}
          <div className="hpm-book">
            <div className="hpm-book-card">
              <div className="hpm-book-hd">
                <img src="/signup-demo/bcg-logo.webp" alt="BCG" />
                <span className="hpm-book-sep" />
                <span className="hpm-book-by">by <img src="/proposal-refresh/shortcut-symbol.svg" alt="Shortcut" /></span>
              </div>
              <div className="hpm-book-body">
                <div className="hb-panel hb-p1">
                  <p className="hpm-bt">Pick your service</p>
                  <div className="hpm-opts">
                    <div className="hpm-opt hpm-opt--on">
                      <span className="hpm-opt-txt"><span className="hpm-opt-name">Massage</span><span className="hpm-opt-sub">15 min · chair</span></span>
                      <span className="hb-radio"><i /></span>
                    </div>
                    <div className="hpm-opt">
                      <span className="hpm-opt-txt"><span className="hpm-opt-name">Assisted stretch</span><span className="hpm-opt-sub">20 min · one on one</span></span>
                      <span className="hpm-radio-off" />
                    </div>
                    <div className="hpm-opt">
                      <span className="hpm-opt-txt"><span className="hpm-opt-name">Mindfulness</span><span className="hpm-opt-sub">30 min · group</span></span>
                      <span className="hpm-radio-off" />
                    </div>
                  </div>
                </div>
                <div className="hb-panel hb-p2">
                  <p className="hpm-bt">Pick your time</p>
                  <div className="hpm-slots">
                    {['10:00', '10:20', '10:40', '11:00', '11:20', '11:40'].map((t) => (
                      <span key={t} className={`hpm-slot${t === '10:40' ? ' hb-slot-on' : ''}`}>{t}</span>
                    ))}
                  </div>
                  <span className="hpm-cta">Book Thursday 10:40</span>
                </div>
                <div className="hb-panel hb-p3">
                  <span className="hb-check">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <p className="hpm-booked">You’re booked!</p>
                  <p className="hpm-booked-meta">Massage · Thursday, 10:40 am<br />Wellness Day</p>
                </div>
              </div>
            </div>
          </div>

          {/* Flip card on a 27s loop. */}
          <div className="hpm-flipcell">
            <div className="gg-flip">
              <div className="gg-face gg-face-a">
                <p className="gg-ct hpm-ft">You make the intro.</p>
                <p className="gg-ct gg-ct2 hpm-ft">We handle the rest.</p>
                <p className="gg-ct gg-ct3 hpm-ft-sub">Pre-approval, setup, sign-ups and the carrier paperwork.</p>
              </div>
              <div className="gg-face gg-face-b">
                <p className="gg-ft hpm-ft">10% off off-fund.</p>
                <p className="gg-ft gg-ft2 hpm-ft">For SterlingRisk clients.</p>
                <p className="gg-ft gg-ft3 hpm-ft-sub">Hair, nails, facials and headshots at the partner rate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sw-in-rise sp-trusted">
        <p className="sp-trusted-t">Trusted by <CountTo to={500} /><span className="sp-coral">+</span> organizations</p>
        <div className="hb-logos">
          <div className="pl-track">
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <WhiteLogo key={i} {...l} />
            ))}
          </div>
        </div>
      </div>
    </Sec>
  );
}

/* ── 2 · Where we plug in ─────────────────────────────────────────────── */

function Funds() {
  return (
    <Sec id="funds" className="sw-sec--lap sp-funds" label="Where we plug in">
      <div className="sw-wrap">
        <div className="sw-head sw-head--center">
          <p className="sw-kicker sw-in-fade">Where we plug in</p>
          <h2 className="sw-h2 sw-in-rise">Cigna, Aetna, Anthem.<br /><span className="sp-coral">We already work with all three.</span></h2>
          <p className="sw-lead sw-in-rise sp-funds-lead">Pre-approval language, invoice formats and participation reporting for each carrier, ready to go. You make the intro. We handle the rest.</p>
        </div>
        <div className="sp-carriers">
          {CARRIERS.map((c) => (
            <div key={c.name} className="sp-carrier">
              <span className="sp-carrier-chip" style={{ background: c.color }}>{c.name}</span>
              <div>
                <p className="sp-carrier-k">We file against the</p>
                <h3 className="sp-carrier-h">{c.fund}</h3>
              </div>
              <p className="sp-carrier-f">Pre-approval and invoice format on file.</p>
            </div>
          ))}
        </div>
        <div className="sp-ask">
          <div>
            <p className="sp-ask-k">When a client asks what to spend it on</p>
            <p className="sp-ask-t">Send them to us. We build the program, run it and keep you copied on every step.</p>
          </div>
          <a href="#quote" className="sp-pill-btn">
            Book my call
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>
    </Sec>
  );
}

/* ── 3 · The menu ─────────────────────────────────────────────────────── */

/** A menu service in the shape the shared pop-out reads. */
function toStation(r: RailService): ModalStation | null {
  const s = MENU_SERVICES.find((m) => m.id === r.id);
  if (!s) return null;
  return {
    name: s.name,
    image: s.image,
    cropArt: !!s.cropArt,
    tint: TINT[r.id],
    imagePos: s.imagePos,
    detail: {
      group: r.billing === 'fund' ? 'Fund eligible' : '10% partner rate',
      desc: s.desc,
      bring: s.bring.map((b) => [b.lead, b.rest] as [string, string]),
      colKind: s.columnKind,
      items: s.items.map((it) => [it.lead || '', it.rest] as [string, string]),
      metaFooter: s.metaFooter,
      photos: s.photos || [],
      galleryKeys: MENU_GALLERY_KEYS[r.id] || [],
    },
  };
}

function Menu() {
  const [cat, setCat] = useState<'all' | 'fund' | 'rate'>('all');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const gallery = useGalleryByKey();

  const cards = RAIL_SERVICES.filter((s) => cat === 'all' || s.billing === cat);
  const stations = useMemo(
    () => cards.map(toStation).filter((s): s is ModalStation => !!s),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat],
  );

  const pick = (k: 'all' | 'fund' | 'rate') => {
    railRef.current?.scrollTo({ left: 0 });
    setCat(k);
  };
  const step = (dx: number) => railRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <Sec id="menu" className="sw-sec--lap sw-sec--surface sp-menu" label="Fund menu">
      <div className="sw-wrap">
        <div className="sw-head">
          <p className="sw-kicker sw-in-fade">The menu</p>
          <h2 className="sw-h2 sw-in-rise">Twelve services.<br /><span className="sp-coral">Eight on the fund.</span></h2>
          <div className="sw-in-rise sp-cats">
            {RAIL_CATS.map((c) => (
              <button key={c.key} type="button" className={`sc-dot-pill${cat === c.key ? ' is-on' : ''}`} onClick={() => pick(c.key)}>
                <span className="sc-dot" style={{ background: c.dot }} />{c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="sw-srail" ref={railRef}>
        <div className="sw-srail-track">
          {cards.map((s, i) => (
            <div key={s.id} className="sc-rc">
              <button type="button" className="sc-rc-hit" aria-label={`More about ${s.name.toLowerCase()}`} onClick={() => setOpenIdx(i)} />
              <span className="sc-rc-tile">
                <span className="sc-rc-face">
                  <span
                    className="sc-rc-img"
                    style={{ backgroundColor: TINT[s.id], backgroundImage: `url('${SERVICE_ART}${s.art}')` }}
                  />
                  {s.billing === 'rate'
                    ? <span className="sc-rc-flag sc-rc-flag--rate">Partner rate</span>
                    : s.remote && <span className="sc-rc-flag sc-rc-flag--remote">Remote too</span>}
                </span>
                <span className="sc-rc-face sc-rc-face--back" style={{ background: TINT[s.id] }}>
                  <span className="sc-rc-bk">{s.name}</span>
                  <span className="sc-rc-bq">{QUIP[s.id]}</span>
                  <span className="sc-rc-bc">
                    Book {s.name.toLowerCase()}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </span>
                <span className="sc-rc-plus" aria-hidden="true">+</span>
              </span>
              <span className="sc-rc-meta">
                <span className="sc-rc-name">{s.name}</span>
                <span className="sc-rc-sub">{s.meta}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="sw-wrap">
        <div className="sw-snavbar">
          <button type="button" className="sw-snav" onClick={() => step(-404)} aria-label="Scroll left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="sw-snav" onClick={() => step(404)} aria-label="Scroll right">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <a className="sw-sall" href="/menu">See the full menu</a>
        </div>
      </div>
      {/* Portalled out of the page root so the page's element defaults
          (which mirror the reference) never restyle the shared pop-out. */}
      {openIdx !== null && stations[openIdx] && createPortal(
        <StationModal
          stations={stations}
          index={openIdx}
          gallery={gallery}
          onClose={() => setOpenIdx(null)}
          onGo={(i) => setOpenIdx(i)}
        />,
        document.body,
      )}
    </Sec>
  );
}

/* ── 5 · Partner benefits ─────────────────────────────────────────────── */

function Benefits() {
  return (
    <Sec id="benefits" className="sw-sec--lap sw-sec--surface sp-benefits" label="Partner benefits">
      <div className="sw-wrap">
        <div className="sw-head sw-head--center">
          <p className="sw-kicker sw-in-fade">Partner benefits</p>
          <h2 className="sw-h2 sw-in-rise">What’s in it for you.<br /><span className="sp-coral">And for your book.</span></h2>
        </div>
        <div className="sp-bens">
          {BENEFITS.map((b) => (
            <div key={b.title} className={`sp-ben${b.dark ? ' sp-ben--dark' : ''}`}>
              <span className="sp-ben-chip" style={{ background: b.chip }}>{b.who}</span>
              <h3 className="sw-h4 sp-ben-h">{b.title}</h3>
              <p className="sw-body sp-ben-b">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Sec>
  );
}

/* ── 7 · The handoff ──────────────────────────────────────────────────── */

function Handoff() {
  return (
    <Sec id="how" className="sw-sec--lap sw-sec--surface sp-how" label="The handoff">
      <div className="sw-wrap">
        <div className="sw-head sw-head--center">
          <p className="sw-kicker sw-in-fade">The handoff</p>
          <h2 className="sw-h2 sw-in-rise">You make the intro.<br /><span className="sp-coral">We take it from there.</span></h2>
        </div>
        <ol className="sp-how-list">
          {HANDOFF.map((p) => (
            <li key={p.n} className={`sp-how-card${p.dark ? ' sp-how-card--dark' : ''}`}>
              <span className="sw-row-n" style={{ background: p.fill }}>{p.n}</span>
              <h3 className="sp-how-h">{p.title}</h3>
              <p className="sp-how-p">{p.body}</p>
              <span className="sp-how-who">{p.who}</span>
            </li>
          ))}
        </ol>
      </div>
    </Sec>
  );
}

/* ── 8 · Proof ────────────────────────────────────────────────────────── */

function Proof() {
  return (
    <Sec id="proof" className="sw-sec--lap sw-sec--navy sp-proof" label="Proof">
      <div className="sw-wrap">
        <div className="sp-proof-top">
          <div className="sw-head">
            <p className="sw-kicker sw-in-fade">What clients say</p>
            <h2 className="sw-h2 sw-in-rise">Booked once.<br /><span className="sp-aqua">Kept for good.</span></h2>
            <p className="sw-lead sw-in-rise sp-proof-lead">BCG and DraftKings run us at every US office.</p>
          </div>
          <div className="sp-stats">
            {STATS.map((s) => (
              <div key={s.label} className="sp-stat">
                <span className="sp-stat-n">{s.n}<span className="sp-coral">{s.suf}</span></span>
                <span className="sp-stat-l">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sp-gal">
          {GALLERY.map((g) => (
            <span
              key={g.cap}
              role="img"
              aria-label={g.cap}
              className={`sp-gal-tile ${g.col}`}
              style={{ backgroundImage: `url('${g.img}')`, backgroundPosition: g.pos }}
            >
              <span className="sp-gal-cap">{g.cap}</span>
            </span>
          ))}
        </div>
        <div className="sp-proof-logos">
          {LOGOS.map((l) => <WhiteLogo key={l.file} {...l} />)}
        </div>
        <div className="sp-quotes">
          <figure className="sp-quote">
            <img src="/conference/onepager/logos/draftkings.svg" alt="DraftKings" className="sp-quote-logo" />
            <blockquote className="sp-quote-a">“Shortcut has become an extension of the DraftKings family.”</blockquote>
            <figcaption className="sp-quote-cap">
              <img src="/conference/onepager/christian.jpeg" alt="" className="sp-quote-av" />
              <span><b className="sp-quote-name">Christian W.</b><span className="sp-quote-role">Employee Experience Specialist, DraftKings</span></span>
            </figcaption>
          </figure>
          <figure className="sp-quote sp-quote--aqua">
            <img src="/conference/onepager/logos/teads.svg" alt="Teads" className="sp-quote-logo" />
            <blockquote className="sp-quote-b">“They go above and beyond to make each event tailored to our team.”</blockquote>
            <figcaption className="sp-quote-cap">
              <img src="/conference/onepager/allison.png" alt="" className="sp-quote-av" />
              <span><b className="sp-quote-name">Allison B.</b><span className="sp-quote-role">Sr. Manager, Compensation &amp; Benefits, Teads</span></span>
            </figcaption>
          </figure>
        </div>
      </div>
    </Sec>
  );
}

/* ── 9 · Next step + footer ───────────────────────────────────────────── */

function Next() {
  return (
    <Sec id="next" className="sw-sec--lap sp-next" label="Next step">
      <div className="sw-wrap sp-next-wrap">
        <div className="sw-cta-card sw-in-rise">
          <p className="sp-cta-k">Next step</p>
          <h2 className="sw-h2 sw-in-rise">Got a client in mind?</h2>
          <p className="sw-body sp-cta-p">Send us the name. We’ll come back with a program and a date, and keep you copied.</p>
          <a className="sw-btn sw-btn--navy sp-cta-btn" href="#quote">Book my call</a>
        </div>
      </div>
      <div className="sw-footer">
        <div className="sw-footer-panel">
          <div className="sp-foot-l">
            <img src="/conference/shortcut-logo-white.svg" alt="Shortcut" className="sp-foot-logo" />
            <span className="sp-foot-sep" />
            <span className="sp-foot-pill"><img src="/partners/sterlingrisk-logo.png" alt="SterlingRisk Insurance" /></span>
          </div>
          <p className="sp-foot-t">Trusted by 500+ companies · 87% rebook · Prepared for SterlingRisk</p>
        </div>
      </div>
    </Sec>
  );
}

export default function SterlingPartnerPage() {
  useEffect(() => {
    document.title = 'Shortcut × SterlingRisk · Wellness fund partner';
    // In-page anchors glide, as in the reference (`html { scroll-behavior: smooth }`).
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = prev; };
  }, []);

  return (
    <QuoteSheetProvider>
      <div className="sp sw-page">
        <Nav />
        <Hero />
        <Funds />
        <Menu />
        <SterlingPackages />
        <Benefits />
        <SterlingApart />
        <Handoff />
        <Proof />
        <Next />
      </div>
    </QuoteSheetProvider>
  );
}
