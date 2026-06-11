// Pricing presentation audit: what do historical proposals say about price, discounts, and what closes?
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Page through all proposals, selecting only what the audit needs
const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('proposals')
    .select('id, client_name, status, created_at, updated_at, pending_review, has_changes, has_pricing_options, selected_options, proposal_group_id, option_name, summary:data->summary, autoDisc:data->autoRecurringDiscount, isAuto:data->isAutoRecurring, gratuityType:data->gratuityType, customLineItems:data->customLineItems, optionsState:data->optionsState')
    .order('created_at', { ascending: true })
    .range(from, from + 999);
  if (error) { console.error('QUERY ERROR:', error.message); process.exit(1); }
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
console.log(`TOTAL PROPOSALS: ${rows.length}`);

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
const total = (r) => num(r.summary?.totalEventCost);
const fmt = (v) => v == null ? '—' : '$' + Math.round(v).toLocaleString();
const pct = (a, b) => b ? `${Math.round((a / b) * 100)}%` : '—';
const quantiles = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, min: s[0], p25: q(0.25), med: q(0.5), mean: s.reduce((a, b) => a + b, 0) / s.length, p75: q(0.75), p90: q(0.9), max: s[s.length - 1] };
};
const printQ = (label, q) => q && console.log(`  ${label}: n=${q.n} min=${fmt(q.min)} p25=${fmt(q.p25)} med=${fmt(q.med)} mean=${fmt(q.mean)} p75=${fmt(q.p75)} p90=${fmt(q.p90)} max=${fmt(q.max)}`);

// 1. Status counts (overall + by year)
console.log('\n=== 1. STATUS COUNTS ===');
const byStatus = {};
for (const r of rows) byStatus[r.status || 'null'] = (byStatus[r.status || 'null'] || 0) + 1;
console.log(byStatus);
const byYear = {};
for (const r of rows) {
  const y = (r.created_at || '').slice(0, 4);
  byYear[y] = byYear[y] || { all: 0, approved: 0 };
  byYear[y].all++;
  if (r.status === 'approved') byYear[y].approved++;
}
for (const [y, v] of Object.entries(byYear)) console.log(`  ${y}: ${v.all} created, ${v.approved} approved (${pct(v.approved, v.all)})`);

const approved = rows.filter((r) => r.status === 'approved');
const withTotal = rows.filter((r) => total(r) != null && total(r) > 0);
const approvedWithTotal = approved.filter((r) => total(r) != null && total(r) > 0);

// 2. Deal size distribution
console.log('\n=== 2. DEAL SIZE (totalEventCost) ===');
printQ('ALL with total', quantiles(withTotal.map(total)));
printQ('APPROVED      ', quantiles(approvedWithTotal.map(total)));

// 3. Approval rate by price bucket (the discretionary-threshold question)
console.log('\n=== 3. APPROVAL RATE BY PRICE BUCKET ===');
const buckets = [[0, 1000], [1000, 2500], [2500, 5000], [5000, 10000], [10000, 25000], [25000, Infinity]];
for (const [lo, hi] of buckets) {
  const inB = withTotal.filter((r) => total(r) >= lo && total(r) < hi);
  const app = inB.filter((r) => r.status === 'approved');
  console.log(`  ${fmt(lo)}–${hi === Infinity ? '∞' : fmt(hi)}: ${app.length}/${inB.length} approved (${pct(app.length, inB.length)})`);
}

// 4. Discount usage and depth
console.log('\n=== 4. DISCOUNTS ===');
const discounted = withTotal.filter((r) => num(r.summary?.originalTotalEventCost) != null && r.summary.originalTotalEventCost > total(r));
console.log(`  Proposals with an applied discount (originalTotalEventCost > total): ${discounted.length}/${withTotal.length}`);
const depths = discounted.map((r) => (1 - total(r) / r.summary.originalTotalEventCost) * 100);
if (depths.length) {
  const q = quantiles(depths);
  console.log(`  Discount depth %: min=${q.min.toFixed(1)} med=${q.med.toFixed(1)} mean=${q.mean.toFixed(1)} max=${q.max.toFixed(1)}`);
}
const discApproved = discounted.filter((r) => r.status === 'approved');
const undisc = withTotal.filter((r) => !discounted.includes(r));
const undiscApproved = undisc.filter((r) => r.status === 'approved');
console.log(`  Approval WITH discount: ${discApproved.length}/${discounted.length} (${pct(discApproved.length, discounted.length)})`);
console.log(`  Approval WITHOUT discount: ${undiscApproved.length}/${undisc.length} (${pct(undiscApproved.length, undisc.length)})`);
const autoVals = {};
for (const r of rows) { if (r.isAuto) autoVals[String(r.autoDisc)] = (autoVals[String(r.autoDisc)] || 0) + 1; }
console.log(`  isAutoRecurring set:`, autoVals);

// 5. Pricing options (good-better-best within a service)
console.log('\n=== 5. PRICING OPTIONS USAGE ===');
const withOpts = rows.filter((r) => r.has_pricing_options);
const withOptsApproved = withOpts.filter((r) => r.status === 'approved');
const noOpts = rows.filter((r) => !r.has_pricing_options);
const noOptsApproved = noOpts.filter((r) => r.status === 'approved');
console.log(`  has_pricing_options: ${withOpts.length}/${rows.length}`);
console.log(`  Approval WITH options: ${withOptsApproved.length}/${withOpts.length} (${pct(withOptsApproved.length, withOpts.length)})`);
console.log(`  Approval WITHOUT options: ${noOptsApproved.length}/${noOpts.length} (${pct(noOptsApproved.length, noOpts.length)})`);
const selCount = rows.filter((r) => r.selected_options && Object.keys(r.selected_options).length > 0);
console.log(`  selected_options non-empty (client/staff picked a tier): ${selCount.length}`);

// 6. Multi-option proposal groups
console.log('\n=== 6. MULTI-OPTION GROUPS ===');
const groups = {};
for (const r of rows) if (r.proposal_group_id) (groups[r.proposal_group_id] = groups[r.proposal_group_id] || []).push(r);
const multi = Object.values(groups).filter((g) => g.length > 1);
console.log(`  Groups with 2+ options: ${multi.length}`);
const multiWithApproval = multi.filter((g) => g.some((r) => r.status === 'approved'));
console.log(`  Groups where one option was approved: ${multiWithApproval.length}/${multi.length} (${pct(multiWithApproval.length, multi.length)})`);
// Which option (by price rank) wins?
const ranks = {};
for (const g of multiWithApproval) {
  const priced = g.filter((r) => total(r) != null).sort((a, b) => total(a) - total(b));
  const winner = g.find((r) => r.status === 'approved');
  const idx = priced.indexOf(winner);
  if (idx >= 0 && priced.length > 1) {
    const key = idx === 0 ? 'cheapest' : idx === priced.length - 1 ? 'most expensive' : 'middle';
    ranks[key] = (ranks[key] || 0) + 1;
  }
}
console.log(`  Winning option price rank:`, ranks);

// 7. Per-appointment cost (unit framing data)
console.log('\n=== 7. COST PER APPOINTMENT (approved, appts>0) ===');
const perApp = approvedWithTotal
  .filter((r) => num(r.summary?.totalAppointments) > 0)
  .map((r) => total(r) / r.summary.totalAppointments);
printQ('$/appointment', quantiles(perApp));

// 8. Margin (the floor)
console.log('\n=== 8. PROFIT MARGIN (approved) ===');
const margins = approvedWithTotal.map((r) => num(r.summary?.profitMargin)).filter((v) => v != null);
if (margins.length) {
  const q = quantiles(margins);
  console.log(`  margin %: n=${q.n} min=${q.min.toFixed(1)} p25=${q.p25.toFixed(1)} med=${q.med.toFixed(1)} mean=${q.mean.toFixed(1)} p90=${q.p90.toFixed(1)} max=${q.max.toFixed(1)}`);
  console.log(`  approved deals with margin < 30%: ${margins.filter((m) => m < 30).length}, < 20%: ${margins.filter((m) => m < 20).length}`);
}

// 9. Extras
console.log('\n=== 9. EXTRAS ===');
console.log(`  gratuity set: ${rows.filter((r) => r.gratuityType && r.gratuityType !== 'none').length}`);
console.log(`  custom line items: ${rows.filter((r) => Array.isArray(r.customLineItems) && r.customLineItems.length).length}`);
console.log(`  client interacted with optionsState (V2 toggles): ${rows.filter((r) => r.optionsState && Object.keys(r.optionsState).length).length}`);

// 10. Time to approval proxy (created → last update) for approved
console.log('\n=== 10. CREATED → LAST UPDATE (approved, days — weak proxy for time-to-close) ===');
const days = approved
  .map((r) => (new Date(r.updated_at) - new Date(r.created_at)) / 86400000)
  .filter((d) => d >= 0 && d < 365);
if (days.length) {
  const q = quantiles(days);
  console.log(`  days: n=${q.n} med=${q.med.toFixed(1)} mean=${q.mean.toFixed(1)} p75=${q.p75.toFixed(1)} p90=${q.p90.toFixed(1)}`);
}

// 11. Largest approved deals (whale shape)
console.log('\n=== 11. TOP 10 APPROVED BY TOTAL ===');
for (const r of [...approvedWithTotal].sort((a, b) => total(b) - total(a)).slice(0, 10)) {
  console.log(`  ${fmt(total(r))}  ${r.client_name}  (${(r.created_at || '').slice(0, 10)}, appts=${r.summary?.totalAppointments ?? '—'}, margin=${num(r.summary?.profitMargin)?.toFixed(0) ?? '—'}%)`);
}
