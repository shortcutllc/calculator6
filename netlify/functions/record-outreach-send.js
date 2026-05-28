/**
 * record-outreach-send — server-side writer for outreach_sends.
 *
 * Called by logOutreach() in WorkhumanLeadService.ts immediately after the
 * client-side insert into lead_outreach_log when channel='email'. We need
 * a server function because outreach_sends has RLS that blocks all writes
 * except service_role.
 *
 * What it does:
 *   1. Look up the lead's email via workhuman_leads
 *   2. Resolve sender_name → sender_email via the team mapping
 *   3. Upsert into outreach_sends with campaign_id='workhuman-booth-email'
 *      so the daily digest, follow-up queue, and "never emailed" badge
 *      reflect the send
 *
 * Idempotent on (email, campaign_id) — touch_count increments on resend.
 *
 * Body: { leadId, senderName }   (channel='email' implicit — only emails
 *                                  hit this endpoint)
 */
import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

// Keep in sync with workhuman-booth-send.js + the backfill script.
// TODO: extract to a shared lib once a fourth caller appears.
const SENDER_EMAILS = {
  'Will Newton':       'will@getshortcut.co',
  'Jaimie Pritchard':  'jaimie@getshortcut.co',
  'Marc Levitan':      'marc@getshortcut.co',
  'Caren Skutch':      'caren@getshortcut.co',
};

const CAMPAIGN_ID = 'workhuman-booth-email';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  // Bearer-auth required so random anon can't pollute outreach_sends with
  // junk. We accept either the supabase anon key (frontend) or service_role.
  // The signature isn't load-bearing security — this is internal-tool only.
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth?.startsWith('Bearer ')) return json(401, { error: 'auth required' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'bad json' }); }
  const { leadId, senderName } = body;
  if (!leadId) return json(400, { error: 'leadId required' });
  if (!senderName) return json(400, { error: 'senderName required' });

  const senderEmail = SENDER_EMAILS[senderName];
  if (!senderEmail) {
    return json(400, { error: `unknown sender_name: ${senderName} (expected one of ${Object.keys(SENDER_EMAILS).join(', ')})` });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'misconfigured' });
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Get lead's email
  const { data: lead, error: leadErr } = await sb.from('workhuman_leads')
    .select('email').eq('id', leadId).maybeSingle();
  if (leadErr || !lead?.email) return json(404, { error: `lead ${leadId} not found or has no email` });
  const leadEmail = lead.email.toLowerCase();

  // 2. Look up current touch_count (so resends increment, not replace)
  const { data: prev } = await sb.from('outreach_sends')
    .select('touch_count').eq('email', leadEmail).eq('campaign_id', CAMPAIGN_ID).maybeSingle();
  const nextTouchCount = (prev?.touch_count || 0) + 1;
  const now = new Date().toISOString();

  // 3. Upsert outreach_contacts (best-effort, never overwrite richer fields)
  await sb.from('outreach_contacts').upsert(
    { email: leadEmail, email_domain: leadEmail.split('@')[1] || null, source: 'workhuman-booth-email', ingested_at: now },
    { onConflict: 'email', ignoreDuplicates: true },
  );

  // 4. Upsert outreach_sends
  const { error: writeErr } = await sb.from('outreach_sends').upsert(
    {
      email: leadEmail,
      campaign_id: CAMPAIGN_ID,
      sent_time: now,
      sender_email: senderEmail,
      touch_count: nextTouchCount,
      ingested_at: now,
    },
    { onConflict: 'email,campaign_id' },
  );
  if (writeErr) return json(500, { error: `outreach_sends write failed: ${writeErr.message}` });

  return json(200, { ok: true, email: leadEmail, sender: senderEmail, touch_count: nextTouchCount });
};
