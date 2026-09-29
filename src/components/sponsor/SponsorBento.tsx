import { PINS, Tick } from '../proposal/sections/WhyShortcutBento';
import '../../styles/proposal-refresh.css';

/* ─────────────────────────────────────────────
   How it works, as the website's bento cards (pv-bcard shells from
   proposal-refresh.css, ported from shortcut/frontend/components/
   HomeDeliver.vue), laid out for the white label story:

     1. Built in their brand   (wide)  everything we produce, in one list
     2. Pros  |  One vendor, every venue
     3. The day, fully booked  |  What the sponsor takes home

   The section heading is the page's own SectionHead, so it matches every
   other section. `.pv-root` supplies the design tokens the cards read.
   ───────────────────────────────────────────── */

const BRAND_ITEMS = [
  'Branded booking page',
  'Custom reminders',
  'Signage and screens',
  'Pro uniforms',
  'The lounge build',
  'COI to the venue',
  'A Shortcut lead on site',
  'Setup and cleanup',
];

const ROSTER = [
  { ini: 'MR', av: 'bg-[#9EFAFF]', name: 'Maya R.', slot: '11:00 am' },
  { ini: 'DK', av: 'bg-[#FEDC64]', name: 'Devon K.', slot: '11:20 am' },
  { ini: 'PS', av: 'bg-[#F7BBFF]', name: 'Priya S.', slot: '11:40 am' },
  { ini: 'TB', av: 'bg-[#C7CBFB]', name: 'Tom B.', slot: '12:00 pm' },
];

/* The sponsor's lead list, drawn as the export they get: the same people
   as the schedule, now with title and company, opted in. */
const LEADS = [
  { ini: 'MR', av: 'bg-[#9EFAFF]', name: 'Maya Rivera', role: 'VP People · Northwind', showed: true },
  { ini: 'DK', av: 'bg-[#FEDC64]', name: 'Devon Kim', role: 'Head of HR · Brightline', showed: true },
  { ini: 'PS', av: 'bg-[#F7BBFF]', name: 'Priya Shah', role: 'Chief of Staff · Lumen', showed: true },
  { ini: 'TB', av: 'bg-[#C7CBFB]', name: 'Tom Baker', role: 'Talent Director · Harbor', showed: false },
];

const MOCK = 'w-full max-w-[400px] rounded-[22px] bg-white p-5 text-left shadow-[0_20px_48px_rgba(3,34,50,.26)]';
const MOCK_T = 'm-0 text-[15px] font-extrabold tracking-[-.018em] !text-shortcut-blue';
const MOCK_S = 'm-0 mt-0.5 text-[12.5px] font-semibold !text-[#45596A]';
const ROW = 'flex items-center gap-3 border-t border-[#003756]/[.09] py-2.5';
const AV = 'grid h-8 w-8 flex-none place-items-center rounded-full text-[11px] font-extrabold text-shortcut-blue';

export default function SponsorBento({ conferenceName, dateLabel }: {
  conferenceName: string; dateLabel: string;
}) {
  return (
    <div className="pv-root !bg-transparent">
      <div className="pv-bento is-in !mt-0 flex flex-col gap-5">

        {/* 1. Built in their brand: the whole package in one card. */}
        <article className="pv-bcard pv-bcard--wide pv-bcard--yellow !h-auto !pb-10">
          <div className="pv-bcard-copy">
            <h3>Built in their brand.</h3>
            <p>Everything attendees see carries the sponsor&rsquo;s name. Everything behind it is ours.</p>
          </div>
          <div className="mx-auto mt-8 w-full max-w-[760px] rounded-[22px] bg-white p-5 md:p-6 shadow-[0_20px_48px_rgba(3,34,50,.18)]">
            <div className="flex items-baseline justify-between gap-3">
              <p className={MOCK_T}>The sponsor package</p>
              <p className="m-0 text-[12.5px] font-bold !text-[#08694A]">All included</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {BRAND_ITEMS.map((it) => (
                <div key={it} className="flex items-center gap-3 border-t border-[#003756]/[.09] py-2.5">
                  <span className="grid h-[21px] w-[21px] flex-none place-items-center rounded-full bg-shortcut-blue [&_svg]:h-3 [&_svg]:w-3">
                    <Tick width={3} />
                  </span>
                  <span className="text-[14.5px] font-semibold tracking-[-.01em] text-shortcut-blue">{it}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* 2. The people and the reach. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <article className="pv-bcard pv-bcard--navy">
            <div className="pv-bcard-copy">
              <h3>One vendor. Every venue.</h3>
              <p>Hotels, convention centers and offsites, coast to coast.</p>
            </div>
            <div className="pv-bcard-art [&_.wd-map]:!w-auto [&_.wd-map]:!h-[86%] [&_.wd-map]:!top-[54%]">
              <div className="wd-map">
                <img src="/proposal-refresh/bento/us-map.svg" alt="Shortcut coverage across the United States" />
                {PINS.map((p, i) => (
                  <span
                    className="wd-pin"
                    key={p.title}
                    title={p.title}
                    style={{ left: p.left, top: p.top, animationDelay: `${(0.35 + i * 0.055).toFixed(3)}s, ${(0.9 + i * 0.11).toFixed(2)}s` }}
                  />
                ))}
              </div>
            </div>
          </article>
          <article className="pv-bcard pv-bcard--aqua">
            <div className="pv-bcard-copy">
              <h3>Pros you&rsquo;d book yourself.</h3>
              <p>Licensed, insured, handpicked.</p>
            </div>
            <div className="pv-bcard-art">
              <span className="wd-photo" role="img" aria-label="A Shortcut Pro" />
            </div>
          </article>
        </div>

        {/* 3. Before and during, then after. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <article className="pv-bcard pv-bcard--coral !h-auto !pb-7">
            <div className="pv-bcard-copy">
              <h3>Fully booked before the doors open.</h3>
              <p>Bookings, reminders and the waitlist run on their own, in the sponsor&rsquo;s name.</p>
            </div>
            <div className="mt-6 flex justify-center">
              <div className={MOCK}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={MOCK_T}>Wellness Lounge · {conferenceName}</p>
                    <p className={MOCK_S}>{dateLabel}</p>
                  </div>
                  <span className="inline-flex h-[26px] flex-none items-center rounded-full bg-[#E7F7EE] px-2.5 text-[11px] font-extrabold uppercase tracking-[.03em] text-[#08694A]">Full</span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <p className="m-0 text-[26px] font-extrabold leading-none tracking-[-.03em] !text-shortcut-blue">
                    40 <span className="text-[14px] font-bold !text-[#45596A]">of 40 booked</span>
                  </p>
                  <p className="m-0 text-[13px] font-bold !text-[#0098AD]">100%</p>
                </div>
                <div className="mt-2.5 h-[7px] rounded-full bg-[#0098AD]" />
                <div className="mt-3 flex flex-col">
                  {ROSTER.map((r) => (
                    <div key={r.ini} className={ROW}>
                      <span className={`${AV} ${r.av}`}>{r.ini}</span>
                      <span className="flex-1 text-[13.5px] font-bold text-shortcut-blue">{r.name}</span>
                      <span className="text-[12.5px] font-semibold text-[#45596A]">{r.slot}</span>
                      <span className="grid h-[19px] w-[19px] place-items-center rounded-full bg-shortcut-blue [&_svg]:h-[11px] [&_svg]:w-[11px]"><Tick /></span>
                    </div>
                  ))}
                </div>
                <p className="m-0 border-t border-[#003756]/[.09] pt-3 text-[12px] font-semibold !text-[#45596A]">12 on the waitlist</p>
              </div>
            </div>
          </article>

          <article className="pv-bcard pv-bcard--navy !h-auto !pb-7">
            <div className="pv-bcard-copy">
              <h3>What the sponsor takes home.</h3>
              <p>Every name, title, company and email, opted in and ready for their CRM.</p>
            </div>
            <div className="mt-6 flex justify-center">
              <div className={MOCK}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={MOCK_T}>Sponsor leads</p>
                    <p className={MOCK_S}>{conferenceName} · 40 contacts</p>
                  </div>
                  <span className="inline-flex h-[30px] items-center rounded-full bg-shortcut-blue px-3.5 text-[12.5px] font-bold text-white">Export</span>
                </div>
                <div className="mt-4 flex flex-col">
                  {LEADS.map((l) => (
                    <div key={l.ini} className={ROW}>
                      <span className={`${AV} ${l.av}`}>{l.ini}</span>
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
                <p className="m-0 border-t border-[#003756]/[.09] pt-3 text-[12px] font-semibold !text-[#45596A]">All opted in to hear from the sponsor</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
