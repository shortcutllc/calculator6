import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ImageIcon, Play } from 'lucide-react';
import { Eyebrow, T } from '../shared/primitives';
import { supabase } from '../../../lib/supabaseClient';

// GalleryCard — real proposal_gallery integration (Phase 6).
//
// Pulls published media rows from `proposal_gallery`, filtered to the service
// types present in the proposal. If no rows come back (e.g. brand-new env,
// admin hasn't uploaded anything yet), falls back to the V2 placeholder
// gradient tiles + a small "coming soon" caption. Public read RLS is set in
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serviceTypes.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('proposal_gallery')
          .select(
            'id, service_type, media_url, media_type, caption, poster_url, duration_seconds, is_featured'
          )
          .in('service_type', serviceTypes)
          .eq('is_published', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(5);
        if (cancelled) return;
        if (error) {
          // Table may not exist yet in dev — fall back silently.
          console.warn('proposal_gallery query failed (non-fatal):', error.message);
          setItems([]);
        } else {
          setItems(data || []);
        }
      } catch (err) {
        console.warn('proposal_gallery query threw (non-fatal):', err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceTypes.join('|')]);

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
              ? `${items?.length} clip${items?.length === 1 ? '' : 's'} from past ${feature} events`
              : 'Media coming soon'}
          </span>
        </div>
        <button
          type="button"
          disabled={!hasContent}
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
    </div>
  );
};

export default GalleryCard;
