/**
 * resolve-entities.mjs — LLM-assisted entity resolution. Asks Claude to map
 * cryptic / code / acronym company keys to either an established company or a
 * known real company, and STAGES the proposals in crm_alias_candidates for
 * human confirm on /education. Propose-don't-destroy: never writes crm_companies.
 *
 *   cd /Users/willnewton/Documents/GitHub/calculator6
 *   source ~/.nvm/nvm.sh
 *   export SUPABASE_URL="$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"'"'"' \r\n')" \
 *          SUPABASE_SERVICE_ROLE_KEY="$(netlify env:get SUPABASE_SERVICE_ROLE_KEY | tr -d ' \r\n')" \
 *          ANTHROPIC_API_KEY="$(netlify env:get ANTHROPIC_API_KEY | tr -d ' \r\n')"
 *   node .claude/worktrees/<wt>/scripts/resolve-entities.mjs [--dry]
 */

import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const AK = (process.env.ANTHROPIC_API_KEY || '').trim();
if (!/^https?:\/\//i.test(URL) || !KEY) { console.error('MISSING_ENV: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
if (!AK) { console.error('MISSING_ENV: ANTHROPIC_API_KEY'); process.exit(2); }

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const MODEL = 'claude-sonnet-4-6';

async function readCompanies() {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('crm_companies')
      .select('canonical_key, display_name, aliases, completed_events, total_events, trajectory, is_internal, special_handling')
      .range(f, f + 999);
    if (error) throw new Error(`crm_companies: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// Established = clean anchors Claude can map fragments onto.
const isEstablished = (c) => !c.is_internal && !c.special_handling
  && (c.completed_events >= 5 || c.trajectory === 'expander' || c.trajectory === 'multi_site_flat');

// Ambiguous = cryptic / code / short-acronym / low-signal one-offs worth resolving.
function isAmbiguous(c) {
  if (c.is_internal || c.special_handling) return false;
  const k = c.canonical_key || '';
  if (['bcg', 'wlrk', 'draftkings', 'baxter x br'].includes(k)) return false; // already curated
  if (isEstablished(c)) return false;
  const oneTok = !k.includes(' ');
  const codey = oneTok && (/\d/.test(k) || k.length <= 7);
  const acronymish = oneTok && k.length <= 6 && !/[aeiou]/i.test(k.slice(1));
  return codey || acronymish || (c.completed_events <= 2 && oneTok && k.length <= 10);
}

async function callClaude(established, batch) {
  const sys = `You are an entity-resolution analyst for a corporate-wellness company's CRM.
You are given (1) a list of ESTABLISHED client companies and (2) a list of AMBIGUOUS company keys
(often location codes, abbreviations, or acronyms). For each ambiguous key decide ONE verdict:
- "alias_of_established": it is a fragment/code/abbreviation of one ESTABLISHED company. Give its exact canonical_key.
  (e.g. a "DK" + city code is DraftKings; "WMHD" suffixes are DraftKings internal codes.)
- "known_company": it is a recognizable real company under an acronym/abbreviation NOT in the established list.
  Give the proper full company name (e.g. "WBD" -> "Warner Bros Discovery").
- "standalone": genuinely its own small/unknown company; leave as-is.
Only claim alias/known when reasonably confident. Output STRICT JSON: an array of
{"key","verdict","proposed","confidence","reasoning"} where proposed is the established canonical_key
(alias_of_established) or the full name (known_company) or null (standalone). No prose outside the JSON.`;

  const user = `ESTABLISHED companies (canonical_key — display_name):
${established.map((c) => `${c.canonical_key} — ${c.display_name}`).join('\n')}

AMBIGUOUS keys to resolve (canonical_key | display_name | aliases | completed_events):
${batch.map((c) => `${c.canonical_key} | ${c.display_name} | ${JSON.stringify(c.aliases || []).slice(0, 200)} | ${c.completed_events}`).join('\n')}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': AK, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, temperature: 0, system: sys, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const txt = (data.content || []).map((b) => b.text || '').join('');
  const m = txt.match(/\[[\s\S]*\]/);
  if (!m) throw new Error(`No JSON array in model output: ${txt.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

(async () => {
  log(DRY ? 'DRY RUN — no writes' : 'LIVE RUN');
  const companies = await readCompanies();
  const established = companies.filter(isEstablished);
  const ambiguous = companies.filter(isAmbiguous);
  log(`companies ${companies.length} — established ${established.length}, ambiguous ${ambiguous.length}`);
  if (!ambiguous.length) { log('nothing to resolve'); return; }

  const proposals = [];
  for (let i = 0; i < ambiguous.length; i += 200) {
    const batch = ambiguous.slice(i, i + 200);
    log(`Claude batch ${i / 200 + 1} (${batch.length})...`);
    const out = await callClaude(established, batch);
    proposals.push(...out);
  }

  const byV = {};
  for (const p of proposals) byV[p.verdict] = (byV[p.verdict] || 0) + 1;
  log('================ ENTITY-RESOLUTION PROPOSALS ================');
  log(`verdicts: ${JSON.stringify(byV)}`);
  for (const p of proposals.filter((x) => x.verdict !== 'standalone').slice(0, 25)) {
    log(`  [${p.verdict} ${p.confidence}] "${p.key}" -> "${p.proposed}"  (${String(p.reasoning).slice(0, 80)})`);
  }
  log('============================================================');

  if (!DRY) {
    const rows = proposals
      .filter((p) => p.verdict !== 'standalone' && p.proposed)
      .map((p) => ({
        candidate_type: p.verdict === 'alias_of_established' ? 'llm_alias_of' : 'llm_known_company',
        raw_name: p.key,
        proposed_company_key: String(p.proposed),
        evidence: { verdict: p.verdict, confidence: p.confidence, reasoning: p.reasoning, model: MODEL },
      }));
    for (let i = 0; i < rows.length; i += 300) {
      const { error } = await sb.from('crm_alias_candidates')
        .upsert(rows.slice(i, i + 300), { onConflict: 'candidate_type,raw_name', ignoreDuplicates: true }); // never clobber human decisions
      if (error) throw new Error(`stage candidates: ${error.message}`);
    }
    log(`staged ${rows.length} proposals into crm_alias_candidates (status=pending, for /education)`);
  }
  log('DONE');
})().catch((e) => { console.error('RESOLVE_ERROR:', e.message); process.exit(1); });
