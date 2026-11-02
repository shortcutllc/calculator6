// Conference and multi-day proposals (data.eventType 'conference') are priced
// at $165 per pro per hour for the hourly services, with no automatic
// discount (Will, 2026-11-02). Staff can still set another rate or a discount
// in the editor. Server twin: netlify/functions/lib/pricing-engine.js.

export const CONFERENCE_HOURLY_RATE = 165;
export const STANDARD_HOURLY_RATE = 150;

/**
 * One hourly rate for a proposal turning into a conference ($150 becomes
 * $165) or back ($165 becomes $150). Any other rate is one staff chose, and
 * fixed-price services (headshots, classes) have none, so both are kept.
 */
export function conferenceRate(rate: number, conference = true): number {
  if (conference) return rate === STANDARD_HOURLY_RATE ? CONFERENCE_HOURLY_RATE : rate;
  return rate === CONFERENCE_HOURLY_RATE ? STANDARD_HOURLY_RATE : rate;
}

/** The proposal with every hourly service, and any guest-count option that
 *  carries its own rate, moved by conferenceRate. Run recalculateServiceTotals
 *  on the result to reprice it. */
export function withConferenceRates<T extends { services?: any }>(data: T, conference: boolean): T {
  const services = JSON.parse(JSON.stringify(data.services || {}));
  Object.values(services).forEach((byDate: any) =>
    Object.values(byDate || {}).forEach((day: any) =>
      (day?.services || []).forEach((service: any) => {
        if (typeof service.hourlyRate === 'number') service.hourlyRate = conferenceRate(service.hourlyRate, conference);
        (service.pricingOptions || []).forEach((option: any) => {
          if (typeof option.hourlyRate === 'number') option.hourlyRate = conferenceRate(option.hourlyRate, conference);
        });
      })
    )
  );
  return { ...data, services };
}
