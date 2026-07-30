import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGenericLandingPage } from '../contexts/GenericLandingPageContext';
import { supabase } from '../lib/supabaseClient';
import { GenericLandingPage } from '../types/genericLandingPage';
import {
  MENU_SERVICES,
  MENU_SECTIONS,
  MENU_INFO_CARDS,
  MENU_TONES,
  MENU_PROMO_PHOTOS,
  MENU_GALLERY_KEYS,
  MenuService,
  MenuInfoCard,
} from '../utils/menuServices';
import { SENDER_TO_CALENDAR } from '../utils/workhumanOutreachTemplates';
import { useIsCompact } from './proposal/shared/useIsMobile';

// ---------------------------------------------------------------------------
// Service Menu page. Faithful recreation of design_handoff_service_menu:
// sticky partner nav, page head, promo mosaic (photo gallery + booking demo),
// sticky "Where" filter, one grid section per billing format with info cards
// interleaved, coral CTA band, and a service detail modal.
//
// Per-client customization (generic_landing_pages, page_type='menu'):
// client name + logo in the nav, assigned salesperson for the booking modal,
// optional per-service hiding, and section-level visibility.
// ---------------------------------------------------------------------------

const A = '/conference'; // shared asset root (see menuServices.ts)
const INK = 'text-[#032232]';
const SOFT = 'text-[#45596A]';
const LINE = 'border-[#E2E9E8]';
const SHADOW = 'shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Promo card A — photo gallery, 4200ms cross-fade, dots restart the timer.
// ---------------------------------------------------------------------------
const PromoGallery: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0); // bumping this restarts the interval
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setIdx(i => (i + 1) % MENU_PROMO_PHOTOS.length), 4200);
    return () => clearInterval(t);
  }, [tick]);
  return (
    <div className={`relative col-span-1 min-h-[300px] overflow-hidden rounded-[18px] bg-[#003756] sm:col-span-2 md:min-h-[344px] ${SHADOW}`}>
      {MENU_PROMO_PHOTOS.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {/* Contrast-critical ramp: tuned so the headline clears 5:1 on all four photos. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,25,42,0)_32%,rgba(0,25,42,.5)_62%,rgba(0,25,42,.84)_100%)]" />
      {/* pr-* reserves the dots' corner so the headline never runs under them. */}
      <h2 className="absolute bottom-0 left-0 max-w-[24ch] pb-8 pl-6 pr-24 text-[clamp(21px,2.6vw,34px)] font-extrabold leading-[1.08] tracking-[-.03em] text-white [text-shadow:0_2px_20px_rgba(0,25,42,.45)] md:pb-10 md:pl-10 md:pr-28">
        Over a dozen ways to recharge
      </h2>
      {/* The pill backdrop is required — the scrim is transparent up here. */}
      <div className="absolute bottom-8 right-5 flex gap-2 rounded-full bg-[rgba(0,25,42,.5)] px-[11px] py-[7px] md:bottom-11 md:right-7">
        {MENU_PROMO_PHOTOS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setTick(t => t + 1); }}
            aria-label={`Photo ${i + 1}`}
            className={`h-2 w-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Promo card B — booking demo. Three phone screens loop every 2200ms.
// Phone chrome is navy, not coral: coral on yellow reads muddy.
// ---------------------------------------------------------------------------
const PHONE_MUTED = 'text-[#9ab1ba]';

const PromoDemo: React.FC<{ eventName: string }> = ({ eventName }) => {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setScreen(s => (s + 1) % 3), 2200);
    return () => clearInterval(t);
  }, []);
  const eyebrow = 'text-[9.5px] font-bold uppercase tracking-[.08em] ' + PHONE_MUTED;
  const optRow = (label: string, sel: boolean) => (
    <div
      key={label}
      className={`flex items-center gap-2 rounded-[9px] border-[1.5px] px-[9px] py-[7px] text-[11px] font-semibold ${
        sel ? 'border-[#003756] bg-[rgba(0,55,86,.06)] text-[#003756]' : `${LINE} text-[#45596A]`
      }`}
    >
      <span
        className={`h-3 w-3 flex-none rounded-full ${
          sel ? 'bg-[#003756] shadow-[inset_0_0_0_2.5px_#fff]' : 'border-[1.5px] border-[#E2E9E8]'
        }`}
      />
      {label}
    </div>
  );
  const btn = (label: string) => (
    <div className="rounded-[9px] bg-[#003756] py-2 text-center text-[11px] font-bold text-white">{label}</div>
  );
  return (
    <div className={`flex min-h-[300px] flex-col overflow-hidden rounded-[18px] bg-[#FEDC64] px-7 pt-[26px] text-[#003756] md:min-h-[344px] ${SHADOW}`}>
      <h3 className="max-w-[15ch] text-[29px] font-extrabold leading-[1.08] tracking-[-.025em]">Booking in three taps.</h3>
      <p className="mt-[9px] max-w-[34ch] text-[14.5px] font-bold leading-[1.5]">
        No spreadsheets, no chasing. Attendees grab their own slot.
      </p>
      <div className="mt-auto flex justify-center">
        <div className="w-[192px] rounded-t-[18px] bg-white px-3 pb-[14px] pt-3 shadow-[0_-6px_24px_rgba(3,34,50,.18)]">
          <div className={`flex items-center gap-2 border-b ${LINE} pb-2`}>
            <span className="grid h-4 w-4 place-items-center rounded-full bg-[#003756] text-[8px] font-extrabold text-white">
              {eventName.charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-[10.5px] font-bold text-[#003756]">{eventName}</span>
            <span className={`ml-auto text-[10px] font-bold ${PHONE_MUTED}`}>{screen + 1}/3</span>
          </div>
          <div className="relative mt-2.5 h-[114px]">
            {/* 1 — pick your service */}
            <div className={`absolute inset-0 transition-opacity duration-[450ms] ease-in-out ${screen === 0 ? 'opacity-100' : 'opacity-0'}`}>
              <p className={eyebrow}>Pick your service</p>
              <div className="mt-2 grid gap-1.5">
                {optRow('Chair massage', true)}
                {optRow('Assisted stretch', false)}
              </div>
              <div className="mt-2">{btn('Next')}</div>
            </div>
            {/* 2 — pick your time */}
            <div className={`absolute inset-0 transition-opacity duration-[450ms] ease-in-out ${screen === 1 ? 'opacity-100' : 'opacity-0'}`}>
              <p className={eyebrow}>Pick your time</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { t: '11:00', s: '' },
                  { t: '11:20', s: 'taken' },
                  { t: '11:40', s: 'sel' },
                  { t: '12:00', s: '' },
                ].map(slot => (
                  <div
                    key={slot.t}
                    className={`rounded-[8px] border-[1.5px] py-1.5 text-center text-[10.5px] font-bold ${
                      slot.s === 'sel'
                        ? 'border-[#003756] bg-[#003756] text-white'
                        : slot.s === 'taken'
                        ? `${LINE} text-[#45596A] line-through opacity-35`
                        : `${LINE} text-[#003756]`
                    }`}
                  >
                    {slot.t}
                  </div>
                ))}
              </div>
              <div className="mt-2">{btn('Book my slot')}</div>
            </div>
            {/* 3 — confirmation */}
            <div className={`absolute inset-0 grid place-items-center transition-opacity duration-[450ms] ease-in-out ${screen === 2 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-center">
                <span className="mx-auto grid h-[30px] w-[30px] place-items-center rounded-full bg-[#55BA90] text-[15px] font-bold text-white">✓</span>
                <p className="mt-2 text-[13px] font-extrabold text-[#003756]">You're booked!</p>
                <p className="mt-0.5 text-[10px] text-[#7d939e]">Chair massage · 11:40 AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Booking modal — embeds the assigned salesperson's Google appointment page.
// Mirrors the conference one-pager so both surfaces behave identically.
// ---------------------------------------------------------------------------
const resolveBooking = (rep?: string | null) => {
  const fallback = SENDER_TO_CALENDAR['Will Newton'];
  if (!rep) return fallback;
  return SENDER_TO_CALENDAR[rep as keyof typeof SENDER_TO_CALENDAR] || fallback;
};

const BookingModal: React.FC<{ rep?: string | null; onClose: () => void }> = ({ rep, onClose }) => {
  const url = resolveBooking(rep);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(3,34,50,.58)] p-4 print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Book a call"
    >
      <div
        className="relative flex h-[min(760px,92vh)] w-[min(760px,100%)] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_rgba(3,34,50,.4)]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-[38px] w-[38px] place-items-center rounded-full bg-[#003756] text-[20px] leading-none text-white"
        >
          ×
        </button>
        <iframe src={url} title="Book a call" className="h-full w-full border-0" />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Service detail modal. Media column cross-fades published gallery photos, then
// this service's real event photos, then the card art — so the frame is always
// fully covered (object-cover) with no dead white space.
// ---------------------------------------------------------------------------
const ServiceModal: React.FC<{
  service: MenuService;
  position: string;
  galleryImages: string[];
  onClose: () => void;
  onNav: (dir: 1 | -1) => void;
}> = ({ service, position, galleryImages, onClose, onNav }) => {
  const [imgIdx, setImgIdx] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Published gallery first (real events), then curated locals, then card art.
  const images = useMemo(() => {
    const list = [...galleryImages, ...(service.photos || []), service.image];
    return Array.from(new Set(list)).slice(0, 6);
  }, [galleryImages, service]);

  // Reset media + scroll on every service change (handoff behaviour).
  useEffect(() => {
    setImgIdx(0);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [service.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNav(1);
      if (e.key === 'ArrowLeft') onNav(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [onClose, onNav]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(3,34,50,.58)] p-4 md:p-7 print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={service.name}
    >
      <div
        className="relative grid max-h-[calc(100vh-56px)] w-[min(960px,100%)] grid-cols-1 overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_rgba(3,34,50,.4)] md:h-[520px] md:grid-cols-[44%_56%]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 grid h-[38px] w-[38px] place-items-center rounded-full bg-[#003756] text-[20px] leading-none text-white"
        >
          ×
        </button>
        {/* Media — always fully covered, never letterboxed. */}
        <div className="relative h-[240px] bg-[#EAF7F9] md:h-auto">
          {images.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={i === imgIdx ? service.name : ''}
              aria-hidden={i !== imgIdx}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                i === imgIdx ? 'opacity-100' : 'opacity-0'
              } ${src === service.image && service.cropArt ? 'scale-110' : ''} ${
                src === service.image && service.imagePos ? service.imagePos : ''
              }`}
            />
          ))}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-4 z-[3] flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`h-[9px] w-[9px] rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>
        {/* Body */}
        <div ref={bodyRef} className="flex flex-col overflow-y-auto px-7 pb-7 pt-8 md:px-9 md:pb-7 md:pt-[34px]">
          <p className={`text-[11px] font-bold uppercase tracking-[.1em] ${SOFT}`}>{position}</p>
          <h3 className="mt-1.5 text-[27px] font-extrabold leading-[1.1] tracking-[-.02em] text-[#003756]">{service.name}</h3>
          <p className={`mb-[22px] mt-2.5 text-[14px] leading-[1.6] ${INK}`}>{service.desc}</p>
          <div className={`grid grid-cols-1 gap-6 border-t ${LINE} pt-[18px] sm:grid-cols-[1.15fr_1fr]`}>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[.1em] ${SOFT}`}>What we bring</p>
              <ul className="mt-2.5 grid gap-2">
                {service.bring.map(b => (
                  <li key={b.lead} className={`flex gap-2.5 text-[13px] leading-[1.45] ${SOFT}`}>
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#9EFAFF]" />
                    <span>
                      <b className={`font-semibold ${INK}`}>{b.lead}</b>, {b.rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[.1em] ${SOFT}`}>{service.columnKind}</p>
              <ul className="mt-2.5 grid gap-2">
                {service.items.map(it => (
                  <li key={it.rest} className={`flex gap-2.5 text-[13px] leading-[1.45] ${SOFT}`}>
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#9EFAFF]" />
                    <span>
                      {it.lead ? (
                        <>
                          <b className={`font-semibold ${INK}`}>{it.lead}</b>, {it.rest}
                        </>
                      ) : (
                        it.rest
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-auto flex items-end justify-between gap-4 pt-6">
            <p className={`text-[11px] font-bold uppercase tracking-[.08em] ${SOFT}`}>{service.metaFooter}</p>
            <div className="flex flex-none gap-2">
              <button
                onClick={() => onNav(-1)}
                aria-label="Previous service"
                className={`grid h-[38px] w-[38px] place-items-center rounded-full border ${LINE} bg-white text-[15px] text-[#003756]`}
              >
                ←
              </button>
              <button
                onClick={() => onNav(1)}
                aria-label="Next service"
                className={`grid h-[38px] w-[38px] place-items-center rounded-full border ${LINE} bg-white text-[15px] text-[#003756]`}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------
const ServiceCard: React.FC<{ service: MenuService; wide: boolean; tall: boolean; onOpen: () => void }> = ({
  service,
  wide,
  tall,
  onOpen,
}) => (
  <button
    onClick={onOpen}
    aria-label={`More about ${service.name.toLowerCase()}`}
    className={`group relative overflow-hidden rounded-[18px] bg-[#F1F6F5] text-left ${SHADOW} ${
      // The grid's first two cells are taller (.ggrid > *:nth-child(-n+2)).
      tall ? 'min-h-[344px]' : 'min-h-[300px]'
    } ${wide ? 'col-span-1 sm:col-span-2' : ''}`}
  >
    <img
      src={service.image}
      alt={service.name}
      className={`absolute inset-0 h-full w-full object-cover ${service.cropArt ? 'scale-110' : ''} ${service.imagePos || ''}`}
    />
    <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(3,34,50,.82)_0%,rgba(3,34,50,.34)_46%,rgba(3,34,50,0)_78%)]" />
    <div className="absolute bottom-5 left-5 z-[2]">
      <div className="text-[19px] font-extrabold tracking-[-.01em] text-white">{service.name}</div>
      <div className="mt-[3px] text-[12px] font-semibold text-white/[.86]">{service.meta}</div>
    </div>
    <span className="absolute right-[14px] top-[14px] z-[3] grid h-9 w-9 place-items-center rounded-full bg-white/[.94] text-[22px] font-medium leading-none text-[#003756] shadow-[0_2px_10px_rgba(3,34,50,.22)] transition-colors group-hover:bg-white">
      +
    </span>
    {service.remote && (
      <span className="absolute right-[62px] top-[22px] z-[3] rounded-full bg-[#9EFAFF] px-[11px] py-1.5 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#003756]">
        Remote too
      </span>
    )}
  </button>
);

const InfoCard: React.FC<{ card: MenuInfoCard; tall: boolean }> = ({ card, tall }) => (
  <div
    className={`flex flex-col rounded-[18px] px-[26px] py-6 ${tall ? 'min-h-[344px]' : 'min-h-[300px]'} ${
      MENU_TONES[card.tone]
    } ${SHADOW}`}
  >
    <p className="text-[10px] font-extrabold uppercase tracking-[.1em]">{card.kicker}</p>
    {/* [color:inherit] is load-bearing: a global h3 rule forces navy, which is
        invisible on the navy/coral/teal tones. */}
    <h3 className="mt-2.5 max-w-[17ch] text-[25px] font-extrabold leading-[1.08] tracking-[-.025em] [color:inherit]">
      {card.headline}
    </h3>
    <p className="mb-0 mt-auto max-w-[32ch] text-[13.5px] font-bold leading-[1.5]">{card.body}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Gallery fetch — published images from the proposal gallery admin.
// ---------------------------------------------------------------------------
const useServiceGallery = (): Record<string, string[]> => {
  const [byService, setByService] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let live = true;
    supabase
      .from('proposal_gallery')
      .select('service_type,media_url,sort_order')
      .eq('media_type', 'image')
      .eq('is_published', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (!live || error || !data) return;
        const byKey: Record<string, string[]> = {};
        data.forEach(r => {
          (byKey[r.service_type] = byKey[r.service_type] || []).push(r.media_url);
        });
        const out: Record<string, string[]> = {};
        Object.entries(MENU_GALLERY_KEYS).forEach(([svcId, keys]) => {
          out[svcId] = keys.flatMap(k => byKey[k] || []);
        });
        setByService(out);
      });
    return () => {
      live = false;
    };
  }, []);
  return byService;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const ServiceMenuPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { getGenericLandingPage } = useGenericLandingPage();
  const [page, setPage] = useState<GenericLandingPage | null>(null);
  const [loaded, setLoaded] = useState(!token);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [mode, setMode] = useState<'all' | 'remote'>('all');
  const [modalId, setModalId] = useState<string | null>(null);
  const isCompact = useIsCompact();
  const serviceGallery = useServiceGallery();

  // Desktop density: 100% zoom reads like 125%, matching the conference
  // one-pager so the two sibling pages feel like one site.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1100px)');
    const apply = () => document.body.style.setProperty('zoom', mq.matches ? '1.25' : '');
    const clear = () => document.body.style.setProperty('zoom', '');
    apply();
    mq.addEventListener('change', apply);
    window.addEventListener('beforeprint', clear);
    window.addEventListener('afterprint', apply);
    return () => {
      clear();
      mq.removeEventListener('change', apply);
      window.removeEventListener('beforeprint', clear);
      window.removeEventListener('afterprint', apply);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let live = true;
    getGenericLandingPage(token)
      .then(p => {
        if (live) setPage(p);
      })
      .finally(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [token, getGenericLandingPage]);

  const cz = page?.customization;
  const clientName = page?.data?.partnerName?.trim() || '';
  const clientLogo = page?.data?.partnerLogoUrl || '';
  const hiddenServices: string[] = (cz as any)?.hiddenServices ?? [];

  const sections = useMemo(() => {
    const visible = MENU_SECTIONS.map(sec => ({
      ...sec,
      services: sec.ids
        .map(id => MENU_SERVICES.find(s => s.id === id))
        .filter((s): s is MenuService => !!s && !hiddenServices.includes(s.id)),
    })).filter(sec => sec.services.length > 0);
    // "On-site or remote" filters at the SECTION level: every service in Group
    // sessions is remote-capable, so one-on-one appointments drop out entirely.
    return mode === 'remote' ? visible.filter(sec => sec.services.every(s => s.remote)) : visible;
  }, [mode, hiddenServices]);

  const visibleCount = sections.reduce((n, s) => n + s.services.length, 0);

  // Flat ordered list for modal prev/next (wraps at both ends).
  const flat = useMemo(() => sections.flatMap(s => s.services), [sections]);
  const modalIdx = modalId ? flat.findIndex(s => s.id === modalId) : -1;
  const navModal = useCallback(
    (dir: 1 | -1) => {
      setModalId(cur => {
        const i = flat.findIndex(s => s.id === cur);
        if (i < 0 || flat.length === 0) return cur;
        return flat[(i + dir + flat.length) % flat.length].id;
      });
    },
    [flat]
  );

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#003756]" />
      </div>
    );
  }

  const phoneEventName = clientName ? `${clientName.split(' ')[0]} Summit` : 'Acme Summit';

  /**
   * Grid order per the handoff: the first service card spans 2 columns, then one
   * info card, then the rest — with info cards cycled to fill any trailing gap
   * so every row ends flush.
   */
  const buildGrid = (services: MenuService[], info: MenuInfoCard[]) => {
    const cells: { kind: 'svc'; svc: MenuService; wide: boolean }[] | any[] = [];
    let infoUsed = 0;
    const pushInfo = () => {
      if (!info.length) return;
      cells.push({ kind: 'info', card: info[infoUsed % info.length], key: `info-${infoUsed}` });
      infoUsed += 1;
    };
    services.forEach((svc, i) => {
      cells.push({ kind: 'svc', svc, wide: i === 0, key: svc.id });
      if (i === 0) pushInfo();
    });
    // Column span: one per service, +1 because the first card is 2 wide, plus
    // every info card placed so far. Pad until the last row ends flush.
    const span = services.length + 1 + infoUsed;
    const gap = (3 - (span % 3)) % 3;
    for (let i = 0; i < gap; i += 1) pushInfo();
    return cells;
  };

  return (
    <div className={`min-h-screen bg-white font-sans leading-[1.55] ${INK}`}>
      {/* Sticky partner nav — desktop/tablet only; phones get the head lockup. */}
      {!isCompact && (
        <nav className="sticky top-0 z-40 h-16 border-b border-black/[.08] bg-white">
          <div className="flex h-full items-center justify-between px-5 md:px-7">
            <div className="flex items-center gap-3.5">
              {clientName ? (
                <>
                  <span className="flex items-center gap-2 text-[20px] font-extrabold tracking-[-.02em] text-[#003756]">
                    {clientLogo ? (
                      <img src={clientLogo} alt="" className="h-7 w-auto object-contain" />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#003756] text-[13px] font-extrabold text-white">
                        {clientName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {clientName}
                  </span>
                  <span className="h-6 w-px bg-black/10" />
                  <span className="flex items-center gap-[7px] text-[11px] font-bold text-[rgba(3,34,50,.45)]">
                    <span>with</span>
                    <img src={`${A}/shortcut-logo-rgb.svg`} alt="Shortcut" className="block h-4 w-auto" />
                  </span>
                </>
              ) : (
                <img src={`${A}/shortcut-logo-rgb.svg`} alt="Shortcut" className="block h-[26px] w-auto" />
              )}
            </div>
            <button
              onClick={() => setBookingOpen(true)}
              className="rounded-full bg-[#FF5050] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)]"
            >
              Book a call
            </button>
          </div>
        </nav>
      )}

      {bookingOpen && <BookingModal rep={cz?.bookingRep} onClose={() => setBookingOpen(false)} />}

      {/* Mobile sticky bottom CTA (matches the proposal viewer + conference page) */}
      {isCompact && !bookingOpen && !modalId && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[.06] bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <button
            onClick={() => setBookingOpen(true)}
            className="w-full rounded-full bg-[#FF5050] py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)]"
          >
            Book a call
          </button>
        </div>
      )}

      <div className={`mx-auto max-w-[1020px] px-[22px] md:px-8 ${isCompact ? 'pb-[86px]' : ''}`}>
        {/* Page head */}
        <div className="pb-[34px] pt-9 md:pt-14">
          {isCompact && (
            <div className="mb-5 flex items-center gap-2.5">
              {clientName && clientLogo ? (
                <img src={clientLogo} alt={clientName} className="h-6 w-auto object-contain" />
              ) : clientName ? (
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#003756] text-[11px] font-extrabold text-white">
                  {clientName.charAt(0).toUpperCase()}
                </span>
              ) : null}
              {clientName && <span className="text-[15px] font-extrabold text-[#003756]">{clientName}</span>}
              {clientName && <span className="h-4 w-px bg-black/10" />}
              <img src={`${A}/shortcut-logo-rgb.svg`} alt="Shortcut" className="h-[18px] w-auto" />
            </div>
          )}
          <h1 className="max-w-[26ch] text-[clamp(30px,4.4vw,48px)] font-extrabold leading-[1.05] tracking-[-.035em] text-[#003756]">
            Explore our Service Menu
          </h1>
          <p className="mt-[18px] max-w-[44ch] text-[18px] font-bold leading-[1.4] tracking-[-.015em] text-[#003756]">
            Loved by your people. All handled for you.
          </p>
        </div>

        {/* Promo mosaic — renders once, never re-rendered by the filter. */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
          <PromoGallery />
          <PromoDemo eventName={phoneEventName} />
        </div>
      </div>

      {/* Sticky filter bar */}
      <div
        className={`sticky z-30 mt-11 border-y ${LINE} bg-white/[.94] backdrop-blur-[10px]`}
        style={{ top: isCompact ? 0 : 64 }}
      >
        <div className="mx-auto flex max-w-[1020px] flex-wrap items-center gap-x-[26px] gap-y-2.5 px-[22px] py-3.5 md:px-8">
          <span className={`text-[10.5px] font-extrabold uppercase tracking-[.1em] ${SOFT}`}>Where</span>
          <div className="flex gap-1 rounded-full bg-[#F1F6F5] p-1" role="radiogroup" aria-label="Where">
            {([
              { v: 'all' as const, l: 'All services' },
              { v: 'remote' as const, l: 'On-site or remote' },
            ]).map(opt => (
              <button
                key={opt.v}
                role="radio"
                aria-checked={mode === opt.v}
                onClick={() => setMode(opt.v)}
                className={`rounded-full px-[15px] py-2 text-[13px] font-bold transition-colors duration-[180ms] ${
                  mode === opt.v ? 'bg-[#003756] text-white' : `${SOFT} hover:text-[#003756]`
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          <span className={`ml-auto text-[13px] font-semibold ${SOFT}`}>
            {visibleCount} service{visibleCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className={`mx-auto max-w-[1020px] px-[22px] md:px-8 ${isCompact ? 'pb-[86px]' : ''}`}>
        {sections.map(sec => (
          <section key={sec.name} className="pt-[58px]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 className="text-[26px] font-extrabold leading-[1.05] tracking-[-.03em] text-[#003756] md:text-[34px]">
                  {sec.name}
                </h2>
                {sec.sub && <p className={`mt-2 max-w-[38ch] text-[14.5px] ${SOFT}`}>{sec.sub}</p>}
              </div>
              <span className={`rounded-full border ${LINE} px-3.5 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[.08em] ${SOFT}`}>
                {sec.services.length} service{sec.services.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-[22px] grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {buildGrid(sec.services, MENU_INFO_CARDS[sec.name] || []).map((cell: any, i: number) =>
                cell.kind === 'svc' ? (
                  <ServiceCard
                    key={cell.key}
                    service={cell.svc}
                    wide={cell.wide}
                    tall={i < 2}
                    onOpen={() => setModalId(cell.svc.id)}
                  />
                ) : (
                  <InfoCard key={cell.key} card={cell.card} tall={i < 2} />
                )
              )}
            </div>
          </section>
        ))}

        {/* CTA band */}
        <div className="my-14 flex flex-wrap items-center justify-between gap-[30px] rounded-[24px] bg-[linear-gradient(160deg,#FF6A5A,#FF5050)] px-7 py-9 md:my-16 md:px-[46px] md:py-11">
          <div>
            <h2 className="max-w-[22ch] text-[clamp(24px,3.2vw,38px)] font-extrabold leading-[1.08] tracking-[-.03em] text-white">
              Not sure what your team needs?
            </h2>
            <p className="mt-3 max-w-[42ch] text-[16px] text-white/[.92]">
              Fifteen minutes and we will map a program to your headcount, space and dates.
            </p>
          </div>
          <button
            onClick={() => setBookingOpen(true)}
            className="rounded-full bg-[#9EFAFF] px-7 py-[15px] text-[15px] font-extrabold text-[#003756]"
          >
            Book a call →
          </button>
        </div>
      </div>

      {modalIdx >= 0 && (
        <ServiceModal
          service={flat[modalIdx]}
          position={`${sections.find(s => s.services.some(x => x.id === flat[modalIdx].id))?.name || ''} · ${
            modalIdx + 1
          } of ${flat.length}`}
          galleryImages={serviceGallery[flat[modalIdx].id] ?? []}
          onClose={() => setModalId(null)}
          onNav={navModal}
        />
      )}
    </div>
  );
};

export default ServiceMenuPage;
