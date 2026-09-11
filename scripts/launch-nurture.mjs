#!/usr/bin/env node
/**
 * launch-nurture.mjs — create the fall nurture campaign for one rep (or all three).
 *
 * Creates the campaign, writes the 3-step sequence, sets schedule + settings and
 * assigns ONLY that rep's mailbox. Leads are added separately, so the campaign
 * lands in DRAFTED and sends nothing until it is started in the Smartlead UI.
 *
 *   node scripts/launch-nurture.mjs --dry-run
 *   node scripts/launch-nurture.mjs --rep marc
 *   node scripts/launch-nurture.mjs --all
 *   node scripts/launch-nurture.mjs --all --opener detailed   # needs last_service + month
 */
import { requireEnv } from './lib/load-env.mjs';
import { REP_MAILBOXES, REPS, nurtureSchedule, NURTURE_SETTINGS } from './lib/nurture-config.mjs';
import { buildNurtureSequence } from './lib/nurture-sequence.mjs';

const BASE = 'https://server.smartlead.ai/api/v1';
requireEnv('SMARTLEAD_API_KEY');
const KEY = process.env.SMARTLEAD_API_KEY;

const arg = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? (process.argv[i + 1] ?? true) : fallback;
};
const has = (flag) => process.argv.includes(flag);

async function sl(method, path, body) {
  const r = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${KEY}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 200)}`);
  return json;
}

function campaignName(rep) {
  return `${REP_MAILBOXES[rep].sign_off} Fall Nurture 2026`;
}

async function createForRep(rep, { opener, dryRun }) {
  const box = REP_MAILBOXES[rep];
  const sequences = buildNurtureSequence({ signOff: box.sign_off, opener });
  const schedule = nurtureSchedule();
  const name = campaignName(rep);

  if (dryRun) {
    return { rep, name, sender: box.email, account_id: box.account_id, steps: sequences.length, schedule, settings: NURTURE_SETTINGS, dry: true };
  }

  const camp = await sl('POST', '/campaigns/create', { name });
  const id = camp.id;
  if (!id) throw new Error(`create failed: ${JSON.stringify(camp).slice(0, 200)}`);

  await sl('POST', `/campaigns/${id}/sequences`, { sequences });
  await sl('POST', `/campaigns/${id}/schedule`, schedule);
  await sl('POST', `/campaigns/${id}/settings`, NURTURE_SETTINGS);
  // exactly one mailbox: the email says it is from a person, so it must be
  await sl('POST', `/campaigns/${id}/email-accounts`, { email_account_ids: [box.account_id] });

  return {
    rep, name, campaign_id: id, sender: box.email, steps: sequences.length,
    url: `https://app.smartlead.ai/app/email-campaigns-v2/${id}/sequences`,
  };
}

(async () => {
  const dryRun = has('--dry-run');
  const opener = arg('--opener', 'generic');
  if (!['generic', 'detailed'].includes(opener)) throw new Error(`--opener must be generic or detailed`);

  const reps = has('--all') ? REPS : [arg('--rep')].filter(Boolean);
  if (!reps.length) throw new Error('pass --rep <marc|caren|jaimie> or --all');
  for (const r of reps) if (!REP_MAILBOXES[r]) throw new Error(`unknown rep "${r}" (use: ${REPS.join(', ')})`);

  for (const rep of reps) {
    const res = await createForRep(rep, { opener, dryRun });
    console.log(JSON.stringify(res, null, 2));
  }
  console.log(dryRun ? '\nDRY RUN — nothing created.' : '\nCreated. Campaigns are DRAFTED with no leads; add leads, then start them.');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
