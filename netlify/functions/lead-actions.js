/**
 * lead-actions — single server-side endpoint for SalesIntelligence row
 * actions (mute / unmute / snooze / delete-permanently / reassign / tier).
 *
 * Why one endpoint, not six: each action is a small write, but most touch
 * tables with strict RLS (crm_suppression, outreach_sends, workhuman_leads).
 * The simplest contract is one auth'd endpoint that dispatches by `action`.
 *
 * Auth: Supabase JWT (Bearer). Caller must be a logged-in rep.
 *
 * Body:
 *   { action: 'mute' | 'unmute' | 'snooze' | 'delete' | 'reassign' | 'set_tier', email, ...payload }
 *
 *   mute:      { email, reason? } - permanent suppression (same as Pro suppress_lead)
 *   unmute:    { email }
 *   snooze:    { email, days: 1 | 7 } - per-rep temporal mute via gmail_accounts.muted_until_by_lead
 *   delete:    { email } - hard purge: crm_suppression + delete from outreach_sends,
 *                          outreach_replies, outreach_contacts, workhuman_leads
 *   reassign:  { email, assigned_to } - update workhuman_leads.assigned_to
 *   set_tier:  { email, tier: 'tier_1a'|'tier_1b'|'tier_1'|'tier_2'|'tier_3' }
 */
import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth?.startsWith('Bearer ')) return json(401, { error: 'auth required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'misconfigured' });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error: authErr } = await sb.auth.getUser(auth.replace('Bearer ', ''));
  if (authErr || !user) return json(401, { error: 'invalid token' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'bad json' }); }

  const action = body.action;
  const email = lc(body.email);
  if (!email || !email.includes('@')) return json(400, { error: 'email required' });

  // Resolve actor's gmail (for provenance + per-rep snooze writes)
  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, muted_until_by_lead, muted_lead_emails').eq('supabase_user_id', user.id).maybeSingle();
  const actorEmail = acct?.email || user.email || null;

  if (action === 'mute') {
    const reason = body.reason || 'personal';
    const { error } = await sb.from('crm_suppression').upsert({
      email,
      reason,
      source: 'sales-intelligence',
      detail: { suppressed_by: actorEmail, suppressed_at: new Date().toISOString(), note: body.note || null },
    }, { onConflict: 'email' });
    if (error) return json(500, { error: `mute failed: ${error.message}` });
    return json(200, { ok: true, action: 'mute', email });
  }

  if (action === 'unmute') {
    const { error } = await sb.from('crm_suppression').delete().eq('email', email);
    if (error) return json(500, { error: `unmute failed: ${error.message}` });
    return json(200, { ok: true, action: 'unmute', email });
  }

  if (action === 'snooze') {
    if (!acct) return json(400, { error: 'no gmail_accounts row for actor — snooze is per-rep' });
    const days = Number(body.days);
    if (![1, 7].includes(days)) return json(400, { error: 'days must be 1 or 7' });
    const until = new Date(Date.now() + days * 86400000).toISOString();
    const snoozes = { ...(acct.muted_until_by_lead || {}), [email]: until };
    const { error } = await sb.from('gmail_accounts').update({ muted_until_by_lead: snoozes }).eq('email', acct.email);
    if (error) return json(500, { error: `snooze failed: ${error.message}` });
    return json(200, { ok: true, action: 'snooze', email, until });
  }

  if (action === 'delete') {
    // Hard purge: same writer chain as the Pro "suppress as therapist" flow,
    // PLUS delete the contact's send/reply history so the gmail-pubsub-reply
    // hook can no longer match. Workhuman row goes too. Mostly idempotent —
    // missing rows are fine.
    const errors = [];
    // 1) Suppress so anything that re-discovers them is blocked
    {
      const { error } = await sb.from('crm_suppression').upsert({
        email,
        reason: body.reason || 'deleted',
        source: 'sales-intelligence',
        detail: { deleted_by: actorEmail, deleted_at: new Date().toISOString(), note: body.note || 'Hard-deleted from CRM' },
      }, { onConflict: 'email' });
      if (error) errors.push(`suppression: ${error.message}`);
    }
    // 2) Drop send + reply rows so the reply hook can't match this email
    const { error: e1 } = await sb.from('outreach_sends').delete().eq('email', email);
    if (e1) errors.push(`outreach_sends: ${e1.message}`);
    const { error: e2 } = await sb.from('outreach_replies').delete().eq('email', email);
    if (e2) errors.push(`outreach_replies: ${e2.message}`);
    // 3) Drop the workhuman row (CRM card) if present
    const { error: e3 } = await sb.from('workhuman_leads').delete().eq('email', email);
    if (e3) errors.push(`workhuman_leads: ${e3.message}`);
    // 4) Drop outreach_contacts (not strictly required but clean)
    const { error: e4 } = await sb.from('outreach_contacts').delete().eq('email', email);
    if (e4) errors.push(`outreach_contacts: ${e4.message}`);
    if (errors.length) return json(207, { ok: false, action: 'delete', email, errors });
    return json(200, { ok: true, action: 'delete', email });
  }

  if (action === 'reassign') {
    const assignedTo = body.assigned_to || null;
    const { data, error } = await sb.from('workhuman_leads').update({ assigned_to: assignedTo }).eq('email', email).select('id').maybeSingle();
    if (error) return json(500, { error: `reassign failed: ${error.message}` });
    if (!data) return json(404, { error: 'No workhuman_leads row for this email — reassign only applies to Workhuman leads' });
    return json(200, { ok: true, action: 'reassign', email, assigned_to: assignedTo });
  }

  if (action === 'set_tier') {
    const tier = body.tier;
    if (!['tier_1', 'tier_2', 'tier_3'].includes(tier?.replace(/_1a$|_1b$/, '_1') || '')) {
      return json(400, { error: 'tier must be tier_1a|tier_1b|tier_1|tier_2|tier_3' });
    }
    const update = {
      tier: tier === 'tier_1a' || tier === 'tier_1b' ? 'tier_1' : tier,
      tier_1a: tier === 'tier_1a',
      tier_1b: tier === 'tier_1b',
      tier_override: true,
    };
    const { data, error } = await sb.from('workhuman_leads').update(update).eq('email', email).select('id').maybeSingle();
    if (error) return json(500, { error: `set_tier failed: ${error.message}` });
    if (!data) return json(404, { error: 'No workhuman_leads row for this email' });
    return json(200, { ok: true, action: 'set_tier', email, tier });
  }

  return json(400, { error: `unknown action: ${action}` });
};
