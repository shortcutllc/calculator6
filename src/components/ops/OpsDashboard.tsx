import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, MapPin, Flag, Search, AlertCircle, X } from 'lucide-react';
import '../../styles/proposal-refresh.css';
import '../../styles/ops-dashboard.css';
import { ops, OpsBoard, OpsError, OpsEvent, OpsProposal } from '../../services/opsService';
import { EventSeats, StaffPanel, StaffTarget } from './StaffPanel';
import ProGroups from './ProGroups';
import {
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
  { id: 'staffed', label: 'Staffed', help: 'Approved proposals with every seat filled.' },
  { id: 'likely', label: 'Likely to close', help: 'Deals sales has flagged before they are signed, so you can line up Pros early.' },
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
  const [flagOpen, setFlagOpen] = useState(false);

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
          <ProGroups />
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
              {filter === 'likely' && (
                <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => setFlagOpen((o) => !o)}>
                  <Flag size={15} /> {flagOpen ? 'Close' : 'Flag a deal'}
                </button>
              )}
            </div>

            {error && <div className="ops-error">{error.message}</div>}
            {board?.warnings.map((w) => (
              <div key={w} className="ops-warn">
                <AlertCircle size={16} /> {w}
              </div>
            ))}

            {filter === 'likely' && flagOpen && <FlagLikely onChanged={load} onClose={() => setFlagOpen(false)} />}

            {loading && !board && <p className="ops-muted">Loading...</p>}
            {board && !shown.length && (
              <div className="lt-card">
                <p className="lt-body">
                  {filter === 'need'
                    ? 'Every upcoming event is staffed. Nice.'
                    : filter === 'staffed'
                      ? 'No fully staffed proposals right now.'
                      : 'No deals flagged as likely to close. Flag one when a deal is close, and Pedro gets a heads up.'}
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

const ProposalCard: React.FC<{ item: Item; onStaff: () => void }> = ({ item, onStaff }) => {
  const p = item.proposal!;
  const firstService = p.needs[0]?.services[0];
  const photo = photoForService(firstService?.serviceType);
  const cities = Array.from(new Set(p.needs.map((n) => n.location))).join(', ');
  const approved = p.status === 'approved';
  const byName = p.events.some((e) => e.matchedBy === 'name');
  return (
    <div className="ops-card">
      <div className="ops-card-photo">
        {photo && <img src={photo} alt="" />}
        <span className={`ops-status ${approved ? 'is-approved' : 'is-likely'}`}>{approved ? 'Approved' : 'Likely to close'}</span>
      </div>
      <div className="ops-card-body">
        <div className="ops-card-top">
          <div>
            <p className="lt-eyebrow">
              {Number.isFinite(item.next) ? dayLabel(item.next) : 'Date TBD'}
              {p.needs.length > 1 ? ` + ${p.needs.length - 1} more day${p.needs.length > 2 ? 's' : ''}` : ''} · {cities}
            </p>
            <h3 className="lt-h3">{p.clientName}</h3>
            <div className="ops-card-sub">
              {p.optionName ? `${p.optionName} · ` : ''}
              {approved ? `Approved, updated ${shortDate(p.updatedAt)}` : p.likelySetBy ? `Flagged by ${p.likelySetBy} on ${shortDate(p.likelySetAt)}` : ''}
              {' · '}
              <a href={`/proposal/${p.id}`} target="_blank" rel="noreferrer">
                Open proposal
              </a>
            </div>
          </div>
          <div className="ops-card-side">
            <Progress staffed={item.staffed} needed={item.needed} />
            <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={onStaff}>
              Find Pros
            </button>
          </div>
        </div>

        <div className="ops-needs">
          {p.needs.map((n, i) => (
            <div key={i} className="ops-need">
              <span>{dayLabel(n.date)}</span>
              <span className="ops-need-where">
                <MapPin size={14} className="inline" /> {n.address}
              </span>
              {n.services.map((s, j) => (
                <span key={j} className="ops-need-svc">
                  <span className={`pv-dot ${dotClassFor(s.serviceType)}`} aria-hidden />
                  {s.title}: {prosText(s.numPros)}
                  {s.totalHours ? ` (${hoursText(s.totalHours)})` : ''}
                </span>
              ))}
            </div>
          ))}
        </div>

        {p.events.map((e) => (
          <EventSeats key={e.id} event={e} />
        ))}
        {byName && <p className="ops-meta">Events matched by client name and date: made in the coordinator, not from this proposal.</p>}
        {approved && !p.eventIDs.length && (
          <p className="ops-muted">No coordinator event yet. Create it from the Admin page and its seats show here.</p>
        )}
        {!!p.missingEventIDs.length && (
          <p className="ops-muted">
            {p.missingEventIDs.length} linked event{p.missingEventIDs.length === 1 ? '' : 's'} no longer found (deleted, cancelled or a test event).
          </p>
        )}
      </div>
    </div>
  );
};

const EventCard: React.FC<{ item: Item; onStaff: () => void }> = ({ item, onStaff }) => {
  const event = item.event!;
  const seatType = event.seats.find((s) => s.proType)?.proType;
  const photo = photoForProType(seatType);
  return (
    <div className="ops-card">
      <div className="ops-card-photo">
        {photo && <img src={photo} alt="" />}
        <span className="ops-status">Coordinator event</span>
      </div>
      <div className="ops-card-body">
        <div className="ops-card-top">
          <div>
            <p className="lt-eyebrow">
              {eventDay(event)} · {eventHours(event)}
            </p>
            <h3 className="lt-h3">{event.name}</h3>
            <div className="ops-card-sub">{eventAddress(event)}. Not from a proposal here.</div>
          </div>
          <div className="ops-card-side">
            <Progress staffed={item.staffed} needed={item.needed} />
            <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={onStaff}>
              Find Pros
            </button>
          </div>
        </div>
        <EventSeats event={event} />
      </div>
    </div>
  );
};

// Sales flags a pending proposal so ops starts early; the first flag alerts Pedro.
const FlagLikely: React.FC<{ onChanged: () => void; onClose: () => void }> = ({ onChanged, onClose }) => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<{ id: string; clientName: string; status: string; optionName: string | null; updatedAt: string; likely: boolean }[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const search = useCallback(async (text: string) => {
    try {
      setRows((await ops.pendingProposals(text)).proposals);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, search]);

  const toggle = async (id: string, name: string, likely: boolean) => {
    setBusy(id);
    setMsg('');
    try {
      const res = await ops.setLikely(id, likely);
      setRows((prev) => prev.map((x) => (x.id === id ? { ...x, likely: res.likely } : x)));
      if (res.alerted) setMsg(`Pedro has been told about ${name}.`);
      onChanged();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="lt-card ops-flag ops-stack">
      <div className="ops-flag-head">
        <span className="ops-flag-title">
          <Flag size={18} className="text-shortcut-coral" /> Flag a deal as likely to close
        </span>
        <button className="ops-icon-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <p className="lt-body">Pick a proposal that hasn't been approved yet. Pedro gets a Slack heads up to start finding Pros.</p>
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-shortcut-blue" />
        <input className="ops-input w-full pl-11" placeholder="Search by client" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      {msg && <div className="ops-notice">{msg}</div>}
      <div className="ops-list max-h-80 overflow-y-auto">
        {rows.map((r) => (
          <div key={r.id} className="ops-list-row">
            <div className="min-w-0">
              <div className="ops-name">{r.clientName}</div>
              <div className="ops-meta">
                {r.optionName ? `${r.optionName} · ` : ''}
                {r.status} · updated {shortDate(r.updatedAt)}
              </div>
            </div>
            <button
              className={`ops-likely-btn${r.likely ? ' is-on' : ''}`}
              disabled={busy === r.id}
              aria-pressed={r.likely}
              onClick={() => toggle(r.id, r.clientName, !r.likely)}
            >
              {r.likely ? 'Likely to close' : 'Flag as likely'}
            </button>
          </div>
        ))}
        {!rows.length && (
          <div className="ops-list-row">
            <p className="ops-muted">No matching proposals in the last 4 months.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpsDashboard;
