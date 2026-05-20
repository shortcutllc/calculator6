/**
 * Gmail + Google OAuth helpers (Phase 4B).
 *
 * Plain fetch against Google REST endpoints. No googleapis SDK on purpose
 * (lean, zero new deps). Tokens for each rep live in public.gmail_accounts
 * (service-role only). The frontend never sees a refresh token.
 *
 * Env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GMAIL_PUBSUB_TOPIC
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export const lc = (s) => (s == null ? null : String(s).trim().toLowerCase() || null);

/** Build the Google consent URL. state is an opaque, caller-signed string. */
export function buildAuthUrl(redirectUri, state) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',          // force refresh_token issuance every connect
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

/** Exchange an auth code for tokens. */
export async function exchangeCode(code, redirectUri) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const r = await fetch(TOKEN_URL, { method: 'POST', body });
  const j = await r.json();
  if (!r.ok) throw new Error(`token exchange failed: ${j.error_description || j.error || r.status}`);
  return j; // { access_token, refresh_token, expires_in, scope, token_type }
}

/**
 * Return a valid access token for `email`, refreshing (and persisting) if the
 * cached one is missing or within 60s of expiry. Throws if not connected.
 */
export async function getAccessToken(sb, email) {
  email = lc(email);
  const { data: acct } = await sb.from('gmail_accounts')
    .select('refresh_token, access_token, token_expiry').eq('email', email).maybeSingle();
  if (!acct) throw new Error(`No Gmail account connected for ${email}`);

  const stillValid = acct.access_token && acct.token_expiry
    && new Date(acct.token_expiry).getTime() - Date.now() > 60_000;
  if (stillValid) return acct.access_token;

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: acct.refresh_token,
    grant_type: 'refresh_token',
  });
  const r = await fetch(TOKEN_URL, { method: 'POST', body });
  const j = await r.json();
  if (!r.ok) throw new Error(`token refresh failed: ${j.error_description || j.error || r.status}`);

  const expiry = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString();
  await sb.from('gmail_accounts')
    .update({ access_token: j.access_token, token_expiry: expiry, updated_at: new Date().toISOString() })
    .eq('email', email);
  return j.access_token;
}

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The rep's Gmail signature for `fromEmail`. The Gmail API send endpoint does
 * NOT auto-append the web client's signature, so we fetch and add it. Returns
 * HTML string or null. Degrades silently (e.g. if the token lacks settings
 * read) — a missing signature must never block a send.
 */
export async function getSignature(accessToken, fromEmail) {
  try {
    const r = await fetch(`${GMAIL}/settings/sendAs`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const list = j.sendAs || [];
    const want = lc(fromEmail);
    const match = list.find((s) => lc(s.sendAsEmail) === want)
      || list.find((s) => s.isPrimary) || list[0];
    const sig = match?.signature?.trim();
    return sig ? sig : null;
  } catch {
    return null;
  }
}

/** RFC 2822 text/html message, base64url-encoded for messages.send. */
function buildRaw({ from, to, subject, bodyHtml }) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
  ];
  const mime = `${headers.join('\r\n')}\r\n\r\n${bodyHtml}`;
  return Buffer.from(mime, 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Send an email as the rep. `body` is the rep-approved plain text; it is
 * HTML-escaped and newline-converted. `signatureHtml` (already HTML, from
 * getSignature) is appended verbatim after a separator. Returns { id, threadId }.
 */
export async function sendEmail(accessToken, { from, to, subject, body, signatureHtml, threadId }) {
  const bodyHtml = escapeHtml(body).replace(/\r?\n/g, '<br>');
  const sigBlock = signatureHtml ? `<br><br>${signatureHtml}` : '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">${bodyHtml}${sigBlock}</div>`;
  const raw = buildRaw({ from, to, subject, bodyHtml: html });
  // threadId attaches the message to an existing Gmail thread (follow-ups).
  // Gmail also requires the subject to match the thread to keep it grouped.
  const payload = threadId ? { raw, threadId } : { raw };
  const r = await fetch(`${GMAIL}/messages/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`gmail send failed: ${j.error?.message || r.status}`);
  return j;
}

/** Arm Gmail push notifications to the configured Pub/Sub topic. */
export async function startWatch(accessToken) {
  const r = await fetch(`${GMAIL}/watch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topicName: process.env.GMAIL_PUBSUB_TOPIC,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'INCLUDE',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`gmail watch failed: ${j.error?.message || r.status}`);
  return j; // { historyId, expiration }
}

/** New inbound messages since startHistoryId. Metadata only (no body parsing). */
export async function listInboundSince(accessToken, startHistoryId) {
  const p = new URLSearchParams({
    startHistoryId: String(startHistoryId),
    historyTypes: 'messageAdded',
    labelId: 'INBOX',
  });
  const r = await fetch(`${GMAIL}/history?${p.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`gmail history failed: ${j.error?.message || r.status}`);

  const ids = new Set();
  for (const h of j.history || []) {
    for (const m of h.messagesAdded || []) {
      const msg = m.message;
      if (msg && (msg.labelIds || []).includes('INBOX') && !(msg.labelIds || []).includes('SENT')) {
        ids.add(msg.id);
      }
    }
  }

  const out = [];
  for (const id of ids) {
    const mr = await fetch(`${GMAIL}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mr.ok) continue;
    const mj = await mr.json();
    const hdr = (n) => (mj.payload?.headers || []).find((x) => x.name?.toLowerCase() === n)?.value || null;
    const fromRaw = hdr('from') || '';
    const m = fromRaw.match(/<([^>]+)>/);
    out.push({
      messageId: mj.id,
      threadId: mj.threadId,
      fromEmail: lc(m ? m[1] : fromRaw),
      subject: hdr('subject'),
      dateHeader: hdr('date'),
      internalDate: mj.internalDate ? new Date(Number(mj.internalDate)).toISOString() : null,
    });
  }
  return { messages: out, newHistoryId: j.historyId || startHistoryId };
}

// ----- Inbox-crawl helpers -----
// Gmail-search format: "in:sent after:YYYY/MM/DD". after: is inclusive day.
function gmailDate(d) {
  const y = d.getUTCFullYear(); const m = d.getUTCMonth() + 1; const day = d.getUTCDate();
  return `${y}/${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/** List sent message IDs since `sinceDate` (Date). Paginates. Caps at `max`. */
export async function listSentSince(accessToken, sinceDate, max = 500) {
  const q = `in:sent after:${gmailDate(sinceDate)} -in:chats`;
  const ids = []; let pageToken = '';
  while (ids.length < max) {
    const p = new URLSearchParams({ q, maxResults: String(Math.min(100, max - ids.length)) });
    if (pageToken) p.set('pageToken', pageToken);
    const r = await fetch(`${GMAIL}/messages?${p.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`gmail list sent failed: ${j.error?.message || r.status}`);
    for (const m of j.messages || []) ids.push(m.id);
    pageToken = j.nextPageToken || '';
    if (!pageToken) break;
  }
  return ids;
}

/** Metadata for one message — To/Cc/Subject/Date/Message-ID/Content-Type/Auto-Submitted headers + threadId + internalDate. */
export async function getMessageHeaders(accessToken, msgId) {
  const params = new URLSearchParams({ format: 'metadata' });
  for (const h of ['To', 'Cc', 'Subject', 'Date', 'From', 'Message-ID', 'Content-Type', 'Auto-Submitted', 'List-Unsubscribe']) {
    params.append('metadataHeaders', h);
  }
  const r = await fetch(`${GMAIL}/messages/${msgId}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  const hdr = (n) => (j.payload?.headers || []).find((x) => x.name?.toLowerCase() === n.toLowerCase())?.value || null;
  const parseAddresses = (raw) => {
    if (!raw) return [];
    return String(raw).split(',').map((s) => {
      const m = s.match(/<([^>]+)>/);
      return lc((m ? m[1] : s).trim());
    }).filter(Boolean);
  };
  return {
    id: j.id, threadId: j.threadId,
    internalDate: j.internalDate ? new Date(Number(j.internalDate)).toISOString() : null,
    labelIds: j.labelIds || [],
    from: lc((hdr('From') || '').match(/<([^>]+)>/)?.[1] || hdr('From')),
    to: parseAddresses(hdr('To')),
    cc: parseAddresses(hdr('Cc')),
    subject: hdr('Subject'),
    messageIdHeader: hdr('Message-ID'),
    contentType: hdr('Content-Type'),
    autoSubmitted: hdr('Auto-Submitted'),
    listUnsubscribe: hdr('List-Unsubscribe'),
  };
}

/** Fetch a thread (messages array w/ snippet + headers); used to find inbound replies on a sent thread. */
export async function getThread(accessToken, threadId) {
  const r = await fetch(`${GMAIL}/threads/${threadId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return null;
  return r.json();
}

/** Extract a readable body from a Gmail message payload (prefers text/plain, falls back to stripped html). */
export function bodyFromPayload(payload) {
  if (!payload) return '';
  const decode = (b64) => {
    if (!b64) return '';
    try { return Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'); } catch { return ''; }
  };
  const walk = (part) => {
    if (!part) return null;
    if (part.mimeType === 'text/plain' && part.body?.data) return decode(part.body.data);
    if (part.parts) {
      for (const p of part.parts) { const r = walk(p); if (r) return r; }
    }
    return null;
  };
  let txt = walk(payload);
  if (!txt) {
    // fallback: walk for text/html and strip
    const walkHtml = (part) => {
      if (!part) return null;
      if (part.mimeType === 'text/html' && part.body?.data) return decode(part.body.data);
      if (part.parts) { for (const p of part.parts) { const r = walkHtml(p); if (r) return r; } }
      return null;
    };
    txt = walkHtml(payload) || '';
  }
  return txt;
}
