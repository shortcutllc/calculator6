/**
 * Per-service choices by number of appointments: "we offer 10, 15 or 20
 * massages", and the client picks one on the proposal. Pro, the AI connector
 * and the HTTP API use this when a proposal is created (an event's
 * appointmentOptions) and when one is edited (add_pricing_options with
 * appointments or options).
 *
 * A choice is a guest-count option, the same shape the staff editor makes and
 * every engine reads (client-picks.js OPTION_FIELDS): it sets the service's
 * hours and Pros, never its appointment length, and pricing-engine.js and the
 * client engine price it. The staffing for a count comes from the reverse
 * calculator Pro's calculate_pricing already uses: an exact match first, then
 * the fewest Pros, in half-hour steps up to an 8-hour day. When no staffing
 * lands exactly on the count (20 twenty-minute massages needs 6.67 hours), the
 * choice holds the nearest count above it, and is named for what it holds.
 */
import { calculateServiceResults, isFlatPriceService } from './pricing-engine.js';
import { calculateEventOptions } from './reverse-calculator.js';

const MAX_CHOICES = 6;

export class AppointmentOptionsError extends Error {}

/** Hours and Pros that give `target` appointments of this service. */
function staffingFor(service, target) {
  const r = calculateEventOptions(service.serviceType, target, {
    appTime: service.appTime,
    hourlyRate: service.hourlyRate,
    proHourly: service.proHourly,
    earlyArrival: service.earlyArrival,
    retouchingCost: service.retouchingCost,
  });
  const best = r && r.success && r.options && r.options[0];
  if (!best) {
    throw new AppointmentOptionsError(`${target} appointments of ${service.appTime} minutes don't fit one day (8 hours, up to 10 Pros).`);
  }
  return { totalHours: best.totalHours, numPros: best.numPros };
}

/**
 * The pricing options for a service from a list of choices. A choice is a
 * number of appointments (15), or { appointments, name } or
 * { totalHours, numPros, name } for a setup staff want exactly.
 */
export function appointmentOptions(service, choices) {
  if (isFlatPriceService(service.serviceType)) {
    throw new AppointmentOptionsError(`${service.serviceType} is a class at one flat price for everyone who joins, so it has no appointment choices.`);
  }
  const list = Array.isArray(choices) ? choices : [];
  if (list.length < 2 || list.length > MAX_CHOICES) {
    throw new AppointmentOptionsError(`Give between 2 and ${MAX_CHOICES} choices, for example [10, 15, 20] appointments.`);
  }
  return list.map((choice) => {
    const spec = typeof choice === 'object' && choice !== null ? choice : { appointments: choice };
    let { totalHours, numPros } = spec;
    const target = spec.appointments != null ? Math.round(Number(spec.appointments)) : null;
    if (totalHours == null || numPros == null) {
      if (!(target >= 1)) {
        throw new AppointmentOptionsError(`Each choice needs a number of appointments, or totalHours and numPros. Got ${JSON.stringify(choice)}.`);
      }
      ({ totalHours, numPros } = staffingFor(service, target));
    }
    const r = calculateServiceResults({ ...service, totalHours: Number(totalHours), numPros: Number(numPros) });
    const option = {
      name: spec.name || `${r.totalAppointments} appointments`,
      totalAppointments: r.totalAppointments,
      totalHours: Number(totalHours),
      numPros: Number(numPros),
      hourlyRate: service.hourlyRate,
      serviceCost: r.serviceCost,
      originalPrice: r.originalPrice,
      discountPercent: service.discountPercent || 0,
      proRevenue: r.proRevenue,
    };
    if (target != null && r.totalAppointments !== target) option.requestedAppointments = target;
    return option;
  });
}

/** Which choice starts selected: a valid index, else the first. */
export function startingChoice(options, index) {
  const i = Number(index);
  return Number.isInteger(i) && i >= 0 && i < options.length ? i : 0;
}
