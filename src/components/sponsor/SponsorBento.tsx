import WhyShortcutBento from '../proposal/sections/WhyShortcutBento';
import MobileSignupModule from '../proposal/MobileSignupModule';
import '../../styles/proposal-refresh.css';

/* ─────────────────────────────────────────────
   "What sets Shortcut apart", the website's bento, told for a sponsor.

   The same module the homepage and the proposal viewer run
   (WhyShortcutBento, ported from shortcut/frontend/components/HomeDeliver.vue):
   the live manager roster, the Pros cutout, the coverage map and the setup
   checklist. Here the roster is the sponsor's list filling in, and the extra
   row adds the animated phone sign-up, because on this page booking IS the
   lead capture.

   `.pv-root` supplies the design tokens the bento's styles read.
   ───────────────────────────────────────────── */

const PAYLOAD = [
  { t: 'Name, title, company, work email', b: 'Captured when they book, in the fields the sponsor chooses.' },
  { t: 'The sponsor’s opt-in language', b: 'Every address on the list agreed to hear from them.' },
  { t: 'Who booked, and who showed', b: 'Handed over after the show, ready for their CRM.' },
];

export default function SponsorBento({ conferenceName, dateLabel }: {
  conferenceName: string; dateLabel: string;
}) {
  return (
    <div className="pv-root !bg-transparent [&_.pv-bento]:mt-0">
      <div className="mx-auto max-w-[1100px]">
        <WhyShortcutBento
          label="What sets Shortcut apart"
          headA="Attendees love it."
          headB="Sponsors get a lead gen machine."
          wideTitle="The sponsor watches the list fill, live."
          wideBody="Every booking lands with a name, title, company and email, in one live view the sponsor's team can open any time before and during the show."
          eventName={`Wellness Lounge · ${conferenceName}`}
          eventWhen={dateLabel}
          cityTitle={<>One vendor.<br />Every venue.</>}
          cityBody="Hotels, convention centers and offsites, coast to coast."
          extraRow={
            <div className="pv-bento-row" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
              <article className="pv-bcard pv-bcard--aqua" style={{ height: 'auto', paddingBottom: 26 }}>
                <div className="pv-bcard-copy">
                  <h3>Booking is the door.</h3>
                  <p>Nobody sits down without booking first. Attendees pick a time on the sponsor&rsquo;s page and get a reminder.</p>
                </div>
                <div className="pv-bcard-art" style={{ display: 'grid', placeItems: 'center', paddingTop: 18 }}>
                  <MobileSignupModule
                    size={300}
                    eyebrow="The attendee sign-up"
                    copy={{
                      eventTitle: `Wellness Lounge at ${conferenceName}`,
                      eventLine: 'Chair massage with a licensed therapist, on the sponsor.',
                      location: 'Expo hall lounge',
                      barSub: `Free for ${conferenceName} attendees`,
                      brandText: 'SPONSOR LOGO',
                    }}
                  />
                </div>
              </article>
              <article className="pv-bcard pv-bcard--navy" style={{ height: 'auto', paddingBottom: 26 }}>
                <div className="pv-bcard-copy">
                  <h3>Every booking is a lead.</h3>
                  <p>The line is the list. The sponsor takes it home.</p>
                </div>
                <div className="pv-bcard-art flex flex-col gap-2.5" style={{ margin: 0, paddingTop: 20 }}>
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
