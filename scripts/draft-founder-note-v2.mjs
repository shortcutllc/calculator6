/**
 * draft-founder-note-v2.mjs — local runner for the WRITING loop (lib/founder-note-v2.js).
 * Writes NOTHING: no Gmail, no Slack, no DB. Prints the whole pipeline so you can see
 * where a note came from and why it won.
 *
 * See memory/llm_writing_loop_architecture.md. The shape is:
 *   research WIDE (rate each fact for noteworthiness, allowed to REFUSE)
 *     -> generate N structurally-different candidates (one call, Verbalized-Sampling style)
 *       -> screen with the TERMINAL gate (guards REJECT, never rewrite)
 *         -> judge panel picks the winner (blind, pairwise, dual-ordered, lens-separated)
 * There is NO patch loop anywhere. That is the point.
 *
 * Usage:
 *   node scripts/draft-founder-note-v2.mjs --name Melanie --title CHRO --company "Evergreen Trading" --location "New York"
 *   node scripts/draft-founder-note-v2.mjs --email mriker@evergreentrading.com     # pull the real row
 *   node scripts/draft-founder-note-v2.mjs ... --audience brokers --n 6 --show-all
 *
 * Flags:
 *   --n <int>        candidates to generate (default 5)
 *   --show-all       print every candidate + why it lost, not just the winner
 *   --no-research    skip the research pass (fast iteration on voice/generation only)
 *   --exemplars      pull Will's real sent mail as voice examples (needs the cron env)
 *   --floor <0-1>    notability bar (default 0.5)
 */
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  researchObservations, composeNoteV2, anthropicJudge, LENSES, NOTABILITY_FLOOR,
} from '../netlify/functions/lib/founder-note-v2.js';
import { recentSentBodies, noteWordCount } from '../netlify/functions/lib/founder-note.js';
import { voiceExemplars } from '../netlify/functions/lib/voice-corpus.js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d = null) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const OPENCLAW = `${process.env.HOME}/.openclaw/workspace`;
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const repoEnv = (n) => { try { return (readFileSync('.env', 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');

const AUDIENCE = val('--audience', 'tech-execs');
const N = parseInt(val('--n', '5'), 10);
const FLOOR = parseFloat(val('--floor', String(NOTABILITY_FLOOR)));
const EMAIL = val('--email');
const SHOW_ALL = has('--show-all');
const RESEARCH = !has('--no-research');
const REMOTE = has('--remote');

const c = (n) => (s) => `\x1b[${n}m${s}\x1b[0m`;
const bold = c(1); const gray = c(90); const green = c(32); const red = c(31); const yellow = c(33); const cyan = c(36);

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY (env or openclaw .env)'); process.exit(2); }
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

  let lead = {
    email: EMAIL || 'local@example.com',
    name: val('--name', 'there'),
    title: val('--title', 'Head of People'),
    company: val('--company', 'Acme'),
    location: val('--location', null),
  };
  let firm = null;

  // Pull the real row when --email is given, so local == production input.
  if (EMAIL) {
    const url = process.env.SUPABASE_URL || repoEnv('VITE_SUPABASE_URL');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || repoEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data: oc } = await sb.from('outreach_contacts').select('*').eq('email', EMAIL).maybeSingle();
      const { data: pb } = oc ? { data: null } : await sb.from('crm_play_b').select('*').eq('contact_email', EMAIL).maybeSingle();
      const r = oc || pb;
      if (r) {
        lead = {
          email: EMAIL,
          name: r.first_name || (r.contact_name || '').split(' ')[0] || lead.name,
          title: r.title || r.contact_title || lead.title,
          company: r.company_name || lead.company,
          location: r.location || r.contact_location || lead.location,
        };
        console.log(gray(`  · pulled real row for ${EMAIL}`));
      } else console.log(yellow(`  · no row found for ${EMAIL} — using flags`));
    }
  }

  // VOICE: the CURATED corpus is the default (lib/voice-corpus.js). --raw-sent falls back
  // to scraping recent sent mail, which is what v1 does and is a TRAP: most of Will's sent
  // mail is merge templates (the Workhuman follow-ups are one skeleton with the name
  // swapped), so scraping it teaches the model the robot. Kept only for comparison.
  let exemplars = voiceExemplars({ audience: AUDIENCE, max: 6 });
  if (has('--raw-sent')) {
    try {
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const { getAccessToken } = await import('../netlify/functions/lib/gmail.js');
      const tok = await getAccessToken(sb, 'will@getshortcut.co');
      exemplars = await recentSentBodies(tok, 6);
      console.log(yellow(`  · --raw-sent: ${exemplars.length} UNCURATED sent emails (likely templates)`));
    } catch (e) { console.log(yellow(`  · raw sent unavailable (${e.message})`)); }
  }

  // Recent notes for the freshness lens + sameness screen.
  let recentNotes = [];
  try {
    const url = process.env.SUPABASE_URL || repoEnv('VITE_SUPABASE_URL');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || repoEnv('SUPABASE_SERVICE_ROLE_KEY');
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await sb.from('saved_drafts').select('body').eq('target_kind', 'founder_note').order('created_at', { ascending: false }).limit(12);
    recentNotes = (data || []).map((r) => r.body).filter(Boolean);
  } catch { /* optional */ }

  console.log(gray('─'.repeat(76)));
  console.log(`${bold('LEAD')}      ${lead.name} · ${lead.title} · ${lead.company} (${lead.location || 'no location'})`);
  console.log(`${bold('AUDIENCE')}  ${AUDIENCE}   ${bold('N')} ${N}   ${bold('FLOOR')} ${FLOOR}   ${bold('EXEMPLARS')} ${exemplars.length}   ${bold('RECENT')} ${recentNotes.length}`);
  console.log(gray('─'.repeat(76)));

  const t0 = Date.now();
  const log = (m) => console.log(gray(`  · ${m}`));

  // ---- 1. RESEARCH (wide, rated, may refuse)
  let observations = []; let refusedResearch = false; let all = [];
  if (RESEARCH) {
    console.log(`\n${bold(cyan('[1] RESEARCH'))} ${gray('— gather wide, rate for noteworthiness, allowed to refuse')}`);
    const r = await researchObservations(anthropic, lead, { audience: AUDIENCE, floor: FLOOR, log });
    observations = r.observations; refusedResearch = r.refused; all = r.all;
    for (const o of all) {
      const keep = Number(o.notability) >= FLOOR;
      console.log(`  ${keep ? green('KEEP') : red('drop')} ${bold(Number(o.notability).toFixed(2))} [${o.category}/${o.recency}] ${o.fact.slice(0, 88)}`);
      console.log(gray(`        generic? ${o.generic_test.slice(0, 72)}`));
      console.log(gray(`        effort?  ${o.effort_test.slice(0, 72)}`));
    }
    if (refusedResearch) console.log(yellow(`\n  NOTHING WORTH SAYING — the loop may refuse to draft. This is a legitimate outcome.`));
  }

  // ---- 2-4. GENERATE -> SCREEN -> JUDGE
  console.log(`\n${bold(cyan('[2] GENERATE'))} ${gray(`— ${N} structurally different candidates, one call`)}`);
  const officeContext = observations.some((o) => o.category === 'office');
  const { note, ranked, rejected, refused, reason } = await composeNoteV2(anthropic, {
    lead, firm, audience: AUDIENCE, remote: REMOTE, exemplars, recentNotes,
    observations, officeContext, n: N,
    judges: [anthropicJudge(anthropic)],
    lenses: Object.values(LENSES),
    label: lead.email, log,
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);

  if (SHOW_ALL) {
    console.log(`\n${bold(cyan('[3] ALL CANDIDATES'))}`);
    for (const r of rejected) {
      console.log(`\n  ${red('REJECTED')} ${r.id} ${gray(`(${r.angle} / ${r.shape})`)}\n  ${red(r.reason)}`);
      console.log(gray(r.body.split('\n').map((l) => '    ' + l).join('\n')));
    }
    for (const r of ranked) {
      const tag = r.id === ranked[0]?.id ? green('WINNER ') : gray('        ');
      console.log(`\n  ${tag}${r.id} ${bold(`score ${r.score?.toFixed(1)}`)} ${gray(`(${r.angle} / ${r.shape}, ${noteWordCount(r.body)}w, self-odds ${r.reply_odds})`)}`);
      console.log(gray(`          lens wins: ${JSON.stringify(r.wins || {})}`));
      console.log(r.body.split('\n').map((l) => '    ' + l).join('\n'));
    }
  }

  console.log(`\n${bold(cyan('[4] RESULT'))}`);
  if (refused) {
    console.log(yellow(`\n  REFUSED TO DRAFT: ${reason}`));
    console.log(gray('  (v1 would have shipped something generic here. That is the floor of blandness we are removing.)'));
  } else {
    const q = (note.body.match(/\?/g) || []).length;
    console.log(`${bold('SUBJECT')}  ${note.subject}     ${gray(`${noteWordCount(note.body)} words · ${q === 1 ? green('1 question') : red(q + ' questions')}`)}`);
    console.log(`${bold('BODY')}\n${note.body}`);
    console.log(gray(`\nresearch_note: ${note.research_note}`));
    console.log(gray(`linkedin_step: ${note.linkedin_step}`));
  }
  console.log(gray(`\n(${secs}s · generated ${ranked.length + rejected.length}, ${rejected.length} screened out, ${ranked.length} judged)`));
})().catch((e) => { console.error('V2_ERROR:', e.message, e.stack?.split('\n')[1] || ''); process.exit(1); });
