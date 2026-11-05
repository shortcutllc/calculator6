import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, MapPin, AlertCircle } from 'lucide-react';
import '../../styles/proposal-refresh.css';
import '../../styles/ops-dashboard.css';
import { ops, OpsBoard, OpsError, OpsEvent, OpsProposal } from '../../services/opsService';
import { StaffPanel, StaffTarget } from './StaffPanel';
import { OpenProposals } from './OpenProposals';
import { seatSummary } from './ProBadges';
import ProGroups from './ProGroups';
import {
  cityFrom,
  dayLabel,
  dotClassFor,
  eventAddress,
  eventDay,
  eventHours,
  hoursText,
  localDate,
  photoForProType,
  photoForService,
  prosText,
  shortDate,
  staffedCount,
} from './opsFormat';

// Pedro's staffing dashboard (Nov 2026), in the V2 proposal viewer's design: it renders
// inside .pv-root with proposal-refresh.css, and ops-dashboard.css adds the rest.
//
// One list, soonest first, filtered by the cards at the top:
//   Need staff      approved proposals with open seats (or no event yet), and coordinator
//                   events not from a proposal that still have open seats
//   Staffed         approved proposals with every seat filled
//   Likely to close pending proposals sales flagged, to start lining up Pros early
// From any card: find Pros nearby, text them from the Pros line, see their answers, and
// put a yes on the event.

type Filter = 'need' | 'staffed' | 'likely';

interface Item {
  key: string;
  status: Filter;
  next: number; // the soonest day still ahead (ms); Infinity for no date yet
  staffed: number;
  needed: number;
  proposal?: OpsProposal;
  event?: OpsEvent;
}

const FILTERS: { id: Filter; label: string; help: string }[] = [
  { id: 'need', label: 'Need staff', help: 'Upcoming events with open seats, and approved proposals with no event yet. Soonest first.' },
  { id: 'staffed', label: 'Staffed', help: 'Upcoming events and approved proposals with every seat filled. Soonest first.' },
  { id: 'likely', label: 'Likely to close', help: 'Deals flagged as likely to close, so you can line up Pros before they are signed.' },
];

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function proposalItem(p: OpsProposal): Item {
  const staffed = p.events.reduce((sum, e) => sum + staffedCount(e).staffed, 0);
  const needed = p.events.length ? p.events.reduce((sum, e) => sum + staffedCount(e).needed, 0) : p.totalPros;
  const today = startOfToday();
  const days = p.needs.map((n) => localDate(n.date)).filter((d): d is Date => !!d).map((d) => d.getTime());
  const ahead = days.filter((t) => t >= today);
  const next = ahead.length ? Math.min(...ahead) : days.length ? Math.max(...days) : Infinity;
  const status: Filter = p.status !== 'approved' ? 'likely' : needed > 0 && staffed >= needed ? 'staffed' : 'need';
  return { key: `p-${p.id}`, status, next, staffed, needed, proposal: p };
}

function eventItem(e: OpsEvent): Item {
  const { staffed, needed } = staffedCount(e);
  return {
    key: `e-${e.id}`,
    status: staffed >= needed ? 'staffed' : 'need',
    next: e.startTime ? Date.parse(e.startTime) : Infinity,
    staffed,
    needed,
    event: e,
  };
}

const OpsDashboard: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'groups' ? 'groups' : 'staffing';
  const filter = (['need', 'staffed', 'likely'].includes(params.get('show') || '') ? params.get('show') : 'need') as Filter;
  const [board, setBoard] = useState<OpsBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<OpsError | null>(null);
  const [target, setTarget] = useState<StaffTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoard(await ops.board());
    } catch (e) {
      setError(e as OpsError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ?proposal=<id> (the Slack alert's link) opens that proposal's staffing.
  const wanted = params.get('proposal');
  useEffect(() => {
    if (!wanted || !board) return;
    const p = board.proposals.find((x) => x.id === wanted);
    if (p) setTarget({ proposal: p });
  }, [wanted, board]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('proposal');
    setParams(next, { replace: true });
  };

  const items = useMemo(() => {
    if (!board) return [];
    return [...board.proposals.map(proposalItem), ...board.otherEvents.map(eventItem)].sort((a, b) => a.next - b.next);
  }, [board]);

  const counts = useMemo(() => {
    const c = { need: 0, staffed: 0, likely: 0, prosShort: 0 };
    for (const i of items) {
      c[i.status] += 1;
      if (i.status === 'need') c.prosShort += Math.max(i.needed - i.staffed, 0);
    }
    return c;
  }, [items]);

  const shown = items.filter((i) => i.status === filter);

  // Cities with something coming up: one-click picks when making a Pro group.
  const cities = useMemo(() => {
    if (!board) return [];
    const seen = new Map<string, number>();
    const add = (city: string) => city && seen.set(city, (seen.get(city) || 0) + 1);
    board.proposals.forEach((p) => p.needs.forEach((n) => add(cityFrom(n.address))));
    board.otherEvents.forEach((e) => add(e.address.city || ''));
    return Array.from(seen.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c)
      .slice(0, 8);
  }, [board]);
  const filterInfo = FILTERS.find((f) => f.id === filter)!;

  if (error && error.status === 403) {
    return (
      <div className="pv-root ops-root">
        <div className="ops-wrap">
          <div className="lt-card">
            <p className="lt-body">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pv-root ops-root">
      <div className="ops-wrap">
        <div className="ops-head">
          <div>
            <p className="lt-eyebrow">Operations</p>
            <h1 className="lt-h2">
              Staff every event, <span className="lt-accent">early.</span>
            </h1>
          </div>
          <div className="ops-head-actions">
            {board?.backend === 'dev' && <span className="ops-backend">Dev backend</span>}
            <div className="pv-format-seg" role="tablist">
              {(['staffing', 'groups'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? 'on' : ''}
                  onClick={() => setParam('tab', t === 'groups' ? 'groups' : null)}
                >
                  {t === 'staffing' ? 'Staffing' : 'Pro groups'}
                </button>
              ))}
            </div>
            <button className="ops-icon-btn" onClick={load} aria-label="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {tab === 'groups' ? (
          <ProGroups cities={cities} />
        ) : (
          <>
            <div className="ops-filters" role="tablist" aria-label="Show">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`ops-filter${filter === f.id ? ' is-on' : ''}${f.id === 'need' ? ' is-need' : ''}`}
                  onClick={() => setParam('show', f.id === 'need' ? null : f.id)}
                >
                  <span className="pv-bignum">{board ? counts[f.id] : '·'}</span>
                  <span className="ops-filter-label">{f.label}</span>
                  {f.id === 'need' && board && counts.prosShort > 0 && (
                    <span className="ops-filter-sub">{prosText(counts.prosShort)} still to find</span>
                  )}
                </button>
              ))}
            </div>

            <div className="ops-sec">
              <p className="ops-sec-note">{filterInfo.help}</p>
            </div>

            {error && <div className="ops-error">{error.message}</div>}
            {board?.warnings.map((w) => (
              <div key={w} className="ops-warn">
                <AlertCircle size={16} /> {w}
              </div>
            ))}

            {loading && !board && <p className="ops-muted">Loading...</p>}
            {board && !shown.length && (
              <div className="lt-card">
                <p className="lt-body">
                  {filter === 'need'
                    ? 'Every upcoming event is staffed. Nice.'
                    : filter === 'staffed'
                      ? 'No fully staffed events right now.'
                      : 'Nothing flagged yet. Flag a deal from the open proposals below, and Pedro gets a heads up.'}
                </p>
              </div>
            )}
            {shown.map((i) =>
              i.proposal ? (
                <ProposalCard key={i.key} item={i} onStaff={() => setTarget({ proposal: i.proposal })} />
              ) : (
                <EventCard key={i.key} item={i} onStaff={() => setTarget({ event: i.event })} />
              )
            )}

            {filter === 'likely' && <OpenProposals onChanged={load} />}
          </>
        )}

        {target && (
          <StaffPanel
            target={target}
            onClose={() => {
              setTarget(null);
              if (wanted) setParam('proposal', null);
            }}
            onChanged={load}
          />
        )}
      </div>
    </div>
  );
};

const Progress: React.FC<{ staffed: number; needed: number }> = ({ staffed, needed }) => {
  const pct = needed ? Math.min(100, Math.round((staffed / needed) * 100)) : 0;
  const full = needed > 0 && staffed >= needed;
  return (
    <div className="ops-progress">
      <div className="ops-progress-top">
        <span className={`pv-bignum${full ? '' : ' is-short'}`}>
          {staffed}/{needed}
        </span>
        <span className="ops-metric-sub">{full ? 'Fully staffed' : `${prosText(Math.max(needed - staffed, 0))} to find`}</span>
      </div>
      <progress className={`ops-bar${full ? ' is-full' : ''}`} value={pct} max={100} aria-hidden />
    </div>
  );
};

// Every card is the same shape whatever the event's size (Will, Nov 2026: cards of
// different heights read as noise): at most two need lines and one line of events,
// the full seat list lives in Find Pros.
const MAX_LINES = 2;
const MAX_CHIPS = 4;

// A proposal's events often share the client's name (Smartly x3, HRT x3): then each chip
// says only what differs between them (day, city, service), adding the hours if two are
// still alike. The service comes from a real Pro on the event ("Pro TBD" placeholders
// carry a generic type), else from the proposal line the event was made for.
function chipLabels(events: OpsEvent[], needs: OpsProposal['needs']): string[] {
  const names = events.map((e) => e.name);
  if (new Set(names).size === names.length) return names;
  const parts = events.map((e) => {
    let service = e.seats.find((s) => !s.placeholder && s.proType)?.proType || '';
    if (!service) {
      const need = needs.find((n) => n.eventIDs.includes(e.id));
      if (need && need.services.length === 1) service = need.services[0].title;
    }
    return { day: eventDay(e), city: e.address.city || '', service, hours: eventHours(e).replace(/\s+[A-Z]{2,4}$/, '') };
  });
  const varies = (k: keyof (typeof parts)[number]) => new Set(parts.map((p) => p[k])).size > 1;
  const keys = (['day', 'city', 'service'] as const).filter(varies);
  let labels = parts.map((p) => keys.map((k) => p[k]).filter(Boolean).join(' · '));
  if (new Set(labels).size < labels.length) labels = parts.map((p, i) => [labels[i], p.hours].filter(Boolean).join(' · '));
  return labels.map((l, i) => l || names[i]);
}

const EventChips: React.FC<{ events: OpsEvent[]; needs: OpsProposal['needs'] }> = ({ events, needs }) => {
  const shownEvents = events.slice(0, MAX_CHIPS);
  const labels = chipLabels(events, needs);
  return (
    <div className="ops-evchips">
      {shownEvents.map((e, i) => {
        const { staffed, needed } = staffedCount(e);
        const full = needed > 0 && staffed >= needed;
        return (
          <span
            key={e.id}
            className={`ops-evchip${full ? ' is-full' : ' is-short'}`}
            title={e.matchedBy === 'name' ? 'Matched by client name and date: made in the coordinator, not from this proposal.' : undefined}
          >
            <span className="ops-evchip-name">{labels[i]}</span>
            <b>
              {staffed}/{needed}
            </b>
          </span>
        );
      })}
      {events.length > MAX_CHIPS && <span className="ops-more">+{events.length - MAX_CHIPS} more</span>}
    </div>
  );
};

const SeatChips: React.FC<{ event: OpsEvent }> = ({ event }) => {
  const all = [
    ...event.seats.map((s, i) => ({
      key: `${s.barberID}-${i}`,
      label: s.placeholder ? `${s.fullName}: open` : s.fullName,
      open: s.placeholder,
      confirmed: !s.placeholder && s.confirmedInApp,
    })),
    ...Array.from({ length: event.emptySeats }).map((_, i) => ({ key: `empty-${i}`, label: 'Empty seat', open: true, confirmed: false })),
  ];
  // Open seats first: they are what the card is for.
  all.sort((a, b) => Number(b.open) - Number(a.open));
  const shownSeats = all.slice(0, MAX_CHIPS);
  return (
    <div className="ops-evchips">
      {shownSeats.map((s) => (
        <span
          key={s.key}
          className={`ops-seat${s.open ? ' is-open' : ''}${s.confirmed ? ' is-confirmed' : ''}`}
          title={s.open ? 'Open seat' : s.confirmed ? 'Confirmed in the app' : 'Not confirmed in the app yet'}
        >
          {s.label}
        </span>
      ))}
      {all.length > MAX_CHIPS && <span className="ops-more">+{all.length - MAX_CHIPS} more</span>}
    </div>
  );
};

const CardShell: React.FC<{
  photo: string | null;
  pill: React.ReactNode;
  eyebrow: string;
  title: string;
  sub: React.ReactNode;
  item: Item;
  onStaff: () => void;
  link?: { href: string; label: string };
  children: React.ReactNode;
}> = ({ photo, pill, eyebrow, title, sub, item, onStaff, link, children }) => (
  <div className="ops-card">
    <div className="ops-card-photo">
      {photo && <img src={photo} alt="" />}
      {pill}
    </div>
    <div className="ops-card-body">
      <div className="ops-card-main">
        <p className="lt-eyebrow ops-oneline">{eyebrow}</p>
        <h3 className="lt-h3 ops-oneline">{title}</h3>
        <div className="ops-card-sub ops-oneline">{sub}</div>
        <div className="ops-card-detail">{children}</div>
      </div>
      <div className="ops-card-side">
        <Progress staffed={item.staffed} needed={item.needed} />
        <div className="ops-card-actions">
          <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={onStaff}>
            Find Pros
          </button>
          {link && (
            <a className="ops-view-link" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);

const ProposalCard: React.FC<{ item: Item; onStaff: () => void }> = ({ item, onStaff }) => {
  const p = item.proposal!;
  const firstService = p.needs[0]?.services[0];
  const cities = Array.from(new Set(p.needs.map((n) => n.location))).join(', ');
  const approved = p.status === 'approved';
  const days = new Set(p.needs.map((n) => n.date)).size;
  const summary = seatSummary(p.events.flatMap((e) => e.seats));
  return (
    <CardShell
      photo={photoForService(firstService?.serviceType)}
      pill={<span className={`ops-status ${approved ? 'is-approved' : 'is-likely'}`}>{approved ? 'Approved' : 'Likely to close'}</span>}
      eyebrow={`${Number.isFinite(item.next) ? dayLabel(item.next) : 'Date TBD'}${days > 1 ? ` + ${days - 1} more day${days > 2 ? 's' : ''}` : ''} · ${cities}`}
      title={p.clientName}
      sub={
        <>
          {p.optionName ? `${p.optionName} · ` : ''}
          {approved ? `Approved, updated ${shortDate(p.updatedAt)}` : p.likelySetBy ? `Flagged by ${p.likelySetBy} on ${shortDate(p.likelySetAt)}` : 'Flagged'}
        </>
      }
      item={item}
      onStaff={onStaff}
      link={{ href: `/proposal/${p.id}`, label: 'Open proposal' }}
    >
      <div className="ops-needs">
        {p.needs.slice(0, MAX_LINES).map((n, i) => (
          <div key={i} className="ops-need">
            <span className="ops-need-day">{dayLabel(n.date)}</span>
            <span className="ops-need-svcs">
              {n.services.map((s, j) => (
                <span key={j} className="ops-need-svc">
                  <span className={`pv-dot ${dotClassFor(s.serviceType)}`} aria-hidden />
                  {s.title}: {prosText(s.numPros)}
                  {s.totalHours ? ` (${hoursText(s.totalHours)})` : ''}
                </span>
              ))}
            </span>
            <span className="ops-need-where" title={n.address}>
              <MapPin size={14} aria-hidden /> {n.address}
            </span>
          </div>
        ))}
        {p.needs.length > MAX_LINES && (
          <span className="ops-more">
            +{p.needs.length - MAX_LINES} more in Find Pros
          </span>
        )}
      </div>
      {p.events.length ? (
        <>
          <EventChips events={p.events} needs={p.needs} />
          {summary && <p className="ops-seat-summary ops-oneline">{summary}</p>}
        </>
      ) : (
        <p className="ops-muted ops-oneline">
          {approved ? 'No coordinator event yet. Create it from the Admin page and its seats show here.' : 'Not approved yet, so no coordinator event.'}
        </p>
      )}
    </CardShell>
  );
};

const EventCard: React.FC<{ item: Item; onStaff: () => void }> = ({ item, onStaff }) => {
  const event = item.event!;
  const seatType = event.seats.find((s) => s.proType)?.proType;
  const summary = seatSummary(event.seats);
  return (
    <CardShell
      photo={photoForProType(seatType)}
      pill={<span className="ops-status">Coordinator event</span>}
      eyebrow={`${eventDay(event)} · ${eventHours(event)}`}
      title={event.name}
      sub={`${eventAddress(event)}. Not from a proposal here.`}
      item={item}
      onStaff={onStaff}
    >
      <SeatChips event={event} />
      {summary && <p className="ops-seat-summary ops-oneline">{summary}</p>}
    </CardShell>
  );
};

export default OpsDashboard;
