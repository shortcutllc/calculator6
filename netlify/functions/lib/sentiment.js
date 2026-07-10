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

const DNC   = /\bunsubscribe\b|\bremove me\b|\btake (us|me) off\b|\bopt[- ]?out\b|\bdo not (contact|email|reach)\b|\bstop (emailing|contacting)\b|\bno longer\b.*\b(here|with)\b|\b(asked|requested) to be removed\b|\bremoved? (me )?from (your|the|any|all)? ?(mail|list|email)/i;
const OOO   = /\bout of (the )?office\b|\boutofoffice\b|\bautomatic(ally)? repl|\bauto[- ]?reply\b|\bon (leave|vacation|pto|holiday|annual leave)\b|\b(maternity|paternity|parental|medical|sick|annual) leave\b|\b(currently )?(away|unavailable)\b|\blimited access to (email|phone)\b|\breturn(ing)? (on|to the office)\b|\breturning \d|\bback (in the office|on)\b|\bupon my return\b|\bwhile i'?m (away|out)\b/i;
const NEG   = /\bnot interested\b|\bno,? thank|\bwe('| a)re all set\b|\ball set (here|for|on)\b|\bnot at this time\b|\bnot a (fit|priority|good time)\b|\bnot taking on new\b|\bno need\b|\bplease (stop|don'?t)\b|\bdecline|\bnot looking\b|\bpass on (this|it|that)\b|\b(going to|gonna|we'?ll|we will) pass\b|\bno interest\b|\b(do|does) not have (an? )?interest\b|\bdon'?t have (an? )?interest\b/i;
// POS broadened after the first live positive ("I would love to meet, can we set
// sometime?") fell through to neutral — graduate-replies only graduates positives.
const POS   = /\binterested\b|\b(would |i'?d )?love to (chat|connect|talk|meet|hear|learn)|\blet'?s (chat|connect|talk|set up|meet|find)|\bhappy to (chat|connect|hop|meet|talk)\b|\bwould like to (chat|connect|talk|meet|learn|hear)\b|\b(can|could|shall) we (chat|connect|talk|meet|set ?up|schedule|find a time)|\bsounds (good|great|interesting)\b|\bschedule a\b|\bset ?(up)? ?(a )?(call|time|meeting|something|sometime)\b|\bbook a\b|\btell me more\b|\bsend (me )?(more|info|the|a)\b|\bopen to (chat|connect|talk|meet|a call|learning)\b|\bwho'?s the right (person|contact)\b|\byes,? (let|i|we|please|happy)\b/i;
// SCHED — a prospect PROPOSING or ACCEPTING a time is the strongest positive
// signal, but it rarely uses a POS keyword ("How about Tuesday at 10?", "2pm
// works", "I'm free Thursday"). Missing one hides a ready-to-book reply from the
// rep's hot list, so this is tuned for recall. Safe because DNC/OOO/NEG are
// tested BEFORE this (an out-of-office "back Monday at 9am" is caught as OOO
// first), and cleanReply strips signatures/quoted history before we classify.
const SCHED = /\bhow about\b|\b(that|this|these|it|which|either) works?\b|\bworks? (for me|great|well|fine|for us)\b|\bi'?m (free|available|around|open|good)\b|\bi can do\b|\blet'?s do\b|\b(send|shoot|fire)\b[^.\n]{0,15}\binvite\b|\bcalendar (invite|link)\b|\b\d{1,2}:\d{2}\s?(a\.?m\.?|p\.?m\.?)?\b|\b\d{1,2}\s?(a\.?m\.?|p\.?m\.?)\b|\b(mon|tues|wednes|thurs|fri|satur|sun)day\b[^.\n]{0,18}\b(at|works?|morning|afternoon|good|free|before|after|\d|am|pm)\b|\bat\s\d{1,2}(:\d{2})?\s?(am|pm)?\b|\bnext week\b[^.\n]{0,18}\b(works?|good|free|morning|afternoon|before|after|\d)\b/i;
const LATER = /\b(circle back|reach back out|follow up|next (quarter|year)|in \d+ (weeks|months)|revisit)\b|\bnot right now\b|\bmaybe (later|in)\b|\bdown the (road|line)\b/i;

export function classify(text) {
  const s = (text || '').toLowerCase();
  if (!s) return { sentiment: null, suppress: false };
  if (DNC.test(s))   return { sentiment: 'negative',    suppress: true, reason: 'unsubscribe' };
  if (OOO.test(s))   return { sentiment: 'ooo',         suppress: false };
  if (NEG.test(s))   return { sentiment: 'negative',    suppress: true, reason: 'not_interested' };
  if (POS.test(s) || SCHED.test(s)) return { sentiment: 'positive', suppress: false };
  if (LATER.test(s)) return { sentiment: 'maybe_later', suppress: false };
  return { sentiment: 'neutral', suppress: false };
}

// Strip HTML, then cut quoted thread history (everything from the first
// "On … wrote:" / "From: …" boundary) so we classify only the new reply.
export function cleanReply(html) {
  let t = String(html || '')
    // drop non-content blocks ENTIRELY (tags + inner content)
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&#39;|&rsquo;/gi, "'").replace(/&quot;/gi, '"')
    // strip CSS/VML rules that leaked as plain text (Will 2026-07-09: Outlook VML
    // like "v\:* {behavior:url(#default#VML);}" + ".shape {…}" buried the real
    // message and scored a clear positive as neutral). Also @font-face etc.
    .replace(/(?:^|\n)\s*(?:@[\w-]+[^{}\n]*|[.#]?[\w\\:*-]+)\s*\{[^}]*\}/g, ' ');
  // cut everything past the actual message: quoted thread + legal/confidentiality footer.
  const cut = t.search(
    /\n?\s*(?:From:\s|On .+? wrote:|-{2,} ?Original Message|Sent from my |This (?:message|email|e-mail|communication|transmission)\b|CONFIDENTIAL|The information (?:contained )?in this)/i,
  );
  if (cut > 0) t = t.slice(0, cut);
  // cut a trailing sign-off + signature block ("Best,\nEric Sternberg | Office Manager\n<address>")
  const sig = t.search(/\n\s*(?:Best|Best regards|Kind regards|Regards|Warm regards|Warmly|Thanks|Thank you|Sincerely|Cheers)[,.!]?\s*(?:\n|$)/i);
  if (sig > 20) t = t.slice(0, sig);
  return t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}
