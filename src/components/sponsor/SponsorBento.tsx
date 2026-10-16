import WhyShortcutBento from '../proposal/sections/WhyShortcutBento';
import MobileSignupModule from '../proposal/MobileSignupModule';
import '../../styles/proposal-refresh.css';

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
  'Lounge build and signage',
  'Our lead on site',
  'Setup and cleanup',
];

export default function SponsorBento({ conferenceName, dateLabel }: {
  conferenceName: string; dateLabel: string;
}) {
  return (
    <div className="pv-root !bg-transparent [&_.pv-bento]:mt-0">
      <div className="mx-auto max-w-[1100px]">
        <WhyShortcutBento
          label="What sets Shortcut apart"
          headA="Tech that runs every sign-up,"
          headB="and a team that handles the rest."
          wideTitle="Sign-ups handled before, during and after"
          wideBody="Invites and reminders before the show, check-in and the waitlist during it, and a results report after. It all plugs into your event app."
          eventName={`Wellness Lounge · ${conferenceName}`}
          eventWhen={dateLabel}
          cityTitle={<>One vendor.<br />Every venue.</>}
          cityBody="Hotels, convention centers and offsites, coast to coast."
          checklist={CHECKLIST}
          extraRowFirst
          extraRow={
            <div className="pv-bento-row ![grid-template-columns:1fr] min-[981px]:![grid-template-columns:1.15fr_1fr]">
              <article className="pv-bcard pv-bcard--aqua sp-bcard">
                <div className="pv-bcard-copy">
                  <h3>White-labeled and fully customizable</h3>
                  <p>Your sponsor&rsquo;s logo, colors, questions and opt-in language on the booking page, the emails and the texts.</p>
                </div>
                <div className="pv-bcard-art">
                  <div>
                    <MobileSignupModule
                      size={300}
                      eyebrow="The attendee sign-up"
                      copy={{
                        eventTitle: `Wellness Lounge at ${conferenceName}`,
                        eventLine: 'Chair massage with a licensed therapist, on the sponsor.',
                        location: 'Expo hall lounge',
                        barSub: `Free for ${conferenceName} attendees`,
                        brandText: 'SPONSOR LOGO',
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
                  <p>Captured in the fields your sponsor chooses, and handed over after the show.</p>
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
                            {r.note && <span className="ml-1.5 rounded-full bg-[#FEDC64] px-1.5 py-px text-[9.5px] font-extrabold uppercase tracking-[.05em] text-[#003756]">{r.note}</span>}
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
