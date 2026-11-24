/**
 * Keeps stripe_invoices.status in step with Stripe.
 *
 * The app used to learn only about payments (stripe-webhook: invoice.paid), so
 * an invoice voided or marked uncollectible in the Stripe dashboard stayed
 * "open" here forever. Three paths now fix that, all through this module:
 *   - stripe-webhook.js stores voids and uncollectibles as they happen, when
 *     the Stripe endpoint sends those events;
 *   - the invoice tools (search_invoices, get_invoice in slack-tools.js) check
 *     Stripe live for the rows they return, for Pro and the AI connector;
 *   - invoice-status-sync-scheduled.js re-checks every unfinished row daily,
 *     which catches anything the webhook was never sent.
 */
import Stripe from 'stripe';

/** Stripe statuses that never change again. */
const FINAL = new Set(['paid', 'void', 'uncollectible']);

export const isFinalStatus = (status) => FINAL.has(status);

/**
 * The status to store, from ours and Stripe's. Stripe's final states always
 * win. An emailed invoice that is still open keeps our "sent".
 */
export function syncedStatus(ours, stripes) {
  if (!stripes) return ours;
  if (FINAL.has(stripes)) return stripes;
  if (stripes === 'open' && ours === 'sent') return 'sent';
  return stripes;
}

/** A Stripe client from the server key, or null where there is none (local). */
export function stripeFromEnv() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key, { apiVersion: '2023-10-16' }) : null;
}

/**
 * Re-reads each unfinished row's invoice from Stripe and saves any change.
 * `rows` need id, stripe_invoice_id and status. Returns { statuses: Map of
 * id → current status, changed: [{ id, from, to }], failed }. Never throws: a
 * row Stripe can't answer for keeps its stored status.
 */
export async function refreshInvoiceStatuses(supabase, stripe, rows, { concurrency = 5 } = {}) {
  const statuses = new Map((rows || []).map((r) => [r.id, r.status]));
  const changed = [];
  let failed = 0;
  const queue = (rows || []).filter((r) => r.stripe_invoice_id && !FINAL.has(r.status));

  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try {
        const from = r.status;
        const invoice = await stripe.invoices.retrieve(r.stripe_invoice_id);
        const next = syncedStatus(from, invoice.status);
        statuses.set(r.id, next);
        if (next !== from) {
          const { error } = await supabase
            .from('stripe_invoices')
            .update({ status: next, updated_at: new Date().toISOString() })
            .eq('id', r.id);
          if (error) throw new Error(error.message);
          changed.push({ id: r.id, from, to: next });
        }
      } catch (err) {
        failed += 1;
        console.warn(`invoice-status: ${r.stripe_invoice_id}: ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return { statuses, changed, failed };
}
