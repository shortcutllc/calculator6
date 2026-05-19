import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Crosshair, BarChart3, Search, FileDown, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

type TabId = 'playA' | 'playB' | 'recon';

interface PlayARow {
  rank: number; play_score: number; fit_score: number; company_name: string;
  employees: string; industry: string; sites_served: number; sites_list: string;
  generated_at: string;
}
interface PlayBRow {
  rank: number; score: number; company_name: string; domain: string;
  employees: string; industry: string; contact_name: string;
  contact_title: string; title_category: string; generated_at: string;
}
interface ReconRow {
  bucket: string; total: number; title_breakdown: Record<string, number>;
  generated_at: string;
}

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'playA', label: 'Play A — Expand', icon: <Target size={18} /> },
  { id: 'playB', label: 'Play B — Net-New', icon: <Crosshair size={18} /> },
  { id: 'recon', label: 'Reconciliation', icon: <BarChart3 size={18} /> },
];

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const SalesIntelligence: React.FC = () => {
  const [tab, setTab] = useState<TabId>('playA');
  const [playA, setPlayA] = useState<PlayARow[]>([]);
  const [playB, setPlayB] = useState<PlayBRow[]>([]);
  const [recon, setRecon] = useState<ReconRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, b, r] = await Promise.all([
        supabase.from('crm_play_a').select('*').order('rank', { ascending: true }),
        supabase.from('crm_play_b').select('*').order('rank', { ascending: true }),
        supabase.from('crm_reconciliation').select('*').order('total', { ascending: false }),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      if (r.error) throw r.error;
      setPlayA(a.data || []); setPlayB(b.data || []); setRecon(r.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generatedAt = playA[0]?.generated_at || playB[0]?.generated_at || recon[0]?.generated_at || null;

  const fa = useMemo(
    () => playA.filter((x) => !search || x.company_name?.toLowerCase().includes(search.toLowerCase())),
    [playA, search],
  );
  const fb = useMemo(
    () => playB.filter((x) => !search
      || x.company_name?.toLowerCase().includes(search.toLowerCase())
      || x.contact_title?.toLowerCase().includes(search.toLowerCase())),
    [playB, search],
  );

  const th = 'text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2';
  const td = 'px-3 py-2 text-sm text-gray-800 border-t border-gray-100';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-extrabold text-shortcut-navy-blue flex items-center gap-3">
          <Target size={28} /> Sales Intelligence
        </h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <RefreshCw size={16} /> Reload
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {generatedAt
          ? `Lists generated ${formatDistanceToNow(new Date(generatedAt), { addSuffix: true })} — read-only; regenerated on schedule.`
          : 'No data generated yet.'}
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded flex items-center gap-2 mb-4">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id
                ? 'border-shortcut-navy-blue text-shortcut-navy-blue'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab !== 'recon' && (
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or title…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <button
            onClick={() => (tab === 'playA'
              ? exportCSV(fa as unknown as Record<string, unknown>[], 'play_a.csv')
              : exportCSV(fb as unknown as Record<string, unknown>[], 'play_b.csv'))}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <FileDown size={16} /> Export CSV
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : tab === 'playA' ? (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={th}>#</th><th className={th}>Company</th><th className={th}>Fit</th>
                <th className={th}>Employees</th><th className={th}>Industry</th>
                <th className={th}>We serve</th><th className={th}>Offices</th>
              </tr>
            </thead>
            <tbody>
              {fa.map((r) => (
                <tr key={r.rank} className="hover:bg-gray-50">
                  <td className={td}>{r.rank}</td>
                  <td className={`${td} font-medium`}>{r.company_name}</td>
                  <td className={td}>{r.fit_score}</td>
                  <td className={td}>{r.employees}</td>
                  <td className={td}>{r.industry}</td>
                  <td className={td}>{r.sites_served}</td>
                  <td className={`${td} text-gray-500`}>{r.sites_list}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'playB' ? (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={th}>#</th><th className={th}>Company</th><th className={th}>Score</th>
                <th className={th}>Employees</th><th className={th}>Industry</th>
                <th className={th}>Contact</th><th className={th}>Title</th>
              </tr>
            </thead>
            <tbody>
              {fb.map((r) => (
                <tr key={`${r.rank}-${r.domain}`} className="hover:bg-gray-50">
                  <td className={td}>{r.rank}</td>
                  <td className={`${td} font-medium`}>{r.company_name}</td>
                  <td className={td}>{r.score}</td>
                  <td className={td}>{r.employees}</td>
                  <td className={td}>{r.industry}</td>
                  <td className={td}>{r.contact_name}</td>
                  <td className={`${td} text-gray-500`}>{r.contact_title} <span className="text-xs text-gray-400">({r.title_category})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {recon.map((r) => (
            <div key={r.bucket} className="border border-gray-200 rounded p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-gray-800">{r.bucket.replace(/_/g, ' ')}</h3>
                <span className="text-2xl font-bold text-shortcut-navy-blue">{r.total.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(r.title_breakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([t, n]) => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {t}: {n.toLocaleString()}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesIntelligence;
