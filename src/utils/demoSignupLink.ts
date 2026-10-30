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
