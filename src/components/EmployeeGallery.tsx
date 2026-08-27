import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Check, AlertCircle, Download, Mail, X } from 'lucide-react';
import { HeadshotService } from '../services/HeadshotService';
import { EmployeeGallery as EmployeeGalleryType, GalleryPhoto } from '../types/headshot';
import { supabase } from '../lib/supabaseClient';

// Brand tokens (mirrors the menu / conference / partner pages).
const INK = 'text-[#032232]';
const SOFT = 'text-[#45596A]';
const LINE = 'border-[#E2E9E8]';
const SHADOW = 'shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

// Sticky partner nav: client logo (name fallback), "with Shortcut", status pill.
const GalleryNav: React.FC<{
  logoUrl?: string | null;
  name?: string | null;
  right?: React.ReactNode;
}> = ({ logoUrl, name, right }) => (
  <nav className="sticky top-0 z-40 h-16 border-b border-black/[.08] bg-white">
    <div className="mx-auto flex h-full max-w-[1140px] items-center justify-between gap-4 px-5 md:px-7">
      <div className="flex items-center gap-3.5">
        {logoUrl ? (
          <img src={logoUrl} alt={name || 'Client'} className="h-7 w-auto max-w-[200px] object-contain" />
        ) : name ? (
          <span className="text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">{name}</span>
        ) : null}
        {(logoUrl || name) && <span className="h-6 w-px bg-black/10" />}
        <span className="flex items-center gap-[7px] text-[11px] font-bold text-[rgba(3,34,50,.45)]">
          <span>with</span>
          <img src="/conference/shortcut-logo-rgb.svg" alt="Shortcut" className="block h-4 w-auto" />
        </span>
      </div>
      {right}
    </div>
  </nav>
);

/**
 * The guided rail. On desktop it pins beside the photos so the count, the
 * picks, the notes and the Confirm button stay in view while scrolling; on
 * mobile it stacks under the grid. It is the single place that answers
 * "what am I meant to do, and how far along am I?".
 */
const ActionRail: React.FC<{
  maxPicks: number;
  selectedPhotos: string[];
  photos: GalleryPhoto[];
  canChangeSelection: boolean;
  hasFinalPhoto: boolean;
  isSelectionMade: boolean;
  isDeadlinePassed: boolean;
  isSubmitting: boolean;
  onUnpick: (photoId: string) => void;
  onConfirm: () => void;
  deadlineLabel?: string | null;
  notes: string;
  setNotes: (v: string) => void;
  onSaveNotes: () => void;
  savingNotes: boolean;
}> = ({
  maxPicks, selectedPhotos, photos, canChangeSelection, hasFinalPhoto,
  isSelectionMade, isDeadlinePassed, isSubmitting, onUnpick, onConfirm,
  deadlineLabel, notes, setNotes, onSaveNotes, savingNotes,
}) => {
  const picked = selectedPhotos.length;
  const left = maxPicks - picked;
  const choosing = canChangeSelection && !hasFinalPhoto && !isDeadlinePassed;
  const byId = (id: string) => photos.find(p => p.id === id);

  return (
    <div className={`rounded-[18px] border ${LINE} bg-white p-6 ${SHADOW}`}>
      {/* ---- Step 1: pick ---- */}
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">
          {hasFinalPhoto ? 'All done' : isSelectionMade ? 'With our retouchers' : 'Your picks'}
        </h3>
        {choosing && (
          <span className={`text-[13px] font-bold ${left === 0 ? 'text-[#FF5050]' : SOFT}`}>
            {picked} of {maxPicks}
          </span>
        )}
      </div>

      {choosing && (
        <>
          <p className={`mt-1 text-[14px] leading-[1.5] ${SOFT}`}>
            {left > 0
              ? `Pick ${left} more ${left === 1 ? 'photo' : 'photos'} from the left, then confirm.`
              : maxPicks > 1
              ? 'That is all of them. Confirm when you are happy.'
              : 'Confirm when you are happy, or tap another photo to swap.'}
          </p>

          {/* progress slots, so the allowance is visible even before picking */}
          <div className="mt-4 flex gap-2">
            {Array.from({ length: maxPicks }).map((_, i) => {
              const id = selectedPhotos[i];
              const photo = id ? byId(id) : undefined;
              return (
                <div
                  key={i}
                  className={`relative aspect-square w-full max-w-[84px] overflow-hidden rounded-[12px] border-2 ${
                    photo ? 'border-[#FF5050]' : `border-dashed ${LINE} bg-[#F1F6F5]`
                  }`}
                >
                  {photo ? (
                    <>
                      <img src={photo.photo_url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => onUnpick(photo.id)}
                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/95 text-[#003756] shadow-[0_1px_5px_rgba(3,34,50,.3)]"
                        title="Remove this pick"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[15px] font-extrabold text-[#45596A]/50">
                      {i + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ---- Step 2: notes ---- */}
          <div className={`mt-6 border-t ${LINE} pt-5`}>
            <h4 className="text-[14px] font-extrabold text-[#003756]">Notes for our retouchers</h4>
            <p className={`mt-1 text-[13px] leading-[1.45] ${SOFT}`}>
              Optional. Glasses glare, a stray hair, a preference.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us here."
              className={`mt-3 h-24 w-full resize-none rounded-[14px] border-2 ${LINE} px-3.5 py-2.5 text-[14px] focus:border-[#003756] focus:outline-none`}
              maxLength={500}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-[12px] ${SOFT}`}>{notes.length}/500</span>
              <button
                onClick={onSaveNotes}
                disabled={savingNotes}
                className={`text-[13px] font-bold text-[#003756] underline underline-offset-2 hover:opacity-70 disabled:opacity-50`}
              >
                {savingNotes ? 'Saving...' : 'Save notes'}
              </button>
            </div>
          </div>

          {/* ---- Step 3: confirm ---- */}
          <button
            onClick={onConfirm}
            disabled={isSubmitting || picked === 0}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5050] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                Confirming&hellip;
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {picked === 0
                  ? 'Pick a photo first'
                  : picked > 1
                  ? `Confirm these ${picked}`
                  : 'Confirm my pick'}
              </>
            )}
          </button>
          <p className={`mt-2.5 text-center text-[12.5px] ${SOFT}`}>
            You can change your mind until you confirm.
          </p>

          {deadlineLabel && (
            <p className={`mt-4 border-t ${LINE} pt-4 text-center text-[12px] font-bold uppercase tracking-[.06em] ${SOFT}`}>
              Pick by {deadlineLabel}
            </p>
          )}
        </>
      )}

      {/* ---- Locked in ---- */}
      {!choosing && (
        <>
          <p className={`mt-1 text-[14px] leading-[1.5] ${SOFT}`}>
            {hasFinalPhoto
              ? 'Your retouched photo is ready to download on the left.'
              : isDeadlinePassed && !isSelectionMade
              ? 'The deadline has passed. Email us and we will see what we can do.'
              : 'We are retouching your pick now. We will email you when it is ready.'}
          </p>
          {selectedPhotos.length > 0 && (
            <div className="mt-4 flex gap-2">
              {selectedPhotos.map(id => {
                const photo = byId(id);
                return photo ? (
                  <img
                    key={id}
                    src={photo.photo_url}
                    alt=""
                    className="aspect-square w-full max-w-[84px] rounded-[12px] border-2 border-[#FF5050] object-cover"
                  />
                ) : null;
              })}
            </div>
          )}
          {notes.trim() && (
            <div className={`mt-5 border-t ${LINE} pt-4`}>
              <h4 className="text-[13px] font-extrabold text-[#003756]">Your note</h4>
              <p className={`mt-1 text-[13.5px] leading-[1.5] ${SOFT}`}>{notes}</p>
            </div>
          )}
          <a
            href="mailto:hello@getshortcut.co"
            className={`mt-5 block border-t ${LINE} pt-4 text-center text-[13px] font-bold text-[#003756] hover:opacity-70`}
          >
            Need a change? Email us
          </a>
        </>
      )}
    </div>
  );
};

const EmployeeGallery: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [gallery, setGallery] = useState<EmployeeGalleryType | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canChangeSelection, setCanChangeSelection] = useState(false);
  const [eventData, setEventData] = useState<{ event_name: string; client_logo_url?: string; selection_deadline?: string; selections_allowed?: number } | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (token) {
      fetchGallery();
    }
  }, [token]);

  // Handle escape key to close expanded photo
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedPhoto) {
        setExpandedPhoto(null);
      }
    };

    if (expandedPhoto) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [expandedPhoto]);

  const fetchGallery = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const galleryData = await HeadshotService.getGalleryByToken(token!);
      if (galleryData) {
        setGallery(galleryData);
        setPhotos(galleryData.photos || []);

        // Restore whatever they already picked
        const alreadyPicked = (galleryData.photos || []).filter(photo => photo.is_selected);
        setSelectedPhotos(alreadyPicked.map(photo => photo.id));

        // Load existing notes
        setNotes(galleryData.notes || '');

        // Determine if selection can be changed
        const isSelectionMade = galleryData.status === 'selection_made' ||
                               galleryData.status === 'retouching' ||
                               galleryData.status === 'completed';
        setCanChangeSelection(!isSelectionMade);

        // Fetch event data for client logo
        try {
          const BASE_COLS = 'event_name, client_logo_url, selection_deadline';

          // selections_allowed arrives with its migration. Until that has run,
          // asking for it fails the whole query, which would drop the client
          // logo and event name from this page, so fall back to the old columns.
          let { data: event, error } = await supabase
            .from('headshot_events')
            .select(`${BASE_COLS}, selections_allowed`)
            .eq('id', galleryData.event_id)
            .single();

          if (error) {
            ({ data: event, error } = await supabase
              .from('headshot_events')
              .select(BASE_COLS)
              .eq('id', galleryData.event_id)
              .single());
          }

          if (!error && event) {
            setEventData(event);

            // Check if deadline has passed (compare dates only)
            if (event.selection_deadline) {
              // Parse the date as local time to avoid timezone issues
              const dateStr = event.selection_deadline.split('T')[0];
              const [year, month, day] = dateStr.split('-');
              const deadlineDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              setIsDeadlinePassed(today > deadlineDate);
            }
          }
        } catch (eventErr) {
          console.error('Error fetching event data:', eventErr);
          // Don't fail the whole operation if event data fails
        }
      } else {
        setError('We could not find this gallery. Check your link, or contact us and we will sort it out.');
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Your photos did not load. Try refreshing, or contact us and we will sort it out.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (photoId: string) => {
    if (!canChangeSelection) return;

    setSelectedPhotos(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      }
      // At the cap with one pick allowed, tapping another photo swaps it.
      if (maxPicks === 1) return [photoId];
      if (prev.length >= maxPicks) return prev;
      return [...prev, photoId];
    });
  };

  const handlePhotoExpand = (photo: GalleryPhoto) => {
    setExpandedPhoto(photo);
  };

  const handlePhotoDoubleClick = (photo: GalleryPhoto) => {
    setExpandedPhoto(photo);
  };

  const handleCloseExpanded = () => {
    setExpandedPhoto(null);
  };

  const handleModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseExpanded();
    }
  };

  const handleSubmitSelection = async () => {
    if (selectedPhotos.length === 0 || !gallery) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await HeadshotService.selectPhotos(selectedPhotos, gallery.id);

      setSuccess(
        selectedPhotos.length > 1
          ? 'Picks confirmed. We will email you when your retouched photos are ready to download.'
          : 'Pick confirmed. We will email you when your retouched photo is ready to download.'
      );

      // Update local state to reflect the change
      setCanChangeSelection(false);

      // Refresh the gallery data
      await fetchGallery();

    } catch (err) {
      console.error('Error submitting selection:', err);
      setError('Your selection did not go through. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (photoUrl: string, photoName: string) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(photoUrl);
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photoName || 'headshot.jpg';
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
      // Fallback to opening in new tab
      window.open(photoUrl, '_blank');
    }
  };

  const handleSaveNotes = async () => {
    if (!gallery) return;

    try {
      setIsSavingNotes(true);
      setError(null);

      await HeadshotService.updateEmployeeGallery(gallery.id, { notes });
      setSuccess('Notes saved.');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving notes:', error);
      setError('Your notes did not save. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#003756]" />
          <p className={SOFT}>Loading your photos&hellip;</p>
        </div>
      </div>
    );
  }

  if (error && !gallery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className={`max-w-md rounded-[18px] border ${LINE} bg-white p-8 text-center ${SHADOW}`}>
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#FF5050]" />
          <h1 className="mb-2 text-[24px] font-extrabold tracking-[-.02em] text-[#003756]">Something went wrong</h1>
          <p className={`mb-5 text-[15px] leading-[1.55] ${SOFT}`}>{error}</p>
          <a
            href="mailto:hello@getshortcut.co"
            className="inline-flex items-center gap-2 text-[14px] font-bold text-[#003756]"
          >
            <Mail className="h-4 w-4" />
            hello@getshortcut.co
          </a>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className={`max-w-md rounded-[18px] border ${LINE} bg-white p-8 text-center ${SHADOW}`}>
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#45596A]" />
          <h1 className="mb-2 text-[24px] font-extrabold tracking-[-.02em] text-[#003756]">Gallery not found</h1>
          <p className={`mb-5 text-[15px] leading-[1.55] ${SOFT}`}>This gallery does not exist or has expired.</p>
          <a
            href="mailto:hello@getshortcut.co"
            className="inline-flex items-center gap-2 text-[14px] font-bold text-[#003756]"
          >
            <Mail className="h-4 w-4" />
            hello@getshortcut.co
          </a>
        </div>
      </div>
    );
  }

  const isSelectionMade = gallery.status === 'selection_made' || gallery.status === 'retouching' || gallery.status === 'completed';
  const maxPicks = HeadshotService.selectionsAllowed(eventData);
  const picksLeft = maxPicks - selectedPhotos.length;
  const hasFinalPhoto = photos.some(photo => photo.is_final);
  const firstName = gallery.employee_name?.split(' ')[0] || gallery.employee_name;

  const deadlineLabel = eventData?.selection_deadline ? (() => {
    const dateStr = eventData.selection_deadline.split('T')[0];
    const [year, month, day] = dateStr.split('-');
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  })() : null;

  const statusPill = hasFinalPhoto ? (
    <span className="flex-none rounded-full bg-[#003756] px-4 py-2 text-[12px] font-extrabold text-[#9EFAFF]">Final photo ready</span>
  ) : isSelectionMade ? (
    <span className="flex-none rounded-full bg-[#9EFAFF] px-4 py-2 text-[12px] font-extrabold text-[#003756]">Selection confirmed</span>
  ) : (
    <span className="flex-none rounded-full bg-[#FEDC64] px-4 py-2 text-[12px] font-extrabold text-[#003756]">Pick your photo</span>
  );

  return (
    <div className={`min-h-screen bg-white font-sans leading-[1.55] ${INK}`} onContextMenu={(e) => e.preventDefault()}>
      <GalleryNav logoUrl={eventData?.client_logo_url} name={eventData?.event_name} right={statusPill} />

      <div className="mx-auto max-w-[1200px] px-5 pb-28 md:px-7 lg:pb-16">
        {/* Page head */}
        <div className="pb-8 pt-10 md:pt-12">
          <p className="mb-3 flex items-center gap-[9px] text-[12px] font-bold uppercase tracking-[.09em] text-[#45596A]">
            <span className="h-[7px] w-[7px] flex-none rounded-full bg-[#FF5050]" />
            {eventData?.event_name || 'Your headshot gallery'}
          </p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.06] tracking-[-.03em] text-[#003756]">
            {hasFinalPhoto
              ? 'Your headshot is ready.'
              : isSelectionMade
              ? `Nice pick, ${firstName}.`
              : maxPicks > 1
              ? 'Choose your headshots.'
              : 'Choose your headshot.'}
          </h1>
          <p className={`mt-3 max-w-[52ch] text-[16px] leading-[1.5] ${SOFT}`}>
            {hasFinalPhoto
              ? 'Your retouched photo is below. Download it and put it everywhere.'
              : isSelectionMade
              ? 'Your photos are with our retouchers. We will email you when the finals are ready.'
              : maxPicks > 1
              ? `Welcome back, ${firstName}. You can choose ${maxPicks} photos for us to retouch.`
              : `Welcome back, ${firstName}. You can choose 1 photo for us to retouch.`}
          </p>
          {deadlineLabel && !isSelectionMade && !hasFinalPhoto && (
            <p className="mt-4 inline-flex rounded-full border border-[#E2E9E8] px-3.5 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[.08em] text-[#45596A]">
              Selection deadline: {deadlineLabel}
            </p>
          )}
        </div>

        {/* Status messages */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-[14px] bg-[#9EFAFF] px-5 py-4">
            <Check className="h-5 w-5 flex-none text-[#003756]" />
            <p className="text-[14.5px] font-semibold text-[#003756]">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-[14px] border-2 border-[#FF5050] bg-white px-5 py-4">
            <AlertCircle className="h-5 w-5 flex-none text-[#FF5050]" />
            <p className="text-[14.5px] font-semibold text-[#003756]">{error}</p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_356px] lg:items-start lg:gap-8">
          {/* ---------- Main column ---------- */}
          <main className="min-w-0">

        {/* Contextual status card */}
        <div className="mb-8">
          {isSelectionMade && !hasFinalPhoto && (
            <div className={`rounded-[18px] bg-[#F1F6F5] p-6 ${SHADOW}`}>
              <h3 className="mb-1 text-[17px] font-extrabold text-[#003756]">Selection confirmed.</h3>
              <p className={`text-[14.5px] leading-[1.55] ${SOFT}`}>
                Thanks for choosing. Retouching is underway, and we will email you the moment your final photo is ready to download.
              </p>
              {!canChangeSelection && (
                <button
                  onClick={() => setCanChangeSelection(true)}
                  className="mt-3 rounded-full border-[1.5px] border-[#003756] px-4 py-1.5 text-[12.5px] font-bold text-[#003756] transition-colors hover:bg-[#003756] hover:text-white"
                >
                  Change my selection
                </button>
              )}
            </div>
          )}

          {hasFinalPhoto && (
            <div className={`rounded-[18px] bg-[#003756] p-6 ${SHADOW}`}>
              <h3 className="mb-1 text-[17px] font-extrabold text-[#9EFAFF]">Your final photo is ready.</h3>
              <p className="text-[14.5px] leading-[1.55] text-white/85">
                Retouching is done. Download your headshot below.
              </p>
            </div>
          )}

          {isDeadlinePassed && !isSelectionMade && !hasFinalPhoto && (
            <div className="rounded-[14px] border-2 border-[#FF5050] bg-white px-5 py-4">
              <p className="text-[13.5px] font-semibold text-[#003756]">
                The selection deadline has passed. Email us at hello@getshortcut.co and we will see what we can do.
              </p>
            </div>
          )}
        </div>

        {/* Photos */}
        {photos.length > 0 ? (
          <div className="space-y-10">
            {/* Final photo */}
            {hasFinalPhoto && (
              <div>
                <h2 className="mb-4 text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">Your final photo</h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {photos.filter(photo => photo.is_final).map((photo) => (
                    <div
                      key={photo.id}
                      className={`group relative overflow-hidden rounded-[18px] border-[3px] border-[#003756] bg-white ${SHADOW}`}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt={photo.photo_name || 'Final headshot'}
                          className="h-full w-full select-none object-cover transition-transform duration-200 hover:scale-105"
                          onDoubleClick={() => handlePhotoDoubleClick(photo)}
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          draggable={false}
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-[#9EFAFF] px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[.07em] text-[#003756]">
                          Final
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePhotoExpand(photo); }}
                          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/[.94] text-[#003756] opacity-0 shadow-[0_2px_10px_rgba(3,34,50,.22)] transition-opacity duration-200 group-hover:opacity-100"
                          title="View full size"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <p className="text-[13.5px] font-bold text-[#003756]">
                          {photo.photo_name || 'Final headshot'}
                        </p>
                        <button
                          onClick={() => handleDownload(photo.photo_url, photo.photo_name || 'final-headshot.jpg')}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5050] px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.03]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selection photos */}
            <div>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">
                  {hasFinalPhoto ? 'Your original photos' : 'Your photos'}
                </h2>
                {canChangeSelection && !hasFinalPhoto && (
                  <p className={`text-[14px] font-bold lg:hidden ${picksLeft === 0 ? 'text-[#FF5050]' : SOFT}`}>
                    {selectedPhotos.length} of {maxPicks} picked
                    {picksLeft > 0
                      ? ` \u00b7 ${picksLeft} to go`
                      : maxPicks > 1
                      ? ' \u00b7 tap one again to swap it out'
                      : ' \u00b7 tap another to swap it'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {photos.filter(photo => !photo.is_final).map((photo) => (
                  <div
                    key={photo.id}
                    className={`group relative overflow-hidden rounded-[18px] bg-white transition-all duration-200 ${SHADOW} ${
                      selectedPhotos.includes(photo.id)
                        ? 'border-[3px] border-[#FF5050]'
                        : `border ${LINE} hover:border-[#003756]`
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={photo.photo_url}
                        alt={photo.photo_name || 'Headshot'}
                        className="h-full w-full cursor-pointer select-none object-cover transition-transform duration-200 hover:scale-105"
                        onClick={() => handlePhotoSelect(photo.id)}
                        onDoubleClick={() => handlePhotoDoubleClick(photo)}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        draggable={false}
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <span className="pointer-events-none absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[#FF5050] text-[15px] font-extrabold text-white shadow-[0_2px_10px_rgba(3,34,50,.3)]">
                          {maxPicks > 1 ? selectedPhotos.indexOf(photo.id) + 1 : <Check className="h-5 w-5" />}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePhotoExpand(photo); }}
                        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/[.94] text-[#003756] opacity-0 shadow-[0_2px_10px_rgba(3,34,50,.22)] transition-opacity duration-200 group-hover:opacity-100"
                        title="View full size"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[13.5px] font-bold text-[#003756]">
                        {photo.photo_name || 'Headshot'}
                      </p>
                      {selectedPhotos.includes(photo.id) && (
                        <p className="text-[11.5px] font-bold uppercase tracking-[.06em] text-[#FF5050]">
                          {canChangeSelection ? 'Picked' : 'Being retouched'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className={`rounded-[18px] bg-[#F1F6F5] px-6 py-14 text-center ${SHADOW}`}>
            <Camera className="mx-auto mb-4 h-12 w-12 text-[#45596A]" />
            <h3 className="mb-1 text-[18px] font-extrabold text-[#003756]">No photos yet</h3>
            <p className={`mx-auto max-w-[40ch] text-[14.5px] ${SOFT}`}>
              Your photos have not been uploaded yet. If that seems wrong, email us and we will check.
            </p>
          </div>
        )}

        {/* Retouching explainer */}
        <div className={`mt-12 rounded-[18px] bg-[#003756] p-7 md:p-8 ${SHADOW}`}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.1em] text-[#9EFAFF]">What retouching includes</p>
          <h3 className="mb-4 text-[21px] font-extrabold tracking-[-.02em] text-white">Subtle, natural, still you.</h3>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {[
              'Softening fine lines while keeping your natural look',
              'Tidying flyaways and refining the hairline',
              'Removing temporary blemishes',
              'Evening out glare and shine',
              'Smoothing fabric and clearing distractions',
            ].map(item => (
              <li key={item} className="flex gap-2.5 text-[14px] leading-[1.5] text-white/85">
                <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#9EFAFF]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

          </main>

          {/* ---------- Guided action rail ---------- */}
          <aside className="mt-8 lg:sticky lg:top-[88px] lg:mt-0">
            <ActionRail
              maxPicks={maxPicks}
              selectedPhotos={selectedPhotos}
              photos={photos}
              canChangeSelection={canChangeSelection}
              hasFinalPhoto={hasFinalPhoto}
              isSelectionMade={isSelectionMade}
              isDeadlinePassed={isDeadlinePassed}
              isSubmitting={isSubmitting}
              onUnpick={handlePhotoSelect}
              onConfirm={handleSubmitSelection}
              deadlineLabel={deadlineLabel}
              notes={notes}
              setNotes={setNotes}
              onSaveNotes={handleSaveNotes}
              savingNotes={isSavingNotes}
            />
          </aside>
        </div>

        {/* Footer */}
        <div className={`mt-10 border-t ${LINE} pt-8 text-center`}>
          <div className="mb-2 flex items-center justify-center gap-[7px] text-[12px] font-bold text-[rgba(3,34,50,.45)]">
            <span>Run by</span>
            <img src="/conference/shortcut-logo-rgb.svg" alt="Shortcut" className="h-[18px] w-auto" />
          </div>
          <p className={`text-[14px] ${SOFT}`}>
            Questions about your headshots?{' '}
            <a href="mailto:hello@getshortcut.co" className="font-bold text-[#003756]">
              hello@getshortcut.co
            </a>
          </p>
        </div>
      </div>

      {/* Mobile action bar: the rail is far below the grid on phones, so keep
          the count and Confirm reachable without scrolling to the end. */}
      {canChangeSelection && !hasFinalPhoto && !isDeadlinePassed && photos.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[.08] bg-white/95 px-5 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-[600px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-extrabold text-[#003756]">
                {selectedPhotos.length} of {maxPicks} picked
              </p>
              <p className={`truncate text-[12px] ${SOFT}`}>
                {picksLeft > 0 ? `Pick ${picksLeft} more, then confirm` : 'Ready to confirm'}
              </p>
            </div>
            <button
              onClick={handleSubmitSelection}
              disabled={isSubmitting || selectedPhotos.length === 0}
              className="inline-flex flex-none items-center gap-2 rounded-full bg-[#FF5050] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] disabled:opacity-40"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {expandedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,34,50,.85)] p-4"
          onClick={handleModalClick}
        >
          <div className="relative max-h-full max-w-4xl">
            <button
              onClick={handleCloseExpanded}
              className="absolute right-4 top-4 z-10 grid h-[38px] w-[38px] place-items-center rounded-full bg-white text-[20px] leading-none text-[#003756] shadow-[0_2px_10px_rgba(3,34,50,.3)]"
              title="Close"
            >
              ×
            </button>
            <img
              src={expandedPhoto.photo_url}
              alt={expandedPhoto.photo_name || 'Headshot'}
              className="max-h-full max-w-full select-none rounded-[18px] object-contain"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              draggable={false}
            />
            <div className="absolute bottom-0 left-0 right-0 rounded-b-[18px] bg-[rgba(3,34,50,.75)] p-4">
              <p className="text-[15px] font-bold text-white">
                {expandedPhoto.photo_name || 'Headshot'}
              </p>
              {expandedPhoto.is_final && (
                <p className="text-[12px] font-bold uppercase tracking-[.07em] text-[#9EFAFF]">Final retouched photo</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeGallery;
