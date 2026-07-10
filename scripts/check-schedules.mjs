/**
 * check-schedules — guard against the netlify.toml ⇄ inline-config schedule drift.
 *
 * Every Netlify scheduled function declares its cron in TWO places (see the
 * netlify.toml comment): the `[functions."name"] schedule` block AND the
 * function's own `export const config = { schedule: '...' }`. If they disagree,
 * the job can fire at the wrong time or (worse) silently not at all. This
 * asserts they match for every scheduled function and exits non-zero if not.
 *
 * Run in CI / before deploy:  node scripts/check-schedules.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TOML = path.join(ROOT, 'netlify.toml');
const FN_DIR = path.join(ROOT, 'netlify', 'functions');

// 1) Parse netlify.toml: [functions."name"] ... schedule = "cron"
const toml = fs.readFileSync(TOML, 'utf8');
const tomlSchedules = {};
const blockRe = /\[functions\."([^"]+)"\]([\s\S]*?)(?=\n\[|\n*$)/g;
let m;
while ((m = blockRe.exec(toml))) {
  const name = m[1];
  const sched = m[2].match(/schedule\s*=\s*"([^"]+)"/);
  if (sched) tomlSchedules[name] = sched[1].trim();
}

// 2) Parse each function's inline `export const config = { schedule: '...' }`
const inlineSchedules = {};
for (const file of fs.readdirSync(FN_DIR)) {
  if (!file.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(FN_DIR, file), 'utf8');
  const cfg = src.match(/export\s+const\s+config\s*=\s*\{[^}]*schedule\s*:\s*['"]([^'"]+)['"]/);
  if (cfg) inlineSchedules[file.replace(/\.js$/, '')] = cfg[1].trim();
}

// 3) Compare — a scheduled function should appear in BOTH with the same cron.
const names = [...new Set([...Object.keys(tomlSchedules), ...Object.keys(inlineSchedules)])].sort();
const problems = [];
for (const name of names) {
  const t = tomlSchedules[name];
  const i = inlineSchedules[name];
  if (t && !i) problems.push(`${name}: in netlify.toml ("${t}") but NO inline export const config schedule`);
  else if (!t && i) problems.push(`${name}: inline config ("${i}") but NOT declared in netlify.toml`);
  else if (t !== i) problems.push(`${name}: MISMATCH — netlify.toml "${t}" vs inline "${i}"`);
}

if (problems.length) {
  console.error('✗ Netlify schedule drift detected:\n' + problems.map((p) => '  - ' + p).join('\n'));
  console.error('\nFix so both declarations agree, then redeploy (Netlify needs the toml block to actually schedule).');
  process.exit(1);
}
console.log(`✓ ${names.length} scheduled function(s) consistent between netlify.toml and inline config:`);
for (const n of names) console.log(`  - ${n}: ${tomlSchedules[n]}`);
