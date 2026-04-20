/**
 * Outreach message templates for the Workhuman Live 2026 campaign.
 * Variables: {first_name}, {sender_name}, {company}
 * Landing page URL uses the short slug: proposals.getshortcut.co/r/{slug}
 */

export type SenderName = 'Will Newton' | 'Jaimie Pritchard' | 'Marc Levitan' | 'Caren Skutch';

export const SENDER_NAMES: SenderName[] = [
  'Will Newton',
  'Jaimie Pritchard',
  'Marc Levitan',
  'Caren Skutch',
];

export type OutreachChannel = 'workhuman_dm' | 'linkedin_connect' | 'linkedin_dm' | 'email';

export interface Template {
  id: string;
  channel: OutreachChannel;
  label: string;
  description?: string;
  body: string;
  charLimit?: number;
}

export interface EmailTemplate extends Template {
  channel: 'email';
  subjectLines: string[];
}

export const WORKHUMAN_DM: Template = {
  id: 'whdm',
  channel: 'workhuman_dm',
  label: 'Workhuman DM',
  description: 'Workhuman DMs strip links, so we ask for their email and follow up via email.',
  charLimit: 500,
  body: `Hey {first_name}!

{sender_name} here from Shortcut. We're hosting a complimentary massage lounge in the Gratitude Garden at Workhuman, offering free 15-minute sessions between talks.

I'm holding a few spots before sign-ups open on Sunday and would be happy to reserve one for you. Just send me your email, and I'll share the booking link. I'd also love to connect and chat about wellness at {company} while we're there.

See you in Orlando!`,
};

export const LINKEDIN_CONNECT: Template = {
  id: 'li_connect',
  channel: 'linkedin_connect',
  label: 'LinkedIn Connection Note',
  description: 'Keep tight — ~300 char limit on LinkedIn',
  charLimit: 300,
  body: `Hey {first_name}!

{sender_name} from Shortcut here. We bring on-site massage, headshots, beauty and more to workplaces. Running the massage lounge at Workhuman next week — would love to connect!`,
};

export const LINKEDIN_DM_AFTER_ACCEPT: Template = {
  id: 'li_dm',
  channel: 'linkedin_dm',
  label: 'LinkedIn DM After Accept',
  description: 'Send same day they accept',
  body: `Hey {first_name}!

Really appreciate the connect.

We're hosting a complimentary massage lounge in the Gratitude Garden at Workhuman next week and wanted to make sure the {company} team had a spot before they fill up: {landing_page_url}

Shortcut brings on-site wellness directly to workplaces — massage, headshots, beauty and more, all through one vendor. We work with teams at BCG, DraftKings and Wix and handle everything so HR teams don't have to lift a finger.

Would love to steal 10 minutes after your session to chat about wellness at {company} and share what's been working.

Hope to see you there!`,
};

/**
 * Short email sent after a Workhuman DM reply where the lead shares their
 * email. Just delivers the reservation link — the DM already did the selling.
 */
export const DM_REPLY_FOLLOWUP_EMAIL: EmailTemplate = {
  id: 'dm_reply_followup_email',
  channel: 'email',
  label: 'DM Reply → Email Follow-up',
  description: 'Send after a Workhuman DM reply with their email. Short, just the link.',
  subjectLines: [
    'Your Workhuman massage spot — reservation link',
    '{first_name}, here\'s the link for {company}',
    'Reservation link for your Workhuman massage',
  ],
  body: `Hey {first_name},

Here is the link to reserve your spot: {landing_page_url}

See you in Orlando!

{sender_name}
Shortcut | getshortcut.co`,
};

export const EMAIL_SUBJECT_LINES = [
  '{first_name}, saved you a spot at Workhuman',
  'A little gift for the {company} team at Workhuman Live',
  'Free massage at Workhuman — your spot is held',
];

export const COLD_EMAIL: EmailTemplate = {
  id: 'email_body',
  channel: 'email',
  label: 'Cold Email',
  description: 'Send from a real person\'s name, 30–50 emails/day/domain',
  subjectLines: EMAIL_SUBJECT_LINES,
  body: `Hey {first_name}!

{sender_name} here from Shortcut — we bring on-site wellness directly to workplaces. Massage, headshots, beauty and more, all through one vendor with zero admin headache for HR teams. BCG, DraftKings, Wix and 500+ companies trust us for their employee wellness.

We're hosting a complimentary massage lounge in the Gratitude Garden at Workhuman Live next week and wanted to make sure the {company} team had a spot before they fill up: {landing_page_url}

No catch — the massage is yours either way. But I'd love to steal 10 minutes after your session to chat about wellness at {company} and share what's been working for teams like yours.

Hope to see you there!

{sender_name}
Shortcut | getshortcut.co`,
};

export const ALL_TEMPLATES: Template[] = [
  WORKHUMAN_DM,
  LINKEDIN_CONNECT,
  LINKEDIN_DM_AFTER_ACCEPT,
  DM_REPLY_FOLLOWUP_EMAIL,
  COLD_EMAIL,
];

export interface TemplateVars {
  firstName: string;
  company: string;
  senderName: string;
  landingPageUrl?: string;
  companySlug?: string;
}

/**
 * Substitute template variables. Gracefully falls back to a generic URL if
 * no slug or full URL is provided.
 */
export function fillTemplate(body: string, vars: TemplateVars): string {
  const fallbackUrl = vars.companySlug
    ? `https://proposals.getshortcut.co/r/${vars.companySlug}`
    : 'https://proposals.getshortcut.co/workhuman/recharge';
  const url = vars.landingPageUrl || fallbackUrl;

  return body
    .replace(/\{first_name\}/g, vars.firstName || 'there')
    .replace(/\{sender_name\}/g, vars.senderName || 'Shortcut')
    .replace(/\{company\}/g, vars.company || 'your team')
    .replace(/\{landing_page_url\}/g, url);
}

/**
 * Build the Workhuman DM URL if an attendee ID is available.
 */
const WORKHUMAN_EVENT_ID = '3d21a063-eae4-4618-a6f9-01019b6f6985';

export function workhumanDmUrl(attendeeId: string | null | undefined): string | null {
  if (!attendeeId) return null;
  return `https://register.workhumanlive.com/hub/events/${WORKHUMAN_EVENT_ID}/messages?attendeeId=${attendeeId}&oid=1`;
}

/**
 * Extract a slug from a stored landing_page_url of the form /r/{slug}.
 */
export function slugFromLandingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/r\/([^/?#]+)/);
  return match?.[1] || null;
}
