// Browsers our own team uses, so a teammate opening a client's proposal link
// is not logged (or pinged to Slack) as the client viewing it.
//
// A browser is marked the first time a getshortcut.co account has a session
// on it, and the mark stays after sign-out, so a teammate checking a proposal
// while logged out is still not counted. A private window keeps nothing, so a
// teammate in one counts as a client unless they log in there.
const STAFF_DEVICE_KEY = 'shortcut_staff_device';
const STAFF_EMAIL_DOMAIN = '@getshortcut.co';

export function markStaffDevice(email: string | null | undefined): void {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(STAFF_EMAIL_DOMAIN)) return;
  try {
    localStorage.setItem(STAFF_DEVICE_KEY, normalized);
  } catch {
    // Storage blocked (some privacy modes): nothing to remember.
  }
}

export function isStaffDevice(): boolean {
  try {
    return !!localStorage.getItem(STAFF_DEVICE_KEY);
  } catch {
    return false;
  }
}
