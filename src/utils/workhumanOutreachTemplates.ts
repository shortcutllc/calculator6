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

export type OutreachChannel = 'workhuman_dm' | 'linkedin_connect' | 'linkedin_dm' | 'email' | 'sms';

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

I'm holding a few spots before sign-ups open on Sunday and would be happy to reserve one for you. Just send me your email, and I'll share a link to reserve your spot. I'd also love to connect and chat about wellness at {company} while we're there.

See you in Orlando!`,
};

export const LINKEDIN_CONNECT: Template = {
  id: 'li_connect',
  channel: 'linkedin_connect',
  label: 'LinkedIn Connection Note',
  description: 'Keep tight — ~300 char limit on LinkedIn',
  charLimit: 300,
  body: `Hey {first_name}!

{sender_name} from Shortcut here. We bring on-site massage, headshots, beauty and more to workplaces. We're running the massage lounge at Workhuman next week — would love to connect!`,
};

export const LINKEDIN_DM_AFTER_ACCEPT: Template = {
  id: 'li_dm',
  channel: 'linkedin_dm',
  label: 'LinkedIn DM After Accept',
  description: 'Send same day they accept',
  body: `Hey {first_name}!

Thanks for connecting — really appreciate it!

Also shot you a DM on the Workhuman app — here's that link I mentioned to grab your massage appointment early before sign-ups open Sunday: {landing_page_url}

Would love to grab some time with you after your session to chat wellness at {company}.

See you in Orlando!`,
};

/**
 * Short email sent after a Workhuman DM reply where the lead shares their
 * email. Just delivers the link to reserve their spot — the DM already did the selling.
 */
export const DM_REPLY_FOLLOWUP_EMAIL: EmailTemplate = {
  id: 'dm_reply_followup_email',
  channel: 'email',
  label: 'DM Reply → Email Follow-up',
  description: 'Send after a Workhuman DM reply with their email. Short, just the link.',
  subjectLines: [
    'Your Workhuman massage spot — link to reserve',
    '{first_name}, here\'s the link for {company}',
    'Link to reserve your Workhuman massage spot',
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

/**
 * Booking confirmation email — sent after the lead's exact appointment
 * is locked in (Book at Booth modal or post-Sunday Workhuman booking pass).
 * Version A is the standard confirmation. Use for leads who already shared
 * a mobile number on the form.
 */
export const BOOKING_CONFIRMATION_A: EmailTemplate = {
  id: 'booking_confirmation_a',
  channel: 'email',
  label: 'Booking Confirmation (A)',
  description: 'Confirms exact day + time for the booked massage.',
  subjectLines: [
    'Your VIP Massage Appointment at Workhuman Live 🎉',
    'Your Workhuman massage is confirmed',
    'Your massage at Workhuman is locked in',
  ],
  body: `Hey {first_name}!

We've booked your complimentary 15-minute massage at our lounge in the Gratitude Garden at Workhuman Live.

Your appointment is set for **{day}** at **{time}**. Look out for a confirmation email with all the details.

We're really looking forward to connecting with you after your session and chatting about wellness at {company}.

Safe travels and see you in Orlando! Feel free to reply with any questions you may have.

{sender_name}
Shortcut | getshortcut.co`,
};

/**
 * Booking confirmation email — Version B for leads we don't have a mobile
 * number for. Adds a soft "reply with your mobile for a text reminder" ask.
 */
export const BOOKING_CONFIRMATION_B: EmailTemplate = {
  id: 'booking_confirmation_b',
  channel: 'email',
  label: 'Booking Confirmation (B — text alert ask)',
  description: 'Use when we don\'t have a mobile number — asks for one to send text reminders.',
  subjectLines: [
    'Your VIP Massage Appointment at Workhuman Live 🎉',
    'Your Workhuman massage is confirmed',
    'Your massage at Workhuman is locked in',
  ],
  body: `Hey {first_name}!

We've booked your complimentary 15-minute massage at our lounge in the Gratitude Garden at Workhuman Live.

Your appointment is set for **{day}** at **{time}**. Look out for a confirmation email with all the details.

One quick thing. If you'd like a text reminder before your session, just reply with your mobile number and we'll make sure you don't miss it.

We're really looking forward to connecting with you after your session and chatting about wellness at {company}.

Safe travels and see you in Orlando! Feel free to reply with any questions you may have.

{sender_name}
Shortcut | getshortcut.co`,
};

/**
 * No-show recovery email — for leads who booked but didn't make their booth
 * appointment. Offers a fresh slot on Tue/Wed.
 */
export const NO_SHOW_RECOVERY: EmailTemplate = {
  id: 'no_show_recovery',
  channel: 'email',
  label: 'No-Show Recovery',
  description: 'Send same-day to a lead who missed their booth massage. Offers a Tue/Wed rebook.',
  subjectLines: [
    'Workhuman Massage Appointment - Sorry we missed you!',
  ],
  body: `Hey {first_name},

Sorry we missed you at the Zen Zone today. We'd still love to host you for a complimentary massage and chat for a few minutes about what wellness could look like at {company}.

The lounge is open tomorrow and Wednesday in the Gratitude Garden. Stop by or reply here and we'll do our best to hold a slot for you.

{sender_name}
Shortcut | getshortcut.co`,
};

export interface TemplateVars {
  firstName: string;
  company: string;
  senderName: string;
  /** First name slice of senderName, used by SMS where full name reads stiff. */
  senderFirstName?: string;
  landingPageUrl?: string;
  companySlug?: string;
  /** Friendly day label for booking confirmations (e.g. "Monday, April 27"). */
  day?: string;
  /** Time slot string for booking confirmations (e.g. "1:15 PM"). */
  time?: string;
  /** Service name slotted into caveat #2 ("interest in {service}"). */
  service?: string;
  /** Pain point slotted into caveat #4 ("{pain_point} stayed with me"). */
  painPoint?: string;
  /** The chosen caveat paragraph for the personal-note master body. */
  personalCaveat?: string;
  /** Closing calendar line — varies by whether the sender has a Google Calendar appointment link. */
  calendarLine?: string;
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

  // If senderFirstName isn't passed, derive it from senderName so older
  // callers don't have to opt in just to use {sender_first_name}.
  const senderFirstName = vars.senderFirstName
    || (vars.senderName ? vars.senderName.split(/\s+/)[0] : '')
    || 'Shortcut';

  return body
    .replace(/\{first_name\}/g, vars.firstName || 'there')
    .replace(/\{sender_first_name\}/g, senderFirstName)
    .replace(/\{sender_name\}/g, vars.senderName || 'Shortcut')
    .replace(/\{company\}/g, vars.company || 'your team')
    .replace(/\{landing_page_url\}/g, url)
    .replace(/\{day\}/g, vars.day || '[day]')
    .replace(/\{time\}/g, vars.time || '[time]')
    .replace(/\{service\}/g, vars.service || '[service]')
    .replace(/\{pain_point\}/g, vars.painPoint || '[pain point]')
    .replace(/\{personal_caveat\}/g, vars.personalCaveat || '')
    .replace(/\{calendar_line\}/g, vars.calendarLine || '');
}

// =====================================================================
// Post-event personal-note follow-up
//
// Sent to leads that the team had a real booth conversation with — i.e.
// `lead.notes` contains a manual `[stamp · Name]` note. Each lead gets
// ONE master email body, with one of 8 caveat paragraphs slotted in
// based on what the conversation was about. The teammate also picks
// the subject line (3 rotation options) and fills `{service}` /
// `{pain_point}` only when the chosen caveat needs them.
// =====================================================================

/**
 * Short LinkedIn connection note for post-event personal-note leads.
 * Different from the pre-event LINKEDIN_CONNECT (which said "next week").
 * Stays under LinkedIn's ~300 char cap. Sent via copy-paste into the
 * connection-request dialog after opening the lead's LinkedIn profile.
 */
export const POST_EVENT_LINKEDIN_CONNECT: Template = {
  id: 'post_event_linkedin_connect',
  channel: 'linkedin_connect',
  label: 'Post-Event LinkedIn Connect Note',
  description: 'Short connection-request note for leads we met at Workhuman.',
  charLimit: 300,
  body: `Hey {first_name}! {sender_name} from Shortcut here. Really enjoyed catching up at Workhuman. Would love to stay in touch as you think about wellness at {company}.`,
};

export const PERSONAL_NOTE_SUBJECT_LINES = [
  'Great meeting you at Workhuman, {first_name}',
  'Enjoyed our chat at Workhuman, {first_name}',
  'Following up from the Gratitude Garden',
];

export const PERSONAL_NOTE_FOLLOWUP_EMAIL: EmailTemplate = {
  id: 'personal_note_followup_email',
  channel: 'email',
  label: 'Personal Note Follow-Up',
  description: 'For leads with a real booth conversation. Pick a caveat scenario; vars auto-fill where they can.',
  subjectLines: PERSONAL_NOTE_SUBJECT_LINES,
  body: `Hey {first_name},

It was great meeting you at Workhuman last week. Really appreciated you taking the time to chat with us.

{personal_caveat}

I'd love to set up a quick call to talk through what bringing Shortcut to {company} could look like. As a thanks for connecting with us at Workhuman, we'd also love to offer you 10% off your first event.

{calendar_line}

Talk soon,
{sender_name}
Shortcut | getshortcut.co`,
};

/**
 * Short follow-up text message for personal-noted leads. Sent AFTER the
 * email has gone out. Casual, exclamation-OK because SMS culture.
 * Goes through the user's own Messages app, not an automated channel,
 * so this is a copy-paste-only template (no spintax, no merge edge cases).
 *
 * Note: brand voice forbids em dashes between clauses, so we lean on
 * commas and short sentences instead.
 */
export const PERSONAL_NOTE_FOLLOWUP_SMS: Template = {
  id: 'personal_note_followup_sms',
  channel: 'sms',
  label: 'Personal Note Follow-Up SMS',
  description: 'Quick text nudge after the email goes out. Copy and paste into Messages.',
  charLimit: 320,
  body: `Hi {first_name}, {sender_first_name} from Shortcut here. It was a pleasure meeting you at Workhuman last week and I shot over a quick email to continue the conversation. Just wanted to make sure it reached your inbox. Chat soon!`,
};

/** A scenario the booth conversation matched, with the matching caveat copy. */
export interface PersonalNoteCaveat {
  id: string;
  /** Shown in the dropdown — describes the booth-conversation scenario. */
  label: string;
  /** Caveat paragraph that gets slotted into the master email body. */
  body: string;
  /** True when the body has a `{service}` placeholder the teammate needs to fill. */
  requiresService?: boolean;
  /** True when the body has a `{pain_point}` placeholder the teammate needs to fill. */
  requiresPainPoint?: boolean;
  /** Lowercase substrings in `lead.notes` that suggest this caveat fits. */
  triggerKeywords?: string[];
}

export const PERSONAL_NOTE_CAVEATS: PersonalNoteCaveat[] = [
  {
    id: 'limited_program',
    label: '1. They have a wellness program but it\'s limited',
    body: `What you shared about the wellness program at {company} resonated with me. Sounds like there's a real appetite for more and I think we could add a lot to what you've already built.`,
    triggerKeywords: ['wellness program', 'limited program', 'small program', 'have a program', 'existing program'],
  },
  {
    id: 'specific_service',
    label: '2. They expressed interest in a specific service',
    body: `You mentioned wanting to bring {service} to your team, which is exactly the kind of thing we do best. I think it could be something special for {company}.`,
    requiresService: true,
    triggerKeywords: ['massage', 'headshot', 'facial', 'manicure', 'mindfulness', 'yoga', 'beauty', 'haircut', 'grooming'],
  },
  {
    id: 'early_stage',
    label: '3. They\'re early stage, just exploring wellness',
    body: `Loved hearing that wellness is becoming more of a priority at {company} right now. Sounds like the timing is perfect to explore what that could actually look like in practice.`,
    triggerKeywords: ['exploring', 'early stage', 'becoming a priority', 'looking into', 'starting to', 'just starting', 'new to wellness'],
  },
  {
    id: 'pain_point',
    label: '4. They had a specific pain point',
    body: `What you shared about {pain_point} at {company} is exactly the kind of thing we've helped a few teams work through. I think there's something meaningful we could do together.`,
    requiresPainPoint: true,
    triggerKeywords: ['burnout', 'stressed', 'overworked', 'turnover', 'morale', 'engagement issue', 'retention', 'rto', 'return to office'],
  },
  {
    id: 'loved_massage',
    label: '5. They loved the massage and said so',
    body: `So glad you got to experience the lounge and that reaction you had says it all. Your team deserves that same feeling and I'd love to make it happen at {company}.`,
    triggerKeywords: ['loved', 'amazing', 'great experience', 'best', 'favorite', 'incredible', 'so good', 'felt great'],
  },
  {
    id: 'large_complex',
    label: '6. Large company with complex buying process',
    body: `Valued our conversation and getting to understand how {company} thinks about employee experience at scale. I have a few ideas about how we could work within your structure that I'd love to walk you through.`,
    triggerKeywords: ['large team', 'thousand', 'global', 'enterprise', 'multiple offices', 'across the country', 'across the world'],
  },
  {
    id: 'curious_noncommittal',
    label: '7. Curious but noncommittal (default)',
    body: `It was one of my favorite conversations from the whole conference. I'd love to pick up where we left off and show you what Shortcut could look like for the {company} team.`,
    // Default — used when nothing else triggers.
    triggerKeywords: [],
  },
  {
    id: 'short_conversation',
    label: '8. Short conversation, didn\'t get deep',
    body: `Even though we only had a few minutes together I walked away wanting to learn more about {company} and share more about what we do. I'd love to carve out some proper time to explore if we'd be a good fit.`,
    triggerKeywords: ['brief', 'quick chat', 'short conversation', 'didn\'t get deep', 'few minutes', 'short chat'],
  },
];

/**
 * Per-sender Google Calendar appointment link. Used to render the closing
 * "Grab a time" line. If a sender isn't mapped, the panel falls back to
 * "reply with a few times that work for you".
 */
export const SENDER_TO_CALENDAR: Partial<Record<SenderName, string>> = {
  'Marc Levitan': 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ32LfkHBgKgbGBFPag5dHw7dU_WZzZdBYZQqU23-XmWnBIIujGNDbRMZ8zGYjf6RSF6duE93uTa',
  'Jaimie Pritchard': 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0gH9NGyA_MUtu_TRlcGBu4ou78nEKPlygI6OJJrX9LFunmRPuD4OmxOvRQ_5HAoEhHcoYlZ29B',
  'Will Newton': 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ32vKfzSRhuWGXuzgv0w3x21bOQnmWva5xVuPtCsMF3iq25Oh_vInOsmmHr13npkewS-GnsQRqu',
  'Caren Skutch': 'https://calendar.app.google/NiUC9pyqwzNoJBmg8',
};

/** Closing-line for the master body, varies by whether the sender has a calendar link. */
export function calendarLineForSender(senderName: string | null | undefined): string {
  const link = senderName ? SENDER_TO_CALENDAR[senderName as SenderName] : null;
  return link
    ? `Does a time this week or next work for a quick call? Feel free to grab a time from my calendar that works for you: ${link}`
    : `Does a time this week or next work for a quick call? Feel free to send a few times my way and I'll get an invite over.`;
}

/**
 * Suggest the best caveat id given the lead's free-form notes. Pure keyword
 * heuristic — no AI call. Returns the first caveat whose triggerKeywords
 * appear (case-insensitive) anywhere in the notes; falls back to
 * `curious_noncommittal` when nothing matches.
 */
export function suggestCaveatForNotes(notes: string | null | undefined): string {
  const text = (notes || '').toLowerCase();
  if (!text) return 'curious_noncommittal';
  for (const c of PERSONAL_NOTE_CAVEATS) {
    if (!c.triggerKeywords?.length) continue;
    if (c.triggerKeywords.some(kw => text.includes(kw.toLowerCase()))) {
      return c.id;
    }
  }
  return 'curious_noncommittal';
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
