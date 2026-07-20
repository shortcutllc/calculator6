/**
 * founder-queue-v2.mjs — draft a day's founder notes with the V2 WRITING LOOP and put
 * them in Will's Gmail as drafts. Local runner (not a cron): the v1 Netlify queue is
 * PAUSED while we A/B, and this is how the batch gets made in the meantime.
 *
 * Pipeline per lead (lib/founder-note-v2.js):
 *   research wide + rate for noteworthiness (may REFUSE)
 *     -> generate N structurally-different candidates in one call
 *       -> terminal brand-safety screen (guards REJECT, never rewrite)
 *         -> blind dual-ordered lens-separated judge panel picks the winner
 * No patch loop. A lead with no fact worth saying is SKIPPED, not padded with filler
 * (Will approved refuse-to-draft 2026-07-14): five strong notes beat ten inert ones.
 *
 * Usage:
 *   node scripts/founder-queue-v2.mjs                          # DRY: show who it would draft
 *   node scripts/founder-queue-v2.mjs --confirm                # write Gmail drafts + rows
 *   node scripts/founder-queue-v2.mjs --audience brokers --max 5 --confirm
 *   node scripts/founder-queue-v2.mjs --only some@lead.com --confirm
 *
 * Requires: set -a; . ~/.shortcut-cron.env; set +a   (SUPABASE_URL, SERVICE_ROLE_KEY)
 */
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { researchObservations, composeNoteV2 } from '../netlify/functions/lib/founder-note-v2.js';
import { voiceExemplars } from '../netlify/functions/lib/voice-corpus.js';
import { noteWordCount } from '../netlify/functions/lib/founder-note.js';
import { getAccessToken, createDraft, lc } from '../netlify/functions/lib/gmail.js';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d = null) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const CONFIRM = has('--confirm');
const AUDIENCE = val('--audience', 'tech-execs');
const MAX = parseInt(val('--max', '5'), 10);
const ONLY = val('--only');
const N = parseInt(val('--n', '4'), 10);

const OPENCLAW = `${process.env.HOME}/.openclaw/workspace`;
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');
const GEMINI_KEY = process.env.GEMINI_API_KEY || envKey('GEMINI_API_KEY');
const GROQ_KEY = process.env.GROQ_API_KEY || envKey('GROQ_API_KEY');
const WILL = 'will@getshortcut.co';

// The founder-min signature (name / Founder, Shortcut / bare domain / phone). No logo,
// no booking link — first-touch rule.
const FOUNDER_MIN_SIG_HTML = '<div><div>Will Newton</div><div>Founder, Shortcut</div><div>getshortcut.co</div><div>(215) 218-8088</div></div>';

const c = (n) => (s) => `\x1b[${n}m${s}\x1b[0m`;
const bold = c(1); const gray = c(90); const green = c(32); const red = c(31); const yellow = c(33); const cyan = c(36);

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }
  const sb = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

  // --- target selection (mirrors the v1 queue's exclusions)
  const { data: acct } = await sb.from('gmail_accounts').select('supabase_user_id, email').eq('email', WILL).maybeSingle();
  if (!acct) { console.error('will@ not connected'); process.exit(2); }

  // TARGET SELECTION — mirrors founder-queue-background.js EXACTLY. Do not re-derive it:
  // the columns are name/title/company (not first_name/company_name), brokers are picked
  // by broker_firm_id (not source), and the verification filter is load-bearing
  // (mv_status==='ok' OR bounceban==='deliverable' — a founder-lane bounce is worse than a
  // campaign bounce, see memory/founder_outreach_lane.md).
  const { data: firms } = await sb.from('crm_target_firms').select('id, display_name, tier, why, priority_rank');
  const firmById = new Map((firms || []).map((f) => [f.id, f]));
  let rows = [];
  for (let f = 0; ; f += 1000) {
    const q = sb.from('outreach_contacts')
      .select('email, name, title, company, location, mv_status, bounceban_status, broker_firm_id, broker_priority_rank, linkedin_url');
    const { data } = AUDIENCE === 'brokers'
      ? await q.not('broker_firm_id', 'is', null).range(f, f + 999)
      : await q.eq('source', 'founder-personal').range(f, f + 999);
    rows.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  const total = rows.length;
  rows = rows.filter((r) => r.email && (r.mv_status === 'ok' || r.bounceban_status === 'deliverable'));
  const verified = rows.length;

  const { data: queued } = await sb.from('saved_drafts').select('recipient_email').eq('target_kind', 'founder_note').limit(10000);
  const already = new Set((queued || []).map((r) => lc(r.recipient_email)));
  const { data: supp } = await sb.from('crm_suppression').select('email').limit(20000);
  const suppressed = new Set((supp || []).map((s) => lc(s.email)));
  const { data: sends } = await sb.from('outreach_sends').select('email').eq('sender_email', WILL).limit(10000);
  const contacted = new Set((sends || []).map((s) => lc(s.email)));
  rows = rows.filter((r) => !already.has(lc(r.email)) && !suppressed.has(lc(r.email)) && !contacted.has(lc(r.email)));
  if (ONLY) rows = rows.filter((r) => lc(r.email) === lc(ONLY));

  // priority order, then one contact per firm/company per day
  rows.sort((a, b) => (a.broker_priority_rank ?? 9e9) - (b.broker_priority_rank ?? 9e9));
  const seen = new Set(); const targets = [];
  for (const r of rows) {
    if (targets.length >= MAX) break;
    const k = r.broker_firm_id || lc(r.company) || lc(r.email);
    if (seen.has(k)) continue;
    seen.add(k); targets.push(r);
  }

  console.log(gray('─'.repeat(76)));
  console.log(`${bold('FOUNDER QUEUE v2')}  audience=${AUDIENCE}  candidates/lead=${N}  panel=${GEMINI_KEY ? 'claude+gemini' : yellow('claude only')}`);
  console.log(`${bold('pool')} ${total} → ${bold('verified')} ${verified} → ${bold('eligible')} ${rows.length} → ${bold('drafting')} ${targets.length}   ${CONFIRM ? red('LIVE — will write Gmail drafts') : green('DRY RUN')}`);
  console.log(gray('─'.repeat(76)));
  targets.forEach((t) => console.log(`  ${t.name} · ${t.title} · ${t.company} ${gray(t.email)}`));
  if (!CONFIRM) { console.log(gray('\nDRY RUN — rerun with --confirm to write drafts.')); return; }

  const tok = await getAccessToken(sb, WILL);
  const exemplars = voiceExemplars({ audience: AUDIENCE, max: 6 });
  const { data: prior } = await sb.from('saved_drafts').select('body').eq('target_kind', 'founder_note').order('created_at', { ascending: false }).limit(12);
  const recentNotes = (prior || []).map((r) => r.body).filter(Boolean);

  const results = { drafted: 0, refused: 0, failed: 0 };
  for (const t of targets) {
    const label = t.email;
    const log = (m) => console.log(gray(`    · ${m}`));
    console.log(`\n${bold(cyan(`▶ ${t.name} — ${t.company}`))}`);
    try {
      const { observations, refused: noFacts, all } = await researchObservations(anthropic, t, { audience: AUDIENCE, log });
      console.log(gray(`    research: ${all.length} facts, ${observations.length} above the bar`));
      observations.forEach((o) => console.log(`    ${green('✓')} ${Number(o.notability).toFixed(2)} [${o.category}] ${o.fact.slice(0, 76)}`));
      if (noFacts) {
        // REFUSE. This is the point: forced to write about a lead with no angle, the old
        // engine reached for a job title. Skipping is the better outcome.
        console.log(yellow(`    REFUSED — nothing worth saying. Skipped (not padded with filler).`));
        results.refused += 1; continue;
      }
      const officeContext = observations.some((o) => o.category === 'office');
      const { note, refused, reason, winner, ranked } = await composeNoteV2(anthropic, {
        lead: t, firm: firmById.get(t.broker_firm_id) || null, audience: AUDIENCE, exemplars, recentNotes, observations,
        officeContext, n: N, groqKey: GROQ_KEY || null, geminiKey: GEMINI_KEY || null, label, log,
      });
      if (refused) { console.log(yellow(`    REFUSED — ${reason}`)); results.refused += 1; continue; }

      const d = await createDraft(tok, { from: WILL, to: lc(t.email), subject: note.subject, body: note.body, signatureHtml: FOUNDER_MIN_SIG_HTML, threadId: null });
      await sb.from('saved_drafts').insert({
        user_id: acct.supabase_user_id, recipient_email: lc(t.email),
        subject: note.subject, body: note.body, direction_label: 'founder',
        source_company: t.company, source_contact: t.name, source_title: t.title,
        target_kind: 'founder_note',
        target_ref: {
          audience: AUDIENCE, engine: 'v2', rep_email: WILL,
          linkedin_url: t.linkedin_url || null,
          hook_category: observations[0]?.category || 'none',
          notability: observations[0]?.notability ?? null,
          angle: winner?.angle || null, shape: winner?.shape || null,
          panel_score: winner?.score ?? null, lens_wins: winner?.wins || null,
          candidates_generated: (ranked?.length || 0),
          research_note: note.research_note, linkedin_step: note.linkedin_step,
          gmail_draft_id: d.id, gmail_message_id: d.messageId,
        },
      });
      recentNotes.unshift(note.body); if (recentNotes.length > 12) recentNotes.pop();
      results.drafted += 1;
      console.log(`    ${green('DRAFTED')} "${note.subject}" ${gray(`${noteWordCount(note.body)}w · ${winner?.shape} · score ${winner?.score?.toFixed(1)}`)}`);
      console.log(note.body.split('\n').map((l) => '      ' + l).join('\n'));
    } catch (e) {
      console.log(red(`    FAILED: ${e.message.slice(0, 110)}`));
      results.failed += 1;
    }
  }
  console.log(`\n${bold('DONE')}  drafted ${results.drafted} · refused ${results.refused} · failed ${results.failed}`);
  console.log(gray('Drafts are in will@ Gmail. Nothing sends on its own.'));
})().catch((e) => { console.error('QUEUE_V2_ERROR:', e.message); process.exit(1); });
