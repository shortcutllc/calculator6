#!/usr/bin/env node
/**
 * Holiday packages: does a proposal quote what www.getshortcut.co/holiday
 * quotes? Prices every package, at a range of headcounts and both class
 * lengths, four ways, and fails on any difference:
 *
 *   1. the www page's own build() (shortcut repo, frontend/data/holiday-data.js)
 *   2. quoteHolidayPackage in netlify/functions/lib/holiday-packages.js
 *   3. Pro's engine: a proposal assembled server side (pricing-engine.js)
 *   4. the client engine: recalculateServiceTotals in src/utils/proposalGenerator.ts
 *
 * It also checks the package names, contents, rates and offer match.
 *
 * USAGE
 *   node scripts/check-holiday-parity.mjs              www from GitHub (gh), main branch
 *   node scripts/check-holiday-parity.mjs --www <dir>  www from a local checkout's working tree
 *
 * Run it after any change to the www holiday page or to holiday-packages.js.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW_FILES = ['frontend/data/holiday-data.js', 'frontend/data/service-data.js'];

function wwwSource(file) {
  const i = process.argv.indexOf('--www');
  if (i > -1) return fs.readFileSync(path.join(process.argv[i + 1], file), 'utf8');
  return execFileSync('gh', ['api', `repos/shortcutllc/getshortcut.co/contents/${file}`, '-H', 'Accept: application/vnd.github.raw'], { encoding: 'utf8' });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'holiday-parity-'));
for (const f of WWW_FILES) {
  const src = wwwSource(f).replace(/from '\.\/service-data\.js'/g, "from './service-data.mjs'");
  fs.writeFileSync(path.join(tmp, path.basename(f).replace(/\.js$/, '.mjs')), src);
}
const www = await import(pathToFileURL(path.join(tmp, 'holiday-data.mjs')).href);
const ours = await import(pathToFileURL(path.join(ROOT, 'netlify/functions/lib/holiday-packages.js')).href);
const { assembleProposal } = await import(pathToFileURL(path.join(ROOT, 'netlify/functions/lib/proposal-assembler.js')).href);

// The client engine is TypeScript: bundle it for node.
const clientOut = path.join(tmp, 'client-engine.mjs');
await esbuild({
  stdin: { contents: "export { recalculateServiceTotals } from './src/utils/proposalGenerator.ts';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: clientOut, logLevel: 'error',
});
const { recalculateServiceTotals } = await import(pathToFileURL(clientOut).href);

const failures = [];
const fail = (msg) => failures.push(msg);
const same = (label, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${label}: www ${JSON.stringify(a)} vs ours ${JSON.stringify(b)}`); };

/* Rates and the offer. */
same('VISIT_HOURS', www.VISIT_HOURS, ours.VISIT_HOURS);
same('APPT_RATE', www.APPT_RATE, ours.APPT_RATE);
same('HEADSHOT_RATE', www.HEADSHOT_RATE, ours.HEADSHOT_RATE);
same('HEADSHOT_RETOUCH', www.HEADSHOT_RETOUCH, ours.HEADSHOT_RETOUCH);
same('COMBINE_PCT', www.COMBINE_PCT, ours.COMBINE_PCT);
same('FREE_CLASS_VALUE', www.FREE_CLASS_VALUE, ours.FREE_CLASS.value);

/* The packages: ids, names, contents and appointment lengths. */
same('package ids', www.PACKS.map((p) => p.id), ours.HOLIDAY_PACKAGES.map((p) => p.id));
for (const p of www.PACKS) {
  const o = ours.HOLIDAY_PACKAGES.find((x) => x.id === p.id);
  if (!o) continue;
  same(`${p.id} name`, p.name, o.name);
  same(`${p.id} inside`, p.inside, o.inside);
  same(`${p.id} lines`, p.svcs.map((v) => [v[3], v[1], v[4], v[5] === 'group']), o.lines.map((l) => [l.key, l.label, l.minutes, !!l.group]));
}

/* Prices. A ready-made package prices every line; a Create Your Own set is
   switched on line by line, the way the page's builder does it. */
const HEADCOUNTS = [1, 7, 12, 25, 50, 77, 120, 300];
const CUSTOM_SETS = [
  ['massage'], ['nails'], ['massage', 'hair'], ['headshots', 'facials'], ['assisted-stretch', 'nails'],
  ['mindfulness'], ['sound-bath', 'yoga'], ['massage', 'strength-sculpt'], ['dance-cardio', 'somatic-movement', 'hair'],
  ['massage', 'hair', 'nails', 'facials', 'headshots', 'assisted-stretch', 'mindfulness', 'sound-bath', 'yoga', 'strength-sculpt', 'dance-cardio', 'somatic-movement'],
];

function proposalTotals(input) {
  const services = ours.holidayServices(input);
  const holidayPackage = ours.holidayPackageRecord(input);
  const events = services.map((s) => ({ ...s, locationName: 'NYC', date: '2026-12-10' }));
  const server = assembleProposal({ clientName: 'Parity', events, holidayPackage }).proposalData.summary.totalEventCost;
  const clientData = recalculateServiceTotals({
    clientName: 'Parity', eventDates: ['2026-12-10'], locations: ['NYC'], holidayPackage,
    services: { NYC: { '2026-12-10': { services: services.map((s) => ({ ...s, date: '2026-12-10' })), totalCost: 0, totalAppointments: 0 } } },
    summary: {},
  });
  return { server, client: clientData.summary.totalEventCost };
}

let checked = 0;
for (const g of HEADCOUNTS) {
  for (const len of [30, 60]) {
    for (const p of www.PACKS) {
      const sets = p.optIn ? CUSTOM_SETS : [null];
      for (const set of sets) {
        const sel = { len: {}, add: {} };
        for (const v of p.svcs) if (v[5] === 'group') sel.len[v[3]] = len;
        if (set) sel.add[p.id] = Object.fromEntries(set.map((k) => [k, true]));
        const w = www.build(p, g, sel);
        const input = { packageId: p.id, headcount: g, services: set || undefined, classMinutes: len };
        const q = ours.quoteHolidayPackage(input);
        const label = `${p.name}${set ? ' [' + set.join(', ') + ']' : ''}, ${g} people, ${len} min classes`;
        if (w.total !== q.total || w.sub !== q.subtotal || w.save !== q.savings) {
          fail(`${label}: www ${w.sub} - ${w.save} = ${w.total}, ours ${q.subtotal} - ${q.savings} = ${q.total}`);
        }
        const t = proposalTotals(input);
        if (t.server !== w.total) fail(`${label}: Pro's engine ${t.server}, the page ${w.total}`);
        if (t.client !== w.total) fail(`${label}: client engine ${t.client}, the page ${w.total}`);
        checked++;
      }
    }
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
if (failures.length) {
  console.error(`check-holiday-parity: ${failures.length} difference(s)\n  ` + failures.slice(0, 40).join('\n  '));
  process.exit(1);
}
console.log(`check-holiday-parity: OK, ${checked} quotes match the www page in the module, Pro's engine and the client engine.`);
