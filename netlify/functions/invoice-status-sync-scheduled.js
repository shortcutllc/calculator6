/**
 * invoice-status-sync-scheduled — Netlify SCHEDULED function (daily 11:05 UTC
 * ≈ 7:05am ET).
 *
 * Re-checks every invoice that isn't paid, void or uncollectible against
 * Stripe and saves what changed (lib/invoice-status.js). It catches what the
 * webhook never hears about: a void in the Stripe dashboard when the endpoint
 * isn't sending invoice.voided, a missed retry, an invoice from before the
 * webhook handled voids. Silent: it logs, it doesn't post to Slack.
 *
 * REQUIRES STRIPE_SECRET_KEY + SUPABASE env in Netlify. Schedule declared here
 * AND in netlify.toml (see check-schedules).
 */
import { createClient } from '@supabase/supabase-js';
import { refreshInvoiceStatuses, stripeFromEnv } from './lib/invoice-status.js';

export const config = { schedule: '5 11 * * *' };

export default async () => {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const stripe = stripeFromEnv();
  if (!stripe) { console.error('[invoice-status-sync] missing STRIPE_SECRET_KEY'); return new Response('missing STRIPE_SECRET_KEY', { status: 500 }); }
  if (!url || !key) { console.error('[invoice-status-sync] missing SUPABASE env'); return new Response('missing SUPABASE env', { status: 500 }); }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await sb
    .from('stripe_invoices')
    .select('id, stripe_invoice_id, status')
    .not('status', 'in', '(paid,void,uncollectible)');
  if (error) { console.error('[invoice-status-sync] ERROR:', error.message); return new Response(error.message, { status: 500 }); }

  const { changed, failed } = await refreshInvoiceStatuses(sb, stripe, rows);
  const summary = { checked: rows.length, changed, failed };
  console.log('[invoice-status-sync]', JSON.stringify(summary));
  return new Response(JSON.stringify(summary), { status: 200 });
};
