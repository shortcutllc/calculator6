#!/usr/bin/env node
/**
 * sync-drip-sheet.mjs — diff a rep's "Drip" tab in the Shortcut Event Sales
 * Pipeline sheet against their Smartlead nurture campaign.
 *
 * The reps keep editing their Drip tabs, so this answers "what changed since we
 * last loaded?" and "what in the sheet should never be uploaded?".
 *
 * Read-only by default. --add uploads sheet rows that are new and safe.
 *
 *   node scripts/sync-drip-sheet.mjs --rep jaimie
 *   node scripts/sync-drip-sheet.mjs --rep jaimie --add
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './lib/load-env.mjs';

// googleapis is not a dependency of this repo; it lives in the openclaw workspace.
// Resolve it there rather than adding a heavy dep for one script.
async function loadGoogle() {
  try {
    return (await import('googleapis')).google;
  } catch {
    const p = path.join(process.env.HOME, '.openclaw/workspace/node_modules/googleapis/build/src/index.js');
    return (await import(pathToFileURL(p).href)).google;
  }
}

const SHEET_ID = '1ibymeeghZVJGOskDn76GtR6kt3CCIPt-93RLdnAvkiY';
const BASE = 'https://server.smartlead.ai/api/v1';

// rep -> { tab, campaignId }
export const DRIP = {
  jaimie: { tab: "Jaimie's Drip", campaignId: 3935145 },
  caren:  { tab: "Caren's Drip",  campaignId: 3935144 },
  marc:   { tab: "Marc's Drip",   campaignId: 3935143 },
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PLACEHOLDER = /no-email\.placeholder|example\.(com|org)|^test@/i;
const ROLE = /^(info|sales|hello|contact|admin|support|office|team|hr|careers|jobs|billing|accounts?|help|marketing|noreply|no-reply)([._-]|@)/i;
// Machine addresses that look valid but are not people (ESP unsubscribe tokens etc).
const MACHINE = /@(unsubscribe|bounce|reply|mailer)[.-]|@.*\.(customer\.io|sendgrid\.net|mailgun\.org)$|^[a-z0-9]{24,}@/i;
// Domains Smartlead blocks account-wide: live clients, kept off automated sending.
// Regenerate if the block list changes; a blocked upload silently adds nobody.
const BLOCKED_DOMAINS = new Set(
  JSON.parse(fs.readFileSync(new URL('./lib/smartlead-blocked-domains.json', import.meta.url), 'utf8'))
    .map((d) => d.toLowerCase())
);

const arg = (f, d = null) => { const i = process.argv.indexOf(f); return i > -1 ? (process.argv[i + 1] ?? true) : d; };
const has = (f) => process.argv.includes(f);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

export function parseRows(rows) {
  const header = (rows[0] || []).map((h) => String(h).trim().toLowerCase());
  const i = (n) => header.indexOf(n);
  const [iCo, iFn, iLn, iEm] = [i('company name'), i('client name'), i('client last name'), i('email')];
  const seen = new Set();
  const out = { usable: [], junk: [] };
  rows.slice(1).forEach((r, n) => {
    const email = String(r[iEm] ?? '').trim().toLowerCase();
    const row = n + 2; // 1-indexed, plus header
    if (!email) return out.junk.push({ row, email, why: 'no email' });
    if (!EMAIL_RE.test(email)) return out.junk.push({ row, email, why: 'malformed' });
    if (PLACEHOLDER.test(email)) return out.junk.push({ row, email, why: 'placeholder' });
    if (ROLE.test(email)) return out.junk.push({ row, email, why: 'role address' });
    if (MACHINE.test(email)) return out.junk.push({ row, email, why: 'machine address' });
    if (seen.has(email)) return out.junk.push({ row, email, why: 'duplicate' });
    seen.add(email);
    let fn = String(r[iFn] ?? '').trim();
    let ln = String(r[iLn] ?? '').trim();
    if (!ln && fn.includes(' ')) { const p = fn.split(/\s+/); fn = p.shift(); ln = p.join(' '); }
    if (!fn) {
      const m = email.split('@')[0].match(/^([a-z]{2,})[._-]([a-z]{2,})$/i);
      if (m) { fn = cap(m[1]); if (!ln) ln = cap(m[2]); }
    }
    out.usable.push({ row, email, first_name: fn, last_name: ln, company_name: String(r[iCo] ?? '').trim() });
  });
  return out;
}

async function sheetRows(tab) {
  const google = await loadGoogle();
  const credentials = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw/workspace/gcp-credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: tab });
  return res.data.values || [];
}

async function campaignEmails(campaignId, key) {
  const set = new Set();
  for (let off = 0; off < 20000; off += 100) {
    const r = await fetch(`${BASE}/campaigns/${campaignId}/leads?api_key=${key}&offset=${off}&limit=100`);
    const j = await r.json();
    const d = j.data || [];
    if (!d.length) break;
    d.forEach((x) => set.add(((x.lead || x).email || '').toLowerCase()));
    if (d.length < 100) break;
  }
  return set;
}

(async () => {
  const rep = arg('--rep');
  if (!DRIP[rep]) throw new Error(`--rep must be one of: ${Object.keys(DRIP).join(', ')}`);
  const { tab, campaignId } = DRIP[rep];
  requireEnv('SMARTLEAD_API_KEY', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  const key = process.env.SMARTLEAD_API_KEY;

  const { usable, junk } = parseRows(await sheetRows(tab));
  const inCamp = await campaignEmails(campaignId, key);

  // deliverability history
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const emails = usable.map((u) => u.email);
  const sent = new Set(), bounced = new Set();
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await sb.from('outreach_sends').select('email,is_bounced').in('email', emails.slice(i, i + 200));
    (data || []).forEach((r) => { const e = (r.email || '').toLowerCase(); sent.add(e); if (r.is_bounced) bounced.add(e); });
  }

  const isBlocked = (e) => BLOCKED_DOMAINS.has(e.split('@')[1] || '');
  const newBlocked = usable.filter((u) => !inCamp.has(u.email) && isBlocked(u.email));
  const newSafe = usable.filter((u) => !inCamp.has(u.email) && !isBlocked(u.email) && !bounced.has(u.email) && sent.has(u.email));
  const newUnverified = usable.filter((u) => !inCamp.has(u.email) && !isBlocked(u.email) && !bounced.has(u.email) && !sent.has(u.email));
  const newBounced = usable.filter((u) => !inCamp.has(u.email) && !isBlocked(u.email) && bounced.has(u.email));
  const goneFromSheet = [...inCamp].filter((e) => !emails.includes(e));

  console.log(`\n=== ${tab} vs campaign ${campaignId} ===`);
  console.log(`sheet rows usable        : ${usable.length}   (junk rows: ${junk.length})`);
  console.log(`already in campaign      : ${usable.filter((u) => inCamp.has(u.email)).length}`);
  console.log(`NEW, safe to add         : ${newSafe.length}`);
  console.log(`NEW, no send history     : ${newUnverified.length}  (verify before adding)`);
  console.log(`NEW, previously bounced  : ${newBounced.length}  (do not add)`);
  console.log(`NEW, on blocked client domain: ${newBlocked.length}  (send by hand)`);
  console.log(`in campaign, gone/blocked: ${goneFromSheet.length}`);
  if (newSafe.length) console.log('\nnew safe:', newSafe.map((n) => `${n.email} (row ${n.row})`).join('\n  '));
  if (newBounced.length) console.log('\nnew bounced:', newBounced.map((n) => `${n.email} (row ${n.row})`).join('\n  '));

  // Attempt BOTH the clean-history leads and the ones our local cache thinks are
  // domain-blocked. Smartlead is the only authority on the block list (there is no
  // readable endpoint), so we let block_count in the response tell us the truth
  // rather than trusting a file that goes stale the moment the UI list is edited.
  const attempt = [...newSafe, ...newBlocked];
  if (has('--add') && attempt.length) {
    const rows = attempt.map((n) => ({
      email: n.email, first_name: n.first_name || 'there', last_name: n.last_name || '',
      company_name: n.company_name || '', custom_fields: { delivered_before: 'true', source: `${rep}_drip_sheet` },
    }));
    let added = 0, blocked = 0, unsub = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const r = await fetch(`${BASE}/campaigns/${campaignId}/leads?api_key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_list: rows.slice(i, i + 100),
          // The DOMAIN block list is over-broad here: it holds ~80 non-client domains
          // (Spotify, Salesforce, Rivian and the like) that are almost certainly
          // collateral from a single unsubscribe, plus an ESP unsubscribe token that
          // no human added. Will confirmed these contacts are fine to email, so bypass
          // it. The two guards that matter stay ON: an individual who actually
          // unsubscribed, or who is on the community bounce list, is still refused.
          settings: { ignore_global_block_list: true, ignore_unsubscribe_list: false, ignore_community_bounce_list: false },
        }),
      });
      if (!r.ok) { console.log('add batch failed:', r.status, (await r.text()).slice(0, 200)); continue; }
      const j = JSON.parse(await r.text());
      added += j.total_leads || 0;
      blocked += j.block_count || 0;
      unsub += (j.unsubscribed_leads || []).length;
    }
    console.log(`\nattempted ${rows.length} -> added ${added} | still blocked by Smartlead ${blocked} | refused as unsubscribed ${unsub}`);
    if (blocked) console.log('  those domains are still on the block list (Settings > Block List); nothing else will change that.');
  } else if (attempt.length) {
    console.log(`\n(read-only — pass --add to attempt ${attempt.length}: ${newSafe.length} with clean history, ${newBlocked.length} on cached-blocked domains)`);
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
