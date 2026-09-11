/**
 * nurture-config.mjs — config for WARM nurture campaigns sent from a rep's own
 * @getshortcut.co mailbox.
 *
 * This is deliberately SEPARATE from campaign-config.mjs. That file governs COLD
 * sending and hard-restricts senders to the two sacrificial domains
 * (getshortcutcorporate.com / shortcutcorpwellness.com). Nurture is the opposite
 * case: known contacts, a rep's real mailbox, on the PRIMARY domain.
 *
 * Because it IS the primary domain, the guardrails are tighter, not looser:
 *   - one mailbox per campaign, never a pool (the email claims to be from a person)
 *   - 15 sends per day, matching the cap already set on the mailbox in Smartlead
 *   - stop the lead on any reply
 *   - no open tracking, no link wrapping
 * A hard bounce here costs the domain that carries proposals and invoices, so the
 * lead gate below is about DELIVERABILITY EVIDENCE, not Apollo provenance.
 */

// The three rep mailboxes, resolved live from Smartlead 2026-09-10.
export const REP_MAILBOXES = {
  marc:   { email: 'marc@getshortcut.co',   account_id: 12656201, from_name: 'Marc Levitan',    sign_off: 'Marc' },
  caren:  { email: 'caren@getshortcut.co',  account_id: 16586489, from_name: 'Caren Skutch',    sign_off: 'Caren' },
  jaimie: { email: 'jaimie@getshortcut.co', account_id: 174933,   from_name: 'Jaimie Pritchard', sign_off: 'Jaimie' },
};

// Note the spelling: the mailbox is jaimie@, not jamie@.
export const REPS = Object.keys(REP_MAILBOXES);

export const PER_INBOX_PER_DAY = 15;

/** Tue/Wed/Thu mornings ET. Same rationale as cold: skip Mon and Fri. */
export function nurtureSchedule() {
  return {
    timezone: 'America/New_York',
    days_of_the_week: [2, 3, 4],
    start_hour: '09:00',
    end_hour: '12:00',
    min_time_btw_emails: 15,
    max_new_leads_per_day: PER_INBOX_PER_DAY,
  };
}

/**
 * send_as_plain_text is FALSE on purpose. The copy carries two real hyperlinks
 * (the site and the campaign page); Smartlead's plain-text conversion drops the
 * href and leaves bare anchor text, so the links would silently die. The body we
 * send is bare <p>/<a> with no template, no images and no tracking, which renders
 * in the inbox exactly like a message typed in Gmail. Flip to true only if you
 * also convert the links to visible URLs.
 */
export const NURTURE_SETTINGS = {
  track_settings: ['DONT_TRACK_EMAIL_OPEN', 'DONT_TRACK_LINK_CLICK'],
  stop_lead_settings: 'REPLY_TO_AN_EMAIL',
  send_as_plain_text: false,
  enable_ai_esp_matching: false,
  follow_up_percentage: 100,
};

/**
 * Lead gate for nurture. The cold gate (verifiedOnly in smartlead-launch.mjs)
 * demands Apollo provenance plus MillionVerifier 'ok', which is right for guessed
 * cold addresses and wrong here: these contacts are known, and most will carry no
 * MV field at all. What matters on the primary domain is evidence the address is
 * real, so accept ANY of:
 *   - prior successful delivery to this address (delivered_before)
 *   - an existing client / booking relationship (is_client)
 *   - a positive verifier result, if one happens to be present
 * and reject anything explicitly known bad.
 */
export function nurtureVerified(leads) {
  return (leads || []).filter((l) => {
    const cf = l.custom_fields || {};
    const mv = cf.mv ?? l.mv_status;
    const bb = cf.bb ?? l.bounceban_status;
    if (mv === 'invalid' || bb === 'undeliverable') return false;
    if (l.suppressed || cf.suppressed) return false;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(l.email || ''))) return false;
    const delivered = l.delivered_before ?? cf.delivered_before;
    const client = l.is_client ?? cf.is_client;
    return Boolean(delivered) || Boolean(client) || mv === 'ok' || bb === 'deliverable';
  });
}
