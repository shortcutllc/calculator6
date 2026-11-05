import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Check, Clock, DollarSign, Eye, FileText, Flag, MapPin, Users } from 'lucide-react';
import { ops, OpsOpenProposal } from '../../services/opsService';
import { OpsSearch } from './OpsSearch';
import { dayLabel, dotClassFor, prosText, shortDate } from './opsFormat';

// The Likely to close view's list (Nov 2026, Will: "like the History tab"): every
// proposal not yet approved that still has a date ahead, soonest first, each with a
// one-click flag. Flagging tells Pedro (the first time) and moves the deal into the
// flagged cards above, where he can start lining up Pros.

function money(n: number): string {
  return n ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
}

export const OpenProposals: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<OpsOpenProposal[] | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const search = useCallback(async (text: string) => {
    try {
      setRows((await ops.pendingProposals(text)).proposals);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, search]);

  const toggle = async (r: OpsOpenProposal) => {
    setBusy(r.id);
    setMsg('');
    setError('');
    try {
      const res = await ops.setLikely(r.id, !r.likely);
      setRows((prev) => (prev || []).map((x) => (x.id === r.id ? { ...x, likely: res.likely } : x)));
      setMsg(
        res.likely
          ? `${r.clientName} is flagged as likely to close${res.alerted ? ', and Pedro has a heads up in Slack' : ''}.`
          : `${r.clientName} is no longer flagged.`
      );
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="ops-open">
      <div className="ops-open-head">
        <div>
          <h3 className="lt-h3">Open proposals</h3>
          <p className="ops-sec-note">
            Not approved yet, with a date still ahead. Soonest first.
            {rows ? ` ${rows.length} proposal${rows.length === 1 ? '' : 's'}.` : ''}
          </p>
        </div>
        <div className="ops-open-search">
          <OpsSearch value={q} onChange={setQ} placeholder="Search by client" />
        </div>
      </div>

      {msg && (
        <div className="ops-notice">
          <Check size={16} /> {msg}
        </div>
      )}
      {error && <div className="ops-error">{error}</div>}
      {!rows && !error && <p className="ops-muted">Loading proposals...</p>}
      {rows && !rows.length && (
        <div className="lt-card">
          <p className="lt-body">{q ? `No open proposals for "${q.trim()}" with a date ahead.` : 'No open proposals with a date ahead.'}</p>
        </div>
      )}

      <div className="ops-prows">
        {(rows || []).map((r) => (
          <div key={r.id} className={`ops-prow${r.likely ? ' is-flagged' : ''}`}>
            <div className="ops-prow-main">
              <div className="ops-prow-title">
                <h4 className="ops-prow-name">{r.clientName}</h4>
                {r.optionName && <span className="ops-pill">{r.optionName}</span>}
              </div>
              <p className="ops-meta">
                Created {shortDate(r.createdAt)}
                {r.updatedAt && shortDate(r.updatedAt) !== shortDate(r.createdAt) ? ` · updated ${shortDate(r.updatedAt)}` : ''}
              </p>
              <div className="ops-pills">
                {r.changesSubmitted ? (
                  <span className="ops-pill is-amber">
                    <Clock size={13} /> Changes submitted
                  </span>
                ) : (
                  <span className="ops-pill is-gray">
                    <FileText size={13} /> Draft
                  </span>
                )}
                {r.services.map((s) => (
                  <span key={s.serviceType} className="ops-pill is-svc">
                    <span className={`pv-dot ${dotClassFor(s.serviceType)}`} aria-hidden />
                    {s.title}
                  </span>
                ))}
              </div>
              <div className="ops-facts">
                <span>
                  <Calendar size={16} aria-hidden />
                  {dayLabel(r.nextDate)}
                  {r.numDates > 1 ? ` + ${r.numDates - 1} more date${r.numDates > 2 ? 's' : ''}` : ''}
                </span>
                <span>
                  <MapPin size={16} aria-hidden />
                  {r.locations.join(', ')}
                </span>
                <span>
                  <Users size={16} aria-hidden />
                  {prosText(r.totalPros)}
                </span>
                {r.totalCost > 0 && (
                  <span>
                    <DollarSign size={16} aria-hidden />
                    {money(r.totalCost)}
                  </span>
                )}
              </div>
            </div>
            <div className="ops-prow-actions">
              <button
                className={`ops-flag-btn${r.likely ? ' is-on' : ''}`}
                disabled={busy === r.id}
                aria-pressed={r.likely}
                onClick={() => toggle(r)}
                title={r.likely ? 'Click to remove the flag' : 'Tell Pedro this deal is likely to close'}
              >
                {r.likely ? <Check size={16} /> : <Flag size={16} />}
                <span>{busy === r.id ? 'Saving...' : r.likely ? 'Likely to close' : 'Flag as likely'}</span>
              </button>
              <a className="ops-view-link" href={`/proposal/${r.id}`} target="_blank" rel="noreferrer">
                <Eye size={16} /> View proposal
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OpenProposals;
