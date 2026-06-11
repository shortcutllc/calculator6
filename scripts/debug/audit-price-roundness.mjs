// What do our displayed prices actually look like? Roundness of option prices and totals.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const { data } = await sb.from('proposals')
  .select('client_name, status, created_at, pricing_options, summary:data->summary')
  .order('created_at', { ascending: false }).limit(120);

const cost = (o) => o?.serviceCost ?? o?.totalCost ?? o?.price ?? null;
const roundness = (v) => {
  if (v == null) return 'null';
  if (v % 1 !== 0) return 'cents';        // e.g. 2937.50
  if (v % 100 === 0) return 'round-100';  // e.g. 3500
  if (v % 50 === 0) return 'round-50';
  if (v % 10 === 0) return 'round-10';
  return 'odd';                            // e.g. 3443
};

const totals = {};
const optPrices = {};
const examples = { cents: [], odd: [], 'round-10': [] };
for (const p of data || []) {
  const t = p.summary?.totalEventCost;
  if (typeof t === 'number' && t > 0) {
    totals[roundness(t)] = (totals[roundness(t)] || 0) + 1;
    const r = roundness(t);
    if (examples[r] && examples[r].length < 6) examples[r].push(`$${t} (${p.client_name})`);
  }
  for (const opts of Object.values(p.pricing_options || {})) {
    if (!Array.isArray(opts)) continue;
    for (const o of opts) {
      const c = cost(o);
      if (typeof c === 'number' && c > 0) optPrices[roundness(c)] = (optPrices[roundness(c)] || 0) + 1;
    }
  }
}
console.log('GRAND TOTAL roundness (last 120 proposals):', totals);
console.log('OPTION PRICE roundness:', optPrices);
console.log('\nExamples of non-round totals:');
for (const [k, v] of Object.entries(examples)) if (v.length) console.log(` ${k}:`, v.join('  '));

// And a few real option sets to see the ladder shape
console.log('\nSAMPLE OPTION LADDERS (most recent 5 proposals with 3+ options):');
let shown = 0;
for (const p of data || []) {
  if (shown >= 5) break;
  for (const [key, opts] of Object.entries(p.pricing_options || {})) {
    if (!Array.isArray(opts) || opts.length < 3 || shown >= 5) continue;
    shown++;
    console.log(` ${p.client_name} [${p.status}] ${key}:`);
    for (const o of opts) console.log(`   ${o.name || '(unnamed)'}: $${cost(o)} — ${o.totalHours}h × ${o.numPros} pros @ $${o.hourlyRate}/hr, ${o.totalAppointments} appts${o.discountPercent ? `, ${o.discountPercent}% disc` : ''}`);
    break;
  }
}
