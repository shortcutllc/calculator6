/* ─────────────────────────────────────────────
   The About Shortcut reel: the getshortcut.co "In the room" rail (shortcut
   repo, frontend/components/HolidayReels.vue + data/reels-data.js), the
   same five clips, "Service booked" labels and client marks (Will,
   2026-10-16: an About section like the holiday page's).

   Each record's client is corroborated by the clip's original filename in
   the website's Sanity dataset (see reels-data.js). The PwC clip is a
   facial, not the massage its CMS record says, so it is labelled Facial
   here too.

   Clips live in the `site-media` bucket (never in git); posters and logos
   are in public/ds-assets/reels. Like the website, nothing loads until the
   first hover, then the clip plays muted and pauses on leave. The rail
   scrolls on its own and pauses on hover; styles are `.sp-reels` in
   sponsor-page.css.
   ───────────────────────────────────────────── */

const MEDIA = 'https://oxigtmlqqfbhzekpdalt.supabase.co/storage/v1/object/public/site-media/reels';

const REELS = [
  { slug: 'nails-warner-bros', service: 'Nails', client: 'Warner Bros. Discovery', alt: 'On-site manicures at Warner Bros. Discovery in Miami' },
  { slug: 'massage-bcg', service: 'Massage', client: 'BCG', alt: 'Chair massage at BCG in Boston' },
  { slug: 'facial-barstool', service: 'Facial', client: 'Barstool Sports', alt: 'Express facials at Barstool Sports in New York' },
  { slug: 'haircut-schrodinger', service: 'Haircut', client: 'Schrödinger', alt: 'On-site haircuts at Schrödinger in New York' },
  { slug: 'massage-pwc', service: 'Facial', client: 'PwC', alt: 'Express facials at PwC in New York' },
];

function play(e: React.PointerEvent<HTMLElement>) {
  const v = e.currentTarget.querySelector('video');
  if (!v) return;
  if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src;
  v.play().catch(() => {});
}

function pause(e: React.PointerEvent<HTMLElement>) {
  e.currentTarget.querySelector('video')?.pause();
}

export default function SponsorReels() {
  return (
    <div className="sp-reels">
      <div className="sp-reel-track">
        {[0, 1].map((pass) =>
          REELS.map((r) => (
            <figure
              key={`${pass}-${r.slug}`}
              className="sp-reel"
              aria-hidden={pass === 1 ? true : undefined}
              onPointerEnter={play}
              onPointerLeave={pause}
            >
              <img src={`/ds-assets/reels/${r.slug}.webp`} alt={pass === 0 ? r.alt : ''} loading="lazy" />
              <video data-src={`${MEDIA}/${r.slug}.mp4`} poster={`/ds-assets/reels/${r.slug}.webp`} muted loop playsInline preload="none" />
              <figcaption className="sp-reel-lab">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-[.09em] text-[#45596A]">Service booked</span>
                <span className="mt-[5px] block text-[16px] font-extrabold leading-[1.15] tracking-[-.02em] text-[#003756]">{r.service}</span>
                <span className="mt-[9px] block border-t border-[rgba(0,55,86,.14)] pt-[9px]">
                  <img src={`/ds-assets/reels/${r.slug}-logo.webp`} alt={pass === 0 ? r.client : ''} loading="lazy" className="block h-auto max-h-[18px] w-auto max-w-[90px] object-contain object-left opacity-[.82]" />
                </span>
              </figcaption>
            </figure>
          ))
        )}
      </div>
    </div>
  );
}
