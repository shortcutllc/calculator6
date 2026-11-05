import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, MapPin, Users, Flag, Search, ExternalLink, AlertCircle } from 'lucide-react';
import { ops, OpsBoard, OpsError, OpsEvent, OpsProposal } from '../../services/opsService';
import { EventSeats, StaffPanel, StaffTarget } from './StaffPanel';
import ProGroups from './ProGroups';
import { dayLabel, eventAddress, eventDay, eventHours, needSummary, proposalStatusLabel, shortDate, staffedCount } from './opsFormat';

// Pedro's staffing dashboard (Nov 2026). Approved proposals, and pending ones flagged
// "likely to close", with what each needs; the coordinator events made from them and
// their seats; other upcoming events still short of Pros. From any of them: find Pros
// nearby, text them from the Pros line, see their answers, and put a yes on the event.

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

  if (error && error.status === 403) {
    return (
      <Page>
        <div className="card-medium text-text-dark">{error.message}</div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Staffing</h1>
          <p className="mt-2 text-text-dark">
            Approved and likely proposals, their events, and the Pros to staff them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {board?.backend === 'dev' && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Dev backend</span>
          )}
          <button
            onClick={load}
            className="inline-flex items-center gap-1 rounded-full border-2 border-[#9EFAFF] px-4 py-2 text-xs font-bold text-[#09364f]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {(['staffing', 'groups'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold ${
              tab === t ? 'border-shortcut-blue text-shortcut-blue' : 'border-transparent text-text-dark-60'
            }`}
          >
            {t === 'staffing' ? 'To staff' : 'Pro groups'}
          </button>
        ))}
      </div>

      {tab === 'groups' ? (
        <ProGroups />
      ) : (
        <>
          {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error.message}</div>}
          {board?.warnings.map((w) => (
            <div key={w} className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
              <AlertCircle size={15} /> {w}
            </div>
          ))}

          <FlagLikely onChanged={load} />

          <section className="mt-6 space-y-4">
            <h2 className="text-xl font-extrabold text-shortcut-blue">Proposals to staff</h2>
            {loading && !board && <p className="text-sm text-text-dark-60">Loading...</p>}
            {board && !board.proposals.length && (
              <div className="card-small text-text-dark">Nothing approved or flagged right now.</div>
            )}
            {board?.proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} onStaff={() => setTarget({ proposal: p })} />
            ))}
          </section>

          {!!board?.otherEvents.length && (
            <section className="mt-10 space-y-3">
              <h2 className="text-xl font-extrabold text-shortcut-blue">Other events short of Pros</h2>
              <p className="text-sm text-text-dark">Upcoming coordinator events in the next 60 days that didn't come from a proposal here.</p>
              {board.otherEvents.map((e) => (
                <EventRow key={e.id} event={e} onStaff={() => setTarget({ event: e })} />
              ))}
            </section>
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
    </Page>
  );
};

const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-neutral-light-gray">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
  </div>
);

const ProposalCard: React.FC<{ proposal: OpsProposal; onStaff: () => void }> = ({ proposal: p, onStaff }) => {
  const status = proposalStatusLabel(p);
  const staffed = p.events.reduce((sum, e) => sum + staffedCount(e).staffed, 0);
  const needed = p.events.length ? p.events.reduce((sum, e) => sum + staffedCount(e).needed, 0) : p.totalPros;
  return (
    <div className="card-small">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-extrabold text-shortcut-blue">{p.clientName}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span>
            {p.optionName && <span className="text-xs font-bold text-text-dark">{p.optionName}</span>}
          </div>
          <div className="mt-1 text-xs text-text-dark">
            {p.status === 'approved' ? `Updated ${shortDate(p.updatedAt)}` : p.likelySetBy ? `Flagged by ${p.likelySetBy} ${shortDate(p.likelySetAt)}` : ''}
            {' · '}
            <a className="text-shortcut-navy-blue underline" href={`/proposal/${p.id}`} target="_blank" rel="noreferrer">
              Open proposal <ExternalLink size={11} className="inline" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-sm font-bold ${staffed < needed ? 'text-red-700' : 'text-green-700'}`}>
            <Users size={15} /> {staffed}/{needed} Pros
          </span>
          <button
            onClick={onStaff}
            className="rounded-full bg-[#9EFAFF] px-5 py-2 text-sm font-bold text-[#09364f]"
          >
            Find Pros
          </button>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm text-text-dark">
        {p.needs.map((n, i) => (
          <li key={i} className="flex flex-wrap gap-x-2">
            <span className="font-bold">{dayLabel(n.date)}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} className="text-shortcut-coral" /> {n.address}
            </span>
            <span>{needSummary(n)}</span>
          </li>
        ))}
      </ul>

      {p.events.length > 0 && (
        <div className="mt-3 space-y-2">
          {p.events.map((e) => (
            <EventSeats key={e.id} event={e} />
          ))}
        </div>
      )}
      {p.status === 'approved' && !p.eventIDs.length && (
        <p className="mt-3 text-sm text-text-dark">No coordinator event yet. Create it from the Admin page and its seats show here.</p>
      )}
      {!!p.missingEventIDs.length && (
        <p className="mt-2 text-xs text-text-dark">
          {p.missingEventIDs.length} linked event{p.missingEventIDs.length === 1 ? '' : 's'} not found on this backend.
        </p>
      )}
    </div>
  );
};

const EventRow: React.FC<{ event: OpsEvent; onStaff: () => void }> = ({ event, onStaff }) => {
  const { staffed, needed } = staffedCount(event);
  return (
    <div className="card-small flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-extrabold text-shortcut-blue">{event.name}</div>
        <div className="text-sm text-text-dark">
          {eventDay(event)}, {eventHours(event)} · {eventAddress(event)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-red-700">
          {staffed}/{needed} Pros
        </span>
        <a className="text-xs font-bold text-shortcut-navy-blue underline" href={event.links.addPro} target="_blank" rel="noreferrer">
          Add Pro
        </a>
        <button onClick={onStaff} className="rounded-full border-2 border-[#9EFAFF] px-4 py-1.5 text-xs font-bold text-[#09364f]">
          Find Pros
        </button>
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

  const flagged = useMemo(() => rows.filter((r) => r.likely).length, [rows]);

  return (
    <div className="card-small">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="inline-flex items-center gap-2 font-bold text-shortcut-blue">
          <Flag size={16} className="text-shortcut-coral" /> Flag a proposal as likely to close
        </span>
        <span className="text-xs font-bold text-text-dark">{open ? 'Close' : 'Open'}</span>
      </button>
      {open && (
        <div className="mt-3">
          <p className="text-sm text-text-dark">
            Flag a proposal that hasn't been approved yet and Pedro gets a Slack heads up to start finding Pros.
          </p>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark" />
            <input
              className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm text-text-dark"
              placeholder="Search by client"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {msg && <p className="mt-2 text-sm text-text-dark">{msg}</p>}
          <div className="mt-3 max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-2xl border border-gray-200">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="font-bold text-text-dark">{r.clientName}</div>
                  <div className="text-xs text-text-dark">
                    {r.optionName ? `${r.optionName} · ` : ''}
                    {r.status} · updated {shortDate(r.updatedAt)}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-text-dark">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={r.likely}
                    disabled={busy === r.id}
                    onChange={async (e) => {
                      setBusy(r.id);
                      setMsg('');
                      try {
                        const res = await ops.setLikely(r.id, e.target.checked);
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, likely: res.likely } : x)));
                        if (res.alerted) setMsg(`Pedro has been told about ${r.clientName}.`);
                        onChanged();
                      } catch (err) {
                        setMsg((err as Error).message);
                      } finally {
                        setBusy('');
                      }
                    }}
                  />
                  Likely
                </label>
              </div>
            ))}
            {!rows.length && <div className="px-4 py-3 text-sm text-text-dark">No matching proposals in the last 4 months.</div>}
          </div>
          {flagged > 0 && <p className="mt-2 text-xs text-text-dark">{flagged} flagged in this list.</p>}
        </div>
      )}
    </div>
  );
};

export default OpsDashboard;
