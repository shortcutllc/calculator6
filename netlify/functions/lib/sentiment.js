/**
 * Shared reply-content classifier — single source of truth so the Smartlead
 * backfill (scripts/enrich-replies.mjs), the Gmail-pubsub reply tracker, and
 * the inbox-crawl all classify identically. Order is load-bearing:
 *
 *   DNC  -> OOO  -> NEG  -> POS  -> LATER  -> neutral
 *
 * OOO before pos/neg kills long autoreply signatures that would otherwise
 * false-match "yes/schedule" in the footer. Manual labels (sentiment_source
 * = 'manual') must never be overwritten by callers.
 */

const DNC   = /\bunsubscribe\b|\bremove me\b|\btake me off\b|\bopt[- ]?out\b|\bdo not (contact|email|reach)\b|\bstop (emailing|contacting)\b|\bno longer\b.*\b(here|with)\b/i;
const OOO   = /\bout of (the )?office\b|\boutofoffice\b|\bautomatic(ally)? repl|\bauto[- ]?reply\b|\bon (leave|vacation|pto|holiday|annual leave)\b|\bannual leave\b|\b(currently )?(away|unavailable)\b|\blimited access to (email|phone)\b|\breturn(ing)? (on|to the office)\b|\bback (in the office|on)\b|\bupon my return\b|\bwhile i'?m (away|out)\b/i;
const NEG   = /\bnot interested\b|\bno,? thank|\bwe('| a)re all set\b|\ball set (here|for|on)\b|\bnot at this time\b|\bnot a (fit|priority|good time)\b|\bnot taking on new\b|\bno need\b|\bplease (stop|don'?t)\b|\bdecline|\bnot looking\b/i;
const POS   = /\binterested\b|\blet'?s (chat|connect|talk|set up)|\bhappy to (chat|connect|hop|meet)\b|\bsounds (good|great|interesting)\b|\bschedule a\b|\bset up a (call|time|meeting)\b|\bbook a\b|\btell me more\b|\bwho'?s the right (person|contact)\b|\byes,? (let|i|we|please|happy)\b/i;
const LATER = /\b(circle back|reach back out|follow up|next (quarter|year)|in \d+ (weeks|months)|revisit)\b|\bnot right now\b|\bmaybe (later|in)\b|\bdown the (road|line)\b/i;

export function classify(text) {
  const s = (text || '').toLowerCase();
  if (!s) return { sentiment: null, suppress: false };
  if (DNC.test(s))   return { sentiment: 'negative',    suppress: true, reason: 'unsubscribe' };
  if (OOO.test(s))   return { sentiment: 'ooo',         suppress: false };
  if (NEG.test(s))   return { sentiment: 'negative',    suppress: true, reason: 'not_interested' };
  if (POS.test(s))   return { sentiment: 'positive',    suppress: false };
  if (LATER.test(s)) return { sentiment: 'maybe_later', suppress: false };
  return { sentiment: 'neutral', suppress: false };
}

// Strip HTML, then cut quoted thread history (everything from the first
// "On … wrote:" / "From: …" boundary) so we classify only the new reply.
export function cleanReply(html) {
  let t = String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&#39;|&rsquo;/gi, "'").replace(/&quot;/gi, '"');
  const cut = t.search(/\n?\s*(From:\s|On .+? wrote:|-{2,} ?Original Message|Sent from my )/i);
  if (cut > 0) t = t.slice(0, cut);
  return t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}
