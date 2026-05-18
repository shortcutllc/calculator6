/**
 * ingest-outreach-corpus.mjs — Track B. Reads the openclaw cold-outreach
 * corpus (Smartlead cache + positive_responders + Sheet CRM) into Supabase
 * and joins contacts to the CRM graph. Idempotent. Read-only on openclaw.
 *
 *   cd /Users/willnewton/Documents/GitHub/calculator6
 *   source ~/.nvm/nvm.sh
 *   export SUPABASE_URL="$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"'"'"' \r\n')" \
 *          SUPABASE_SERVICE_ROLE_KEY="$(netlify env:get SUPABASE_SERVICE_ROLE_KEY | tr -d ' \r\n')"
 *   node .claude/worktrees/<wt>/scripts/ingest-outreach-corpus.mjs [--dry]
 *
 * Sheet step reuses openclaw's googleapis + gcp-credentials.json. If that
 * dep/cred is missing it warns and continues with the JSON sources only.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const SHEET_ID = '1QMCCcL9DQTB-t57Uop0qgKZi_DCV6IsoLtJGs0hxCx4';

const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);
const emailDomain = (e) => { const m = lc(e)?.match(/@([^@\s]+)$/); return m ? m[1].replace(/^www\./, '') : null; };
const normCo = (s) => (!s ? null : String(s).toLowerCase().replace(/[.,]/g, ' ')
  .replace(/\b(inc|llc|l l c|corp|corporation|co|company|ltd|limited|the)\b/g, ' ')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() || null);
const tsv = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

// ---------- contact accumulator (merge precedence: sheet > positives > cache) ----------
const contacts = new Map(); // email -> record
function mergeContact(email, fields, sourceTag, rank) {
  const k = lc(email);
  if (!k || !k.includes('@')) return null;
  const cur = contacts.get(k) || { email: k, _rank: -1, source: '' };
  for (const [f, v] of Object.entries(fields)) {
    if (v == null || v === '') continue;
    if (cur[f] == null || rank > cur._rank) cur[f] = v;
  }
  cur._rank = Math.max(cur._rank, rank);
  cur.source = cur.source ? `${cur.source},${sourceTag}` : sourceTag;
  contacts.set(k, cur);
  return k;
}

const campaigns = new Map();
const sends = new Map();   // email|campaign -> row
const replies = new Map(); // email|campaign|src -> row

function addSend(email, cid, sent, reply, bounced) {
  const k = `${lc(email)}|${cid || ''}`;
  if (sends.has(k)) return;
  sends.set(k, { email: lc(email), campaign_id: cid || null, sent_time: tsv(sent), reply_time: tsv(reply), is_bounced: !!bounced });
}
function addReply(email, cid, date, content, sentiment, ooo, manualCat, src) {
  const s = sentiment && lc(sentiment) !== 'unknown' ? lc(sentiment) : null;
  const k = `${lc(email)}|${cid || ''}|${src}`;
  replies.set(k, {
    email: lc(email), campaign_id: cid || null, reply_date: tsv(date),
    reply_content: content || null, reply_sentiment: s, is_ooo: ooo == null ? null : !!ooo,
    manual_category: manualCat || null, sentiment_source: src,
  });
}

// ---------- 1. smartlead_cache.json ----------
function ingestCache() {
  const j = JSON.parse(readFileSync(`${OPENCLAW}/smartlead_cache.json`, 'utf8'));
  for (const [cid, c] of Object.entries(j.campaigns_processed || {})) {
    campaigns.set(String(cid), { campaign_id: String(cid), name: c.name || null, status: c.status || null, leads: c.leads ?? null, src_updated_at: tsv(c.updated_at) });
  }
  let n = 0;
  for (const [email, L] of Object.entries(j.leads || {})) {
    mergeContact(email, { name: L.lead_name, first_seen: tsv(L.sent_time) }, 'cache', 0);
    addSend(email, String(L.campaign_id ?? ''), L.sent_time, L.reply_time, L.is_bounced);
    if (L.reply_sentiment !== undefined || L.reply_content !== undefined) {
      addReply(email, String(L.campaign_id ?? ''), L.reply_time, L.reply_content, L.reply_sentiment, L.is_ooo, null, 'automated');
    }
    n += 1;
  }
  log(`cache: ${campaigns.size} campaigns, ${n} leads`);
}

// ---------- 2. positive_responders.json ----------
function ingestPositives() {
  const arr = JSON.parse(readFileSync(`${OPENCLAW}/positive_responders.json`, 'utf8'));
  for (const r of arr) {
    mergeContact(r.email, { name: r.name, title: r.job_title, company: r.company }, 'positives', 1);
    addReply(r.email, '', r.reply_time, r.reply_content,
      r.manual_category ? null : 'positive', null, r.manual_category || null,
      /manual/i.test(r.source || '') ? 'manual' : 'automated');
  }
  log(`positive_responders: ${arr.length}`);
}

// ---------- 3. Google Sheet (richest per-lead title + firmographics) ----------
async function ingestSheet() {
  let google;
  try { ({ google } = createRequire(`${OPENCLAW}/`)('googleapis')); }
  catch { log('WARN: googleapis not resolvable from openclaw — skipping Sheet (JSON sources still ingested)'); return; }
  let creds;
  try { creds = JSON.parse(readFileSync(`${OPENCLAW}/gcp-credentials.json`, 'utf8')); }
  catch { log('WARN: gcp-credentials.json missing — skipping Sheet'); return; }

  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabs = meta.data.sheets.map((s) => s.properties.title);
  let rows = 0;
  for (const tab of tabs) {
    let res;
    try { res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!A1:S5000` }); }
    catch { continue; }
    const vals = res.data.values || [];
    if (vals.length < 2) continue;
    const hdr = vals[0].map((h) => String(h || '').trim().toLowerCase());
    const col = (names) => { for (const n of names) { const i = hdr.indexOf(n); if (i >= 0) return i; } return -1; };
    const cE = col(['email']);
    const cT = col(['title', 'job title']);
    if (cE < 0 || cT < 0) continue; // not a lead tab
    const cN = col(['name']); const cCo = col(['company']); const cHc = col(['company headcount', 'headcount']);
    const cLoc = col(['location']); const cInd = col(['industry']); const cLi = col(['linkedin url', 'linkedin']);
    const cYr = col(['years in role']); const cEs = col(['email status (apollo)', 'email status']);
    const cMv = col(['millionverifier']); const cStg = col(['stage']);
    for (let i = 1; i < vals.length; i += 1) {
      const r = vals[i]; const email = r[cE];
      if (!email || !String(email).includes('@')) continue;
      mergeContact(email, {
        name: cN >= 0 ? r[cN] : null, title: r[cT], company: cCo >= 0 ? r[cCo] : null,
        headcount: cHc >= 0 ? r[cHc] : null, location: cLoc >= 0 ? r[cLoc] : null,
        industry: cInd >= 0 ? r[cInd] : null, linkedin_url: cLi >= 0 ? r[cLi] : null,
        years_in_role: cYr >= 0 ? r[cYr] : null,
        email_status: [cEs >= 0 ? r[cEs] : '', cMv >= 0 ? r[cMv] : ''].filter(Boolean).join(' / ') || null,
        stage: cStg >= 0 ? r[cStg] : null,
      }, `sheet:${tab}`, 2);
      rows += 1;
    }
  }
  log(`sheet: ${tabs.length} tabs scanned, ${rows} lead rows merged`);
}

// ---------- 4. join contacts -> crm_companies ----------
async function linkCompanies() {
  const domainMap = new Map();
  const nameMap = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('crm_companies').select('id, canonical_key, contact_domains').range(from, from + 999);
    if (error) throw new Error(`crm_companies: ${error.message}`);
    for (const c of data) {
      if (c.canonical_key && !nameMap.has(c.canonical_key)) nameMap.set(c.canonical_key, c.id);
      for (const d of c.contact_domains || []) {
        const dd = String(d).toLowerCase().replace(/^www\./, '');
        if (!domainMap.has(dd)) domainMap.set(dd, c.id); else domainMap.set(dd, 'AMBIG');
      }
    }
    if (data.length < 1000) break;
  }
  for (const c of contacts.values()) {
    c.email_domain = emailDomain(c.email);
    c.normalized_company = normCo(c.company);
    const dm = c.email_domain ? domainMap.get(c.email_domain) : null;
    if (dm && dm !== 'AMBIG') { c.crm_company_id = dm; c.company_match_method = 'domain'; c.company_match_confidence = 0.9; }
    else if (c.normalized_company && nameMap.has(c.normalized_company)) { c.crm_company_id = nameMap.get(c.normalized_company); c.company_match_method = 'name'; c.company_match_confidence = 0.7; }
    else { c.crm_company_id = null; c.company_match_method = 'none'; c.company_match_confidence = 0; }
  }
}

async function upsert(table, rows, conflict) {
  const SIZE = 300;
  for (let i = 0; i < rows.length; i += SIZE) {
    const batch = rows.slice(i, i + SIZE);
    let attempt = 0;
    for (;;) {
      try {
        const { error } = await sb.from(table).upsert(batch, { onConflict: conflict, ignoreDuplicates: false });
        if (error) throw new Error(error.message);
        break;
      } catch (e) {
        attempt += 1;
        if (attempt > 4) throw new Error(`upsert ${table} failed after ${attempt} attempts: ${e.message}`);
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); // backoff on transient fetch failures
      }
    }
    log(`  ${table}: ${Math.min(i + SIZE, rows.length)}/${rows.length}`);
  }
}

function report() {
  const all = [...contacts.values()];
  const withTitle = all.filter((c) => c.title);
  const linked = all.filter((c) => c.crm_company_id);
  const sentDist = {};
  for (const r of replies.values()) sentDist[r.reply_sentiment || 'null'] = (sentDist[r.reply_sentiment || 'null'] || 0) + 1;
  // title-category sanity-check vs the openclaw ICP (Office Mgr / HR-People should dominate positives)
  const cat = (t) => {
    const s = (t || '').toLowerCase();
    if (/hr|people|talent|human resources/.test(s)) return 'HR/People';
    if (/office (manager|coordinator|admin)/.test(s)) return 'OfficeMgr';
    if (/employee experience|ee /.test(s)) return 'EmployeeExp';
    if (/workplace/.test(s)) return 'Workplace';
    if (/facilit/.test(s)) return 'Facilities';
    if (/event/.test(s)) return 'Events';
    return t ? 'Other' : 'NoTitle';
  };
  const posEmails = new Set([...replies.values()].filter((r) => r.reply_sentiment === 'positive').map((r) => r.email));
  const posCat = {};
  for (const c of all) if (posEmails.has(c.email)) { const k = cat(c.title); posCat[k] = (posCat[k] || 0) + 1; }
  log('================ OUTREACH CORPUS REPORT ================');
  log(`Contacts: ${all.length}  (with title: ${withTitle.length}, ${((withTitle.length / all.length) * 100).toFixed(1)}%)`);
  log(`Campaigns: ${campaigns.size}   Sends: ${sends.size}   Replies: ${replies.size}`);
  log(`Linked to crm_companies: ${linked.length} (${((linked.length / all.length) * 100).toFixed(1)}%)  [domain ${all.filter((c) => c.company_match_method === 'domain').length} / name ${all.filter((c) => c.company_match_method === 'name').length}]`);
  log(`Reply sentiment: ${JSON.stringify(sentDist)}`);
  log(`Positive responders by title category (validate vs ICP — OfficeMgr/HR should lead): ${JSON.stringify(posCat)}`);
  log('=======================================================');
}

(async () => {
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN');
  ingestCache();
  ingestPositives();
  await ingestSheet();
  await linkCompanies();

  if (!DRY) {
    await upsert('outreach_campaigns', [...campaigns.values()], 'campaign_id');
    const crows = [...contacts.values()].map(({ _rank, ...r }) => r);
    await upsert('outreach_contacts', crows, 'email');
    await upsert('outreach_sends', [...sends.values()], 'email,campaign_id');
    await upsert('outreach_replies', [...replies.values()], 'email,campaign_id,sentiment_source');
  }
  report();
  log('DONE');
})().catch((e) => { console.error('INGEST_ERROR:', e.message); process.exit(1); });
