import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Search, Send, RefreshCw, MessageSquare, UserPlus, Users, ExternalLink, Check } from 'lucide-react';
import {
  ops,
  OpsEvent,
  OpsGroup,
  OpsOutcome,
  OpsOutreach,
  OpsPro,
  OpsProposal,
  OpsRecipient,
  PRO_TYPES,
  SKIP_REASON_TEXT,
} from '../../services/opsService';
import {
  cityFrom,
  dayLabel,
  eventAddress,
  eventDay,
  eventHours,
  eventYmd,
  outreachTemplate,
  shortDate,
  staffedCount,
  ymd,
} from './opsFormat';

// One thing Pedro is staffing: a service on a date at a place, and the coordinator
// event it belongs to once there is one.
interface Spot {
  key: string;
  label: string;
  proType: string;
  service: string;
  day: string;
  hours: string;
  address: string;
  coordinates: { latitude: number; longitude: number } | null;
  numPros: number;
  event: OpsEvent | null;
}

export interface StaffTarget {
  proposal?: OpsProposal;
  event?: OpsEvent;
}

function spotsFor(target: StaffTarget): Spot[] {
  const spots: Spot[] = [];
  if (target.proposal) {
    const events = target.proposal.events;
    target.proposal.needs.forEach((need, ni) => {
      const event = events.find((e) => eventYmd(e) === ymd(need.date)) || (events.length === 1 ? events[0] : null);
      need.services.forEach((svc, si) => {
        spots.push({
          key: `${ni}-${si}`,
          label: `${svc.title} on ${dayLabel(need.date)}, ${need.location}`,
          proType: svc.proType || 'Massage',
          service: svc.title,
          day: event ? eventDay(event) : dayLabel(need.date),
          hours: event ? eventHours(event) : '',
          address: event ? eventAddress(event) || need.address : need.address,
          coordinates: event?.address.coordinates || null,
          numPros: svc.numPros,
          event,
        });
      });
    });
  } else if (target.event) {
    const e = target.event;
    const seatType = e.seats.find((s) => s.proType)?.proType;
    spots.push({
      key: 'event',
      label: `${e.name} on ${eventDay(e)}`,
      proType: seatType || 'Massage',
      service: seatType || 'Wellness',
      day: eventDay(e),
      hours: eventHours(e),
      address: eventAddress(e),
      coordinates: e.address.coordinates,
      numPros: e.numBarbersRequired,
      event: e,
    });
  }
  return spots;
}

const OUTCOME_STYLE: Record<OpsOutcome, string> = {
  yes: 'bg-green-600 text-white',
  maybe: 'bg-amber-500 text-white',
  no: 'bg-gray-700 text-white',
};

export const StaffPanel: React.FC<{ target: StaffTarget; onClose: () => void; onChanged: () => void }> = ({
  target,
  onClose,
  onChanged,
}) => {
  const spots = useMemo(() => spotsFor(target), [target]);
  const [spotKey, setSpotKey] = useState(spots[0]?.key || '');
  const spot = spots.find((s) => s.key === spotKey) || spots[0];
  const [proType, setProType] = useState(spot?.proType || 'Massage');
  const [radius, setRadius] = useState(30);
  const [tab, setTab] = useState<'pros' | 'sent'>('pros');

  const [pros, setPros] = useState<OpsPro[]>([]);
  const [groups, setGroups] = useState<OpsGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const [event, setEvent] = useState<OpsEvent | null>(spot?.event || null);

  const proposalID = target.proposal?.id;
  const eventID = event?.id || spot?.event?.id;

  useEffect(() => {
    if (!spot) return;
    setProType(spot.proType);
    setEvent(spot.event);
    setMessage(
      outreachTemplate({
        service: spot.service,
        city: cityFrom(spot.address) || spot.address,
        day: spot.day,
        hours: spot.hours,
        address: spot.address,
      })
    );
  }, [spot]);

  const loadRoster = useCallback(async () => {
    if (!spot) return;
    setLoading(true);
    setError('');
    try {
      const [roster, g] = await Promise.all([
        ops.roster({
          coordinates: spot.coordinates || undefined,
          addressString: spot.coordinates ? undefined : spot.address,
          proTypes: [proType],
          radiusMiles: radius,
        }),
        ops.groups(),
      ]);
      setPros(roster.pros);
      setGroups(g.groups);
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
      setPros([]);
    } finally {
      setLoading(false);
    }
  }, [spot, proType, radius]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const matchingGroups = groups.filter((g) => !g.proType || g.proType === proType);
  const textable = (p: OpsPro) => p.hasPhone && !p.optedOut;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectWhere = (pred: (p: OpsPro) => boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      pros.filter((p) => textable(p) && pred(p)).forEach((p) => next.add(p.id));
      return next;
    });

  const send = async () => {
    if (!spot || !selected.size) return;
    setSending(true);
    setError('');
    try {
      const res = await ops.send({
        barberIDs: Array.from(selected),
        message,
        label: `${target.proposal?.clientName || event?.name || 'Event'}: ${spot.service}, ${spot.day}`,
        eventID: eventID || undefined,
        proposalID: proposalID || undefined,
      });
      const skipped = res.skipped.length ? ` ${res.skipped.length} skipped.` : '';
      setNotice(`Texting ${res.numQueued} Pro${res.numQueued === 1 ? '' : 's'} now.${skipped}`);
      setSelected(new Set());
      setConfirming(false);
      setTab('sent');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (!spot) {
    return (
      <Drawer onClose={onClose} title="Find Pros">
        <p className="text-text-dark">There is nothing on this proposal to staff yet.</p>
      </Drawer>
    );
  }

  return (
    <Drawer onClose={onClose} title={target.proposal?.clientName || event?.name || 'Find Pros'}>
      {/* What we're staffing */}
      <div className="space-y-3">
        {spots.length > 1 && (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-text-dark-60">Staffing</span>
            <select
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-text-dark"
              value={spot.key}
              onChange={(e) => setSpotKey(e.target.value)}
            >
              {spots.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} ({s.numPros} Pro{s.numPros === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="rounded-2xl bg-neutral-light-gray px-4 py-3 text-sm text-text-dark">
          <div className="font-bold text-shortcut-blue">
            {spot.service}: {spot.numPros} Pro{spot.numPros === 1 ? '' : 's'} needed
          </div>
          <div>
            {spot.day}
            {spot.hours ? `, ${spot.hours}` : ''}
          </div>
          <div>{spot.address}</div>
        </div>
        {event ? <EventSeats event={event} /> : (
          <p className="text-sm text-text-dark">
            No coordinator event yet. Create it from the Admin page, and its seats show here so you can put Pros on it.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2 border-b border-gray-200">
        {(['pros', 'sent'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold ${
              tab === t ? 'border-shortcut-blue text-shortcut-blue' : 'border-transparent text-text-dark-60'
            }`}
          >
            {t === 'pros' ? 'Pros nearby' : 'Texts sent'}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-900">
          <Check size={16} className="text-green-700" />
          {notice}
        </div>
      )}
      {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {tab === 'pros' ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-text-dark-60">Service</span>
              <select
                className="mt-1 block rounded-xl border border-gray-300 px-3 py-2 text-sm text-text-dark"
                value={proType}
                onChange={(e) => setProType(e.target.value)}
              >
                {PRO_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-text-dark-60">Within</span>
              <select
                className="mt-1 block rounded-xl border border-gray-300 px-3 py-2 text-sm text-text-dark"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                {[10, 20, 30, 50, 75, 100].map((r) => (
                  <option key={r} value={r}>
                    {r} miles
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={loadRoster}
              className="inline-flex items-center gap-1 rounded-full border-2 border-[#9EFAFF] px-4 py-2 text-xs font-bold text-[#09364f]"
            >
              <Search size={14} /> Search again
            </button>
          </div>

          {/* Quick picks */}
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickPick onClick={() => selectWhere((p) => p.eventsLast90 > 0)}>Worked in the last 90 days</QuickPick>
            {matchingGroups.flatMap((g) =>
              [1, 2, 3].map((tier) => {
                const n = pros.filter((p) => textable(p) && p.groups.some((m) => m.groupID === g.id && m.tier === tier)).length;
                return n ? (
                  <QuickPick
                    key={`${g.id}-${tier}`}
                    onClick={() => selectWhere((p) => p.groups.some((m) => m.groupID === g.id && m.tier === tier))}
                  >
                    {g.name}: Tier {tier} ({n})
                  </QuickPick>
                ) : null;
              })
            )}
            {selected.size > 0 && <QuickPick onClick={() => setSelected(new Set())}>Clear ({selected.size})</QuickPick>}
          </div>

          <div className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200">
            {loading && <div className="p-4 text-sm text-text-dark-60">Finding Pros...</div>}
            {!loading && !pros.length && (
              <div className="p-4 text-sm text-text-dark">
                No {proType.toLowerCase()} Pros within {radius} miles. Try a wider search, or add new Pros from your lists.
              </div>
            )}
            {!loading &&
              pros.map((p) => (
                <ProRow
                  key={p.id}
                  pro={p}
                  checked={selected.has(p.id)}
                  disabled={!textable(p)}
                  onToggle={() => toggle(p.id)}
                  event={event}
                  onPut={async (replaceID) => {
                    if (!event) return;
                    try {
                      const res = await ops.putOnEvent(event.id, p.id, replaceID);
                      if (res.event) setEvent(res.event);
                      setNotice(`${p.fullName} is on ${event.name}.`);
                      onChanged();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
              ))}
          </div>

          {/* Add selected to a group */}
          {selected.size > 0 && (
            <AddToGroup
              groups={matchingGroups}
              onAdd={async (groupID, tier) => {
                try {
                  await ops.setGroupMembers(
                    groupID,
                    Array.from(selected).map((barberID) => ({ barberID, tier }))
                  );
                  setNotice(`Added ${selected.size} to the group.`);
                  loadRoster();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          )}

          {/* Message */}
          <div className="sticky bottom-0 mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-text-dark-60">
                Text from the Pros line (888) 573-6871. {'{firstName}'} becomes each Pro's name.
              </span>
              <textarea
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-text-dark"
                rows={4}
                value={message}
                maxLength={1000}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            {confirming ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-text-dark">
                  Text {selected.size} Pro{selected.size === 1 ? '' : 's'} now?
                </span>
                <button
                  onClick={send}
                  disabled={sending}
                  className="inline-flex items-center gap-1 rounded-full bg-[#09364f] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Send size={14} /> {sending ? 'Sending...' : 'Yes, send'}
                </button>
                <button onClick={() => setConfirming(false)} className="px-3 py-2 text-xs font-bold text-text-dark">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                disabled={!selected.size || !message.trim()}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#9EFAFF] px-5 py-2.5 text-sm font-bold text-[#09364f] disabled:opacity-40"
              >
                <Send size={15} /> Text {selected.size || ''} Pro{selected.size === 1 ? '' : 's'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <SentTexts
          proposalID={proposalID}
          eventID={proposalID ? undefined : eventID}
          event={event}
          onEvent={(e) => {
            setEvent(e);
            onChanged();
          }}
          onError={setError}
        />
      )}
    </Drawer>
  );
};

const Drawer: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
    <div
      className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-2xl font-extrabold text-shortcut-blue">{title}</h2>
        <button onClick={onClose} className="rounded-full p-2 text-text-dark hover:bg-gray-100" aria-label="Close">
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const QuickPick: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-text-dark hover:border-shortcut-blue"
  >
    {children}
  </button>
);

export const EventSeats: React.FC<{ event: OpsEvent }> = ({ event }) => {
  const { staffed, needed } = staffedCount(event);
  return (
    <div className="rounded-2xl border border-gray-200 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-text-dark">
          {event.name}: {staffed} of {needed} staffed
        </div>
        <div className="flex gap-3 text-xs font-bold">
          <a className="inline-flex items-center gap-1 text-shortcut-navy-blue underline" href={event.links.addPro} target="_blank" rel="noreferrer">
            Add Pro <ExternalLink size={12} />
          </a>
          <a className="inline-flex items-center gap-1 text-shortcut-navy-blue underline" href={event.links.swapPro} target="_blank" rel="noreferrer">
            Swap Pro <ExternalLink size={12} />
          </a>
          <a className="inline-flex items-center gap-1 text-shortcut-navy-blue underline" href={event.links.timeslots} target="_blank" rel="noreferrer">
            Timeslots <ExternalLink size={12} />
          </a>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {event.seats.map((s, i) => (
          <span
            key={`${s.barberID}-${i}`}
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              s.placeholder ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-900'
            }`}
          >
            {s.placeholder ? `${s.fullName} (open)` : s.fullName}
            {!s.placeholder && s.confirmedInApp ? ' ✓' : ''}
          </span>
        ))}
        {Array.from({ length: event.emptySeats }).map((_, i) => (
          <span key={`empty-${i}`} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-800">
            Empty seat
          </span>
        ))}
      </div>
    </div>
  );
};

const ProRow: React.FC<{
  pro: OpsPro;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  event: OpsEvent | null;
  onPut: (replaceBarberID?: string) => void;
}> = ({ pro, checked, disabled, onToggle, event, onPut }) => {
  const onEvent = !!event?.seats.some((s) => s.barberID === pro.id);
  const tbd = event?.seats.find((s) => s.placeholder);
  const canAdd = !!event && !onEvent && (!!tbd || event.emptySeats > 0);
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${disabled ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        aria-label={`Select ${pro.fullName}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-text-dark">{pro.fullName}</span>
          {pro.groups.map((g) => (
            <span key={g.groupID} className="rounded-full bg-[#09364f] px-2 py-0.5 text-[11px] font-bold text-white">
              {g.name}: T{g.tier}
            </span>
          ))}
          {pro.optedOut && <span className="text-xs font-bold text-red-800">Opted out of texts</span>}
          {!pro.hasPhone && <span className="text-xs font-bold text-red-800">No phone</span>}
          {onEvent && <span className="text-xs font-bold text-green-800">On this event</span>}
        </div>
        <div className="mt-0.5 text-xs text-text-dark">
          {pro.lastEventDate ? `Last worked ${shortDate(pro.lastEventDate)}` : 'No events this year'}
          {pro.eventsLast90 ? ` · ${pro.eventsLast90} in 90 days` : ''}
          {pro.upcomingEvents ? ` · ${pro.upcomingEvents} coming up` : ''}
          {pro.distanceMiles !== null && pro.distanceMiles !== undefined ? ` · ${pro.distanceMiles} mi` : ''}
          {pro.pinLocation ? ` · ${pro.pinLocation}` : ''}
          {pro.phone ? ` · ${pro.phone}` : ''}
        </div>
      </div>
      {canAdd && (
        <button
          onClick={() => onPut(tbd ? tbd.barberID : undefined)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-text-dark hover:border-shortcut-blue"
          title={tbd ? `Replace ${tbd.fullName}` : 'Add to the event'}
        >
          <UserPlus size={13} /> Put on event
        </button>
      )}
    </div>
  );
};

const AddToGroup: React.FC<{ groups: OpsGroup[]; onAdd: (groupID: string, tier: number) => void }> = ({ groups, onAdd }) => {
  const [groupID, setGroupID] = useState(groups[0]?.id || '');
  const [tier, setTier] = useState(1);
  useEffect(() => {
    if (!groupID && groups[0]) setGroupID(groups[0].id);
  }, [groups, groupID]);
  if (!groups.length) {
    return (
      <p className="mt-3 text-sm text-text-dark">
        <Users size={14} className="mr-1 inline" />
        Make a group in the Pro groups tab to save these Pros by tier.
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-bold text-text-dark">Add selected to</span>
      <select className="rounded-xl border border-gray-300 px-2 py-1 text-text-dark" value={groupID} onChange={(e) => setGroupID(e.target.value)}>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <select className="rounded-xl border border-gray-300 px-2 py-1 text-text-dark" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
        {[1, 2, 3, 4, 5].map((t) => (
          <option key={t} value={t}>
            Tier {t}
          </option>
        ))}
      </select>
      <button
        onClick={() => groupID && onAdd(groupID, tier)}
        className="rounded-full border-2 border-[#9EFAFF] px-3 py-1 text-xs font-bold text-[#09364f]"
      >
        Add
      </button>
    </div>
  );
};

const SentTexts: React.FC<{
  proposalID?: string;
  eventID?: string;
  event: OpsEvent | null;
  onEvent: (e: OpsEvent) => void;
  onError: (m: string) => void;
}> = ({ proposalID, eventID, event, onEvent, onError }) => {
  const [list, setList] = useState<OpsOutreach[]>([]);
  const [openID, setOpenID] = useState('');
  const [detail, setDetail] = useState<{ outreach: OpsOutreach; recipients: OpsRecipient[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!proposalID && !eventID) return;
    setLoading(true);
    try {
      const res = await ops.outreaches({ proposalID, eventID });
      setList(res.outreaches);
      const first = openID || res.outreaches[0]?.id || '';
      setOpenID(first);
      if (first) setDetail(await ops.outreach(first));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [proposalID, eventID, openID, onError]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const setOutcome = async (r: OpsRecipient, outcome: OpsOutcome | null) => {
    if (!detail) return;
    try {
      await ops.setOutcome(detail.outreach.id, r.barberID, outcome);
      setDetail(await ops.outreach(detail.outreach.id));
    } catch (e) {
      onError((e as Error).message);
    }
  };

  if (!list.length) {
    return <p className="mt-4 text-sm text-text-dark">{loading ? 'Loading...' : 'No texts sent for this yet.'}</p>;
  }

  const tbd = event?.seats.find((s) => s.placeholder);
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <select
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-text-dark"
          value={openID}
          onChange={async (e) => {
            setOpenID(e.target.value);
            setDetail(await ops.outreach(e.target.value));
          }}
        >
          {list.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label || 'Text'} · {shortDate(o.createdAt)} · {o.numSent} sent, {o.results?.yes || 0} yes
            </option>
          ))}
        </select>
        <button onClick={load} className="rounded-full p-2 text-text-dark hover:bg-gray-100" aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>
      {detail && (
        <>
          <div className="rounded-2xl bg-neutral-light-gray px-4 py-3 text-sm text-text-dark">
            <MessageSquare size={14} className="mr-1 inline" />
            {detail.outreach.message}
          </div>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
            {detail.recipients.map((r) => {
              const isOnEvent = !!event?.seats.some((s) => s.barberID === r.barberID);
              const canAdd = r.outcome === 'yes' && !!event && !isOnEvent && (!!tbd || event.emptySeats > 0);
              return (
                <div key={r.barberID} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-text-dark">{r.fullName || r.barberID}</span>
                      <span className="ml-2 text-xs text-text-dark">
                        {r.status === 'skipped'
                          ? SKIP_REASON_TEXT[r.skipReason || ''] || 'Skipped'
                          : r.status === 'failed'
                            ? `Not sent: ${r.error || 'failed'}`
                            : r.status === 'queued'
                              ? 'Sending...'
                              : r.replies.length
                                ? `Replied ${shortDate(r.lastReplyAt)}`
                                : 'No reply yet'}
                      </span>
                    </div>
                    {r.status === 'sent' && (
                      <div className="flex items-center gap-1">
                        {(['yes', 'maybe', 'no'] as OpsOutcome[]).map((o) => (
                          <button
                            key={o}
                            onClick={() => setOutcome(r, r.outcome === o ? null : o)}
                            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                              r.outcome === o ? OUTCOME_STYLE[o] : 'border border-gray-300 text-text-dark'
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {r.replies.map((rep, i) => (
                    <div key={i} className="mt-1 rounded-xl bg-[#F1F6F5] px-3 py-1.5 text-sm text-text-dark">
                      “{rep.body}”
                    </div>
                  ))}
                  {canAdd && (
                    <button
                      onClick={async () => {
                        if (!event) return;
                        try {
                          const res = await ops.putOnEvent(event.id, r.barberID, tbd ? tbd.barberID : undefined);
                          if (res.event) onEvent(res.event);
                        } catch (e) {
                          onError((e as Error).message);
                        }
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#9EFAFF] px-3 py-1 text-xs font-bold text-[#09364f]"
                    >
                      <UserPlus size={13} /> Put on {event?.name}
                      {tbd ? ` (replaces ${tbd.fullName})` : ''}
                    </button>
                  )}
                  {isOnEvent && <div className="mt-1 text-xs font-bold text-green-800">On the event</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default StaffPanel;
