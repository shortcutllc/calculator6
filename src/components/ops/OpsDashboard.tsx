import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, MapPin, Flag, Search, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  photoForProType,
  photoForService,
  prosText,
  shortDate,
  staffedCount,
} from './opsFormat';

// Pedro's staffing dashboard (Nov 2026), in the V2 proposal viewer's design: it renders
// inside .pv-root with proposal-refresh.css, and ops-dashboard.css adds the rest.
// Approved proposals, and pending ones flagged "likely to close", with what each needs;
// the coordinator events made from them and their seats; other upcoming events still
// short of Pros. From any of them: find Pros nearby, text them from the Pros line, see
// their answers, and put a yes on the event.

const OpsDashboard: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'groups' ? 'groups' : 'staffing';
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

  const setTab = (t: 'staffing' | 'groups') => {
    const next = new URLSearchParams(params);
    if (t === 'groups') next.set('tab', 'groups');
    else next.delete('tab');
    next.delete('proposal');
    setParams(next, { replace: true });
  };

  const stats = useMemo(() => {
    const props = board?.proposals || [];
    const stillNeeded = props.reduce((sum, p) => {
      if (!p.events.length) return sum + p.totalPros;
      return sum + p.events.reduce((s, e) => s + Math.max(staffedCount(e).needed - staffedCount(e).staffed, 0), 0);
    }, 0);
    return {
      toStaff: props.length,
      stillNeeded,
      likely: props.filter((p) => p.status !== 'approved' && p.likely).length,
      otherShort: board?.otherEvents.length || 0,
    };
  }, [board]);

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
            <p className="lt-body">Approved and likely proposals, their events, and the Pros to staff them.</p>
          </div>
          <div className="ops-head-actions">
            {board?.backend === 'dev' && <span className="ops-backend">Dev backend</span>}
            <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={load}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {tab === 'staffing' && board && (
          <div className="ops-stats">
            <Stat value={stats.stillNeeded} label="Pros still needed" aqua />
            <Stat value={stats.toStaff} label="Proposals to staff" />
            <Stat value={stats.likely} label="Likely to close" />
            <Stat value={stats.otherShort} label="Other events short" />
          </div>
        )}

        <div className="ops-tabs pv-format-seg" role="tablist">
          {(['staffing', 'groups'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t === 'staffing' ? 'To staff' : 'Pro groups'}
            </button>
          ))}
        </div>

        {tab === 'groups' ? (
          <ProGroups />
        ) : (
          <>
            {error && <div className="ops-error">{error.message}</div>}
            {board?.warnings.map((w) => (
              <div key={w} className="ops-warn">
                <AlertCircle size={16} /> {w}
              </div>
            ))}

            <FlagLikely onChanged={load} />

            <div className="ops-sec">
              <h2 className="lt-h3">Proposals to staff</h2>
              {board && <span className="ops-sec-note">Soonest first</span>}
            </div>
            {loading && !board && <p className="ops-muted">Loading...</p>}
            {board && !board.proposals.length && (
              <div className="lt-card">
                <p className="lt-body">Nothing approved or flagged right now.</p>
              </div>
            )}
            {board?.proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} onStaff={() => setTarget({ proposal: p })} />
            ))}

            {!!board?.otherEvents.length && (
              <>
                <div className="ops-sec">
                  <h2 className="lt-h3">Other events short of Pros</h2>
                  <span className="ops-sec-note">Next 60 days, not from a proposal here</span>
                </div>
                {board.otherEvents.map((e) => (
                  <EventCard key={e.id} event={e} onStaff={() => setTarget({ event: e })} />
                ))}
              </>
            )}
          </>
        )}

        {target && (
          <StaffPanel
            target={target}
            onClose={() => {
              setTarget(null);
              if (wanted) {
                const next = new URLSearchParams(params);
                next.delete('proposal');
                setParams(next, { replace: true });
              }
            }}
            onChanged={load}
          />
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ value: number; label: string; aqua?: boolean }> = ({ value, label, aqua }) => (
  <div className={`ops-stat${aqua ? ' is-aqua' : ''}`}>
    <div className="pv-bignum">{value}</div>
    <div className="ops-stat-label">{label}</div>
  </div>
);

const ProposalCard: React.FC<{ proposal: OpsProposal; onStaff: () => void }> = ({ proposal: p, onStaff }) => {
  const staffed = p.events.reduce((sum, e) => sum + staffedCount(e).staffed, 0);
  const needed = p.events.length ? p.events.reduce((sum, e) => sum + staffedCount(e).needed, 0) : p.totalPros;
  const firstService = p.needs[0]?.services[0];
  const photo = photoForService(firstService?.serviceType);
  const firstDate = p.needs[0]?.date;
  const cities = Array.from(new Set(p.needs.map((n) => n.location))).join(', ');
  const approved = p.status === 'approved';
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
              {dayLabel(firstDate)}
              {p.needs.length > 1 ? ` + ${p.needs.length - 1} more` : ''} · {cities}
            </p>
            <h3 className="lt-h3">{p.clientName}</h3>
            <div className="ops-card-sub">
              {p.optionName ? `${p.optionName} · ` : ''}
              {approved ? `Updated ${shortDate(p.updatedAt)}` : p.likelySetBy ? `Flagged by ${p.likelySetBy} on ${shortDate(p.likelySetAt)}` : ''}
              {' · '}
              <a href={`/proposal/${p.id}`} target="_blank" rel="noreferrer">
                Open proposal
              </a>
            </div>
          </div>
          <div className="ops-card-actions">
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
        {approved && !p.eventIDs.length && (
          <p className="ops-muted">No coordinator event yet. Create it from the Admin page and its seats show here.</p>
        )}
        {!!p.missingEventIDs.length && (
          <p className="ops-muted">
            {p.missingEventIDs.length} linked event{p.missingEventIDs.length === 1 ? '' : 's'} not found on this backend.
          </p>
        )}

        <div className="ops-metrics">
          <div className="ops-metric">
            <div className={`pv-bignum${staffed < needed ? ' is-short' : ''}`}>
              {staffed}/{needed}
            </div>
            <div className="ops-metric-sub">Pros staffed</div>
          </div>
          <div className="ops-metric">
            <div className="pv-bignum">{p.needs.length}</div>
            <div className="ops-metric-sub">Event day{p.needs.length === 1 ? '' : 's'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventCard: React.FC<{ event: OpsEvent; onStaff: () => void }> = ({ event, onStaff }) => {
  const { staffed, needed } = staffedCount(event);
  const seatType = event.seats.find((s) => s.proType)?.proType;
  const photo = photoForProType(seatType);
  return (
    <div className="ops-card">
      <div className="ops-card-photo">{photo && <img src={photo} alt="" />}</div>
      <div className="ops-card-body">
        <div className="ops-card-top">
          <div>
            <p className="lt-eyebrow">
              {eventDay(event)} · {eventHours(event)}
            </p>
            <h3 className="lt-h3">{event.name}</h3>
            <div className="ops-card-sub">{eventAddress(event)}</div>
          </div>
          <div className="ops-card-actions">
            <button className="lt-btn lt-btn-navy lt-btn-sm" onClick={onStaff}>
              Find Pros
            </button>
          </div>
        </div>
        <EventSeats event={event} />
        <div className="ops-metrics">
          <div className="ops-metric">
            <div className={`pv-bignum${staffed < needed ? ' is-short' : ''}`}>
              {staffed}/{needed}
            </div>
            <div className="ops-metric-sub">Pros staffed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sales flags a pending proposal so ops starts early; the first flag alerts Pedro.
const FlagLikely: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [open, setOpen] = useState(false);
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
    if (!open) return;
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, open, search]);

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
    <div className="lt-card ops-flag">
      <button className="ops-flag-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ops-flag-title">
          <Flag size={18} className="text-shortcut-coral" /> Flag a proposal as likely to close
        </span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {open && (
        <div className="ops-stack ops-flag-body">
          <p className="lt-body">Flag a proposal that hasn't been approved yet and Pedro gets a Slack heads up to start finding Pros.</p>
          <div className="ops-field">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-shortcut-blue" />
              <input className="ops-input w-full pl-11" placeholder="Search by client" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
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
      )}
    </div>
  );
};

export default OpsDashboard;
