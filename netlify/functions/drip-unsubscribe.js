/**
 * drip-unsubscribe.js — the opt-out endpoint for rep drips.
 *
 * Two callers, two behaviours, both required:
 *
 *  POST  — Gmail/Yahoo ONE-CLICK (RFC 8058). The mail client posts
 *          `List-Unsubscribe=One-Click` with no human involved. It MUST take
 *          effect immediately with no confirmation step and MUST return 2xx.
 *          Getting this wrong is worse than having no header at all: the
 *          provider concludes our opt-out is broken.
 *  GET   — a person clicked the footer link. Unsubscribe immediately (CAN-SPAM
 *          forbids making someone log in or fill a form) and show a plain
 *          confirmation page.
 *
 * The token is an HMAC of email+campaign, so nobody can forge one or walk the
 * list, and we never need a lookup to validate.
 *
 * Writes BOTH drip_unsubscribes (the audit trail: when, how) and crm_suppression
 * (the thing every other sender in this codebase already checks), so an opt-out
 * here stops the cold engine and the founder lane too.
 *
 * Env: SUPABASE_*, DRIP_UNSUB_SECRET
 */

import { createClient } from '@supabase/supabase-js';
import { verifyUnsubToken } from './lib/drip-engine.js';

const page = (title, msg) => `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:34rem;margin:16vh auto;padding:0 1.5rem;color:#032232">
<h1 style="font-size:1.4rem;font-weight:600;margin:0 0 .6rem">${title}</h1>
<p style="font-size:1rem;line-height:1.55;color:#4a5a63;margin:0">${msg}</p>
</div>`;

export const handler = async (event) => {
  const secret = process.env.DRIP_UNSUB_SECRET;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const q = event.queryStringParameters || {};
  const email = String(q.e || '').trim().toLowerCase();
  const campaignId = String(q.c || '').trim();
  const token = String(q.t || '').trim();
  const isPost = event.httpMethod === 'POST';

  // A misconfigured server must never tell a one-click caller "fine". Return 500
  // so the provider retries, rather than silently dropping an opt-out.
  if (!secret || !url || !key) {
    console.error('[drip-unsubscribe] missing env');
    return isPost
      ? { statusCode: 500, body: 'unsubscribe temporarily unavailable' }
      : { statusCode: 500, headers: { 'Content-Type': 'text/html' }, body: page('Something went wrong', 'We could not process that just now. Please reply to the email and we will remove you by hand.') };
  }

  if (!email || !campaignId || !token || !verifyUnsubToken(email, campaignId, token, secret)) {
    return isPost
      ? { statusCode: 400, body: 'invalid unsubscribe token' }
      : { statusCode: 400, headers: { 'Content-Type': 'text/html' }, body: page('That link is not valid', 'Reply to the email with the word unsubscribe and we will take you off the list.') };
  }

  const sb = createClient(url, key);
  try {
    await sb.from('drip_unsubscribes').insert({
      email,
      campaign_id: campaignId,
      token,
      method: isPost ? 'one-click' : 'link',
      user_agent: (event.headers || {})['user-agent'] || null,
      ip: (event.headers || {})['x-nf-client-connection-ip'] || null,
    });

    // The cross-system stop. Every sender in this repo checks crm_suppression.
    await sb.from('crm_suppression').upsert(
      { email, reason: 'do_not_contact', source: 'drip-unsubscribe', detail: { campaign_id: campaignId, method: isPost ? 'one-click' : 'link' } },
      { onConflict: 'email' },
    );

    // Halt this lead's sequence immediately rather than waiting for the next tick.
    await sb.from('drip_leads')
      .update({ status: 'unsubscribed', halted_reason: 'unsubscribed via link', updated_at: new Date().toISOString() })
      .eq('campaign_id', campaignId).eq('email', email);
  } catch (e) {
    console.error('[drip-unsubscribe] write failed:', e.message);
    return isPost
      ? { statusCode: 500, body: 'could not record unsubscribe' }
      : { statusCode: 500, headers: { 'Content-Type': 'text/html' }, body: page('Something went wrong', 'We could not process that just now. Please reply to the email and we will remove you by hand.') };
  }

  return isPost
    ? { statusCode: 200, body: 'unsubscribed' }
    : {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
        body: page('You are unsubscribed', `We will not email <strong>${email.replace(/</g, '&lt;')}</strong> again. Nothing else is needed from you.`),
      };
};
