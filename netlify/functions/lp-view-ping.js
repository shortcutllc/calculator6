/**
 * lp-view-ping — fire a Slack ping to the lead owner when a prospect views
 * their personalized landing page (Phase 3).
 *
 * Threshold: 2nd+ view in the last 24h. The first view ("yep, they got the
 * link") doesn't ping — we want signal, not noise. Each ping debounces on
 * the lead's last_lp_ping_at so multiple rapid views don't multi-fire.
 *
 * Called by WorkhumanRecharge.tsx immediately after track_landing_page_view
 * succeeds. Anon-callable (no auth required) — the function ONLY reads
 * page_view_count + page_last_viewed_at that the RPC just updated, so an
 * attacker spamming this endpoint can't fabricate views.
 *
 * Body: { unique_token }
 */
import { createClient } from '@supabase/supabase-js';
import { shouldPing, sendPingDM } from './lib/slack-event-ping.js';
import { buildLandingViewPingBlocks } from './lib/slack-blocks.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

const MIN_VIEWS_TO_PING = 2;     // skip view #1; ping #2 onward
const DEBOUNCE_HOURS = 4;        // don't re-ping for the same lead within 4h
const ASSIGNEE_TO_EMAIL = {
  'Will Newton':       'will@getshortcut.co',
  'Jaimie Pritchard':  'jaimie@getshortcut.co',
  'Marc Levitan':      'marc@getshortcut.co',
  'Caren Skutch':      'caren@getshortcut.co',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'bad json' }); }
  const token = (body.unique_token || '').toString().trim();
  if (!token) return json(400, { error: 'unique_token required' });

  const sb = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  // 1. Find the page + its workhuman_lead by token.
  const { data: page } = await sb.from('generic_landing_pages')
    .select('id, view_count, last_viewed_at').eq('unique_token', token).maybeSingle();
  if (!page) return json(200, { ok: true, skipped: 'page-not-found' });

  const { data: lead } = await sb.from('workhuman_leads')
    .select('id, email, name, company, assigned_to, landing_page_url, page_view_count, page_last_viewed_at, last_lp_ping_at')
    .eq('landing_page_id', page.id).maybeSingle();
  if (!lead) return json(200, { ok: true, skipped: 'no-matching-lead' });

  // 2. Threshold checks.
  const views = lead.page_view_count || 0;
  if (views < MIN_VIEWS_TO_PING) {
    return json(200, { ok: true, skipped: `view-${views}-below-threshold` });
  }
  if (lead.last_lp_ping_at) {
    const since = Date.now() - new Date(lead.last_lp_ping_at).getTime();
    if (since < DEBOUNCE_HOURS * 3600 * 1000) {
      return json(200, { ok: true, skipped: `debounce-${Math.round(since / 60000)}min-since-last` });
    }
  }

  // 3. Resolve the owner. Landing-page-view pings ALWAYS use the lead's
  // explicit workhuman assignee (these are conference-floor leads — the
  // assignee is the source of truth, not whoever last sent). If no assignee
  // and no fallback, no ping.
  const repEmail = lead.assigned_to ? ASSIGNEE_TO_EMAIL[lead.assigned_to] : null;
  if (!repEmail) return json(200, { ok: true, skipped: 'no-assignee' });

  const { data: acct } = await sb.from('gmail_accounts')
    .select('email, slack_user_id, tz, event_pings_enabled, muted_until, muted_lead_emails, muted_until_by_lead')
    .eq('email', repEmail).maybeSingle();
  if (!acct?.slack_user_id) return json(200, { ok: true, skipped: 'rep-not-mapped' });
  if (!shouldPing(acct, lead.email)) return json(200, { ok: true, skipped: 'muted-or-paused' });

  // 4. Send the ping + mark last_lp_ping_at so we debounce future rapid views.
  const label = [lead.name, lead.company].filter(Boolean).join(' · ') || lead.email;
  const blocks = buildLandingViewPingBlocks({
    who: label,
    email: lead.email,
    viewCount: views,
    landingPageUrl: lead.landing_page_url,
    repEmail,
  });
  const post = await sendPingDM(acct.slack_user_id, `${label} viewed their landing page`, blocks);
  if (!post.ok) return json(200, { ok: true, skipped: `slack-error: ${post.error || 'unknown'}` });

  await sb.from('workhuman_leads').update({ last_lp_ping_at: new Date().toISOString() }).eq('id', lead.id);
  return json(200, { ok: true, pinged: true, rep: repEmail, views });
};
