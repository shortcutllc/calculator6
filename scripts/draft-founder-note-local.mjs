/**
 * draft-founder-note-local.mjs — iterate the founder-note VOICE + GATES locally,
 * with NO Netlify deploy (Will 2026-07-06, task #10). Imports the exact compose
 * engine the production function uses (netlify/functions/lib/founder-note.js), so
 * a note you like here is byte-identical to what the 7:35/7:45 cron will produce.
 *
 * Writes NOTHING: no Gmail draft, no Slack card, no saved_drafts row, no DB. It
 * just prints the subject/body/research-note + the skeptic verdict, and re-runs
 * the deterministic guard so you see exactly what would (or wouldn't) skip.
 *
 * ITERATION LOOP: edit lib/founder-note.js (prompt, gates, whatever) → re-run
 * this → read the note. When it's right, ONE deploy ships it to production.
 *
 *   set -a; source ~/.shortcut-cron.env; set +a   # only needed for --email / --exemplars
 *   export ANTHROPIC_API_KEY=...                    # or it reads ~/.openclaw/workspace/.env
 *
 *   # ad-hoc lead from flags (fastest, no DB):
 *   node scripts/draft-founder-note-local.mjs --audience tech-execs --cta convo \
 *     --name "Ada Lovelace" --title "Head of People" --company "Acme AI" \
 *     --location "New York, NY" --trigger "raised $30M Series B on Jun 2026"
 *
 *   # pull a real lead from Supabase (read-only) by email:
 *   node scripts/draft-founder-note-local.mjs --email nabin@niural.com --audience tech-execs \
 *     --cta help --trigger "raised $21M Series A extension Jun 2026"
 *
 *   # include Will's live voice exemplars (needs Supabase + Gmail creds; slower, max parity):
 *   node scripts/draft-founder-note-local.mjs --email ... --exemplars
 *
 *   # run the same lead N times to eyeball variance:
 *   node scripts/draft-founder-note-local.mjs --audience tech-execs --company "Acme" --n 3
 */
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { composeNote, guardNote, researchPersonalHook } from '../netlify/functions/lib/founder-note.js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');

const AUDIENCE = val('--audience', 'brokers');   // 'brokers' | 'tech-execs'
const CTA = ['help', 'convo'].includes(val('--cta', '')) ? val('--cta', '') : 'help';
const TRIGGER = val('--trigger', null);
const TRIGGER_TYPE = val('--trigger-type', null); // funding|people_posting|growth_list — funding=milestone opener, others=internal-only
const EMAIL = val('--email', null);
const REMOTE = has('--remote'); // distributed company → lead the virtual track
const PERSONALIZE = has('--personalize'); // research a genuine human hook (prod path)
const WITH_EXEMPLARS = has('--exemplars');
const N = Math.max(1, Math.min(5, parseInt(val('--n', '1'), 10) || 1));

const gray = (s) => `\x1b[90m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY (env or openclaw .env)'); process.exit(2); }
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

  // Build the lead. --email pulls the real row (read-only) + its broker firm;
  // otherwise assemble from flags.
  let lead = {
    name: val('--name', 'Alex Founder'),
    title: val('--title', AUDIENCE === 'brokers' ? 'Benefits Consultant' : 'Head of People'),
    company: val('--company', AUDIENCE === 'brokers' ? 'Acme Benefits' : 'Acme AI'),
    location: val('--location', 'New York, NY'),
    email: EMAIL || 'local@example.com',
  };
  let firm = { tier: val('--firm-tier', null), why: val('--firm-why', null), nyc_presence: null };
  let exemplars = [];

  const needSb = EMAIL || WITH_EXEMPLARS;
  if (needSb) {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
    if (EMAIL) {
      const { data: c } = await sb.from('outreach_contacts')
        .select('email, name, title, company, location, broker_firm_id').eq('email', EMAIL.toLowerCase()).maybeSingle();
      if (!c) { console.error(`no outreach_contacts row for ${EMAIL}`); process.exit(2); }
      lead = { name: c.name, title: c.title, company: c.company, location: c.location, email: c.email };
      if (c.broker_firm_id) {
        const { data: f } = await sb.from('crm_target_firms').select('tier, why, nyc_presence').eq('id', c.broker_firm_id).maybeSingle();
        if (f) firm = f;
      }
    }
    if (WITH_EXEMPLARS) {
      try {
        const { getAccessToken } = await import('../netlify/functions/lib/gmail.js');
        const { recentSentBodies } = await import('../netlify/functions/lib/founder-note.js');
        const tok = await getAccessToken(sb, 'will@getshortcut.co');
        exemplars = await recentSentBodies(tok, 5);
      } catch (e) { console.warn('exemplars fetch failed (continuing with none):', e.message); }
    }
  }

  console.log(gray('─'.repeat(72)));
  console.log(`${bold('LEAD')}      ${lead.name} · ${lead.title} · ${lead.company} (${lead.location || 'no location'})`);
  console.log(`${bold('AUDIENCE')}  ${AUDIENCE}   ${bold('CTA')} ${CTA}   ${bold('EXEMPLARS')} ${exemplars.length}${WITH_EXEMPLARS ? '' : ' (off; pass --exemplars for max parity)'}`);
  if (TRIGGER) console.log(`${bold('TRIGGER')}   ${TRIGGER}`);
  if (firm.why) console.log(`${bold('FIRM WHY')}  ${String(firm.why).slice(0, 120)}`);
  console.log(gray('─'.repeat(72)));

  for (let i = 1; i <= N; i += 1) {
    if (N > 1) console.log(gray(`\n### run ${i}/${N}`));
    try {
      const t0 = Date.now();
      let personalHook = null;
      if (PERSONALIZE) {
        const ph = await researchPersonalHook(anthropic, lead, { audience: AUDIENCE, log: (m) => console.log(gray(`  · ${m}`)) });
        if (ph?.warm_line && ph.confidence !== 'low') { personalHook = ph.warm_line; console.log(`${bold('PERSONAL')}  [${ph.category}/${ph.confidence}] ${green(ph.warm_line)}`); }
        else console.log(gray(`  · personalize: nothing genuine found (${ph?.confidence || 'none'}) — trigger fallback`));
      }
      const { note, review } = await composeNote(anthropic, {
        lead, firm, exemplars, audience: AUDIENCE, ctaVariant: CTA, trigger: TRIGGER, triggerType: TRIGGER_TYPE, remote: REMOTE, personalHook,
        label: lead.email, log: (m) => console.log(gray(`  · ${m}`)),
      });
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      // re-run the deterministic guard so the reader sees the exact pass/fail
      let guardVerdict = green('PASS');
      try { guardNote(note, AUDIENCE, TRIGGER); } catch (ge) { guardVerdict = red(`FAIL: ${ge.message}`); }
      console.log(`\n${bold('SUBJECT')}  ${note.subject}`);
      console.log(`${bold('BODY')}\n${note.body}`);
      console.log(gray(`\nresearch_note: ${note.research_note}`));
      console.log(gray(`linkedin_step: ${note.linkedin_step}`));
      console.log(`${bold('GUARD')}  ${guardVerdict}  ${gray('(deterministic — this is what would skip in production)')}`);
      // The skeptic verdict is the FIRST critique; composeNote already applied its
      // one revision, so the body above reflects those fixes. Shown for insight.
      console.log(`${bold('SKEPTIC')}  ${review.pass ? green('clean first pass') : gray('first-pass flags (revised once, above): ') + red((review.issues || []).join(' | '))}   ${gray(`(${secs}s)`)}`);
    } catch (e) {
      console.log(red(`\nSKIPPED (would not draft): ${e.message}`));
    }
  }
})().catch((e) => { console.error('LOCAL_DRAFT_ERROR:', e.message); process.exit(1); });
