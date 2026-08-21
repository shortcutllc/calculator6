import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Check, Clock, AlertCircle, Copy, Mail, ExternalLink, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { HeadshotService } from '../services/HeadshotService';
import { EmployeeGallery, HeadshotEvent } from '../types/headshot';

// Brand tokens (mirrors the menu / conference / partner pages).
const SOFT = 'text-[#45596A]';
const LINE = 'border-[#E2E9E8]';
const SHADOW = 'shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

const ManagerGallery: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [event, setEvent] = useState<HeadshotEvent | null>(null);
  const [galleries, setGalleries] = useState<EmployeeGallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'status' | 'email'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const statusDefinitions = {
    'Photos ready': 'Photos are uploaded and the employee can make their selection.',
    'In retouching': 'The employee picked their photo and our retouchers are on it.',
    'Final ready': 'The retouched photo is done and ready for the employee to download.',
  };

  useEffect(() => {
    if (token) {
      fetchManagerData();
    }
  }, [token]);

  const fetchManagerData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, get the event by manager token
      const eventData = await HeadshotService.getEventByManagerToken(token);
      setEvent(eventData);

      // Then get all galleries for this event
      const galleriesData = await HeadshotService.getGalleriesByEvent(eventData.id);
      setGalleries(galleriesData);

    } catch (err) {
      console.error('Error fetching manager data:', err);
      setError('The dashboard did not load. Try refreshing, or contact us and we will sort it out.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (gallery: EmployeeGallery) => {
    const status = gallery.status;
    const hasPhotos = gallery.photos && gallery.photos.length > 0;
    const hasFinalPhoto = gallery.photos?.some(photo => photo.is_final);

    if (!hasPhotos) {
      return {
        text: 'No photos yet',
        color: 'bg-[#F1F6F5] text-[#45596A]',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        sortOrder: 0
      };
    }

    if (hasFinalPhoto) {
      return {
        text: 'Final ready',
        color: 'bg-[#003756] text-[#9EFAFF]',
        icon: <Check className="h-3.5 w-3.5" />,
        sortOrder: 3
      };
    }

    if (status === 'selection_made' || status === 'retouching') {
      return {
        text: 'In retouching',
        color: 'bg-[#9EFAFF] text-[#003756]',
        icon: <Clock className="h-3.5 w-3.5" />,
        sortOrder: 2
      };
    }

    return {
      text: 'Photos ready',
      color: 'bg-[#FEDC64] text-[#003756]',
      icon: <Camera className="h-3.5 w-3.5" />,
      sortOrder: 1
    };
  };

  const handleSort = (field: 'name' | 'status' | 'email') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedGalleries = useMemo(() => {
    return [...galleries].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.employee_name.localeCompare(b.employee_name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'status':
          const statusA = getStatusBadge(a);
          const statusB = getStatusBadge(b);
          comparison = statusA.sortOrder - statusB.sortOrder;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [galleries, sortField, sortDirection]);

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getGalleryUrl = (galleryToken: string) => {
    return `${window.location.origin}/gallery/${galleryToken}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#003756]" />
          <p className={SOFT}>Loading your dashboard&hellip;</p>
        </div>
      </div>
    );
  }

  if (error) {
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

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className={`max-w-md rounded-[18px] border ${LINE} bg-white p-8 text-center ${SHADOW}`}>
          <h1 className="mb-2 text-[24px] font-extrabold tracking-[-.02em] text-[#003756]">Event not found</h1>
          <p className={`text-[15px] ${SOFT}`}>This event does not exist or the link has expired.</p>
        </div>
      </div>
    );
  }

  const statusCounts = galleries.reduce((acc, gallery) => {
    const status = getStatusBadge(gallery);
    acc[status.text] = (acc[status.text] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats: { value: number; label: string }[] = [
    { value: galleries.length, label: 'people' },
    { value: statusCounts['Photos ready'] || 0, label: 'picking their photo' },
    { value: statusCounts['In retouching'] || 0, label: 'in retouching' },
    { value: statusCounts['Final ready'] || 0, label: 'finals ready' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans leading-[1.55] text-[#032232]">
      {/* Sticky partner nav */}
      <nav className="sticky top-0 z-40 h-16 border-b border-black/[.08] bg-white">
        <div className="mx-auto flex h-full max-w-[1140px] items-center justify-between gap-4 px-5 md:px-7">
          <div className="flex items-center gap-3.5">
            {event.client_logo_url ? (
              <img src={event.client_logo_url} alt={event.event_name} className="h-7 w-auto max-w-[200px] object-contain" />
            ) : (
              <span className="text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">{event.event_name}</span>
            )}
            <span className="h-6 w-px bg-black/10" />
            <span className="flex items-center gap-[7px] text-[11px] font-bold text-[rgba(3,34,50,.45)]">
              <span>with</span>
              <img src="/conference/shortcut-logo-rgb.svg" alt="Shortcut" className="block h-4 w-auto" />
            </span>
          </div>
          <span className="flex-none rounded-full border border-[#E2E9E8] px-3.5 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[.08em] text-[#45596A]">
            Manager view
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-[1140px] px-5 pb-16 md:px-7">
        {/* Page head */}
        <div className="pb-2 pt-10 md:pt-12">
          <p className="mb-3 flex items-center gap-[9px] text-[12px] font-bold uppercase tracking-[.09em] text-[#45596A]">
            <span className="h-[7px] w-[7px] flex-none rounded-full bg-[#FF5050]" />
            Manager dashboard
          </p>
          <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.06] tracking-[-.03em] text-[#003756]">
            {event.event_name}. <span className={`font-bold ${SOFT}`}>Every gallery, one view.</span>
          </h1>
        </div>

        {/* Stats strip */}
        <div className={`mt-8 grid grid-cols-2 gap-y-5 border-y ${LINE} py-6 md:grid-cols-4`}>
          {stats.map((s, i) => (
            <div key={s.label} className={`px-1 md:px-8 ${i === 0 ? 'md:border-0 md:pl-1' : `md:border-l md:${LINE.replace('border-', 'border-l-')}`}`}>
              <b className="block text-[38px] font-extrabold leading-none tracking-[-.03em] text-[#003756]">{s.value}</b>
              <span className={`mt-2 block text-[11.5px] font-bold uppercase tracking-[.08em] ${SOFT}`}>{s.label}</span>
            </div>
          ))}
          <div className="relative col-span-2 flex items-center gap-2 md:col-span-4">
            <div className="group relative flex items-center gap-2">
              <Info className={`h-4 w-4 cursor-pointer ${SOFT}`} />
              <span className={`text-[12.5px] font-semibold ${SOFT}`}>What the statuses mean</span>
              <div className={`pointer-events-none absolute left-0 top-6 z-10 w-80 rounded-[14px] border ${LINE} bg-white p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${SHADOW}`}>
                {Object.entries(statusDefinitions).map(([status, definition]) => (
                  <div key={status} className="mb-2 last:mb-0">
                    <p className="text-[13px] font-bold text-[#003756]">{status}</p>
                    <p className={`text-[12.5px] leading-[1.45] ${SOFT}`}>{definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Employee list */}
        <div className={`mt-8 overflow-hidden rounded-[18px] border ${LINE} bg-white ${SHADOW}`}>
          <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${LINE} px-6 py-4`}>
            <div>
              <h2 className="text-[18px] font-extrabold tracking-[-.015em] text-[#003756]">Your team&rsquo;s galleries</h2>
              <p className={`text-[13.5px] ${SOFT}`}>Open any gallery exactly as that person sees it, or copy their link to resend it.</p>
            </div>
            <span className={`rounded-full border ${LINE} px-3.5 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[.08em] ${SOFT}`}>
              Sorted by {sortField}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#003756]">
                  {([
                    { field: 'name' as const, label: 'Employee' },
                    { field: 'status' as const, label: 'Status' },
                    { field: 'email' as const, label: 'Gallery' },
                  ]).map(col => (
                    <th key={col.field} className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort(col.field)}
                        className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-white transition-opacity hover:opacity-80"
                      >
                        <span>{col.label}</span>
                        {sortField === col.field ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-[11px] font-extrabold uppercase tracking-[.08em] text-white">
                    Photos
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedGalleries.map((gallery, idx) => {
                  const status = getStatusBadge(gallery);
                  const galleryUrl = getGalleryUrl(gallery.unique_token);

                  return (
                    <tr key={gallery.id} className={idx % 2 ? 'bg-[#F8F9FA]' : 'bg-white'}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-[14px] font-bold text-[#003756]">
                          {gallery.employee_name}
                        </div>
                        <div className={`text-[12.5px] ${SOFT}`}>
                          {gallery.email}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ${status.color}`}>
                          {status.icon}
                          {status.text}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <a
                            href={galleryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#003756] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open gallery
                          </a>
                          <button
                            onClick={() => copyToClipboard(galleryUrl, gallery.unique_token)}
                            className={`${SOFT} transition-colors hover:text-[#003756]`}
                            title="Copy link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {copiedToken === gallery.unique_token && (
                            <span className="rounded-full bg-[#9EFAFF] px-2.5 py-1 text-[10.5px] font-extrabold text-[#003756]">Copied</span>
                          )}
                        </div>
                      </td>

                      <td className={`whitespace-nowrap px-6 py-4 text-[12.5px] font-semibold ${SOFT}`}>
                        {gallery.photos?.length || 0} photo{(gallery.photos?.length || 0) === 1 ? '' : 's'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-10 border-t ${LINE} pt-8 text-center`}>
          <div className="mb-2 flex items-center justify-center gap-[7px] text-[12px] font-bold text-[rgba(3,34,50,.45)]">
            <span>Run by</span>
            <img src="/conference/shortcut-logo-rgb.svg" alt="Shortcut" className="h-[18px] w-auto" />
          </div>
          <p className={`text-[14px] ${SOFT}`}>
            Questions about this dashboard?{' '}
            <a href="mailto:hello@getshortcut.co" className="font-bold text-[#003756]">
              hello@getshortcut.co
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManagerGallery;
