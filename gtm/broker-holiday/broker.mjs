#!/usr/bin/env node
// Small broker holiday outreach: the mechanical half of the system.
//
// Drafts are BUILT from the locked text below, never typed from memory, then
// LINTED against the pre-send check. The only free text a draft takes is the
// firm name, the principal's first name and one short "client type" phrase.
//
//   node gtm/broker-holiday/broker.mjs due   [--date YYYY-MM-DD]
//   node gtm/broker-holiday/broker.mjs draft --channel form --firm "Houtz Insurance" --client "mid-size employers"
//   node gtm/broker-holiday/broker.mjs lint  --channel form --firm "Houtz Insurance" < draft.txt
//   node gtm/broker-holiday/broker.mjs batch [--date YYYY-MM-DD]   (writes batches/<date>.md and .html)
//
// Channels: form, email1 (day 1, no form), email3 (after a form), linkedin, instagram.
// The locked text is Will's Nov 9 2026 approved wording. Changing a word of it
// is a copy decision: Will approves the new text first, then it changes here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const TRACKER = path.join(DIR, 'tracker.csv');

/* ── Locked text (Will, Nov 9 2026) ───────────────────────────────────── */

export const SUBJECT = 'quick question - carrier funds';
export const HOLIDAY_URL = 'https://getshortcut.co/holiday';

const P_INTRO = 'I am Will, I run Shortcut. We help many of our partners deploy carrier wellness funds on services their teams actually use: chair massage, mindfulness, sound baths, nutrition coaching, all from one team, nationwide.';
const P_PROOF = 'I talk to companies every week, and a striking number are sitting on unused Cigna or Aetna wellness dollars, or they do not even know the fund exists. BCG and Burberry pay for Shortcut services completely via these funds.';
const S_HOLIDAY = 'Our holiday wellness packages are a really fun and meaningful way to put these dollars to work.';
const P_LEARN = `Learn more about Shortcut and our holiday wellness here: ${HOLIDAY_URL}`;
const P_SHARE = 'Can I share more info on our holiday packages and how funds can be applied?';
const P_PRESENT = 'Would also love an opportunity to present our solution to your team. Either way, thanks for your time!';
const P_REFERENCE = 'I reached out via your website earlier this week, and wanted to follow up here.';
const SIGNOFF = ['Cheers,', 'Will', 'Will Newton', 'Founder, Shortcut', 'will@getshortcut.co', '2152188088'];

const SUFFIX = /[,.]?\s+(inc|llc|l\.l\.c|corp|corporation|co|ltd|limited)\.?$/i;
/** "Jordan Dynamics Inc" -> "Jordan Dynamics". Firm names are colloquial. */
export const colloquial = (firm) => {
  let f = String(firm || '').trim();
  while (SUFFIX.test(f)) f = f.replace(SUFFIX, '').trim();
  return f;
};

const ask = (clientType, firm) =>
  `Since you advise ${clientType} on their benefits, do your clients${firm ? ` at ${firm}` : ''} have fund dollars still sitting there this plan year? ${S_HOLIDAY}`;

/** Build a draft. Returns { subject, body } or throws on missing inputs. */
export function buildDraft({ channel, firm, first, clientType }) {
  const f = colloquial(firm);
  const need = (v, n) => { if (!v || !String(v).trim()) throw new Error(`missing ${n} for ${channel}`); };
  need(f, 'firm');
  if (channel === 'form') {
    need(clientType, 'clientType');
    return { subject: SUBJECT, body: [`Hi ${f} team,`, P_INTRO, P_PROOF, ask(clientType), P_LEARN, P_PRESENT, SIGNOFF.join('\n')].join('\n\n') };
  }
  if (channel === 'email1' || channel === 'email3') {
    need(first, 'first name'); need(clientType, 'clientType');
    const paras = [`Hi ${first},`];
    if (channel === 'email3') paras.push(P_REFERENCE);
    paras.push(P_INTRO, P_PROOF, ask(clientType, f), P_SHARE, P_PRESENT, SIGNOFF.join('\n'));
    return { subject: SUBJECT, body: paras.join('\n\n') };
  }
  if (channel === 'linkedin') {
    need(first, 'first name');
    return { subject: '', body: `Hi ${first}, I run Shortcut. I reached out via your website earlier this week. We help brokers deploy Cigna and Aetna fund dollars. Do any of your clients have funds sitting there this plan year? I would love to present to you and your team. Will` };
  }
  if (channel === 'instagram') {
    return { subject: '', body: `Hi ${f} team, I am Will, I run Shortcut. I reached out via your website earlier this week. We help brokers put leftover Cigna and Aetna wellness funds to work on chair massage, mindfulness, sound baths and nutrition coaching. Do your clients have funds sitting there this plan year? I would love to present to you and your team.` };
  }
  throw new Error(`unknown channel: ${channel}`);
}

/* ── Pre-send check ───────────────────────────────────────────────────── */

const count = (hay, needle) => hay.split(needle).length - 1;
const LINK = /https?:\/\/|www\.|<a\s|href=/gi;

/** Returns a list of { rule, ok, got, want }. A draft passes when every ok is true. */
export function lintDraft({ channel, firm, first, body }) {
  const f = colloquial(firm);
  const out = [];
  const add = (rule, ok, got, want) => out.push({ rule, ok: !!ok, got: String(got), want: String(want) });
  const links = (body.match(LINK) || []).length;

  add('firm name has no Inc, LLC, Corp, Co, Ltd', !/\b(inc|llc|corp|ltd)\b\.?/i.test(body), (body.match(/\b(inc|llc|corp|ltd)\b/gi) || []).length, 0);
  add('no dashes in the body', !/[-‒–—―]/.test(body.replace(/-/g, (m, i) => (f.includes('-') && body.slice(Math.max(0, i - f.length), i + f.length).includes(f) ? '' : m))), (body.match(/[-‒-―]/g) || []).length, 0);
  add('no HTML or markdown', !/<[a-z][^>]*>|\*\*|\]\(/i.test(body), 'checked', 'plain text');
  add('no I am curious sentence', !/i am curious|i'm curious/i.test(body), count(body.toLowerCase(), 'curious'), 0);

  if (channel === 'linkedin' || channel === 'instagram') {
    add('no link', links === 0, links, 0);
    add('one question', count(body, '?') === 1, count(body, '?'), 1);
    if (channel === 'linkedin') {
      add('addressed to the principal', body.startsWith(`Hi ${first},`), body.slice(0, 20), `Hi ${first},`);
      add('fits a LinkedIn connection note (300 characters)', body.length <= 300, body.length, '<= 300');
    } else {
      add('addressed to the firm team', body.startsWith(`Hi ${f} team,`), body.slice(0, 30), `Hi ${f} team,`);
      add('firm name once', count(body, f) === 1, count(body, f), 1);
    }
    return out;
  }

  const paras = body.split(/\n\s*\n/).map((p) => p.trim());
  const askP = paras.filter((p) => p.startsWith('Since you advise '));
  const isForm = channel === 'form';

  add('blank line between every paragraph', !paras.slice(0, -1).some((p) => p.includes('\n')), paras.slice(0, -1).filter((p) => p.includes('\n')).length, 0);
  add('greeting', paras[0] === (isForm ? `Hi ${f} team,` : `Hi ${first},`), paras[0], isForm ? `Hi ${f} team,` : `Hi ${first},`);
  add('intro paragraph is the locked text', paras.includes(P_INTRO), paras.includes(P_INTRO), true);
  add('proof paragraph is the locked text', paras.includes(P_PROOF), paras.includes(P_PROOF), true);
  add('firm name once', count(body, f) === 1, count(body, f), 1);
  add('BCG once', count(body, 'BCG') === 1, count(body, 'BCG'), 1);
  add('Burberry once', count(body, 'Burberry') === 1, count(body, 'Burberry'), 1);
  add('one team once', count(body, 'one team') === 1, count(body, 'one team'), 1);
  add('one ask paragraph, opening with one Since clause', askP.length === 1 && count(body, 'Since ') === 1, askP.length, 1);
  if (askP.length === 1) {
    const p = askP[0];
    const clause = p.slice('Since you advise '.length, p.indexOf(' on their benefits,'));
    add('question marks in the ask paragraph', count(p, '?') === 1, count(p, '?'), 1);
    add('holiday sentence is the locked line only', p.endsWith(`? ${S_HOLIDAY}`) && count(body, 'holiday wellness packages') === 1, p.endsWith(S_HOLIDAY), true);
    add('Since clause is short: 8 words or fewer, no numbers, no commas', p.includes(' on their benefits,') && clause.split(/\s+/).length <= 8 && !/[\d,;:]/.test(clause), `"${clause}"`, '<= 8 plain words');
    add(isForm ? 'question does not repeat the firm name' : 'question names the firm', isForm ? p.includes('do your clients have fund dollars') : p.includes(`do your clients at ${f} have fund dollars`), 'checked', 'locked question');
  }
  if (isForm) {
    add('exactly one link, the plain holiday URL', links === 1 && paras.includes(P_LEARN), links, 1);
    add('no share ask beside the link', !body.includes('Can I share more info'), body.includes('Can I share more info'), false);
  } else {
    add('zero links in body and signature', links === 0 && !body.includes('getshortcut.co/'), links, 0);
    add('share ask is the locked line', paras.includes(P_SHARE) && !body.includes('Learn more'), paras.includes(P_SHARE), true);
    add('website reference line only on the day 3 version', paras.includes(P_REFERENCE) === (channel === 'email3'), paras.includes(P_REFERENCE), channel === 'email3');
  }
  add('closing is the Nov 9 block', paras.includes(P_PRESENT), paras.includes(P_PRESENT), true);
  add('Cheers and Will on their own lines, plain text signature', paras[paras.length - 1] === SIGNOFF.join('\n'), paras[paras.length - 1].split('\n').length, SIGNOFF.length);
  return out;
}

/* ── Cadence ──────────────────────────────────────────────────────────── */

// Days nobody should be touched. Veterans Day, Thanksgiving and the Friday
// after, Christmas Eve and Day, New Year's Eve and Day.
export const HOLIDAYS = new Set(['2026-11-11', '2026-11-26', '2026-11-27', '2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01']);
export const LAST_NEW_OUTREACH = '2026-12-11';

const iso = (d) => d.toISOString().slice(0, 10);
const at = (s) => new Date(`${s}T12:00:00Z`);
export const isBusinessDay = (s) => { const d = at(s).getUTCDay(); return d !== 0 && d !== 6 && !HOLIDAYS.has(s); };
export function addBusinessDays(s, n) {
  const d = at(s);
  while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); if (isBusinessDay(iso(d))) n -= 1; }
  return iso(d);
}

// Four touches, each at least two business days after the last, then close.
// Offsets are business days from the day 1 touch.
export const STEPS = [
  { n: 2, offset: 2, what: 'email' },
  { n: 3, offset: 5, what: 'LinkedIn connection to the principal' },
  { n: 4, offset: 8, what: 'ONE of: follow up email, or one DM (LinkedIn if accepted, else Instagram)' },
  { n: 5, offset: 10, what: 'close: log no reply, move to January renewal list' },
];

/** touches: "2026-11-09:form;2026-11-12:email3". Returns the next step for a firm. */
export function nextStep(row, today) {
  const touches = String(row.touches || '').split(';').map((t) => t.trim()).filter(Boolean).map((t) => ({ date: t.slice(0, 10), channel: t.slice(11) }));
  if (['replied', 'closed', 'suppressed', 'bounced'].includes(row.status)) return { action: 'none', why: `status is ${row.status}` };
  if (!touches.length) {
    if (today > LAST_NEW_OUTREACH) return { action: 'none', why: `no new outreach after ${LAST_NEW_OUTREACH}` };
    return { action: 'day1', due: today, what: row.day1_channel || (row.form_url ? 'form' : 'email1'), dueNow: isBusinessDay(today) };
  }
  const day1 = touches[0];
  const last = touches[touches.length - 1];
  const step = STEPS[touches.length - 1] || STEPS[STEPS.length - 1];
  // Never earlier than two business days after the last touch, whatever slipped.
  const scheduled = addBusinessDays(day1.date, step.offset);
  const floor = addBusinessDays(last.date, 2);
  const due = scheduled > floor ? scheduled : floor;
  let what = step.what;
  if (step.n === 2) what = day1.channel === 'form' ? 'email3 to the principal (references the website note)' : 'short follow up, replying in the day 1 email thread (no website reference)';
  return { action: step.n === 5 ? 'close' : `touch${step.n}`, due, what, dueNow: due <= today && isBusinessDay(today) };
}

/* ── Tracker ──────────────────────────────────────────────────────────── */

export function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
export const readTracker = (file = TRACKER) => parseCsv(fs.readFileSync(file, 'utf8'));

/* ── CLI ──────────────────────────────────────────────────────────────── */

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function batch(today) {
  const items = [];
  for (const row of readTracker()) {
    const step = nextStep(row, today);
    if (!step.dueNow) continue;
    const base = { firm: colloquial(row.firm), step, row, drafts: [], blocked: [] };
    const tryDraft = (channel) => {
      if (row.verified_date === '') { base.blocked.push(`${channel}: firm is not verified on its own homepage`); return; }
      try {
        const d = buildDraft({ channel, firm: row.firm, first: row.principal_first, clientType: row.client_type });
        const checks = lintDraft({ channel, firm: row.firm, first: row.principal_first, body: d.body });
        const fails = checks.filter((c) => !c.ok);
        if (fails.length) base.blocked.push(`${channel}: failed ${fails.map((x) => x.rule).join('; ')}`);
        else base.drafts.push({ channel, ...d, checks: checks.length, to: channel === 'form' ? row.form_url : channel.startsWith('email') ? (row.principal_email || row.firm_email) : '' });
      } catch (e) { base.blocked.push(`${channel}: ${e.message}`); }
    };
    if (step.action === 'day1') tryDraft(step.what);
    else if (step.action === 'touch2' && step.what.startsWith('email3')) {
      if (row.principal_email) tryDraft('email3'); else base.blocked.push('email3: no principal email published on the firm site, never guess one');
    } else if (step.action === 'touch2') base.blocked.push('thread follow up: no approved text yet, see CRITIQUE.md proposal P2');
    else if (step.action === 'touch3') tryDraft('linkedin');
    else if (step.action === 'touch4') { base.blocked.push('day 7 follow up email: no approved text yet, see CRITIQUE.md proposal P3'); tryDraft('instagram'); }
    items.push(base);
  }
  const md = [`# Broker outreach batch, ${today}`, ''];
  const html = [`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Broker Batch ${today}</title><style>
:root{--bg:#f7f6f3;--card:#fff;--ink:#1c1b19;--soft:#6b6861;--line:#e3e0d9;--ok:#1d7a46;--bad:#b3261e}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171614;--card:#211f1c;--ink:#f1efe9;--soft:#a8a49b;--line:#37342f;--ok:#6fd39a;--bad:#ff8a80}}
:root[data-theme="dark"]{--bg:#171614;--card:#211f1c;--ink:#f1efe9;--soft:#a8a49b;--line:#37342f;--ok:#6fd39a;--bad:#ff8a80}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 4px}.meta{color:var(--soft);font-size:14px;margin:0 0 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}.card p{margin:0 0 14px;white-space:pre-line}.card p:last-child{margin:0}
.tag{font-size:13px;font-weight:600;color:var(--ok)}.bad{color:var(--bad);font-size:14px}</style></head><body><main><h1>Broker batch, ${esc(today)}</h1><p class="meta">Built from the locked Nov 9 text. Nothing here has been sent.</p>`];
  if (!items.length) { md.push('Nothing is due today.'); html.push('<p>Nothing is due today.</p>'); }
  for (const it of items) {
    md.push(`## ${it.firm}`, `${it.step.action}, due ${it.step.due}: ${it.step.what}`, '');
    html.push(`<h2>${esc(it.firm)}</h2><p class="meta">${esc(it.step.action)}, due ${esc(it.step.due)}: ${esc(it.step.what)}</p>`);
    for (const d of it.drafts) {
      md.push(`### ${d.channel}${d.to ? ` to ${d.to}` : ''}`, d.subject ? `Subject: ${d.subject}` : '', `Pre-send check: ${d.checks} of ${d.checks} passed`, '', '```', d.body, '```', '');
      html.push(`<div class="card"><p class="tag">${esc(d.channel)}${d.to ? ` to ${esc(d.to)}` : ''} · check ${d.checks} of ${d.checks}</p>${d.subject ? `<p class="meta">Subject: ${esc(d.subject)}</p>` : ''}${d.body.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>`);
    }
    for (const b of it.blocked) { md.push(`- BLOCKED ${b}`); html.push(`<p class="bad">Blocked. ${esc(b)}</p>`); }
    md.push('');
  }
  html.push('</main></body></html>');
  fs.mkdirSync(path.join(DIR, 'batches'), { recursive: true });
  fs.writeFileSync(path.join(DIR, 'batches', `${today}.md`), md.join('\n'));
  fs.writeFileSync(path.join(DIR, 'batches', 'latest.html'), html.join('\n'));
  console.log(md.join('\n'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (n, d = '') => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d; };
  // Eastern date, because the firms and the sender are on Eastern time.
  const today = flag('date') || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  if (cmd === 'due') {
    const rows = readTracker();
    console.log(`Today ${today} (${isBusinessDay(today) ? 'business day' : 'NOT a business day, no touches'})`);
    for (const r of rows) { const s = nextStep(r, today); console.log(`${s.dueNow ? 'DUE  ' : '     '}${colloquial(r.firm).padEnd(22)} ${s.action.padEnd(7)} ${s.due || ''} ${s.what || s.why || ''}`); }
    const sent = rows.filter((r) => r.touches);
    const replies = rows.filter((r) => r.status === 'replied').length;
    console.log(`\nContacted ${sent.length} · replies ${replies} · queue ${rows.length - sent.length}`);
  } else if (cmd === 'draft') {
    const d = buildDraft({ channel: flag('channel'), firm: flag('firm'), first: flag('first'), clientType: flag('client') });
    console.log(d.subject ? `Subject: ${d.subject}\n\n${d.body}` : d.body);
  } else if (cmd === 'lint') {
    const body = fs.readFileSync(0, 'utf8').replace(/^Subject:.*\n\n/, '').trimEnd();
    const res = lintDraft({ channel: flag('channel'), firm: flag('firm'), first: flag('first'), body });
    for (const c of res) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.rule}  (got ${c.got}, want ${c.want})`);
    const fails = res.filter((c) => !c.ok).length;
    console.log(`\n${res.length - fails} of ${res.length} passed`);
    process.exit(fails ? 1 : 0);
  } else if (cmd === 'batch') batch(today);
  else { console.error('usage: broker.mjs due|draft|lint|batch'); process.exit(1); }
}
