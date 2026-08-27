import React, { useState, useEffect } from 'react';
import { Copy, Check, Mail, Phone, User } from 'lucide-react';
import { HeadshotService } from '../services/HeadshotService';
import { EmployeeGallery } from '../types/headshot';
import { Modal, Card, OutlineButton, StatusPill, SOFT, LINE, inputClass } from './headshot/brand';

interface EmployeeLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export const EmployeeLinksModal: React.FC<EmployeeLinksModalProps> = ({
  isOpen,
  onClose,
  eventId
}) => {
  const [galleries, setGalleries] = useState<EmployeeGallery[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchGalleries();
    }
  }, [isOpen, eventId]);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const data = await HeadshotService.getGalleriesByEvent(eventId);
      setGalleries(data);
    } catch (error) {
      console.error('Error fetching galleries:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateGalleryUrl = (token: string) => {
    return `${window.location.origin}/gallery/${token}`;
  };

  if (!isOpen) return null;

  const statusTone = (status: EmployeeGallery['status']) =>
    status === 'completed' || status === 'retouching'
      ? 'navy'
      : status === 'photos_uploaded' || status === 'selection_made'
      ? 'cyan'
      : 'mist';

  return (
    <Modal
      onClose={onClose}
      title="Gallery links"
      sub="Each person has their own private link. Send it if their email bounced."
      wide
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
        </div>
      ) : galleries.length === 0 ? (
        <div className="py-12 text-center">
          <User className="mx-auto mb-4 h-10 w-10 text-[#45596A]" />
          <p className="text-[16px] font-bold text-[#003756]">Nobody on this event yet</p>
          <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>Import the roster from a CSV first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {galleries.map((gallery) => {
            const galleryUrl = generateGalleryUrl(gallery.unique_token);
            const isCopied = copiedToken === gallery.unique_token;
            const selectedPhoto = gallery.photos?.find(p => p.id === gallery.selected_photo_id);

            return (
              <Card key={gallery.id} className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h3 className="text-[15.5px] font-bold text-[#003756]">{gallery.employee_name}</h3>
                  <StatusPill tone={statusTone(gallery.status)}>
                    {gallery.status.replace(/_/g, ' ')}
                  </StatusPill>
                </div>

                {selectedPhoto && (
                  <div className="mb-4 flex items-center gap-3">
                    <img
                      src={selectedPhoto.photo_url}
                      alt=""
                      className="h-16 w-16 rounded-[12px] border-[3px] border-[#FF5050] object-cover"
                    />
                    <div>
                      <div className="text-[14px] font-bold text-[#003756]">
                        {selectedPhoto.photo_name || 'Their pick'}
                      </div>
                      <div className={`text-[13px] ${SOFT}`}>Chosen for retouching</div>
                    </div>
                  </div>
                )}

                <div className={`mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13.5px] ${SOFT}`}>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {gallery.email}
                  </span>
                  {gallery.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {gallery.phone}
                    </span>
                  )}
                </div>

                <div className="rounded-[14px] bg-[#F1F6F5] p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[.09em] text-[#45596A]">
                    Their private link
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={galleryUrl}
                      readOnly
                      className={`${inputClass} min-w-[240px] flex-1 bg-white font-mono text-[13px]`}
                    />
                    <button
                      onClick={() => copyToClipboard(galleryUrl, gallery.unique_token)}
                      className={`inline-flex flex-none items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-bold transition-colors ${
                        isCopied
                          ? 'bg-[#9EFAFF] text-[#003756]'
                          : 'bg-[#003756] text-white hover:opacity-90'
                      }`}
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className={`mt-6 flex justify-end border-t ${LINE} pt-5`}>
        <OutlineButton onClick={onClose}>Close</OutlineButton>
      </div>
    </Modal>
  );
};
