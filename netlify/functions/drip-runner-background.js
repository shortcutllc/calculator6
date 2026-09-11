/**
 * drip-runner-background.js — sends due drip touches from each rep's own Gmail.
 *
 * Runs on a cron, several times across the sending window. Each tick it picks up
 * whatever is due, subject to every gate in drip-engine.js, and stops at the
 * day's ramped cap.
 *
 * ORDER OF THE GATES MATTERS. Cheap, certain refusals come first so we never
 * spend a Gmail API call on someone we were never going to email:
 *   compliance config -> campaign window -> CIRCUIT BREAKER -> daily cap
 *   -> suppression -> per-domain cap -> cadence -> LIVE thread read -> send.
 *
 * DRY BY DEFAULT. `confirm: true` is required to send. A dry run does everything
 * including the live thread read, so you can see exactly who would receive what.
 *
 * POST body: { campaign?: 'slug', confirm?: false, max?: 25, only?: 'email' }
 * Env: SUPABASE_*, DRIP_UNSUB_SECRET, PRO_SLACK_BOT_TOKEN?
 */

import { createClient } from '@supabase/supabase-js';
import { getAccessToken, sendEmail, getMessageHeaders, getSignature, lc } from './lib/gmail.js';
import {
  renderBody, classifyThread, dueTouch, withinSendWindow, todaysCap, jitterMs,
  unsubscribeUrl, complianceFooter, complianceHeaders, nowInZone, checkBreaker,
  PER_DOMAIN_PER_DAY, LAST_TOUCH, DAY_MS,
} from './lib/drip-engine.js';
import { STEPS, step1For } from './lib/drip-copy.js';

const SLACK_API = 'https://slack.com/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function slackPost(method, body) {
  if (!process.env.PRO_SLACK_BOT_TOKEN) return {};
  const r = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PRO_SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

export const handler = async (event) => {
  const lines = [];
  const log = (m) => { lines.push(m); console.log(`[drip] ${m}`); };
  const body = JSON.parse(event.body || '{}');
  const { campaign: slug, confirm = false, only = null, max = 25 } = body;

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const secret = process.env.DRIP_UNSUB_SECRET;
  if (!secret) return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'DRIP_UNSUB_SECRET not set' }) };

  let q = sb.from('drip_campaigns').select('*').eq('status', 'active');
  if (slug) q = q.eq('slug', slug);
  const { data: campaigns } = await q;
  if (!campaigns?.length) return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'no active campaigns', slug }) };

  const out = [];
  for (const camp of campaigns) {
    const res = await runCampaign({ sb, camp, confirm, only, max, secret, log });
    out.push(res);
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true, dry: !confirm, campaigns: out, log: lines }, null, 2) };
};

async function runCampaign({ sb, camp, confirm, only, max, secret, log }) {
  const rep = lc(camp.rep_email);
  const results = [];
  let sent = 0;

  // COMPLIANCE PRECONDITION. Not a warning: without a working opt-out and a
  // postal address this is not lawful commercial email, so the runner refuses.
  if (!camp.unsubscribe_url || !camp.postal_address) {
    log(`${camp.slug}: REFUSING — unsubscribe_url and postal_address are both required`);
    return { campaign: camp.slug, refused: 'missing unsubscribe_url or postal_address' };
  }

  const win = withinSendWindow(camp);
  if (!win.ok && confirm) {
    log(`${camp.slug}: outside send window (${win.why})`);
    return { campaign: camp.slug, skipped: win.why };
  }

  const token = await getAccessToken(sb, rep).catch((e) => { log(`${camp.slug}: no Gmail token for ${rep}: ${e.message}`); return null; });
  if (!token) return { campaign: camp.slug, error: `no Gmail access for ${rep}` };

  // The rep's REAL Gmail signature. These people have corresponded with her
  // before, so the email should look like it came from her, not from a tool.
  // Fetched once per run; the compliance footer is appended beneath it rather
  // than replacing it.
  const repSignature = await getSignature(token, rep);
  if (!repSignature) log(`${camp.slug}: WARNING — no Gmail signature found for ${rep}, sending with footer only`);

  // Ramp: how many distinct days has this campaign already sent on?
  const { data: hist } = await sb.from('drip_leads')
    .select('last_touch_at').eq('campaign_id', camp.id).not('last_touch_at', 'is', null);
  const sendingDays = new Set((hist || []).map((r) => String(r.last_touch_at).slice(0, 10))).size;
  const cap = todaysCap(camp, sendingDays);

  const today = nowInZone(camp.timezone).date;
  const sentToday = (hist || []).filter((r) => String(r.last_touch_at).slice(0, 10) === today).length;
  const room = Math.max(0, Math.min(cap - sentToday, max));
  log(`${camp.slug}: day ${sendingDays + 1}, cap ${cap}, already ${sentToday} today, room ${room}`);
  if (room <= 0) return { campaign: camp.slug, sent: 0, note: `daily cap ${cap} reached` };

  // CIRCUIT BREAKER. Checked BEFORE any send, over every lead this campaign has
  // already contacted. A warm list should bounce near zero — every address here
  // was deliverable before — so a real bounce rate means the list is wrong, and
  // grinding through the remainder damages the domain that carries proposals and
  // invoices. Tripping pauses the campaign; a human has to look and restart it.
  const { data: contactedRows } = await sb.from('drip_leads')
    .select('status').eq('campaign_id', camp.id).not('last_touch_at', 'is', null);
  const contacted = (contactedRows || []).length;
  const bounced = (contactedRows || []).filter((r) => r.status === 'bounced').length;
  const unsubscribed = (contactedRows || []).filter((r) => r.status === 'unsubscribed').length;
  const breaker = checkBreaker({ contacted, bounced, unsubscribed });
  if (breaker.trip) {
    log(`${camp.slug}: CIRCUIT BREAKER — ${breaker.reason}. Pausing campaign.`);
    if (confirm) {
      await sb.from('drip_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', camp.id);
      await slackPost('chat.postMessage', {
        channel: camp.slack_channel || '#sales',
        text: `:rotating_light: Drip *${camp.slug}* auto-paused: ${breaker.reason}. ${contacted} contacted, ${bounced} bounced, ${unsubscribed} unsubscribed. Nothing further will send until someone restarts it.`,
        unfurl_links: false,
      });
    }
    return { campaign: camp.slug, paused: true, reason: breaker.reason, contacted, bounced, unsubscribed };
  }
  if (contacted) log(`${camp.slug}: health ok — ${contacted} contacted, ${bounced} bounced, ${unsubscribed} unsubscribed`);

  // suppression: the cross-system stop list
  const supp = new Set();
  { const { data } = await sb.from('crm_suppression').select('email').limit(50000); (data || []).forEach((x) => supp.add(lc(x.email))); }

  let lq = sb.from('drip_leads').select('*').eq('campaign_id', camp.id).eq('status', 'active').limit(5000);
  if (only) lq = lq.eq('email', lc(only));
  const { data: leads } = await lq;

  // per-domain throttle, counted across today's sends
  const domainToday = {};
  const { data: todays } = await sb.from('drip_leads')
    .select('email,last_touch_at').eq('campaign_id', camp.id).gte('last_touch_at', `${today}T00:00:00Z`);
  (todays || []).forEach((r) => { const d = lc(r.email).split('@')[1]; domainToday[d] = (domainToday[d] || 0) + 1; });

  for (const lead of leads || []) {
    if (sent >= room) { log(`${camp.slug}: room exhausted`); break; }
    const email = lc(lead.email);
    const domain = email.split('@')[1] || '';
    try {
      if (supp.has(email)) { results.push({ email, skip: 'suppressed' }); await halt(sb, lead, 'suppressed', 'on crm_suppression'); continue; }

      if (lead.status === 'paused' || lead.paused_until) {
        if (lead.paused_until && new Date(lead.paused_until) > new Date()) { results.push({ email, skip: `paused until ${String(lead.paused_until).slice(0, 10)}` }); continue; }
      }

      if ((domainToday[domain] || 0) >= PER_DOMAIN_PER_DAY) { results.push({ email, skip: `domain cap (${domain})` }); continue; }

      const touch = dueTouch(lead);
      if (!touch) { results.push({ email, skip: 'not due' }); continue; }

      // LIVE HALT CHECK. Touch 1 has no thread yet, so this only bites from 2 on.
      if (touch > 1) {
        const since = lead.paused_since_ms || new Date(lead.touches?.[0]?.sent_at || 0).getTime();
        const v = await classifyThread(token, lead.thread_id, since, rep);
        if (v.status === 'unreadable') { results.push({ email, skip: 'thread unreadable (fail-closed)' }); continue; }
        if (v.status === 'bounce') { results.push({ email, skip: 'HALT: bounce' }); await suppress(sb, email, 'bounce'); await halt(sb, lead, 'bounced', v.reason); continue; }
        if (v.status === 'unsub') { results.push({ email, skip: 'HALT: unsubscribe' }); await suppress(sb, email, 'unsubscribe'); await halt(sb, lead, 'unsubscribed', v.reason); continue; }
        if (v.status === 'reply') { results.push({ email, skip: `HALT: ${v.reason}` }); await halt(sb, lead, 'replied', v.reason); continue; }
        if (v.status === 'ooo') {
          const count = (lead.pause_count || 0) + 1;
          if (count > 3) { results.push({ email, skip: 'OOO x3 — dormant' }); await halt(sb, lead, 'dormant', 'repeated OOO'); continue; }
          const until = v.returnDate || new Date(Date.now() + 4 * DAY_MS).toISOString();
          await sb.from('drip_leads').update({ status: 'paused', paused_until: until, pause_count: count, paused_since_ms: v.msgMs || 0, updated_at: new Date().toISOString() }).eq('id', lead.id);
          results.push({ email, skip: `OOO — paused to ${until.slice(0, 10)}` }); continue;
        }
      }

      // Touch 1 picks its variant from what we can prove about the lead; a lead
      // with no verified service can never receive the "we were in for X" claim.
      const template = touch === 1 ? step1For(lead) : STEPS[touch].body;
      const unsubUrl = unsubscribeUrl(camp.unsubscribe_url, email, camp.id, secret);
      const text = renderBody(template.replace(/\{\{sign_off\}\}/g, camp.rep_sign_off || repFirstName(rep)), lead);
      const subject = touch === 1
        ? renderBody(STEPS[1].subject, lead)
        : (lead.touches?.[0]?.subject ? `Re: ${String(lead.touches[0].subject).replace(/^re:\s*/i, '')}` : 'Re: following up');

      if (!confirm) {
        results.push({ email, touch, would_send: true, subject, preview: text.slice(0, 140) });
        continue;
      }

      const rootMsgId = touch > 1 && lead.root_message_id ? lead.root_message_id : null;
      const r = await sendEmail(token, {
        from: rep, to: email, subject, body: text,
        signatureHtml: (repSignature || '') + complianceFooter({ unsubUrl, postalAddress: camp.postal_address }),
        threadId: touch > 1 ? lead.thread_id : undefined,
        inReplyTo: rootMsgId, references: rootMsgId,
        extraHeaders: complianceHeaders({ unsubUrl, unsubMailto: camp.unsub_mailto || null }),
      });

      const touches = [...(lead.touches || []), { n: touch, sent_at: new Date().toISOString(), subject, body: text, message_id: r.id }];
      const patch = {
        touches, last_touch_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        status: touch >= LAST_TOUCH ? 'completed' : 'active',
        paused_until: null, paused_since_ms: null,
      };
      if (touch === 1) {
        patch.thread_id = r.threadId;
        const h = await getMessageHeaders(token, r.id).catch(() => null);
        patch.root_message_id = h?.messageIdHeader || null;
      }
      await sb.from('drip_leads').update(patch).eq('id', lead.id);

      sent += 1;
      domainToday[domain] = (domainToday[domain] || 0) + 1;
      results.push({ email, touch, sent: true });
      log(`${camp.slug}: sent touch ${touch} to ${email}`);

      if (sent < room) await sleep(Math.min(jitterMs(cap, camp), 45000));
    } catch (e) {
      console.error(`[drip] ${email}:`, e.message);
      results.push({ email, error: e.message });
    }
  }

  if (confirm && sent) {
    await slackPost('chat.postMessage', {
      channel: camp.slack_channel || '#sales',
      text: `Drip ${camp.slug}: sent ${sent} from ${rep}`,
      unfurl_links: false,
    });
  }

  return {
    campaign: camp.slug, rep, cap, sent,
    due: results.filter((r) => r.sent || r.would_send).length,
    halted: results.filter((r) => String(r.skip || '').startsWith('HALT')).length,
    results,
  };
}

const repFirstName = (e) => { const n = String(e).split('@')[0]; return n.charAt(0).toUpperCase() + n.slice(1); };

async function halt(sb, lead, status, reason) {
  await sb.from('drip_leads').update({ status, halted_reason: reason || null, updated_at: new Date().toISOString() }).eq('id', lead.id);
}

async function suppress(sb, email, kind) {
  await sb.from('crm_suppression').upsert(
    { email, reason: 'do_not_contact', source: 'drip-runner', detail: { kind, via: 'drip-halt' } },
    { onConflict: 'email' },
  );
}
