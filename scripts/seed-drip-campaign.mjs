#!/usr/bin/env node
/**
 * seed-drip-campaign.mjs — create a rep's drip campaign and load their leads
 * from the "<Rep>'s Drip" tab of the Shortcut Event Sales Pipeline sheet.
 *
 * Campaigns are created PAUSED (status 'draft'). Nothing sends until you flip
 * status to 'active', and even then the runner will refuse without an
 * unsubscribe URL and a postal address.
 *
 *   node scripts/seed-drip-campaign.mjs --rep jaimie            # dry run
 *   node scripts/seed-drip-campaign.mjs --rep jaimie --apply
 *   node scripts/seed-drip-campaign.mjs --all --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './lib/load-env.mjs';

async function loadGoogle() {
  try { return (await import('googleapis')).google; } catch {
    const p = path.join(process.env.HOME, '.openclaw/workspace/node_modules/googleapis/build/src/index.js');
    return (await import(pathToFileURL(p).href)).google;
  }
}

const SHEET_ID = '1ibymeeghZVJGOskDn76GtR6kt3CCIPt-93RLdnAvkiY';
const UNSUB_URL = 'https://proposals.getshortcut.co/.netlify/functions/drip-unsubscribe';
// CAN-SPAM requires a valid physical postal address on commercial email.
const POSTAL = process.env.DRIP_POSTAL_ADDRESS || 'Shortcut Mobile, Inc., 220 W Rittenhouse Square 3E, Philadelphia, PA 19103';

const REPS = {
  jaimie: { tab: "Jaimie's Drip", email: 'jaimie@getshortcut.co', sign_off: 'Jaimie' },
  caren:  { tab: "Caren's Drip",  email: 'caren@getshortcut.co',  sign_off: 'Caren'  },
  marc:   { tab: "Marc's Drip",   email: 'marc@getshortcut.co',   sign_off: 'Marc'   },
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PLACEHOLDER = /no-email\.placeholder|example\.(com|org)|^test@/i;
const ROLE = /^(info|sales|hello|contact|admin|support|office|team|hr|careers|jobs|billing|accounts?|help|marketing|noreply|no-reply)([._-]|@)/i;
const MACHINE = /@(unsubscribe|bounce|reply|mailer)[.-]|@.*\.(customer\.io|sendgrid\.net|mailgun\.org)$|^[a-z0-9]{24,}@/i;

const arg = (f, d = null) => { const i = process.argv.indexOf(f); return i > -1 ? (process.argv[i + 1] ?? true) : d; };
const has = (f) => process.argv.includes(f);
const lc = (s) => String(s || '').trim().toLowerCase();
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

async function sheetLeads(tab) {
  const google = await loadGoogle();
  const credentials = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw/workspace/gcp-credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  const rows = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: tab })).data.values || [];
  const h = (rows[0] || []).map((x) => lc(x));
  const [iCo, iFn, iLn, iEm] = [h.indexOf('company name'), h.indexOf('client name'), h.indexOf('client last name'), h.indexOf('email')];
  const seen = new Set();
  const out = { leads: [], junk: 0 };
  rows.slice(1).forEach((r) => {
    const email = lc(r[iEm]);
    if (!email || !EMAIL_RE.test(email) || PLACEHOLDER.test(email) || ROLE.test(email) || MACHINE.test(email) || seen.has(email)) {
      if (email) out.junk++;
      return;
    }
    seen.add(email);
    let fn = String(r[iFn] ?? '').trim(); let ln = String(r[iLn] ?? '').trim();
    if (!ln && fn.includes(' ')) { const p = fn.split(/\s+/); fn = p.shift(); ln = p.join(' '); }
    if (!fn) {
      const m = email.split('@')[0].match(/^([a-z]{2,})[._-]([a-z]{2,})$/i);
      if (m) { fn = cap(m[1]); if (!ln) ln = cap(m[2]); }
    }
    out.leads.push({ email, first_name: fn, last_name: ln, company_name: String(r[iCo] ?? '').trim() });
  });
  return out;
}

/**
 * Resolve a verified last service per company. ONLY crm_companies rows with a
 * completed event qualify: a row in `proposals` means we sent a quote, not that
 * we were ever on site, so it cannot support "since we were in for X".
 * Returns a Map of normalized company key -> { service, lastEventAt }.
 */
async function lastServiceIndex(sb) {
  const norm = (x) => String(x || '').toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|the|group|holdings)\b/g, '').replace(/[^a-z0-9]/g, '');
  const { data } = await sb.from('crm_companies')
    .select('display_name,canonical_key,aliases,service_titles,last_event_at,completed_events')
    .gt('completed_events', 0).limit(10000);
  const idx = new Map();
  for (const c of data || []) {
    const titles = Array.isArray(c.service_titles) ? c.service_titles : [];
    if (!titles.length) continue;
    // first title is the anchor service; lowercased so it reads mid-sentence
    const service = String(titles[0]).toLowerCase();
    const entry = { service, lastEventAt: c.last_event_at };
    for (const k of [c.display_name, c.canonical_key, ...(Array.isArray(c.aliases) ? c.aliases : [])]) {
      const n = norm(k);
      if (n) idx.set(n, entry);
    }
  }
  idx.norm = norm;
  return idx;
}

(async () => {
  requireEnv('VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  const apply = has('--apply');
  const reps = has('--all') ? Object.keys(REPS) : [arg('--rep')].filter(Boolean);
  if (!reps.length) throw new Error('pass --rep <marc|caren|jaimie> or --all');

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const svcIdx = await lastServiceIndex(sb);

  // one suppression read for all reps
  const supp = new Set();
  { const { data } = await sb.from('crm_suppression').select('email').limit(50000); (data || []).forEach((x) => supp.add(lc(x.email))); }

  for (const rep of reps) {
    const cfg = REPS[rep];
    if (!cfg) throw new Error(`unknown rep ${rep}`);
    const { leads, junk } = await sheetLeads(cfg.tab);

    // never seed anyone who has bounced before, or who is suppressed anywhere
    const emails = leads.map((l) => l.email);
    const bounced = new Set();
    for (let i = 0; i < emails.length; i += 200) {
      const { data } = await sb.from('outreach_sends').select('email,is_bounced').in('email', emails.slice(i, i + 200));
      (data || []).forEach((r) => { if (r.is_bounced) bounced.add(lc(r.email)); });
    }
    const clean = leads.filter((l) => !supp.has(l.email) && !bounced.has(l.email));

    console.log(`\n${rep}: sheet ${leads.length} usable (${junk} junk) -> ${clean.length} seedable`
      + `  [${leads.length - clean.length} removed: ${[...bounced].length} bounced, suppressed excluded]`);

    if (!apply) { console.log('  dry run — nothing written'); continue; }

    const slug = `${rep}-fall-nurture-2026`;
    const { data: camp, error: ce } = await sb.from('drip_campaigns').upsert({
      slug,
      name: `${cfg.sign_off} Fall Nurture 2026`,
      rep_email: cfg.email,
      status: 'draft',           // never auto-activate
      daily_cap: 40, ramp_start: 10, ramp_step: 5,
      send_days: [1, 2, 3, 4, 5], send_start_hour: 9, send_end_hour: 16,
      timezone: 'America/New_York',
      unsubscribe_url: UNSUB_URL,
      postal_address: POSTAL,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' }).select().single();
    if (ce) throw new Error(`campaign upsert: ${ce.message}`);

    let withService = 0;
    for (let i = 0; i < clean.length; i += 500) {
      const batch = clean.slice(i, i + 500).map((l) => {
        const hit = svcIdx.get(svcIdx.norm(l.company_name))
          || svcIdx.get(svcIdx.norm(l.email.split('@')[1].split('.')[0]));
        const cf = { source: `${rep}_drip_sheet` };
        if (hit) { cf.last_service = hit.service; cf.last_event_at = hit.lastEventAt; withService++; }
        return {
          campaign_id: camp.id, email: l.email, first_name: l.first_name, last_name: l.last_name,
          company_name: l.company_name, custom_fields: cf,
        };
      });
      const { error } = await sb.from('drip_leads').upsert(batch, { onConflict: 'campaign_id,email', ignoreDuplicates: true });
      if (error) throw new Error(`lead upsert: ${error.message}`);
    }
    const { count } = await sb.from('drip_leads').select('*', { count: 'exact', head: true }).eq('campaign_id', camp.id);
    console.log(`  campaign ${slug} (${camp.id}) status=draft, ${count} leads loaded`);
    console.log(`  ${withService} have a VERIFIED last service (booked variant); ${clean.length - withService} get the "last spoke" variant`);
  }
  console.log(apply ? '\nSeeded. Campaigns are DRAFT — flip status to active to start sending.' : '\nDry run complete.');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
