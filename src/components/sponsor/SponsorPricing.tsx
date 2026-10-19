import { useMemo, useRef, useState } from 'react';
import { serviceById, money, type SponsorServiceId } from '../../utils/sponsorPackages';
import '../../styles/proposal-refresh.css';

/* ─────────────────────────────────────────────
   "See how pricing could work": the conference partner page's pricing
   builder. Steps: pick a package, pick your days, make it yours (Will,
   2026-10-16: package first). It is a SAMPLE and never defines our costs:
   the fee reads as an estimate, and add-ons show no price.

   LAYOUT is the getshortcut.co holiday builder (shortcut repo,
   frontend/components/HolidayDesktop.vue, the "Packages" section): the
   three-step rail with navy arrows, the yellow banner where the holiday page
   has its offer, numbered steps of navy/white tiles, package cards with a
   strip of service art, one V2 proposal service card per service (the
   `pv-svc` classes in proposal-refresh.css, from ServiceCardRefresh.tsx), and
   the sticky navy summary with the total in aqua. Like the holiday builder
   it STARTS EMPTY (Will, 2026-10-16) and fills in as the organizer picks.

   PRICING is the approved AACSB proposal's structure (Supabase f6c806c6):
   a fixed team per service, and per-day options that change how long the
   station stays open, picked on the V2 card's options band. Rates (Will,
   2026-10-16: publish them on every organizer page):
     appointments   $165 per Pro per hour, the sponsor activation rate AACSB
                    was quoted (SPONSOR_HOURLY_RATE)
     headshots      $450 per hour plus $25 per retouched photo (Will)
     group sessions flat per session, from the proposal engine:
                    mindfulness and sound bath $1,250, chair yoga $650.
                    Mindfulness's shorter conference formats (openings,
                    resets, the Mindful Thread) are priced at the 30 minute
                    session rate; the engine has nothing shorter.
     add-ons        no price on the page (Will, 2026-10-19); they are picked
                    here and priced in the written quote
   The banner's sale is real and anonymised (Will, 2026-10-15): two days of
   the Massage Wellness Zone at 64 a day with screens and greenery, $6,830
   from us, sold to the sponsor for $35,000.
   ───────────────────────────────────────────── */

const APPT_RATE = 165;
const HEADSHOT_RATE = 450;
const RETOUCH = 25;

type Kind = 'appt' | 'headshot' | 'group';
interface BuilderService {
  id: SponsorServiceId;
  /** As it reads on a line: "Chair massage". */
  label: string;
  kind: Kind;
  pros?: number;
  proNoun?: string;
  minutes: number;
  perSession?: number;
  /** Group services: how long a session runs, when it isn't one length. */
  lengthLabel?: string;
  /** Group services: what 1, 2 or 3 sessions a day look like. */
  sessionDetails?: string[];
}

const SERVICES: BuilderService[] = [
  { id: 'reset', label: 'Chair massage', kind: 'appt', pros: 4, proNoun: 'Massage Pros', minutes: 15 },
  { id: 'glow', label: 'Hair, shaves and makeup', kind: 'appt', pros: 2, proNoun: 'stylists and barbers', minutes: 30 },
  { id: 'polish', label: 'Manicures', kind: 'appt', pros: 2, proNoun: 'Nail Pros', minutes: 30 },
  { id: 'studio', label: 'Headshots', kind: 'headshot', pros: 1, proNoun: 'photographer', minutes: 10 },
  { id: 'mindful', label: 'Mindfulness', kind: 'group', minutes: 30, perSession: 1250, lengthLabel: 'up to 30 min',
    sessionDetails: ['A Mindful Opening or a Mindful Reset', 'Open the day and reset after lunch', 'A Mindful Thread across the day'] },
  { id: 'sound', label: 'Sound bath', kind: 'group', minutes: 30, perSession: 1250 },
  { id: 'movement', label: 'Chair yoga', kind: 'group', minutes: 30, perSession: 650 },
];
const svc = (id: SponsorServiceId) => SERVICES.find((s) => s.id === id)!;

interface DayOption { name: string; perDay: number; apptsPerDay: number | null; detail: string }

/** The options band for one service: open 4, 5 or 6 hours a day, or run 1,
 *  2 or 3 group sessions a day. */
function optionsFor(s: BuilderService): DayOption[] {
  if (s.kind === 'group') {
    return [1, 2, 3].map((n) => ({
      name: `${n} session${n > 1 ? 's' : ''} a day`,
      perDay: n * (s.perSession || 0),
      apptsPerDay: null,
      detail: s.sessionDetails?.[n - 1] ?? `${s.minutes} min each · everyone joins`,
    }));
  }
  return [4, 5, 6].map((h) => {
    const appts = Math.floor((s.pros || 1) * h * (60 / s.minutes));
    const perDay = s.kind === 'headshot' ? h * HEADSHOT_RATE + appts * RETOUCH : (s.pros || 1) * h * APPT_RATE;
    return { name: `${h} hours a day`, perDay, apptsPerDay: appts, detail: `${s.minutes} min each · ${s.pros} ${s.proNoun}` };
  });
}

interface Pack { id: string; name: string; inside: string; services: SponsorServiceId[]; optIn?: boolean }
const PACKS: Pack[] = [
  { id: 'massage', name: 'Massage Wellness Zone', inside: 'Chair massage', services: ['reset'] },
  { id: 'mindful', name: 'Mindfulness', inside: 'Guided mindfulness', services: ['mindful'] },
  { id: 'headshots', name: 'Headshots', inside: 'Headshot studio', services: ['studio'] },
  { id: 'glam', name: 'Beauty and Glam', inside: 'Hair, shaves and makeup + Manicures', services: ['glow', 'polish'] },
  { id: 'custom', name: 'Build your own', inside: 'Any mix of our services', services: SERVICES.map((s) => s.id), optIn: true },
];

/* Add-ons, as plain categories with no prices (Will, 2026-10-19). The
   organizer picks them, they go into the quote request, and the fee
   excludes them. */
const ADD_ONS = [
  { id: 'signage', name: 'Custom signage' },
  { id: 'screens', name: 'Privacy screens' },
  { id: 'chairs', name: 'Salon chairs' },
  { id: 'gifts', name: 'Custom gifts' },
  { id: 'uniforms', name: 'Branded uniforms' },
  { id: 'counter', name: 'Welcome counter' },
];

const PRICE_POINTS = [25000, 35000, 50000];

const WHAT_THEY_GET = [
  'A white-labeled lounge and booking page',
  'An invitation to every attendee',
  'Every booking as a lead',
  'A results report after the show',
];

const RAIL_FILLS = ['bg-[#9EFAFF]', 'bg-[#FEDC64]', 'bg-[#F7BBFF]'];
const DAY_DOTS = ['bg-[#9EFAFF]', 'bg-[#FEDC64]', 'bg-[#F7BBFF]'];

const TILE = 'h-[88px] rounded-[20px] border-2 flex flex-col items-start justify-center gap-1 px-6 text-left transition-[border-color,box-shadow] duration-150';
const TILE_ON = 'bg-[#003756] border-[#003756] text-white shadow-[0_10px_24px_rgba(3,34,50,.18)]';
const TILE_OFF = 'bg-white border-[#E2E9E8] text-[#003756] hover:border-[#003756]/30';
const META = 'text-[#45596A]';

function Check({ stroke = '#003756', size = 12 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepHead({ n, title, dot }: { n: number; title: string; dot: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className={`grid h-[34px] w-[34px] flex-none place-items-center rounded-full text-[15px] font-extrabold text-[#003756] ${dot}`}>{n}</span>
      <h3 className="m-0 text-[24px] font-bold leading-[1.15] tracking-[-.025em] text-[#003756]">{title}</h3>
    </div>
  );
}

export default function SponsorPricing({ confName, contactEmail }: { confName: string; contactEmail: string }) {
  const [days, setDays] = useState<number | null>(null);
  const [daysCustom, setDaysCustom] = useState(false);
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [opt, setOpt] = useState<Partial<Record<SponsorServiceId, number>>>({});
  const [picked, setPicked] = useState<Partial<Record<SponsorServiceId, boolean>>>({});
  const [addOns, setAddOns] = useState<Record<string, boolean>>({});
  const [price, setPrice] = useState<number | null>(null);
  const [priceCustom, setPriceCustom] = useState('');
  const [priceIsCustom, setPriceIsCustom] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const pkg = PACKS.find((p) => p.id === pkgId) || null;
  const active: SponsorServiceId[] = !pkg ? [] : pkg.optIn ? pkg.services.filter((id) => picked[id]) : pkg.services;

  const lines = useMemo(() => active.map((id) => {
    const s = svc(id);
    const o = optionsFor(s)[opt[id] ?? 0];
    return {
      id, label: s.label, option: o,
      cost: days ? o.perDay * days : 0,
      appts: o.apptsPerDay != null && days ? o.apptsPerDay * days : null,
    };
  }), [active.join(','), opt, days]);

  // Add-ons only count once a service is on.
  const addOnLines = lines.length ? ADD_ONS.filter((a) => addOns[a.id]) : [];
  const servicesFee = lines.reduce((t, l) => t + l.cost, 0);
  const fee = days && lines.length ? servicesFee : 0;
  const appts = lines.reduce((t, l) => t + (l.appts || 0), 0);
  const sponsorPrice = priceIsCustom ? (Number(priceCustom) || 0) : (price || 0);
  const net = fee && sponsorPrice ? sponsorPrice - fee : null;

  const fromPrice = (p: Pack) => {
    const ids = p.optIn ? [] : p.services;
    if (!ids.length) return null;
    return ids.reduce((t, id) => t + optionsFor(svc(id))[0].perDay, 0) * (days || 1);
  };

  const scrollTo = (id: string) => {
    const el = rootRef.current?.querySelector<HTMLElement>(`#${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  };

  const rail = [
    { id: 'pr-pkg', t: 'Pick a package', v: pkg ? pkg.name : 'Not picked yet' },
    { id: 'pr-days', t: 'Pick your days', v: days ? `${days} day${days > 1 ? 's' : ''}` : 'Not set yet' },
    { id: 'pr-build', t: 'Make it yours', v: lines.length ? `${lines.length} service${lines.length > 1 ? 's' : ''} on` : 'Pick services' },
  ];

  const mailBody = [
    `Conference: ${confName}`,
    pkg ? `Package: ${pkg.name}` : '',
    days ? `Days: ${days}` : '',
    ...lines.map((l) => `${l.label}: ${l.option.name}${days ? ` (${money(l.cost)})` : ''}`),
    addOnLines.length ? `Add-ons: ${addOnLines.map((a) => a.name).join(', ')}` : '',
    fee ? `Estimated Shortcut fee: ${money(fee)}` : '',
    sponsorPrice ? `Our sponsor price: ${money(sponsorPrice)}` : '',
  ].filter(Boolean).join('\n');
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(`Wellness lounge sponsorship at ${confName}`)}&body=${encodeURIComponent(mailBody)}`;

  return (
    <div ref={rootRef} className="pv-root !bg-transparent">
      {/* ── The step rail ── */}
      <ol className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-3 gap-5">
        {rail.map((r, i) => (
          <li key={r.id} className="relative flex">
            <button
              type="button"
              onClick={() => scrollTo(r.id)}
              className={`relative flex flex-1 min-h-[200px] flex-col overflow-hidden rounded-[28px] p-7 text-left transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(3,34,50,.14)] ${RAIL_FILLS[i]}`}
            >
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-[22px] right-5 text-[150px] font-extrabold leading-none tracking-[-.06em] text-[#003756]/10">{i + 1}</span>
              <span className="relative text-[12px] font-extrabold uppercase tracking-[.09em] text-[#003756]/70">Step {i + 1}</span>
              <span className="relative mt-3 text-[24px] font-bold leading-[1.15] tracking-[-.025em] text-[#003756]">{r.t}</span>
              <span className="relative mt-auto pt-7">
                <span className="inline-flex h-9 max-w-full items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-[14.5px] font-bold text-[#003756] shadow-[0_2px_8px_rgba(3,34,50,.08)]">
                  <span className="h-2 w-2 flex-none rounded-full bg-[#FF5050]" />
                  {r.v}
                </span>
              </span>
            </button>
            {i < rail.length - 1 && (
              <span aria-hidden="true" className="absolute -right-6 top-1/2 z-[2] -mt-3.5 hidden h-7 w-7 place-items-center rounded-full bg-[#003756] shadow-[0_4px_12px_rgba(3,34,50,.24)] md:grid">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12.5 6l6 6-6 6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-16 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-10 items-start">
        <div className="min-w-0 flex flex-col gap-14">
          {/* The banner, where the holiday page has its offer: a real sale. */}
          <div className="flex flex-col gap-1.5 rounded-[24px] border border-[rgba(254,220,100,.9)] bg-[rgba(254,220,100,.28)] px-7 py-6">
            <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-[#003756]">A real sale</p>
            <p className="m-0 text-[18px] font-extrabold leading-[1.3] tracking-[-.015em] text-[#003756]">
              A business school conference sold the Massage Wellness Zone to its sponsor for $35,000.
            </p>
            <p className={`m-0 text-[15px] font-semibold leading-[1.45] ${META}`}>
              Two days at 64 appointments a day, with branded privacy screens. The conference kept about $28,000.
            </p>
          </div>

          {/* ── Step 1: package ── */}
          <section id="pr-pkg">
            <StepHead n={1} title="Choose a package" dot={DAY_DOTS[0]} />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PACKS.map((p) => {
                const on = p.id === pkgId;
                const from = fromPrice(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setPkgId(p.id); setTimeout(() => scrollTo(days ? 'pr-build' : 'pr-days'), 40); }}
                    className={`relative flex flex-col overflow-hidden rounded-[24px] border-2 text-left transition-[transform,box-shadow] duration-200 ${p.optIn ? 'sm:col-span-2' : ''} ${on ? 'bg-[#003756] border-[#003756] text-white shadow-[0_14px_34px_rgba(3,34,50,.22)]' : 'bg-white border-[#E2E9E8] text-[#003756] shadow-[0_1px_2px_rgba(3,34,50,.05)] hover:-translate-y-0.5'}`}
                  >
                    <span className={`absolute top-3.5 right-3.5 z-[1] grid h-7 w-7 place-items-center rounded-full shadow-[0_2px_8px_rgba(3,34,50,.2)] ${on ? 'bg-[#FEDC64]' : 'bg-white'}`}>
                      {on && <Check stroke="#003756" size={14} />}
                    </span>
                    <span className={`flex h-[124px] overflow-hidden border-b ${on ? 'border-white/[.12]' : 'border-[#E2E9E8]'}`}>
                      {p.services.slice(0, p.optIn ? 7 : 3).map((id) => {
                        const st = serviceById(id);
                        return (
                          <span key={id} className="relative min-w-0 flex-1 overflow-hidden" style={{ background: st.tint }}>
                            <span className="absolute inset-[-8%] bg-cover bg-[center_35%] bg-no-repeat" style={{ backgroundImage: `url('${st.image}')` }} />
                          </span>
                        );
                      })}
                    </span>
                    <span className="flex flex-col gap-1.5 px-6 pt-[22px] pb-6">
                      <span className={`text-[11.5px] font-extrabold uppercase tracking-[.08em] ${on ? 'text-[#FEDC64]' : 'text-[#FF5050]'}`}>{p.inside}</span>
                      <span className="text-[21px] font-bold leading-[1.15] tracking-[-.025em]">{p.name}</span>
                      <span className={`mt-1.5 text-[15px] font-bold ${on ? 'text-[#9EFAFF]' : META}`}>
                        {p.optIn ? 'All seven services' : !days ? `From ${money(from || 0)} a day` : `From ${money(from || 0)}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Step 2: days ── */}
          <section id="pr-days" className="flex flex-col gap-6">
            <StepHead n={2} title="How many days?" dot={DAY_DOTS[1]} />
            <div role="group" aria-label="Days at the conference" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3].map((n) => {
                const on = !daysCustom && days === n;
                return (
                  <button key={n} type="button" aria-pressed={on} onClick={() => { setDays(n); setDaysCustom(false); }} className={`${TILE} ${on ? TILE_ON : TILE_OFF}`}>
                    <span className="text-[26px] font-extrabold leading-none tracking-[-.03em]">{n}</span>
                    <span className={`text-[13px] font-semibold ${on ? 'text-white/75' : META}`}>{n === 1 ? 'day' : 'days'}</span>
                  </button>
                );
              })}
              {!daysCustom ? (
                <button type="button" onClick={() => { setDaysCustom(true); setDays(days && days > 3 ? days : 4); }} className={`${TILE} ${TILE_OFF}`}>
                  <span className="text-[18px] font-extrabold leading-none tracking-[-.02em]">Custom</span>
                  <span className={`text-[13px] font-semibold ${META}`}>More days</span>
                </button>
              ) : (
                <div className={`${TILE} ${TILE_ON} !flex-row !items-center !gap-2 !pr-3`}>
                  <span className="flex-1 flex flex-col gap-1">
                    <span className="text-[26px] font-extrabold leading-none tracking-[-.03em]">{days}</span>
                    <span className="text-[13px] font-semibold text-white/75">days</span>
                  </span>
                  <span className="flex flex-none flex-col gap-1">
                    {[1, -1].map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-label={d > 0 ? 'Add a day' : 'Remove a day'}
                        onClick={() => setDays((v) => Math.min(10, Math.max(1, (v || 1) + d)))}
                        className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-white/[.16] hover:bg-white/[.28]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={d > 0 ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ── Step 3: make it yours ── */}
          <section id="pr-build" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 mb-2">
              <StepHead n={3} title="Make it yours" dot={DAY_DOTS[2]} />
              {pkg && (
                <p className={`m-0 ml-12 text-[16px] font-semibold ${META}`}>
                  {pkg.optIn ? 'Pick as many services as you like.' : `${pkg.name}. Pick how much of each service your sponsor gets.`}
                </p>
              )}
            </div>

            {!pkg && (
              <p className={`m-0 rounded-[20px] border-2 border-dashed border-[#E2E9E8] px-6 py-5 text-[15px] font-semibold leading-[1.5] ${META}`}>
                Pick a package in step 1 and its services appear here, with each one&rsquo;s options and price.
              </p>
            )}

            {pkg?.optIn && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SERVICES.map((s) => {
                  const st = serviceById(s.id);
                  const on = !!picked[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setPicked((v) => ({ ...v, [s.id]: !on }))}
                      className={`flex items-center gap-4 rounded-[20px] bg-white py-3 pl-3 pr-5 text-left transition-[border-color,box-shadow] duration-150 ${on ? 'border-2 border-[#003756] shadow-[0_8px_20px_rgba(3,34,50,.10)]' : 'border-2 border-[#E2E9E8]'}`}
                    >
                      <span className="relative h-[60px] w-[60px] flex-none overflow-hidden rounded-[14px]" style={{ background: st.tint }}>
                        <span className="absolute inset-[-10%] bg-cover bg-[center_30%] bg-no-repeat" style={{ backgroundImage: `url('${st.image}')` }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-bold tracking-[-.015em] text-[#003756]">{s.label}</span>
                        <span className={`block text-[13px] font-medium leading-[1.4] ${META}`}>{s.kind === 'group' ? `Group session, from ${money(s.perSession || 0)}` : `${s.minutes} minute appointments`}</span>
                      </span>
                      <span className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-[8px] ${on ? 'bg-[#003756]' : 'bg-white border-2 border-[#C9D6D4]'}`}>
                        {on && <Check stroke="#fff" size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {pkg && lines.length > 0 && (
              <div className="flex items-center justify-between gap-6 rounded-[20px] border border-[#E2E9E8] bg-[#F1F6F5] px-6 py-[18px]">
                <div className="min-w-0 flex flex-col gap-1.5">
                  <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${META}`}>{pkg.name} · {lines.length} {lines.length === 1 ? 'service' : 'services'}</p>
                  <p className="m-0 text-[15px] font-semibold leading-[1.45] text-[#003756]">
                    {days
                      ? `${lines.map((l) => `${l.label} ${money(l.cost)}`).join(' + ')}${addOnLines.length ? ', plus add-ons' : ''}, over ${days} day${days > 1 ? 's' : ''}.`
                      : `${lines.map((l) => l.label).join(' + ')}. Pick your days in step 2 to price it.`}
                  </p>
                </div>
                <div className="flex-none text-right">
                  <div className="whitespace-nowrap text-[28px] font-extrabold leading-none tracking-[-.03em] text-[#003756]">{fee ? money(fee) : '$0'}</div>
                  <div className={`mt-1.5 text-[11.5px] font-extrabold uppercase tracking-[.08em] ${META}`}>Estimated Shortcut fee</div>
                </div>
              </div>
            )}

            {/* One V2 proposal service card per service, with the options band. */}
            {lines.map((l) => {
              const s = svc(l.id);
              const st = serviceById(l.id);
              const options = optionsFor(s);
              const sel = opt[l.id] ?? 0;
              return (
                <article key={l.id} className="pv-svc !mb-0">
                  <div className="pv-svc-grid sp-svc-grid">
                    <div className="pv-svc-photo" style={{ background: st.tint }}>
                      <span role="img" aria-label={l.label} className="absolute inset-[-8%] bg-cover bg-[center_30%] bg-no-repeat" style={{ backgroundImage: `url('${st.image}')` }} />
                      <span className="pv-photo-label">{l.label}</span>
                    </div>
                    <div className="pv-svc-body">
                      <div className="pv-svc-top">
                        <span className="pv-dot" style={{ background: st.tint, boxShadow: 'inset 0 0 0 1px rgba(3,34,50,.14)' }} />
                        <h4 className="pv-svc-name text-[#003756]">{l.label}</h4>
                        {pkg?.optIn ? (
                          <button type="button" className="pv-toggle border-0 bg-transparent p-0 cursor-pointer" aria-pressed="true" title="Included, click to remove" onClick={() => setPicked((v) => ({ ...v, [l.id]: false }))}>
                            <span className="lbl">Included</span>
                            <span className="pv-switch" />
                          </button>
                        ) : (
                          <span className="pv-toggle"><span className="lbl">Included</span></span>
                        )}
                      </div>
                      <p className="pv-desc-label">Description</p>
                      <p className="pv-svc-desc">{st.body}</p>
                      <div className="pv-svc-metrics">
                        <div>
                          <div className="pv-bignum">{s.kind === 'group' ? sel + 1 : (l.appts ?? l.option.apptsPerDay)}</div>
                          <div className="pv-metric-sub">{s.kind === 'group' ? `Sessions a day · ${s.lengthLabel ?? `${s.minutes} min`}` : days ? `Appointments over ${days} day${days > 1 ? 's' : ''}` : 'Appointments a day'}</div>
                        </div>
                        <div className="pv-cost">
                          <div className="v">{days ? money(l.cost) : money(l.option.perDay)}</div>
                          <div className="k">{days ? `For ${days} day${days > 1 ? 's' : ''}` : 'Per day'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pv-pricing">
                    <div className="pv-pricing-head">
                      <span className="lbl">{s.kind === 'group' ? 'Sessions a day' : 'Appointments a day'}</span>
                      <span className="hint">Pick one</span>
                    </div>
                    <div className="pv-popt-grid sp-popt-grid">
                      {options.map((o, i) => (
                        <button key={o.name} type="button" className={'pv-popt' + (sel === i ? ' on' : '')} onClick={() => setOpt((v) => ({ ...v, [l.id]: i }))}>
                          <div className="pv-popt-top">
                            <span className="pv-popt-name">{o.name}</span>
                            <span className="pv-popt-radio">{sel === i && <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>}</span>
                          </div>
                          {o.apptsPerDay != null && (
                            <div className="pv-popt-appts"><span className="n">{o.apptsPerDay}</span><span className="u">appts a day</span></div>
                          )}
                          <div className="pv-popt-len">{o.detail}</div>
                          <div className="pv-popt-price"><span className="v">{money(o.perDay)}</span><span className={`text-[13px] font-semibold ${META}`}>a day</span></div>
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Add-ons, as plain categories. */}
            {pkg && lines.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                <p className={`m-0 text-[12px] font-extrabold uppercase tracking-[.09em] ${META}`}>Add-ons</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ADD_ONS.map((a) => {
                    const on = !!addOns[a.id];
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setAddOns((v) => ({ ...v, [a.id]: !on }))}
                        className={`flex items-center gap-4 rounded-[20px] bg-white px-5 py-4 text-left transition-[border-color,box-shadow] duration-150 ${on ? 'border-2 border-[#003756] shadow-[0_8px_20px_rgba(3,34,50,.10)]' : 'border-2 border-[#E2E9E8]'}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[16px] font-bold tracking-[-.015em] text-[#003756]">{a.name}</span>
                        </span>
                        <span className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-[8px] ${on ? 'bg-[#003756]' : 'bg-white border-2 border-[#C9D6D4]'}`}>
                          {on && <Check stroke="#fff" size={14} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <p className={`m-0 -mt-8 text-[14px] font-semibold leading-[1.5] ${META}`}>
            A sample of how pricing could work, from our standard conference rates. Setup, cleanup and certificates of insurance are included, and add-ons are priced in the fixed fee we quote for your show in writing.
          </p>
        </div>

        {/* ── The summary, the holiday builder's navy card ── */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[24px] bg-[#003756] p-7 text-white shadow-[0_20px_50px_rgba(3,34,50,.22)]">
            <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-[#FEDC64]">Sample sponsorship</p>
            <h3 className="m-0 mt-2 text-[22px] font-bold leading-[1.15] tracking-[-.025em] text-white">{pkg ? pkg.name : 'Nothing picked yet'}</h3>
            <p className="m-0 mt-1.5 text-[14px] font-semibold text-white/[.72]">
              {days && lines.length ? `${days} day${days > 1 ? 's' : ''}${appts ? ` · ${appts} appointments` : ''}` : !pkg ? 'Pick a package and your days to start' : !lines.length ? 'Pick a service to price it' : 'Pick your days to price it'}
            </p>

            <div className="mt-[22px] flex flex-col gap-3">
              {lines.map((l) => (
                <div key={l.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-[14.5px] font-semibold">{l.label}</span>
                  <span className="whitespace-nowrap text-[14.5px] font-bold">{days ? money(l.cost) : 'Add days'}</span>
                </div>
              ))}
              {addOnLines.length > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14.5px] font-semibold">Add-ons</span>
                  <span className="whitespace-nowrap text-[14.5px] font-semibold text-white/[.72]">In your quote</span>
                </div>
              )}
              {pkg && !lines.length && <p className="m-0 text-[14.5px] font-semibold text-white/[.72]">Switch a service on to start.</p>}
            </div>

            <div className="mt-[18px] flex items-baseline justify-between gap-3 border-t border-white/[.16] pt-4">
              <span className="text-[15px] font-bold">Estimated Shortcut fee</span>
              <span className="text-[20px] font-extrabold tracking-[-.02em] tabular-nums">{money(fee)}</span>
            </div>

            <div className="mt-5">
              <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-white/60">Your sponsor price</p>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {PRICE_POINTS.map((p) => {
                  const on = !priceIsCustom && price === p;
                  return (
                    <button key={p} type="button" aria-pressed={on} onClick={() => { setPrice(p); setPriceIsCustom(false); }} className={`h-10 rounded-full text-[13.5px] font-bold transition-colors ${on ? 'bg-[#9EFAFF] text-[#003756]' : 'bg-white/[.08] text-white hover:bg-white/[.16]'}`}>
                      {money(p).replace(',000', 'K')}
                    </button>
                  );
                })}
              </div>
              <label className={`mt-2 flex h-10 items-center gap-1 rounded-full px-4 ${priceIsCustom ? 'bg-white/[.16]' : 'bg-white/[.08]'}`}>
                <span className="text-[13.5px] font-bold text-white/70">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Custom sponsor price in dollars"
                  placeholder="Custom price"
                  value={priceIsCustom && priceCustom ? Number(priceCustom).toLocaleString('en-US') : ''}
                  onFocus={() => setPriceIsCustom(true)}
                  onChange={(e) => { setPriceIsCustom(true); setPriceCustom(e.target.value.replace(/[^0-9]/g, '').slice(0, 7)); }}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-bold text-white outline-none placeholder:text-white/50"
                />
              </label>
            </div>

            <div className="mt-[18px] flex items-baseline justify-between gap-3 border-t border-white/[.16] pt-4">
              <span className="text-[15px] font-bold">Conference net</span>
              <span className="text-[34px] font-extrabold leading-none tracking-[-.03em] text-[#9EFAFF] tabular-nums">{net != null ? money(net) : '$0'}</span>
            </div>
            {net != null && appts > 0 && (
              <p className="m-0 mt-2.5 text-[13px] font-semibold text-white/70">
                Your sponsor pays {money(sponsorPrice / appts)} per appointment.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-white/[.08] px-4 py-3.5">
              <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.09em] text-white/60">What your sponsor gets</p>
              {WHAT_THEY_GET.map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#FEDC64]"><Check /></span>
                  <span className="text-[13.5px] font-semibold leading-[1.4]">{t}</span>
                </div>
              ))}
            </div>

            <a href={mailto} className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-[#FF5050] text-[16px] font-bold text-white transition-transform duration-500 hover:-translate-y-[2px]">
              Get your quote
            </a>
            <p className="m-0 mt-3 text-center text-[13px] font-semibold text-white/70">Opens an email with your choices filled in.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
