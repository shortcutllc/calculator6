import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GitMerge, Check, X, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

type Status = 'pending' | 'confirmed' | 'rejected';

interface Candidate {
  id: string;
  candidate_type: string;
  raw_name: string;
  proposed_company_key: string | null;
  evidence: Record<string, unknown> | null;
  status: Status;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  llm_alias_of: 'Alias of existing company',
  llm_known_company: 'Known company (rename)',
  city_suffix_site: 'City-suffix → one company',
  acronym_alias: 'Acronym alias',
  fuzzy_company: 'Fuzzy company match',
};

const EducationReview: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from('crm_alias_candidates')
        .select('*')
        .order('candidate_type', { ascending: true })
        .order('created_at', { ascending: true });
      if (e) throw e;
      setRows((data || []) as Candidate[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = useCallback(async (id: string, status: Status) => {
    setBusy(id);
    const patch = { status, decided_by: user?.email || 'unknown', decided_at: new Date().toISOString() };
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x))); // optimistic
    const { error: e } = await supabase.from('crm_alias_candidates').update(patch).eq('id', id);
    if (e) { setRows(prev); setError(`Save failed: ${e.message}`); }
    setBusy(null);
  }, [rows, user]);

  const counts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, rejected: 0 };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  const shown = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const grouped = useMemo(() => {
    const g: Record<string, Candidate[]> = {};
    for (const r of shown) (g[r.candidate_type] ||= []).push(r);
    return g;
  }, [shown]);

  const th = 'text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2';
  const td = 'px-3 py-2 text-sm text-gray-800 border-t border-gray-100 align-top';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-extrabold text-shortcut-navy-blue flex items-center gap-3">
          <GitMerge size={28} /> Entity Review
        </h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <RefreshCw size={16} /> Reload
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-2">
        Approve or reject proposed company merges/renames. <strong>Approving stages the decision</strong> —
        a maintainer re-runs the graph build to apply confirmed merges (de-fragments Play A, recovers enriched companies).
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded flex items-center gap-2 mb-4">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {(['pending', 'confirmed', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition ${
              filter === f ? 'border-shortcut-navy-blue text-shortcut-navy-blue' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Filter size={14} /> {f}
            {f !== 'all' && <span className="text-xs text-gray-400">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : shown.length === 0 ? (
        <div className="py-16 text-center text-gray-400">Nothing {filter !== 'all' ? filter : ''} here.</div>
      ) : (
        Object.entries(grouped).map(([type, list]) => (
          <div key={type} className="mb-8">
            <h2 className="text-sm font-bold text-gray-700 mb-2">
              {TYPE_LABEL[type] || type} <span className="text-gray-400">({list.length})</span>
            </h2>
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={th}>Raw name</th>
                    <th className={th}>→ Proposed</th>
                    <th className={th}>Why</th>
                    <th className={th}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={`${td} font-medium`}>{r.raw_name}</td>
                      <td className={td}>{r.proposed_company_key || <span className="text-gray-400">—</span>}</td>
                      <td className={`${td} text-gray-500 max-w-md`}>
                        {String((r.evidence && (r.evidence.reasoning || r.evidence.reason)) || '')}
                        {r.evidence && r.evidence.confidence != null && (
                          <span className="text-xs text-gray-400"> · conf {String(r.evidence.confidence)}</span>
                        )}
                      </td>
                      <td className={td}>
                        {r.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              disabled={busy === r.id}
                              onClick={() => decide(r.id, 'confirmed')}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              disabled={busy === r.id}
                              onClick={() => decide(r.id, 'rejected')}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs ${r.status === 'confirmed' ? 'text-green-700' : 'text-red-600'}`}>
                            {r.status} · {r.decided_by || '?'}
                            {r.decided_at && ` · ${formatDistanceToNow(new Date(r.decided_at), { addSuffix: true })}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default EducationReview;
