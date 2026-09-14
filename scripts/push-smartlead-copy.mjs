#!/usr/bin/env node
/**
 * push-smartlead-copy.mjs — push the CURRENT approved drip copy into Jaimie's
 * Smartlead campaign, so the two systems never send different words.
 *
 * Source of truth is netlify/functions/lib/drip-copy.js — the same templates the
 * self-hosted runner uses. This converts them to Smartlead's shape:
 *   - {{first_name}} / {{company_name}} pass through unchanged (same syntax)
 *   - [label](url) markdown becomes a real anchor
 *   - **bold** becomes <strong>
 *   - newlines become <br>
 *
 * Smartlead gets the 'spoke' variant only. It has no per-lead branch for a
 * verified completed event, and the 'booked' claim must never go to someone we
 * cannot prove we visited.
 *
 *   node scripts/push-smartlead-copy.mjs            # preview
 *   node scripts/push-smartlead-copy.mjs --apply
 */
import { requireEnv } from './lib/load-env.mjs';
import { STEPS } from '../netlify/functions/lib/drip-copy.js';

const BASE = 'https://server.smartlead.ai/api/v1';
const CAMPAIGN = 3935145;
const SIGN_OFF = 'Jaimie';
const has = (f) => process.argv.includes(f);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const links = (h) => h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
const bold = (h) => h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function toHtml(text) {
  return bold(links(esc(text.replace(/\{\{sign_off\}\}/g, SIGN_OFF)))).replace(/\r?\n/g, '<br>');
}

(async () => {
  requireEnv('SMARTLEAD_API_KEY');
  const KEY = process.env.SMARTLEAD_API_KEY;

  const sequences = [
    { seq_number: 1, seq_delay_details: { delay_in_days: 0 }, subject: STEPS[1].subject, email_body: toHtml(STEPS[1].spoke) },
    { seq_number: 2, seq_delay_details: { delay_in_days: 3 }, subject: '', email_body: toHtml(STEPS[2].body) },
    { seq_number: 3, seq_delay_details: { delay_in_days: 5 }, subject: '', email_body: toHtml(STEPS[3].body) },
  ];

  for (const s of sequences) {
    const plain = s.email_body.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    console.log(`\n--- step ${s.seq_number} ---`);
    console.log('subject:', s.subject || '(threaded)');
    console.log(plain.split('\n').slice(0, 4).join('\n'));
  }

  // guard: the booked-only claim must never reach Smartlead
  const all = sequences.map((s) => s.email_body).join(' ');
  if (/since our last event/.test(all)) throw new Error('refusing: "since our last event" is the booked-only claim');
  if (/\{\{(?!first_name|company_name)/.test(all)) throw new Error('refusing: unsupported merge token for Smartlead');
  console.log('\nguards passed: no booked-only claim, no unsupported merge tokens');

  if (!has('--apply')) { console.log('\npreview only — pass --apply'); return; }

  const r = await fetch(`${BASE}/campaigns/${CAMPAIGN}/sequences?api_key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sequences }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`);
  console.log('\npushed 3 steps to Smartlead campaign', CAMPAIGN);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
