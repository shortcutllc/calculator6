/**
 * archetype.test.mjs — anchor + edge assertions for the two-cluster classifier.
 *   node scripts/lib/archetype.test.mjs
 */
import { classifyArchetype } from './archetype.mjs';

let pass = 0; let fail = 0;
const eq = (got, want, msg) => { if (got === want) { pass += 1; } else { fail += 1; console.error(`FAIL: ${msg} — got ${got}, want ${want}`); } };

// Clear tech verticals → high_growth_tech.
eq(classifyArchetype({ industry: 'computer games', signals: { technology_count: 130, founded_year: 2012, is_public: true } }).archetype, 'high_growth_tech', 'DraftKings (computer games)');
eq(classifyArchetype({ industry: 'information technology & services' }).archetype, 'high_growth_tech', 'Schrödinger/WIX (IT&services, no signals)');

// Core professional services → elite_prof_services.
eq(classifyArchetype({ industry: 'law practice', employees: '640', signals: { technology_count: 82 } }).archetype, 'elite_prof_services', 'Wachtell (law)');
eq(classifyArchetype({ industry: 'management consulting', employees: '35000', signals: { technology_count: 457 } }).archetype, 'elite_prof_services', 'BCG (consulting)');

// Ambiguous FINANCE: fintech (tech keywords) → tech; bare finance → elite.
eq(classifyArchetype({ industry: 'financial services', signals: { keywords: ['fintech', 'investing app', 'platform'] } }).archetype, 'high_growth_tech', 'fintech via keywords');
eq(classifyArchetype({ industry: 'financial services' }).archetype, 'elite_prof_services', 'bare financial services → finance/elite');

// Ambiguous MEDIA: adtech (high tech) → tech; bare agency → other (NOT elite).
eq(classifyArchetype({ industry: 'marketing & advertising', signals: { technology_count: 60 } }).archetype, 'high_growth_tech', 'adtech via tech footprint');
eq(classifyArchetype({ industry: 'marketing & advertising' }).archetype, 'other', 'bare agency → other, not elite');

// Non-prime industries → other.
eq(classifyArchetype({ industry: 'hospital & health care' }).archetype, 'other', 'healthcare → other');
eq(classifyArchetype({ industry: 'real estate' }).archetype, 'other', 'real estate → other (handled as its own segment)');
eq(classifyArchetype({}).archetype, 'other', 'no industry → other');

// Score ordering: a large signal-rich firm scores above a bare one of the same cluster.
const rich = classifyArchetype({ industry: 'law practice', employees: '5000', signals: { technology_count: 100 } }).archetype_score;
const bare = classifyArchetype({ industry: 'law practice' }).archetype_score;
if (rich > bare) pass += 1; else { fail += 1; console.error(`FAIL: rich law (${rich}) should score above bare law (${bare})`); }

console.log(`\narchetype.test.mjs — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
