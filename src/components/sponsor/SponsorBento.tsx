import WhyShortcutBento from '../proposal/sections/WhyShortcutBento';
import MobileSignupModule from '../proposal/MobileSignupModule';
import '../../styles/proposal-refresh.css';

/* ─────────────────────────────────────────────
   How it works: the website's "What sets Shortcut apart" bento, told as
   the white-label story. The sponsor presents a complete experience as
   their own: a booking platform in their name that runs the day, the
   lounge, signage, screens and Pros in their uniform. Shortcut stays
   behind it.

   Same module the homepage and the proposal viewer run (WhyShortcutBento,
   ported from shortcut/frontend/components/HomeDeliver.vue), plus a row
   with the attendee's booking phone and what the sponsor takes home.

   `.pv-root` supplies the design tokens the bento's styles read.
   ───────────────────────────────────────────── */

const CHECKLIST = [
  'Branded booking page',
  'Signage and screens',
  'Pro uniforms',
  'COI to the venue',
  'Setup and cleanup',
];

/* The sponsor's lead list, drawn as the export they get: the same people
   as the roster above, now with title and company, opted in. */
const LEADS = [
  { ini: 'MR', av: 'bg-[#9EFAFF]', name: 'Maya Rivera', role: 'VP People · Northwind', showed: true },
  { ini: 'DK', av: 'bg-[#FEDC64]', name: 'Devon Kim', role: 'Head of HR · Brightline', showed: true },
  { ini: 'PS', av: 'bg-[#F7BBFF]', name: 'Priya Shah', role: 'Chief of Staff · Lumen', showed: true },
  { ini: 'TB', av: 'bg-[#C7CBFB]', name: 'Tom Baker', role: 'Talent Director · Harbor', showed: false },
];

export default function SponsorBento({ conferenceName, dateLabel }: {
  conferenceName: string; dateLabel: string;
}) {
  return (
    <div className="pv-root !bg-transparent [&_.pv-bento]:mt-0 [&_.pv-bento-head]:mb-12 md:[&_.pv-bento-head]:mb-14 [&_.pv-bento-head_.lt-h2]:!text-[30px] md:[&_.pv-bento-head_.lt-h2]:!text-[44px]">
      <div>
        <WhyShortcutBento
          label="How it works"
          headA="Their name on everything."
          headB="Our team behind all of it."
          wideTitle="A booking platform that runs the day."
          wideBody="Bookings, reminders, the waitlist and last minute changes, all in the sponsor's name. Their team just shows up."
          eventName={`Wellness Lounge · ${conferenceName}`}
          eventWhen={dateLabel}
          cityTitle={<>One vendor.<br />Every venue.</>}
          cityBody="Hotels, convention centers and offsites, coast to coast."
          handledTitle="Built in their brand."
          handledBody="The lounge, the signage, the screens and the uniforms."
          checklist={CHECKLIST}
          extraRow={
            <div className="pv-bento-row min-[981px]:!grid-cols-[1.15fr_1fr]">
              <article className="pv-bcard pv-bcard--aqua" style={{ height: 'auto', paddingBottom: 26 }}>
                <div className="pv-bcard-copy">
                  <h3>Their booking page.</h3>
                  <p>Attendees pick a Pro, a service and a time on a page with the sponsor&rsquo;s logo on it.</p>
                </div>
                <div className="pv-bcard-art max-[980px]:!h-auto" style={{ display: 'grid', placeItems: 'center', paddingTop: 18 }}>
                  <MobileSignupModule
                    size={300}
                    eyebrow="The attendee sign-up"
                    copy={{
                      eventTitle: `Wellness Lounge at ${conferenceName}`,
                      eventLine: 'Chair massage with a licensed therapist, on the sponsor.',
                      location: 'Expo hall lounge',
                      barSub: `Free for ${conferenceName} attendees`,
                      brandText: 'SPONSOR LOGO',
                      whenLine: dateLabel,
                      slotLine: 'Day one · 12:40 pm',
                      slotShort: 'Day one · 12:40 pm',
                    }}
                  />
                </div>
              </article>
              <article className="pv-bcard pv-bcard--navy" style={{ height: 'auto', paddingBottom: 26 }}>
                <div className="pv-bcard-copy">
                  <h3>What the sponsor takes home.</h3>
                  <p>Every name, title, company and email, opted in and ready for their CRM.</p>
                </div>
                <div className="pv-bcard-art max-[980px]:!h-auto flex items-center justify-center !m-0 pt-6">
                  <div className="w-full max-w-[400px] rounded-[22px] bg-white p-5 text-left shadow-[0_20px_48px_rgba(0,0,0,.28)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="m-0 text-[15px] font-extrabold tracking-[-.018em] !text-shortcut-blue">Sponsor leads</p>
                        <p className="m-0 mt-0.5 text-[12.5px] font-semibold !text-[#45596A]">{conferenceName} · 28 contacts</p>
                      </div>
                      <span className="inline-flex h-[30px] items-center rounded-full bg-shortcut-blue px-3.5 text-[12.5px] font-bold text-white">Export</span>
                    </div>
                    <div className="mt-4 flex flex-col">
                      {LEADS.map((l) => (
                        <div key={l.ini} className="flex items-center gap-3 border-t border-[#003756]/[.09] py-2.5">
                          <span className={`grid h-8 w-8 flex-none place-items-center rounded-full text-[11px] font-extrabold text-shortcut-blue ${l.av}`}>{l.ini}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-bold tracking-[-.01em] text-shortcut-blue">{l.name}</span>
                            <span className="block truncate text-[12px] font-semibold text-[#45596A]">{l.role}</span>
                          </span>
                          <span className={`inline-flex h-6 flex-none items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[.03em] ${l.showed ? 'bg-[#E7F7EE] text-[#08694A]' : 'bg-[#EEF2F4] text-[#45596A]'}`}>
                            {l.showed ? 'Showed' : 'Booked'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="m-0 mt-2 border-t border-[#003756]/[.09] pt-3 text-[12px] font-semibold !text-[#45596A]">All opted in to hear from the sponsor</p>
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
