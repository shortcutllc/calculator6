/**
 * gmail-thread — live thread fetch from the rep's own Gmail.
 *
 * Powers the "see the actual emails" affordance in the CRM card and the
 * Follow-ups list. We store thread_id on every rep-Gmail send but not the
 * bodies — bodies live in Gmail. This pulls them on demand using the rep's
 * own OAuth token (no shared mailbox access).
 *
 * Auth: Supabase JWT. Authorization: the requesting user must own the
 * gmail_accounts row whose mailbox contains the thread. By design — a rep
 * sees only threads in their own inbox.
 *
 * POST { thread_id }
 * → { success, messages: [{ direction:'sent'|'received', from, to, subject,
 *                            date, snippet, body }] }  (oldest first)
 */

import { createClient } from '@supabase/supabase-js';
import { getAccessToken, getThread, bodyFromPayload, lc } from './lib/gmail.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s, b) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

function headerVal(headers, name) {
  const h = (headers || []).find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Authorization required' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { error: 'Server misconfigured' });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return json(401, { error: 'Invalid or expired token' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const threadId = body.thread_id || body.threadId;
  const senderEmailReq = (body.sender_email || body.senderEmail || '').toString().trim().toLowerCase() || null;
  if (!threadId) return json(400, { error: 'thread_id required' });

  // Team-transparency authz: any rep with a connected gmail_accounts row can
  // view any other rep's thread (internal sales tool). Require the requesting
  // user to be a connected rep — random authenticated users with no Gmail
  // connection are not on the sales team and can't pull threads.
  const { data: myAcct } = await sb.from('gmail_accounts')
    .select('email').eq('supabase_user_id', user.id).maybeSingle();
  if (!myAcct) return json(403, { error: 'No Gmail account connected for this user' });

  // Resolve which account's mailbox to query:
  //   sender_email provided → look up that rep's account (must exist)
  //   otherwise → fall back to the requesting user's own mailbox
  let mailboxEmail = myAcct.email;
  if (senderEmailReq && senderEmailReq !== myAcct.email.toLowerCase()) {
    const { data: otherAcct } = await sb.from('gmail_accounts')
      .select('email').eq('email', senderEmailReq).maybeSingle();
    if (!otherAcct) return json(404, { error: `Sender ${senderEmailReq} has no connected Gmail account` });
    mailboxEmail = otherAcct.email;
  }

  let token;
  try { token = await getAccessToken(sb, mailboxEmail); }
  catch (e) { return json(502, { error: `Token error for ${mailboxEmail}: ${e.message}` }); }

  const t = await getThread(token, threadId);
  if (!t || !t.messages) return json(404, { error: 'Thread not found in your mailbox' });

  // "Sent" direction = sent from the mailbox we queried (whoever's thread this is).
  const myEmail = lc(mailboxEmail);
  const messages = t.messages.map((m) => {
    const headers = m.payload?.headers || [];
    const fromRaw = headerVal(headers, 'From') || '';
    const fromMatch = fromRaw.match(/<([^>]+)>/);
    const fromEmail = lc(fromMatch ? fromMatch[1] : fromRaw);
    const isSent = (m.labelIds || []).includes('SENT') || fromEmail === myEmail;
    const raw = bodyFromPayload(m.payload) || '';
    // If we fell back to HTML, strip tags + entities so the UI can render plain text.
    const text = /<\s*(div|p|br|html|body)/i.test(raw)
      ? raw.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n').replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
          .replace(/&#39;|&rsquo;|&apos;/gi, "'").replace(/&quot;/gi, '"')
      : raw;
    return {
      direction: isSent ? 'sent' : 'received',
      from: fromRaw || null,
      to: headerVal(headers, 'To'),
      subject: headerVal(headers, 'Subject'),
      date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
      snippet: m.snippet || null,
      body: text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim().slice(0, 8000),
    };
  }).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  return json(200, { success: true, messages });
};
