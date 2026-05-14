import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Pencil,
  Play,
  Star,
  StarOff,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import {
  CardHeading,
  Eyebrow,
  SectionLabel,
  T,
} from './proposal/shared/primitives';
import { SERVICE_DISPLAY } from './proposal/data';

// ProposalGalleryAdmin — staff-only library manager for the `proposal_gallery`
// table that V2 GalleryCard reads from. Lives at /proposal-gallery-admin.
//
// What it does:
//   - Lists every gallery row, grouped by service_type, with featured stars
//   - Upload new image/video — pushes the file to the `proposal-gallery`
//     storage bucket, then inserts a row referencing its public URL
//   - Toggle is_published / is_featured per row
//   - Delete a row (also removes the underlying storage object when we can
//     parse its path back out of the public URL)
//
// Phase 6 backbone: this is where the data behind GalleryCard gets curated.
// Public-read RLS is wired in migration 20260513000001 so anon shared-link
// viewers see the same media.

interface GalleryRow {
  id: string;
  service_type: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  poster_url: string | null;
  duration_seconds: number | null;
  sort_order: number | null;
  is_featured: boolean | null;
  is_published: boolean | null;
  created_at: string;
}

const SERVICE_OPTIONS: { value: string; label: string }[] = [
  'massage',
  'headshot',
  'facial',
  'nails',
  'hair',
  'hair-makeup',
  'headshot-hair-makeup',
  'mindfulness',
].map((v) => ({ value: v, label: SERVICE_DISPLAY[v] || v }));

const ProposalGalleryAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [serviceType, setServiceType] = useState<string>('massage');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  // Per-row thumb regeneration (for older video rows missing poster_url)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Inline-edit caption state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('proposal_gallery')
        .select('*')
        .order('service_type', { ascending: true })
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (err) {
        // Show a clear hint when the table doesn't exist yet.
        if (
          err.message.toLowerCase().includes('does not exist') ||
          err.code === '42P01'
        ) {
          setError(
            'The `proposal_gallery` table is missing. Run migration 20260513000001_create_proposal_gallery.sql in the Supabase dashboard first.'
          );
          setRows([]);
        } else {
          throw err;
        }
      } else {
        setRows(data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load gallery.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  // ---- Upload --------------------------------------------------------------
  // Uploads one OR many files. Single-file path (the form-submit click) uses
  // the form's caption + featured pin. Multi-file path (drag-drop) ignores
  // caption + featured since they don't apply across a batch; staff can edit
  // each row's caption inline once it's in the library.
  /** Decode a video element to a JPEG poster using a hidden <video> + canvas.
   *  `source` can be either a local File or a `{ url }` reference (used by
   *  regenerateThumb so we can load directly from Supabase with proper CORS
   *  headers instead of round-tripping through a blob). Returns `{blob}` on
   *  success or `{error}` with a human-readable reason on failure. */
  const generateVideoPoster = (
    source: File | { url: string }
  ): Promise<{ blob: Blob } | { error: string }> =>
    new Promise((resolve) => {
      let objectUrl: string | null = null;
      try {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        if ('url' in source) {
          // Direct-load with anonymous CORS so the canvas isn't tainted —
          // Supabase public buckets respond with Access-Control-Allow-Origin:*
          video.crossOrigin = 'anonymous';
          video.src = source.url;
        } else {
          objectUrl = URL.createObjectURL(source);
          video.src = objectUrl;
        }

        const cleanup = () => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        const done = (result: { blob: Blob } | { error: string }) => {
          cleanup();
          resolve(result);
        };

        // Hard time-cap so a hung decoder doesn't lock the UI.
        const timeout = setTimeout(() => {
          done({
            error:
              "Decoder didn't return a frame in 15s. The clip may be in a codec your browser doesn't support (iPhone HEVC, AV1) or larger than the browser can handle.",
          });
        }, 15_000);

        video.addEventListener(
          'loadedmetadata',
          () => {
            const target = Math.min(1, Math.max(0, (video.duration || 0) / 2));
            // Some Safari builds need a microtask before seek works.
            setTimeout(() => {
              try {
                video.currentTime = target;
              } catch (err) {
                clearTimeout(timeout);
                done({
                  error:
                    err instanceof Error
                      ? `Seek failed: ${err.message}`
                      : 'Seek failed (unknown error).',
                });
              }
            }, 0);
          },
          { once: true }
        );

        video.addEventListener(
          'error',
          () => {
            clearTimeout(timeout);
            // MediaError codes — surface something specific instead of "decode failed":
            const e = video.error;
            const map: Record<number, string> = {
              1: 'Browser aborted the load.',
              2: 'Network error while fetching the video (CORS or 404?).',
              3: "Decoder failed — the video's codec isn't supported in this browser. iPhone clips are often HEVC; re-encode to H.264/MP4 (or use Safari).",
              4: "Source not supported — the file format isn't playable in this browser.",
            };
            const msg = e ? map[e.code] || `MediaError ${e.code}` : 'Unknown video error.';
            done({ error: msg });
          },
          { once: true }
        );

        video.addEventListener(
          'seeked',
          () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 360;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                clearTimeout(timeout);
                done({ error: 'Could not get a 2D canvas context.' });
                return;
              }
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob(
                (blob) => {
                  clearTimeout(timeout);
                  if (blob) done({ blob });
                  else
                    done({
                      error:
                        "Canvas couldn't export the frame as JPEG (likely a CORS taint — the video must be served with Access-Control-Allow-Origin: *).",
                    });
                },
                'image/jpeg',
                0.85
              );
            } catch (err) {
              clearTimeout(timeout);
              const msg = err instanceof Error ? err.message : String(err);
              // SecurityError → tainted canvas due to CORS
              if (/security|tainted/i.test(msg)) {
                done({
                  error:
                    'Canvas was tainted — the video file is missing CORS headers. (Storage RLS or bucket CORS config.)',
                });
              } else {
                done({ error: `Frame draw failed: ${msg}` });
              }
            }
          },
          { once: true }
        );
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve({
          error:
            err instanceof Error
              ? `Poster setup failed: ${err.message}`
              : 'Poster setup failed (unknown).',
        });
      }
    });

  const uploadOne = async (
    f: File,
    opts: { applyFormMeta?: boolean } = {}
  ): Promise<void> => {
    const detectedMediaType: 'image' | 'video' = f.type.startsWith('video/')
      ? 'video'
      : 'image';
    const ext = f.name.split('.').pop() || 'bin';
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${serviceType}/${stamp}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('proposal-gallery')
      .upload(path, f, {
        upsert: false,
        contentType: f.type || undefined,
      });
    if (upErr) {
      // Annotate the most-common failure (50MB default bucket cap) so the
      // user knows exactly which Supabase setting to change.
      const msg = (upErr as any)?.message || String(upErr);
      if (/exceeded the maximum|payload too large|413/i.test(msg)) {
        throw new Error(
          `${f.name} is too large for the storage bucket. Open Supabase → Storage → proposal-gallery → bump "File size limit" (default is 50MB) and re-try.`
        );
      }
      throw new Error(`${f.name}: ${msg}`);
    }
    const { data: pub } = supabase.storage
      .from('proposal-gallery')
      .getPublicUrl(path);

    // Best-effort video poster — capture a JPEG from frame ~1s in and upload
    // it alongside the source clip. If anything fails we still insert the
    // row (the tile renderer falls back to a <video preload=metadata>).
    let posterUrl: string | null = null;
    let durationSeconds: number | null = null;
    if (detectedMediaType === 'video') {
      try {
        // Sneak the duration off the metadata-only video element used by the
        // poster generator — saves a second decode pass.
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.src = URL.createObjectURL(f);
        await new Promise<void>((res) => {
          const done = () => {
            durationSeconds = Math.round(probe.duration || 0) || null;
            URL.revokeObjectURL(probe.src);
            res();
          };
          probe.addEventListener('loadedmetadata', done, { once: true });
          probe.addEventListener('error', done, { once: true });
          setTimeout(done, 6_000);
        });
      } catch {
        /* non-fatal — duration is cosmetic */
      }
      const posterResult = await generateVideoPoster(f);
      if ('blob' in posterResult) {
        const posterPath = `${serviceType}/${stamp}-poster.jpg`;
        const { error: posterErr } = await supabase.storage
          .from('proposal-gallery')
          .upload(posterPath, posterResult.blob, {
            upsert: false,
            contentType: 'image/jpeg',
          });
        if (!posterErr) {
          const { data: posterPub } = supabase.storage
            .from('proposal-gallery')
            .getPublicUrl(posterPath);
          posterUrl = posterPub.publicUrl;
        } else {
          console.warn('Poster upload failed (non-fatal):', posterErr.message);
        }
      } else {
        // Non-fatal — the row still gets inserted; <video> fallback will
        // paint the first frame at render-time. Log so the user can see why
        // in DevTools if they're hunting.
        console.warn('Poster generation skipped:', posterResult.error);
      }
    }

    const { error: insErr } = await supabase.from('proposal_gallery').insert({
      service_type: serviceType,
      media_url: pub.publicUrl,
      media_type: opts.applyFormMeta ? mediaType : detectedMediaType,
      poster_url: posterUrl,
      duration_seconds: durationSeconds,
      caption: opts.applyFormMeta && caption.trim() ? caption.trim() : null,
      is_featured: opts.applyFormMeta ? isFeatured : false,
      is_published: true,
      sort_order: 0,
    });
    if (insErr) {
      throw new Error(`${f.name}: row insert failed — ${insErr.message}`);
    }
  };

  /** Bulk upload — runs uploadOne sequentially across a FileList. Used by the
   *  drag-drop handler. Auto-detects image vs video per file from its MIME
   *  type; caption + featured aren't applied (they don't make sense per-row
   *  across a batch). Shows a progress counter while in flight. */
  const handleBulkUpload = async (files: File[]) => {
    const usable = files.filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (usable.length === 0) {
      setUploadMsg('No images or videos detected in the drop.');
      setTimeout(() => setUploadMsg(null), 3500);
      return;
    }
    if (!user) {
      setUploadMsg('Sign in required to upload.');
      return;
    }
    setUploadBusy(true);
    setUploadMsg(null);
    setBulkProgress({ done: 0, total: usable.length });
    let failed = 0;
    for (let i = 0; i < usable.length; i++) {
      try {
        await uploadOne(usable[i]);
      } catch (err) {
        console.error('Bulk upload — file failed:', usable[i].name, err);
        failed++;
      }
      setBulkProgress({ done: i + 1, total: usable.length });
    }
    setBulkProgress(null);
    setUploadBusy(false);
    setUploadMsg(
      failed === 0
        ? `Uploaded ${usable.length} file${usable.length === 1 ? '' : 's'}.`
        : `Uploaded ${usable.length - failed} of ${usable.length} — ${failed} failed (see console).`
    );
    await fetchRows();
    setTimeout(() => setUploadMsg(null), 4000);
  };

  // Drag-and-drop event handlers. We listen on a single wrapper so the user
  // can drop anywhere over the form panel, not just on the file picker.
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only flip back to false when leaving the container itself, not a child.
    if (e.currentTarget === e.target) setIsDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (dropped.length === 0) return;
    if (dropped.length === 1) {
      // Single drop falls back to the form's behavior so the user can still
      // attach caption + featured pin before clicking Upload.
      setFile(dropped[0]);
      if (dropped[0].type.startsWith('video/')) setMediaType('video');
      else if (dropped[0].type.startsWith('image/')) setMediaType('image');
      return;
    }
    void handleBulkUpload(dropped);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadMsg('Pick a file first.');
      return;
    }
    if (!user) {
      setUploadMsg('Sign in required to upload.');
      return;
    }
    setUploadBusy(true);
    setUploadMsg(null);
    try {
      await uploadOne(file, { applyFormMeta: true });
      setUploadMsg('Uploaded.');
      setFile(null);
      setCaption('');
      setIsFeatured(false);
      await fetchRows();
      setTimeout(() => setUploadMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setUploadMsg(
        err instanceof Error ? err.message : 'Upload failed. Check console.'
      );
    } finally {
      setUploadBusy(false);
    }
  };

  // ---- Row actions ---------------------------------------------------------
  const updateRow = async (id: string, patch: Partial<GalleryRow>) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error: err } = await supabase
      .from('proposal_gallery')
      .update(patch)
      .eq('id', id);
    if (err) {
      setRows(prev);
      alert('Save failed: ' + err.message);
    }
  };

  /** Backfill a poster_url for an existing video row. Fetches the video from
   *  its public URL, runs the same first-frame capture used on upload,
   *  uploads the JPEG, and updates the row. Idempotent — overwriting an
   *  existing poster is fine. */
  const regenerateThumb = async (row: GalleryRow) => {
    if (row.media_type !== 'video' || !row.media_url) return;
    setRegeneratingId(row.id);
    try {
      // Direct-load path first — proper CORS, no decode of an opaque blob,
      // gives the browser its best shot at the original codec. Falls back
      // to fetch+blob if the direct load can't paint (e.g. inline CORS
      // restriction we can't predict).
      let posterResult = await generateVideoPoster({ url: row.media_url });
      if ('error' in posterResult) {
        console.warn('Direct-load poster failed:', posterResult.error);
        // Fallback: try via blob
        try {
          const resp = await fetch(row.media_url);
          if (!resp.ok) {
            throw new Error(`Couldn't fetch video (HTTP ${resp.status})`);
          }
          const blob = await resp.blob();
          const fakeFile = new File([blob], `${row.id}.mp4`, {
            type: blob.type || 'video/mp4',
          });
          posterResult = await generateVideoPoster(fakeFile);
        } catch (fetchErr) {
          throw new Error(
            posterResult.error +
              ` (Fallback fetch also failed: ${
                fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
              })`
          );
        }
      }
      if ('error' in posterResult) {
        throw new Error(posterResult.error);
      }
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const posterPath = `${row.service_type}/${stamp}-poster.jpg`;
      const { error: upErr } = await supabase.storage
        .from('proposal-gallery')
        .upload(posterPath, posterResult.blob, {
          upsert: false,
          contentType: 'image/jpeg',
        });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('proposal-gallery')
        .getPublicUrl(posterPath);
      await updateRow(row.id, { poster_url: pub.publicUrl });
    } catch (err) {
      console.error('Regenerate thumb failed:', err);
      alert(
        err instanceof Error
          ? `Couldn't regenerate thumb — ${err.message}`
          : 'Couldn\'t regenerate thumb (see console).'
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  const deleteRow = async (row: GalleryRow) => {
    if (!window.confirm('Delete this gallery item permanently?')) return;
    const { error: dbErr } = await supabase
      .from('proposal_gallery')
      .delete()
      .eq('id', row.id);
    if (dbErr) {
      alert('Delete failed: ' + dbErr.message);
      return;
    }
    // Best-effort storage cleanup — parse the path back out of the public URL.
    try {
      const marker = '/storage/v1/object/public/proposal-gallery/';
      const idx = row.media_url.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(row.media_url.slice(idx + marker.length));
        await supabase.storage.from('proposal-gallery').remove([path]);
      }
    } catch (err) {
      console.warn('Storage cleanup non-fatal:', err);
    }
    await fetchRows();
  };

  // ---- Group by service for rendering --------------------------------------
  const grouped: Record<string, GalleryRow[]> = {};
  rows.forEach((r) => {
    if (!grouped[r.service_type]) grouped[r.service_type] = [];
    grouped[r.service_type].push(r);
  });
  const groupKeys = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div
        className="pv-page"
        style={{
          minHeight: '100vh',
          background: T.beige,
          padding: 80,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div
      className="pv-page"
      style={{ minHeight: '100vh', background: T.beige }}
    >
      {/* Header */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '14px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: 'transparent',
                border: '1.5px solid rgba(0,0,0,0.1)',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                color: T.navy,
              }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 800,
                fontSize: 18,
                color: T.navy,
                letterSpacing: '-0.01em',
              }}
            >
              Shortcut
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: 'rgba(0,0,0,0.1)',
              }}
            />
            <div
              style={{
                fontFamily: T.fontD,
                fontWeight: 600,
                fontSize: 14,
                color: T.navy,
              }}
            >
              Proposal gallery
            </div>
            <span
              style={{
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 10,
                color: T.coral,
                background: 'rgba(255,80,80,0.10)',
                padding: '2px 8px',
                borderRadius: 999,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Staff only
            </span>
          </div>
        </div>
      </header>

      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '32px 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 28,
          alignItems: 'flex-start',
        }}
      >
        {/* ---- Main column: grouped media list ---- */}
        <main>
          <SectionLabel
            eyebrow="Library"
            title="What clients see in GalleryCard"
            size="section"
            mb={20}
          />

          {error && (
            <div
              style={{
                background: 'rgba(255,80,80,0.10)',
                border: '1px solid rgba(255,80,80,0.25)',
                color: T.coral,
                fontFamily: T.fontD,
                fontSize: 13,
                lineHeight: 1.55,
                padding: '12px 16px',
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {rows.length === 0 && !error ? (
            <div
              style={{
                background: '#fff',
                border: '1px dashed rgba(0,0,0,0.18)',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center',
                fontFamily: T.fontD,
                color: T.fgMuted,
              }}
            >
              No media yet. Upload the first clip or photo from the panel to
              the right — it'll surface in every V2 proposal that includes that
              service type.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {groupKeys.map((key) => (
                <div
                  key={key}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 18,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <CardHeading size="card">
                      {SERVICE_DISPLAY[key] || key}
                    </CardHeading>
                    <Eyebrow>
                      {grouped[key].length} item
                      {grouped[key].length === 1 ? '' : 's'}
                    </Eyebrow>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {grouped[key].map((row) => (
                      <div
                        key={row.id}
                        style={{
                          background: '#fff',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 12,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          opacity: row.is_published === false ? 0.55 : 1,
                        }}
                      >
                        <div
                          style={{
                            aspectRatio: '4 / 3',
                            background:
                              row.poster_url || row.media_type === 'image'
                                ? `center / cover no-repeat url(${
                                    row.poster_url || row.media_url
                                  })`
                                : T.lightGray,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Fallback for older video rows that don't have a
                              poster_url yet — render the actual <video> with
                              preload=metadata so the browser pulls the first
                              frame. Cheap, and covers anything uploaded before
                              the auto-poster path landed. */}
                          {row.media_type === 'video' && !row.poster_url && (
                            <video
                              src={row.media_url}
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
                          {row.media_type === 'video' && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                background: 'rgba(0,0,0,0.65)',
                                color: '#fff',
                                fontFamily: T.fontUi,
                                fontWeight: 700,
                                fontSize: 10,
                                padding: '3px 8px',
                                borderRadius: 999,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Play size={9} fill="#fff" />
                              Video
                            </div>
                          )}
                          {row.is_featured && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                background: T.coral,
                                color: '#fff',
                                fontFamily: T.fontUi,
                                fontWeight: 700,
                                fontSize: 10,
                                padding: '3px 8px',
                                borderRadius: 999,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Featured
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          {editingId === row.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingCaption}
                              onChange={(e) => setEditingCaption(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateRow(row.id, {
                                    caption: editingCaption.trim() || null,
                                  });
                                  setEditingId(null);
                                }
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onBlur={() => {
                                updateRow(row.id, {
                                  caption: editingCaption.trim() || null,
                                });
                                setEditingId(null);
                              }}
                              style={{
                                padding: '6px 10px',
                                fontFamily: T.fontD,
                                fontSize: 13,
                                color: T.navy,
                                border: '1.5px solid rgba(0,152,173,0.4)',
                                borderRadius: 6,
                                outline: 'none',
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(row.id);
                                setEditingCaption(row.caption || '');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontFamily: T.fontD,
                                fontSize: 13,
                                color: row.caption ? T.navy : T.fgMuted,
                                textAlign: 'left',
                              }}
                              title="Edit caption"
                            >
                              <Pencil size={11} color={T.fgMuted} />
                              <span
                                style={{
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {row.caption || 'Add caption…'}
                              </span>
                            </button>
                          )}
                          <div
                            style={{
                              display: 'flex',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <SmallChipButton
                              onClick={() =>
                                updateRow(row.id, { is_featured: !row.is_featured })
                              }
                              active={!!row.is_featured}
                              icon={
                                row.is_featured ? (
                                  <Star size={11} fill="currentColor" />
                                ) : (
                                  <StarOff size={11} />
                                )
                              }
                            >
                              {row.is_featured ? 'Featured' : 'Make featured'}
                            </SmallChipButton>
                            <SmallChipButton
                              onClick={() =>
                                updateRow(row.id, {
                                  is_published: !row.is_published,
                                })
                              }
                              active={row.is_published !== false}
                              icon={
                                row.is_published !== false ? (
                                  <CheckCircle2 size={11} />
                                ) : (
                                  <X size={11} />
                                )
                              }
                            >
                              {row.is_published !== false ? 'Live' : 'Hidden'}
                            </SmallChipButton>
                            {row.media_type === 'video' && (
                              <SmallChipButton
                                onClick={() => regenerateThumb(row)}
                                icon={<ImageIcon size={11} />}
                              >
                                {regeneratingId === row.id
                                  ? 'Working…'
                                  : 'Regen thumb'}
                              </SmallChipButton>
                            )}
                            <SmallChipButton
                              onClick={() => deleteRow(row)}
                              tone="danger"
                              icon={<Trash2 size={11} />}
                            >
                              Delete
                            </SmallChipButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ---- Sidebar: upload form + migration help ---- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: isDragOver ? 'rgba(158,250,255,.22)' : '#fff',
              border: isDragOver
                ? `2px dashed ${T.aqua}`
                : '1px solid rgba(0,0,0,0.06)',
              borderRadius: 16,
              padding: '22px 24px',
              position: 'sticky',
              top: 80,
              transition: 'background .15s, border-color .15s',
            }}
            onDragOver={onDragOver}
            onDragEnter={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <Eyebrow style={{ marginBottom: 4 }}>Add to library</Eyebrow>
            <CardHeading size="card" style={{ marginBottom: 14 }}>
              Upload an image or clip
            </CardHeading>
            <p
              style={{
                fontFamily: T.fontD,
                fontSize: 12,
                color: T.fgMuted,
                lineHeight: 1.5,
                margin: '0 0 14px',
              }}
            >
              Drag and drop files anywhere on this panel — multi-file drops
              upload in bulk, single drops attach to the form so you can add a
              caption + featured pin before saving.
            </p>
            {isDragOver && (
              <div
                style={{
                  padding: '10px 12px',
                  background: T.aqua,
                  color: T.navy,
                  borderRadius: 10,
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 14,
                  textAlign: 'center',
                }}
              >
                Drop to upload
              </div>
            )}
            {bulkProgress && (
              <div
                style={{
                  padding: '10px 12px',
                  background: T.beige,
                  borderRadius: 10,
                  fontFamily: T.fontD,
                  fontSize: 12,
                  color: T.navy,
                  marginBottom: 14,
                }}
              >
                Uploading {bulkProgress.done} of {bulkProgress.total}…
              </div>
            )}

            <Field label="Service type">
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                style={inputStyle}
              >
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Media type">
              <div style={{ display: 'flex', gap: 8 }}>
                {(['image', 'video'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setMediaType(t)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: mediaType === t ? T.navy : '#fff',
                      color: mediaType === t ? '#fff' : T.navy,
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="File">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  // Auto-switch the media-type pill to whatever was picked so
                  // the row gets tagged correctly without the user having to
                  // toggle first.
                  if (f) {
                    if (f.type.startsWith('video/')) setMediaType('video');
                    else if (f.type.startsWith('image/')) setMediaType('image');
                  }
                }}
                style={inputStyle}
              />
              {file && (
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: T.fontD,
                    fontSize: 12,
                    color: T.fgMuted,
                  }}
                >
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              )}
            </Field>

            <Field label="Caption (optional)">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Headshot session at DraftKings HQ"
                style={inputStyle}
              />
            </Field>

            <Field label="Featured?">
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.navy,
                }}
              >
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Pin to the top of this service
              </label>
            </Field>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadBusy || !file}
              style={{
                width: '100%',
                padding: '11px 16px',
                background: T.coral,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: uploadBusy || !file ? 'not-allowed' : 'pointer',
                fontFamily: T.fontUi,
                fontWeight: 700,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 6,
                opacity: uploadBusy || !file ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(255,80,80,0.25)',
              }}
            >
              <Upload size={13} />
              {uploadBusy ? 'Uploading…' : 'Upload'}
            </button>
            {uploadMsg && (
              <div
                style={{
                  marginTop: 8,
                  fontFamily: T.fontD,
                  fontSize: 12,
                  color: uploadMsg === 'Uploaded.' ? T.success : T.coral,
                }}
              >
                {uploadMsg}
              </div>
            )}
          </div>

          {/* Migration hint card — only show when the table seems missing. */}
          {error && (
            <div
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 16,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <Eyebrow>First-time setup</Eyebrow>
              <p
                style={{
                  fontFamily: T.fontD,
                  fontSize: 13,
                  color: T.fgMuted,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Open the Supabase dashboard → SQL Editor and run
                <code
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    background: T.lightGray,
                    padding: '2px 6px',
                    borderRadius: 4,
                    margin: '0 4px',
                    color: T.navy,
                  }}
                >
                  supabase/migrations/20260513000001_create_proposal_gallery.sql
                </code>
                . It creates the table + storage bucket with the right RLS.
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Inline helpers
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontFamily: T.fontD,
  fontSize: 13,
  color: T.navy,
  background: '#fff',
  border: '1.5px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ marginBottom: 12 }}>
    <div
      style={{
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 11,
        color: T.fgMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

interface SmallChipButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  tone?: 'default' | 'danger';
  icon?: React.ReactNode;
}
const SmallChipButton: React.FC<SmallChipButtonProps> = ({
  onClick,
  children,
  active,
  tone,
  icon,
}) => {
  const isDanger = tone === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 9px',
        background: isDanger
          ? 'transparent'
          : active
          ? T.aqua
          : 'transparent',
        border: `1.5px solid ${
          isDanger ? 'rgba(255,80,80,0.25)' : 'rgba(0,0,0,0.1)'
        }`,
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: isDanger ? T.coral : T.navy,
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};

export default ProposalGalleryAdmin;
