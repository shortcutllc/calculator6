import { Fragment, useEffect, useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Download } from 'lucide-react';
import { fetchPublicSponsorDeck, fetchSponsorDeckPreview, deckUrl } from '../../services/sponsorPageService';
import type { SponsorDeckConfig } from '../../types/sponsorPage';
import '../../styles/sponsor-page.css';
import '../../styles/sponsor-deck.css';
import StationModal, { useGalleryByKey } from './StationModal';
import SponsorBento from './SponsorBento';
import { PartnerMark } from './SponsorGate';
import { ShortcutLockup } from './ShortcutLockup';
import {
  SponsorStatic, useSponsorStatic, CARD_SHELL, INK, INK_META, HERO_PILLS, LOUNGE_RENDERING,
  Panel, SectionHead, HowRail, StationCard, SponsorHero, StepByStep,
  ProofPanel, TradeStationPanel, NextStepsPanel, type HowStep, type PathStep,
} from './sponsorUi';
import { SPONSOR_SERVICES, type SponsorServiceId } from '../../utils/sponsorPackages';

/* ─────────────────────────────────────────────
   Sponsor deck: what the ORGANIZER sends their SPONSORS to sell the lounge,
   as a page and as a PDF. The partner page (/sponsor/:slug) sells the
   lounge to the organizer; this is the next step, once they have bought it.

   The reader is a sponsor's marketing or sales lead, who buys audience
   time, leads and recognition (sponsor_activation_positioning). The
   organizer is the seller, and Shortcut is named as the team that builds
   and runs the lounge. It never shows Shortcut's fee or the organizer's
   margin, and never links to the partner page, which does.

   Built from the partner page's own sections (sponsorUi.tsx), in its order:
   hero, what you get, who attends, the bento, the stations, step by step,
   the options, proof and the close. Section content follows Marc's GCUC
   Miami outline (2026-11-17), told the way the partner page tells it.

   "Download PDF" turns on static mode (sections shown, the rail as a grid,
   the reel as its poster) and prints. See src/styles/sponsor-deck.css.
   ───────────────────────────────────────────── */

/* Each station's line for a sponsor. The partner page's lines talk to the
   organizer, so the deck keeps its own, at the same length. */
const STATION_BODY: Record<SponsorServiceId, string> = {
  reset: 'Chair massage in a calm corner of your lounge, with privacy screens, scents and music.',
  glow: 'A pop-up salon and barbershop. Blowouts, cuts, beard trims and hot towel shaves.',
  polish: 'Express manicures, with no water and nothing for the venue to clean up.',
  studio: 'A photographer on site. Every guest gets a private gallery and a retouched favorite.',
  mindful: 'Guided mindfulness in the lounge, between sessions or on the main stage.',
  sound: 'A crystal sound bath: thirty minutes with eyes closed and screens off.',
  movement: 'Yoga, stretching or a strength class, with mats, music and setup included.',
};

/* What a guest books at each station, plural, for the hero line. */
const OFFER: Record<SponsorServiceId, string> = {
  reset: 'chair massages', glow: 'blowouts', polish: 'manicures', studio: 'headshots',
  mindful: 'guided resets', sound: 'sound baths', movement: 'classes',
};

/* Which hero pills belong to which station. */
const PILL_STATION: Record<string, SponsorServiceId> = {
  Massage: 'reset', Hair: 'glow', Beauty: 'glow', Meditation: 'mindful', Movement: 'movement', Headshots: 'studio',
};

/* The website's trust rail marks (TrustRail.vue): white SVGs from
   /ds-assets/logos, each 96px wide with its own height (shields taller,
   wordmarks shorter), the website's optical values. Teads and Forter are
   left out, as in CLIENT_LOGOS. The website's white Tripadvisor fills the
   owl's eyes white too, so they vanish into a disc; this card uses our
   color mark recolored for navy (owl white, eyes in the card's navy). */
const TRUST_MARKS: { slug: string; h: string; alt: string; src?: string }[] = [
  { slug: 'draftkings', h: 'h-[22px]', alt: 'DraftKings' },
  { slug: 'bcg', h: 'h-[15px]', alt: 'BCG' },
  { slug: 'nfl', h: 'h-[26px]', alt: 'NFL' },
  { slug: 'paramount', h: 'h-[24px]', alt: 'Paramount' },
  { slug: 'mtv', h: 'h-[22px]', alt: 'MTV' },
  { slug: 'warner-bros', h: 'h-[26px]', alt: 'Warner Bros.' },
  { slug: 'white-case', h: 'h-[10px]', alt: 'White & Case' },
  { slug: 'pwc', h: 'h-[26px]', alt: 'PwC' },
  { slug: 'tripadvisor', h: 'h-[26px]', alt: 'Tripadvisor', src: '/conference/onepager/logos/tripadvisor-on-navy.svg' },
  { slug: 'wix', h: 'h-[18px]', alt: 'Wix' },
];

const list = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/* PDF mode: one 1440 x 1114 page per section (letter landscape
   proportions). Keep in step with @page in sponsor-deck.css. */
const PAGE_H = 1114;

/** Fits every section to one page: scales it (CSS zoom, at most 1.12) until
 *  its content fits PAGE_H, then sets its height so its background fills the
 *  page. Zoom changes the layout width, so it settles over a few passes. */
function fitPages() {
  document.querySelectorAll<HTMLElement>('.sd-page main > section, .sd-page main > .sd-cover').forEach((page) => {
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
  document.querySelectorAll<HTMLElement>('.sd-page main > section, .sd-page main > .sd-cover').forEach((page) => {
    page.style.zoom = '';
    page.style.height = '';
  });
}

/** The PDF's cover: the partner page's top bar over the hero. On screen the
 *  hero renders on its own and the sticky bar does the job. */
function Cover({ on, mark, logoUrl, children }: { on: boolean; mark: string; logoUrl?: string; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <div className="sd-cover">
      <div className="flex h-14 flex-none items-center gap-4 bg-white px-[100px]">
        <PartnerMark mark={mark} logoUrl={logoUrl} size="nav" />
        <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
        <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
      </div>
      {children}
    </div>
  );
}

function Deck({ cfg, onDownload }: { cfg: SponsorDeckConfig; onDownload: () => void }) {
  const d = cfg.deck;
  const { organizer, conference: conf } = cfg;
  const org = organizer.name;
  /* Every station Shortcut offers (Will, 2026-11-19). The partner page's own
     station list was the pitch to the organizer; a sponsor chooses from the
     whole menu. */
  const services = SPONSOR_SERVICES;
  const ids = services.map((s) => s.id);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [heroGo, setHeroGo] = useState(false);
  const gallery = useGalleryByKey();
  const isStatic = useSponsorStatic();

  /* The pills wait for fonts, as on the partner page. */
  useEffect(() => {
    let done = false;
    const go = () => { if (!done) { done = true; setHeroGo(true); } };
    const t = window.setTimeout(go, window.innerWidth <= 767 ? 1200 : 700);
    document.fonts?.ready.then(() => window.setTimeout(go, 60)).catch(() => {});
    return () => window.clearTimeout(t);
  }, []);

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

  const pills = HERO_PILLS.map((row) => row.filter((p) => ids.includes(PILL_STATION[p.label]))).filter((row) => row.length);

  const howSteps: HowStep[] = [
    {
      label: '01', title: 'A lounge in your brand', visual: 'photo',
      img: '/conference/tradestation/ts-event-51.jpg', cap: 'TradeStation · Fresh Look activation', pos: 'bg-center',
      body: 'The lounge, signage, booking page, emails and uniforms all carry your brand. Shortcut designs and builds all of it.',
    },
    {
      label: '02', title: 'An invite to every attendee', visual: 'invite', tint: 'bg-[#9EFAFF]',
      body: `${org} sends your booking link to every attendee, and guests book a time before the show.`,
    },
    {
      label: '03', title: 'An activation attendees love', visual: 'photo',
      img: '/conference/onepager/wh/booth-3.jpeg', cap: 'Workhuman Live 2026', pos: 'bg-[center_35%]',
      body: 'A free massage, haircut or headshot between sessions, with your team welcoming every guest.',
    },
    {
      label: '04', title: 'A lead for every visit', visual: 'leads', tint: 'bg-[#FEDC64]',
      body: 'A name, title, company and email for every booking.',
    },
  ];

  const path: PathStep[] = [
    { k: 'Before the show', who: `You and ${org}`, title: 'Your sponsorship.', fill: '#9EFAFF', ink: '#003756',
      body: 'Choose your sponsorship, then send your logo, colors and lead questions.' },
    { k: 'Before the show', who: 'Shortcut', title: 'Built in your brand.', fill: '#FEDC64', ink: '#003756',
      body: 'Shortcut designs the lounge, signage, booking page, emails and uniforms.' },
    { k: 'Before the show', who: org, title: 'In every invite.', fill: '#F7BBFF', ink: '#003756',
      body: 'The booking link goes into the conference emails and app.' },
    { k: 'Before the show', who: 'Shortcut', title: 'Booked and reminded.', fill: '#C7CBFB', ink: '#003756',
      body: 'Attendees pick their slot, and every booking gets a reminder in your brand.' },
    { k: 'At the show', who: 'You and Shortcut', title: 'Welcomed.', fill: '#FF5050', ink: '#ffffff',
      body: 'Your team greets every guest, and Shortcut’s licensed Pros give every service.' },
    { k: 'After the show', who: 'Shortcut', title: 'Followed up.', fill: '#003756', ink: '#ffffff',
      body: 'You get every name and a results report.' },
  ];

  const tiers = [
    {
      id: 'title' as const, label: 'Title sponsor', navy: true,
      title: 'The whole lounge in your name',
      lines: ['Naming rights on the lounge and its signage', 'Every station, every day of the show', 'Every lead, plus a results report'],
      available: d.tiers?.title?.available ?? '1 available', price: d.tiers?.title?.price,
    },
    ...(services.length > 1 ? [{
      id: 'station' as const, label: 'Station sponsor', navy: false,
      title: 'One station in your brand',
      lines: ['One station with your signage and uniforms', 'Your own booking page for that station', 'The leads from every booking there'],
      available: d.tiers?.station?.available ?? `Up to ${services.length}`, price: d.tiers?.station?.price,
    }] : []),
    ...(ids.includes('mindful') ? [{
      id: 'mindful' as const, label: 'Mindful Reset sponsor', navy: false,
      title: 'A guided reset in your name',
      lines: ['A guided session on the main stage or between sessions', 'Your name in the agenda and event app', 'A thank you from the stage'],
      available: d.tiers?.mindful?.available ?? '1 available', price: d.tiers?.mindful?.price,
    }] : []),
  ];

  const contact = d.salesContact;

  return (
    <main className="pt-14">

      {/* ══════════ HERO ══════════
          In PDF mode the hero is the cover, under the partner page's top bar
          (the sticky bar itself is screen only). */}
      <Cover on={isStatic} mark={organizer.mark} logoUrl={organizer.logoUrl}>
      <SponsorHero
        title={`Host the wellness lounge at ${conf.name}.`}
        accent="Every visit is a lead."
        sub={`Give every attendee a reason to visit you: free ${list((['reset', 'glow', 'studio'] as const).map((id) => OFFER[id]))} in a lounge built in your brand, run by Shortcut.`}
        primary={{ label: 'See what you get', href: '#how-it-works' }}
        secondary={{ label: 'Sponsorship options', href: '#options' }}
        confName={conf.name}
        dateLabel={[conf.dateLabel, d.venue].filter(Boolean).join(' · ')}
        image={LOUNGE_RENDERING}
        caption="A lounge built in one sponsor’s brand"
        heroGo={heroGo}
        pills={pills}
      />
      </Cover>

      {/* ══════════ WHAT YOU GET ══════════ */}
      <Panel id="how-it-works">
        <SectionHead
          kicker="What you get"
          title="A lounge that brings attendees to you"
          sub="Your brand on the lounge, an invite to every attendee and a lead for every visit, with nothing for your team to run."
        />
        <HowRail steps={howSteps} confName={conf.name} leadsTitle="Your leads" />
      </Panel>

      {/* ══════════ WHO ATTENDS (only with the conference's own facts) ══════════
          The website's conference page split (solutions/conferences.vue,
          .sw-conf-split): the yellow "what's included" card with navy tick
          discs for who attends, and a white card for the conference's own
          figures, set as rows with their source, so they never read as
          Shortcut's stat cards in Proof. */}
      {(d.audience?.length || d.stats?.length) ? (
        <Panel id="audience" tone="tint">
          <SectionHead kicker="Who attends" title={`Who you will meet at ${conf.name}`} sub={d.about} />
          <div className={`grid grid-cols-1 gap-5 ${d.audience?.length && d.stats?.length ? 'lgp:grid-cols-[5fr_7fr]' : ''}`}>
            {d.audience?.length ? (
              <div className="flex flex-col rounded-[28px] bg-[#FEDC64] p-8 mdp:p-9">
                <h3 className="m-0 text-[22px] font-bold leading-[1.2] tracking-[-.022em] text-shortcut-blue">Attendees include</h3>
                <ul className={`m-0 mt-6 p-0 list-none grid grid-cols-1 gap-x-8 gap-y-3.5 ${d.stats?.length ? '' : 'mdp:grid-cols-2'}`}>
                  {d.audience.map((a) => (
                    <li key={a} className="flex items-start gap-3 text-[16px] mdp:text-[17px] font-semibold leading-[1.4] text-shortcut-blue">
                      <span className="mt-[2px] grid h-[20px] w-[20px] flex-none place-items-center rounded-full bg-shortcut-blue text-white" aria-hidden="true">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {d.stats?.length ? (
              <div className={`${CARD_SHELL} flex flex-col px-8 mdp:px-9 pt-8 mdp:pt-9 pb-7`}>
                <h3 className="m-0 text-[22px] font-bold leading-[1.2] tracking-[-.022em] text-shortcut-blue">By the numbers</h3>
                {/* One grid, so every label starts in the same column, just
                    past the widest figure. */}
                <dl className="m-0 mt-2 flex-1 grid grid-cols-1 smp:grid-cols-[auto_1fr] content-center [&>*]:border-[#E2E9E8] smp:[&>*]:border-b smp:[&>*:nth-last-child(-n+2)]:border-b-0">
                  {d.stats.map((st) => (
                    <Fragment key={st.label}>
                      <dt className="pt-4 smp:py-4 text-[44px] mdp:text-[52px] font-extrabold leading-[1] tracking-[-.045em] text-shortcut-blue tabular-nums">{st.fig}</dt>
                      <dd className="m-0 pb-4 smp:py-4 smp:pl-7 smp:self-stretch smp:flex smp:items-center text-[16px] mdp:text-[17px] font-semibold leading-[1.3] text-shortcut-blue border-b smp:border-b last:border-b-0">{st.label}</dd>
                    </Fragment>
                  ))}
                </dl>
                {d.statsSource && (
                  <p className={`m-0 mt-2 pt-5 border-t border-[#E2E9E8] text-[13.5px] font-semibold leading-[1.45] ${INK_META}`}>Source: {d.statsSource}</p>
                )}
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {/* ══════════ ABOUT SHORTCUT ══════════
          Who runs the lounge, for a sponsor who may never have heard of
          Shortcut. The website's home proof row (HomeProblemProof.vue): a
          photo card and a navy card, 5fr to 7fr, both 28px radius. The navy
          card carries the line, a link to the website, and the website's
          trust rail (TrustRail.vue: "Trusted by 500+", its white marks at its
          own sizes). No figures beyond the 500: the event receipts are in
          Proof, so none appears twice on the page. */}
      <Panel id="about">
        <div className="grid grid-cols-1 gap-4 mdp:gap-5 lgp:grid-cols-[5fr_7fr]">
          <div className="relative min-h-[300px] mdp:min-h-[420px] overflow-hidden rounded-[28px] bg-[#E2E9E8]">
            <img
              src="/ds-assets/gallery/cencora-massage-poster.webp"
              alt="A Shortcut therapist giving a chair massage in a client's office"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
            />
            <span className="absolute left-4 bottom-4 inline-flex h-[30px] items-center rounded-full bg-white/[.92] px-3 text-[12.5px] font-extrabold text-shortcut-blue">
              Chair massage at the office
            </span>
          </div>
          <div className="flex flex-col rounded-[28px] bg-shortcut-blue px-6 py-8 smp:px-9 smp:py-10 mdp:px-12 mdp:py-12">
            <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-shortcut-teal">About Shortcut</p>
            <h2 className="m-0 mt-4 text-[24px] smp:text-[30px] mdp:text-[40px] font-bold leading-[1.08] tracking-[-.035em] text-white text-balance">
              {/* The logo in place of the word, set as a word: its wordmark
                  has Outfit Bold's proportions (x-height 103.2 of 192 units,
                  against the heading's .486em), so at .904em tall and dropped
                  .0956em its letters share the line's x-height and baseline.
                  "by" and the logo stay together when the line wraps. */}
              Powered <span className="whitespace-nowrap">by <ShortcutLockup className="inline-block h-[.904em] w-[5.472em] align-[-.0956em]" /></span>
              <span className="block mt-1 text-shortcut-coral">the premier corporate wellness services company in the US.</span>
            </h2>
            <a
              href="https://www.getshortcut.co"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 self-start h-12 inline-flex items-center gap-2 px-6 rounded-full bg-white text-shortcut-blue text-[15px] font-bold tracking-[-.01em] transition-transform duration-300 hover:-translate-y-[2px]"
            >
              Learn more about Shortcut
              <ArrowUpRight size={17} strokeWidth={2.5} />
            </a>
            <div className="mt-auto pt-10">
              <div className="border-t border-white/15 pt-8">
                <p className="m-0 text-[17px] mdp:text-[18px] font-extrabold tracking-[-.02em] text-white">
                  Trusted by 500<span className="text-shortcut-coral">+</span> companies
                </p>
                <ul className="m-0 mt-6 p-0 list-none grid grid-cols-2 smp:grid-cols-5 items-center gap-x-4 gap-y-6">
                  {TRUST_MARKS.map((m) => (
                    <li key={m.slug} className="flex h-8 items-center justify-center">
                      <img src={m.src ?? `/ds-assets/logos/${m.slug}-white.svg`} alt={m.alt} className={`${m.h} w-[96px] object-contain`} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* ══════════ WHAT SETS SHORTCUT APART (the website's bento) ══════════ */}
      <Panel id="how" tone="tint">
        <SponsorBento conferenceName={conf.name} dateLabel={conf.dateLabel} audience="sponsor" />
      </Panel>

      {/* ══════════ SERVICES ══════════ */}
      <Panel id="stations">
        <SectionHead
          kicker="Services"
          title="The stations in your lounge"
          sub={`Choose the stations that fit your brand.${isStatic ? '' : ' Tap any station for the detail.'}`}
        />
        <div className="grid grid-cols-1 gap-x-5 gap-y-10 smp:grid-cols-2 xlp:grid-cols-4">
          {services.map((s, i) => <StationCard key={s.id} s={s} body={STATION_BODY[s.id]} onOpen={() => setOpenIdx(i)} />)}
        </div>
      </Panel>

      {/* ══════════ STEP BY STEP ══════════ */}
      <Panel id="gets" tone="tint">
        <SectionHead kicker="Step by step" title="From signing to your lead list." />
        <StepByStep steps={path} />
      </Panel>

      {/* ══════════ SPONSORSHIP OPTIONS ══════════
          The title card is navy like the V2 proposal's pricing summary; the
          others are the rail's white cards. Prices are the organizer's, and
          show only when they are set (the deck's details on the Sponsor Pages tab). */}
      <Panel id="options">
        <SectionHead
          kicker="Sponsorship options"
          title="Ways to sponsor the lounge"
          sub={tiers.length > 1 ? `${org} offers the lounge as one title sponsorship, or station by station.` : undefined}
        />
        <ul className={`m-0 p-0 list-none grid grid-cols-1 gap-5 ${tiers.length >= 3 ? 'lgp:grid-cols-3' : tiers.length === 2 ? 'mdp:grid-cols-2' : 'max-w-[480px] mx-auto'}`}>
          {tiers.map((t) => (
            <li key={t.id} className={`flex flex-col px-7 pt-7 pb-8 ${t.navy ? 'rounded-[28px] bg-shortcut-blue shadow-[0_20px_50px_rgba(3,34,50,.28)]' : CARD_SHELL}`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${t.navy ? 'text-shortcut-teal' : INK_META}`}>{t.label}</p>
                <span className={`h-6 inline-flex items-center px-2.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-[.06em] ${t.navy ? 'bg-white/[.12] text-white' : 'bg-[#EEF2F1] text-[#45596A]'}`}>
                  {t.available}
                </span>
              </div>
              <h3 className={`m-0 mt-3 text-[23px] font-bold leading-[1.15] tracking-[-.025em] ${t.navy ? 'text-white' : 'text-shortcut-blue'}`}>{t.title}</h3>
              <ul className="m-0 mt-5 p-0 list-none flex flex-col gap-3">
                {t.lines.map((l) => (
                  <li key={l} className={`flex items-start gap-2.5 text-[15.5px] font-medium leading-[1.45] ${t.navy ? 'text-white/85' : INK}`}>
                    <svg className="mt-[3px] flex-none" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={t.navy ? '#9EFAFF' : '#018EA2'} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {l}
                  </li>
                ))}
              </ul>
              {t.price && (
                <div className={`mt-auto pt-6 flex items-baseline justify-between gap-3`}>
                  <span className={`text-[14px] font-bold ${t.navy ? 'text-white' : 'text-shortcut-blue'}`}>Investment</span>
                  <span className={`text-[28px] font-extrabold leading-none tracking-[-.02em] tabular-nums ${t.navy ? 'text-shortcut-teal' : 'text-shortcut-blue'}`}>{t.price}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        {tiers.length > 1 && (
          <p className={`m-0 mt-6 text-center text-[14px] font-medium ${INK_META}`}>
            The title sponsorship includes every station. Station sponsorships are offered when the lounge is sold by station.
          </p>
        )}
      </Panel>

      {/* ══════════ PROOF and the TradeStation reel, as on the partner page ══════════ */}
      {/* The heading and figures carry "three days", "100% booked" and the
          waitlist, so the line says only what they don't. */}
      <ProofPanel sub="Shortcut ran the wellness zone with five massage chairs." />
      <TradeStationPanel sub="Haircuts and styling under TradeStation’s own signage, run by Shortcut." />

      {/* ══════════ NEXT STEPS ══════════ */}
      <NextStepsPanel
        title={`Reserve the wellness lounge at ${conf.name}`}
        steps={[`Tell ${org} your goals for the show`, 'Choose your sponsorship and stations', 'Send your logo and colors, and Shortcut builds the rest']}
        cta={
          <div className="flex flex-col items-center gap-4 smp:flex-row">
            {contact?.email ? (
              <a
                href={`mailto:${contact.email}?subject=${encodeURIComponent(`The wellness lounge at ${conf.name}`)}`}
                className="h-[52px] inline-flex items-center gap-2.5 px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
              >
                Email {contact.name}
                <ArrowUpRight size={19} strokeWidth={2.5} />
              </a>
            ) : (
              <p className="m-0 text-[17px] font-bold text-white">To reserve, contact the {org} partnerships team.</p>
            )}
            {/* The deck as a PDF, to forward or print. Not on phones, where
                printing a desktop layout doesn't work well. */}
            <button
              type="button"
              data-pdf-hide
              onClick={onDownload}
              className="hidden smp:inline-flex h-[52px] items-center gap-2 px-7 rounded-full border border-white/30 text-white text-[16px] font-bold hover:bg-white/10 transition-colors"
            >
              <Download size={17} strokeWidth={2.5} />
              Download the PDF
            </button>
          </div>
        }
        footer={<>{conf.name} sponsorship opportunity · Produced with Shortcut</>}
      />

      {openIdx !== null && (
        <StationModal
          stations={services}
          index={openIdx}
          gallery={gallery}
          onClose={() => setOpenIdx(null)}
          onGo={setOpenIdx}
        />
      )}
    </main>
  );
}

/* Two ways in, one page:
     /lounge/:token        the deck's own link, for the organizer to send to
                           its sponsors. Public, through get_sponsor_deck.
     /sponsor/:slug/deck   staff preview (signed in), before or after the
                           link exists. Never send this one: its address
                           leads back to the partner page. */
export default function SponsorDeck() {
  const { token, slug } = useParams<{ token?: string; slug?: string }>();
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'missing' } | { kind: 'deck'; cfg: SponsorDeckConfig; preview?: { deckToken: string | null } }
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
    } else if (slug) {
      fetchSponsorDeckPreview(slug).then((res) => {
        if (!live) return;
        setState(res ? { kind: 'deck', cfg: res.cfg, preview: { deckToken: res.deckToken } } : { kind: 'missing' });
      });
    } else {
      setState({ kind: 'missing' });
    }
    return () => { live = false; };
  }, [token, slug]);

  const cfg = state.kind === 'deck' ? state.cfg : null;
  const preview = state.kind === 'deck' ? state.preview : undefined;

  /* The PDF's file name comes from the page title. */
  useEffect(() => {
    if (!cfg) return;
    const before = document.title;
    document.title = `The Wellness Lounge at ${cfg.conference.name}`;
    return () => { document.title = before; };
  }, [cfg]);

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
        <p className={`text-[16px] font-medium ${INK}`}>This page does not exist.</p>
      </div>
    );
  }

  const toc = [
    { id: 'how-it-works', label: 'What you get' },
    ...(cfg.deck.audience?.length || cfg.deck.stats?.length ? [{ id: 'audience', label: 'Who attends' }] : []),
    { id: 'about', label: 'About Shortcut' },
    { id: 'stations', label: 'Services' },
    { id: 'gets', label: 'Step by step' },
    { id: 'options', label: 'Options' },
    { id: 'proof', label: 'Proof' },
  ];

  return (
    <SponsorStatic.Provider value={isStatic}>
      <div className={`sd-page min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif] ${isStatic ? 'sp-static' : ''}`}>
        <nav data-print-hide className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
          <div className="px-6 mdp:px-10 lgp:px-[100px] w-full max-w-[1720px] mx-auto h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 mdp:gap-4">
              <PartnerMark mark={cfg.organizer.mark} logoUrl={cfg.organizer.logoUrl} size="nav" />
              <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
              <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
            </div>
            <div className="hidden xlp:flex items-center gap-7">
              {toc.map((t) => (
                <a key={t.id} href={`#${t.id}`} className="text-[13px] font-semibold tracking-[-.01em] text-shortcut-blue/40 hover:text-shortcut-blue/70 transition-colors">
                  {t.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadPdf}
                className="h-9 hidden smp:inline-flex items-center gap-1.5 px-4 rounded-full border border-shortcut-blue/15 text-shortcut-blue text-[13.5px] font-bold hover:bg-shortcut-blue/[.04] transition-colors"
              >
                <Download size={14} strokeWidth={2.5} />
                Download PDF
              </button>
              <a href="#next" className="h-9 inline-flex items-center px-4 rounded-full bg-shortcut-coral text-white text-[13.5px] font-bold">
                Reserve
              </a>
            </div>
          </div>
        </nav>
        {preview && (
          /* Staff preview: say so, and hand over the link to send. */
          <div data-print-hide className="fixed left-0 right-0 top-14 z-40 bg-[#FEDC64] text-shortcut-blue">
            <div className="px-6 mdp:px-10 lgp:px-[100px] w-full max-w-[1720px] mx-auto min-h-10 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] font-semibold">
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
        <Deck cfg={cfg} onDownload={downloadPdf} />
      </div>
    </SponsorStatic.Provider>
  );
}
