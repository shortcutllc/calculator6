import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useParams } from 'react-router-dom';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { buildLoungeDemoLink } from '../../utils/demoSignupLink';
import { fetchPublicSponsorDeck, fetchSponsorDeckPreview, fetchOrganizerDeckPreview, deckUrl } from '../../services/sponsorPageService';
import type { DeckTierId, SponsorDeckConfig } from '../../types/sponsorPage';
import StationModal, { useGalleryByKey } from './StationModal';
import { ShortcutLockup as InlineLockup } from './ShortcutLockup';
import NavLockup from '../sterling/ShortcutLockup';
import { Sec, CountTo } from '../sterling/swMotion';
import { LOGOS } from '../sterling/sterlingData';
import { LOUNGE_RENDERING } from './sponsorData';
import { SPONSOR_SERVICES, type SponsorServiceId } from '../../utils/sponsorPackages';
import '../sterling/sterling-partner.css';
import '../sterling/sterling-sections.css';
import '../../styles/sponsor-deck.css';

/* ─────────────────────────────────────────────
   Sponsor deck: what the ORGANIZER sends its SPONSORS to sell the lounge,
   as a page and as a PDF. The partner page (/sponsor/:slug) sells the
   lounge to the organizer; this is the next step, once they have bought it.

   The reader is a sponsor's marketing or sales lead, who buys attention and
   leads (sponsor_activation_positioning). The organizer is the seller.
   Shortcut shows only as logos, the "Powered by" row and the footer; the
   copy says the work is handled for the sponsor and never names who does
   it (Will, 2026-11-20). It never shows Shortcut's fee or the organizer's
   margin, and never links to the partner page, which does.

   Rebuilt 2026-11-19 on the website design language, as the SterlingRisk
   partner page ports it (Will: "use the website design system", the
   Sterling Partner 1280 D design). Six sections, one job each:
     hero (what it is, what it looks like, the booking that makes the lead)
     what you get · who attends (only with facts) · the stations ·
     sponsorship options · next step. No Workhuman proof section (Will,
     2026-11-20).

   "Download PDF" turns on static mode and prints one page per section.
   See src/styles/sponsor-deck.css.
   ───────────────────────────────────────────── */

/* Each station's line for a sponsor, on the back of its rail card. */
const STATION_BODY: Record<SponsorServiceId, string> = {
  reset: 'Chair massage set up like a small spa, with privacy screens, soothing scents, soft lighting and music.',
  glow: 'A pop-up salon and barbershop. Blowouts, cuts, makeup, beard trims and hot towel shaves.',
  polish: 'Express manicures, with no water and nothing for the venue to clean up.',
  studio: 'A photographer on site. Every guest gets a private gallery and a retouched favorite.',
  mindful: 'Guided mindfulness on the main stage, between sessions or in a breakout room.',
  sound: 'A crystal sound bath: thirty minutes with eyes closed and screens off.',
  movement: 'Yoga, stretching or a strength class, with mats, music and setup included.',
};

/* Each station's color, sampled from its card art (the shared station data
   has the hair and nails tints the other way round). */
const ART_FILL: Record<SponsorServiceId, string> = {
  reset: '#9EFAFF', glow: '#FEDC64', polish: '#F7BBFF', studio: '#9EFAFF',
  mindful: '#C7CBFB', sound: '#C7CBFB', movement: '#A9F0CC',
};

/* The most guests each station serves in a day (Will, 2026-11-20). His
   numbers, not the pricing engine's ladder, and always "up to", never
   "about". Group sessions count sessions, sized to the room. */
const GUESTS: Record<SponsorServiceId, { count: string; note?: string }> = {
  reset: { count: 'Up to 100 guests a day' },
  glow: { count: 'Up to 80 guests a day' },
  polish: { count: 'Up to 80 guests a day' },
  studio: { count: 'Up to 100 guests a day' },
  mindful: { count: 'Up to 3 sessions a day', note: 'Sized to the room' },
  sound: { count: 'Up to 3 sessions a day', note: 'Sized to the room' },
  movement: { count: 'Up to 3 sessions a day', note: 'Sized to the room' },
};

/* Sample prices, shown only in the staff preview and always labeled as
   samples (Will, 2026-11-20). The sponsor link never shows them: without
   the organizer's own price it says "Price set by <organizer>". */
const SAMPLE_PRICE = { title: '$60,000', station: '$20,000', mindful: '$10,000' } as const;

/* The hero's pills: every station, in its art's color. The bottom row lands
   first, as on the website. */
const PILLS: { id: SponsorServiceId; label: string; delay: number }[][] = [
  [
    { id: 'reset', label: 'Massage', delay: 0.95 },
    { id: 'glow', label: 'Hair and beauty', delay: 1.13 },
    { id: 'polish', label: 'Manicures', delay: 1.31 },
    { id: 'studio', label: 'Headshots', delay: 1.49 },
  ],
  [
    { id: 'mindful', label: 'Mindfulness', delay: 0.4 },
    { id: 'sound', label: 'Sound baths', delay: 0.58 },
    { id: 'movement', label: 'Movement', delay: 0.76 },
  ],
];

/* The hero photo: the rendering first, then TradeStation's branded lounge.
   None of these appear again on the page. */
const HERO_PHOTOS = [
  { src: LOUNGE_RENDERING.src, alt: LOUNGE_RENDERING.alt, cap: 'A lounge built in one sponsor’s brand', fill: '#9EFAFF' },
  { src: '/conference/tradestation/ts-event-26.jpg', alt: 'TradeStation’s Fresh Look lounge', cap: 'TradeStation’s Fresh Look lounge', fill: '#FEDC64' },
  { src: '/conference/tradestation/ts-event-15.jpg', alt: 'A haircut in TradeStation’s branded lounge', cap: 'Haircuts in TradeStation’s brand', fill: '#F7BBFF' },
  { src: '/conference/tradestation/ts-event-8.jpg', alt: 'TradeStation’s lounge floor seen from above', cap: 'The lounge floor, from above', fill: '#C7CBFB' },
  { src: '/conference/tradestation/ts-event-51.jpg', alt: 'The Fresh Look sign at TradeStation’s lounge', cap: 'The Fresh Look sign', fill: '#A9F0CC' },
];

/* The booking a guest makes, which is the sponsor's lead. Demo person. */
const DEMO_FIELDS: [string, string][] = [
  ['Name', 'Maya Reyes'],
  ['Title', 'Benefits Director'],
  ['Company', 'Acme Co.'],
  ['Work email', 'maya@acme.co'],
];
const SLOTS = ['10:00', '10:20', '10:40', '11:00', '11:20', '11:40'];

const GET = [
  { n: '01', fill: '#9EFAFF', title: 'Your brand on the lounge',
    body: () => 'The lounge, signage, booking page, emails and uniforms are all designed and built in your brand.' },
  { n: '02', fill: '#FEDC64', title: 'An invite to every attendee',
    body: (org: string) => `${org} sends your booking link to every attendee, and guests book a time before the show.` },
  { n: '03', fill: '#F7BBFF', title: 'A free service for every guest',
    body: () => 'Your team welcomes each guest, and licensed Pros give every service.' },
  { n: '04', fill: '#9EFAFF', dark: true, title: 'A lead for every visit',
    body: () => 'Every guest books with their name, title, company and email. You get the full list and a results report after the show.' },
];

/* White client marks for the trust row. The website's white Tripadvisor
   fills the owl's eyes, so it reads as a disc on navy; ours keeps them. */
const markSrc = (file: string) =>
  (file === 'tripadvisor' ? '/conference/onepager/logos/tripadvisor-on-navy.svg' : `/ds-assets/logos/${file}-white.svg`);

/** "20,000+" → ["20,000", "+"], so the suffix can take the accent. */
const splitFig = (fig: string): [string, string] => {
  const m = fig.match(/^(.*?)([+%]*)$/);
  return [m?.[1] ?? fig, m?.[2] ?? ''];
};

function Tick({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M12.5 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The organizer's logo, or its name set as a mark. */
function OrgMark({ mark, logoUrl }: { mark: string; logoUrl?: string }) {
  return logoUrl ? <img src={logoUrl} alt={mark} /> : <span className="sd-co-mark">{mark}</span>;
}

/* PDF mode: one 1440 x 1114 page per section (letter landscape
   proportions). Keep in step with @page in sponsor-deck.css. */
const PAGE_H = 1114;

/** Fits every section to one page: scales it (CSS zoom, at most 1.12) until
 *  its content fits PAGE_H, then sets its height so its background fills the
 *  page. Zoom changes the layout width, so it settles over a few passes. */
function fitPages() {
  document.querySelectorAll<HTMLElement>('.sd-page .sw-sec').forEach((page) => {
    let z = 1;
    for (let i = 0; i < 6; i++) {
      page.style.zoom = String(z);
      page.style.height = 'auto';
      const h = page.getBoundingClientRect().height;
      const next = Math.min(1.12, (z * PAGE_H) / h);
      if (Math.abs(next - z) < 0.001) break;
      z = next;
    }
    z = Math.floor(z * 1000) / 1000;
    page.style.zoom = String(z);
    page.style.height = `${PAGE_H / z}px`;
  });
}

/** Undoes fitPages for the screen page. */
function unfitPages() {
  document.querySelectorAll<HTMLElement>('.sd-page .sw-sec').forEach((page) => {
    page.style.zoom = '';
    page.style.height = '';
  });
}

function Nav({ cfg }: { cfg: SponsorDeckConfig }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled((window.scrollY || 0) > 120);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <div className="sw-nav" data-scrolled={scrolled ? '1' : '0'}>
      <span className="sw-nav-logo" aria-label="Shortcut">
        <NavLockup width={164} className="sw-logo-w" />
        <NavLockup width={164} className="sw-logo-n" />
      </span>
      <div className="sp-nav-r">
        <span className="sw-co">
          <span className="sw-co-logo"><OrgMark mark={cfg.organizer.mark} logoUrl={cfg.organizer.logoUrl} /></span>
          <span className="sw-co-t">{cfg.conference.name} sponsorship</span>
        </span>
        <a className="sw-nav-cta" href="#next" data-pdf-hide>Reserve</a>
      </div>
    </div>
  );
}

function Deck({ cfg, isStatic, preview, onDownload }: { cfg: SponsorDeckConfig; isStatic: boolean; preview: boolean; onDownload?: () => void }) {
  const d = cfg.deck;
  const { organizer, conference: conf } = cfg;
  const org = organizer.name;
  /* Every station Shortcut offers (Will, 2026-11-19): a sponsor chooses from
     the whole menu, not the partner page's pitch list. */
  const services = SPONSOR_SERVICES;
  const ids = services.map((s) => s.id);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const gallery = useGalleryByKey();
  const railRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isStatic) { unfitPages(); return; }
    fitPages();
    let live = true;
    const images = [...document.images].map((img) => (img.complete ? null : new Promise((r) => {
      img.addEventListener('load', r, { once: true });
      img.addEventListener('error', r, { once: true });
    })));
    Promise.all([document.fonts?.ready, ...images]).then(() => { if (live) fitPages(); });
    return () => { live = false; };
  }, [isStatic]);

  const step = (dir: 1 | -1) => {
    const rail = railRef.current;
    const card = rail?.querySelector<HTMLElement>('.sc-rc');
    if (rail && card) rail.scrollBy({ left: dir * (card.offsetWidth + 24), behavior: 'smooth' });
  };

  const hasWho = !!(d.audience?.length || d.stats?.length);
  const stats = d.stats ?? [];

  /* Each option reads like a sponsorship prospectus item: the price and
     availability, a sentence, then what's included. The price is the
     organizer's; without one, the staff preview shows a labeled sample and
     the sponsor link says the organizer sets it. */
  const priceOf = (id: DeckTierId) => {
    const set = d.tiers?.[id]?.price;
    if (set) return { price: set, sample: false };
    return preview ? { price: SAMPLE_PRICE[id], sample: true } : { price: undefined, sample: false };
  };
  const tiers = [
    {
      id: 'title' as const, label: 'Title sponsor', dark: true, chip: '#FEDC64',
      title: 'The whole lounge in your name',
      body: 'You choose the stations and the lounge carries your name. There’s one title sponsor per show, so attendees see one brand in the lounge, not several.',
      lines: ['One or more stations you pick, every day of the show', 'Your name on the lounge entrance, its signage and the booking page', 'Every booking in the lounge comes to you as a lead', 'Up to 100 guests a day for each station you add'],
      available: d.tiers?.title?.available ?? '1 of 1 available', ...priceOf('title'),
    },
    {
      id: 'station' as const, label: 'Station sponsor', dark: false, chip: '#9EFAFF',
      title: 'One station in your brand',
      body: 'Your own station in a lounge shared with other sponsors.',
      lines: ['One station, every day of the show', 'Your signage and uniforms at that station', 'Every booking at your station comes to you as a lead', 'Up to 100 guests a day, depending on the station'],
      available: d.tiers?.station?.available, ...priceOf('station'),
    },
    ...(ids.includes('mindful') ? [{
      id: 'mindful' as const, label: 'Mindful Reset sponsor', dark: false, chip: '#C7CBFB',
      title: 'A guided reset in your name',
      body: 'A guided mindfulness session for attendees, with your name on it.',
      lines: ['A session on the main stage, between sessions or in a breakout', 'Your name in the agenda and event app', 'A thank you from the stage'],
      available: d.tiers?.mindful?.available ?? '1 of 1 available', ...priceOf('mindful'),
    }] : []),
  ];
  const anySample = tiers.some((t) => t.sample);

  const contact = d.salesContact;
  /* The demo booking page, shown as this conference's wellness lounge with a
     sponsor logo placeholder (utils/demoSignupLink; Will, 2026-11-20). */
  const demoUrl = buildLoungeDemoLink(conf.name, organizer.logoUrl, ids);
  /* White and surface alternate down the page. Who attends is surface when
     it shows; without it, What you get takes the surface instead. */
  const tone = (surface: boolean) => (surface ? ' sw-sec--surface' : '');

  return (
    <>
      {/* ══════════ HERO ══════════ */}
      <Sec className="sw-sec--navy sd-hero" label="Hero">
        <div className="sw-wrap">
          <div className="sp-hero-top">
            <h1 className="sw-h1 sw-in-rise sp-hero-h1">
              Host the wellness lounge at {conf.name}.<br /><span className="sp-aqua">Every visit is a lead.</span>
            </h1>
            <p className="sw-lead sw-in-rise sp-hero-lead">
              Give every attendee a free chair massage, blowout or headshot in a lounge with your name on it. Every part of the activation is handled for you, so your team can spend the show meeting people.
            </p>
            <div className="sp-hero-row">
              <div className="sw-in-rise sp-hero-ctas" data-pdf-hide>
                <a className="sw-btn sw-btn--coral" href="#options">See sponsorship options</a>
                {onDownload && <button type="button" className="sp-hero-talk sd-btn-reset sd-hide-phone" onClick={onDownload}>Download the PDF</button>}
              </div>
              <div className="hb-pile" aria-label="The stations">
                {PILLS.map((row, r) => (
                  <div key={r} className="hb-pile-row">
                    {row.map((p) => {
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className="hb-pill"
                          style={{ background: ART_FILL[p.id], animationDelay: `${p.delay}s` }}
                          onClick={() => setOpenIdx(services.findIndex((x) => x.id === p.id))}
                        >
                          <span className="hb-pill-in">{p.label}<Arrow /></span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hpm sw-in-rise">
            {/* What the lounge looks like: the rendering, then a real one. */}
            <div className="hpm-photo">
              <div className="hpm-photo-frame">
                {HERO_PHOTOS.map((p, i) => (
                  <span key={p.src} className={`gg-ph gg-ph${i + 1}`}>
                    <img src={p.src} alt={p.alt} loading={i ? 'lazy' : undefined} />
                  </span>
                ))}
                <span className="hpm-shade" />
                {HERO_PHOTOS.map((p, i) => (
                  <span key={p.cap} className={`gg-cap gg-cap${i + 1}`} style={{ background: p.fill }}>{p.cap}</span>
                ))}
                <span className="hpm-dots">
                  {HERO_PHOTOS.map((p, i) => <span key={p.src} className={`gg-dot gg-dot${i + 1}`} />)}
                </span>
              </div>
            </div>

            {/* The booking a guest makes, which is the sponsor's lead. */}
            <div className="hpm-book">
              <div className="hpm-book-card">
                <div className="hpm-book-hd">
                  <span className="sd-yourlogo">Your logo</span>
                  <span className="hpm-book-sep" />
                  <span className="sd-book-conf">The wellness lounge at {conf.name}</span>
                </div>
                <div className="hpm-book-body">
                  <div className="hb-panel hb-p1">
                    <p className="hpm-bt">Pick your time</p>
                    <p className="sd-book-svc">Chair massage · 15 min</p>
                    <div className="hpm-slots">
                      {SLOTS.map((t) => <span key={t} className={`hpm-slot${t === '10:40' ? ' sd-slot-on' : ''}`}>{t}</span>)}
                    </div>
                    <span className="hpm-cta">Book 10:40 am</span>
                  </div>
                  <div className="hb-panel hb-p2">
                    <p className="hpm-bt">Your details</p>
                    <div className="sd-fields">
                      {DEMO_FIELDS.map(([k, v]) => (
                        <span key={k} className="sd-field"><span className="sd-field-k">{k}</span><span className="sd-field-v">{v}</span></span>
                      ))}
                    </div>
                    <span className="hpm-cta">Confirm my booking</span>
                  </div>
                  <div className="hb-panel hb-p3">
                    <span className="hb-check">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <p className="hpm-booked">You’re booked!</p>
                    <p className="hpm-booked-meta">Chair massage · 10:40 am<br />The wellness lounge at {conf.name}</p>
                  </div>
                </div>
              </div>
              {demoUrl && !isStatic && (
                <a className="sd-try" href={demoUrl} target="_blank" rel="noopener noreferrer" data-pdf-hide>
                  Try the booking page <ExternalLink size={14} strokeWidth={2.4} />
                </a>
              )}
            </div>

            {/* Where and when. */}
            <div className="sd-conf">
              <p className="sd-conf-k">Where and when</p>
              <p className="sd-conf-t">{conf.name}<br />{conf.dateLabel}</p>
              {d.venue && <p className="sd-conf-s">{d.venue}</p>}
            </div>
          </div>
        </div>

        <div className="sw-in-rise sp-trusted">
          <p className="sp-trusted-t">
            Powered by <InlineLockup className="sd-lockup-inline" />, trusted by {isStatic ? '500' : <CountTo to={500} />}<span className="sp-coral">+</span> companies
          </p>
          <div className="hb-logos">
            <div className="pl-track">
              {(isStatic ? LOGOS : [...LOGOS, ...LOGOS]).map((l, i) => (
                <span
                  key={i}
                  role="img"
                  aria-label={l.alt}
                  aria-hidden={i >= LOGOS.length || undefined}
                  className="sp-logo"
                  style={{ height: l.h, backgroundImage: `url('${markSrc(l.file)}')` }}
                />
              ))}
            </div>
          </div>
        </div>
      </Sec>

      {/* ══════════ WHAT YOU GET ══════════ */}
      <Sec id="get" className={`sw-sec--lap${tone(!hasWho)} sd-get`} label="What you get">
        <div className="sw-wrap">
          <div className="sw-head sw-head--center">
            <p className="sw-kicker sw-in-fade">What you get</p>
            <h2 className="sw-h2 sw-in-rise">A lounge that brings<br /><span className="sp-coral">attendees to you.</span></h2>
          </div>
          <ol className="sp-how-list">
            {GET.map((g) => (
              <li key={g.n} className={`sp-how-card${g.dark ? ' sp-how-card--dark' : ''}`}>
                <span className="sw-row-n" style={{ background: g.fill }}>{g.n}</span>
                <h3 className="sp-how-h">{g.title}</h3>
                <p className="sp-how-p">{g.body(org)}</p>
              </li>
            ))}
          </ol>
        </div>
      </Sec>

      {/* ══════════ WHO ATTENDS (only with the conference's own facts) ══════════ */}
      {hasWho && (
        <Sec id="who" className="sw-sec--lap sw-sec--surface sd-who" label="Who attends">
          <div className="sw-wrap">
            <div className="sw-head sw-head--center">
              <p className="sw-kicker sw-in-fade">Who attends</p>
              <h2 className="sw-h2 sw-in-rise">Who you will meet<br /><span className="sp-coral">at {conf.name}.</span></h2>
              {d.about && <p className="sw-lead sw-in-rise sd-head-lead">{d.about}</p>}
              {/* In the preview only, like the sample prices: the facts are a
                  starting point the organizer checks (Will, 2026-11-20). */}
              {preview && <p className="sd-sample-note">Figures and attendee groups shown are examples. {org} can edit them before this goes to sponsors.</p>}
            </div>
            {stats.length > 0 && (
              <>
                <div className={`sd-statgrid sd-n${Math.min(stats.length, 3)}`}>
                  {stats.slice(0, 3).map((st) => {
                    const [n, suf] = splitFig(st.fig);
                    return (
                      <div key={st.label} className="sp-carrier">
                        <span className="sd-stat-n">{n}<span className="sp-coral">{suf}</span></span>
                        <p className="sd-stat-l">{st.label}</p>
                      </div>
                    );
                  })}
                </div>
                {d.statsSource && <p className="sd-source">Source: {d.statsSource}</p>}
              </>
            )}
            {d.audience?.length ? (
              <div className="sp-ask sd-aud">
                <p className="sp-ask-k">Attendees include</p>
                <ul className="sd-aud-list">
                  {d.audience.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        </Sec>
      )}

      {/* ══════════ THE STATIONS (the homepage flip-card rail) ══════════ */}
      <Sec id="stations" className="sw-sec--lap sd-stations" label="The stations">
        <div className="sw-wrap">
          <div className="sw-head">
            <p className="sw-kicker sw-in-fade">The menu</p>
            <h2 className="sw-h2 sw-in-rise">Pick the stations<br /><span className="sp-coral">for your lounge.</span></h2>
            <p className="sw-lead sw-in-rise">
              Choose one station or several.{isStatic ? '' : ' Tap a station to see what guests get.'}
            </p>
          </div>
        </div>
        <div className="sw-srail" ref={railRef}>
          <div className="sw-srail-track">
            {services.map((s, i) => (
              <div key={s.id} className="sc-rc">
                <button type="button" className="sc-rc-hit" aria-label={`More about ${s.name}`} onClick={() => setOpenIdx(i)} />
                <span className="sc-rc-tile">
                  <span className="sc-rc-face">
                    <span
                      className={`sc-rc-img${s.cropArt ? ' sc-rc-img--crop' : ''}`}
                      style={{ backgroundColor: ART_FILL[s.id], backgroundImage: `url('${s.image}')` }}
                    />
                  </span>
                  <span className="sc-rc-face sc-rc-face--back" style={{ background: ART_FILL[s.id] }}>
                    <span className="sc-rc-bk">{s.name}</span>
                    <span className="sc-rc-bq">{STATION_BODY[s.id]}</span>
                    <span className="sc-rc-bc">
                      See the details
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </span>
                  <span className="sc-rc-plus" aria-hidden="true">+</span>
                </span>
                <span className="sc-rc-meta">
                  <span className="sc-rc-name">{s.name}</span>
                  <span className="sc-rc-sub">{s.meta}</span>
                  <span className="sd-rc-guests">
                    <span className="sd-rc-count" style={{ background: ART_FILL[s.id] }}>{GUESTS[s.id].count}</span>
                    {GUESTS[s.id].note && <span className="sd-rc-note">{GUESTS[s.id].note}</span>}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="sw-wrap">
          <div className="sw-snavbar">
            <button type="button" className="sw-snav" onClick={() => step(-1)} aria-label="Scroll left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="sw-snav" onClick={() => step(1)} aria-label="Scroll right">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </Sec>

      {/* ══════════ SPONSORSHIP OPTIONS ══════════
          Prices and availability are the organizer's (the deck's details on
          the Sponsor Pages tab). Samples show only in the staff preview. */}
      <Sec id="options" className="sw-sec--lap sw-sec--surface sd-options" label="Sponsorship options">
        <div className="sw-wrap">
          <div className="sw-head sw-head--center">
            <p className="sw-kicker sw-in-fade">Sponsorship options</p>
            <h2 className="sw-h2 sw-in-rise">Ways to sponsor<br /><span className="sp-coral">the wellness lounge.</span></h2>
            <p className="sw-lead sw-in-rise sd-head-lead">
              {org} offers the lounge two ways: one title sponsor puts its name on the whole lounge, or several sponsors each take a station.
            </p>
            {anySample && <p className="sd-sample-note">Prices shown are samples. {org} sets the final price for each sponsorship.</p>}
          </div>
          <ul className={`sd-opts sd-opts--${tiers.length}`}>
            {tiers.map((t) => (
              <li key={t.id} className={`sp-ben${t.dark ? ' sp-ben--dark' : ''}`}>
                <div className="sd-opt-top">
                  <span className="sp-ben-chip" style={{ background: t.chip }}>{t.label}</span>
                  {t.available && <span className="sd-opt-avail">{t.available}</span>}
                </div>
                <h3 className="sw-h4 sp-ben-h">{t.title}</h3>
                {t.price ? (
                  <p className="sd-opt-price">
                    <span className="sd-opt-price-v">{t.price}</span>
                    {t.sample && <span className="sd-opt-sample">Sample price</span>}
                  </p>
                ) : (
                  <p className="sd-opt-price-tbd">Price set by {org}</p>
                )}
                <p className="sd-opt-body">{t.body}</p>
                <div className="sd-opt-inc">
                  <p className="sd-opt-inc-k">Included</p>
                  <ul className="sd-opt-lines">
                    {t.lines.map((l) => <li key={l}><Tick color={t.dark ? '#9EFAFF' : '#018EA2'} />{l}</li>)}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Sec>

      {/* ══════════ NEXT STEP + FOOTER ══════════ */}
      <Sec id="next" className="sw-sec--lap sp-next sd-next" label="Next step">
        <div className="sw-wrap sp-next-wrap">
          <div className="sw-cta-card sw-in-rise">
            <p className="sp-cta-k">Next step</p>
            <h2 className="sw-h2">Reserve the wellness lounge<br />at {conf.name}.</h2>
            <p className="sw-body sp-cta-p">
              Tell {contact?.name ?? `the ${org} partnerships team`} which sponsorship you want. Then send your logo and colors, and the rest is built for you.
            </p>
            <div className="sd-cta-row">
              {contact?.email && (
                <a
                  className="sw-btn sw-btn--navy"
                  href={`mailto:${contact.email}?subject=${encodeURIComponent(`The wellness lounge at ${conf.name}`)}`}
                >
                  Email {contact.name}
                </a>
              )}
              {onDownload && (
                <button type="button" className="sw-btn sd-cta-ghost sd-hide-phone" onClick={onDownload} data-pdf-hide>
                  Download the PDF
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="sw-footer">
          <div className="sw-footer-panel">
            <div className="sp-foot-l">
              <img src="/conference/shortcut-logo-white.svg" alt="Shortcut" className="sp-foot-logo" />
              <span className="sp-foot-sep" />
              <span className="sd-foot-mark"><OrgMark mark={organizer.mark} logoUrl={organizer.logoUrl} /></span>
            </div>
            <p className="sp-foot-t">{conf.name} sponsorship opportunity · Produced with Shortcut</p>
          </div>
        </div>
      </Sec>

      {/* Portalled out of the page root, so the page's element defaults
          never restyle the shared pop-out. */}
      {openIdx !== null && openIdx >= 0 && createPortal(
        <StationModal
          stations={services}
          index={openIdx}
          gallery={gallery}
          onClose={() => setOpenIdx(null)}
          onGo={setOpenIdx}
        />,
        document.body,
      )}
    </>
  );
}

/* Two ways in, one page:
     /lounge/:token        the deck's own link, for the organizer to send to
                           its sponsors. Public, through get_sponsor_deck.
     /sponsor/:slug/deck   staff preview (signed in), before or after the
                           link exists. Never send this one: its address
                           leads back to the partner page. */
export default function SponsorDeck() {
  const { token, slug, previewToken } = useParams<{ token?: string; slug?: string; previewToken?: string }>();
  /* `preview` is set for both previews: `who` says whose. Both show the
     sample prices and notes; the sponsor link never does. */
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'missing' }
    | { kind: 'deck'; cfg: SponsorDeckConfig; preview?: { deckToken: string | null; who: 'staff' | 'organizer' } }
  >({ kind: 'loading' });
  /* Static mode, for the PDF: on from the button, or from the browser's own
     print (Ctrl+P), and off again once printing ends. */
  const [isStatic, setIsStatic] = useState(() => new URLSearchParams(window.location.search).get('pdf') === '1');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    if (token) {
      fetchPublicSponsorDeck(token).then((res) => { if (live) setState(res); });
    } else if (previewToken) {
      fetchOrganizerDeckPreview(previewToken).then((res) => {
        if (!live) return;
        setState(res ? { kind: 'deck', cfg: res.cfg, preview: { deckToken: res.deckToken, who: 'organizer' } } : { kind: 'missing' });
      });
    } else if (slug) {
      fetchSponsorDeckPreview(slug).then((res) => {
        if (!live) return;
        setState(res ? { kind: 'deck', cfg: res.cfg, preview: { deckToken: res.deckToken, who: 'staff' } } : { kind: 'missing' });
      });
    } else {
      setState({ kind: 'missing' });
    }
    return () => { live = false; };
  }, [token, slug, previewToken]);

  const cfg = state.kind === 'deck' ? state.cfg : null;
  const preview = state.kind === 'deck' ? state.preview : undefined;

  /* The PDF's file name comes from the page title. */
  useEffect(() => {
    if (!cfg) return;
    const before = document.title;
    document.title = `The Wellness Lounge at ${cfg.conference.name}`;
    return () => { document.title = before; };
  }, [cfg]);

  /* In-page anchors glide, as on the website. */
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = prev; };
  }, []);

  useEffect(() => {
    const on = () => flushSync(() => setIsStatic(true));
    const off = () => setIsStatic(new URLSearchParams(window.location.search).get('pdf') === '1');
    window.addEventListener('beforeprint', on);
    window.addEventListener('afterprint', off);
    return () => { window.removeEventListener('beforeprint', on); window.removeEventListener('afterprint', off); };
  }, []);

  /* In static mode every image loads now, not when scrolled to, so the PDF
     has them all. */
  useEffect(() => {
    if (!isStatic) return;
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  });

  /* Print once the images have loaded (or after eight seconds at most), so
     none comes out blank. */
  const downloadPdf = async () => {
    flushSync(() => setIsStatic(true));
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    const loaded = Promise.all([...document.images].map((img) => (
      img.complete ? null : new Promise((r) => {
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
      })
    )));
    await Promise.race([loaded, new Promise((r) => window.setTimeout(r, 8000))]);
    await document.fonts?.ready;
    fitPages();
    window.print();
  };

  const copyLink = async (t: string) => {
    try { await navigator.clipboard.writeText(deckUrl(t)); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ }
  };

  if (state.kind === 'loading') return <div className="min-h-screen bg-shortcut-blue" aria-busy="true" />;
  if (!cfg) {
    return (
      <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
        <p className="text-[16px] font-medium text-[#2A5468]">This page does not exist.</p>
      </div>
    );
  }

  return (
    <>
      <div className={`sp sw-page sd-page${isStatic ? ' sp-static' : ''}`}>
        <Nav cfg={cfg} />
        {/* The organizer's preview has no Download PDF: a PDF from it would
            carry the sample prices. The banner sends them to the sponsor
            link, which has the button. */}
        <Deck cfg={cfg} isStatic={isStatic} preview={!!preview} onDownload={preview?.who === 'organizer' ? undefined : downloadPdf} />
      </div>
      {preview?.who === 'organizer' && (
        /* The organizer's preview: say what's sample, and which link goes to
           sponsors. */
        <div data-print-hide className="sd-preview">
          <div className="sd-preview-in">
            <span className="font-extrabold">Preview for {cfg.organizer.name}.</span>
            <span>Sample prices and notes show only here.</span>
            {preview.deckToken ? (
              <>
                <span>Send sponsors this link, which also has the PDF:</span>
                <a href={deckUrl(preview.deckToken)} className="font-bold underline underline-offset-2">{deckUrl(preview.deckToken).replace(/^https?:\/\//, '')}</a>
                <button type="button" onClick={() => copyLink(preview.deckToken!)} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-[12.5px] font-bold">
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy link'}
                </button>
              </>
            ) : (
              <span>Shortcut will send you the link for your sponsors.</span>
            )}
          </div>
        </div>
      )}
      {preview?.who === 'staff' && (
        /* Staff preview: say so, and hand over the link to send. */
        <div data-print-hide className="sd-preview">
          <div className="sd-preview-in">
            <span className="font-extrabold">Staff preview.</span>
            {preview.deckToken ? (
              <>
                <span>Send sponsors this link, never this page&rsquo;s address:</span>
                <a href={deckUrl(preview.deckToken)} className="font-bold underline underline-offset-2">{deckUrl(preview.deckToken).replace(/^https?:\/\//, '')}</a>
                <button type="button" onClick={() => copyLink(preview.deckToken!)} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-[12.5px] font-bold">
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy link'}
                </button>
              </>
            ) : (
              <span>No sponsor link yet. Create it from this page&rsquo;s Sponsor deck on the Sponsor Pages tab.</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
