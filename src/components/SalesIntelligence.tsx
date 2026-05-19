import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Crosshair, BarChart3, Search, FileDown, RefreshCw, AlertCircle, PenLine, X, Copy, Check, Send, Mail } from 'lucide-react';
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
  contact_email: string | null; contact_linkedin: string | null; contact_location: string | null;
}
interface ReconRow {
  bucket: string; total: number; title_breakdown: Record<string, number>;
  generated_at: string;
}

interface DraftDirection { label: string; subject: string; body: string }
interface DraftResponse {
  target: Record<string, unknown>;
  preflight: { recommendation?: string; suppressed?: boolean; is_client?: boolean; contacted?: boolean } | null;
  drafts: DraftDirection[];
  fight_for: string | null;
  fight_for_reason: string | null;
  grounding_note: string;
}
type DraftTarget = { play: 'A' | 'B'; rank: number; company: string; prefillEmail?: string | null };

const RECO_COPY: Record<string, { tone: string; text: string }> = {
  skip_suppressed: { tone: 'bg-red-50 text-red-700', text: 'Suppressed / do-not-contact. Do not send.' },
  skip_already_client: { tone: 'bg-amber-50 text-amber-700', text: 'Already an active client. This is an expansion touch, not a cold pitch.' },
  caution_recently_contacted: { tone: 'bg-amber-50 text-amber-700', text: 'Contacted in the last 90 days with no reply. Consider a different angle or waiting.' },
  ok_to_proceed: { tone: 'bg-green-50 text-green-700', text: 'Clear to reach out. No prior contact or suppression found.' },
};

const DraftModal: React.FC<{ target: DraftTarget; onClose: () => void }> = ({ target, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DraftResponse | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [gmail, setGmail] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [toEmail, setToEmail] = useState(target.prefillEmail || '');
  const [sending, setSending] = useState<string | null>(null);
  const [confirmLabel, setConfirmLabel] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<
    { label: string; kind: 'ok' | 'blocked' | 'err'; text: string; canForce?: boolean } | null
  >(null);

  const authedFetch = async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');
    return fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers || {}),
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch('/.netlify/functions/gmail-status', { method: 'GET' });
        const j = await res.json();
        if (!cancelled && res.ok) setGmail({ connected: !!j.connected, email: j.email || null });
      } catch { /* status is best-effort; copy path still works */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const connectGmail = async () => {
    try {
      const res = await authedFetch('/.netlify/functions/gmail-oauth-start', { method: 'POST', body: '{}' });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || 'Could not start Gmail connect');
      window.open(j.url, '_blank', 'noopener');
    } catch (e) {
      setSendResult({ label: '', kind: 'err', text: e instanceof Error ? e.message : 'Connect failed' });
    }
  };

  const sendDraft = async (label: string, force = false) => {
    setSending(label); setSendResult(null); setConfirmLabel(null);
    try {
      const res = await authedFetch('/.netlify/functions/send-as-rep', {
        method: 'POST',
        body: JSON.stringify({
          play: target.play, rank: target.rank,
          to: toEmail.trim(), fromEmail: gmail?.email,
          subject: subjects[label], body: bodies[label],
          acknowledgedCaution: force,
        }),
      });
      const j = await res.json();
      if (res.status === 409 && j.blocked) {
        const recent = j.reason === 'recently_contacted';
        setSendResult({
          label, kind: 'blocked', canForce: recent,
          text: j.reason === 'suppressed' ? 'Blocked: recipient is suppressed / do-not-contact.'
            : j.reason === 'already_client' ? 'Blocked: already an active client.'
            : 'Caution: contacted in the last 90 days with no reply.',
        });
        return;
      }
      if (!res.ok || !j.success) throw new Error(j.error || `Send failed (${res.status})`);
      setSendResult({ label, kind: 'ok', text: `Sent to ${toEmail.trim()}.` });
    } catch (e) {
      setSendResult({ label, kind: 'err', text: e instanceof Error ? e.message : 'Send failed' });
    } finally {
      setSending(null);
    }
  };

  const openInGmail = async (label: string) => {
    setSending(label); setSendResult(null); setConfirmLabel(null);
    try {
      const res = await authedFetch('/.netlify/functions/send-as-rep', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'open',
          play: target.play, rank: target.rank,
          to: toEmail.trim(), fromEmail: gmail?.email,
          subject: subjects[label], body: bodies[label],
        }),
      });
      const j = await res.json();
      if (res.status === 409 && j.blocked) {
        setSendResult({
          label, kind: 'blocked',
          text: j.reason === 'suppressed' ? 'Blocked: recipient is suppressed / do-not-contact.'
            : j.reason === 'already_client' ? 'Blocked: already an active client.'
            : 'Caution: contacted in the last 90 days. Use Send via Gmail to override.',
        });
        return;
      }
      if (!res.ok || !j.success || !j.open_url) throw new Error(j.error || `Failed (${res.status})`);
      window.open(j.open_url, '_blank', 'noopener');
      setSendResult({ label, kind: 'ok', text: 'Opened in Gmail. Send from there to finish.' });
    } catch (e) {
      setSendResult({ label, kind: 'err', text: e instanceof Error ? e.message : 'Could not open in Gmail' });
    } finally {
      setSending(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not signed in');
        const res = await fetch('/.netlify/functions/draft-outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ play: target.play, rank: target.rank }),
        });
        const j = await res.json();
        if (!res.ok || !j.success) throw new Error(j.error || `Request failed (${res.status})`);
        if (cancelled) return;
        setData(j);
        setBodies(Object.fromEntries((j.drafts || []).map((d: DraftDirection) => [d.label, d.body])));
        setSubjects(Object.fromEntries((j.drafts || []).map((d: DraftDirection) => [d.label, d.subject])));
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to draft');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target]);

  const copy = (label: string) => {
    const text = `Subject: ${subjects[label] || ''}\n\n${bodies[label] || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1800);
    });
  };

  const reco = data?.preflight?.recommendation || '';
  const recoMeta = RECO_COPY[reco];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-shortcut-navy-blue flex items-center gap-2">
              <PenLine size={18} /> Draft outreach — {target.company}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Play {target.play} · rank {target.rank} · human-in-the-loop. Review and edit before sending. The pre-flight gate re-checks the recipient on send.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading && <div className="py-12 text-center text-gray-400">Drafting in brand voice…</div>}
          {err && (
            <div className="bg-red-50 text-red-700 p-3 rounded flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> {err}
            </div>
          )}
          {data && !loading && (
            <>
              {recoMeta && (
                <div className={`text-sm px-3 py-2 rounded ${recoMeta.tone}`}>
                  <span className="font-semibold uppercase text-xs tracking-wide">Pre-flight: </span>
                  {recoMeta.text}
                </div>
              )}
              {data.fight_for && (
                <div className="text-sm bg-blue-50 text-blue-800 px-3 py-2 rounded">
                  <span className="font-semibold">Recommended: {data.fight_for}.</span>{' '}
                  {data.fight_for_reason}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border border-gray-200 rounded p-3 bg-gray-50">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Send to
                  </label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="recipient@company.com"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {gmail?.connected ? (
                    <span className="flex items-center gap-1.5 text-green-700">
                      <Mail size={15} /> {gmail.email}
                    </span>
                  ) : (
                    <button
                      onClick={connectGmail}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded hover:bg-white"
                    >
                      <Mail size={15} /> Connect Gmail
                    </button>
                  )}
                </div>
              </div>

              {(data.drafts || []).map((d) => (
                <div key={d.label} className="border border-gray-200 rounded">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      data.fight_for === d.label ? 'text-blue-700' : 'text-gray-500'}`}>
                      {d.label}{data.fight_for === d.label ? ' · recommended' : ''}
                    </span>
                    <button
                      onClick={() => copy(d.label)}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
                    >
                      {copied === d.label ? <Check size={14} /> : <Copy size={14} />}
                      {copied === d.label ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-3 space-y-2">
                    <input
                      value={subjects[d.label] ?? ''}
                      onChange={(e) => setSubjects((s) => ({ ...s, [d.label]: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-medium"
                    />
                    <textarea
                      value={bodies[d.label] ?? ''}
                      onChange={(e) => setBodies((b) => ({ ...b, [d.label]: e.target.value }))}
                      rows={Math.min(16, Math.max(6, (bodies[d.label] || '').split('\n').length + 1))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono leading-relaxed"
                    />
                    <div className="flex items-center gap-3 pt-1">
                      {confirmLabel === d.label ? (
                        <>
                          <button
                            onClick={() => sendDraft(d.label)}
                            disabled={sending === d.label}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-700 rounded disabled:opacity-40"
                          >
                            <Send size={14} /> {sending === d.label ? 'Sending…' : `Confirm send to ${toEmail.trim()}`}
                          </button>
                          <button
                            onClick={() => setConfirmLabel(null)}
                            className="text-xs text-gray-500 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setSendResult(null); setConfirmLabel(d.label); }}
                            disabled={!gmail?.connected || !toEmail.trim() || sending === d.label}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-shortcut-navy-blue rounded disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Send size={14} /> Send via Gmail
                          </button>
                          <button
                            onClick={() => openInGmail(d.label)}
                            disabled={!toEmail.trim() || sending === d.label}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Mail size={14} /> Open in Gmail
                          </button>
                        </>
                      )}
                      {!gmail?.connected && (
                        <span className="text-xs text-gray-400">Connect Gmail for direct send · Open in Gmail works without it</span>
                      )}
                      {sendResult?.label === d.label && (
                        <span
                          className={`text-xs ${
                            sendResult.kind === 'ok' ? 'text-green-700'
                              : sendResult.kind === 'blocked' ? 'text-amber-700' : 'text-red-700'
                          }`}
                        >
                          {sendResult.text}
                          {sendResult.canForce && (
                            <button
                              onClick={() => sendDraft(d.label, true)}
                              className="ml-2 underline font-medium"
                            >
                              Send anyway
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">{data.grounding_note}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [draftTarget, setDraftTarget] = useState<DraftTarget | null>(null);
  const [gmailNotice, setGmailNotice] = useState<string | null>(null);
  const [pageGmail, setPageGmail] = useState<{ connected: boolean; email: string | null } | null>(null);

  const refreshGmail = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/.netlify/functions/gmail-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await res.json();
      if (res.ok) setPageGmail({ connected: !!j.connected, email: j.email || null });
    } catch { /* best-effort */ }
  }, []);

  const connectGmailPage = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/.netlify/functions/gmail-oauth-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: '{}',
      });
      const j = await res.json();
      if (res.ok && j.url) window.open(j.url, '_blank', 'noopener');
    } catch { /* surfaced via banner on return */ }
  }, []);

  useEffect(() => { refreshGmail(); }, [refreshGmail]);

  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get('gmail');
    if (!g) return;
    setGmailNotice(
      g === 'connected' ? 'Gmail connected. You can now send drafts from your inbox.'
        : g === 'denied' ? 'Gmail connection was declined.'
        : g === 'noretoken' ? 'Gmail returned no refresh token. Remove the app at myaccount.google.com/permissions, then connect again.'
        : 'Gmail connection failed. Please try connecting again.',
    );
    if (g === 'connected') refreshGmail();
    window.history.replaceState({}, '', window.location.pathname);
  }, [refreshGmail]);

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
        <div className="flex items-center gap-4">
          {pageGmail?.connected ? (
            <span className="flex items-center gap-1.5 text-sm text-green-700">
              <Mail size={15} /> {pageGmail.email}
            </span>
          ) : (
            <button
              onClick={connectGmailPage}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
            >
              <Mail size={15} /> Connect Gmail
            </button>
          )}
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <RefreshCw size={16} /> Reload
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {generatedAt
          ? `Lists generated ${formatDistanceToNow(new Date(generatedAt), { addSuffix: true })} — read-only; regenerated on schedule.`
          : 'No data generated yet.'}
      </p>

      {gmailNotice && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded flex items-center justify-between gap-2 mb-4 text-sm">
          <span className="flex items-center gap-2"><Mail size={16} /> {gmailNotice}</span>
          <button onClick={() => setGmailNotice(null)} className="text-blue-500 hover:text-blue-700">
            <X size={16} />
          </button>
        </div>
      )}

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
                <th className={th}></th>
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
                  <td className={td}>
                    <button
                      onClick={() => setDraftTarget({ play: 'A', rank: r.rank, company: r.company_name })}
                      className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                    >
                      <PenLine size={14} /> Draft
                    </button>
                  </td>
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
                <th className={th}></th>
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
                  <td className={td}>
                    <div>{r.contact_name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {r.contact_email
                        ? <span className="text-gray-500">{r.contact_email}</span>
                        : <span className="italic">no email</span>}
                      {r.contact_linkedin && (
                        <a href={r.contact_linkedin} target="_blank" rel="noopener noreferrer"
                          className="text-shortcut-navy-blue hover:underline">in</a>
                      )}
                    </div>
                  </td>
                  <td className={`${td} text-gray-500`}>{r.contact_title} <span className="text-xs text-gray-400">({r.title_category})</span></td>
                  <td className={td}>
                    <button
                      onClick={() => setDraftTarget({ play: 'B', rank: r.rank, company: r.company_name, prefillEmail: r.contact_email })}
                      className="flex items-center gap-1.5 text-xs font-medium text-shortcut-navy-blue hover:underline"
                    >
                      <PenLine size={14} /> Draft
                    </button>
                  </td>
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

      {draftTarget && (
        <DraftModal target={draftTarget} onClose={() => setDraftTarget(null)} />
      )}
    </div>
  );
};

export default SalesIntelligence;
