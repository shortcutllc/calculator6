/**
 * Shared per-contact outreach history (sends + replies w/ content/sentiment).
 *
 * One source of truth so the draft modal (draft-outreach) and the standalone
 * CRM card (contact-card) can't drift. Read-only. Reply text is untrusted
 * inbound content — callers must treat it as quoted data, never instructions.
 */

export async function contactHistory(sb, email) {
  const base = { email, emailed_count: 0, first_sent: null, last_sent: null, replied: false, sends: [], replies: [] };
  if (!email) return base;
  try {
    const { data: sends } = await sb.from('outreach_sends')
      .select('campaign_id, sent_time, reply_time, is_bounced, touch_count, sender_email, thread_id, message_id')
      .eq('email', email).order('sent_time', { ascending: true });
    const { data: reps } = await sb.from('outreach_replies')
      .select('campaign_id, reply_date, reply_content, reply_sentiment, is_ooo, manual_category, sentiment_source')
      .eq('email', email).order('reply_date', { ascending: true });
    const s = sends || [];
    const r = reps || [];
    return {
      email,
      emailed_count: s.reduce((n, x) => n + (x.touch_count || 1), 0),
      first_sent: s[0]?.sent_time || null,
      last_sent: s.length ? s[s.length - 1].sent_time : null,
      replied: r.length > 0 || s.some((x) => x.reply_time),
      sends: s.map((x) => ({ campaign_id: x.campaign_id, sent_time: x.sent_time, replied: !!x.reply_time, bounced: !!x.is_bounced, touches: x.touch_count || 1, sender_email: x.sender_email || null, thread_id: x.thread_id || null, message_id: x.message_id || null })),
      replies: r.map((x) => ({
        date: x.reply_date,
        sentiment: x.reply_sentiment || x.manual_category || null,
        is_ooo: !!x.is_ooo,
        source: x.sentiment_source,
        campaign_id: x.campaign_id || null,
        // A reply is "cold" if it came via a Smartlead campaign (numeric id).
        // gmail-sent-crawl* ids are warm 1:1 threads, not cold-sequence replies.
        cold: /^[0-9]+$/.test(String(x.campaign_id || '')),
        content: x.reply_content ? String(x.reply_content).slice(0, 1500) : null,
      })),
    };
  } catch {
    return base;
  }
}
