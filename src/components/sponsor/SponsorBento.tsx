import { useState } from 'react';
import { Check, ExternalLink, Link as LinkIcon } from 'lucide-react';
import WhyShortcutBento from '../proposal/sections/WhyShortcutBento';
import MobileSignupModule from '../proposal/MobileSignupModule';
import { useSponsorStatic } from './sponsorUi';
import '../../styles/proposal-refresh.css';

/** Copy link and Try it yourself for the demo booking page: the proposal
 *  sign-up module's own buttons (mobile-signup-demo.css), set under the
 *  card's copy because the card is a fixed height. `.sp-tw` keeps the
 *  website's element defaults off them on `.sp` pages. */
function DemoButtons({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* blocked: the link still opens */ }
  };
  return (
    <div className="sp-tw bm-foot-actions mt-1.5 w-full max-w-[300px]">
      <button type="button" className="bm-btn bm-btn-secondary" onClick={copy}>
        {copied ? <><Check size={14} /> Copied</> : <><LinkIcon size={14} /> Copy link</>}
      </button>
      <a className="bm-btn bm-btn-coral" href={url} target="_blank" rel="noopener noreferrer">
        Try it yourself <ExternalLink size={14} />
      </a>
    </div>
  );
}

/* ─────────────────────────────────────────────
   "What sets Shortcut apart", the website's bento, told for a conference
   organizer (Will, 2026-10-16). Its job is how easy we make the activation,
   and the How it works rail above already carries the deal, so nothing here
   restates it.

   Two halves, tech first:
     The tech: one white label, fully customizable booking platform that runs
       every sign-up before, during and after the show (the wide card's live
       roster), carries the sponsor's brand (the phone sign-up), and captures
       the sponsor's leads (the navy card).
     The team: the Pros card (kept as the website has it), the coverage map
       and the setup checklist, in show terms rather than office terms.

   The same module the homepage and the proposal viewer run
   (WhyShortcutBento, ported from shortcut/frontend/components/HomeDeliver.vue).
   `extraRowFirst` and `checklist` are this page's only overrides of it.
   `.pv-root` supplies the design tokens the bento's styles read.
   ───────────────────────────────────────────── */

/* The lead card's mock: one attendee's record, the same Jordan Patel the
   phone demo books, so the two cards read as one story. Demo values. */
const LEAD_RECORD = [
  { k: 'Title', v: 'Head of People' },
  { k: 'Company', v: 'Brightline' },
  { k: 'Work email', v: 'jordan@company.com' },
  { k: 'Company size', v: '500 to 1,000', note: 'Sponsor\u2019s question' },
];

const CHECKLIST = [
  'Certificates of insurance to the venue',
  'Show orders and freight',
  'A layout for your floor plan',
  'Lounge build and signage',
  'Our lead on site',
  'Setup and cleanup',
];

/* The few lines that change when the reader is the sponsor (the sponsor
   deck) rather than the organizer (the partner page). */
const COPY = {
  organizer: {
    wideBody: 'Invites, booking and reminders before the show, check-in during it, and a results report after. It all plugs into your event app.',
    brandBody: 'Your sponsor\u2019s logo, colors, questions and opt-in language on the booking page, the emails and the texts.',
    leadBody: 'Captured in the fields your sponsor chooses, and handed over after the show.',
    questionNote: 'Sponsor\u2019s question',
    checklist: CHECKLIST,
    brandText: 'SPONSOR LOGO',
    eventLine: 'Chair massage with a licensed therapist, on the sponsor.',
  },
  sponsor: {
    wideBody: 'Invites, booking and reminders before the show, check-in during it, and a results report after.',
    brandBody: 'Your logo, colors, questions and opt-in language on the booking page, the emails and the texts.',
    leadBody: 'Captured in the fields you choose and handed to you after the show. The list is yours alone.',
    questionNote: 'Your question',
    checklist: [
      'Certificates of insurance to the venue',
      'Show orders and freight',
      'A layout for your lounge space',
      'Lounge build and signage',
      'A Shortcut lead on site',
      'Setup and cleanup',
    ],
    brandText: 'YOUR LOGO',
    eventLine: 'Chair massage with a licensed therapist, courtesy of your brand.',
  },
};

export default function SponsorBento({ conferenceName, dateLabel, audience = 'organizer', demoUrl }: {
  conferenceName: string; dateLabel: string; audience?: 'organizer' | 'sponsor';
  /** The demo booking page, shown as this conference's wellness lounge
   *  (utils/demoSignupLink): adds Copy link and Try it yourself under the
   *  phone, as proposals have. */
  demoUrl?: string | null;
}) {
  const copy = COPY[audience];
  /* The sponsor deck's PDF: the proposal PDF's settled bento (.pv-static in
     proposal-refresh.css) and a still phone. */
  const isStatic = useSponsorStatic();
  return (
    <div className={`pv-root ${isStatic ? 'pv-static ' : ''}!bg-transparent [&_.pv-bento]:mt-0 [&_.mv-live]:!bg-[#EEF2F1] [&_.mv-live]:!text-[#45596A]`}>
      <div>
        <WhyShortcutBento
          label="What sets Shortcut apart"
          headA="Tech that runs every sign-up,"
          headB="and a team that handles the rest."
          wideTitle="Sign-ups handled before, during and after"
          wideBody={copy.wideBody}
          eventName={`Wellness Lounge · ${conferenceName}`}
          eventWhen={dateLabel}
          cityTitle={<>One vendor.<br />Every venue.</>}
          cityBody="Hotels, convention centers and offsites, coast to coast."
          handledTitle="All the logistics, handled."
          statusLabel="Example"
          checklist={copy.checklist}
          extraRowFirst
          extraRow={
            <div className="pv-bento-row ![grid-template-columns:1fr] deskp:![grid-template-columns:1.15fr_1fr]">
              <article className="pv-bcard pv-bcard--aqua sp-bcard">
                <div className="pv-bcard-copy">
                  <h3>White-labeled and fully customizable</h3>
                  <p>{copy.brandBody}</p>
                  {demoUrl && !isStatic && <DemoButtons url={demoUrl} />}
                </div>
                <div className="pv-bcard-art">
                  <div>
                    <MobileSignupModule
                      size={300}
                      still={isStatic}
                      eyebrow="The attendee sign-up"
                      copy={{
                        eventTitle: `Wellness Lounge at ${conferenceName}`,
                        eventLine: copy.eventLine,
                        location: 'Expo hall lounge',
                        barSub: `Free for ${conferenceName} attendees`,
                        brandText: copy.brandText,
                        whenLine: dateLabel || conferenceName,
                        slotLine: dateLabel ? `${dateLabel} · 12:40 pm` : '12:40 pm',
                        slotShort: '12:40 pm',
                        email: 'jordan@company.com',
                        address: `${conferenceName}, expo hall lounge`,
                      }}
                    />
                  </div>
                </div>
              </article>
              <article className="pv-bcard pv-bcard--navy sp-bcard">
                <div className="pv-bcard-copy">
                  <h3>Every sign-up is a lead</h3>
                  <p>{copy.leadBody}</p>
                </div>
                <div className="pv-bcard-art">
                  <div className="sp-lead w-[min(340px,calc(100%-48px))] rounded-[20px] bg-white px-5 pt-5 pb-9 shadow-[0_12px_36px_rgba(0,0,0,.28)]" aria-hidden="true">
                    <div className="flex items-center gap-3 pb-3.5 border-b border-[#E2E9E8]">
                      <span className="w-10 h-10 flex-none rounded-full bg-[#9EFAFF] grid place-items-center text-[12px] font-extrabold text-[#003756]">JP</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold leading-tight text-[#003756]">Jordan Patel</span>
                        <span className="block text-[12px] font-semibold leading-tight text-[#45596A]">Booked 12:40 pm</span>
                      </span>
                      <span className="h-6 inline-flex items-center px-2.5 rounded-full bg-[#E6F6EF] text-[10.5px] font-extrabold uppercase tracking-[.06em] text-[#137A52]">New lead</span>
                    </div>
                    <dl className="m-0 mt-1">
                      {LEAD_RECORD.map((r) => (
                        <div key={r.k} className="flex items-baseline justify-between gap-3 py-2 border-b border-[#E2E9E8]">
                          <dt className="text-[12px] font-semibold text-[#45596A]">
                            {r.k}
                            {r.note && <span className="ml-1.5 rounded-full bg-[#FEDC64] px-1.5 py-px text-[9.5px] font-extrabold uppercase tracking-[.05em] text-[#003756]">{copy.questionNote}</span>}
                          </dt>
                          <dd className="m-0 text-[13px] font-bold text-[#003756] text-right">{r.v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex gap-2">
                      {['Opted in', 'Showed up'].map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#F1F6F5] text-[11.5px] font-bold text-[#003756]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#137A52" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          }
        />
      </div>
    </div>
  );
}
