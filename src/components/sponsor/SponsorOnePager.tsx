import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { fetchPublicSponsorPage } from '../../services/sponsorPageService';
import type { SponsorPageConfig } from '../../types/sponsorPage';
import StationModal, { useGalleryByKey } from './StationModal';
import SponsorBento from './SponsorBento';
import SponsorPricing, { type QuoteRows } from './SponsorPricing';
import SponsorCallSheet from './SponsorCallSheet';
import { Gate } from './SponsorGate';
import { INK, BRAND_SHOTS, DEMO_LEADS, SizzleReel } from './sponsorUi';
import { LOUNGE_RENDERING, PROOF_GALLERY, PROOF_STATS } from './sponsorData';
import NavLockup from '../sterling/ShortcutLockup';
import { Sec } from '../sterling/swMotion';
import { SPONSOR_SERVICES, serviceById, type SponsorServiceId } from '../../utils/sponsorPackages';
import '../../styles/sponsor-page.css';
import '../sterling/sterling-partner.css';
import '../sterling/sterling-sections.css';
import '../../styles/sponsor-partner.css';

/* ─────────────────────────────────────────────
   Conference partner page: the pitch to a CONFERENCE ORGANIZER.

   The organizer buys the lounge from us and sells it to one of their
   sponsors as a premium sponsorship. So the argument runs:
     1. Your sponsors want three things from your audience: time with them,
        their contact details, and to be remembered.
     2. The lounge gives a sponsor all three, with their name on every step
        from the invite to the follow up.
     3. You sell it. We run every part of it.
     4. Proof it draws: Workhuman Live 2026.
     5. What can go in the lounge.
     6. Next step.

   The page explains how pricing could work with a sample, and never states
   our fee as a rate (Will, 2026-10-16). See sponsorPages.ts for who reads it.

   On the website design language since 2026-11-20 (Will: "apply this design
   system to the original conference page"), with the same sections and
   copy. Built from the Sterling port (src/components/sterling/*.css) plus
   src/styles/sponsor-partner.css, approved on the design board
   https://claude.ai/artifact/DuJGQypLmJW1shV8MEfRtW. The bento and the
   pricing builder are the live components, wrapped in website sections.

   Proof on this page, and where it is recorded:
     Workhuman Live 2026: five chairs, three days, 400 fifteen minute
       massages, waitlist never below 200  (CLAIMS_VERIFICATION.md §2,
       confirmed by Will 2026-09-07)
   ───────────────────────────────────────────── */

/* The hero's service pills: the holiday hero's six, in its colors. The
   bottom row lands first, as on the website. */
const PILLS: { label: string; fill: string; delay: number }[][] = [
  [
    { label: 'Massage', fill: '#9EFAFF', delay: 0.95 },
    { label: 'Hair', fill: '#FEDC64', delay: 1.13 },
    { label: 'Beauty', fill: '#F7BBFF', delay: 1.31 },
  ],
  [
    { label: 'Meditation', fill: '#C7CBFB', delay: 0.4 },
    { label: 'Movement', fill: '#A9F0CC', delay: 0.58 },
    { label: 'Headshots', fill: '#FFCBA6', delay: 0.76 },
  ],
];

/* The booking a guest makes, which is the sponsor's lead. Demo person. */
const DEMO_FIELDS: [string, string][] = [
  ['Name', 'Maya Reyes'],
  ['Title', 'Benefits Director'],
  ['Company', 'Acme Co.'],
  ['Work email', 'maya@acme.co'],
];
const SLOTS = ['10:00', '10:20', '10:40', '11:00', '11:20', '11:40'];

/* The rendering is the University of Cincinnati's lounge at the AACSB
   Deans Conference (Will, 2026-11-20: name the conference). A page with
   its own hero photo gets the general caption. */
const RENDERING_CAPTION = 'University of Cincinnati · AACSB Deans Conference 2026';

/* White client marks for the About Shortcut card. The website's white
   Tripadvisor fills the owl's eyes, so it reads as a disc on navy. */
const ABOUT_LOGOS = ['draftkings', 'nfl', 'bcg', 'wix', 'tripadvisor', 'pwc', 'paramount', 'warner-bros', 'mtv'];
const markSrc = (file: string) =>
  (file === 'tripadvisor' ? '/conference/onepager/logos/tripadvisor-on-navy.svg' : `/ds-assets/logos/${file}-white.svg`);

/* How it works (Will, 2026-11-20): About Shortcut first, then the four
   steps, every card one shape with about two lines of copy. */
type HowCard = { k: string; title: string; body: string; vis: 'logos' | 'photo' | 'invoice' | 'leads'; img?: string; cap?: string; pos?: string; fill?: string };
const HOW_CARDS: HowCard[] = [
  { k: 'About Shortcut', title: 'Trusted by 500+ companies', vis: 'logos',
    body: 'One team for massage, headshots, beauty and group wellness across the US.' },
  { k: '01', title: 'A turnkey, white‑labeled lounge', vis: 'photo',
    img: '/conference/tradestation/ts-event-51.jpg', cap: 'TradeStation · Fresh Look activation',
    body: 'The lounge, booking page, emails and uniforms all carry your sponsor’s brand.' },
  { k: '02', title: 'You sell it and keep the margin', vis: 'invoice', fill: '#9EFAFF',
    body: 'You set the price. We bill you only after your sponsor signs.' },
  { k: '03', title: 'An activation attendees love', vis: 'photo',
    img: '/conference/onepager/wh/booth-3.jpeg', cap: 'Workhuman Live 2026', pos: 'center 35%',
    body: 'A free massage, haircut or headshot, with nothing for your team to run.' },
  { k: '04', title: 'Guaranteed traffic and leads', vis: 'leads', fill: '#FEDC64',
    body: 'Every visit gives your sponsor a name, title, company and email.' },
];

/* Each station's color, sampled from its card art (the shared station data
   has the hair and nails tints the other way round). */
const ART_FILL: Record<SponsorServiceId, string> = {
  reset: '#9EFAFF', glow: '#FEDC64', polish: '#F7BBFF', studio: '#9EFAFF',
  mindful: '#C7CBFB', sound: '#C7CBFB', movement: '#A9F0CC',
};

/* Step by step: one attendee's visit, told in order, with the sponsor as
   the host at every step and the list as the payoff. */
const STEPS: { k: string; who: string; title: string; body: string; fill: string; dark?: boolean }[] = [
  { k: 'Before the show', who: 'You and Shortcut', title: 'A custom proposal.', fill: '#9EFAFF',
    body: 'We work with your sales team to design a package for your sponsors.' },
  { k: 'Before the show', who: 'You', title: 'Sold at your price.', fill: '#FEDC64',
    body: 'Your team offers it to sponsors. The sponsor sends us their logo and colors.' },
  { k: 'Before the show', who: 'You', title: 'In every invite.', fill: '#F7BBFF',
    body: 'The booking link goes into your conference emails and app.' },
  { k: 'Before the show', who: 'Shortcut', title: 'Booked and reminded.', fill: '#C7CBFB',
    body: 'Attendees pick their slot, and every confirmed appointment gets a custom reminder.' },
  { k: 'At the show', who: 'Shortcut and the sponsor', title: 'Welcomed.', fill: '#FFCBA6',
    body: 'A lounge in the sponsor’s colors, their team at the door, and a massage, blowout or headshot.' },
  { k: 'After the show', who: 'Shortcut', title: 'Followed up.', fill: '#9EFAFF', dark: true,
    body: 'The sponsor gets every name. You get a results report.' },
];

/* Next steps: a call, and what we do for the organizer's team after it. */
const NEXT_STEPS = [
  'We present to your team',
  'We design the program with you',
  'Your sales team gets everything it needs to sell it',
];

/** "100%" → ["100", "%"], so the suffix can take the accent. */
const splitFig = (fig: string): [string, string] => {
  const m = fig.match(/^(.*?)([+%]*)$/);
  return [m?.[1] ?? fig, m?.[2] ?? ''];
};

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M12.5 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ dir }: { dir: 1 | -1 }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={dir === 1 ? 'M9.5 5.5 16 12l-6.5 6.5' : 'M14.5 5.5 8 12l6.5 6.5'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The organizer's logo, or its name set as a mark. */
function OrgMark({ mark, logoUrl }: { mark: string; logoUrl?: string }) {
  return logoUrl ? <img src={logoUrl} alt={mark} /> : <span className="spp-co-mark">{mark}</span>;
}

/** Scrolls a rail one card at a time and reports which card leads. The
 *  rail only exists once the page has loaded, so `ready` re-attaches. */
function useRail(count: number, ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const cardW = () => {
    const card = ref.current?.querySelector<HTMLElement>('.spp-how-card, .sc-rc');
    if (!card) return 0;
    return card.offsetWidth + parseFloat(getComputedStyle(card).marginRight || '0');
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* The dots show progress along the rail: on a wide screen the last
       cards can never lead, so the far end lights the last dot. */
    const on = () => {
      const max = el.scrollWidth - el.clientWidth;
      setActive(max > 0 ? Math.round((el.scrollLeft / max) * (count - 1)) : 0);
    };
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [count, ready]);
  const go = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: ((el.scrollWidth - el.clientWidth) * i) / Math.max(1, count - 1), behavior: 'smooth' });
  };
  const step = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * cardW(), behavior: 'smooth' });
  return { ref, active, go, step };
}

function Nav({ cfg, onTalk }: { cfg: SponsorPageConfig; onTalk: () => void }) {
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
          <span className="sw-co-t">Prepared for {cfg.organizer.name}</span>
        </span>
        <button type="button" className="sw-nav-cta spp-btn-reset" onClick={onTalk}>Talk to us</button>
      </div>
    </div>
  );
}

function HowVisual({ c, confName }: { c: HowCard; confName: string }) {
  if (c.vis === 'logos') {
    return (
      <div className="spp-logos">
        {ABOUT_LOGOS.map((f) => <img key={f} src={markSrc(f)} alt={f === 'warner-bros' ? 'Warner Bros.' : f === 'pwc' ? 'PwC' : f === 'bcg' ? 'BCG' : f === 'nfl' ? 'NFL' : f === 'mtv' ? 'MTV' : f.charAt(0).toUpperCase() + f.slice(1)} />)}
      </div>
    );
  }
  if (c.vis === 'photo') {
    return (
      <>
        <img src={c.img} alt={c.cap} className="spp-photo-img" style={c.pos ? { objectPosition: c.pos } : undefined} />
        <span className="spp-chip">{c.cap}</span>
      </>
    );
  }
  if (c.vis === 'invoice') {
    /* The V2 proposal's pricing summary card. Illustrative numbers
       (Will, 2026-10-15). */
    return (
      <div className="spp-mock-wrap" style={{ background: c.fill }}>
        <div className="spp-invoice">
          <div className="spp-invoice-top"><span className="spp-invoice-t">Sponsorship summary</span><span className="spp-ex">Example</span></div>
          <p className="spp-invoice-s">Massage Wellness Zone</p>
          <div className="spp-invoice-row" style={{ fontWeight: 600 }}><span>Sponsorship</span><span>$50,000</span></div>
          <div className="spp-invoice-row" style={{ color: 'rgba(255,255,255,.78)' }}><span>Your cost</span><span style={{ color: '#fff' }}>&minus;$10,000</span></div>
          <div className="spp-invoice-tot"><span style={{ fontSize: 13, fontWeight: 700 }}>Your margin</span><b>$40,000</b></div>
        </div>
      </div>
    );
  }
  return (
    <div className="spp-mock-wrap" style={{ background: c.fill }}>
      <div className="spp-leads">
        <div className="spp-leads-top"><span>Your sponsor’s leads</span><span className="spp-leads-ex">Example</span></div>
        {DEMO_LEADS.map((l, i) => (
          <div key={l.ini} className="spp-lead">
            <span className="spp-lead-av" style={{ background: ['#9EFAFF', '#F7BBFF', '#C7CBFB'][i] }}>{l.ini}</span>
            <span className="spp-lead-n">{l.name}<span>{l.role} · {confName}</span></span>
            <span className="spp-lead-ok">Opted in</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SponsorOnePager() {
  const { slug = '' } = useParams<{ slug: string }>();
  const storageKey = `sponsor-pw-${slug}`;

  /* The page loads from sponsor_pages through a server check of the
     password, remembered for the tab so a refresh stays unlocked. */
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'missing' } | { kind: 'locked'; mark: string; logoUrl?: string } | { kind: 'page'; cfg: SponsorPageConfig }
  >({ kind: 'loading' });
  /* The password the page was unlocked with: the call sheet's server check
     asks for it too. */
  const [pw, setPw] = useState<string | undefined>();
  /* The call sheet, open with the pricing card's choices (or none). */
  const [call, setCall] = useState<{ rows: QuoteRows } | null>(null);

  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    let saved: string | undefined;
    try { saved = sessionStorage.getItem(storageKey) || undefined; } catch { saved = undefined; }
    setPw(saved);
    fetchPublicSponsorPage(slug, saved).then((res) => { if (live) setState(res); });
    return () => { live = false; };
  }, [slug, storageKey]);

  const unlock = async (password: string) => {
    const res = await fetchPublicSponsorPage(slug, password);
    if (res.kind !== 'page') return false;
    try { sessionStorage.setItem(storageKey, password); } catch { /* private window */ }
    setPw(password);
    setState(res);
    return true;
  };

  const cfg = state.kind === 'page' ? state.cfg : null;
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const gallery = useGalleryByKey();
  const how = useRail(HOW_CARDS.length, !!cfg);
  const menu = useRail(cfg?.services?.length ?? SPONSOR_SERVICES.length, !!cfg);

  const services = useMemo(
    () => (cfg?.services ? cfg.services.map(serviceById) : SPONSOR_SERVICES),
    [cfg]
  );

  /* In-page anchors glide, as on the website. */
  useEffect(() => {
    if (!cfg) return;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = prev; };
  }, [cfg]);

  if (state.kind === 'loading') {
    return <div className="min-h-screen bg-shortcut-blue" aria-busy="true" />;
  }

  if (state.kind === 'locked') {
    return <Gate mark={state.mark} logoUrl={state.logoUrl} onSubmit={unlock} />;
  }

  if (!cfg) {
    return (
      <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] flex items-center justify-center">
        <p className={`text-[16px] font-medium ${INK}`}>This page does not exist.</p>
      </div>
    );
  }

  const { organizer, conference: conf, contact } = cfg;
  const hero = cfg.heroPhoto ?? LOUNGE_RENDERING;
  const heroCaption = cfg.heroPhoto ? 'A lounge built in the sponsor’s brand' : RENDERING_CAPTION;
  const openCall = () => setCall({ rows: [] });

  return (
    <div className="sp sw-page spp">
      <Nav cfg={cfg} onTalk={openCall} />

      {/* ══════════ HERO ══════════ */}
      <Sec className="sw-sec--navy spp-hero" label="Hero">
        <div className="sw-wrap">
          <div className="spp-hero-top">
            <div className="spp-hero-copy">
              <h1 className="sw-h1 sw-in-rise sp-hero-h1 spp-hero-h1">
                Sell your sponsors a branded wellness lounge.<br /><span className="sp-aqua">You sell it. We run it.</span>
              </h1>
              <p className="sw-lead sw-in-rise spp-hero-lead">
                Add a powerful new sponsorship opportunity that delivers traffic for your sponsors and sells at a premium.
              </p>
              <div className="sw-in-rise sp-hero-ctas">
                <a className="sw-btn sw-btn--coral" href="#how-it-works">See how it works</a>
                <a className="sp-hero-talk" href="#gets">What you need to do</a>
              </div>
            </div>
            <div className="hb-pile" aria-label="Services">
              {PILLS.map((row, r) => (
                <div key={r} className="hb-pile-row">
                  {row.map((p) => (
                    <a key={p.label} href="#stations" className="hb-pill" style={{ background: p.fill, animationDelay: `${p.delay}s` }}>
                      <span className="hb-pill-in">{p.label}<Arrow /></span>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="hpm sw-in-rise">
            <div className="hpm-photo">
              <div className="hpm-photo-frame">
                <img src={hero.src} alt={hero.alt} className="spp-photo-img" />
                <span className="spp-photo-cap">{heroCaption}</span>
              </div>
            </div>

            {/* The booking an attendee makes, which is the sponsor's lead. */}
            <div className="hpm-book">
              <div className="hpm-book-card">
                <div className="hpm-book-hd">
                  <span className="spp-yourlogo">Sponsor logo</span>
                  <span className="hpm-book-sep" />
                  <span className="spp-book-conf">The wellness lounge at {conf.name}</span>
                </div>
                <div className="hpm-book-body">
                  <div className="hb-panel hb-p1">
                    <p className="hpm-bt">Pick your time</p>
                    <p className="spp-book-svc">Chair massage · 15 min</p>
                    <div className="hpm-slots">
                      {SLOTS.map((t) => <span key={t} className={`hpm-slot${t === '10:40' ? ' spp-slot-on' : ''}`}>{t}</span>)}
                    </div>
                    <span className="hpm-cta">Book 10:40 am</span>
                  </div>
                  <div className="hb-panel hb-p2">
                    <p className="hpm-bt">Your details</p>
                    <div className="spp-fields">
                      {DEMO_FIELDS.map(([k, v]) => (
                        <span key={k} className="spp-field"><span className="spp-field-k">{k}</span><span className="spp-field-v">{v}</span></span>
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
            </div>

            <div className="spp-conf">
              <p className="spp-conf-k">Where and when</p>
              <p className="spp-conf-t">{conf.name}<br />{conf.dateLabel}</p>
            </div>
          </div>
        </div>
      </Sec>

      {/* ══════════ HOW IT WORKS (a carousel, About Shortcut first) ══════════ */}
      <Sec id="how-it-works" className="sw-sec--lap spp-how" label="How it works">
        <div className="sw-wrap">
          <div className="sw-head sw-head--center">
            <p className="sw-kicker sw-in-fade">How it works</p>
            <h2 className="sw-h2 sw-in-rise">A new sponsorship,<br /><span className="sp-coral">ready to sell.</span></h2>
            <p className="sw-lead sw-in-rise sd-head-lead" style={{ maxWidth: 720 }}>
              Your sales team gets a premium sponsorship to sell. Your events team gets a partner that runs it with them, from start to finish.
            </p>
          </div>
        </div>
        <div className="sw-srail" ref={how.ref}>
          <ol className="sw-srail-track" style={{ margin: 0, listStyle: 'none' }}>
            {HOW_CARDS.map((c) => (
              <li key={c.k} className="spp-how-card">
                <div className="spp-how-vis"><HowVisual c={c} confName={conf.name} /></div>
                <div className="spp-how-txt">
                  <p className="spp-how-k">{c.k}</p>
                  <h3 className="spp-how-h">{c.title}</h3>
                  <p className="spp-how-p">{c.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="sw-wrap">
          <div className="spp-rail-nav">
            <button type="button" className="sw-snav" onClick={() => how.step(-1)} aria-label="Previous card"><Chevron dir={-1} /></button>
            <span className="spp-dots">
              {HOW_CARDS.map((c, i) => (
                <button key={c.k} type="button" className="spp-dot" aria-label={`Card ${i + 1}`} aria-current={how.active === i} onClick={() => how.go(i)} />
              ))}
            </span>
            <button type="button" className="sw-snav" onClick={() => how.step(1)} aria-label="Next card"><Chevron dir={1} /></button>
          </div>
        </div>
      </Sec>

      {/* ══════════ WHAT SETS SHORTCUT APART (the live bento) ══════════ */}
      <Sec id="how" className="sw-sec--lap sw-sec--surface spp-apart" label="What sets Shortcut apart">
        <div className="sw-wrap">
          <div className="sw-head sw-head--center">
            <p className="sw-kicker sw-in-fade">What sets Shortcut apart</p>
            <h2 className="sw-h2 sw-in-rise">Tech that runs every sign-up,<br /><span className="sp-coral">and a team that handles the rest.</span></h2>
          </div>
          <SponsorBento conferenceName={conf.name} dateLabel={conf.dateLabel} />
        </div>
      </Sec>

      {/* ══════════ SERVICES (the flip-card rail) ══════════ */}
      <Sec id="stations" className="sw-sec--lap spp-stations" label="Services">
        <div className="sw-wrap">
          <div className="spp-head-row">
            <div className="sw-head">
              <p className="sw-kicker sw-in-fade">Services</p>
              <h2 className="sw-h2 sw-in-rise">Build the lounge from<br /><span className="sp-coral">any of our services.</span></h2>
              <p className="sw-lead sw-in-rise">Sell it as one sponsorship, or sell each station to a different sponsor. Tap any service for the detail.</p>
            </div>
            <div className="spp-snav">
              <button type="button" className="sw-snav" onClick={() => menu.step(-1)} aria-label="Scroll left"><Chevron dir={-1} /></button>
              <button type="button" className="sw-snav" onClick={() => menu.step(1)} aria-label="Scroll right"><Chevron dir={1} /></button>
            </div>
          </div>
        </div>
        <div className="sw-srail" ref={menu.ref}>
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
                    <span className="sc-rc-bq">{s.body}</span>
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
                </span>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ══════════ PRICING (the holiday builder, priced like AACSB) ══════════ */}
      <Sec id="pricing" className="sw-sec--lap sw-sec--surface spp-pricing" label="Pricing">
        <div className="sw-wrap">
          <div className="sw-head sw-head--center" style={{ marginBottom: 56 }}>
            <p className="sw-kicker sw-in-fade">Pricing</p>
            <h2 className="sw-h2 sw-in-rise">See how pricing could work<br /><span className="sp-coral">in three steps.</span></h2>
          </div>
          <div className="sp-tw">
            <SponsorPricing hostFirst={contact.name.split(' ')[0]} onQuote={(rows) => setCall({ rows })} />
          </div>
        </div>
      </Sec>

      {/* ══════════ STEP BY STEP ══════════ */}
      <Sec id="gets" className="sw-sec--lap spp-steps" label="Step by step">
        <div className="sw-wrap">
          <div className="sw-head sw-head--center">
            <p className="sw-kicker sw-in-fade">Step by step</p>
            <h2 className="sw-h2 sw-in-rise">From the proposal<br /><span className="sp-coral">to the follow up.</span></h2>
          </div>
          <ol className="spp-step-list">
            {STEPS.map((st, i) => (
              <li key={st.title} className={`spp-step${st.dark ? ' spp-step--dark' : ''}`}>
                <div className="spp-step-top">
                  <span className="spp-step-n" style={{ background: st.fill }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="spp-step-k">{st.k}</span>
                </div>
                <h3 className="spp-step-h">{st.title}</h3>
                <p className="spp-step-p">{st.body}</p>
                <span className="spp-step-who">{st.who}</span>
              </li>
            ))}
          </ol>
          <div className="spp-brand">
            <div className="spp-brand-tile spp-brand-tile--main">
              <img src={BRAND_SHOTS.booking.img} alt={BRAND_SHOTS.booking.alt} loading="lazy" />
              <span className="spp-brand-cap">{BRAND_SHOTS.booking.cap}</span>
            </div>
            {BRAND_SHOTS.side.map((b) => (
              <div key={b.cap} className="spp-brand-tile">
                <img src={b.img} alt={b.alt} loading="lazy" />
                <span className="spp-brand-cap">{b.cap}</span>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ══════════ PROOF ══════════ */}
      <Sec id="proof" className="sw-sec--lap sw-sec--navy spp-proof" label="Proof">
        <div className="sw-wrap">
          <div className="sw-head">
            <p className="sw-kicker sw-in-fade">Proof</p>
            <h2 className="sw-h2 sw-in-rise">Workhuman Live 2026.<br /><span className="sp-aqua">A three-day HR conference.</span></h2>
            <p className="spp-proof-lead sw-in-rise">We ran the wellness zone with five massage chairs, fully booked all three days.</p>
          </div>
          <div className="spp-stats">
            {PROOF_STATS.map((s) => {
              const [n, suf] = splitFig(s.fig);
              return (
                <div key={s.label} className="spp-stat">
                  <span className="spp-stat-n">{n}<span className="sp-coral">{suf}</span></span>
                  <span className="spp-stat-l">{s.label}</span>
                </div>
              );
            })}
          </div>
          <div className="spp-gal">
            {PROOF_GALLERY.map((g) => (
              <div key={g.cap} className="spp-gal-tile">
                <img src={g.img} alt={g.cap} loading="lazy" />
                <span className="spp-gal-cap" style={{ background: g.tint }}>{g.cap}</span>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ══════════ TRADESTATION (a branded day, on video) ══════════ */}
      <Sec className="sw-sec--lap sw-sec--surface spp-reel" label="TradeStation">
        <div className="sw-wrap">
          <div className="sw-head sw-head--center" style={{ marginBottom: 56 }}>
            <p className="sw-kicker sw-in-fade">TradeStation</p>
            <h2 className="sw-h2 sw-in-rise">A branded event day,<br /><span className="sp-coral">start to finish.</span></h2>
            <p className="sw-lead sw-in-rise">Haircuts and styling under TradeStation’s own signage, run by our team.</p>
          </div>
          <div className="sp-tw"><SizzleReel /></div>
        </div>
      </Sec>

      {/* ══════════ NEXT STEPS + FOOTER ══════════ */}
      <Sec id="next" className="sw-sec--lap sp-next spp-next" label="Next steps">
        <div className="sw-wrap">
          <div className="spp-cta sw-in-rise">
            <p className="sp-cta-k">Next steps</p>
            <h2 className="sw-h2">Let’s chat about adding the lounge to {conf.name}</h2>
            <ol className="spp-cta-steps">
              {NEXT_STEPS.map((t, i) => (
                <li key={t} className="spp-cta-step"><span className="spp-cta-n">{i + 1}</span>{t}</li>
              ))}
            </ol>
            <button type="button" className="sw-btn sw-btn--navy" onClick={openCall}>
              Set up a call with {contact.name}
              <ArrowUpRight size={19} strokeWidth={2.5} />
            </button>
          </div>
          <div className="sw-footer-panel spp-foot">
            <div className="sp-foot-l">
              <img src="/conference/shortcut-logo-white.svg" alt="Shortcut" className="sp-foot-logo" />
              <span className="sp-foot-sep" />
              <span className="spp-foot-pill"><OrgMark mark={organizer.mark} logoUrl={organizer.logoUrl} /></span>
            </div>
            <p className="sp-foot-t">Prepared for {organizer.name}</p>
          </div>
        </div>
      </Sec>

      {/* Portalled out of the page root, so the page's element defaults
          never restyle the shared pop-out. */}
      {openIdx !== null && createPortal(
        <StationModal
          stations={services}
          index={openIdx}
          gallery={gallery}
          onClose={() => setOpenIdx(null)}
          onGo={setOpenIdx}
        />,
        document.body,
      )}

      {/* The call sheet is Tailwind-built, so it lives outside the page root
          too, where the website's element defaults can't reach it. */}
      {createPortal(
        <SponsorCallSheet
          open={!!call}
          onClose={() => setCall(null)}
          slug={slug}
          password={pw}
          host={contact}
          organizerName={organizer.name}
          conferenceName={conf.name}
          picked={call?.rows}
        />,
        document.body,
      )}
    </div>
  );
}
