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

const PAYLOAD = [
  { t: 'Name, title, company, work email', b: 'Captured on every booking.' },
  { t: 'Opted in, in the sponsor’s words', b: 'Every address on the list agreed to hear from them.' },
  { t: 'Who booked, and who showed', b: 'Handed over after the show, ready for their CRM.' },
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
                </div>
                <div className="pv-bcard-art max-[980px]:!h-auto flex flex-col gap-2.5 min-[981px]:[&>div]:flex min-[981px]:[&>div]:flex-1 min-[981px]:[&>div]:flex-col min-[981px]:[&>div]:justify-center" style={{ margin: 0, paddingTop: 20 }}>
                  {PAYLOAD.map((r) => (
                    <div key={r.t} className="rounded-2xl bg-white/[.08] px-4 py-3.5">
                      <p className="m-0 text-[14.5px] font-bold leading-tight tracking-[-.015em] text-white">{r.t}</p>
                      <p className="m-0 mt-1.5 text-[13px] font-medium leading-[1.45] text-white/70">{r.b}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          }
        />
      </div>
    </div>
  );
}
