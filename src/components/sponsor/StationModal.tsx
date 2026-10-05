import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { StationDetail } from '../../utils/sponsorPackages';

/** What the pop-out reads. A SponsorServiceDef is one; other pages (the
 *  SterlingRisk partner page) map their own services into this shape. */
export interface ModalStation {
  name: string;
  image: string;
  cropArt: boolean;
  tint: string;
  /** object-position for photographic card art. */
  imagePos?: string;
  detail: Omit<StationDetail, 'group'> & { group: string };
}

/* ─────────────────────────────────────────────
   The station pop-out, opened by a card's `+`.

   A port of the website's ServiceModal (shortcut repo:
   frontend/components/ServiceModal.vue), the same one the homepage rail and
   the menu page open: media with a dot carousel on the left; position,
   name, description, "What we bring" and the service's own list on the
   right; meta line and prev/next arrows in the footer. The arrows walk every
   station and wrap.

   Escape closes, arrow keys step, focus moves into the dialog and back to
   the `+` that opened it, and the page behind does not scroll.
   ───────────────────────────────────────────── */

const INK = 'text-[#2A5468]';
const SOFT = 'text-[#45596A]';

/** Published proposal-gallery photos per gallery key, fetched once. The same
 *  source ServiceMenuPage reads, so real event photos lead the carousel. */
export function useGalleryByKey(): Record<string, string[]> {
  const [byKey, setByKey] = useState<Record<string, string[]>>({});
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
        const out: Record<string, string[]> = {};
        (data as { service_type: string; media_url: string }[]).forEach((r) => {
          (out[r.service_type] = out[r.service_type] || []).push(r.media_url);
        });
        setByKey(out);
      });
    return () => { live = false; };
  }, []);
  return byKey;
}

export default function StationModal({ stations, index, gallery, onClose, onGo }: {
  stations: ModalStation[];
  index: number;
  gallery: Record<string, string[]>;
  onClose: () => void;
  onGo: (i: number) => void;
}) {
  const s = stations[index];
  const [shot, setShot] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  /* Published gallery first, then this station's own photos, then the card
     art, which is always last so there is always something to show. */
  const images = useMemo(() => {
    const published = s.detail.galleryKeys.flatMap((k) => gallery[k] || []);
    return Array.from(new Set([...published, ...s.detail.photos, s.image])).slice(0, 6);
  }, [s, gallery]);

  useEffect(() => {
    setShot(0);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [index]);

  const step = (d: number) => onGo((index + d + stations.length) % stations.length);

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
      returnTo?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(3,34,50,.58)] p-4 md:p-7"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={s.name}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative grid max-h-[calc(100vh-56px)] w-[min(960px,100%)] grid-cols-1 overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_rgba(3,34,50,.4)] outline-none md:h-[540px] md:grid-cols-[44%_56%]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 grid h-[38px] w-[38px] place-items-center rounded-full bg-shortcut-blue text-[20px] leading-none text-white"
        >
          ×
        </button>

        <div className="relative h-[240px] md:h-auto" style={{ background: s.tint }}>
          {images.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={i === shot ? s.name : ''}
              aria-hidden={i !== shot}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${i === shot ? 'opacity-100' : 'opacity-0'} ${src === s.image && s.cropArt ? 'scale-110' : ''}`}
              style={src === s.image && s.imagePos ? { objectPosition: s.imagePos } : undefined}
            />
          ))}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-4 z-[3] flex gap-2">
              {images.map((src, i) => (
                <button
                  key={`d-${src}`}
                  type="button"
                  onClick={() => setShot(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`h-[9px] w-[9px] rounded-full transition-colors ${i === shot ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div ref={bodyRef} className="flex flex-col overflow-y-auto px-7 pb-7 pt-8 md:px-9 md:pt-[34px]">
          <p className={`m-0 text-[11px] font-bold uppercase tracking-[.1em] ${SOFT}`}>
            {s.detail.group} · {index + 1} of {stations.length}
          </p>
          <h3 className="m-0 mt-1.5 text-[27px] font-bold leading-[1.1] tracking-[-.025em] text-shortcut-blue">{s.name}</h3>
          <p className={`m-0 mb-[22px] mt-2.5 text-[15px] font-medium leading-[1.6] ${INK}`}>{s.detail.desc}</p>

          <div className="grid grid-cols-1 gap-6 border-t border-[#E2E9E8] pt-[18px] sm:grid-cols-[1.15fr_1fr]">
            <div>
              <p className={`m-0 text-[11px] font-bold uppercase tracking-[.1em] ${SOFT}`}>What we bring</p>
              <ul className="m-0 mt-2.5 grid list-none gap-2 p-0">
                {s.detail.bring.map(([lead, rest]) => (
                  <li key={lead} className={`flex gap-2.5 text-[13.5px] leading-[1.45] ${SOFT}`}>
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-shortcut-teal" />
                    <span><b className={`font-semibold ${INK}`}>{lead}</b>, {rest}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`m-0 text-[11px] font-bold uppercase tracking-[.1em] ${SOFT}`}>{s.detail.colKind}</p>
              <ul className="m-0 mt-2.5 grid list-none gap-2 p-0">
                {s.detail.items.map(([lead, rest]) => (
                  <li key={lead + rest} className={`flex gap-2.5 text-[13.5px] leading-[1.45] ${SOFT}`}>
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-shortcut-teal" />
                    <span>
                      {lead ? <><b className={`font-semibold ${INK}`}>{lead}</b>, {rest}</> : rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 pt-6">
            <p className={`m-0 text-[11px] font-bold uppercase tracking-[.08em] ${SOFT}`}>{s.detail.metaFooter}</p>
            <div className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous service"
                className="grid h-[38px] w-[38px] place-items-center rounded-full border border-[#E2E9E8] bg-white text-[15px] text-shortcut-blue"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next service"
                className="grid h-[38px] w-[38px] place-items-center rounded-full border border-[#E2E9E8] bg-white text-[15px] text-shortcut-blue"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
