// Seed crm_target_firms from broker_outreach_playbook.md.
// Tier 1/2/3 brokers + 3 carriers. Priority rank by NYC presence + ICP fit.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const FIRMS = [
  // ---- Tier 1 brokers (slow but big — F500/F1000) ----
  { id: 'mercer', name: 'Mercer (Marsh McLennan)',     tier: 'tier_1', track: 'broker', domain: 'mercer.com',         nyc: '1166 6th Ave', why: 'Industry $190M EB revenue, F500/mid-market' },
  { id: 'mma',    name: 'Marsh McLennan Agency (MMA)', tier: 'tier_1', track: 'broker', domain: 'mma-corp.com',       nyc: '1166 6th Ave', why: '100-5K EE mid-market arm of Marsh McLennan' },
  { id: 'aon',    name: 'Aon',                          tier: 'tier_1', track: 'broker', domain: 'aon.com',            nyc: '199 Water St', why: 'F1000+mid-market, Aon Wellbeing platform' },
  { id: 'gallagher', name: 'Arthur J. Gallagher',       tier: 'tier_1', track: 'broker', domain: 'ajg.com',            nyc: '2 WTC',        why: 'Gallagher Better Works, $159M EB revenue, 50-10K EE' },
  { id: 'wtw',    name: 'WTW (Willis Towers Watson)',   tier: 'tier_1', track: 'broker', domain: 'wtwco.com',          nyc: '200 Liberty St', why: 'F500 health & benefits consulting' },
  { id: 'lockton', name: 'Lockton',                     tier: 'tier_1', track: 'broker', domain: 'lockton.com',        nyc: '48th & Lex',   why: 'Private, premium EB, producer-led culture, 250-10K EE' },
  { id: 'usi',    name: 'USI Insurance Services',       tier: 'tier_1', track: 'broker', domain: 'usi.com',            nyc: 'Valhalla NY HQ', why: 'NY-headquartered, strong mid-market EB, 100-2.5K EE' },
  { id: 'hub',    name: 'HUB International',            tier: 'tier_1', track: 'broker', domain: 'hubinternational.com', nyc: '55 Water St (NE HQ)', why: 'Decentralized regional, 50-2.5K EE' },
  { id: 'alliant', name: 'Alliant',                     tier: 'tier_1', track: 'broker', domain: 'alliant.com',        nyc: '1301 6th Ave', why: 'Growing EB practice, strong in tech/media' },

  // ---- Tier 2 brokers (sweet spot — mid-market, faster cycles) ----
  { id: 'onedigital',         name: 'OneDigital',                   tier: 'tier_2', track: 'broker', domain: 'onedigital.com',         nyc: 'NYC + regional', why: '3K advisors, 85K employer clients, OneDigital Wellbeing bundle' },
  { id: 'nfp',                name: 'NFP (Aon-owned)',              tier: 'tier_2', track: 'broker', domain: 'nfp.com',                nyc: '340 Madison',    why: 'NFP PeopleFirst, mid-market 100-2.5K EE, NYC HQ' },
  { id: 'epic',               name: 'EPIC Insurance Brokers',       tier: 'tier_2', track: 'broker', domain: 'epicbrokers.com',        nyc: 'Madison Ave',    why: 'Explicit Wellbeing & Health Management practice' },
  { id: 'risk-strategies',    name: 'Risk Strategies',              tier: 'tier_2', track: 'broker', domain: 'risk-strategies.com',    nyc: 'NYC office',     why: 'Specialty practices incl. healthcare' },
  { id: 'corporate-synergies', name: 'Corporate Synergies',         tier: 'tier_2', track: 'broker', domain: 'corpsyn.com',            nyc: 'Mt. Laurel NJ',  why: 'NJ-tristate native, strong wellness focus — SWEET SPOT' },
  { id: 'holmes-murphy',      name: 'Holmes Murphy',                tier: 'tier_2', track: 'broker', domain: 'holmesmurphy.com',       nyc: 'Multi-office',   why: 'Wellness-strong culture' },
  { id: 'ima',                name: 'IMA Financial',                tier: 'tier_2', track: 'broker', domain: 'imacorp.com',            nyc: 'Multi-office',   why: 'Employee-owned, wellness-forward' },
  { id: 'hilb',               name: 'Hilb Group',                   tier: 'tier_2', track: 'broker', domain: 'hilbgroup.com',          nyc: 'Mid-Atlantic',   why: 'PE-backed mid-Atlantic' },
  { id: 'alera',              name: 'Alera Group',                  tier: 'tier_2', track: 'broker', domain: 'aleragroup.com',         nyc: 'Federation',     why: 'Federation of regional firms' },

  // ---- Tier 3 brokers (modern/tech — warmest reception) ----
  { id: 'sequoia',           name: 'Sequoia Consulting',         tier: 'tier_3', track: 'broker', domain: 'sequoia.com',          nyc: 'SF + NYC',  why: 'Tech-startup broker. Clients: Stripe/Airbnb/Brex. Direct ICP overlap' },
  { id: 'newfront',          name: 'Newfront',                   tier: 'tier_3', track: 'broker', domain: 'newfront.com',         nyc: 'SF + NYC',  why: 'AI-enabled modern broker, tech/life sciences ICP' },
  { id: 'nava-benefits',     name: 'Nava Benefits',              tier: 'tier_3', track: 'broker', domain: 'navabenefits.com',     nyc: 'NYC',       why: 'Fintech/SaaS-adjacent' },
  { id: 'woodruff-sawyer',   name: 'Woodruff Sawyer',            tier: 'tier_3', track: 'broker', domain: 'woodruffsawyer.com',   nyc: 'SF + NYC',  why: 'Tech/PE-heavy' },
  { id: 'patriot-growth',    name: 'Patriot Growth Insurance',   tier: 'tier_3', track: 'broker', domain: 'patriotgi.com',        nyc: 'Roll-up',   why: 'Roll-up of regionals' },
  { id: 'savoy',             name: 'Savoy Associates',           tier: 'tier_3', track: 'broker', domain: 'savoyassociates.com',  nyc: 'Florham Park NJ', why: 'NJ regional mid-market' },
  { id: 'cross-insurance',   name: 'Cross Insurance',            tier: 'tier_3', track: 'broker', domain: 'crossagency.com',      nyc: 'CT corridor', why: 'CT/NY corridor' },

  // ---- Carriers (HEC stealth track) ----
  { id: 'cigna',  name: 'Cigna',  tier: 'carrier', track: 'carrier_hec', domain: 'cigna.com',  nyc: 'Tri-state HECs',  why: 'Cigna HIF — Health Engagement Consultants manage wellness fund' },
  { id: 'aetna',  name: 'Aetna',  tier: 'carrier', track: 'carrier_hec', domain: 'aetna.com',  nyc: 'Tri-state DCs',   why: 'Aetna Wellness Allowance — Designated Consultants manage it' },
  { id: 'anthem', name: 'Anthem (Elevance)', tier: 'carrier', track: 'carrier_hec', domain: 'anthem.com', nyc: 'Tri-state', why: 'Anthem Wellness Fund — Wellness Consultants' },
];

// Priority rank: Tier 2 sweet spot (rank 1-9), Tier 3 modern (rank 10-16),
// carriers (17-19), Tier 1 mega (20-28). Pulls "ratio of warm × responsive ×
// mid-market" per the broker-plan, not just firm size.
const RANK_ORDER = ['tier_2', 'tier_3', 'carrier', 'tier_1'];
const rows = [];
let rank = 0;
for (const t of RANK_ORDER) {
  for (const f of FIRMS.filter((x) => x.tier === t)) {
    rank += 1;
    rows.push({
      id: f.id,
      display_name: f.name,
      tier: f.tier,
      track: f.track,
      domain: f.domain,
      nyc_presence: f.nyc,
      why: f.why,
      priority_rank: rank,
    });
  }
}

console.log(`Seeding ${rows.length} firms…`);
const { error } = await sb.from('crm_target_firms')
  .upsert(rows, { onConflict: 'id' });
if (error) { console.error('upsert failed:', error.message); process.exit(1); }

const { data } = await sb.from('crm_target_firms')
  .select('priority_rank, tier, track, display_name')
  .order('priority_rank');
console.table(data);
