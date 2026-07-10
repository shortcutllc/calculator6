import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { SENDER_TO_CALENDAR } from '../utils/workhumanOutreachTemplates';

const DEFAULT_REP = 'Will Newton';

/**
 * Resolve a rep name to a Google Calendar booking URL.
 * Full appointment-schedule links (/appointments/schedules/<id>) embed in an
 * iframe via ?gv=true. Short calendar.app.google links can't be framed, so
 * those return embedUrl=null and we render an "open in new tab" button instead.
 */
function resolveBooking(rep: string | null): { embedUrl: string | null; openUrl: string; repFirst: string } {
  const name = rep && SENDER_TO_CALENDAR[rep as keyof typeof SENDER_TO_CALENDAR] ? rep : DEFAULT_REP;
  const openUrl =
    SENDER_TO_CALENDAR[name as keyof typeof SENDER_TO_CALENDAR] ||
    SENDER_TO_CALENDAR[DEFAULT_REP as keyof typeof SENDER_TO_CALENDAR] ||
    '';
  const m = openUrl.match(/\/appointments\/schedules\/([^?]+)/);
  const embedUrl = m ? `https://calendar.google.com/calendar/appointments/schedules/${m[1]}?gv=true` : null;
  return { embedUrl, openUrl, repFirst: name.split(' ')[0] };
}

// Per-service demo videos (sourced from the getshortcut.co "Redefining employee
// wellness." section). Hosted in this app's Supabase storage — public bucket
// 'landing-videos'. Update VIDEO_BASE/bucket if the files are uploaded elsewhere.
// Currently served from Shortcut's Sanity CDN (the getshortcut.co assets).
// ⚠️ massage is a 128 MB master — optimize before production (see _SUPABASE below;
// upload the compressed files to Supabase storage and switch SERVICE_VIDEOS to it).
const SANITY_BASE = 'https://cdn.sanity.io/files/7qf1r87p/production';
const SERVICE_VIDEOS = {
  // massage: self-hosted compressed clip (1.3 MB) — the Sanity master is a 128 MB
  // 4K file, far too heavy to autoplay. Served from our own origin (CSP 'self').
  massage: '/landing-videos/massage.mp4',
  hair: `${SANITY_BASE}/18b9a40847e1998ee315895f37e252a99713d430.mp4`,
  headshots: `${SANITY_BASE}/63356d4ab062a52e8810ad1c167873de43ac2e92.mp4`,
  nails: `${SANITY_BASE}/bedacf02fb1012735998d0d3bced32b95e18304f.mp4`,
  mindfulness: `${SANITY_BASE}/e94281566161c5674ab843b72e54b5ea39364609.mp4`,
};
// Optimized + self-hosted target (pending upload of ~/Downloads/shortcut-service-videos
// to a public 'landing-videos' bucket). Switch SERVICE_VIDEOS to this once uploaded.
const _VIDEO_BASE_SUPABASE = 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/landing-videos';
const SERVICE_VIDEO_CLASS = 'w-full max-w-md aspect-[4/5] object-cover rounded-3xl';
const SERVICE_VIDEO_STYLE = { boxShadow: '0 10px 40px rgba(0, 55, 86, 0.12)' };

// Hero montage (info-only variant): rotates through the service videos in place
// of the booking card. Same source URLs as the carousel, so they're cached, not
// re-downloaded.
const MONTAGE = [
  { label: 'Massage', src: SERVICE_VIDEOS.massage },
  { label: 'Hair & Makeup', src: SERVICE_VIDEOS.hair },
  { label: 'Professional Headshots', src: SERVICE_VIDEOS.headshots },
  { label: 'Luxe Nail Care', src: SERVICE_VIDEOS.nails },
  { label: 'Mindfulness', src: SERVICE_VIDEOS.mindfulness },
];

interface BookACallLandingRefreshProps {
  // When true (or when the page record has customization.infoOnly), render the
  // information-only variant: no booking card/modal/CTAs, a rotating service-video
  // montage in the hero, and a soft "learn more" link instead.
  infoMode?: boolean;
}

// SANDBOX: spine-driven copy refresh of BookACallLanding. Isolated route
// (/book-a-call-refresh, /info-refresh) so we can test/iterate without
// touching the live /book-a-call page. Same DB plumbing + design.
const BookACallLandingRefresh: React.FC<BookACallLandingRefreshProps> = ({ infoMode = false }) => {
  const { id } = useParams<{ id?: string }>();

  // Page config loaded from DB (generic_landing_pages where page_type='workhuman')
  const [pageLoading, setPageLoading] = useState(!!id);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Info-only variant — driven by the route (infoMode prop) OR the record flag.
  const [infoOnly, setInfoOnly] = useState(false);
  const isInfo = infoMode || infoOnly;
  // Which team member owns this page → whose booking link gets embedded.
  const [bookingRep, setBookingRep] = useState<string>(DEFAULT_REP);
  const booking = resolveBooking(bookingRep);
  // Booking scheduler modal (opened from the branded card's CTA).
  const [showBooking, setShowBooking] = useState(false);
  // Hero montage rotation (info variant only).
  const [montageIdx, setMontageIdx] = useState(0);
  useEffect(() => {
    if (!isInfo) return;
    const t = setInterval(() => setMontageIdx((i) => (i + 1) % MONTAGE.length), 4200);
    return () => clearInterval(t);
  }, [isInfo]);

  // Lock body scroll + close on Escape while the booking modal is open.
  useEffect(() => {
    if (!showBooking) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowBooking(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showBooking]);

  // Hero typewriter animation
  const [heroVisible, setHeroVisible] = useState(false);

  // Services carousel state
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const serviceOrder = ['massage', 'hair-makeup', 'headshot', 'nails', 'mindfulness'];

  // Shortcut section animation
  const shortcutSectionRef = useRef<HTMLElement>(null);
  const [shortcutSectionInView, setShortcutSectionInView] = useState(false);

  // Load page config from DB if id param present
  useEffect(() => {
    if (!id) { setPageLoading(false); return; }

    const loadPageConfig = async () => {
      try {
        // Try UUID first, then unique_token
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = supabase.from('generic_landing_pages').select('*');
        if (isUuid) {
          query = query.eq('id', id);
        } else {
          query = query.eq('unique_token', id);
        }
        const { data, error } = await query.single();

        if (error && isUuid) {
          // Fallback: try as unique_token
          const { data: fallback } = await supabase
            .from('generic_landing_pages')
            .select('*')
            .eq('unique_token', id)
            .single();
          if (fallback) {
            applyPageConfig(fallback);
            return;
          }
        }

        if (data) {
          applyPageConfig(data);
        }
      } catch (err) {
        console.error('Failed to load page config:', err);
      } finally {
        setPageLoading(false);
      }
    };

    const applyPageConfig = (data: any) => {
      const partnerName = data.data?.partnerName || null;
      const partnerLogo = data.data?.partnerLogoUrl || null;
      const rep = data.customization?.bookingRep || null;

      setCompanyName(partnerName);
      setLogoUrl(partnerLogo);
      if (rep) setBookingRep(rep);
      if (data.customization?.infoOnly) setInfoOnly(true);

      // Track the view (fire and forget; skip bots via prerender UA check).
      // Phase 3: after the count increments, also fire a Slack ping to the
      // lead owner — debounced + threshold-gated server-side, so it's safe
      // to fire on every view.
      const token = data.unique_token;
      if (token && typeof navigator !== 'undefined' && !/bot|crawler|spider|prerender|headless/i.test(navigator.userAgent || '')) {
        supabase.rpc('track_landing_page_view', { page_unique_token: token })
          .then(({ error: rpcErr }) => {
            if (rpcErr) { console.warn('View tracking failed:', rpcErr.message); return; }
            // Fire-and-forget the ping. Server enforces threshold + debounce.
            fetch('/.netlify/functions/lp-view-ping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ unique_token: token }),
            }).catch((e) => console.warn('lp-view-ping failed (non-fatal):', e));
          });
      }
    };

    loadPageConfig();
  }, [id]);

  // Hero typewriter reveal
  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Header shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      const header = document.getElementById('recharge-header');
      if (!header) return;
      if (window.scrollY > 100) {
        header.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      } else {
        header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for ShortcutSection scroll-into-view animation
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setShortcutSectionInView(true);
    }, 300);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio >= 0.25) {
            setShortcutSectionInView(true);
          }
        });
      },
      {
        threshold: [0.1, 0.25, 0.30, 0.35],
        rootMargin: '0px',
      }
    );

    if (shortcutSectionRef.current) {
      observer.observe(shortcutSectionRef.current);
      setTimeout(() => {
        if (shortcutSectionRef.current) {
          const rect = shortcutSectionRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const elementTop = rect.top;
          const elementHeight = rect.height;
          const visibleHeight = Math.min(viewportHeight - elementTop, elementHeight);
          const visibleRatio = visibleHeight / elementHeight;
          if (visibleRatio >= 0.1) {
            setShortcutSectionInView(true);
          }
        }
      }, 100);
    }

    return () => {
      clearTimeout(fallbackTimer);
      if (shortcutSectionRef.current) {
        observer.unobserve(shortcutSectionRef.current);
      }
    };
  }, []);

  // Track current service index for arrow labels
  useEffect(() => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement | null;
    if (!scrollContainer) return;

    const onScroll = () => {
      const slideWidth = scrollContainer.clientWidth || 1;
      const scrollLeft = scrollContainer.scrollLeft;
      const index = Math.round(scrollLeft / slideWidth);
      const clampedIndex = Math.max(0, Math.min(index, serviceOrder.length - 1));
      setCurrentServiceIndex(clampedIndex);
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    scrollContainer.addEventListener('scrollend', onScroll, { passive: true });
    onScroll();

    const onResize = () => {
      setTimeout(onScroll, 100);
    };
    window.addEventListener('resize', onResize);

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll as EventListener);
      scrollContainer.removeEventListener('scrollend', onScroll as EventListener);
      window.removeEventListener('resize', onResize);
    };
  }, [serviceOrder.length]);

  // Intersection Observer for fade-in animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          setTimeout(() => {
            (entry.target as HTMLElement).style.willChange = 'auto';
          }, 500);
        }
      });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in-section');
    fadeElements.forEach((el) => observer.observe(el));

    return () => {
      fadeElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // FAQ open/closed state (controlled via React)
  const [openFaqIdxs, setOpenFaqIdxs] = useState<Set<number>>(new Set());
  const toggleFaq = (idx: number) => {
    setOpenFaqIdxs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Custom smooth scroll with easing
  // Primary CTA action: scroll to the booking card, or (info variant) open the
  // main site since there's no booking on the page.
  const goPrimary = () => {
    if (isInfo) window.open('https://getshortcut.co', '_blank', 'noopener');
    else smoothScrollTo('book');
  };

  const smoothScrollTo = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    document.documentElement.classList.add('scrolling');

    const startPosition = window.pageYOffset;
    const targetPosition = target.getBoundingClientRect().top + startPosition - 80;
    const distance = targetPosition - startPosition;
    const duration = 700;
    let start: number | null = null;

    const easing = (t: number): number => {
      return t < 0.5
        ? 8 * t * t * t * t
        : 1 - 8 * (--t) * t * t * t;
    };

    const animation = (currentTime: number) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easing(progress);

      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        document.documentElement.classList.remove('scrolling');
      }
    };

    requestAnimationFrame(animation);
  };

  const scrollToService = (serviceIndex: number) => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement;
    if (!scrollContainer) return;

    const slideWidth = scrollContainer.clientWidth;

    scrollContainer.scrollTo({
      left: serviceIndex * slideWidth,
      behavior: 'smooth'
    });
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="workhuman-recharge-page" style={{ backgroundColor: '#f8fafc' }}>
      {/* ==================== MAIN CSS ==================== */}
      <style>{`
        /* Mobile-first optimizations */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }

        /* Smooth scrolling with custom easing */
        html {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        /* Disable smooth scroll during JS animation to prevent conflicts */
        html.scrolling {
          scroll-behavior: auto;
        }

        .workhuman-recharge-page {
          font-family: 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial;
          color: #003756;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .container-narrow {
          max-width: 1200px;
        }

        /* Mobile-optimized images */
        img {
          max-width: 100%;
          height: auto;
          display: block;
        }

        /* GPU acceleration for transforms */
        .fade-in-section,
        img,
        button {
          will-change: transform;
          transform: translate3d(0, 0, 0);
        }

        /* Fade-in animations with GPU acceleration */
        .fade-in-section {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        .fade-in-section.is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        /* Disable animations on mobile for better performance */
        @media (max-width: 768px) {
          .fade-in-section.is-visible > * {
            animation: none !important;
          }
        }

        /* Stagger animation for desktop only */
        @media (min-width: 769px) {
          .fade-in-section.is-visible > * {
            animation: fadeInUp 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
          }

          .fade-in-section.is-visible > *:nth-child(1) { animation-delay: 0.03s; }
          .fade-in-section.is-visible > *:nth-child(2) { animation-delay: 0.06s; }
          .fade-in-section.is-visible > *:nth-child(3) { animation-delay: 0.09s; }
          .fade-in-section.is-visible > *:nth-child(4) { animation-delay: 0.12s; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* Typography hierarchy - optimized for mobile */
        .h1 { font-weight: 800; line-height: 1.12; letter-spacing: -0.01em; }
        @media (min-width: 320px) { .h1 { font-size: 2.25rem; } }
        @media (min-width: 768px) { .h1 { font-size: 3.25rem; } }
        @media (min-width: 1024px) { .h1 { font-size: 3.75rem; } }

        .section-title { font-weight: 800; line-height: 1.15; }
        @media (min-width: 320px) { .section-title { font-size: 1.5rem; } }
        @media (min-width: 768px) { .section-title { font-size: 2.5rem; } }
        @media (min-width: 1024px) { .section-title { font-size: 3rem; } }

        .section-subtitle { font-weight: 600; line-height: 1.3; }
        @media (min-width: 320px) { .section-subtitle { font-size: 1.125rem; } }
        @media (min-width: 768px) { .section-subtitle { font-size: 1.5rem; } }

        /* Body text optimization for mobile */
        p, li {
          font-size: 1rem;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          p, li {
            font-size: 0.9375rem;
            line-height: 1.65;
          }

          /* Reduce padding on mobile */
          .container-narrow {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          /* Optimize button sizes for mobile */
          button {
            font-size: 0.9375rem;
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
          }

          /* Reduce gap spacing on mobile */
          .gap-16 { gap: 2rem; }
          .gap-20 { gap: 2.5rem; }
        }

        /* Touch-friendly buttons */
        button, a {
          min-height: 44px;
          min-width: 44px;
        }

        /* Scrollbars */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .services-scroll {
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
        }

        .service-slide {
          scroll-snap-align: start;
        }

        /* Logo scroller - SIMPLIFIED */
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .logo-track {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }

        .logo-track:hover {
          animation-play-state: paused;
        }

        .logo-set {
          display: flex;
          align-items: center;
          gap: 3rem;
        }

        .logo-set img {
          height: 3rem;
          width: 10rem;
          flex-shrink: 0;
          filter: brightness(0) saturate(100%) invert(27%) sepia(100%) saturate(2000%) hue-rotate(200deg) brightness(0.3) contrast(1.2);
          opacity: 0.9;
          transition: opacity 0.3s ease;
          object-fit: contain;
          object-position: center;
        }

        .logo-set img:hover {
          opacity: 1;
        }

        /* Make Betterment logo larger within the same container */
        .logo-set img[alt="Betterment"] {
          transform: scale(1.5);
        }

        /* Testimonial section */
        .testimonial-banner {
          background-color: #ffffff;
          padding: clamp(3rem, 7vw, 4.75rem) 0;
        }

        .testimonial-wrap {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 clamp(1.5rem, 4vw, 2.5rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(3rem, 7vw, 6rem);
        }

        .testimonial-copy {
          flex: 1.3;
          display: grid;
          grid-template-columns: min-content 1fr;
          align-items: start;
          gap: clamp(1rem, 3vw, 1.75rem);
        }

        .testimonial-copy .quote-mark {
          font-weight: 700;
          font-size: 4rem;
          line-height: 0.8;
          color: #40C4BE;
          opacity: 0.9;
          transform: translateY(-0.2em);
        }

        @media (min-width: 768px) {
          .testimonial-copy .quote-mark {
            font-size: 5rem;
          }
        }

        @media (min-width: 1024px) {
          .testimonial-copy .quote-mark {
            font-size: 6rem;
          }
        }

        .testimonial-copy blockquote {
          margin: 0;
          font-size: 1.5rem;
          line-height: 1.35;
          font-weight: 500;
          color: #003756;
        }

        @media (min-width: 768px) {
          .testimonial-copy blockquote {
            font-size: 2rem;
          }
        }

        @media (min-width: 1024px) {
          .testimonial-copy blockquote {
            font-size: 2.25rem;
          }
        }

        .testimonial-side {
          flex: 0.85;
          display: flex;
          justify-content: flex-end;
        }

        .testimonial-identity {
          display: flex;
          align-items: center;
          gap: clamp(2rem, 3.5vw, 3.5rem);
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: clamp(0.9rem, 2.2vw, 1.25rem);
        }

        .testimonial-author .photo {
          width: clamp(3.4rem, 4.4vw, 4rem);
          height: clamp(3.4rem, 4.4vw, 4rem);
          min-width: 3.4rem;
          min-height: 3.4rem;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #40C4BE;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .testimonial-author .photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .testimonial-author .meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          text-align: left;
          align-items: flex-start;
        }

        .testimonial-author .meta .name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #003756;
          line-height: 1.2;
        }

        .testimonial-author .meta .title {
          font-size: 0.9rem;
          color: rgba(0, 55, 86, 0.75);
          line-height: 1.3;
        }

        .partner-logo {
          width: clamp(8rem, 12vw, 10rem);
          height: auto;
          filter: brightness(0) saturate(100%) invert(27%) sepia(100%) saturate(2000%) hue-rotate(200deg) brightness(0.3) contrast(1.2);
        }

        @media (max-width: 900px) {
          .testimonial-wrap {
            flex-direction: column;
            align-items: flex-start;
          }

          .testimonial-identity {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
          }

          .testimonial-side {
            justify-content: flex-start;
            width: 100%;
          }
        }

        /* Shortcut section card CSS */
        .shortcut-section-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .shortcut-section-card:hover {
          transform: scale(1.02);
        }
        .shortcut-section-card:active {
          transform: scale(0.98);
        }
        .shortcut-checklist-container {
          position: relative;
          height: 315px;
          overflow: hidden;
        }
        .shortcut-checklist-scroll {
          position: relative;
          z-index: 1;
          animation: scrollChecklist 22s linear infinite;
          will-change: transform;
        }
        @keyframes scrollChecklist {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(calc(-50% - 26px));
          }
        }
        .shortcut-checklist-mask {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          background: linear-gradient(to bottom,
            rgba(252, 242, 254, 1) 0%,
            rgba(252, 242, 254, 0) 8%,
            rgba(252, 242, 254, 0) 92%,
            rgba(252, 242, 254, 1) 100%);
        }
        .shortcut-checklist-container[data-card="calm"] .shortcut-checklist-mask {
          background: linear-gradient(to bottom,
            rgba(229, 252, 254, 1) 0%,
            rgba(229, 252, 254, 0) 8%,
            rgba(229, 252, 254, 0) 92%,
            rgba(229, 252, 254, 1) 100%);
        }
        .shortcut-checkbox {
          width: 33px;
          height: 33px;
          border-radius: 17px;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .shortcut-check-icon {
          width: 15px;
          height: 10px;
        }
        .shortcut-plus-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .shortcut-plus-icon svg {
          width: 100%;
          height: 100%;
        }
        .shortcut-checklist-item {
          opacity: 0;
          transform: translateY(8px);
          transition: none;
        }
        /* Animate bullets when section comes into view */
        .shortcut-section-in-view .shortcut-checklist-item {
          animation: fadeInBullet 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(1) { animation-delay: 0s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(2) { animation-delay: 0.175s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(3) { animation-delay: 0.35s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(4) { animation-delay: 0.525s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(5) { animation-delay: 0.7s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(6) { animation-delay: 0s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(7) { animation-delay: 0.175s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(8) { animation-delay: 0.35s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(9) { animation-delay: 0.525s; }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(10) { animation-delay: 0.7s; }
        @keyframes fadeInBullet {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 0.95;
            transform: translateY(0);
          }
        }
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(1),
        .shortcut-section-in-view .shortcut-checklist-item:nth-child(6) {
          animation-name: fadeInBulletStrong;
        }
        @keyframes fadeInBulletStrong {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* Hero typewriter animations */
        @keyframes wave-hand {
          0%, 100% { transform: rotate(0deg); transform-origin: 70% 70%; }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
        }
        @keyframes tagline-pan-up {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ==================== HEADER ==================== */}
      <header id="recharge-header" className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 rounded-b-3xl">
        <div className="mx-auto container-narrow px-4 py-4 flex items-center justify-between">
          {/* Left Side - Partner Logo or Company Name */}
          <div className="flex items-center flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName || 'Partner'}
                className="h-8 sm:h-10 w-auto object-contain"
                style={{ maxWidth: '120px' }}
              />
            ) : companyName ? (
              <span className="text-sm font-medium text-gray-600">
                {companyName}
              </span>
            ) : null}
          </div>

          {/* Navigation Menu - Centered (hidden on mobile) */}
          <nav className="hidden lg:flex flex-1 items-center justify-center text-sm font-bold">
            {!isInfo && (
              <a
                href="#book"
                onClick={(e) => { e.preventDefault(); smoothScrollTo('book'); }}
                className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
              >
                Book a Call
              </a>
            )}
            <a
              href="#services"
              onClick={(e) => { e.preventDefault(); smoothScrollTo('services'); }}
              className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
            >
              Services
            </a>
            <a
              href="#testimonials"
              onClick={(e) => { e.preventDefault(); smoothScrollTo('testimonials'); }}
              className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              onClick={(e) => { e.preventDefault(); smoothScrollTo('faq'); }}
              className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
            >
              FAQ
            </a>
          </nav>

          {/* Shortcut Logo - Right Side */}
          <a href="#top" onClick={(e) => { e.preventDefault(); smoothScrollTo('top'); }} className="flex items-center" aria-label="Shortcut logo - return to top">
            <svg id="recharge-logo-svg" viewBox="0 0 192 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M29.6284 21.5003C29.3713 23.7505 28.6818 25.9572 27.3774 27.8371C24.2946 32.28 18.9846 33.7633 13.7386 32.1453C8.56113 30.5486 3.54006 26.0287 0 18.7044L4.84254 16.3639C7.92552 22.7425 11.9483 25.9647 15.3237 27.0057C18.6305 28.0256 21.3824 27.0423 22.9585 24.7709C23.2395 24.366 23.481 23.9084 23.6808 23.4043C23.3774 23.4209 23.0738 23.4262 22.7704 23.4206C19.2805 23.3553 16.0856 21.8408 13.6813 19.7541C11.2932 17.6815 9.45986 14.8481 8.92523 11.8407C8.36688 8.69984 9.26489 5.39496 12.2773 3.08642C13.6869 2.00611 15.2332 1.36494 16.8596 1.24094C18.4816 1.11728 19.9964 1.52212 21.3267 2.23502C23.9138 3.62146 25.9253 6.22268 27.2987 9.01314C28.1685 10.7806 28.8433 12.7443 29.2624 14.7619C31.6786 12.1765 34.3066 10.6389 36.5311 9.77503C37.6804 9.3287 38.7381 9.05577 39.6253 8.91256C40.403 8.78701 41.3422 8.71138 42.1247 8.89196L40.9153 14.1327C41.0086 14.1543 41.0586 14.1618 41.0586 14.1618C41.0583 14.1658 40.8815 14.1579 40.4824 14.2223C39.98 14.3034 39.2871 14.4746 38.4782 14.7887C36.8668 15.4145 34.8583 16.5824 32.995 18.6489C31.9331 19.8266 30.8025 20.7717 29.6284 21.5003ZM24.3046 17.9209C24.1028 15.671 23.4436 13.3605 22.4729 11.3882C21.3666 9.14038 20.0076 7.63027 18.7861 6.97569C18.2121 6.66808 17.7132 6.56999 17.2685 6.60389C16.8283 6.63745 16.255 6.81433 15.5489 7.35549C14.3296 8.28987 13.9682 9.47863 14.2207 10.8994C14.497 12.4535 15.5449 14.2498 17.2067 15.692C18.8522 17.1202 20.8758 18.0057 22.871 18.043C23.3362 18.0517 23.8156 18.0149 24.3046 17.9209Z"
                fill="#FF5050" />
              <path fillRule="evenodd" clipRule="evenodd"
                d="M37.5033 11.1947C34.926 10.3834 32.9956 8.72285 31.3895 6.90729L35.4947 3.27552C36.7809 4.72933 37.9135 5.57753 39.149 5.96641C40.3556 6.34619 42.0247 6.40038 44.5918 5.54394L46.8242 10.5201C44.9245 11.6113 43.8736 13.3885 43.3764 15.227C43.1283 16.1444 43.035 17.0253 43.0393 17.7413C43.0437 18.4635 43.1448 18.831 43.1572 18.8761C43.1582 18.8799 43.1583 18.8806 43.1583 18.8806L38.1127 21.0218C37.7142 20.0827 37.565 18.8953 37.5583 17.7744C37.5511 16.586 37.7026 15.2115 38.0853 13.7961C38.2848 13.0585 38.5517 12.2956 38.8993 11.5353C38.4247 11.4518 37.9596 11.3383 37.5033 11.1947Z"
                fill="#FF5050" />
              <path d="M182.038 29.4766V5.46692H187.385V29.4766H182.038ZM178.194 17.0349V12.4916H191.23V17.0349H178.194Z"
                fill="#175071" />
              <path
                d="M167.362 29.861C165.801 29.861 164.415 29.5465 163.203 28.9174C162.015 28.265 161.083 27.3797 160.408 26.2613C159.732 25.1197 159.394 23.8149 159.394 22.3471V12.4916H164.741V22.2772C164.741 22.8597 164.834 23.3606 165.021 23.78C165.23 24.1994 165.533 24.5255 165.929 24.7585C166.326 24.9915 166.803 25.108 167.362 25.108C168.154 25.108 168.784 24.8634 169.25 24.3741C169.716 23.8615 169.949 23.1625 169.949 22.2772V12.4916H175.296V22.3121C175.296 23.8033 174.958 25.1197 174.282 26.2613C173.606 27.3797 172.675 28.265 171.486 28.9174C170.298 29.5465 168.923 29.861 167.362 29.861Z"
                fill="#175071" />
              <path
                d="M150.08 29.8609C148.332 29.8609 146.748 29.4765 145.327 28.7076C143.906 27.9388 142.787 26.8787 141.972 25.5273C141.156 24.176 140.749 22.6615 140.749 20.984C140.749 19.2832 141.156 17.7687 141.972 16.4407C142.81 15.0893 143.941 14.0292 145.362 13.2604C146.783 12.4915 148.379 12.1071 150.15 12.1071C151.478 12.1071 152.689 12.34 153.784 12.806C154.903 13.2487 155.893 13.9244 156.755 14.833L153.33 18.258C152.934 17.8153 152.468 17.4891 151.932 17.2794C151.419 17.0698 150.825 16.9649 150.15 16.9649C149.381 16.9649 148.694 17.1396 148.088 17.4891C147.505 17.8153 147.039 18.2813 146.69 18.8871C146.364 19.4696 146.201 20.1569 146.201 20.949C146.201 21.7412 146.364 22.4402 146.69 23.046C147.039 23.6517 147.517 24.1294 148.123 24.4789C148.728 24.8283 149.404 25.0031 150.15 25.0031C150.849 25.0031 151.466 24.8866 152.002 24.6536C152.561 24.3973 153.039 24.0478 153.435 23.6051L156.825 27.0301C155.94 27.9621 154.938 28.6727 153.819 29.162C152.701 29.6279 151.454 29.8609 150.08 29.8609Z"
                fill="#175071" />
              <path d="M129.93 29.4766V5.46692H135.277V29.4766H129.93ZM126.086 17.0349V12.4916H139.122V17.0349H126.086Z"
                fill="#175071" />
              <path
                d="M110.973 29.4766V12.4916H116.32V29.4766H110.973ZM116.32 20.1453L114.084 18.3979C114.526 16.4175 115.272 14.8797 116.32 13.7847C117.369 12.6896 118.825 12.1421 120.689 12.1421C121.504 12.1421 122.215 12.2702 122.821 12.5265C123.45 12.7595 123.997 13.1323 124.463 13.6449L121.283 17.664C121.05 17.4077 120.759 17.2096 120.409 17.0698C120.06 16.93 119.664 16.8601 119.221 16.8601C118.336 16.8601 117.625 17.1397 117.089 17.6989C116.577 18.2348 116.32 19.0503 116.32 20.1453Z"
                fill="#175071" />
              <path
                d="M99.0146 29.8609C97.2672 29.8609 95.6828 29.4765 94.2616 28.7076C92.8636 27.9155 91.7569 26.8437 90.9415 25.4924C90.126 24.141 89.7183 22.6266 89.7183 20.949C89.7183 19.2715 90.126 17.7687 90.9415 16.4407C91.7569 15.1126 92.8636 14.0642 94.2616 13.2953C95.6595 12.5031 97.2439 12.1071 99.0146 12.1071C100.785 12.1071 102.37 12.4915 103.768 13.2604C105.166 14.0292 106.272 15.0893 107.088 16.4407C107.903 17.7687 108.311 19.2715 108.311 20.949C108.311 22.6266 107.903 24.141 107.088 25.4924C106.272 26.8437 105.166 27.9155 103.768 28.7076C102.37 29.4765 100.785 29.8609 99.0146 29.8609ZM99.0146 25.0031C99.7835 25.0031 100.459 24.84 101.042 24.5138C101.624 24.1643 102.067 23.6867 102.37 23.0809C102.696 22.4518 102.859 21.7412 102.859 20.949C102.859 20.1569 102.696 19.4696 102.37 18.8871C102.043 18.2813 101.589 17.8153 101.007 17.4891C100.447 17.1396 99.7835 16.9649 99.0146 16.9649C98.269 16.9649 97.605 17.1396 97.0225 17.4891C96.44 17.8153 95.9857 18.2813 95.6595 18.8871C95.3333 19.4929 95.1702 20.1918 95.1702 20.984C95.1702 21.7529 95.3333 22.4518 95.6595 23.0809C95.9857 23.6867 96.44 24.1643 97.0225 24.5138C97.605 24.84 98.269 25.0031 99.0146 25.0031Z"
                fill="#175071" />
              <path
                d="M81.6902 29.4766V19.7958C81.6902 18.9104 81.4106 18.1998 80.8514 17.6639C80.3155 17.1048 79.6282 16.8252 78.7894 16.8252C78.207 16.8252 77.6944 16.9533 77.2517 17.2096C76.809 17.4426 76.4595 17.7921 76.2032 18.2581C75.947 18.7007 75.8188 19.2133 75.8188 19.7958L73.7568 18.7823C73.7568 17.4542 74.0364 16.2893 74.5956 15.2874C75.1548 14.2856 75.9353 13.5167 76.9372 12.9808C77.939 12.4216 79.0923 12.1421 80.3971 12.1421C81.7251 12.1421 82.8901 12.4216 83.8919 12.9808C84.8938 13.5167 85.6627 14.2739 86.1985 15.2525C86.7577 16.2077 87.0373 17.3261 87.0373 18.6075V29.4766H81.6902ZM70.4717 29.4766V4.10388H75.8188V29.4766H70.4717Z"
                fill="#175071" />
              <path
                d="M60.4075 29.896C59.4057 29.896 58.4154 29.7678 57.4369 29.5116C56.4816 29.2553 55.5846 28.8941 54.7458 28.4282C53.9304 27.9389 53.2314 27.3797 52.6489 26.7506L55.6895 23.6751C56.2486 24.2809 56.9127 24.7585 57.6815 25.108C58.4504 25.4342 59.2892 25.5973 60.1978 25.5973C60.8269 25.5973 61.3045 25.5041 61.6307 25.3177C61.9802 25.1313 62.1549 24.875 62.1549 24.5489C62.1549 24.1295 61.9452 23.8149 61.5259 23.6052C61.1298 23.3723 60.6172 23.1742 59.9881 23.0111C59.3591 22.8247 58.695 22.6267 57.9961 22.417C57.2971 22.2073 56.6331 21.9161 56.004 21.5433C55.3749 21.1705 54.8623 20.6579 54.4663 20.0055C54.0702 19.3299 53.8721 18.4795 53.8721 17.4543C53.8721 16.3592 54.1517 15.4156 54.7109 14.6235C55.2701 13.808 56.0622 13.1673 57.0874 12.7013C58.1126 12.2353 59.3125 12.0023 60.6871 12.0023C62.1316 12.0023 63.4597 12.2586 64.6712 12.7712C65.9061 13.2605 66.9079 13.9944 67.6768 14.9729L64.6363 18.0484C64.1004 17.4193 63.4946 16.9767 62.819 16.7204C62.1666 16.4641 61.5259 16.3359 60.8968 16.3359C60.291 16.3359 59.8367 16.4291 59.5338 16.6155C59.2309 16.7786 59.0795 17.0233 59.0795 17.3495C59.0795 17.6989 59.2775 17.9785 59.6736 18.1882C60.0697 18.3979 60.5823 18.5843 61.2113 18.7474C61.8404 18.9105 62.5044 19.1085 63.2034 19.3415C63.9024 19.5745 64.5664 19.889 65.1955 20.2851C65.8245 20.6812 66.3371 21.2171 66.7332 21.8928C67.1293 22.5451 67.3273 23.4072 67.3273 24.479C67.3273 26.1332 66.6983 27.4496 65.4401 28.4282C64.2053 29.4067 62.5277 29.896 60.4075 29.896Z"
                fill="#175071" />
            </svg>
          </a>
        </div>
      </header>

      {/* ==================== HERO + FORM (Split Layout) ==================== */}
      <section id="top" className="pt-[80px] pb-6 md:pb-10" style={{ background: 'linear-gradient(180deg, rgba(9, 54, 79, 0.05) 0%, rgba(248,250,252,1) 100%)' }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-10 md:pt-14 lg:pt-20">

          {/* Two-column grid: text left, form right */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-8 lg:gap-14 items-start">

            {/* ─── Left Column: Hero Text ─── */}
            <div className="min-w-0">
              <h1
                className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold mb-6 md:mb-8"
                style={{
                  color: '#003756',
                  letterSpacing: '-0.025em',
                  lineHeight: '1.15',
                }}
              >
                {/* Rest of headline types in word by word */}
                {(() => {
                  const bookingHeadline = companyName
                    ? `${companyName}, this meeting could've been a massage.`
                    : `This meeting could've been a massage.`;
                  const words = (isInfo
                    ? `We turn your conference room into a spa for the day. Your team actually shows up.`
                    : bookingHeadline).split(' ');
                  return words.map((word, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        opacity: heroVisible ? 1 : 0,
                        animation: heroVisible
                          ? `tagline-pan-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${0.4 + i * 0.07}s backwards`
                          : 'none',
                      }}
                    >
                      {word}&nbsp;
                    </span>
                  ));
                })()}
              </h1>

              <p
                className="text-sm md:text-base lg:text-[17px] font-normal mb-6 md:mb-8"
                style={{
                  color: '#003756',
                  opacity: heroVisible ? 0.7 : 0,
                  lineHeight: '1.7',
                  transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                  transitionDelay: '1.6s',
                  maxWidth: '480px',
                }}
              >
                {isInfo
                  ? `Massage, nails, facials, and more, all from one team. You pick a date. We handle the rest.`
                  : <>We're Shortcut. Massage, nails, facials, and more, all from one team. You pick a date, we handle the rest. Grab a time below and we'll walk {companyName ? `the ${companyName}` : 'your'} team through what a Shortcut event could look like.</>}
              </p>

              {/* Social proof stats */}
              <div
                className="flex gap-8 md:gap-10 pt-1 pb-6"
                style={{
                  opacity: heroVisible ? 1 : 0,
                  transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                  transitionDelay: '2.2s',
                }}
              >
                <div>
                  <div className="text-xl md:text-2xl font-bold" style={{ color: '#003756' }}>500+</div>
                  <div className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: '#003756', opacity: 0.5 }}>Companies</div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold" style={{ color: '#003756' }}>90%+</div>
                  <div className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: '#003756', opacity: 0.5 }}>Appointment<br className="hidden md:block" /> Slots Filled</div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold" style={{ color: '#003756' }}>87%</div>
                  <div className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: '#003756', opacity: 0.5 }}>Rebook</div>
                </div>
              </div>

              {/* Price anchor — the confident, un-gated line. */}
              <p
                className="text-sm md:text-base font-medium mb-6"
                style={{
                  color: '#003756',
                  opacity: heroVisible ? 0.85 : 0,
                  transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                  transitionDelay: '2.4s',
                }}
              >
                Most first-time teams start with an event under $2,000. We'll tell you before the call, not after.
              </p>

              {/* Soft CTA (info variant only) — no booking, just a way to learn more. */}
              {isInfo && (
                <a
                  href="https://getshortcut.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm md:text-base font-semibold transition-all duration-200 hover:gap-3"
                  style={{
                    color: '#FF5050',
                    opacity: heroVisible ? 1 : 0,
                    transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) 2.4s, gap 0.2s',
                  }}
                >
                  Learn more at getshortcut.co &rarr;
                </a>
              )}

              {/* Partner logos live in the full-width strip below the grid. */}
            </div>

            {/* ─── Right Column: montage (info variant) or booking card ─── */}
            {isInfo ? (
              <div className="flex justify-center lg:justify-end">
                <div className="relative w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden" style={SERVICE_VIDEO_STYLE}>
                  {MONTAGE.map((m, i) => (
                    <video
                      key={i}
                      src={m.src}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ opacity: i === montageIdx ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}
                    />
                  ))}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0, 31, 31, 0.5), transparent)' }} />
                  <div className="absolute bottom-5 left-5">
                    <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)', color: '#003756' }}>
                      {MONTAGE[montageIdx].label}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
            <div id="book" className="lg:sticky lg:top-[88px]">
              <div className="bg-white rounded-2xl p-7 md:p-8" style={{ boxShadow: '0 4px 40px rgba(0, 55, 86, 0.08), 0 1px 3px rgba(0, 55, 86, 0.04)', border: '1px solid rgba(0, 55, 86, 0.06)' }}>
                {/* Eyebrow */}
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] mb-5" style={{ color: '#FF5050' }}>
                  15-min intro call
                </p>

                {/* Rep */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div
                    className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                    style={{ width: '52px', height: '52px', backgroundColor: '#003756', color: 'white', fontSize: '20px' }}
                  >
                    {booking.repFirst.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-tight" style={{ color: '#003756', letterSpacing: '-0.01em' }}>
                      Book a call with {booking.repFirst}
                    </h2>
                    <p className="text-xs font-medium uppercase tracking-wider mt-0.5" style={{ color: '#003756', opacity: 0.45 }}>
                      Shortcut
                    </p>
                  </div>
                </div>

                {/* Blurb */}
                <p className="text-sm mb-6" style={{ color: '#003756', opacity: 0.65, lineHeight: '1.65' }}>
                  Grab a time that works. We'll talk through your team, your space, and what a Shortcut event could look like.
                </p>

                {/* Bullets */}
                <ul className="space-y-3 mb-7">
                  {[
                    '15 minutes, no pressure',
                    'We handle all the planning and setup',
                    "We'll scope services and pricing for your team",
                  ].map((line, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span
                        className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{ width: '22px', height: '22px', backgroundColor: 'rgba(255, 80, 80, 0.12)' }}
                      >
                        <svg width="11" height="9" viewBox="0 0 14.3715 9.7279" fill="none">
                          <path d="M 1.215 4.8045 L 5.06625 8.5125 L 13.15675 1.215" stroke="#FF5050" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                        </svg>
                      </span>
                      <span className="text-sm" style={{ color: '#003756', opacity: 0.8 }}>{line}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {booking.embedUrl ? (
                  <button
                    type="button"
                    onClick={() => setShowBooking(true)}
                    className="w-full px-6 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-110"
                    style={{ backgroundColor: '#FF5050', color: 'white', boxShadow: '0 4px 16px rgba(255, 80, 80, 0.3)' }}
                  >
                    Pick a time &rarr;
                  </button>
                ) : (
                  <a
                    href={booking.openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-6 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-110"
                    style={{ backgroundColor: '#FF5050', color: 'white', boxShadow: '0 4px 16px rgba(255, 80, 80, 0.3)' }}
                  >
                    Pick a time &rarr;
                  </a>
                )}
              </div>
            </div>
            )}
          </div>

          {/* ─── Trust strip (full-width below the grid) ─── */}
          <div
            className="mt-14 md:mt-16 text-center"
            style={{
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
              transitionDelay: '2.4s',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.15em] mb-6 md:mb-8" style={{ color: '#003756', opacity: 0.5 }}>
              Trusted by Top Employers
            </p>
            <div className="overflow-hidden">
              <div className="logo-track">
                <div className="logo-set">
                  <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Wix.svg" alt="Wix" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Tripadvisor.svg" alt="Tripadvisor" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/BCG.svg" alt="BCG" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/PwC.svg" alt="PwC" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Viacom.svg" alt="Viacom" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Cencora.svg" alt="Cencora" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/MTV.svg" alt="MTV" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Paramount.svg" alt="Paramount" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Warner Bros.svg" alt="Warner Bros" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/White & Case.svg" alt="White & Case" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/betterment-logo-vector-2023.svg" alt="Betterment" loading="lazy" />
                </div>
                <div className="logo-set" aria-hidden="true">
                  <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Wix.svg" alt="Wix" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Tripadvisor.svg" alt="Tripadvisor" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/BCG.svg" alt="BCG" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/PwC.svg" alt="PwC" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Viacom.svg" alt="Viacom" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Cencora.svg" alt="Cencora" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/MTV.svg" alt="MTV" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Paramount.svg" alt="Paramount" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Warner Bros.svg" alt="Warner Bros" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/White & Case.svg" alt="White & Case" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/betterment-logo-vector-2023.svg" alt="Betterment" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== EMPLOYEE HAPPINESS SECTION ==================== */}
      <section
        id="about"
        className="fade-in-section w-full"
        style={{
          backgroundColor: '#175071',
          borderRadius: '48px 48px 0 0',
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          {/* Headline */}
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: '53px',
              color: '#FFFFFF',
              letterSpacing: '-0.56px',
              lineHeight: '60.48px',
              marginBottom: '20px',
            }}
          >
            Employee Happiness Delivered.
          </h2>

          {/* Problem line — surfaced early (spine's locked recognition line). */}
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: '22px',
              color: 'rgba(255, 255, 255, 0.75)',
              lineHeight: '1.5',
              maxWidth: '640px',
              marginBottom: '48px',
            }}
          >
            You've offered wellness before. This is the kind your team actually shows up for.
          </p>

          {/* Three Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — All in one (Coral) */}
            <div
              className="rounded-[16px] overflow-hidden"
              style={{ backgroundColor: '#FF5050', minHeight: '414px' }}
            >
              {/* Card image — fixed height */}
              <div style={{ height: '250px', overflow: 'hidden' }}>
                <img
                  src="/workhuman-recharge/card1-services.png"
                  alt="Book Massage, Manicure, Mindfulness, Headshots"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Text content — fixed position */}
              <div style={{ padding: '20px 32px 32px 32px' }}>
                <h3
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '27px',
                    color: '#FFFFFF',
                    letterSpacing: '-0.28px',
                    lineHeight: '33.6px',
                    marginBottom: '8px',
                  }}
                >
                  They Actually Show Up
                </h3>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '18px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    lineHeight: '25.2px',
                    margin: 0,
                    maxWidth: '320px',
                  }}
                >
                  Over 90% of appointment slots get filled at our events. Not another app nobody opens.
                </p>
              </div>
            </div>

            {/* Card 2 — Wellness that works (Teal) */}
            <div
              className="rounded-[16px] overflow-hidden"
              style={{ backgroundColor: '#9EFAFF', minHeight: '414px' }}
            >
              {/* Card image — fixed height */}
              <div style={{ height: '250px', overflow: 'hidden' }}>
                <img
                  src="/workhuman-recharge/card2-platform.png"
                  alt="Shortcut platform showing MTV booking interface"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Text content — fixed position */}
              <div style={{ padding: '20px 32px 32px 32px' }}>
                <h3
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '27px',
                    color: '#175071',
                    letterSpacing: '-0.28px',
                    lineHeight: '33.6px',
                    marginBottom: '8px',
                  }}
                >
                  You Approve a Date. That's It.
                </h3>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '18px',
                    color: '#003756',
                    lineHeight: '25.2px',
                    margin: 0,
                    maxWidth: '320px',
                  }}
                >
                  We handle the pros, the equipment, the scheduling, and the day itself. If it made work for you, we'd have failed.
                </p>
              </div>
            </div>

            {/* Card 3 — The feel good vendor (Pink) */}
            <div
              className="rounded-[16px] overflow-hidden"
              style={{ backgroundColor: '#F7BBFF', minHeight: '414px' }}
            >
              {/* Card image — fixed height with inner rounded container */}
              <div className="mx-4 mt-4 rounded-[21px] overflow-hidden" style={{ height: '234px' }}>
                <img
                  src="/workhuman-recharge/card3-team.png"
                  alt="Shortcut team member"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Text content — fixed position */}
              <div style={{ padding: '20px 32px 32px 32px' }}>
                <h3
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '27px',
                    color: '#003756',
                    letterSpacing: '-0.28px',
                    lineHeight: '33.6px',
                    marginBottom: '8px',
                  }}
                >
                  One Team, Your Whole Crew
                </h3>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '18px',
                    color: '#003756',
                    lineHeight: '25.2px',
                    margin: 0,
                    maxWidth: '320px',
                  }}
                >
                  Massage, nails, facials, and more on-site, plus live virtual sessions for your remote team. No one left out.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial — inside Employee Happiness section */}
          <div id="testimonials" className="mt-12 md:mt-16 pt-10 md:pt-12" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', scrollMarginTop: '88px' }}>
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <span style={{ fontWeight: 700, fontSize: 'clamp(3rem, 5vw, 4.5rem)', lineHeight: 0.8, color: '#40C4BE', opacity: 0.9 }}>&ldquo;</span>
                  <blockquote
                    style={{
                      fontFamily: "'Outfit', system-ui, sans-serif",
                      fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                      fontWeight: 500,
                      color: 'white',
                      lineHeight: 1.35,
                      margin: 0,
                      paddingTop: '8px',
                    }}
                  >
                    Shortcut has become an extension of the DraftKings family.
                  </blockquote>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <img
                  src="/Holiday Proposal/Parnter Logos/DraftKings.svg"
                  alt="DraftKings"
                  className="h-10 md:h-12 w-auto"
                  style={{ filter: 'brightness(0) invert(1)', opacity: 0.8 }}
                  loading="lazy"
                />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
                    <img
                      src="/Holiday Proposal/Testimonial Headshots /1745346365915.jpeg"
                      alt="Christian W."
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600, fontSize: '14px', color: 'white' }}>Christian W.</div>
                    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 400, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Head of Workplace Experience</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS (3 steps — each step carries a pillar) ==================== */}
      <section id="how-it-works" className="fade-in-section py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl md:text-5xl font-semibold text-center mb-12 md:mb-20"
            style={{ color: '#003756', letterSpacing: '-0.02em', lineHeight: '1.15' }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            <div>
              <div className="text-5xl md:text-6xl font-bold mb-4" style={{ color: '#FF5050', letterSpacing: '-0.03em' }}>1</div>
              <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: '#003756' }}>Pick a date.</h3>
              <p className="text-base md:text-lg" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.6' }}>
                Tell us the services and the day. That's your whole job.
              </p>
            </div>
            <div>
              <div className="text-5xl md:text-6xl font-bold mb-4" style={{ color: '#FF5050', letterSpacing: '-0.03em' }}>2</div>
              <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: '#003756' }}>We bring the spa.</h3>
              <p className="text-base md:text-lg" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.6' }}>
                Licensed pros, equipment, music, setup. Any conference room works.
              </p>
            </div>
            <div>
              <div className="text-5xl md:text-6xl font-bold mb-4" style={{ color: '#FF5050', letterSpacing: '-0.03em' }}>3</div>
              <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: '#003756' }}>Your team shows up.</h3>
              <p className="text-base md:text-lg" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.6' }}>
                Over 90% of slots fill, at every event we run. Then 87% of companies book again.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SERVICES CAROUSEL ==================== */}
      <section id="services" className="fade-in-section py-20 md:py-32 rounded-3xl overflow-hidden relative" style={{ backgroundColor: '#E0F2F7' }}>
        {/* Mobile swipe indicator */}
        <div className="md:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#003756', opacity: 0.7 }}>
              Swipe to explore
            </span>
            <svg className="w-4 h-4" style={{ color: '#003756', opacity: 0.7 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        {/* Service Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 md:mb-16 px-4 md:px-6">
          <button
            onClick={() => scrollToService(0)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#9EFAFF',
              color: '#003756'
            }}
          >
            Massage
          </button>
          <button
            onClick={() => scrollToService(1)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#FEDC64',
              color: '#003756'
            }}
          >
            Glam
          </button>
          <button
            onClick={() => scrollToService(2)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#9EFAFF',
              color: '#003756'
            }}
          >
            Headshots
          </button>
          <button
            onClick={() => scrollToService(3)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#F9CDFF',
              color: '#003756'
            }}
          >
            Nails
          </button>
          <button
            onClick={() => scrollToService(4)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#FEDC64',
              color: '#003756'
            }}
          >
            Mindfulness
          </button>
        </div>

        <div className="flex overflow-x-auto scrollbar-hide services-scroll">
          {/* RESET ZONE SERVICE */}
          <div className="w-full flex-shrink-0 service-slide flex items-center">
            <div className="mx-auto container-narrow px-6 w-full">
              <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                {/* Left Side - Text and Service Options */}
                <div>
                  <h2 className="text-3xl md:text-5xl font-semibold mb-4 md:mb-6" style={{ color: '#003756', letterSpacing: '-0.02em' }}>Massage</h2>
                  <p className="text-base md:text-lg font-medium mb-6 md:mb-8" style={{ color: '#003756', opacity: 0.6 }}>Chair or table, at your office</p>

                  <p className="text-base md:text-xl mb-8 md:mb-12" style={{ color: '#003756', opacity: 0.8, lineHeight: '1.6' }}>
                    We turn a conference room into a spa for the day. Chair or table massage from licensed, insured pros, booked in short slots your team actually fills. Over 90% of them, at every event we run.
                  </p>

                  {/* Service Options */}
                  <div className="space-y-6">
                    {/* First Row: Sports Massage and Compression */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Massage/icon.svg" alt="Sports Massage" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-semibold" style={{ color: '#003756' }}>Sports Massage</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Massage/icon-2.svg" alt="Compression" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-semibold" style={{ color: '#003756' }}>Compression Massage</span>
                      </div>
                    </div>

                    {/* Second Row: Express Facial */}
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Massage/icon-1.svg" alt="Express Facial" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-semibold" style={{ color: '#003756' }}>Express Facial</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Massage Video (self-hosted compressed clip) */}
                <div className="relative flex justify-center">
                  <video
                    src={SERVICE_VIDEOS.massage}
                    className={SERVICE_VIDEO_CLASS}
                    style={SERVICE_VIDEO_STYLE}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HAIR & MAKEUP SERVICE */}
          <div className="w-full flex-shrink-0 service-slide flex items-center">
            <div className="mx-auto container-narrow px-6 w-full">
              <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="text-3xl md:text-5xl font-semibold mb-4 md:mb-6" style={{ color: '#003756', letterSpacing: '-0.02em' }}>Hair & Makeup</h2>
                  <p className="text-lg font-medium mb-8" style={{ color: '#003756', opacity: 0.6 }}>Expert makeup, styling and barber services</p>

                  <p className="text-lg md:text-xl mb-12" style={{ color: '#003756', opacity: 0.8, lineHeight: '1.6' }}>
                    Barber cuts, styling, and makeup at the office. A polished look without anyone burning a Saturday errand on it.
                  </p>

                  {/* Feature Options */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* First Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon.svg" alt="Barber Cut" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Barber Cut</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-1.svg" alt="Beard Trim" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Beard Trim</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-2.svg" alt="Makeup" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Makeup</span>
                      </div>
                    </div>

                    {/* Second Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-3.svg" alt="Salon Cut & Style" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Salon Cut & Style</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-4.svg" alt="Hot Towel Shave" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Hot Towel Shave</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/Frame 1278723.svg" alt="Blowout" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Blowout</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Hair & Makeup Video */}
                <div className="relative flex justify-center">
                  <video
                    src={SERVICE_VIDEOS.hair}
                    className={SERVICE_VIDEO_CLASS}
                    style={SERVICE_VIDEO_STYLE}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* YEAR END HEADSHOTS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide flex items-center">
            <div className="mx-auto container-narrow px-6 w-full">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Professional Headshots</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Headshots + hair & makeup touch ups</h3>

                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Consistent, professional headshots for the whole team, shot in your office in one day. Optional hair and makeup touch-ups so everyone walks in camera-ready. Retouched and delivered within a week.
                  </p>

                  {/* Feature Options */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* First Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon.svg" alt="Outfit Guidance" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Outfit Guidance</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-2.svg" alt="Background Selection" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Background Selection</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-3.svg" alt="Fast Turnaround" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Fast 5-7 Day Turnaround</span>
                      </div>
                    </div>

                    {/* Second Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-1.svg" alt="Hair + Makeup Touchups" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Hair + Makeup Touchups</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-4.svg" alt="Flawless Retouching" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Flawless Retouching & Review</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/Frame 1278722.svg" alt="Pre & Event Day Support" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Pre & Event Day Support</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-10">
                    <button
                      onClick={goPrimary}
                      className="px-8 py-4 rounded-full text-base font-medium transition-all duration-300 hover:scale-105 min-h-[48px]"
                      style={{ backgroundColor: '#FF5050', color: 'white', boxShadow: '0 10px 40px rgba(255, 80, 80, 0.2)' }}
                    >
                      {isInfo ? 'Learn More' : 'Book a Call'}
                    </button>
                  </div>
                </div>

                {/* Right Side - Headshots Video */}
                <div className="relative flex justify-center">
                  <video
                    src={SERVICE_VIDEOS.headshots}
                    className={SERVICE_VIDEO_CLASS}
                    style={SERVICE_VIDEO_STYLE}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NAILS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide flex items-center">
            <div className="mx-auto container-narrow px-6 w-full">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Nails</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Manicures & pedicures at the office</h3>

                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Manicures and pedicures by licensed pros, right at the office. Classic or gel, in and out between meetings.
                  </p>

                  {/* Feature Options - 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon.svg" alt="Classic Manicure" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Classic Manicure</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon-2.svg" alt="Gel Manicure" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Gel Manicure</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon-1.svg" alt="Dry Pedicure" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Dry Pedicure</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon.svg" alt="Hand Treatments" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Hand Treatments</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Nails Video */}
                <div className="relative flex justify-center">
                  <video
                    src={SERVICE_VIDEOS.nails}
                    className={SERVICE_VIDEO_CLASS}
                    style={SERVICE_VIDEO_STYLE}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEASONAL MINDFULNESS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide flex items-center">
            <div className="mx-auto container-narrow px-6 w-full">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Mindfulness & Virtual</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>At your office or wherever your team works</h3>

                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Guided meditation and practical stress tools, live at your office or virtual for remote and hybrid teams. Same instructor each session, which is how participation sticks.
                  </p>

                  {/* Feature Options - 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon.svg" alt="Guided Meditation" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Guided Meditation</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon-1.svg" alt="Yoga" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Yoga</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon-2.svg" alt="Sound Bath" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Sound Bath</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon.svg" alt="Nutrition Coaching" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Nutrition Coaching</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Mindfulness Video */}
                <div className="relative flex justify-center">
                  <video
                    src={SERVICE_VIDEOS.mindfulness}
                    className={SERVICE_VIDEO_CLASS}
                    style={SERVICE_VIDEO_STYLE}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial moved into Employee Happiness section above */}

      {/* ==================== SLACK. ZOOM. SHORTCUT. SECTION ==================== */}
      <section
        ref={shortcutSectionRef}
        className={`fade-in-section py-20 md:py-32 rounded-3xl ${shortcutSectionInView ? 'shortcut-section-in-view' : ''}`}
        style={{ backgroundColor: '#F8F9FA' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-semibold mb-6 md:mb-8"
              style={{ color: '#003756', letterSpacing: '-0.02em', lineHeight: '1.15' }}
            >
              Slack. Zoom. <span style={{ color: '#FF5050' }}>Shortcut</span>.<br />
              One of these helps your team relax.
            </h2>
            <p
              className="text-base md:text-xl lg:text-2xl max-w-3xl mx-auto"
              style={{ color: '#003756', opacity: 0.7, lineHeight: '1.6' }}
            >
              Most perks get ignored. This one doesn't.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1 - Reset at work */}
            <div
              className="shortcut-section-card"
              style={{
                backgroundColor: '#fcf2fe',
                border: '1px solid rgba(0, 31, 31, 0.08)',
              }}
            >
              <div className="border border-solid rounded-[24px] pb-0" style={{ borderColor: 'rgba(0, 31, 31, 0.08)' }}>
                {/* Title and icon */}
                <div className="relative px-8 pt-[52px] pb-6">
                  <h3
                    className="text-[37px] leading-[43px] tracking-[-0.95px] m-0 font-medium"
                    style={{ color: '#001f1f' }}
                  >
                    Reset at Work
                  </h3>

                  {/* Plus icon button */}
                  <button
                    className="absolute right-8 top-8 flex items-center justify-center rounded-[20px]"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#e063c7',
                    }}
                    aria-label="Expand Reset at work"
                  >
                    <div className="shortcut-plus-icon">
                      <svg fill="none" viewBox="0 0 19.7345 19.7345">
                        <path d="M 9.86725 4.11175 L 9.86725 15.6228" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                        <path d="M 4.11175 9.86725 L 15.6228 9.86725" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                      </svg>
                    </div>
                  </button>
                </div>

                {/* Checklist items with scroll */}
                <div className="shortcut-checklist-container px-8 pb-6" data-card="reset">
                  <div className="shortcut-checklist-mask"></div>
                  <div className="shortcut-checklist-scroll">
                    <div className="space-y-[52px]">
                      {[
                        { text: 'On site. Zero planning required', boldText: 'Zero planning' },
                        { text: 'Chair and table massage', boldText: 'massage' },
                        { text: 'Grooming and self care', boldText: 'self care' },
                        { text: 'Headshots that people actually use', boldText: 'Headshots' },
                        { text: 'Pop up wellness experience', boldText: 'wellness' },
                      ].concat([
                        { text: 'On site. Zero planning required', boldText: 'Zero planning' },
                        { text: 'Chair and table massage', boldText: 'massage' },
                        { text: 'Grooming and self care', boldText: 'self care' },
                        { text: 'Headshots that people actually use', boldText: 'Headshots' },
                        { text: 'Pop up wellness experience', boldText: 'wellness' },
                      ]).map((item, idx) => (
                        <div key={idx} className="shortcut-checklist-item flex items-center gap-[11px]">
                          <div
                            className="shortcut-checkbox"
                            style={{
                              backgroundColor: '#fde5ff',
                              borderColor: 'rgba(224, 99, 199, 0.36)',
                            }}
                          >
                            <div className="shortcut-check-icon">
                              <svg fill="none" viewBox="0 0 14.3715 9.7279">
                                <path d="M 1.215 4.8045 L 5.06625 8.5125 L 13.15675 1.215" stroke="#b8337a" strokeLinecap="square" strokeWidth="2.43" />
                              </svg>
                            </div>
                          </div>
                          <p
                            className="m-0 text-[27px] leading-[36px] font-medium"
                            style={{ color: '#b8337a' }}
                          >
                            {item.boldText ? (
                              <>
                                {item.text.split(item.boldText).map((part, i) => (
                                  <span key={i}>
                                    {part}
                                    {i < item.text.split(item.boldText).length - 1 && (
                                      <strong className="font-bold">{item.boldText}</strong>
                                    )}
                                  </span>
                                ))}
                              </>
                            ) : (
                              item.text
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="px-8 pb-8">
                  <p
                    className="m-0 text-[19px] leading-[26px] font-normal opacity-64"
                    style={{ color: '#b8337a', minHeight: '52px' }}
                  >
                    Physical, on-site wellness that helps your team reset between meetings.
                  </p>
                </div>
              </div>

              {/* CTA strip */}
              <button
                onClick={() => smoothScrollTo('services')}
                className="w-full rounded-b-[24px] border-t-0 border-r border-b border-l border-solid flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                style={{
                  height: '82px',
                  backgroundColor: '#fab8ff',
                  borderColor: 'rgba(0, 31, 31, 0.08)',
                }}
              >
                <p
                  className="m-0 text-[18px] leading-[26px] font-medium text-center"
                  style={{ color: '#b8337a' }}
                >
                  See Services &rarr;
                </p>
              </button>
            </div>

            {/* Card 2 - Calm, delivered */}
            <div
              className="shortcut-section-card"
              style={{
                backgroundColor: '#E5FCFE',
                border: '1px solid rgba(0, 31, 31, 0.08)',
              }}
            >
              <div className="border border-solid rounded-[24px] pb-0" style={{ borderColor: 'rgba(0, 31, 31, 0.08)' }}>
                {/* Title and icon */}
                <div className="relative px-8 pt-[52px] pb-6">
                  <h3
                    className="text-[37px] leading-[43px] tracking-[-0.95px] m-0 font-medium"
                    style={{ color: '#001f1f' }}
                  >
                    Calm, Delivered
                  </h3>

                  {/* Plus icon button */}
                  <button
                    className="absolute right-8 top-8 flex items-center justify-center rounded-[20px]"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#018EA2',
                    }}
                    aria-label="Expand Calm, delivered"
                  >
                    <div className="shortcut-plus-icon">
                      <svg fill="none" viewBox="0 0 19.7345 19.7345">
                        <path d="M 9.86725 4.11175 L 9.86725 15.6228" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                        <path d="M 4.11175 9.86725 L 15.6228 9.86725" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                      </svg>
                    </div>
                  </button>
                </div>

                {/* Checklist items with scroll */}
                <div className="shortcut-checklist-container px-8 pb-6" data-card="calm">
                  <div className="shortcut-checklist-mask"></div>
                  <div className="shortcut-checklist-scroll">
                    <div className="space-y-[52px]">
                      {[
                        { text: 'One vendor. Multiple services', boldText: 'One vendor' },
                        { text: 'Simple scheduling and sign ups', boldText: 'Simple scheduling' },
                        { text: 'Nationwide provider network', boldText: 'Nationwide' },
                        { text: 'Consistent quarterly programs', boldText: 'Consistent' },
                        { text: 'Zero admin work', boldText: 'Zero admin' },
                      ].concat([
                        { text: 'One vendor. Multiple services', boldText: 'One vendor' },
                        { text: 'Simple scheduling and sign ups', boldText: 'Simple scheduling' },
                        { text: 'Nationwide provider network', boldText: 'Nationwide' },
                        { text: 'Consistent quarterly programs', boldText: 'Consistent' },
                        { text: 'Zero admin work', boldText: 'Zero admin' },
                      ]).map((item, idx) => (
                        <div key={idx} className="shortcut-checklist-item flex items-center gap-[11px]">
                          <div
                            className="shortcut-checkbox"
                            style={{
                              backgroundColor: '#D4F7FB',
                              borderColor: 'rgba(1, 142, 162, 0.36)',
                            }}
                          >
                            <div className="shortcut-check-icon">
                              <svg fill="none" viewBox="0 0 14.3715 9.7279">
                                <path d="M 1.215 4.8045 L 5.06625 8.5125 L 13.15675 1.215" stroke="#018EA2" strokeLinecap="square" strokeWidth="2.43" />
                              </svg>
                            </div>
                          </div>
                          <p
                            className="m-0 text-[27px] leading-[36px] font-medium"
                            style={{ color: '#018EA2' }}
                          >
                            {item.boldText ? (
                              <>
                                {item.text.split(item.boldText).map((part, i) => (
                                  <span key={i}>
                                    {part}
                                    {i < item.text.split(item.boldText).length - 1 && (
                                      <strong className="font-bold">{item.boldText}</strong>
                                    )}
                                  </span>
                                ))}
                              </>
                            ) : (
                              item.text
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="px-8 pb-8">
                  <p
                    className="m-0 text-[19px] leading-[26px] font-normal opacity-64"
                    style={{ color: '#018EA2', minHeight: '52px' }}
                  >
                    We handle the logistics so you don't have to.
                  </p>
                </div>
              </div>

              {/* CTA strip */}
              <button
                onClick={goPrimary}
                className="w-full rounded-b-[24px] border-t-0 border-r border-b border-l border-solid flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                style={{
                  height: '82px',
                  backgroundColor: '#9EFAFF',
                  borderColor: 'rgba(0, 31, 31, 0.08)',
                }}
              >
                <p
                  className="m-0 text-[18px] leading-[26px] font-medium text-center"
                  style={{ color: '#003756' }}
                >
                  {isInfo ? 'Learn More' : 'Book a Call'} &rarr;
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ SECTION ==================== */}
      <section id="faq" className="fade-in-section py-20 md:py-32 rounded-3xl" style={{ backgroundColor: 'white' }}>
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-center mb-12 md:mb-16" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'What happens on the call?',
                a: 'A quick, no-pressure conversation about your team, your space, and what you\'re looking for. We\'ll walk you through how a Shortcut event works and roughly what it costs.'
              },
              {
                q: 'What services do you offer?',
                a: 'Massage is where most teams start. We also do nails, facials, hair & makeup, professional headshots, and mindfulness, all run on-site by our own pros. For remote teams, we run it virtually. One team, one contract.'
              },
              {
                q: 'How does it work?',
                a: 'You pick the services and a date. We handle everything else: pros, equipment, scheduling, and setup. Your team just shows up.'
              },
              {
                q: 'We have a remote or hybrid team. Does this work for us?',
                a: 'Yes. On-site events run at your offices. For remote and hybrid teams we run live virtual sessions: mindfulness, yoga, sound baths, and nutrition coaching. Same team, so no one\'s left out.'
              },
              {
                q: 'Where do you operate?',
                a: 'Nationwide, in your offices. And virtually, for the people who work from home.'
              },
              {
                q: 'How much does it cost?',
                a: 'Most first-time teams start with an event under $2,000. It scales with services and headcount, and recurring programs earn a discount. Book a call and we\'ll turn it into an exact quote. No surprises.'
              },
              {
                q: 'How soon can we run an event?',
                a: 'Often within the same week, depending on your location and date. Let\'s talk and we\'ll find a time that works.'
              }
            ].map((faq, idx) => {
              const isOpen = openFaqIdxs.has(idx);
              return (
                <div key={idx} className="faq-item rounded-3xl p-8" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0, 55, 86, 0.1)' }}>
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="faq-question w-full text-left flex items-center justify-between text-xl font-semibold"
                    style={{ color: '#003756' }}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-icon text-2xl" style={{ color: '#003756', opacity: 0.6 }}>{isOpen ? '\u2212' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div>
                      <p className="mt-6 text-base" style={{ color: '#003756', opacity: 0.8, lineHeight: '1.6' }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      {/* ==================== FOOTER (ported from getshortcut.co) ==================== */}
      <footer className="bg-white px-4 md:px-6 pt-4 pb-10">
        <div className="max-w-[1380px] mx-auto grid gap-4 lg:gap-9">

          {/* Red CTA banner */}
          <div className="bg-[#FF5050] text-white rounded-[30px] lg:rounded-[50px] grid lg:grid-cols-2 gap-x-12 gap-y-10 pt-10 pb-8 px-6 lg:pt-14 lg:pb-14 lg:px-20 items-center">
            <div className="flex flex-col gap-6 md:gap-8">
              <h2 className="text-[40px] lg:text-[64px] font-extrabold leading-[0.95] text-center lg:text-left">
                Bring smiles<br />back to work.
              </h2>
              <p className="text-lg md:text-2xl leading-[1.2] lg:w-[85%] text-center lg:text-left opacity-90">
                Real wellness, right between meetings.{isInfo ? '' : " Let's find a time to talk."}
              </p>
              <div className="flex justify-center lg:justify-start">
                <button
                  onClick={goPrimary}
                  className="bg-[#9efaff] text-[#09364f] font-bold text-sm rounded-full px-8 py-4 hover:brightness-105 transition-all"
                >
                  {isInfo ? 'Learn more' : 'Book a call'}
                </button>
              </div>
            </div>
            <div className="bg-[#FEDC64] rounded-[18px] lg:rounded-[30px] justify-self-center lg:justify-self-end w-full md:w-[400px] h-[300px] md:h-[400px] overflow-hidden flex items-end">
              <img
                src="https://cdn.sanity.io/images/7qf1r87p/production/4a69606bc500439a099d08b53a05d18e4491067f-944x876.png"
                alt="Shortcut wellness at work"
                className="object-contain object-bottom w-full h-full"
                loading="lazy"
              />
            </div>
          </div>

          {/* Navy link block */}
          <div className="bg-[#003C5E] text-white rounded-[30px] lg:rounded-[50px] p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
              {[
                { head: 'Services', links: [['Massage', '/services/massage'], ['Nails', '/services/nails'], ['Hair', '/services/haircut'], ['Mindfulness', '/services/mindfulness'], ['Headshots', '/services/headshots'], ['Nutrition', '/services/nutrition']] },
                { head: 'Company', links: [['Book at Home', '/book-at-home'], ['Become a Pro', '/pros'], ['Press', '/press'], ['FAQ', '/faq']] },
                { head: 'Cities', links: [['All Cities', '/cities'], ['New York', '/cities/new-york'], ['Los Angeles', '/cities/los-angeles'], ['Miami', '/cities/miami'], ['San Francisco', '/cities/san-francisco']] },
              ].map((col) => (
                <div key={col.head}>
                  <p className="pb-3 text-[#92F1F6] font-bold text-sm lg:text-base">{col.head}</p>
                  <ul className="space-y-2.5 text-sm lg:text-base font-bold">
                    {col.links.map(([label, href]) => (
                      <li key={href}>
                        <a href={`https://getshortcut.co${href}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#92F1F6] transition-colors">{label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {/* Social */}
              <div>
                <p className="pb-3 text-[#92F1F6] font-bold text-sm lg:text-base">Connect</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { href: 'https://twitter.com/shortcutmobile', label: 'X', path: <path d="M8.78831 6.78462L14.0254 0.828125H12.7848L8.23554 5.99901L4.60474 0.828125H0.416016L5.90768 8.64816L0.416016 14.8937H1.6566L6.45765 9.4319L10.2929 14.8937H14.4816M2.10435 1.7435H4.01024L12.7839 14.0233H10.8775" fill="#003C5E" />, vb: '0 0 15 15', w: 14, h: 14 },
                    { href: 'https://www.instagram.com/shortcut', label: 'Instagram', path: <><path d="M5.37643 0.233003C4.55966 0.268648 4.00153 0.392757 3.51412 0.57451C3.00933 0.762204 2.58201 1.01401 2.15499 1.42257C1.72797 1.83113 1.46588 2.24128 1.27002 2.72502C1.08036 3.1924 0.950848 3.72695 0.913652 4.50966C0.875842 5.29361 0.867188 5.54424 0.867188 7.54094C0.867188 9.53763 0.875842 9.78826 0.913652 10.5722C0.950848 11.355 1.08036 11.8895 1.27002 12.3569C1.46588 12.8403 1.72804 13.2509 2.15499 13.6593C2.58195 14.0677 3.00933 14.3191 3.51412 14.5074C4.00245 14.6891 4.55966 14.8132 5.37643 14.8489C6.19493 14.8845 6.45604 14.8934 8.53963 14.8934C10.6232 14.8934 10.8848 14.8851 11.7028 14.8489C12.5197 14.8132 13.0774 14.6891 13.5651 14.5074C14.0696 14.3191 14.4972 14.0679 14.9243 13.6593C15.3513 13.2507 15.6128 12.8403 15.8092 12.3569C15.9989 11.8895 16.129 11.3549 16.1656 10.5722C16.2028 9.78767 16.2114 9.53763 16.2114 7.54094C16.2114 5.54424 16.2028 5.29361 16.1656 4.50966C16.1284 3.72689 15.9989 3.1921 15.8092 2.72502C15.6128 2.24158 15.3506 1.83178 14.9243 1.42257C14.4979 1.01336 14.0696 0.762204 13.5657 0.57451C13.0774 0.392757 12.5196 0.26806 11.7034 0.233003C10.8854 0.197358 10.6238 0.188477 8.54024 0.188477C6.45665 0.188477 6.19493 0.19677 5.37643 0.233003Z" fill="#003C5E" /><circle cx="8.53919" cy="7.22132" r="3.83607" fill="#92F1F6" /><circle cx="8.5398" cy="7.22144" r="2.55738" fill="#003C5E" /><circle cx="0.959016" cy="0.959016" r="0.959016" transform="matrix(-1 0 0 1 13.6543 2.74609)" fill="#92F1F6" /></>, vb: '0 0 17 15', w: 16, h: 14 },
                    { href: 'https://www.facebook.com/getshortcut', label: 'Facebook', path: <path d="M5.81186 14.6148V8.19884H8.07384L8.41249 5.69842H5.81186V4.10198C5.81186 3.37807 6.02302 2.88468 7.11346 2.88468L8.50416 2.88407V0.647735C8.26353 0.617374 7.43806 0.549316 6.47768 0.549316C4.47259 0.549316 3.09986 1.71452 3.09986 3.85447V5.69849H0.832031V8.1989H3.09979V14.6149L5.81186 14.6148Z" fill="#003C5E" />, vb: '0 0 9 15', w: 9, h: 14 },
                    { href: 'https://www.linkedin.com/company/shortcut-app/', label: 'LinkedIn', path: <path fillRule="evenodd" clipRule="evenodd" d="M14.1901 12.4532H11.2264V8.16777C11.2264 7.04605 10.7628 6.28029 9.74332 6.28029C8.96357 6.28029 8.52993 6.79704 8.32809 7.29506C8.25241 7.47382 8.26423 7.72283 8.26423 7.97184V12.4532H5.32812C5.32812 12.4532 5.36597 4.86195 5.32812 4.17191H8.26423V5.47159C8.43769 4.90332 9.37591 4.09229 10.8731 4.09229C12.7307 4.09229 14.1901 5.28347 14.1901 7.8485V12.4532ZM2.35968 3.13606H2.34076C1.39465 3.13606 0.78125 2.503 0.78125 1.70055C0.78125 0.882487 1.41278 0.262695 2.37782 0.262695C3.34206 0.262695 3.93496 0.880926 3.95388 1.69821C3.95388 2.50066 3.34206 3.13606 2.35968 3.13606ZM1.11914 4.17139H3.73278V12.4527H1.11914V4.17139Z" fill="#003C5E" />, vb: '0 0 15 13', w: 14, h: 12 },
                  ].map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid place-items-center w-[35px] h-[35px] rounded-full bg-[#92F1F6] hover:brightness-105 transition-all">
                      <svg width={s.w} height={s.h} viewBox={s.vb} fill="none" xmlns="http://www.w3.org/2000/svg">{s.path}</svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Logo + legal */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 pt-4 text-sm font-medium" style={{ color: '#003756' }}>
            <a href="https://getshortcut.co" target="_blank" rel="noopener noreferrer" aria-label="Shortcut" className="flex items-center">
              <svg viewBox="0 0 192 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto">
                <path fillRule="evenodd" clipRule="evenodd" d="M29.6284 21.5003C29.3713 23.7505 28.6818 25.9572 27.3774 27.8371C24.2946 32.28 18.9846 33.7633 13.7386 32.1453C8.56113 30.5486 3.54006 26.0287 0 18.7044L4.84254 16.3639C7.92552 22.7425 11.9483 25.9647 15.3237 27.0057C18.6305 28.0256 21.3824 27.0423 22.9585 24.7709C23.2395 24.366 23.481 23.9084 23.6808 23.4043C23.3774 23.4209 23.0738 23.4262 22.7704 23.4206C19.2805 23.3553 16.0856 21.8408 13.6813 19.7541C11.2932 17.6815 9.45986 14.8481 8.92523 11.8407C8.36688 8.69984 9.26489 5.39496 12.2773 3.08642C13.6869 2.00611 15.2332 1.36494 16.8596 1.24094C18.4816 1.11728 19.9964 1.52212 21.3267 2.23502C23.9138 3.62146 25.9253 6.22268 27.2987 9.01314C28.1685 10.7806 28.8433 12.7443 29.2624 14.7619C31.6786 12.1765 34.3066 10.6389 36.5311 9.77503C37.6804 9.3287 38.7381 9.05577 39.6253 8.91256C40.403 8.78701 41.3422 8.71138 42.1247 8.89196L40.9153 14.1327C41.0086 14.1543 41.0586 14.1618 41.0586 14.1618C41.0583 14.1658 40.8815 14.1579 40.4824 14.2223C39.98 14.3034 39.2871 14.4746 38.4782 14.7887C36.8668 15.4145 34.8583 16.5824 32.995 18.6489C31.9331 19.8266 30.8025 20.7717 29.6284 21.5003ZM24.3046 17.9209C24.1028 15.671 23.4436 13.3605 22.4729 11.3882C21.3666 9.14038 20.0076 7.63027 18.7861 6.97569C18.2121 6.66808 17.7132 6.56999 17.2685 6.60389C16.8283 6.63745 16.255 6.81433 15.5489 7.35549C14.3296 8.28987 13.9682 9.47863 14.2207 10.8994C14.497 12.4535 15.5449 14.2498 17.2067 15.692C18.8522 17.1202 20.8758 18.0057 22.871 18.043C23.3362 18.0517 23.8156 18.0149 24.3046 17.9209Z" fill="#FF5050" />
                <path fillRule="evenodd" clipRule="evenodd" d="M37.5033 11.1947C34.926 10.3834 32.9956 8.72285 31.3895 6.90729L35.4947 3.27552C36.7809 4.72933 37.9135 5.57753 39.149 5.96641C40.3556 6.34619 42.0247 6.40038 44.5918 5.54394L46.8242 10.5201C44.9245 11.6113 43.8736 13.3885 43.3764 15.227C43.1283 16.1444 43.035 17.0253 43.0393 17.7413C43.0437 18.4635 43.1448 18.831 43.1572 18.8761C43.1582 18.8799 43.1583 18.8806 43.1583 18.8806L38.1127 21.0218C37.7142 20.0827 37.565 18.8953 37.5583 17.7744C37.5511 16.586 37.7026 15.2115 38.0853 13.7961C38.2848 13.0585 38.5517 12.2956 38.8993 11.5353C38.4247 11.4518 37.9596 11.3383 37.5033 11.1947Z" fill="#FF5050" />
                <path d="M182.038 29.4766V5.46692H187.385V29.4766H182.038ZM178.194 17.0349V12.4916H191.23V17.0349H178.194Z" fill="#175071" />
                <path d="M167.362 29.861C165.801 29.861 164.415 29.5465 163.203 28.9174C162.015 28.265 161.083 27.3797 160.408 26.2613C159.732 25.1197 159.394 23.8149 159.394 22.3471V12.4916H164.741V22.2772C164.741 22.8597 164.834 23.3606 165.021 23.78C165.23 24.1994 165.533 24.5255 165.929 24.7585C166.326 24.9915 166.803 25.108 167.362 25.108C168.154 25.108 168.784 24.8634 169.25 24.3741C169.716 23.8615 169.949 23.1625 169.949 22.2772V12.4916H175.296V22.3121C175.296 23.8033 174.958 25.1197 174.282 26.2613C173.606 27.3797 172.675 28.265 171.486 28.9174C170.298 29.5465 168.923 29.861 167.362 29.861Z" fill="#175071" />
                <path d="M150.08 29.8609C148.332 29.8609 146.748 29.4765 145.327 28.7076C143.906 27.9388 142.787 26.8787 141.972 25.5273C141.156 24.176 140.749 22.6615 140.749 20.984C140.749 19.2832 141.156 17.7687 141.972 16.4407C142.81 15.0893 143.941 14.0292 145.362 13.2604C146.783 12.4915 148.379 12.1071 150.15 12.1071C151.478 12.1071 152.689 12.34 153.784 12.806C154.903 13.2487 155.893 13.9244 156.755 14.833L153.33 18.258C152.934 17.8153 152.468 17.4891 151.932 17.2794C151.419 17.0698 150.825 16.9649 150.15 16.9649C149.381 16.9649 148.694 17.1396 148.088 17.4891C147.505 17.8153 147.039 18.2813 146.69 18.8871C146.364 19.4696 146.201 20.1569 146.201 20.949C146.201 21.7412 146.364 22.4402 146.69 23.046C147.039 23.6517 147.517 24.1294 148.123 24.4789C148.728 24.8283 149.404 25.0031 150.15 25.0031C150.849 25.0031 151.466 24.8866 152.002 24.6536C152.561 24.3973 153.039 24.0478 153.435 23.6051L156.825 27.0301C155.94 27.9621 154.938 28.6727 153.819 29.162C152.701 29.6279 151.454 29.8609 150.08 29.8609Z" fill="#175071" />
                <path d="M129.93 29.4766V5.46692H135.277V29.4766H129.93ZM126.086 17.0349V12.4916H139.122V17.0349H126.086Z" fill="#175071" />
                <path d="M110.973 29.4766V12.4916H116.32V29.4766H110.973ZM116.32 20.1453L114.084 18.3979C114.526 16.4175 115.272 14.8797 116.32 13.7847C117.369 12.6896 118.825 12.1421 120.689 12.1421C121.504 12.1421 122.215 12.2702 122.821 12.5265C123.45 12.7595 123.997 13.1323 124.463 13.6449L121.283 17.664C121.05 17.4077 120.759 17.2096 120.409 17.0698C120.06 16.93 119.664 16.8601 119.221 16.8601C118.336 16.8601 117.625 17.1397 117.089 17.6989C116.577 18.2348 116.32 19.0503 116.32 20.1453Z" fill="#175071" />
                <path d="M99.0146 29.8609C97.2672 29.8609 95.6828 29.4765 94.2616 28.7076C92.8636 27.9155 91.7569 26.8437 90.9415 25.4924C90.126 24.141 89.7183 22.6266 89.7183 20.949C89.7183 19.2715 90.126 17.7687 90.9415 16.4407C91.7569 15.1126 92.8636 14.0642 94.2616 13.2953C95.6595 12.5031 97.2439 12.1071 99.0146 12.1071C100.785 12.1071 102.37 12.4915 103.768 13.2604C105.166 14.0292 106.272 15.0893 107.088 16.4407C107.903 17.7687 108.311 19.2715 108.311 20.949C108.311 22.6266 107.903 24.141 107.088 25.4924C106.272 26.8437 105.166 27.9155 103.768 28.7076C102.37 29.4765 100.785 29.8609 99.0146 29.8609ZM99.0146 25.0031C99.7835 25.0031 100.459 24.84 101.042 24.5138C101.624 24.1643 102.067 23.6867 102.37 23.0809C102.696 22.4518 102.859 21.7412 102.859 20.949C102.859 20.1569 102.696 19.4696 102.37 18.8871C102.043 18.2813 101.589 17.8153 101.007 17.4891C100.447 17.1396 99.7835 16.9649 99.0146 16.9649C98.269 16.9649 97.605 17.1396 97.0225 17.4891C96.44 17.8153 95.9857 18.2813 95.6595 18.8871C95.3333 19.4929 95.1702 20.1918 95.1702 20.984C95.1702 21.7529 95.3333 22.4518 95.6595 23.0809C95.9857 23.6867 96.44 24.1643 97.0225 24.5138C97.605 24.84 98.269 25.0031 99.0146 25.0031Z" fill="#175071" />
                <path d="M81.6902 29.4766V19.7958C81.6902 18.9104 81.4106 18.1998 80.8514 17.6639C80.3155 17.1048 79.6282 16.8252 78.7894 16.8252C78.207 16.8252 77.6944 16.9533 77.2517 17.2096C76.809 17.4426 76.4595 17.7921 76.2032 18.2581C75.947 18.7007 75.8188 19.2133 75.8188 19.7958L73.7568 18.7823C73.7568 17.4542 74.0364 16.2893 74.5956 15.2874C75.1548 14.2856 75.9353 13.5167 76.9372 12.9808C77.939 12.4216 79.0923 12.1421 80.3971 12.1421C81.7251 12.1421 82.8901 12.4216 83.8919 12.9808C84.8938 13.5167 85.6627 14.2739 86.1985 15.2525C86.7577 16.2077 87.0373 17.3261 87.0373 18.6075V29.4766H81.6902ZM70.4717 29.4766V4.10388H75.8188V29.4766H70.4717Z" fill="#175071" />
                <path d="M60.4075 29.896C59.4057 29.896 58.4154 29.7678 57.4369 29.5116C56.4816 29.2553 55.5846 28.8941 54.7458 28.4282C53.9304 27.9389 53.2314 27.3797 52.6489 26.7506L55.6895 23.6751C56.2486 24.2809 56.9127 24.7585 57.6815 25.108C58.4504 25.4342 59.2892 25.5973 60.1978 25.5973C60.8269 25.5973 61.3045 25.5041 61.6307 25.3177C61.9802 25.1313 62.1549 24.875 62.1549 24.5489C62.1549 24.1295 61.9452 23.8149 61.5259 23.6052C61.1298 23.3723 60.6172 23.1742 59.9881 23.0111C59.3591 22.8247 58.695 22.6267 57.9961 22.417C57.2971 22.2073 56.6331 21.9161 56.004 21.5433C55.3749 21.1705 54.8623 20.6579 54.4663 20.0055C54.0702 19.3299 53.8721 18.4795 53.8721 17.4543C53.8721 16.3592 54.1517 15.4156 54.7109 14.6235C55.2701 13.808 56.0622 13.1673 57.0874 12.7013C58.1126 12.2353 59.3125 12.0023 60.6871 12.0023C62.1316 12.0023 63.4597 12.2586 64.6712 12.7712C65.9061 13.2605 66.9079 13.9944 67.6768 14.9729L64.6363 18.0484C64.1004 17.4193 63.4946 16.9767 62.819 16.7204C62.1666 16.4641 61.5259 16.3359 60.8968 16.3359C60.291 16.3359 59.8367 16.4291 59.5338 16.6155C59.2309 16.7786 59.0795 17.0233 59.0795 17.3495C59.0795 17.6989 59.2775 17.9785 59.6736 18.1882C60.0697 18.3979 60.5823 18.5843 61.2113 18.7474C61.8404 18.9105 62.5044 19.1085 63.2034 19.3415C63.9024 19.5745 64.5664 19.889 65.1955 20.2851C65.8245 20.6812 66.3371 21.2171 66.7332 21.8928C67.1293 22.5451 67.3273 23.4072 67.3273 24.479C67.3273 26.1332 66.6983 27.4496 65.4401 28.4282C64.2053 29.4067 62.5277 29.896 60.4075 29.896Z" fill="#175071" />
              </svg>
            </a>
            <p className="opacity-60">© 2026 Shortcut</p>
            <div className="flex gap-6 opacity-60">
              <a href="https://getshortcut.co/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms &amp; Conditions</a>
              <a href="https://getshortcut.co/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy</a>
            </div>
          </div>

        </div>
      </footer>

      {/* ==================== BOOKING MODAL ==================== */}
      {showBooking && booking.embedUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 55, 86, 0.55)' }}
          onClick={() => setShowBooking(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Book a call with ${booking.repFirst}`}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[480px] overflow-hidden relative"
            style={{ boxShadow: '0 24px 80px rgba(0, 31, 31, 0.35)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold" style={{ color: '#003756' }}>
                Book a call with {booking.repFirst}
              </h3>
              <button
                type="button"
                onClick={() => setShowBooking(false)}
                aria-label="Close"
                className="text-2xl leading-none text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <iframe
              src={booking.embedUrl}
              title={`Book a call with ${booking.repFirst}`}
              className="w-full"
              style={{ height: '620px', border: 0 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookACallLandingRefresh;
