/**
 * ooo-intel.mjs — read what each OOO reply ACTUALLY says and act on it.
 * (task #10 — Will, 2026-07-06: "if the message says maternity leave for 6
 * months, we shouldn't drop them in a new campaign again")
 *
 * Smartlead stops a sequence on ANY reply — including vacation autoresponders —
 * so every OOO lead died at touch one (verified 12/12). But the OOO body is free
 * intelligence: return dates, leave type, alternate contacts, departures. Per
 * unprocessed OOO reply this extracts (Anthropic, temp 0, forced tool):
 *   { return_date, leave_type, departed, alternate_contacts[], confidence }
 * then:
 *   departed            -> suppress (reason 'departed'), never resurface
 *   explicit return     -> resurface_after = return + 3 BUSINESS days (post-
 *                          backlog-purge window)
 *   parental/medical/sabbatical, no date -> +150 days
 *   generic OOO         -> +14 days
 *   alternate contacts  -> staged as outreach_contacts source='ooo-referral'
 *                          (mv null — verify before any send:
 *                          verify-leads --source ooo-referral --include-null)
 * cold-engine picks up resurface_after <= now (one shot, cleared at launch).
 *
 *   set -a; source ~/.shortcut-cron.env; set +a
 *   node scripts/ooo-intel.mjs                 # dry: what WOULD be extracted
 *   node scripts/ooo-intel.mjs --confirm       # extract + write (cron: 6:35 daily)
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const OPENCLAW = '/Users/willnewton/.openclaw/workspace';
const envKey = (n) => { try { return (readFileSync(`${OPENCLAW}/.env`, 'utf8').match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, ''); } catch { return ''; } };
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || envKey('ANTHROPIC_API_KEY');
const CONFIRM = process.argv.includes('--confirm');
const mi = process.argv.indexOf('--max');
const MAX = mi >= 0 && process.argv[mi + 1] ? parseInt(process.argv[mi + 1], 10) : 60;
const sb = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

const SCHEMA = {
  type: 'object',
  properties: {
    return_date: { type: ['string', 'null'], description: 'ISO date (YYYY-MM-DD) they say they return, or null if none stated. Resolve relative dates against the reply date given.' },
    leave_type: { type: 'string', enum: ['vacation', 'parental', 'medical', 'sabbatical', 'departed', 'unknown'] },
    departed: { type: 'boolean', description: 'true if they no longer work there (left the company, retired, role eliminated)' },
    alternate_contacts: { type: 'array', items: { type: 'object', properties: { name: { type: ['string', 'null'] }, email: { type: ['string', 'null'] }, context: { type: ['string', 'null'], description: 'what they cover per the message' } }, required: ['email'] } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['return_date', 'leave_type', 'departed', 'alternate_contacts', 'confidence'],
};

const addBusinessDays = (d, n) => { const x = new Date(d); let left = n; while (left > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) left -= 1; } return x; };

function resurfaceFor(intel, replyDate) {
  if (intel.departed || intel.leave_type === 'departed') return null;             // suppress path
  if (intel.return_date && /^\d{4}-\d{2}-\d{2}/.test(intel.return_date)) {
    const r = new Date(intel.return_date);
    if (!Number.isNaN(r.getTime()) && r.getTime() < Date.now() + 400 * 86400000) return addBusinessDays(r, 3);
  }
  if (['parental', 'medical', 'sabbatical'].includes(intel.leave_type)) return new Date(new Date(replyDate).getTime() + 150 * 86400000);
  return new Date(new Date(replyDate).getTime() + 14 * 86400000);
}

(async () => {
  if (!ANTHROPIC_KEY) { console.error('MISSING ANTHROPIC_API_KEY'); process.exit(2); }
  // graceful pre-flight: columns exist? (migration 20260706000000)
  const probe = await sb.from('outreach_replies').select('ooo_intel').limit(1);
  if (probe.error) { console.error('MIGRATION NEEDED: apply supabase/migrations/20260706000000_add_ooo_intel.sql first (' + probe.error.message + ')'); process.exit(2); }

  const { data: rows } = await sb.from('outreach_replies')
    .select('id, email, reply_date, reply_content')
    .eq('reply_sentiment', 'ooo').is('ooo_intel', null).not('reply_content', 'is', null)
    .order('reply_date', { ascending: false, nullsFirst: false }).limit(MAX);
  log(`${(rows || []).length} unprocessed OOO replies${CONFIRM ? '' : ' (dry run — no writes)'}.`);
  if (!rows?.length) { log('nothing to do.'); return; }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const supp = new Set((await sb.from('crm_suppression').select('email').limit(10000)).data?.map((r) => lc(r.email)) || []);
  const known = new Set((await sb.from('outreach_contacts').select('email').limit(100000)).data?.map((r) => lc(r.email)) || []);
  const tally = { extracted: 0, departed: 0, dated: 0, long_leave: 0, generic: 0, referrals: 0, errors: 0 };

  for (const r of rows) {
    let intel;
    try {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929', max_tokens: 800, temperature: 0,
        system: 'You extract structured facts from out-of-office auto-replies. Only report what the message actually states — never guess dates or invent contacts. Resolve relative dates ("back Monday") against the reply date provided.',
        tools: [{ name: 'report_ooo', description: 'Report the extracted OOO facts.', input_schema: SCHEMA }],
        tool_choice: { type: 'tool', name: 'report_ooo' },
        messages: [{ role: 'user', content: `Reply received ${String(r.reply_date).slice(0, 10)} from ${r.email}:\n\n${String(r.reply_content).slice(0, 2500)}` }],
      });
      intel = (resp.content || []).find((b) => b.type === 'tool_use')?.input;
      if (!intel) throw new Error('no extraction');
    } catch (e) { tally.errors += 1; log(`  extract err ${r.email}: ${e.message}`); continue; }

    // RECENCY GUARD: only FRESH OOOs (<=30d) get a resurface window or staged
    // referrals — a 2024 "back April 15" must never re-enter a 2026 campaign,
    // and a years-old alternate contact is stale data, not a referral.
    const freshReply = r.reply_date && (Date.now() - new Date(r.reply_date).getTime()) <= 30 * 86400000;
    const resurface = freshReply ? resurfaceFor(intel, r.reply_date) : null;
    const kind = intel.departed ? 'DEPARTED' : intel.return_date ? `returns ${intel.return_date}` : intel.leave_type !== 'vacation' && intel.leave_type !== 'unknown' ? `${intel.leave_type} (+150d)` : 'generic (+14d)';
    log(`  ${r.email.padEnd(40)} ${kind}${resurface ? ` → resurface ${resurface.toISOString().slice(0, 10)}` : ''}${intel.alternate_contacts?.length ? ` · alt: ${intel.alternate_contacts.map((a) => a.email).filter(Boolean).join(', ')}` : ''}`);
    tally.extracted += 1;
    if (intel.departed) tally.departed += 1; else if (intel.return_date) tally.dated += 1; else if (['parental', 'medical', 'sabbatical'].includes(intel.leave_type)) tally.long_leave += 1; else tally.generic += 1;

    if (!CONFIRM) continue;
    await sb.from('outreach_replies').update({ ooo_intel: intel }).eq('id', r.id);
    if (intel.departed) {
      await sb.from('crm_suppression').upsert([{ email: lc(r.email), reason: 'departed', source: 'ooo-intel' }], { onConflict: 'email' });
    } else if (resurface && !supp.has(lc(r.email))) {
      await sb.from('outreach_contacts').update({ resurface_after: resurface.toISOString() }).eq('email', lc(r.email)).neq('channel', 'personal');
    }
    for (const alt of (freshReply ? intel.alternate_contacts || [] : [])) {
      const ae = lc(alt.email);
      if (!ae || !ae.includes('@') || known.has(ae) || supp.has(ae)) continue;
      await sb.from('outreach_contacts').upsert([{ email: ae, name: alt.name || null, email_domain: ae.split('@')[1], source: 'ooo-referral', mv_status: null, first_seen: new Date().toISOString(), ingested_at: new Date().toISOString() }], { onConflict: 'email' });
      known.add(ae); tally.referrals += 1;
    }
  }
  log(`DONE — ${JSON.stringify(tally)}`);
  if (CONFIRM && tally.referrals) log(`  → ${tally.referrals} ooo-referral contacts staged. Verify: node scripts/verify-leads.mjs --source "ooo-referral" --include-null --confirm`);
})().catch((e) => { console.error('OOO_INTEL_ERROR:', e.message); process.exit(1); });
