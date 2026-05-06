import React from 'react';
import { CheckCircle, Calendar, ShieldCheck, Repeat } from 'lucide-react';
import { PartnershipType, PartnershipRates, PARTNERSHIP_DEFAULTS } from '../types/proposal';

// Color discipline (per tailwind.config.js):
//   shortcut-teal (#9EFAFF) is a PALE CYAN — only safe as a background tint
//     or as text on the dark-navy hero. Never as text/icon on white cards.
//   shortcut-blue (#003756) — primary dark navy, readable everywhere on white.
//   shortcut-coral (#FF5050) — Option B accent (CTA color), readable on white.
//
// Hierarchy (top to bottom):
//   1. HERO          — what's happening, framed plainly
//   2. OPTIONS       — two thin cards, "how do we split the bill"
//   3. DECISION GRID — apples-to-apples comparison row
//   4. FILL TABLE    — Option A's exposure curve (CFO's table)
//   5. SAME EITHER   — what doesn't change between options
// Operational details (per-day, per-service, descriptions) are hidden
// upstream in partnership mode — they belong below the pitch, not above it.

interface PartnershipModelsSectionProps {
  proposalData: any;
  partnershipType: PartnershipType;
  partnershipRates?: PartnershipRates | null;
}

interface AggregatedInputs {
  numPros: number;
  totalHours: number;
  totalAppointments: number;
}

interface LocationBreakdown {
  location: string;
  appointments: number;
  serviceTypes: string[];
}

const formatMoney = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const aggregateServiceInputs = (proposalData: any): AggregatedInputs => {
  let numPros = 0;
  let totalProHours = 0;
  let totalAppointments = 0;

  Object.values(proposalData?.services || {}).forEach((locationData: any) => {
    Object.values(locationData || {}).forEach((dateData: any) => {
      (dateData?.services || []).forEach((service: any) => {
        const pros = Number(service.numPros) || 0;
        const hours = Number(service.totalHours) || 0;
        numPros += pros;
        totalProHours += pros * hours;
        totalAppointments += Number(service.totalAppointments) || 0;
      });
    });
  });

  const totalHours = numPros > 0 ? totalProHours / numPros : 0;
  return { numPros, totalHours, totalAppointments };
};

const aggregateByLocation = (proposalData: any): LocationBreakdown[] => {
  const out: LocationBreakdown[] = [];
  Object.entries(proposalData?.services || {}).forEach(([location, locationData]: [string, any]) => {
    let appointments = 0;
    const serviceTypes = new Set<string>();
    Object.values(locationData || {}).forEach((dateData: any) => {
      (dateData?.services || []).forEach((service: any) => {
        appointments += Number(service.totalAppointments) || 0;
        if (service.serviceType) serviceTypes.add(String(service.serviceType));
      });
    });
    out.push({ location: location.trim(), appointments, serviceTypes: Array.from(serviceTypes) });
  });
  return out;
};

// "hair" → "Hair", "hair-makeup" → "Hair & Makeup", etc. Used for the hero title.
const serviceNoun = (serviceTypes: string[]): string => {
  const set = new Set(serviceTypes.map(s => s.toLowerCase()));
  if (set.size === 1) {
    const only = [...set][0];
    if (only === 'hair') return 'Hair';
    if (only === 'massage') return 'Massage';
    if (only === 'nails') return 'Nails';
    if (only === 'facial' || only === 'facials') return 'Facial';
    if (only === 'headshot' || only === 'headshots') return 'Headshot';
    if (only === 'hair-makeup') return 'Hair & Makeup';
  }
  return 'Service';
};

const FILL_SCENARIOS = [1.0, 0.8, 0.6, 0.4];

// === HERO =====================================================================
const Hero: React.FC<{
  clientName: string;
  service: string;
  byLocation: LocationBreakdown[];
  total: number;
  cutsLabel: string;
}> = ({ clientName, service, byLocation, total, cutsLabel }) => (
  <div className="card-large bg-gradient-to-br from-shortcut-navy-blue to-shortcut-dark-blue text-white">
    <p className="text-xs font-bold text-shortcut-teal uppercase tracking-wider mb-3">Partnership Proposal</p>
    <h2 className="text-white text-2xl md:text-4xl font-extrabold mb-3 leading-tight">
      {service} partnership for {clientName}
    </h2>
    <p className="text-white/85 text-base md:text-lg leading-relaxed">
      {byLocation.map((b, i) => (
        <React.Fragment key={b.location}>
          {i > 0 && ' + '}
          <span className="font-bold text-white">{b.appointments} {cutsLabel}</span> in {b.location}
        </React.Fragment>
      ))}
      {byLocation.length > 1 && <> · <span className="font-bold text-white">{total} total</span></>}.
      {' '}Two ways to split the cost.
    </p>
  </div>
);

// === OPTION CARDS =============================================================
const OptionCard: React.FC<{
  letter: 'A' | 'B' | 'C';
  title: string;
  body: string;
  employeeRate: { value: string | number; sub: string };
  employerRate: { value: string | number; sub: string; strike?: string };
  bullets: string[];
  accent: 'navy' | 'coral' | 'teal';
  footer?: React.ReactNode;
}> = ({ letter, title, body, employeeRate, employerRate, bullets, accent, footer }) => {
  const accentText =
    accent === 'coral' ? 'text-shortcut-coral' :
    accent === 'teal' ? 'text-shortcut-teal-blue' :
    'text-shortcut-blue';
  const accentBorder =
    accent === 'coral' ? 'border-shortcut-coral border-opacity-50' :
    accent === 'teal' ? 'border-shortcut-teal-blue border-opacity-50' :
    'border-shortcut-blue border-opacity-25';
  const accentTint =
    accent === 'coral' ? 'bg-shortcut-coral/5 border-shortcut-coral/20' :
    accent === 'teal' ? 'bg-shortcut-teal-blue/5 border-shortcut-teal-blue/20' :
    'bg-shortcut-blue/5 border-shortcut-blue/15';

  return (
    <div className={`card-large bg-white border-2 ${accentBorder} flex flex-col`}>
      <div className="mb-4">
        <p className={`text-xs font-bold ${accentText} uppercase tracking-wider mb-1`}>Option {letter}</p>
        <h3 className="text-xl md:text-2xl font-extrabold text-shortcut-navy-blue">{title}</h3>
      </div>
      <p className="text-sm md:text-base text-text-dark mb-6 leading-relaxed">{body}</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`p-4 rounded-xl border ${accentTint}`}>
          <p className={`text-[11px] font-semibold ${accentText} uppercase tracking-wider mb-1`}>Employee Pays</p>
          <p className="text-2xl font-extrabold text-shortcut-navy-blue">{typeof employeeRate.value === 'number' ? `$${employeeRate.value}` : employeeRate.value}</p>
          <p className="text-xs text-text-dark-60 mt-1">{employeeRate.sub}</p>
        </div>
        <div className={`p-4 rounded-xl border ${accentTint}`}>
          <p className={`text-[11px] font-semibold ${accentText} uppercase tracking-wider mb-1`}>You Pay</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-extrabold text-shortcut-navy-blue">{typeof employerRate.value === 'number' ? `$${employerRate.value}` : employerRate.value}</p>
            {employerRate.strike && (
              <p className="text-sm text-text-dark-60 line-through">{employerRate.strike}</p>
            )}
          </div>
          <p className="text-xs text-text-dark-60 mt-1">{employerRate.sub}</p>
        </div>
      </div>

      {footer}

      <ul className="mt-auto pt-4 space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start space-x-2 text-sm text-text-dark">
            <CheckCircle className={`w-4 h-4 ${accentText} flex-shrink-0 mt-0.5`} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// === DECISION GRID ============================================================
const DecisionGrid: React.FC<{
  showA: boolean;
  showB: boolean;
  showC: boolean;
  modelA: { best: number; worst: number; employee: number };
  modelB: { flat: number; employee: number };
  modelC: { flat: number; employee: number };
  unitLabel: string;
}> = ({ showA, showB, showC, modelA, modelB, modelC, unitLabel }) => {
  const cols = (showA ? 1 : 0) + (showB ? 1 : 0) + (showC ? 1 : 0);
  if (cols === 0) return null;

  return (
    <div className="card-large bg-white border-2 border-shortcut-blue border-opacity-15">
      <h3 className="text-lg md:text-xl font-extrabold text-shortcut-navy-blue mb-4">Side by side</h3>
      <div className="rounded-xl border border-shortcut-blue/15 overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead className="bg-shortcut-blue/5">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-shortcut-navy-blue"></th>
              {showA && <th className="text-right px-4 py-3 font-semibold text-shortcut-blue">Option A</th>}
              {showB && <th className="text-right px-4 py-3 font-semibold text-shortcut-coral">Option B</th>}
              {showC && <th className="text-right px-4 py-3 font-semibold text-shortcut-teal-blue">Option C</th>}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-shortcut-blue/10">
              <td className="px-4 py-3 font-semibold text-text-dark">Best case for you</td>
              {showA && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${formatMoney(modelA.best)}</td>}
              {showB && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${formatMoney(modelB.flat)}</td>}
              {showC && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${formatMoney(modelC.flat)}</td>}
            </tr>
            <tr className="border-t border-shortcut-blue/10 bg-neutral-light-gray/40">
              <td className="px-4 py-3 font-semibold text-text-dark">Worst case for you</td>
              {showA && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${formatMoney(modelA.worst)}</td>}
              {showB && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${formatMoney(modelB.flat)}</td>}
              {showC && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${formatMoney(modelC.flat)}</td>}
            </tr>
            <tr className="border-t border-shortcut-blue/10">
              <td className="px-4 py-3 font-semibold text-text-dark">Cost per {unitLabel} to employee</td>
              {showA && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${modelA.employee}</td>}
              {showB && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${modelB.employee}</td>}
              {showC && <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">Free</td>}
            </tr>
          </tbody>
        </table>
      </div>
      {showA && showB && !showC && (
        <p className="text-xs text-text-dark-60 mt-3">
          Option A is cheapest for you when employees show up. Option B costs more in the best case but is fixed regardless of demand.
        </p>
      )}
      {showC && (
        <p className="text-xs text-text-dark-60 mt-3">
          Option C is the simplest sell internally — staff sees zero out-of-pocket cost — and the predictable flat option, with the 15% monthly partner discount baked in.
        </p>
      )}
    </div>
  );
};

// === FILL TABLE (hoisted out of Option A) ====================================
const FillRateTable: React.FC<{
  totalAppointments: number;
  rates: { employeePay: number; employerPerUnfilledAppt: number };
}> = ({ totalAppointments, rates }) => {
  const maxEmployerCost = totalAppointments * rates.employerPerUnfilledAppt;
  return (
    <div className="card-large bg-white border-2 border-shortcut-blue border-opacity-15">
      <h3 className="text-lg md:text-xl font-extrabold text-shortcut-navy-blue mb-1">What does Option A actually cost you?</h3>
      <p className="text-sm text-text-dark-60 mb-4">
        Your bill scales with how many appointment slots go unfilled — at ${rates.employerPerUnfilledAppt} each.
      </p>
      <div className="rounded-xl border border-shortcut-blue/15 overflow-hidden">
        <table className="w-full text-sm md:text-base">
          <thead className="bg-shortcut-blue/5">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-shortcut-navy-blue">Fill rate</th>
              <th className="text-right px-4 py-3 font-semibold text-shortcut-navy-blue">Filled</th>
              <th className="text-right px-4 py-3 font-semibold text-shortcut-navy-blue">Unfilled</th>
              <th className="text-right px-4 py-3 font-semibold text-shortcut-navy-blue">You pay</th>
            </tr>
          </thead>
          <tbody>
            {FILL_SCENARIOS.map((fill, idx) => {
              const filled = Math.round(totalAppointments * fill);
              const unfilled = totalAppointments - filled;
              const cost = unfilled * rates.employerPerUnfilledAppt;
              return (
                <tr key={fill} className={`border-t border-shortcut-blue/10 ${idx % 2 === 1 ? 'bg-neutral-light-gray/40' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-text-dark">{Math.round(fill * 100)}%</td>
                  <td className="px-4 py-3 text-right text-text-dark">{filled}</td>
                  <td className="px-4 py-3 text-right text-text-dark">{unfilled}</td>
                  <td className="px-4 py-3 text-right font-bold text-shortcut-navy-blue">${formatMoney(cost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-dark-60 mt-3">
        100% fill = $0 to you. Worst-case ceiling is ${formatMoney(maxEmployerCost)} (zero appointments booked).
      </p>
    </div>
  );
};

// === WHY THIS WORKS ===========================================================
// Sits directly under the hero. Three reassurance points, brand voice
// (specifics over superlatives, no banned words). Replaces the old
// "What's the same either way" block — which was operational filler.
const WhyThisWorks: React.FC = () => {
  const points: Array<{ icon: React.ReactNode; title: string; body: string }> = [
    {
      icon: <Calendar className="w-6 h-6 text-shortcut-blue" strokeWidth={1.75} />,
      title: 'Booking that runs itself',
      body: 'Schedule once. Your team books in our app, gets reminders, and manages their own slots. Zero HR inbox flooding.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-shortcut-blue" strokeWidth={1.75} />,
      title: 'Pros recruited, not posted',
      body: 'We pull from the top salons and barbers in your market and vet every one. Licensed, insured, and tested before they ever set foot in your office.',
    },
    {
      icon: <Repeat className="w-6 h-6 text-shortcut-blue" strokeWidth={1.75} />,
      title: 'Same pros, every visit',
      body: 'Once your team finds a Hair Pro they like, that’s who keeps coming back. No rotating cast.',
    },
  ];

  return (
    <div className="card-large bg-white border-2 border-shortcut-blue border-opacity-15">
      <div className="mb-7 md:mb-8">
        <p className="text-xs font-bold text-shortcut-blue uppercase tracking-wider mb-2">Why this just works</p>
        <h3 className="text-xl md:text-2xl font-extrabold text-shortcut-navy-blue leading-tight">
          Three things every partnership client gets, regardless of model.
        </h3>
      </div>
      <div className="grid md:grid-cols-3 md:divide-x md:divide-shortcut-blue/15">
        {points.map((p, i) => (
          <div key={p.title} className={`flex flex-col ${i > 0 ? 'md:pl-7 mt-7 md:mt-0' : 'md:pr-7'} ${i === 1 ? 'md:px-7' : ''}`}>
            <div className="w-12 h-12 rounded-xl bg-shortcut-blue/10 flex items-center justify-center flex-shrink-0 mb-4">
              {p.icon}
            </div>
            <p className="text-base md:text-lg font-extrabold text-shortcut-navy-blue mb-2 leading-snug">{p.title}</p>
            <p className="text-sm md:text-base text-text-dark leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// === MAIN =====================================================================
export const PartnershipModelsSection: React.FC<PartnershipModelsSectionProps> = ({
  proposalData,
  partnershipType,
  partnershipRates,
}) => {
  const inputs = aggregateServiceInputs(proposalData);
  const byLocation = aggregateByLocation(proposalData);
  const clientName = proposalData?.clientName || 'your team';

  // service noun powers the H1 ("Hair partnership for Meta") and the per-location
  // unit ("24 cuts in Seattle"). The unit is service-specific to read naturally.
  const serviceTypes = byLocation.flatMap(b => b.serviceTypes);
  const service = serviceNoun(serviceTypes);
  const cutsLabel =
    service === 'Hair' ? 'cuts' :
    service === 'Headshot' ? 'headshots' :
    service === 'Nails' ? 'manicures' :
    service === 'Facial' ? 'facials' :
    service === 'Massage' ? 'massages' :
    'appointments';
  // unitLabel is what fills "$X per ___" — singular and descriptive.
  // Hair uses "hair service" instead of "cut" so it reads as a service offering,
  // not a haircut transaction.
  const unitLabel =
    service === 'Hair' ? 'hair service' :
    service === 'Headshot' ? 'headshot' :
    service === 'Nails' ? 'manicure' :
    service === 'Facial' ? 'facial' :
    service === 'Massage' ? 'massage' :
    'appointment';

  const modelARates = {
    employeePay: partnershipRates?.modelA?.employeePay ?? PARTNERSHIP_DEFAULTS.modelA.employeePay,
    employerPerUnfilledAppt: partnershipRates?.modelA?.employerPerUnfilledAppt ?? PARTNERSHIP_DEFAULTS.modelA.employerPerUnfilledAppt,
  };
  const modelBRates = {
    employeePay: partnershipRates?.modelB?.employeePay ?? PARTNERSHIP_DEFAULTS.modelB.employeePay,
    employerHourlyPerPro: partnershipRates?.modelB?.employerHourlyPerPro ?? PARTNERSHIP_DEFAULTS.modelB.employerHourlyPerPro,
  };
  const modelCRates = {
    employerHourlyPerPro:
      partnershipRates?.modelC?.employerHourlyPerPro ?? PARTNERSHIP_DEFAULTS.modelC.employerHourlyPerPro,
    monthlyPartnerDiscountPct:
      partnershipRates?.modelC?.monthlyPartnerDiscountPct ?? PARTNERSHIP_DEFAULTS.modelC.monthlyPartnerDiscountPct,
  };

  const showA = partnershipType === 'employee_pay' || partnershipType === 'dual' || partnershipType === 'tri';
  const showB = partnershipType === 'subsidized' || partnershipType === 'dual' || partnershipType === 'tri';
  const showC = partnershipType === 'tri';

  // Shared shape derivation — used by both Option B and Option C math footers.
  // Detects whether every service row has the same {pros, hours} so we can
  // describe the deal as "X pros · Y hours each per location" cleanly.
  const numLocations = byLocation.length;
  const allRows: Array<{ pros: number; hours: number }> = [];
  Object.values(proposalData?.services || {}).forEach((locData: any) => {
    Object.values(locData || {}).forEach((dateData: any) => {
      (dateData?.services || []).forEach((s: any) => {
        allRows.push({ pros: Number(s.numPros) || 0, hours: Number(s.totalHours) || 0 });
      });
    });
  });
  const allRowsSame =
    allRows.length > 0 && allRows.every(r => r.pros === allRows[0].pros && r.hours === allRows[0].hours);
  const atomic = allRowsSame ? allRows[0] : null;

  // Option A
  const aWorst = inputs.totalAppointments * modelARates.employerPerUnfilledAppt;

  // Option B
  const totalProHours = inputs.numPros * inputs.totalHours;
  const bFlat = totalProHours * modelBRates.employerHourlyPerPro;
  const bPerLocationCost = numLocations > 0 ? bFlat / numLocations : bFlat;
  const bMathFooter =
    atomic && numLocations > 1
      ? `${atomic.pros} pro${atomic.pros === 1 ? '' : 's'} · ${atomic.hours} hours each = $${formatMoney(bPerLocationCost)} per location × ${numLocations} locations = $${formatMoney(bFlat)}`
      : `${inputs.numPros} pro-hour${inputs.numPros === 1 ? '' : 's'} × $${modelBRates.employerHourlyPerPro}/hr = $${formatMoney(bFlat)}`;

  // Option C — employer pays the full standard hourly rate (default $139/pro/hr),
  // then the monthly-partner discount comes off the top. Math is derived from
  // total pro-hours × the standard rate so it's accurate regardless of whatever
  // rate the proposal was originally priced at.
  const cDiscountPct = modelCRates.monthlyPartnerDiscountPct;
  const cOriginalTotal = totalProHours * modelCRates.employerHourlyPerPro;
  const cFlat = Math.round(cOriginalTotal * (1 - cDiscountPct / 100));
  const cSavings = cOriginalTotal - cFlat;
  const cPerLocationCost = numLocations > 0 ? cOriginalTotal / numLocations : cOriginalTotal;
  const cMathFooter =
    atomic && numLocations > 1
      ? `${atomic.pros} pro${atomic.pros === 1 ? '' : 's'} · ${atomic.hours} hrs × $${modelCRates.employerHourlyPerPro}/hr = $${formatMoney(cPerLocationCost)} per location × ${numLocations} locations = $${formatMoney(cOriginalTotal)}`
      : `${inputs.numPros} pro-hour${inputs.numPros === 1 ? '' : 's'} × $${modelCRates.employerHourlyPerPro}/hr = $${formatMoney(cOriginalTotal)}`;

  return (
    <div className="space-y-6">
      <Hero
        clientName={clientName}
        service={service}
        byLocation={byLocation}
        total={inputs.totalAppointments}
        cutsLabel={cutsLabel}
      />

      <WhyThisWorks />

      {/* Row 1: A and B side by side (or solo if only one is selected). */}
      <div className={`grid gap-6 ${showA && showB ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {showA && (
          <OptionCard
            letter="A"
            title="Employees Pay Full"
            body="Employees cover the full service cost out-of-pocket. You only owe us for appointment slots that go unfilled."
            employeeRate={{ value: modelARates.employeePay, sub: `per ${unitLabel}` }}
            employerRate={{ value: modelARates.employerPerUnfilledAppt, sub: 'per unfilled slot' }}
            bullets={[
              'Lowest possible employer cost — $0 if every slot books',
              'Best when you trust employee demand will fill the schedule',
            ]}
            accent="navy"
          />
        )}
        {showB && (
          <OptionCard
            letter="B"
            title="You Subsidize Half"
            body="You pay a flat hourly rate per pro, employees pay half-price. Predictable cost regardless of fill rate, top-tier pros guaranteed."
            employeeRate={{ value: modelBRates.employeePay, sub: `per ${unitLabel}` }}
            employerRate={{ value: modelBRates.employerHourlyPerPro, sub: 'per pro / hour' }}
            bullets={[
              'Same total whether 0 or every appointment books',
              'Top-tier pros prioritized for your team',
              'Half-price for employees — easier sell internally',
            ]}
            accent="coral"
            footer={
              <div className="rounded-xl border-2 border-shortcut-coral/40 bg-shortcut-coral/5 p-4 mb-4">
                <p className="text-[11px] font-semibold text-shortcut-coral uppercase tracking-wider mb-1">Your flat commitment</p>
                <p className="text-3xl font-extrabold text-shortcut-navy-blue mb-1">${formatMoney(bFlat)}</p>
                <p className="text-xs text-text-dark-60">{bMathFooter}</p>
              </div>
            }
          />
        )}
      </div>

      {/* Row 2: C alone, sized to match a single A/B card. Renders inside a
          2-col grid with the right slot empty so the card width is identical
          to row 1's columns. */}
      {showC && (
        <div className="grid gap-6 lg:grid-cols-2">
          <OptionCard
            letter="C"
            title="Free For Staff"
            body="You cover the full event at our standard rate. Employees experience it on the house. Predictable flat cost, top-tier pros, with a 15% partner discount because you're committing to monthly events with us."
            employeeRate={{ value: 'Free', sub: `for every ${unitLabel}` }}
            employerRate={{ value: `$${modelCRates.employerHourlyPerPro}`, sub: 'per pro / hour' }}
            bullets={[
              `${cDiscountPct}% monthly partner discount applied (saves $${formatMoney(cSavings)})`,
              'Zero cost to employees — easiest sell internally',
              'Top-tier pros, full premium experience',
            ]}
            accent="teal"
            footer={
              <div className="rounded-xl border-2 border-shortcut-teal-blue/40 bg-shortcut-teal-blue/5 p-4 mb-4">
                <p className="text-[11px] font-semibold text-shortcut-teal-blue uppercase tracking-wider mb-1">Your total commitment</p>
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <p className="text-3xl font-extrabold text-shortcut-navy-blue">${formatMoney(cFlat)}</p>
                  {cOriginalTotal > cFlat && (
                    <p className="text-base text-text-dark-60 line-through">${formatMoney(cOriginalTotal)}</p>
                  )}
                </div>
                <p className="text-xs text-text-dark-60">{cMathFooter}</p>
              </div>
            }
          />
        </div>
      )}

      <DecisionGrid
        showA={showA}
        showB={showB}
        showC={showC}
        modelA={{ best: 0, worst: aWorst, employee: modelARates.employeePay }}
        modelB={{ flat: bFlat, employee: modelBRates.employeePay }}
        modelC={{ flat: cFlat, employee: 0 }}
        unitLabel={unitLabel}
      />

      {showA && (
        <FillRateTable
          totalAppointments={inputs.totalAppointments}
          rates={modelARates}
        />
      )}
    </div>
  );
};
