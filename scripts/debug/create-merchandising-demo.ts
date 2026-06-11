// Create fresh demo proposals that show the pricing-merchandising strategy as
// intended: full price on event #1 (no applied discounts), Ladder-A option
// tiers with declining per-employee rates, quarterly seed line, validity date.
// Run: npx vite-node scripts/debug/create-merchandising-demo.ts
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  generatePricingOptionsForService,
  calculateServiceResults,
  recalculateServiceTotals,
} from '../../src/utils/proposalGenerator';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Reuse an existing staff user_id so any NOT NULL / FK constraint is satisfied
const { data: anyProposal } = await sb.from('proposals').select('user_id').not('user_id', 'is', null).limit(1).single();
const userId = anyProposal?.user_id ?? null;

// Idempotent: clear previous demo rows (is_test script-created) before recreating
const { data: removed } = await sb
  .from('proposals')
  .delete()
  .in('client_name', ['Demo First Event', 'Demo Multi-Option'])
  .eq('is_test', true)
  .select('id');
console.log(`Removed ${removed?.length ?? 0} previous demo proposals`);

const validUntil = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
const eventDate = (() => { const d = new Date(); d.setDate(d.getDate() + 35); return d.toISOString().slice(0, 10); })();

const massageService = (totalHours: number, hourlyRate: number) => ({
  serviceType: 'massage',
  massageType: 'chair',
  appTime: 20,
  numPros: 2,
  totalHours,
  hourlyRate,
  proHourly: 65,
  earlyArrival: 0,
  discountPercent: 0,
});

const buildProposalData = (clientName: string, loc: string, svc: any, withOptions: boolean) => {
  const base = { ...svc };
  const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(base);
  Object.assign(base, { totalAppointments, serviceCost, proRevenue });

  let pricingOptions: any[] | null = null;
  if (withOptions) {
    pricingOptions = generatePricingOptionsForService(base);
    const recIdx = pricingOptions.findIndex((o: any) => o.recommended);
    base.pricingOptions = pricingOptions;
    base.selectedOption = recIdx >= 0 ? recIdx : 0;
  }

  const data: any = {
    clientName,
    clientEmail: null,
    locations: [loc],
    eventDates: [eventDate],
    services: {
      [loc]: {
        [eventDate]: { services: [base], totalCost: 0, totalAppointments: 0 },
      },
    },
    customization: {
      contactFirstName: 'Alex',
      customNote:
        'Great speaking with you! Here is everything we discussed for your first event — pick the option that fits and we will handle the rest.',
    },
    // Explicitly NO discounts: this is a first event at full price. The
    // quarterly seed line + volume machinery show what recurrence earns.
    isAutoRecurring: false,
    validUntil,
  };
  const recalculated = recalculateServiceTotals(data);
  return { data: recalculated, pricingOptions, selectedOption: base.selectedOption ?? 0, key: `${loc}-${eventDate}-0` };
};

const insertProposal = async (row: any) => {
  const { data: created, error } = await sb.from('proposals').insert(row).select('id, slug, client_name').single();
  if (error) throw new Error(`${row.client_name}: ${error.message}`);
  return created;
};

// ---------------------------------------------------------------------------
// Demo 1 — first event, single service, Ladder-A tiles, no discounts
// ---------------------------------------------------------------------------
const d1 = buildProposalData('Demo First Event', 'New York', massageService(5, 150), true);
const demo1 = await insertProposal({
  data: d1.data,
  customization: d1.data.customization,
  is_editable: true,
  user_id: userId,
  status: 'draft',
  pending_review: false,
  has_changes: false,
  original_data: JSON.parse(JSON.stringify(d1.data)),
  client_name: 'Demo First Event',
  client_email: null,
  notes: 'Pricing-merchandising demo (created by script — safe to delete)',
  is_test: true,
  proposal_type: 'event',
  has_pricing_options: true,
  pricing_options: { [d1.key]: d1.pricingOptions },
  selected_options: { [d1.key]: d1.selectedOption },
});
console.log(`Demo 1 created: ${demo1.id} (${demo1.slug})`);

// ---------------------------------------------------------------------------
// Demo 2 — multi-option group (3 sibling proposals → OptionsTabs grid).
// Sizes follow Ladder A so per-employee declines up the ladder.
// ---------------------------------------------------------------------------
const groupId = randomUUID();
const groupSpecs = [
  { name: 'Starter', hours: 4, rate: 160, order: 1 },
  { name: 'Standard', hours: 6, rate: 150, order: 2 },
  { name: 'Extended', hours: 8, rate: 140, order: 3 },
];
for (const spec of groupSpecs) {
  const d = buildProposalData('Demo Multi-Option', 'New York', massageService(spec.hours, spec.rate), false);
  const created = await insertProposal({
    data: d.data,
    customization: d.data.customization,
    is_editable: true,
    user_id: userId,
    status: 'draft',
    pending_review: false,
    has_changes: false,
    original_data: JSON.parse(JSON.stringify(d.data)),
    client_name: 'Demo Multi-Option',
    client_email: null,
    notes: 'Pricing-merchandising demo (created by script — safe to delete)',
    is_test: true,
    proposal_type: 'event',
    proposal_group_id: groupId,
    option_name: spec.name,
    option_order: spec.order,
  });
  console.log(`Demo 2 option "${spec.name}" created: ${created.id}`);
}

console.log('\nDONE');
