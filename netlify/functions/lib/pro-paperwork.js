/**
 * Each Pro's paperwork and orientation, as the staffing dashboard shows them: moved
 * from ops-api.js (Nov 2026) so the AI's find_pros tool shows the same badges.
 */
import { queryParse } from './parse-admin.js';

// ---- Paperwork and orientation (Will, Nov 2026) ---------------------------------------
// Each Pro shows whether they've signed the two DocuSeal packs sent from /pro-agreements:
// the contractor agreement ("Shortcut Onboarding Docs", document_type 'ica') and the
// workers' comp waiver ('workers_comp'). Agreements only know the Pro by email, so they
// are matched on it (lower-cased, trimmed). Orientation is assumed done for any Pro who
// has worked an event before; a Pro with none yet is new and needs one.

const STATUS_RANK = { completed: 5, opened: 4, sent: 3, awaiting: 3, pending: 2, declined: 1, expired: 1 };
const shownStatus = (s) => (s === 'completed' ? 'signed' : s === 'awaiting' ? 'sent' : s || null);

const normName = (n) => String(n || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();

// Keyed by email, and by name as a fallback: a few Pros signed with a different email
// from the one on their Pro account (6 of 59 signed, Nov 2026).
export async function agreementsByEmail(supabase) {
  const map = new Map();
  const { data, error } = await supabase
    .from('pro_agreements')
    .select('pro_email, pro_name, status, completed_at, created_at, pro_agreement_templates(document_type)')
    .limit(5000);
  if (error) {
    console.error('[ops-api] agreements', error.message);
    return map;
  }
  const add = (key, docKey, row) => {
    const entry = map.get(key) || { contractor: null, workersComp: null };
    const current = entry[docKey];
    const rank = STATUS_RANK[row.status] || 0;
    if (!current || rank > current.rank) entry[docKey] = { rank, status: row.status };
    map.set(key, entry);
  };
  for (const row of data || []) {
    const type = row.pro_agreement_templates && row.pro_agreement_templates.document_type;
    const docKey = type === 'ica' ? 'contractor' : type === 'workers_comp' ? 'workersComp' : null;
    if (!docKey) continue;
    const email = String(row.pro_email || '').trim().toLowerCase();
    if (email) add(email, docKey, row);
    const name = normName(row.pro_name);
    if (name.includes(' ')) add(`name:${name}`, docKey, row);
  }
  return map;
}

export function agreementsFor(index, email, fullName) {
  const entry =
    index.get(String(email || '').trim().toLowerCase()) || index.get(`name:${normName(fullName)}`);
  return {
    contractor: entry && entry.contractor ? shownStatus(entry.contractor.status) : null,
    workersComp: entry && entry.workersComp ? shownStatus(entry.workersComp.status) : null,
  };
}

export function withPaperwork(pro, index) {
  if (!pro) return pro;
  const worked = (pro.numCompletedEvents || 0) > 0 || (pro.eventsLast365 || 0) > 0;
  return { ...pro, agreements: agreementsFor(index, pro.email, pro.fullName), orientation: worked ? 'done' : 'new' };
}

// Seats carry only the Pro's id and name: look up their email and event count.
export async function seatsWithPaperwork(events, index) {
  const ids = Array.from(
    new Set(events.flatMap((e) => (e.seats || []).filter((s) => !s.placeholder).map((s) => s.barberID)))
  );
  const byID = new Map();
  for (let i = 0; i < ids.length; i += 500) {
    try {
      const rows = await queryParse('Barber', {
        where: { objectId: { $in: ids.slice(i, i + 500) } },
        keys: ['email', 'numCompletedEvents'],
        limit: 500,
      });
      rows.forEach((r) => byID.set(r.objectId, r));
    } catch (e) {
      console.error('[ops-api] seat Pros', e.message);
    }
  }
  return events.map((e) => ({
    ...e,
    seats: (e.seats || []).map((seat) => {
      if (seat.placeholder) return seat;
      const pro = byID.get(seat.barberID);
      if (!pro) return seat;
      return {
        ...seat,
        agreements: agreementsFor(index, pro.email, seat.fullName),
        orientation: (pro.numCompletedEvents || 0) > 0 ? 'done' : 'new',
      };
    }),
  }));
}
