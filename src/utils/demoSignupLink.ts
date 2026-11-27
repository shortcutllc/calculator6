import { config } from '../config';

// The client's own preview of the employee booking page (Oct 2026). Every proposal links to
// the coordinator's standing demo day, SHORTCUTDEMO: six test events (massage, nails, hair,
// facials, headshots, mindfulness) that notify no Pro and pay nobody. The link carries the
// client's name, logo and this proposal's services, and the coordinator shows the day as
// theirs: "<Client> Wellness Day", their logo, only their services, a preview note. Nothing
// is created per proposal, and a weekly coordinator job keeps the day a few weeks out.
const DEMO_SERIES_URL = 'https://admin.shortcutpros.com/#/selectEvent/SHORTCUTDEMO';

// The viewers' stand-ins for a missing client name. A demo for "Client" helps no one.
const PLACEHOLDER_NAMES = ['client', 'unknown'];

// KEEP IN STEP with netlify/functions/lib/demo-signup.js, which makes the same link on
// the server so Pro and the AI connector can share it (demoSignupUrl, 2026-11-27).
export const buildDemoSignupLink = (
  clientName: string | null | undefined,
  clientLogoUrl: string | null | undefined,
  serviceTypes: string[]
): string | null => {
  const name = (clientName || '').trim();
  if (!name || PLACEHOLDER_NAMES.includes(name.toLowerCase())) return null;

  const params = ['client=' + encodeURIComponent(name.slice(0, 60))];
  // Slugs as the proposal stores them (chair-massage, nails-hand-massage, headshot...); the
  // coordinator matches them to its demo events and shows the whole day if none match.
  if (serviceTypes.length) {
    params.push('services=' + serviceTypes.map(encodeURIComponent).join(','));
  }
  // The coordinator only shows a logo from this app's own storage (so a link can't put any
  // image on its domain), so a logo that was never copied there is left off.
  const ownStorage = config.supabase.url + '/storage/v1/object/public/';
  if (clientLogoUrl && clientLogoUrl.startsWith(ownStorage)) {
    params.push('logo=' + encodeURIComponent(clientLogoUrl));
  }
  return DEMO_SERIES_URL + '?' + params.join('&');
};

// Conference sponsor pages (Will, 2026-11-20): the same demo day, shown as the conference's
// wellness lounge. `kind=lounge` makes the coordinator title it "Wellness Lounge at
// <conference>", put the conference's logo (or name) first in the nav and a "Sponsor logo"
// placeholder where "with Shortcut" goes. A coordinator without lounge mode still shows the
// day, as "<conference> Wellness Day".
//
// Each lounge station as the demo day's services. Sound baths and movement have no demo
// event, so they add nothing; the coordinator shows the rest.
const STATION_SERVICES: Record<string, string[]> = {
  reset: ['massage'],
  glow: ['hair', 'facial'],
  polish: ['nails'],
  studio: ['headshot'],
  mindful: ['mindfulness'],
  sound: [],
  movement: [],
};

export const buildLoungeDemoLink = (
  conferenceName: string | null | undefined,
  logoUrl: string | null | undefined,
  stationIds: string[]
): string | null => {
  const name = (conferenceName || '').trim();
  if (!name) return null;
  const services = [...new Set(stationIds.flatMap((id) => STATION_SERVICES[id] || []))];
  const params = ['client=' + encodeURIComponent(name.slice(0, 60)), 'kind=lounge'];
  if (services.length) params.push('services=' + services.map(encodeURIComponent).join(','));
  const ownStorage = config.supabase.url + '/storage/v1/object/public/';
  if (logoUrl && logoUrl.startsWith(ownStorage)) params.push('logo=' + encodeURIComponent(logoUrl));
  return DEMO_SERIES_URL + '?' + params.join('&');
};
