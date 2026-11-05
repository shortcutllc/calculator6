import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Search, Send, RefreshCw, UserPlus, ExternalLink, Check } from 'lucide-react';
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
  initials,
  outreachTemplate,
  shortDate,
  staffedCount,
  ymd,
} from './opsFormat';

// The "Find Pros" side panel: pick what you're staffing, see the Pros near it (most
// recently worked first, with their tiers), text the ones you pick from the Pros line,
// watch the answers come in, and put a yes on the event. Styled by ops-dashboard.css
// inside the page's .pv-root.

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

const PAGE = 20;

// "DraftKings" from "DraftKings LV Mind & Body"; the proposal's client name as it is.
function shortClient(name: string): string {
  const n = String(name || '').trim();
  return n.length > 28 ? n.slice(0, 26).trim() + '…' : n || 'this client';
}
const RADII = [10, 20, 30, 50, 75, 100, 150];

export interface StaffTarget {
  proposal?: OpsProposal;
  event?: OpsEvent;
}

function spotsFor(target: StaffTarget): Spot[] {
  const spots: Spot[] = [];
  if (target.proposal) {
    const events = target.proposal.events;
    const single = target.proposal.needs.length === 1;
    target.proposal.needs.forEach((need, ni) => {
      // The event Create Event made for this location and date; failing that, one on
      // the same day; with a single location and date, the proposal's only event.
      const event =
        events.find((e) => (need.eventIDs || []).includes(e.id)) ||
        events.find((e) => eventYmd(e) === ymd(need.date)) ||
        (single && events.length === 1 ? events[0] : null);
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
  const [visible, setVisible] = useState(PAGE);
  const [nameFilter, setNameFilter] = useState('');
  const [sort, setSort] = useState<'best' | 'recent' | 'closest' | 'name'>('best');
  const [rosterCenter, setRosterCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [truncated, setTruncated] = useState(false);

  const proposalID = target.proposal?.id;
  // Whose history to look for: the proposal's client, or the event's own name.
  const clientLabel = target.proposal?.clientName || target.event?.name || '';
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadRoster = useCallback(async () => {
    if (!spot) return;
    setLoading(true);
    setError('');
    try {
      const [roster, g] = await Promise.all([
        ops.roster({
          coordinates: spot.coordinates || undefined,
          addressString: spot.coordinates ? undefined : spot.address,
          proTypes: proType ? [proType] : [],
          radiusMiles: radius,
          clientName: clientLabel,
          atSite: true,
        }),
        ops.groups(),
      ]);
      setPros(roster.pros);
      setRosterCenter(roster.center);
      setTruncated(roster.truncated);
      setGroups(g.groups);
      setSelected(new Set());
      setVisible(PAGE);
    } catch (e) {
      setError((e as Error).message);
      setPros([]);
    } finally {
      setLoading(false);
    }
  }, [spot, proType, radius, clientLabel]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const matchingGroups = groups.filter((g) => !g.proType || !proType || g.proType === proType);
  const textable = (p: OpsPro) => p.hasPhone && !p.optedOut;

  const filtered = useMemo(() => {
    const needle = nameFilter.trim().toLowerCase();
    const list = needle ? pros.filter((p) => p.fullName.toLowerCase().includes(needle)) : pros.slice();
    if (sort === 'recent') list.sort((a, b) => (b.lastEventDate ? Date.parse(b.lastEventDate) : 0) - (a.lastEventDate ? Date.parse(a.lastEventDate) : 0));
    if (sort === 'closest') list.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
    if (sort === 'name') list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return list;
  }, [pros, nameFilter, sort]);
  const page = filtered.slice(0, visible);
  const left = filtered.length - page.length;
  const wider = RADII.find((r) => r > radius);
  const serviceWord = proType ? proType.toLowerCase() : 'any service';

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

  const title = target.proposal?.clientName || event?.name || 'Find Pros';

  return (
    <div className="ops-overlay" onClick={onClose}>
      <aside className="ops-drawer" onClick={(e) => e.stopPropagation()} aria-label={`Staffing ${title}`}>
        <div className="ops-drawer-head">
          <div>
            <p className="lt-eyebrow">Find Pros</p>
            <h2 className="lt-h3">{title}</h2>
          </div>
          <button className="ops-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!spot ? (
          <p className="lt-body">There is nothing on this proposal to staff yet.</p>
        ) : (
          <div className="ops-stack">
            {spots.length > 1 && (
              <label className="ops-field">
                <span className="ops-label">Staffing</span>
                <select className="ops-select" value={spot.key} onChange={(e) => setSpotKey(e.target.value)}>
                  {spots.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label} ({s.numPros} Pro{s.numPros === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="ops-spot">
              <p className="lt-eyebrow">
                {spot.day}
                {spot.hours ? ` · ${spot.hours}` : ''}
              </p>
              <div className="ops-spot-title">
                {spot.service}: {spot.numPros} Pro{spot.numPros === 1 ? '' : 's'} needed
              </div>
              <p className="ops-muted">{spot.address}</p>
            </div>

            {event ? (
              <EventSeats event={event} />
            ) : (
              <p className="ops-muted">No coordinator event yet. Create it from the Admin page, and its seats show here so you can put Pros on it.</p>
            )}

            <div className="pv-format-seg" role="tablist">
              {(['pros', 'sent'] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                  {t === 'pros' ? 'Pros nearby' : 'Texts sent'}
                </button>
              ))}
            </div>

            {notice && (
              <div className="ops-notice">
                <Check size={16} /> {notice}
              </div>
            )}
            {error && <div className="ops-error">{error}</div>}

            {tab === 'pros' ? (
              <>
                <div className="ops-row">
                  <label className="ops-field">
                    <span className="ops-label">Service</span>
                    <select className="ops-select" value={proType} onChange={(e) => setProType(e.target.value)}>
                      {PRO_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                      <option value="">Any service</option>
                    </select>
                  </label>
                  <label className="ops-field">
                    <span className="ops-label">Within</span>
                    <select className="ops-select" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                      {RADII.map((r) => (
                        <option key={r} value={r}>
                          {r} miles
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ops-field">
                    <span className="ops-label">Sort</span>
                    <select className="ops-select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                      <option value="best">Best match</option>
                      <option value="recent">Worked most recently</option>
                      <option value="closest">Closest first</option>
                      <option value="name">Name</option>
                    </select>
                  </label>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-shortcut-blue" />
                  <input
                    className="ops-input w-full pl-11"
                    placeholder="Filter by name"
                    value={nameFilter}
                    onChange={(e) => {
                      setNameFilter(e.target.value);
                      setVisible(PAGE);
                    }}
                  />
                </div>

                <div className="ops-chips">
                  {pros.some((p) => textable(p) && p.clientEvents) && (
                    <button className="ops-chip" onClick={() => selectWhere((p) => !!p.clientEvents)}>
                      Worked for {shortClient(clientLabel)} ({pros.filter((p) => textable(p) && p.clientEvents).length})
                    </button>
                  )}
                  {pros.some((p) => textable(p) && p.siteEvents) && (
                    <button className="ops-chip" onClick={() => selectWhere((p) => !!p.siteEvents)}>
                      Worked at this address ({pros.filter((p) => textable(p) && p.siteEvents).length})
                    </button>
                  )}
                  <button className="ops-chip" onClick={() => selectWhere((p) => p.eventsLast90 > 0)}>
                    Worked in the last 90 days
                  </button>
                  {matchingGroups.flatMap((g) =>
                    [1, 2, 3].map((tier) => {
                      const n = pros.filter((p) => textable(p) && p.groups.some((m) => m.groupID === g.id && m.tier === tier)).length;
                      return n ? (
                        <button
                          key={`${g.id}-${tier}`}
                          className="ops-chip"
                          onClick={() => selectWhere((p) => p.groups.some((m) => m.groupID === g.id && m.tier === tier))}
                        >
                          {g.name}: Tier {tier} ({n})
                        </button>
                      ) : null;
                    })
                  )}
                  {page.some(textable) && (
                    <button className="ops-chip" onClick={() => selectWhere((p) => page.includes(p))}>
                      Select all shown
                    </button>
                  )}
                  {selected.size > 0 && (
                    <button className="ops-chip is-navy" onClick={() => setSelected(new Set())}>
                      Clear {selected.size} selected
                    </button>
                  )}
                </div>

                {!loading && (
                  <p className="ops-meta">
                    {filtered.length
                      ? `Showing ${page.length} of ${filtered.length} ${serviceWord} Pro${filtered.length === 1 ? '' : 's'} within ${radius} miles${truncated ? ' (the nearest 1,000)' : ''}.`
                      : ''}
                  </p>
                )}

                <div className="ops-list">
                  {loading && (
                    <div className="ops-list-row">
                      <p className="ops-muted">Finding Pros...</p>
                    </div>
                  )}
                  {!loading && !filtered.length && (
                    <div className="ops-list-row">
                      <p className="ops-muted">
                        {nameFilter.trim()
                          ? `Nobody named "${nameFilter.trim()}" within ${radius} miles.`
                          : `No ${serviceWord} Pros within ${radius} miles.`}
                      </p>
                    </div>
                  )}
                  {!loading &&
                    page.map((p) => (
                      <ProRow
                        key={p.id}
                        pro={p}
                        client={shortClient(clientLabel)}
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

                {!loading && (left > 0 || wider) && (
                  <div className="ops-chips">
                    {left > 0 && (
                      <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => setVisible((v) => v + PAGE)}>
                        Show {Math.min(PAGE, left)} more ({left} left)
                      </button>
                    )}
                    {left <= 0 && wider && (
                      <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => setRadius(wider)}>
                        <Search size={15} /> Search wider: {wider} miles
                      </button>
                    )}
                  </div>
                )}

                {selected.size > 0 && (
                  <AddToGroup
                    suggestedName={`${cityFrom(spot.address) || spot.address} ${proType || 'Pros'}`}
                    onCreate={async (name) => {
                      try {
                        const res = await ops.saveGroup({
                          name,
                          city: cityFrom(spot.address) || spot.address,
                          proType: proType || null,
                          center: rosterCenter,
                          radiusMiles: radius,
                        });
                        await ops.setGroupMembers(
                          res.group.id,
                          Array.from(selected).map((barberID) => ({ barberID, tier: 1 }))
                        );
                        setNotice(`Made "${res.group.name}" with ${selected.size} as Tier 1.`);
                        loadRoster();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                    groups={matchingGroups}
                    count={selected.size}
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

                {selected.size === 0 ? (
                  <div className="ops-composer is-idle">
                    <p className="ops-meta">Tick the Pros to text, then write the message here. It goes from the Pros line, (888) 573-6871.</p>
                  </div>
                ) : (
                <div className="ops-composer">
                  <label className="ops-field">
                    <span className="ops-label">Text from the Pros line, (888) 573-6871</span>
                    <textarea className="ops-textarea" rows={4} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
                  </label>
                  <p className="ops-muted">{'{firstName}'} becomes each Pro's first name.</p>
                  <div className="ops-composer-actions">
                    {confirming ? (
                      <>
                        <span className="ops-confirm">
                          Text {selected.size} Pro{selected.size === 1 ? '' : 's'} now?
                        </span>
                        <button className="lt-btn lt-btn-coral lt-btn-sm" onClick={send} disabled={sending}>
                          <Send size={16} /> {sending ? 'Sending...' : 'Yes, send'}
                        </button>
                        <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => setConfirming(false)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="lt-btn lt-btn-coral lt-btn-sm"
                        onClick={() => setConfirming(true)}
                        disabled={!selected.size || !message.trim()}
                      >
                        <Send size={16} /> {`Text ${selected.size} Pro${selected.size === 1 ? '' : 's'}`}
                      </button>
                    )}
                  </div>
                </div>
                )}
              </>
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
          </div>
        )}
      </aside>
    </div>
  );
};

export const EventSeats: React.FC<{ event: OpsEvent }> = ({ event }) => {
  const { staffed, needed } = staffedCount(event);
  return (
    <div className="ops-event">
      <div className="ops-event-head">
        <div className="ops-event-name">
          {event.name}: {staffed} of {needed} staffed
        </div>
        <div className="ops-links">
          <a href={event.links.addPro} target="_blank" rel="noreferrer">
            Add Pro <ExternalLink size={12} />
          </a>
          <a href={event.links.swapPro} target="_blank" rel="noreferrer">
            Swap Pro <ExternalLink size={12} />
          </a>
          <a href={event.links.timeslots} target="_blank" rel="noreferrer">
            Timeslots <ExternalLink size={12} />
          </a>
        </div>
      </div>
      <div className="ops-seats">
        {event.seats.map((s, i) => (
          <span
            key={`${s.barberID}-${i}`}
            className={`ops-seat${s.placeholder ? ' is-open' : ''}${!s.placeholder && s.confirmedInApp ? ' is-confirmed' : ''}`}
            title={!s.placeholder && s.confirmedInApp ? 'Confirmed in the app' : undefined}
          >
            {s.placeholder ? `${s.fullName}: open` : s.fullName}
          </span>
        ))}
        {Array.from({ length: event.emptySeats }).map((_, i) => (
          <span key={`empty-${i}`} className="ops-seat is-open">
            Empty seat
          </span>
        ))}
      </div>
    </div>
  );
};

const ProRow: React.FC<{
  pro: OpsPro;
  client: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  event: OpsEvent | null;
  onPut: (replaceBarberID?: string) => void;
}> = ({ pro, client, checked, disabled, onToggle, event, onPut }) => {
  const onEvent = !!event?.seats.some((s) => s.barberID === pro.id);
  const tbd = event?.seats.find((s) => s.placeholder);
  const canAdd = !!event && !onEvent && (!!tbd || event.emptySeats > 0);
  const meta = [
    pro.lastEventDate ? `Last worked ${shortDate(pro.lastEventDate)}` : 'No events this year',
    pro.eventsLast90 ? `${pro.eventsLast90} in 90 days` : '',
    pro.upcomingEvents ? `${pro.upcomingEvents} coming up` : '',
    pro.distanceMiles !== null && pro.distanceMiles !== undefined ? `${pro.distanceMiles} mi` : '',
    pro.pinLocation || '',
    pro.phone || '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className={`ops-pro${disabled ? ' is-off' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} aria-label={`Select ${pro.fullName}`} />
      <div className="ops-avatar" aria-hidden>
        {initials(pro.fullName)}
      </div>
      <div className="ops-pro-main">
        <div className="ops-pro-line">
          <span className="ops-name">{pro.fullName}</span>
          {pro.groups.map((g) => (
            <span key={g.groupID} className="ops-tier">
              {g.name}: T{g.tier}
            </span>
          ))}
          {pro.optedOut && <span className="ops-flagtext">Opted out of texts</span>}
          {!pro.hasPhone && <span className="ops-flagtext">No phone</span>}
          {onEvent && <span className="ops-oktext">On this event</span>}
          {pro.locatedBy === 'address' && <span className="ops-meta">Placed by home address</span>}
        </div>
        {(!!pro.clientEvents || !!pro.siteEvents) && (
          <div className="ops-history">
            {!!pro.clientEvents && (
              <span className="ops-history-tag is-client">
                Worked for {client} {pro.clientEvents}x, last {shortDate(pro.lastClientEventDate)}
              </span>
            )}
            {!!pro.siteEvents && (
              <span className="ops-history-tag">
                At this address {pro.siteEvents}x, last {shortDate(pro.lastSiteEventDate)}
              </span>
            )}
          </div>
        )}
        <div className="ops-meta">{meta}</div>
      </div>
      {canAdd && (
        <button
          className="lt-btn lt-btn-ghost lt-btn-sm"
          onClick={() => onPut(tbd ? tbd.barberID : undefined)}
          title={tbd ? `Replaces ${tbd.fullName}` : 'Adds them to the event'}
        >
          <UserPlus size={15} /> Put on event
        </button>
      )}
    </div>
  );
};

const AddToGroup: React.FC<{
  groups: OpsGroup[];
  count: number;
  suggestedName: string;
  onAdd: (groupID: string, tier: number) => void;
  onCreate: (name: string) => void;
}> = ({ groups, count, suggestedName, onAdd, onCreate }) => {
  const [groupID, setGroupID] = useState(groups[0]?.id || '');
  const [tier, setTier] = useState(1);
  const [name, setName] = useState(suggestedName);
  useEffect(() => {
    if (!groupID && groups[0]) setGroupID(groups[0].id);
  }, [groups, groupID]);
  useEffect(() => setName(suggestedName), [suggestedName]);
  if (!groups.length) {
    return (
      <div className="ops-row">
        <label className="ops-field flex-1">
          <span className="ops-label">Save these {count} as a new group</span>
          <input className="ops-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => name.trim() && onCreate(name.trim())}>
          Make group, as Tier 1
        </button>
      </div>
    );
  }
  return (
    <div className="ops-row">
      <label className="ops-field">
        <span className="ops-label">Add {count} selected to</span>
        <select className="ops-select" value={groupID} onChange={(e) => setGroupID(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ops-field">
        <span className="ops-label">As</span>
        <select className="ops-select" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((t) => (
            <option key={t} value={t}>
              Tier {t}
            </option>
          ))}
        </select>
      </label>
      <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => groupID && onAdd(groupID, tier)}>
        Add to group
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
    return <p className="ops-muted">{loading ? 'Loading...' : 'No texts sent for this yet.'}</p>;
  }

  const tbd = event?.seats.find((s) => s.placeholder);
  return (
    <>
      <div className="ops-row">
        <label className="ops-field flex-1">
          <span className="ops-label">Text</span>
          <select
            className="ops-select"
            value={openID}
            onChange={async (e) => {
              setOpenID(e.target.value);
              setDetail(await ops.outreach(e.target.value));
            }}
          >
            {list.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label || 'Text'} · {shortDate(o.createdAt)} · {o.results?.yes || 0} yes
              </option>
            ))}
          </select>
        </label>
        <button className="ops-icon-btn" onClick={load} aria-label="Refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {detail && (
        <>
          <div className="ops-message">{detail.outreach.message}</div>
          <div className="ops-list">
            {detail.recipients.map((r) => {
              const isOnEvent = !!event?.seats.some((s) => s.barberID === r.barberID);
              const canAdd = r.outcome === 'yes' && !!event && !isOnEvent && (!!tbd || event.emptySeats > 0);
              const status =
                r.status === 'skipped'
                  ? SKIP_REASON_TEXT[r.skipReason || ''] || 'Skipped'
                  : r.status === 'failed'
                    ? `Not sent: ${r.error || 'failed'}`
                    : r.status === 'queued'
                      ? 'Sending...'
                      : r.replies.length
                        ? `Replied ${shortDate(r.lastReplyAt)}`
                        : 'No reply yet';
              return (
                <div key={r.barberID} className="ops-pro">
                  <div className="ops-avatar" aria-hidden>
                    {initials(r.fullName)}
                  </div>
                  <div className="ops-pro-main">
                    <div className="ops-pro-line">
                      <span className="ops-name">{r.fullName || r.barberID}</span>
                      {isOnEvent && <span className="ops-oktext">On the event</span>}
                    </div>
                    <div className="ops-meta">{status}</div>
                    {r.replies.map((rep, i) => (
                      <div key={i}>
                        <span className="ops-reply">{rep.body}</span>
                      </div>
                    ))}
                    {canAdd && (
                      <button
                        className="lt-btn lt-btn-navy lt-btn-sm mt-3"
                        onClick={async () => {
                          if (!event) return;
                          try {
                            const res = await ops.putOnEvent(event.id, r.barberID, tbd ? tbd.barberID : undefined);
                            if (res.event) onEvent(res.event);
                          } catch (e) {
                            onError((e as Error).message);
                          }
                        }}
                      >
                        <UserPlus size={15} /> Put on the event{tbd ? `, replacing ${tbd.fullName}` : ''}
                      </button>
                    )}
                  </div>
                  {r.status === 'sent' && (
                    <div className="ops-outcome" role="group" aria-label="Their answer">
                      {(['yes', 'maybe', 'no'] as OpsOutcome[]).map((o) => (
                        <button key={o} className={r.outcome === o ? `on-${o}` : ''} onClick={() => setOutcome(r, r.outcome === o ? null : o)}>
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};

export default StaffPanel;
