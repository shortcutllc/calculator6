#!/usr/bin/env node
// Find a principal's work address for a broker firm, and only keep it if it survives three gates.
//
//   node gtm/broker-holiday/find-email.mjs --firm "EPIQ" --domain epiqrm.com --dry   (search only, no credits)
//   node gtm/broker-holiday/find-email.mjs --firm "EPIQ" --domain epiqrm.com         (reveal + verify, 1 Apollo credit)
//
// Order (Will, Nov 9 2026):
//   0. An address published on the firm's own site always wins and is never replaced.
//   1. Apollo people search by the firm's domain and principal titles. Search costs no credits.
//   2. Apollo reveal of the best match (1 credit). Kept only if Apollo marks it "verified" and
//      it is on the firm's own domain. A guessed or personal address is thrown away.
//   3. MillionVerifier. "ok" passes.
//   4. BounceBan, only for what MillionVerifier calls catch_all or unknown. "deliverable" passes.
//   Anything else is HELD: recorded, never used for a draft.
//
// Results go to the private people.csv (gitignored), never to tracker.csv: this repo is public.
// Hard cap: 50 reveals a day, counted in the private apollo-log.csv.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, colloquial } from './broker.mjs';
import { verifyEmail as bouncebanVerify } from '../../scripts/lib/bounceban.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const DAILY_REVEAL_CAP = 50;
// Best first. A firm's owner beats its benefits lead; nobody below a practice leader.
export const TITLES = ['Founder', 'Owner', 'President', 'CEO', 'Managing Partner', 'Managing Principal', 'Principal', 'Partner', 'Managing Director', 'Vice President Employee Benefits', 'VP Employee Benefits', 'Employee Benefits Practice Leader', 'Director of Employee Benefits'];
const NOT_PRINCIPAL = /\b(account (manager|executive)|assistant|coordinator|analyst|administrator|associate|intern|specialist|representative|marketing|bookkeep|office manager)\b/i;
export const COLS = ['firm', 'principal_first', 'principal_name', 'principal_title', 'principal_email', 'source_url', 'verified_date', 'notes', 'email_source', 'apollo_status', 'mv_status', 'bounceban_status', 'held_email', 'linkedin_url'];

/** Lower is better; Infinity means do not contact this person. */
export function rankTitle(title) {
  const t = String(title || '');
  if (!t || NOT_PRINCIPAL.test(t)) return Infinity;
  const i = TITLES.findIndex((x) => t.toLowerCase().includes(x.toLowerCase()));
  if (i >= 0) return i;
  return /\b(chief|founder|owner|president|principal|partner)\b/i.test(t) ? TITLES.length : Infinity;
}

/** The three gates as one pure decision, so it can be tested without a network. */
export function decide({ email, domain, apolloStatus, mv, bounceban }) {
  if (!email) return { use: false, why: 'Apollo returned no address' };
  if (/email_not_unlocked|@domain\.com$/i.test(email)) return { use: false, why: 'Apollo did not unlock an address' };
  const d = String(email).split('@')[1]?.toLowerCase();
  const want = String(domain || '').toLowerCase().replace(/^www\./, '');
  if (!d || (d !== want && !d.endsWith(`.${want}`))) return { use: false, why: `address is not on the firm's own domain (${d})` };
  if (apolloStatus !== 'verified') return { use: false, why: `Apollo status is ${apolloStatus || 'missing'}, not verified` };
  if (mv === 'ok') return { use: true, why: 'Apollo verified, MillionVerifier ok' };
  if (bounceban === 'deliverable') return { use: true, why: `Apollo verified, MillionVerifier ${mv}, BounceBan deliverable` };
  return { use: false, why: `MillionVerifier ${mv || 'not run'}, BounceBan ${bounceban || 'not run'}` };
}

const privateDir = () => {
  const c = [process.env.BROKER_PRIVATE_DIR, path.join(DIR, '../../dave/state/broker-holiday'), path.join(DIR, '../../../../../dave/state/broker-holiday')].filter(Boolean);
  return c.find((d) => fs.existsSync(d)) || c[c.length - 1];
};
const q = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s ?? ''));
const toCsv = (rows) => `${[COLS.join(','), ...rows.map((r) => COLS.map((h) => q(r[h] || '')).join(','))].join('\n')}\n`;

function loadKeys() {
  const env = { ...process.env };
  for (const f of [path.join(os.homedir(), '.openclaw/workspace/.env')]) {
    try { for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } } catch { /* no file */ }
  }
  return env;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : ''; };
  const dry = args.includes('--dry');
  const firm = flag('firm'); const domain = flag('domain').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!firm || !domain) { console.error('usage: find-email.mjs --firm "<tracker firm name>" --domain <firm domain> [--dry]'); process.exit(1); }
  const env = loadKeys();
  for (const k of ['APOLLO_API_KEY', 'MILLIONVERIFIER_API_KEY']) if (!env[k]) { console.error(`missing ${k}`); process.exit(1); }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  const pdir = privateDir(); fs.mkdirSync(pdir, { recursive: true });
  const peopleFile = path.join(pdir, 'people.csv'); const logFile = path.join(pdir, 'apollo-log.csv');
  const people = fs.existsSync(peopleFile) ? parseCsv(fs.readFileSync(peopleFile, 'utf8')) : [];
  const before = people.length;
  let row = people.find((p) => colloquial(p.firm) === colloquial(firm));
  if (row?.principal_email && row.email_source !== 'apollo') { console.log(`KEEP  ${firm}: an address from the firm's own site is on file; Apollo not used.`); process.exit(0); }

  const post = async (url, body) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.APOLLO_API_KEY }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`apollo ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
  const found = await post('https://api.apollo.io/api/v1/mixed_people/api_search', { q_organization_domains_list: [domain], person_titles: TITLES, page: 1, per_page: 25 });
  const cands = (found.people || found.contacts || []).map((p) => ({ id: p.id, name: p.name || [p.first_name, p.last_name || p.last_name_obfuscated].filter(Boolean).join(' '), first: p.first_name, title: p.title, rank: rankTitle(p.title) }))
    .filter((p) => p.rank !== Infinity).sort((a, b) => a.rank - b.rank);
  // The person the firm's own site names as principal beats Apollo's title ranking.
  const siteFirst = String(row?.principal_first || '').toLowerCase();
  if (siteFirst) cands.sort((a, b) => (String(b.first || '').toLowerCase() === siteFirst) - (String(a.first || '').toLowerCase() === siteFirst));
  console.log(`Apollo: ${cands.length} principal level ${cands.length === 1 ? 'person' : 'people'} at ${domain}`);
  cands.slice(0, 5).forEach((c) => console.log(`  ${c.name} · ${c.title}`));
  if (!cands.length) { console.log(`NONE  ${firm}: nobody at principal level in Apollo. Form and LinkedIn only.`); process.exit(0); }
  if (dry) { console.log('Dry run: no reveal, no credits spent.'); process.exit(0); }

  const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter((l) => l.startsWith(today)).length : 0;
  if (log >= DAILY_REVEAL_CAP) { console.log(`CAP   ${DAILY_REVEAL_CAP} reveals already used today. Try tomorrow.`); process.exit(0); }

  const m = await post('https://api.apollo.io/api/v1/people/match', { id: cands[0].id, reveal_personal_emails: false });
  fs.appendFileSync(logFile, `${today},${q(firm)},${domain}\n`);
  const person = m.person || {};
  const email = person.email || ''; const apolloStatus = person.email_status || '';
  let mv = ''; let bb = '';
  const first = decide({ email, domain, apolloStatus, mv: 'ok' }); // would it pass if MV said ok? If not, skip paying for MV.
  if (first.use) {
    try { const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${env.MILLIONVERIFIER_API_KEY}&email=${encodeURIComponent(email)}&timeout=20`); mv = String((await r.json()).result || 'unknown').toLowerCase(); } catch { mv = 'unknown'; }
    if (mv !== 'ok' && ['catch_all', 'unknown'].includes(mv) && env.BOUNCEBAN_API_KEY) bb = (await bouncebanVerify(email, { apiKey: env.BOUNCEBAN_API_KEY })).result;
  }
  const verdict = decide({ email, domain, apolloStatus, mv, bounceban: bb });
  if (!row) { row = { firm }; people.push(row); }
  const name = person.name || cands[0].name;
  Object.assign(row, {
    principal_first: row.principal_first || person.first_name || cands[0].first || '',
    principal_name: row.principal_name || name || '',
    principal_title: row.principal_title || person.title || cands[0].title || '',
    principal_email: verdict.use ? email : (row.principal_email || ''),
    held_email: verdict.use ? '' : email,
    email_source: 'apollo', apollo_status: apolloStatus, mv_status: mv, bounceban_status: bb,
    linkedin_url: row.linkedin_url || person.linkedin_url || '',
    verified_date: row.verified_date || today,
    notes: `${row.notes ? `${row.notes} ` : ''}Apollo ${today}: ${name}, ${person.title || cands[0].title}. ${verdict.why}.`.trim(),
  });
  if (people.length < before) throw new Error('people.csv would lose rows; not written');
  fs.writeFileSync(peopleFile, toCsv(people));
  console.log(`${verdict.use ? 'USE  ' : 'HELD '} ${firm}: ${name}, ${person.title || cands[0].title}. ${verdict.why}. (reveals today: ${log + 1} of ${DAILY_REVEAL_CAP})`);
}
