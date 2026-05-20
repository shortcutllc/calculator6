/**
 * Map a rep's Gmail address ↔ their Workhuman lead-CRM `assigned_to` name.
 *
 * Workhuman leads use full names ('Will Newton', 'Jaimie Pritchard', etc.) in
 * the assigned_to column; gmail_accounts uses email. Hardcoded for the
 * current 4-person team with a name-prefix heuristic fallback so a newcomer
 * connecting their Gmail still gets bucketed (matched against the same
 * canonical list). Returns null if no match — caller decides what to do.
 *
 * Also extracts the rep name from a Smartlead campaign_name like
 * "June 13, San Francisco - Will" so we can attribute legacy corpus sends
 * that pre-date sender_email tracking.
 */

const KNOWN = {
  'will@getshortcut.co': 'Will Newton',
  'jaimie@getshortcut.co': 'Jaimie Pritchard',
  'jaimiepr@shortcutcorpwellness.com': 'Jaimie Pritchard',
  'marc@getshortcut.co': 'Marc Levitan',
  'caren@getshortcut.co': 'Caren Skutch',
};

const CANONICAL = [
  { first: 'will', name: 'Will Newton' },
  { first: 'jaimie', name: 'Jaimie Pritchard' },
  { first: 'jaimiepr', name: 'Jaimie Pritchard' },
  { first: 'marc', name: 'Marc Levitan' },
  { first: 'caren', name: 'Caren Skutch' },
];

const lc = (s) => (s == null ? '' : String(s).trim().toLowerCase());

export function assigneeForGmail(email) {
  const e = lc(email);
  if (!e) return null;
  if (KNOWN[e]) return KNOWN[e];
  // Heuristic: match first-name prefix in the local part
  const local = e.split('@')[0];
  for (const { first, name } of CANONICAL) {
    if (local === first || local.startsWith(first + '.') || local.startsWith(first + '-')) return name;
  }
  return null;
}

/** Pull a rep first-name out of a Smartlead campaign_name (" - Will", "- Jaimie"). */
export function repFromCampaignName(campaignName) {
  if (!campaignName) return null;
  const m = String(campaignName).match(/[-–—]\s*(Will|Jaimie|Marc|Caren)\b/i);
  if (!m) return null;
  const first = m[1].toLowerCase();
  const hit = CANONICAL.find((x) => x.first === first);
  return hit ? hit.name : null;
}
