// Seed crm_target_firms with the Top 30 brokers + 3 carriers from
// memory/broker_outreach_playbook.md. Idempotent — upserts by display_name.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Per playbook: track=broker|carrier_hec. priority_rank lower = higher priority.
// First 10 are the "start here" set. Tier 1 mega-brokers ranked lower per
// "Tier 2 = sweet spot" in playbook.
const FIRMS = [
  // ====================== Track A: Brokers ======================
  // Tier 2 — Mid-Market (sweet spot — start here)
  { display_name: 'OneDigital', tier: 'tier_2', track: 'broker', priority_rank: 1, nyc_presence: 'Atlanta HQ', why: '3K advisors · 85K employer clients · OneDigital Wellbeing bundle · mid-market 100-2.5K EE' },
  { display_name: 'NFP', tier: 'tier_2', track: 'broker', priority_rank: 2, nyc_presence: '340 Madison', why: 'Aon-owned · NFP PeopleFirst · mid-market 100-2.5K EE · M&A wellness practice gaps' },
  { display_name: 'EPIC Insurance Brokers', tier: 'tier_2', track: 'broker', priority_rank: 3, nyc_presence: 'Madison Ave (formerly Frenkel)', why: 'Explicit Wellbeing & Health Management practice' },
  { display_name: 'Corporate Synergies', tier: 'tier_2', track: 'broker', priority_rank: 4, nyc_presence: 'Mt. Laurel NJ', why: 'NJ-tristate native · strong wellness focus · sweet spot for Shortcut' },
  { display_name: 'Holmes Murphy', tier: 'tier_2', track: 'broker', priority_rank: 5, nyc_presence: 'Des Moines IA', why: 'Wellness-strong culture' },
  { display_name: 'IMA Financial', tier: 'tier_2', track: 'broker', priority_rank: 6, nyc_presence: 'Denver', why: 'Employee-owned · wellness-forward' },
  { display_name: 'Risk Strategies', tier: 'tier_2', track: 'broker', priority_rank: 7, nyc_presence: 'Boston', why: 'Specialty practices incl. healthcare' },
  { display_name: 'World Insurance Associates', tier: 'tier_2', track: 'broker', priority_rank: 8, nyc_presence: 'Iselin NJ', why: 'Heavy NJ/PA presence' },
  { display_name: 'Hilb Group', tier: 'tier_2', track: 'broker', priority_rank: 9, nyc_presence: 'Richmond VA', why: 'PE-backed mid-Atlantic' },
  { display_name: 'Higginbotham', tier: 'tier_2', track: 'broker', priority_rank: 10, nyc_presence: 'Fort Worth TX', why: 'Fast-growing TX/SE' },
  { display_name: 'Cottingham & Butler', tier: 'tier_2', track: 'broker', priority_rank: 11, nyc_presence: 'Dubuque IA', why: 'Large private · Midwest mid-market' },
  { display_name: 'Alera Group', tier: 'tier_2', track: 'broker', priority_rank: 12, nyc_presence: 'Federation', why: 'Federation of regional firms' },

  // Tier 3 — Modern/Tech (warmest reception, VC-backed startup overlap)
  { display_name: 'Sequoia Consulting', tier: 'tier_3', track: 'broker', priority_rank: 13, nyc_presence: 'SF · NYC office', why: 'Tech-startup-benefits broker · Stripe Airbnb Brex · Series B+ tech ICP overlaps Shortcut book' },
  { display_name: 'Newfront', tier: 'tier_3', track: 'broker', priority_rank: 14, nyc_presence: 'SF · NYC', why: 'AI-enabled modern broker · tech/life sciences ICP' },
  { display_name: 'Nava Benefits', tier: 'tier_3', track: 'broker', priority_rank: 15, nyc_presence: 'NYC', why: 'Fintech/SaaS-adjacent' },
  { display_name: 'Woodruff Sawyer', tier: 'tier_3', track: 'broker', priority_rank: 16, nyc_presence: 'SF · NYC', why: 'Tech/PE-heavy' },
  { display_name: 'Patriot Growth Insurance', tier: 'tier_3', track: 'broker', priority_rank: 17, nyc_presence: 'PE roll-up', why: 'Roll-up of regionals · wellness gaps to fill' },
  { display_name: 'Savoy Associates', tier: 'tier_3', track: 'broker', priority_rank: 18, nyc_presence: 'Florham Park NJ', why: 'NJ regional mid-market' },
  { display_name: 'Cross Insurance', tier: 'tier_3', track: 'broker', priority_rank: 19, nyc_presence: 'CT', why: 'CT/NY corridor' },

  // Tier 1 — National Mega (slow but big)
  { display_name: 'Marsh McLennan (Mercer + MMA)', tier: 'tier_1', track: 'broker', priority_rank: 20, nyc_presence: '1166 6th Ave', why: 'Mercer $190M EB revenue · MMA 100-5K EE' },
  { display_name: 'Aon', tier: 'tier_1', track: 'broker', priority_rank: 21, nyc_presence: '199 Water St', why: 'F1000 + mid-market · Aon Wellbeing · acquired NFP Apr 2024' },
  { display_name: 'Arthur J. Gallagher', tier: 'tier_1', track: 'broker', priority_rank: 22, nyc_presence: '2 WTC', why: '50-10K EE · Gallagher Better Works · $159M EB revenue · acquired AssuredPartners Aug 2025' },
  { display_name: 'WTW (Willis Towers Watson)', tier: 'tier_1', track: 'broker', priority_rank: 23, nyc_presence: '200 Liberty St', why: '1K+ EE · F500 health & benefits consulting' },
  { display_name: 'Lockton', tier: 'tier_1', track: 'broker', priority_rank: 24, nyc_presence: '48th & Lex', why: '250-10K EE · Private · premium EB · producer-led culture' },
  { display_name: 'USI Insurance Services', tier: 'tier_1', track: 'broker', priority_rank: 25, nyc_presence: 'Valhalla NY HQ', why: '100-2.5K EE · NY-headquartered · strong mid-market EB' },
  { display_name: 'HUB International', tier: 'tier_1', track: 'broker', priority_rank: 26, nyc_presence: '55 Water St (Northeast HQ)', why: '50-2.5K EE · Decentralized regional model' },
  { display_name: 'Alliant', tier: 'tier_1', track: 'broker', priority_rank: 27, nyc_presence: '1301 6th Ave', why: '100-5K EE · Growing EB practice · strong in tech/media' },
  { display_name: 'Brown & Brown', tier: 'tier_1', track: 'broker', priority_rank: 28, nyc_presence: 'NYC', why: '50-1K EE · EB secondary to P&C — deprioritize' },
  { display_name: 'Acrisure', tier: 'tier_1', track: 'broker', priority_rank: 29, nyc_presence: 'Multiple', why: '50-5K EE · Roll-up of 800+ agencies · uneven EB depth' },

  // ====================== Track B: Carrier HECs (stealth play) ======================
  { display_name: 'Cigna', tier: 'tier_1', track: 'carrier_hec', priority_rank: 30, nyc_presence: 'National', why: 'Health Engagement Consultants (HECs) manage HIF wellness fund · sit alongside broker in client meetings · virtually unprospected' },
  { display_name: 'Aetna', tier: 'tier_1', track: 'carrier_hec', priority_rank: 31, nyc_presence: 'National', why: 'Designated Consultants / Health & Wellness Consultants manage Wellness Allowance' },
  { display_name: 'Anthem', tier: 'tier_1', track: 'carrier_hec', priority_rank: 32, nyc_presence: 'National', why: 'Wellness Consultants manage Wellness Fund · third leg of carrier HEC track' },
];

console.log(`Seeding ${FIRMS.length} target firms...`);
let inserted = 0, updated = 0, errors = 0;
for (const firm of FIRMS) {
  const { data: existing } = await sb.from('crm_target_firms').select('id').eq('display_name', firm.display_name).maybeSingle();
  if (existing) {
    const { error } = await sb.from('crm_target_firms').update(firm).eq('id', existing.id);
    if (error) { console.log(`  ❌ update ${firm.display_name}: ${error.message}`); errors++; }
    else { updated++; }
  } else {
    const { error } = await sb.from('crm_target_firms').insert({ id: randomUUID(), ...firm });
    if (error) { console.log(`  ❌ insert ${firm.display_name}: ${error.message}`); errors++; }
    else { inserted++; }
  }
}
console.log(`Done — inserted ${inserted}, updated ${updated}, errors ${errors}`);
