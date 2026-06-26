/**
 * campaign-config.mjs — canonical Smartlead cold-campaign config.
 *
 * Single source for HOW a cold campaign is configured and WHICH inboxes send it.
 * Extracted from create_post_event_campaigns.js (the most recent launcher, May
 * 2026) so the cold engine never re-derives it wrong.
 *
 * HARD LESSON (do not relearn): only TWO domains may send. The prior 20-account
 * pool included @shortcutcorporate.com and @shortcutemployeewellness.com, which
 * were BURNED. On 2026-05-06 those 10 wrong accounts were ripped out of live
 * campaigns. Never add them back.
 */

// The only domains allowed to send cold. (Will, 2026-06-25.)
export const SENDING_DOMAINS = ['getshortcutcorporate.com', 'shortcutcorpwellness.com'];

// NEVER send from these — burned. Kept here as a guardrail, not a config.
export const BURNED_DOMAINS = ['shortcutcorporate.com', 'shortcutemployeewellness.com'];

// Known account IDs on the two good domains (snapshot — the resolver below
// fetches the live set so new mailboxes are picked up automatically; this is the
// fallback + sanity reference).
export const KNOWN_SENDER_IDS = {
  'getshortcutcorporate.com': [16621160, 16621098, 16590920, 16590865, 16590862], // Caren
  'shortcutcorpwellness.com': [16591001, 16590968, 16590955, 16590930, 16590693], // Jaimie
};
export const KNOWN_SENDER_IDS_FLAT = Object.values(KNOWN_SENDER_IDS).flat();

// Per-inbox daily send cap (deliverability). 10 inboxes × 25 ≈ the historical
// 250/day. Schedule's max_new_leads_per_day is derived from this × pool size.
export const PER_INBOX_PER_DAY = 25;

// Schedule: Tue/Wed/Thu mornings ET only. Skip Mon (volume tsunami) and Fri
// (dead reply day). 15 min between sends.
export function campaignSchedule(senderCount = KNOWN_SENDER_IDS_FLAT.length) {
  return {
    timezone: 'America/New_York',
    days_of_the_week: [2, 3, 4],
    start_hour: '09:00',
    end_hour: '12:00',
    min_time_btw_emails: 15,
    max_new_leads_per_day: Math.max(1, senderCount) * PER_INBOX_PER_DAY,
  };
}

// Settings: tracking OFF (deliverability — no pixels/link wrapping on cold),
// AI ESP matching ON, stop the lead on any reply, full follow-ups.
export const CAMPAIGN_SETTINGS = {
  track_settings: ['DONT_TRACK_EMAIL_OPEN', 'DONT_TRACK_LINK_CLICK'],
  enable_ai_esp_matching: true,
  stop_lead_settings: 'REPLY_TO_AN_EMAIL',
  send_as_plain_text: false,
  follow_up_percentage: 100,
};

const domainOf = (email) => String(email || '').toLowerCase().split('@')[1] || '';

/**
 * Resolve the LIVE set of sender account IDs for the two good domains by asking
 * Smartlead, so "all accounts for these domains" stays true as the pool changes.
 * Falls back to KNOWN_SENDER_IDS_FLAT if the API call fails. Never returns a
 * burned-domain account.
 *
 * @param {string} apiKey  Smartlead API key
 * @param {Function} [fetchImpl]  injectable for tests (defaults to global fetch)
 */
export async function resolveSenderIds(apiKey, fetchImpl = fetch) {
  const BASE = 'https://server.smartlead.ai/api/v1';
  try {
    const ids = [];
    const seen = new Set();
    for (let offset = 0; offset < 2000; offset += 100) {
      const r = await fetchImpl(`${BASE}/email-accounts/?api_key=${apiKey}&offset=${offset}&limit=100`);
      if (!r.ok) throw new Error(`email-accounts ${r.status}`);
      const page = await r.json();
      const rows = Array.isArray(page) ? page : (page.data || []);
      if (!rows.length) break;
      for (const a of rows) {
        const dom = domainOf(a.from_email || a.email);
        if (SENDING_DOMAINS.includes(dom) && !BURNED_DOMAINS.includes(dom) && a.id && !seen.has(a.id)) {
          seen.add(a.id); ids.push(a.id);
        }
      }
      if (rows.length < 100) break;
    }
    if (ids.length) return { ids, source: 'live' };
    return { ids: KNOWN_SENDER_IDS_FLAT, source: 'fallback_empty' };
  } catch (e) {
    return { ids: KNOWN_SENDER_IDS_FLAT, source: `fallback_${e.message}` };
  }
}
