import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// useProposalGallery — fetches all published gallery media once and groups the
// image URLs by service_type, so each ServiceCard can show its own photo strip
// (the same `proposal_gallery` table + service_type tagging that the gallery
// admin writes and the sidebar GalleryCard reads). Videos contribute their
// poster frame so the strip stays image-only.
//
// Returns a map: { [serviceType]: string[] }. Empty until the fetch resolves.
export function useProposalGallery(): Record<string, string[]> {
  const [map, setMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('proposal_gallery')
          .select(
            'service_type, media_url, media_type, poster_url, is_featured, sort_order, created_at'
          )
          .eq('is_published', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        if (error || cancelled || !data) return;

        const next: Record<string, string[]> = {};
        for (const row of data as any[]) {
          const url =
            row.media_type === 'video' ? row.poster_url : row.media_url;
          if (!url || !row.service_type) continue;
          (next[row.service_type] ||= []).push(url);
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
