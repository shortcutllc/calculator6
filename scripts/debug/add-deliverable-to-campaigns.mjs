/**
 * One-off: add the BounceBan-deliverable Play B catch-alls to the right live
 * campaign. Eastern non-law → 3557935 (active direct). NY/FL/PA law firms →
 * 3567110 (law draft) with their state's cle_url. Deduped against what's already
 * in each campaign. Only bounceban='deliverable' leads (real-deliverability) are
 * eligible. Dry by default; --confirm uploads.
 *
 *   set -a; source .env; set +a; export SUPABASE_URL=$VITE_SUPABASE_URL
 *   node scripts/debug/add-deliverable-to-campaigns.mjs            # dry
 *   node scripts/debug/add-deliverable-to-campaigns.mjs --confirm  # upload
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { cleanCompany } from '../lib/clean-company.mjs';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const SL = (() => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(/^SMARTLEAD_API_KEY=(.+)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } })();
const CONFIRM = process.argv.includes('--confirm');
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });
const DIRECT = 3557935, LAW = 3567110;
const lc = (s) => String(s || '').toLowerCase();
const log = (...a) => console.log(...a);

const isLaw = (r) => /\blaw\b|legal|\bllp\b|attorney|counsel/i.test(`${r.industry || ''} ${r.company_name || ''}`);
const stateOf = (loc) => { const s = lc(loc); if (/pennsylvania|philadelph|pittsburgh|\bpa\b/.test(s)) return 'PA'; if (/florida|miami|tampa|orlando|fort lauderdale|jacksonville|\bfl\b/.test(s)) return 'FL'; if (/new york|nyc|manhattan|brooklyn|\bny\b/.test(s)) return 'NY'; return null; };
const isEastern = (loc) => { const s = lc(loc); return /new york|nyc|manhattan|brooklyn|\bny\b|miami|fort lauderdale|\bfl\b|florida|boston|cambridge|\bma\b|philadelph|\bpa\b|pennsylvania|washington|\bdc\b/.test(s); };
const cleUrl = (st) => st === 'PA' ? 'https://proposals.getshortcut.co/cle/pa' : st === 'FL' ? 'https://proposals.getshortcut.co/cle/fl' : 'https://proposals.getshortcut.co/cle';

async function readAll(t, c, mod) { const o = []; for (let f = 0; ; f += 1000) { let q = sb.from(t).select(c).range(f, f + 999); if (mod) q = mod(q); const { data, error } = await q; if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break; } return o; }
async function campaignEmails(id) { const set = new Set(); let off = 0; for (;;) { const r = await fetch(`https://server.smartlead.ai/api/v1/campaigns/${id}/leads?api_key=${SL}&offset=${off}&limit=100`); const j = await r.json().catch(() => ({})); const a = j.data || []; for (const L of a) { const e = lc(L.lead?.email); if (e) set.add(e); } if (a.length < 100) break; off += 100; if (off > 3000) break; } return set; }
const toRow = (r, extra = {}) => { const [first, ...rest] = String(r.contact_name || '').trim().split(/\s+/); return { email: r.contact_email, first_name: first || '', last_name: rest.join(' '), company_name: cleanCompany(r.company_name) || '', custom_fields: { source: 'playb-bounceban-recovered', bb: 'deliverable', ...extra } }; };

(async () => {
  log(CONFIRM ? 'ADD TO CAMPAIGNS — LIVE' : 'ADD TO CAMPAIGNS — dry run');
  const deliverable = new Set((await readAll('outreach_contacts', 'email', (q) => q.eq('bounceban_status', 'deliverable'))).map((c) => lc(c.email)));
  const pb = await readAll('crm_play_b', 'contact_email, contact_name, company_name, industry, contact_location');
  const cand = pb.filter((r) => r.contact_email && deliverable.has(lc(r.contact_email)));

  const directRows = [], lawRows = [], skipped = { nonEasternDirect: 0, nonNyFlPaLaw: 0 };
  for (const r of cand) {
    if (isLaw(r)) { const st = stateOf(r.contact_location); if (!st) { skipped.nonNyFlPaLaw += 1; continue; } lawRows.push(toRow(r, { cle_url: cleUrl(st) })); }
    else if (isEastern(r.contact_location)) directRows.push(toRow(r));
    else skipped.nonEasternDirect += 1;
  }
  log(`deliverable Play B candidates: ${cand.length}`);
  log(`  → eastern direct (to ${DIRECT}): ${directRows.length}`);
  log(`  → NY/FL/PA law (to ${LAW}): ${lawRows.length}`);
  log(`  skipped: ${skipped.nonEasternDirect} non-eastern direct, ${skipped.nonNyFlPaLaw} law outside NY/FL/PA`);

  // dedup against each campaign's current leads
  const inDirect = await campaignEmails(DIRECT);
  const inLaw = await campaignEmails(LAW);
  const dRows = directRows.filter((r) => !inDirect.has(lc(r.email)));
  const lRows = lawRows.filter((r) => !inLaw.has(lc(r.email)));
  log(`  after dedup vs existing campaign leads → direct: ${dRows.length} new, law: ${lRows.length} new`);
  log(`  sample direct: ${dRows.slice(0, 3).map((r) => r.email).join(', ')}`);
  log(`  sample law: ${lRows.slice(0, 3).map((r) => `${r.email}(${r.custom_fields.cle_url.split('/cle')[1] || '/cle'})`).join(', ')}`);

  if (!CONFIRM) { log('\nDRY RUN — re-run with --confirm to upload.'); return; }

  const upload = async (id, rows) => { let n = 0; for (let i = 0; i < rows.length; i += 100) { const r = await fetch(`https://server.smartlead.ai/api/v1/campaigns/${id}/leads?api_key=${SL}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_list: rows.slice(i, i + 100) }) }); const j = await r.json().catch(() => ({})); n += (j.upload_count ?? Math.min(100, rows.length - i)); } return n; };
  const dAdded = await upload(DIRECT, dRows);
  const lAdded = await upload(LAW, lRows);
  log(`\nDONE — added ${dAdded} to direct ${DIRECT}, ${lAdded} to law ${LAW}.`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
