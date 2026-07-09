/**
 * Sandbox for the graduation reply drafter (graduation-notify-background.js).
 * Drives the REAL draftReply + guardDirections with the corrected prompt so we
 * can see before/after locally. No sends, no writes, no Slack, no Gmail.
 *
 *   node scripts/debug/graduation-reply-sandbox.mjs
 */
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';

function loadEnv(p) {
  try { for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
}
loadEnv('.env');
loadEnv('/Users/willnewton/.openclaw/workspace/.env');
if (!process.env.ANTHROPIC_API_KEY) { console.error('no ANTHROPIC_API_KEY'); process.exit(1); }

const { _draftReply, _guardDirections } = await import('../../netlify/functions/graduation-notify-background.js');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BOOK = 'https://proposals.getshortcut.co/book-a-call/TESTtoken123';

const CASES = [
  {
    tag: 'AGREED TO CALL — Eric (Berkman Bottger, family law)',
    ctx: { repFirstName: 'Caren', name: 'Eric Sternberg', title: 'Partner', company: 'Berkman Bottger', industry: 'legal',
      replyContent: 'Sure, probably worth a quick chat. When were you thinking?', bookACallUrl: BOOK },
  },
  {
    tag: 'AGREED + PROPOSED A TIME — Jessica (UNTUCKit)',
    ctx: { repFirstName: 'Jaimie', name: 'Jessica Camacho', title: 'Office Manager', company: 'UNTUCKit', industry: 'apparel',
      replyContent: 'Yes, I would be interested. Are you available tomorrow at 11:00 am?', bookACallUrl: BOOK },
  },
  {
    tag: 'ASKED FOR INFO (synthetic) — wants detail before a call',
    ctx: { repFirstName: 'Jaimie', name: 'Dana Lee', title: 'Head of People', company: 'Northwind', industry: 'software',
      replyContent: 'Thanks for reaching out. Before we set up a call, could you send a bit more on how a session actually works on site?', bookACallUrl: BOOK },
  },
];

for (const c of CASES) {
  console.log('\n\n══════════════════════════════════════════════════════════');
  console.log(c.tag);
  console.log('THEIR REPLY: ' + JSON.stringify(c.ctx.replyContent));
  console.log('══════════════════════════════════════════════════════════');
  let drafted;
  try { drafted = await _draftReply(anthropic, c.ctx); }
  catch (e) { console.log('  draftReply error:', e.message); continue; }
  const violations = _guardDirections(drafted, c.ctx.bookACallUrl, c.ctx.replyContent);
  const fightFor = drafted.fight_for;
  for (const d of drafted.directions || []) {
    const star = d.label === fightFor ? '  ⭐ fight-for' : '';
    console.log(`\n── [${d.label}]${star}`);
    console.log(`   SUBJECT: ${d.subject}`);
    console.log((d.body || '').split('\n').map((l) => '   ' + l).join('\n'));
  }
  console.log('\n   fight_for: ' + fightFor + ' — ' + (drafted.fight_for_reason || ''));
  console.log('   GUARD VIOLATIONS: ' + (violations.length ? violations.join(' | ') : 'none ✓'));
}
process.exit(0);
