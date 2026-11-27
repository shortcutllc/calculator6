/**
 * A proposal's demo booking page, for the AI tools (Will, 2026-11-27).
 *
 * Every V2 proposal shows the client a "Try it yourself" link: the coordinator's
 * standing demo day (SHORTCUTDEMO) shown as theirs, with their name, logo and this
 * proposal's services. The browser builds it (src/utils/demoSignupLink.ts) and
 * nothing stores it, so Pro and the connector never knew it was there and asked
 * people to paste a test event. This is the same rule, server side. KEEP IN STEP
 * with buildDemoSignupLink and with the viewers' choice of link:
 * StandaloneProposalViewerV2 / ProposalViewerV2 use data.signupLink when staff set
 * one, else the branded demo; ProposalTypeRouter sends partnership proposals to V1
 * and mindfulness programs to their own viewer, and neither shows a demo.
 */
export const DEMO_SERIES_URL = 'https://admin.shortcutpros.com/#/selectEvent/SHORTCUTDEMO';

// The viewers' stand-ins for a missing client name. A demo for "Client" helps no one.
const PLACEHOLDER_NAMES = ['client', 'unknown'];

function supabaseBase() {
  return (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://oxigtmlqqfbhzekpdalt.supabase.co').replace(/\/$/, '');
}

/** Every service type on the proposal, as the viewers collect them. */
export function proposalServiceTypes(data) {
  const set = new Set();
  Object.values((data && data.services) || {}).forEach((byDate) => {
    Object.values(byDate || {}).forEach((dd) => {
      ((dd && dd.services) || []).forEach((s) => {
        if (s && s.serviceType) set.add(String(s.serviceType));
      });
    });
  });
  return Array.from(set);
}

export function buildDemoSignupLink(clientName, clientLogoUrl, serviceTypes) {
  const name = String(clientName || '').trim();
  if (!name || PLACEHOLDER_NAMES.includes(name.toLowerCase())) return null;
  const params = ['client=' + encodeURIComponent(name.slice(0, 60))];
  if (serviceTypes.length) params.push('services=' + serviceTypes.map(encodeURIComponent).join(','));
  // The coordinator shows a logo only from this app's own storage.
  const ownStorage = supabaseBase() + '/storage/v1/object/public/';
  if (clientLogoUrl && String(clientLogoUrl).startsWith(ownStorage)) {
    params.push('logo=' + encodeURIComponent(clientLogoUrl));
  }
  return DEMO_SERIES_URL + '?' + params.join('&');
}

/**
 * What the client's proposal page links to as its booking page demo, from a
 * proposals row (data, client_name, client_logo_url, partnership_type,
 * proposal_type). Always returns demoSignupUrl (null when the page shows none)
 * and a one-line demoSignupNote saying where it comes from.
 */
export function proposalSignupDemo(row) {
  const r = row || {};
  const data = r.data || {};
  if (r.partnership_type) {
    return { demoSignupUrl: null, demoSignupNote: 'Partnership proposals open in the older viewer, which shows no booking page demo.' };
  }
  const mindfulness = (r.proposal_type === 'mindfulness-program' || data.mindfulnessProgram) && data.mindfulnessProgram && data.mindfulnessProgram.programId;
  if (mindfulness) {
    return { demoSignupUrl: null, demoSignupNote: 'Mindfulness program proposals show no booking page demo.' };
  }
  if (data.signupLink) {
    return { demoSignupUrl: data.signupLink, demoSignupNote: 'A link staff set on this proposal (signupLink), shown instead of the automatic branded demo. Clear it to go back to the branded demo.' };
  }
  const url = buildDemoSignupLink(data.clientName || r.client_name, data.clientLogoUrl || r.client_logo_url, proposalServiceTypes(data));
  return url
    ? { demoSignupUrl: url, demoSignupNote: 'The branded demo every proposal links to: the coordinator\'s demo day shown with this client\'s name, logo and services. Bookings on it are tests; nothing to create.' }
    : { demoSignupUrl: null, demoSignupNote: 'Shows once the proposal has a client name.' };
}
