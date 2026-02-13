import { PostCallTemplateData, KeyInfoTemplateData, ServiceVariant, EmailType } from '../types/clientEmail';
import { Proposal } from '../types/proposal';

// ─── Shortcut brand color ─────────────────────────────────────
const BRAND = '#09364f';
const BRAND_LIGHT = '#e8f4f8';

// ─── Post-Call Email ──────────────────────────────────────────

export function generatePostCallEmail(data: PostCallTemplateData): string {
  const { contactName, companyName, eventType, proposalLink, testSignupLink } = data;

  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333;">`;

  html += `<p>Hi ${contactName || '[Name]'},</p>`;

  html += `<p>It was such a pleasure speaking with you! Thank you again for taking the time to share more about <b>${companyName || '[Company]'}</b> and what you're envisioning for the team. We're truly excited about the opportunity to host a <b>${eventType || '[Type of Event]'}</b> for the ${companyName || '[Company]'} team!</p>`;

  // ── Event Details ──
  html += sectionHeading('Event Details');
  html += `<ul style="margin:0 0 16px 0;padding-left:20px;">`;
  html += `<li style="margin-bottom:10px;">The proposal includes multiple size options and is fully customizable, so you can easily adjust the event length and number of Pros to best fit your needs. You can review and edit everything here: ${proposalLink ? `<a href="${proposalLink}" style="color:${BRAND};font-weight:600;">View Your Proposal</a>` : '<span style="color:#999;">[Proposal Link]</span>'}</li>`;
  html += `<li style="margin-bottom:10px;">I've also included a link to a test event so you can experience our seamless booking technology from the employee perspective: ${testSignupLink ? `<a href="${testSignupLink}" style="color:${BRAND};font-weight:600;">Try the Demo</a>` : '<span style="color:#999;">[Test Link]</span>'}</li>`;
  html += `</ul>`;

  html += `<p>Our goal is to be the easiest vendor to work with, so please don't hesitate to reach out if you have any questions.</p>`;

  html += signature();
  html += `</div>`;
  return html;
}

// ─── Key Info Email ───────────────────────────────────────────

export function generateKeyInfoEmail(data: KeyInfoTemplateData, variant: ServiceVariant): string {
  const { contactName, managerPageLink, proInfo, invoiceLink, paymentDueDate, qrCodeSignLink } = data;

  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333;">`;

  html += `<p>Hi ${contactName || '[Name]'},</p>`;

  // ── Booking Link & Blurb ──
  html += sectionHeading('Booking Link & How to Promote the Event');
  html += `<p style="margin:0 0 8px 0;">Below is a helpful blurb to share with the employees to promote the event:</p>`;
  html += getEmployeeBlurb(variant, data);

  // ── QR Code Signage ──
  if (qrCodeSignLink) {
    html += sectionHeading('Display Event Signage');
    html += `<p style="margin:0 0 16px 0;">Attached is the collateral you can share digitally or print and display around the space to promote the event. You can also access and download the signage here: <a href="${qrCodeSignLink}" style="color:${BRAND};font-weight:600;">View Signage</a></p>`;
  }

  // ── Space Prep ──
  html += sectionHeading('Prepare the Space');
  html += `<p style="margin:0 0 8px 0;">We kindly ask that you prepare the following ahead of the event:</p>`;
  html += getSpacePrepInstructions(variant);

  // ── Track Signups ──
  html += sectionHeading('Track Signups & More');
  html += `<p style="margin:0 0 16px 0;">Here is the link to your manager page where you can track sign-ups and view the waitlist: ${managerPageLink ? `<a href="${managerPageLink}" style="color:${BRAND};font-weight:600;">Open Manager Page</a>` : '<span style="color:#999;">[Manager Page Link]</span>'}</p>`;

  // ── Pro Info ──
  html += sectionHeading('The Shortcut Team');
  if (proInfo && proInfo.length > 0 && proInfo.some(p => p.name)) {
    html += `<p style="margin:0 0 8px 0;">Below is the information of our Pros attending the event:</p>`;
    html += `<ul style="margin:0 0 16px 0;padding-left:20px;">`;
    for (const pro of proInfo) {
      if (pro.name) {
        html += `<li style="margin-bottom:4px;"><b>${pro.name}</b>${pro.type ? ` — ${pro.type}` : ''}</li>`;
      }
    }
    html += `</ul>`;
  } else {
    html += `<p style="margin:0 0 8px 0;">Below is the information of our ${getProTypeLabel(variant)} Pros attending the event:</p>`;
    html += `<p style="margin:0 0 16px 0;color:#999;font-style:italic;">[Pro information to be added]</p>`;
  }

  // ── Invoice ──
  html += sectionHeading('Event Invoice');
  html += `<p style="margin:0 0 8px 0;">I've attached the event invoice`;
  if (invoiceLink) {
    html += ` and here is a link to the <a href="${invoiceLink}" style="color:${BRAND};font-weight:600;">online payment page</a>`;
  }
  html += `. The invoice is due by <b>${paymentDueDate || '[Date]'}</b> and payment can be submitted via credit card or ACH.</p>`;
  html += `<p style="margin:0 0 16px 0;">Gratuity is not included, and is completely optional should you wish to add it for our Pros!</p>`;

  html += `<p>Please don't hesitate to reach out with any questions.</p>`;
  html += signature();
  html += `</div>`;
  return html;
}

// ─── Shared Helpers ───────────────────────────────────────────

function sectionHeading(text: string): string {
  return `<p style="margin:24px 0 8px 0;font-size:15px;font-weight:700;color:${BRAND};border-bottom:2px solid ${BRAND_LIGHT};padding-bottom:4px;">${text}</p>`;
}

function signature(): string {
  return `<p style="margin-top:24px;">Best,<br/><b>Jaimie Pritchard</b><br/><span style="color:#666;">Head of Operations, Shortcut</span></p>`;
}

// ─── Variant-Specific Content ─────────────────────────────────

function getProTypeLabel(variant: ServiceVariant): string {
  switch (variant) {
    case 'massage': return 'massage';
    case 'hair': return 'hair & styling';
    case 'nails': return 'manicure';
    default: return '';
  }
}

export function getEmployeeBlurb(variant: ServiceVariant, data: KeyInfoTemplateData): string {
  const { eventDate, bookingLink } = data;
  const date = eventDate || '[Date]';
  // Booking link is shown as full URL (not hyperlinked) so employees can copy/paste it
  const link = bookingLink || '[Booking Link]';

  let serviceDesc: string;
  let extra = '';

  switch (variant) {
    case 'massage':
      serviceDesc = `relaxing ${data.eventType || 'chair massage'} services`;
      break;
    case 'hair':
      serviceDesc = 'hair and styling services';
      break;
    case 'nails':
      serviceDesc = 'manicure services';
      extra = `\n\nWe kindly ask that you remove gel polish before your appointment. The Shortcut Team can remove regular polish!`;
      break;
    default:
      serviceDesc = `${data.eventType || 'wellness'} services`;
      break;
  }

  let html = `<div style="margin:8px 0 16px 0;padding:12px 16px;border-left:4px solid ${BRAND};background:${BRAND_LIGHT};border-radius:0 6px 6px 0;">`;
  html += `<p style="margin:0;font-style:italic;">"We're excited to invite you to a special event on <b>${date}</b>. The Shortcut Team will be at our office to offer ${serviceDesc}! Book your appointment using this signup link: <b>${link}</b>.${extra ? `<br/><br/>${extra}` : ''}"</p>`;
  html += `</div>`;
  return html;
}

export function getSpacePrepInstructions(variant: ServiceVariant): string {
  let items: string[];

  switch (variant) {
    case 'nails':
      items = [
        'Please ensure our Pros are near an electrical outlet for their UV lamps and aromatherapy machines.',
        'Please ensure our Pros have a table and two chairs for the manicure services.',
        'Please ensure our Pros have a small trash can for any waste.',
        'Please allow our Pros 20 minutes to set up and break down the space.',
      ];
      break;
    case 'massage':
      items = [
        'Please ensure our Pros are near an electrical outlet for their aromatherapy machines.',
        'Please ensure our Pros have a table for their supplies and a trash can for any waste.',
        'Please allow our Pros 20 minutes to set up and break down the space.',
      ];
      break;
    case 'hair':
      items = [
        'Please ensure our Pros are near an electrical outlet for their styling tools and aromatherapy machines.',
        'Please ensure our Pros have a table for their supplies and a trash can for any waste.',
        'Please allow our Pros 20 minutes to set up and break down the space.',
      ];
      break;
    default:
      items = [
        'Please ensure our Pros are near an electrical outlet for their aromatherapy machines.',
        'Please ensure our Pros have a table for their supplies and a trash can for any waste.',
        'Please allow our Pros 20 minutes to set up and break down the space.',
      ];
      break;
  }

  let html = `<ul style="margin:0 0 16px 0;padding-left:20px;">`;
  for (const item of items) {
    html += `<li style="margin-bottom:6px;">${item}</li>`;
  }
  html += '</ul>';
  return html;
}

// ─── Auto-Detection Helpers ───────────────────────────────────

export function detectServiceVariant(proposal: Proposal): ServiceVariant {
  const services = proposal.data.services;
  const typeCounts: Record<string, number> = {};

  for (const location of Object.values(services)) {
    for (const dateData of Object.values(location)) {
      if (dateData.services) {
        for (const service of dateData.services) {
          const st = service.serviceType || 'generic';
          typeCounts[st] = (typeCounts[st] || 0) + 1;
        }
      }
    }
  }

  let dominant = 'generic';
  let maxCount = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = type;
    }
  }

  if (dominant.includes('massage') || dominant === 'chair') return 'massage';
  if (dominant.includes('hair') || dominant.includes('grooming') || dominant === 'blowout') return 'hair';
  if (dominant.includes('nail') || dominant.includes('manicure')) return 'nails';
  return 'generic';
}

export function detectEmailType(proposal: Proposal): EmailType {
  if (proposal.status === 'approved') return 'key-info';
  return 'post-call';
}

export function getDefaultSubject(emailType: EmailType, variant: ServiceVariant, companyName: string): string {
  const company = companyName || '[Company]';
  if (emailType === 'post-call') {
    return `Great speaking with you! — ${company} x Shortcut`;
  }
  const serviceLabel = variant === 'massage' ? 'Massage' : variant === 'hair' ? 'Hair & Styling' : variant === 'nails' ? 'Manicure' : 'Wellness';
  return `${company} x Shortcut — ${serviceLabel} Event Details`;
}
