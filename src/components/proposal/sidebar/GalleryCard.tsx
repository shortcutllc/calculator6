import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ImageIcon, Play, X } from 'lucide-react';
import { Eyebrow, T } from '../shared/primitives';
import { supabase } from '../../../lib/supabaseClient';

// GalleryCard — real proposal_gallery integration (Phase 6).
//
// Currently pulls ALL published media rows from `proposal_gallery` (no
// service-type filter) so the small library doubles as a general showcase
// across every proposal. The `service_type` column is still populated on
// each row so we can flip back to per-service filtering later by uncommenting
// the `.in('service_type', serviceTypes)` clause below.
//
// "View all" opens a lightbox modal that grids every published item with
// hover captions + a fullscreen detail view. Public read RLS is set in
// migration 20260513000001 so anon shared-link visitors get the same media.

interface GalleryMediaItem {
  id: string;
  service_type: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  poster_url: string | null;
  duration_seconds: number | null;
  is_featured: boolean | null;
}

interface GalleryCardProps {
  /** Service types present in this proposal — used to filter rows. */
  serviceTypes: string[];
}

const formatDuration = (seconds?: number | null): string | null => {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const GALLERY_GRADIENTS = [
  'linear-gradient(135deg, #F8D7C7, #E07A5F)', // massage
  'linear-gradient(135deg, #FBC2EB, #A18CD1)', // hair/makeup
  'linear-gradient(135deg, #C9E8FF, #5A91C2)', // headshot
  'linear-gradient(135deg, #FFE4D6, #FFB088)', // facial
];

const GalleryCard: React.FC<GalleryCardProps> = ({ serviceTypes }) => {
  const [items, setItems] = useState<GalleryMediaItem[] | null>(null);
  const [allItems, setAllItems] = useState<GalleryMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Service-agnostic pull for now — fetch every published row so the
        // gallery doubles as a general showcase. To re-introduce per-service
        // filtering later, add `.in('service_type', serviceTypes)`.
        const { data, error } = await supabase
          .from('proposal_gallery')
          .select(
            'id, service_type, media_url, media_type, caption, poster_url, duration_seconds, is_featured'
          )
          .eq('is_published', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        if (cancelled) return;
        if (error) {
          console.warn('proposal_gallery query failed (non-fatal):', error.message);
          setItems([]);
          setAllItems([]);
        } else {
          const rows = data || [];
          setAllItems(rows);
          setItems(rows.slice(0, 5));
        }
      } catch (err) {
        console.warn('proposal_gallery query threw (non-fatal):', err);
        if (!cancelled) {
          setItems([]);
          setAllItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Feature label is mostly cosmetic — pick massage if present, else first.
  const feature = serviceTypes.includes('massage')
    ? 'massage'
    : serviceTypes[0] || 'massage';

  const featured = items?.[0] || null;
  const thumbs = items?.slice(1, 5) || [];
  const hasContent = (items?.length || 0) > 0;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 24px',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Eyebrow style={{ marginBottom: 12 }}>From recent events</Eyebrow>

      {/* Featured tile — real media if available, gradient placeholder otherwise. */}
      <div
        style={{
          aspectRatio: '4 / 3',
          borderRadius: 12,
          background: featured?.poster_url
            ? `center / cover no-repeat url(${featured.poster_url})`
            : GALLERY_GRADIENTS[0],
          marginBottom: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {featured?.media_type === 'image' && featured.media_url && (
          <img
            src={featured.media_url}
            alt={featured.caption || ''}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {featured?.media_type === 'video' && (
          <>
            {/* Fallback first-frame preview for video rows that don't have
                a poster_url yet (older uploads). Cheap — browser only fetches
                metadata. */}
            {!featured.poster_url && (
              <video
                src={featured.media_url}
                preload="metadata"
                muted
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.92)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                }}
              >
                <Play size={20} color={T.navy} strokeWidth={2.5} fill={T.navy} />
              </div>
            </div>
          </>
        )}
        {!featured && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              }}
            >
              <ImageIcon size={20} color={T.navy} strokeWidth={2.5} />
            </div>
          </div>
        )}
        {featured && formatDuration(featured.duration_seconds) && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 6,
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.04em',
            }}
          >
            {formatDuration(featured.duration_seconds)}
          </div>
        )}
      </div>

      {/* 2x2 thumbnails — render real media when present, gradient placeholders otherwise. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {[0, 1, 2, 3].map((i) => {
          const t = thumbs[i];
          if (t) {
            const bg = t.poster_url
              ? `center / cover no-repeat url(${t.poster_url})`
              : t.media_type === 'image' && t.media_url
              ? `center / cover no-repeat url(${t.media_url})`
              : GALLERY_GRADIENTS[i % GALLERY_GRADIENTS.length];
            return (
              <div
                key={t.id}
                title={t.caption || undefined}
                style={{
                  aspectRatio: '4 / 3',
                  borderRadius: 8,
                  background: bg,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {t.media_type === 'video' && (
                  <>
                    {!t.poster_url && (
                      <video
                        src={t.media_url}
                        preload="metadata"
                        muted
                        playsInline
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Play size={14} color="#fff" strokeWidth={2.5} fill="#fff" />
                    </div>
                  </>
                )}
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                aspectRatio: '4 / 3',
                borderRadius: 8,
                background: GALLERY_GRADIENTS[i % GALLERY_GRADIENTS.length],
                opacity: hasContent ? 0.45 : 1,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTop: '1px dashed rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: T.fontD,
            fontSize: 12,
            color: T.fgMuted,
          }}
        >
          <ImageIcon size={13} color={T.fgMuted} />
          <span>
            {loading
              ? 'Loading media…'
              : hasContent
              ? `${allItems.length} from past events`
              : 'Media coming soon'}
          </span>
        </div>
        <button
          type="button"
          disabled={!hasContent}
          onClick={() => hasContent && setLightboxOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 12,
            color: hasContent ? T.coral : T.fgMuted,
            cursor: hasContent ? 'pointer' : 'not-allowed',
            opacity: hasContent ? 1 : 0.6,
          }}
        >
          View all
          <ArrowUpRight size={12} />
        </button>
      </div>

      {lightboxOpen && (
        <GalleryLightbox
          items={allItems}
          activeId={activeMediaId}
          onClose={() => {
            setLightboxOpen(false);
            setActiveMediaId(null);
          }}
          onPickActive={(id) => setActiveMediaId(id)}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// GalleryLightbox — fullscreen grid view of all published gallery items.
// Click a thumbnail to enter detail mode (large image/video + caption + nav
// back to the grid). Escape closes; backdrop click closes; light-blue hover
// state matches the V2 palette.
// ----------------------------------------------------------------------------
interface GalleryLightboxProps {
  items: GalleryMediaItem[];
  activeId: string | null;
  onClose: () => void;
  onPickActive: (id: string | null) => void;
}
const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  items,
  activeId,
  onClose,
  onPickActive,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeId) onPickActive(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeId, onClose, onPickActive]);

  const active = activeId ? items.find((it) => it.id === activeId) : null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9,54,79,0.85)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1080,
          maxHeight: '90vh',
          background: '#fff',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div>
            <Eyebrow>Gallery</Eyebrow>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 22,
                color: T.navy,
                letterSpacing: '-0.015em',
                marginTop: 4,
              }}
            >
              From past Shortcut events
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: T.fgMuted,
              display: 'inline-flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {active ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              gap: 14,
              background: '#000',
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {active.media_type === 'video' ? (
                <video
                  src={active.media_url}
                  poster={active.poster_url || undefined}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    borderRadius: 12,
                  }}
                />
              ) : (
                <img
                  src={active.media_url}
                  alt={active.caption || ''}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 12,
                  }}
                />
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: T.fontD,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.45,
                }}
              >
                {active.caption || ' '}
              </div>
              <button
                type="button"
                onClick={() => onPickActive(null)}
                style={{
                  padding: '7px 14px',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Back to grid
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: 20,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onPickActive(it.id)}
                  title={it.caption || ''}
                  style={{
                    aspectRatio: '4 / 3',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background:
                      it.poster_url || it.media_type === 'image'
                        ? `center / cover no-repeat url(${it.poster_url || it.media_url})`
                        : T.lightGray,
                    position: 'relative',
                  }}
                >
                  {it.media_type === 'video' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.25)',
                      }}
                    >
                      <Play size={26} color="#fff" strokeWidth={2.5} fill="#fff" />
                    </div>
                  )}
                  {it.caption && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: '8px 10px',
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))',
                        color: '#fff',
                        fontFamily: T.fontD,
                        fontSize: 11,
                        fontWeight: 600,
                        textAlign: 'left',
                        lineHeight: 1.3,
                      }}
                    >
                      {it.caption}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryCard;
