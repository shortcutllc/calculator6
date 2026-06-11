// Which pricing-option tier do clients pick, ranked by price?
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const { data, error } = await sb.from('proposals')
  .select('id, client_name, status, pricing_options, selected_options')
  .eq('has_pricing_options', true);
if (error) { console.error(error.message); process.exit(1); }

const cost = (o) => o?.serviceCost ?? o?.totalCost ?? o?.price ?? null;
const tally = { all: {}, approved: {} };
let keys = 0, unresolvable = 0;
const optCounts = {};

for (const p of data || []) {
  const po = p.pricing_options || {};
  const sel = p.selected_options || {};
  for (const [key, options] of Object.entries(po)) {
    if (!Array.isArray(options) || options.length < 2) continue;
    optCounts[options.length] = (optCounts[options.length] || 0) + 1;
    const chosen = sel[key];
    // selected_options value may be an index, an option id, or an object
    let idx = null;
    if (typeof chosen === 'number') idx = chosen;
    else if (chosen && typeof chosen === 'object') {
      idx = options.findIndex((o) => (o.id != null && o.id === chosen.id) || (o.name && o.name === chosen.name));
      if (idx < 0 && cost(chosen) != null) idx = options.findIndex((o) => cost(o) === cost(chosen));
    } else if (typeof chosen === 'string') {
      idx = options.findIndex((o) => o.id === chosen || o.name === chosen);
      if (idx < 0 && /^\d+$/.test(chosen)) idx = Number(chosen);
    }
    if (idx == null || idx < 0 || idx >= options.length) { unresolvable++; continue; }
    keys++;
    const ranked = options.map((o, i) => ({ i, c: cost(o) })).filter((x) => x.c != null).sort((a, b) => a.c - b.c);
    const rank = ranked.findIndex((x) => x.i === idx);
    const label = rank === 0 ? 'cheapest' : rank === ranked.length - 1 ? 'priciest' : 'middle';
    tally.all[label] = (tally.all[label] || 0) + 1;
    if (p.status === 'approved') tally.approved[label] = (tally.approved[label] || 0) + 1;
  }
}
console.log(`proposals with pricing_options: ${data.length}`);
console.log(`option-set sizes (n options → count of sets):`, optCounts);
console.log(`resolvable selections: ${keys}, unresolvable: ${unresolvable}`);
console.log(`tier picked (ALL proposals):`, tally.all);
console.log(`tier picked (APPROVED only):`, tally.approved);

// sample a raw selected_options value for shape sanity
const sample = (data || []).find((p) => p.selected_options && Object.keys(p.selected_options).length);
if (sample) console.log('\nsample selected_options value:', JSON.stringify(Object.values(sample.selected_options)[0])?.slice(0, 300));
