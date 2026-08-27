import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Upload, AlertCircle } from 'lucide-react';
import { PhotographerService } from '../services/PhotographerService';
import { HeadshotEvent } from '../types/headshot';
import { BrandNav, Kicker, Headline, Sub, Card, Stat, StatusPill, INK, SOFT, LINE } from './headshot/brand';
import { PhotographerAccess } from '../types/photographer';
import { formatLocalDateShort } from '../utils/dateHelpers';

const PhotographerDashboard: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const [access, setAccess] = useState<PhotographerAccess | null>(null);
  const [events, setEvents] = useState<HeadshotEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateAccess();
    }
  }, [token]);

  const validateAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const photographerAccess = await PhotographerService.validateToken(token!);
      if (!photographerAccess) {
        setError('Invalid or expired photographer access. Please contact support.');
        return;
      }

      setAccess(photographerAccess);
      await fetchEvents();
      
    } catch (err) {
      console.error('Error validating photographer access:', err);
      setError('Failed to validate access. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      // Only fetch events assigned to this photographer
      const eventsData = await PhotographerService.getAssignedEventsForPhotographer(token!);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-white font-sans ${INK}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#E2E9E8] border-t-[#FF5050]" />
          <p className={`text-[15px] ${SOFT}`}>Checking your link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-white px-5 font-sans ${INK}`}>
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#FF5050]" />
          <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">This link is not working</h1>
          <p className={`mt-2 text-[15px] ${SOFT}`}>{error}</p>
          <a
            href="mailto:hello@getshortcut.co"
            className="mt-5 inline-flex items-center rounded-full bg-[#FF5050] px-6 py-3 text-[14.5px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.02]"
          >
            Email us for a new link
          </a>
        </Card>
      </div>
    );
  }

  if (!access) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-white px-5 font-sans ${INK}`}>
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-[#003756]">We could not find this link</h1>
          <p className={`mt-2 text-[15px] ${SOFT}`}>Check the link in your email, or contact us for a fresh one.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white font-sans leading-[1.55] ${INK}`}>
      <BrandNav name="Photographer" />

      <div className="mx-auto max-w-[1140px] px-5 pb-16 md:px-7">
        {/* Page head */}
        <div className="pb-8 pt-10 md:pt-12">
          <Kicker>{access.photographer_name}</Kicker>
          <Headline>Upload your photos.</Headline>
          <Sub>
            Pick an event below, then upload each person's photos into their gallery. They get an
            email once their photos are up.
          </Sub>
        </div>

        {/* Stats */}
        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Events" value={events.length} />
          <Stat label="Active now" value={events.filter(e => e.status === 'active').length} />
          <Stat label="People to shoot" value={events.reduce((sum, e) => sum + e.total_employees, 0)} />
          <Stat label="Completed" value={events.filter(e => e.status === 'completed').length} />
        </div>

        {/* Events */}
        <Card className="overflow-hidden">
          <div className={`border-b ${LINE} px-6 py-5`}>
            <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">Your events</h2>
            <p className={`mt-1 text-[14px] ${SOFT}`}>
              Open an event to upload photos into each person's gallery.
            </p>
          </div>

          {events.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Camera className="mx-auto mb-4 h-10 w-10 text-[#45596A]" />
              <p className="text-[16px] font-bold text-[#003756]">No events assigned yet</p>
              <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>
                Once we assign you to a shoot, it shows up here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#003756]">
                    {['Event', 'Status', 'Date', 'People', 'Photos'].map(label => (
                      <th
                        key={label}
                        className="px-6 py-3 text-left text-[11px] font-extrabold uppercase tracking-[.08em] text-white"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, i) => (
                    <tr
                      key={event.id}
                      className={`${i % 2 ? 'bg-[#F1F6F5]' : 'bg-white'} transition-colors hover:bg-[#9EFAFF]/25`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-[15px] font-bold text-[#003756]">{event.event_name}</div>
                        {event.client_logo_url && (
                          <img
                            src={event.client_logo_url}
                            alt=""
                            className="mt-1.5 h-5 w-auto max-w-[120px] object-contain"
                          />
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <StatusPill
                          tone={
                            event.status === 'completed'
                              ? 'navy'
                              : event.status === 'active'
                              ? 'cyan'
                              : 'mist'
                          }
                        >
                          {event.status === 'completed'
                            ? 'Done'
                            : event.status === 'active'
                            ? 'Ready to shoot'
                            : 'Not started'}
                        </StatusPill>
                      </td>

                      <td className={`whitespace-nowrap px-6 py-4 text-[14.5px] ${SOFT}`}>
                        {formatLocalDateShort(event.event_date)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-[15px] font-bold text-[#003756]">
                        {event.total_employees}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          onClick={() => {
                            window.location.href = `/photographer/${token}/event/${event.id}`;
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-[#FF5050] px-5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.03]"
                        >
                          <Upload className="h-4 w-4" />
                          Upload photos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Footer */}
        <Card tone="mist" className="mt-10 px-6 py-8 text-center">
          <p className="text-[16px] font-bold text-[#003756]">Need a hand?</p>
          <p className={`mt-1.5 text-[14.5px] ${SOFT}`}>
            We answer fast during a shoot.
          </p>
          <a
            href="mailto:hello@getshortcut.co"
            className="mt-4 inline-flex items-center rounded-full border-2 border-[#003756] bg-white px-6 py-2.5 text-[14px] font-bold text-[#003756] transition-colors hover:bg-white/70"
          >
            hello@getshortcut.co
          </a>
        </Card>
      </div>
    </div>
  );
};

export default PhotographerDashboard;
