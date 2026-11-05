/**
 * Tells ops about a proposal to staff: a post in the event ops channel
 * (SLACK_WEBHOOK_URL_EVENT_OPS, where Pro agreement alerts already go) and a DM to each
 * person in OPS_ALERT_SLACK_USERS (emails, comma separated; default Pedro) from the Pro
 * bot (PRO_SLACK_BOT_TOKEN), so it reaches him wherever he is in Slack.
 *
 * Never throws. Returns how many places it reached, so a caller only records an alert
 * as sent when it actually went somewhere.
 */
const SLACK_API = 'https://slack.com/api';

function alertRecipients() {
  const list = (process.env.OPS_ALERT_SLACK_USERS || 'pedro@getshortcut.co')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return list;
}

async function postToChannel(text) {
  const url = process.env.SLACK_WEBHOOK_URL_EVENT_OPS;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, unfurl_links: false }),
    });
    return r.ok;
  } catch (e) {
    console.error('[ops-notify] channel post failed:', e.message);
    return false;
  }
}

async function dm(email, text) {
  const token = process.env.PRO_SLACK_BOT_TOKEN;
  if (!token) return false;
  try {
    // lookupByEmail takes a query parameter, not a JSON body (see cron-heartbeat-monitor).
    const lr = await fetch(`${SLACK_API}/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const u = await lr.json();
    if (!u.ok) {
      console.error('[ops-notify] lookup failed for', email, u.error);
      return false;
    }
    const post = async (method, body) =>
      (
        await fetch(`${SLACK_API}/${method}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      ).json();
    const c = await post('conversations.open', { users: u.user.id });
    if (!c.ok) {
      console.error('[ops-notify] conversations.open failed:', c.error);
      return false;
    }
    const m = await post('chat.postMessage', { channel: c.channel.id, text, unfurl_links: false });
    return !!m.ok;
  } catch (e) {
    console.error('[ops-notify] DM failed:', e.message);
    return false;
  }
}

export async function notifyOps(text) {
  const results = await Promise.all([postToChannel(text), ...alertRecipients().map((e) => dm(e, text))]);
  const [channel, ...dms] = results;
  return { channel, dms: dms.filter(Boolean).length, reached: results.filter(Boolean).length };
}
