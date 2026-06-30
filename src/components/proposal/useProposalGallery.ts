import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// useProposalGallery — fetches all published gallery media once and groups it by
// service_type (the same `proposal_gallery` table + service_type tagging that the
// gallery admin writes and the sidebar GalleryCard reads).
//
// Returns structured items rather than bare URLs so each surface can decide how
// to present a video: the hero mosaic + lightbox PLAY it, while image-only photo
// strips fall back to its poster frame. (Previously the hook collapsed every
// video to its poster_url and dropped poster-less videos, which is why hero
// videos weren't playable.)
export interface GalleryItem {
  /** Displayable/playable URL — the video file for videos, the image otherwise. */
  url: string;
  type: 'image' | 'video';
  /** Poster frame for videos, when one was captured. */
  poster?: string;
  caption?: string;
}

// Returns a map: { [serviceType]: GalleryItem[] }. Empty until the fetch resolves.
export function useProposalGallery(): Record<string, GalleryItem[]> {
  const [map, setMap] = useState<Record<string, GalleryItem[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('proposal_gallery')
          .select(
            'service_type, media_url, media_type, poster_url, caption, is_featured, sort_order, created_at'
          )
          .eq('is_published', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        if (error || cancelled || !data) return;

        const next: Record<string, GalleryItem[]> = {};
        for (const row of data as any[]) {
          if (!row.media_url || !row.service_type) continue;
          (next[row.service_type] ||= []).push({
            url: row.media_url,
            type: row.media_type === 'video' ? 'video' : 'image',
            poster: row.poster_url || undefined,
            caption: row.caption || undefined,
          });
        }
        if (!cancelled) setMap(next);
      } catch (err) {
        // Non-fatal — cards fall back to the static SERVICE_GALLERY map.
        console.warn('proposal_gallery fetch failed (non-fatal):', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
