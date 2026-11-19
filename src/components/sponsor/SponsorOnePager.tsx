import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { fetchPublicSponsorPage } from '../../services/sponsorPageService';
import type { SponsorPageConfig } from '../../types/sponsorPage';
import '../../styles/sponsor-page.css';
import StationModal, { useGalleryByKey } from './StationModal';
import SponsorBento from './SponsorBento';
import SponsorPricing, { type QuoteRows } from './SponsorPricing';
import SponsorCallSheet from './SponsorCallSheet';
import { Gate, PartnerMark } from './SponsorGate';
import {
  GUT, COL, INK, LOUNGE_RENDERING, Panel, SectionHead, HowRail, StationCard, SponsorHero, StepByStep,
  ProofPanel, TradeStationPanel, NextStepsPanel, type HowStep, type PathStep,
} from './sponsorUi';
import { SPONSOR_SERVICES, serviceById } from '../../utils/sponsorPackages';

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

   No prices. The organizer sets the sponsor's price and we quote our cost
   privately (Will, 2026-09-28). See sponsorPages.ts for who reads this.

   Layout, type tokens and section system are AACSBOnePager.tsx's, so the
   partner page and the sponsor-facing page that follows it look related.
   They live in sponsorUi.tsx, shared with the sponsor deck (SponsorDeck).

   Proof on this page, and where it is recorded:
     Workhuman Live 2026: five chairs, three days, 400 fifteen minute
       massages, waitlist never below 200  (CLAIMS_VERIFICATION.md §2,
       confirmed by Will 2026-09-07)
     400 x 15 minutes = 100 hours of attendee time  (arithmetic on the above)
     90%+ of slots booked across every event we run  (same file, §2)
   ───────────────────────────────────────────── */


/* How it works (Will, 2026-10-16): the Shortcut box from the page before
   the rebuild (its "Why it sells" first card, logos and copy as they were),
   then four steps whose titles tell the story on their own: we build it,
   you sell it, attendees book, the sponsor gets the leads. Each step has
   one short line under its title. */
const HOW_STEPS: HowStep[] = [
  {
    label: 'Shortcut', title: 'Trusted by 500+ companies.', visual: 'logos',
    body: 'One team for massage, headshots, beauty and group wellness across the US. We bring the Pros, the setup and the tech.',
  },
  {
    label: '01', title: 'A turnkey, white-labeled lounge', visual: 'photo',
    img: '/conference/tradestation/ts-event-51.jpg', cap: 'TradeStation \u00b7 Fresh Look activation', pos: 'bg-center',
    body: 'The lounge, signage, booking page, emails and uniforms all carry your sponsor\u2019s brand. We design and build all of it.',
  },
  {
    label: '02', title: 'You sell it and keep the margin', visual: 'invoice', tint: 'bg-[#9EFAFF]',
    body: 'You set the price. We bill you only after your sponsor signs.',
  },
  {
    label: '03', title: 'An activation attendees love', visual: 'photo',
    img: '/conference/onepager/wh/booth-3.jpeg', cap: 'Workhuman Live 2026', pos: 'bg-[center_35%]',
    body: 'A free massage, haircut or headshot between sessions, and nothing for your ops team to manage.',
  },
  {
    label: '04', title: 'Guaranteed traffic and leads', visual: 'leads', tint: 'bg-[#FEDC64]',
    body: 'A name, title, company and email for every visit.',
  },
];

/* What the sponsor gets: one attendee's visit, told in order, with the
   sponsor as the host at every step and the list as the payoff. Each card
   is the next beat of the same story; nothing goes in that isn't a beat.
   Rendered as the website's numbered step cards (shortcut/frontend/pages/
   solutions/conferences.vue, .sw-step). */
const PATH: PathStep[] = [
  { k: 'Before the show', who: 'You and Shortcut', title: 'A custom proposal.', fill: '#9EFAFF', ink: '#003756',
    body: 'We work with your sales team to design a package for your sponsors.' },
  { k: 'Before the show', who: 'You', title: 'Sold at your price.', fill: '#FEDC64', ink: '#003756',
    body: 'Your team offers it to sponsors. The sponsor sends us their logo and colors.' },
  { k: 'Before the show', who: 'You', title: 'In every invite.', fill: '#F7BBFF', ink: '#003756',
    body: 'The booking link goes into your conference emails and app.' },
  { k: 'Before the show', who: 'Shortcut', title: 'Booked and reminded.', fill: '#C7CBFB', ink: '#003756',
    body: 'Attendees pick their slot, and every confirmed appointment gets a custom reminder.' },
  { k: 'At the show', who: 'Shortcut and the sponsor', title: 'Welcomed.', fill: '#FF5050', ink: '#ffffff',
    body: 'A lounge in the sponsor’s colors, their team at the door, and a massage, blowout or headshot.' },
  { k: 'After the show', who: 'Shortcut', title: 'Followed up.', fill: '#003756', ink: '#ffffff',
    body: 'The sponsor gets every name. You get a results report.' },
];

/* Next steps: a call, and what we do for the organizer's team after it
   (Will, 2026-10-16: present to the team, design the program, hand over
   everything the sales team needs to sell it). */
const NEXT_STEPS = [
  'We present to your team',
  'We design the program with you',
  'Your sales team gets everything it needs to sell it',
];

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
  const authenticated = !!cfg;
  const [activeSection, setActiveSection] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [heroGo, setHeroGo] = useState(false);
  const gallery = useGalleryByKey();

  const services = useMemo(
    () => (cfg?.services ? cfg.services.map(serviceById) : SPONSOR_SERVICES),
    [cfg]
  );

  /* The pills wait for fonts (at most 0.7s, 1.2s on phones), like the
     holiday page's heroGo. */
  useEffect(() => {
    if (!authenticated) return;
    let done = false;
    const go = () => { if (!done) { done = true; setHeroGo(true); } };
    const t = window.setTimeout(go, window.innerWidth <= 767 ? 1200 : 700);
    document.fonts?.ready.then(() => window.setTimeout(go, 60)).catch(() => {});
    return () => window.clearTimeout(t);
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    const sections = document.querySelectorAll('[data-toc]');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: '-15% 0px -70% 0px' }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [authenticated]);

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
  const openCall = () => setCall({ rows: [] });

  const tocItems = [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'how', label: 'What sets us apart' },
    { id: 'stations', label: 'Services' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'gets', label: 'Step by step' },
    { id: 'proof', label: 'Proof' },
    { id: 'next', label: 'Next steps' },
  ];

  return (
    <div className="min-h-screen bg-neutral-light-gray font-['Outfit',system-ui,sans-serif]">

      {/* ── Sticky bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-shortcut-blue/[.06]">
        <div className={`${GUT} ${COL} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3 mdp:gap-4">
            <PartnerMark mark={organizer.mark} logoUrl={organizer.logoUrl} size="nav" />
            <div className="h-4 w-px bg-shortcut-blue/15" aria-hidden="true" />
            <img src="/shortcut-logo-blue.svg" alt="Shortcut" className="h-4 w-auto" />
          </div>
          <div className="hidden xlp:flex items-center gap-7">
            {tocItems.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`text-[13px] font-semibold tracking-[-.01em] transition-colors ${activeSection === t.id ? 'text-shortcut-blue' : 'text-shortcut-blue/40 hover:text-shortcut-blue/70'}`}
              >
                {t.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={openCall}
            className="h-9 inline-flex items-center px-4 rounded-full bg-shortcut-coral text-white text-[13.5px] font-bold"
          >
            Talk to us
          </button>
        </div>
      </nav>

      <main className="pt-14">

        {/* ══════════ HERO ══════════ */}
        <SponsorHero
          title="Sell your sponsors a branded wellness lounge."
          accent="You sell it. We run it."
          sub="Add a powerful new sponsorship opportunity that delivers traffic for your sponsors and sells at a premium."
          primary={{ label: 'See how it works', href: '#how-it-works' }}
          secondary={{ label: 'What you need to do', href: '#gets' }}
          confName={conf.name}
          dateLabel={conf.dateLabel}
          image={hero}
          caption="A lounge built in the sponsor’s brand"
          heroGo={heroGo}
        />

        {/* ══════════ HOW IT WORKS ══════════
            One section, talking to the sales team: the steps from the sale
            to the floor as a horizontal rail. */}
        <Panel id="how-it-works">
          <SectionHead
            kicker="How it works"
            title="A new sponsorship, ready to sell"
            sub="Your sales team gets a premium sponsorship to sell. Your events team gets a partner that runs it with them, from start to finish."
          />
          <HowRail steps={HOW_STEPS} confName={conf.name} />

        </Panel>

        {/* ══════════ WHAT SETS SHORTCUT APART (the website's bento) ══════════ */}
        <Panel id="how">
          <SponsorBento conferenceName={conf.name} dateLabel={conf.dateLabel} />
        </Panel>

        {/* ══════════ SERVICES ══════════
            Straight after the bento (Will, 2026-10-16). Selling stations to
            different sponsors is a revenue lever, so the sub says so. */}
        <Panel id="stations" tone="tint">
          <SectionHead
            kicker="Services"
            title="Build the lounge from any of our services"
            sub="Sell it as one sponsorship, or sell each station to a different sponsor. Tap any service for the detail."
          />
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 smp:grid-cols-2 xlp:grid-cols-4">
            {services.map((s, i) => <StationCard key={s.id} s={s} onOpen={() => setOpenIdx(i)} />)}
          </div>
        </Panel>

        {/* ══════════ PRICING ══════════
            The holiday builder, priced like the approved AACSB proposal. See
            SponsorPricing.tsx. Above the proof (Will, 2026-10-16). */}
        <Panel id="pricing">
          <SectionHead
            kicker="Pricing"
            title="See how pricing could work"
            accent="in three steps."
          />
          <SponsorPricing hostFirst={contact.name.split(' ')[0]} onQuote={(rows) => setCall({ rows })} />
        </Panel>

        {/* ══════════ STEP BY STEP (with who does each step) ══════════
            Verbatim from the live page (Will, 2026-10-16). It sits after
            Pricing: price it, then see what happens from there. */}
        <Panel id="gets" tone="tint">
          <SectionHead
            kicker="Step by step"
            title="From the proposal to the follow up."
          />
          <StepByStep steps={PATH} />
        </Panel>

        {/* ══════════ PROOF ══════════
            Exactly as it is on the live page (origin/main, #9), Will
            2026-10-16. The reel sits in its own TradeStation section below,
            as it does there. */}
        <ProofPanel />

        {/* ══════════ TRADESTATION (a branded day, on video) ══════════ */}
        <TradeStationPanel />

        {/* ══════════ NEXT STEPS ══════════
            A call to action: set up a call, then the three things we do
            for the organizer's team after it. */}
        <NextStepsPanel
          title={`Let’s chat about adding the lounge to ${conf.name}`}
          steps={NEXT_STEPS}
          cta={
            <button
              type="button"
              onClick={openCall}
              className="h-[52px] inline-flex items-center gap-2.5 px-8 rounded-full bg-shortcut-coral text-white text-[17px] font-bold tracking-[-.01em] shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform duration-500 hover:-translate-y-[3px]"
            >
              Set up a call with {contact.name}
              <ArrowUpRight size={19} strokeWidth={2.5} />
            </button>
          }
          footer={<>Prepared for {organizer.name}</>}
        />

      </main>

      {openIdx !== null && (
        <StationModal
          stations={services}
          index={openIdx}
          gallery={gallery}
          onClose={() => setOpenIdx(null)}
          onGo={setOpenIdx}
        />
      )}

      <SponsorCallSheet
        open={!!call}
        onClose={() => setCall(null)}
        slug={slug}
        password={pw}
        host={contact}
        organizerName={organizer.name}
        conferenceName={conf.name}
        picked={call?.rows}
      />
    </div>
  );
}
