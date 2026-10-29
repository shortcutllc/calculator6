/**
 * What the client chose on a proposal, in one place. A client switches
 * services on and off (data.optionsState, keyed `${location}|${date}|${index}`)
 * and picks a guest-count option (service.pricingOptions[service.selectedOption]).
 * Anything that prices, staffs or reports a proposal reads these two rules
 * instead of the bare service fields: the server pricing engine, the staff
 * "Create Coordinator event" window, and the change-request Slack alert.
 * Types for the TypeScript side: client-picks.d.ts.
 */

/** Fields a guest-count option can set in place of the base service's. */
export const OPTION_FIELDS = ['totalHours', 'hourlyRate', 'numPros', 'fixedPrice', 'classLength'];

/**
 * The service as the client chose it: with guest-count options, the selected
 * option's hours, Pros, rate and class fields stand in for the base's. Mirrors
 * the option loop in recalculateServiceTotals (src/utils/proposalGenerator.ts).
 */
export function effectiveService(service) {
  const options = service && service.pricingOptions;
  if (!Array.isArray(options) || options.length === 0) return service;
  const option = options[service.selectedOption || 0];
  if (!option) return service;
  const chosen = { ...service };
  for (const k of OPTION_FIELDS) if (option[k] !== undefined) chosen[k] = option[k];
  return chosen;
}

/**
 * Whether the client has this service in their proposal: their own on/off
 * pick, else the staff default (optionsSelectedDefault, then the proposal-wide
 * startUnselected). Same rule as the client viewer (useServiceSelections).
 */
export function clientIncluded(data, location, date, index, service) {
  const picked = data && data.optionsState && data.optionsState[`${location}|${date}|${index}`];
  if (picked && typeof picked.included === 'boolean') return picked.included;
  if (service && service.optionsSelectedDefault === false) return false;
  return !(data && data.startUnselected === true);
}
