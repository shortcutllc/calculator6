import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/**
 * PipelineBoard: the rep's own pipeline, built server-side by
 * /.netlify/functions/pipeline from their sends, replies, Workhuman notes,
 * proposals, and the client graph. Each rep sees only their own board; the
 * server decides whose board comes back from the caller's JWT. Managers get a
 * rep switcher because the server tells us they are allowed one.
 *
 * Cards can be dragged between columns or moved with the Move menu. A move is
 * a per-rep override stored in pipeline_stage_overrides and shown with a
 * "Moved" chip; "Suggested" puts the card back where the data placed it.
 */

type Stage = 'discovery' | 'active' | 'proposal_sent' | 'negotiation' | 'closing' | 'won' | 'future' | 'account' | 'cold' | 'no_for_now' | 'hidden';

interface Proposal { id: string; client: string; status: string; shared: boolean; created: string; by: string }
interface Row {
  key: string; suggested: Stage; stage: Stage; score: number; flags: string[];
  email: string | null; emails: string[]; name: string | null; title: string | null; company: string | null;
  client: { name: string; events: number; first: string | null; last: string | null } | null;
  tier: string | null; wh_status: string | null; note: string | null; note_meta: string | null; lp_views: number; landing_page: string | null; thread_id: string | null;
  sends: number; last_send: string | null; replies: number; positive: number; last_reply: string | null; last_sentiment: string | null; last_snippet: string | null;
  proposals: Proposal[]; next: string | null; moved: { set_by: string | null; set_at: string } | null;
  contacts?: Row[];
}
interface Board { rep: string; first: string; since: string; generated_at: string; counts: Record<string, number>; rows: Row[] }
interface Viewer { email: string | null; rep: string | null; is_manager: boolean; reps: string[] }

const PIPE: Array<{ id: Stage; label: string; dot: string; grouped?: boolean }> = [
  { id: 'discovery', label: 'Discovery', dot: 'bg-shortcut-teal-blue' },
  { id: 'active', label: 'Active conversation', dot: 'bg-shortcut-coral' },
  { id: 'proposal_sent', label: 'Proposal sent', dot: 'bg-amber-500', grouped: true },
  { id: 'negotiation', label: 'Negotiation', dot: 'bg-indigo-500', grouped: true },
  { id: 'closing', label: 'Closing soon', dot: 'bg-emerald-600', grouped: true },
];
const PARKED: Array<{ id: Stage; label: string; dot: string; grouped?: boolean }> = [
  { id: 'won', label: 'Won this year', dot: 'bg-shortcut-blue', grouped: true },
  { id: 'future', label: 'Future pipeline', dot: 'bg-fuchsia-600' },
];
const OTHER: Array<{ id: Stage; label: string; dot: string; grouped?: boolean }> = [
  { id: 'account', label: 'Existing accounts', dot: 'bg-shortcut-blue', grouped: true },
  { id: 'cold', label: 'Cold, no reply yet', dot: 'bg-gray-400' },
  { id: 'no_for_now', label: 'No for now', dot: 'bg-gray-500' },
  { id: 'hidden', label: 'Hidden', dot: 'bg-gray-300' },
];
const ALL = [...PIPE, ...PARKED, ...OTHER];
const LABEL: Record<string, string> = Object.fromEntries(ALL.map((s) => [s.id, s.label]));
const STAGE_TONE: Record<string, string> = {
  discovery: 'bg-shortcut-teal/40 text-shortcut-blue', active: 'bg-red-100 text-red-800', proposal_sent: 'bg-amber-100 text-amber-900',
  negotiation: 'bg-indigo-100 text-indigo-900', closing: 'bg-emerald-100 text-emerald-900', won: 'bg-shortcut-teal/60 text-shortcut-blue',
  future: 'bg-fuchsia-100 text-fuchsia-900', account: 'bg-shortcut-teal/40 text-shortcut-blue', cold: 'bg-gray-100 text-gray-700', no_for_now: 'bg-gray-200 text-gray-700', hidden: 'bg-gray-200 text-gray-600',
};
const SENT: Record<string, string> = { positive: 'Replied, positive', neutral: 'Replied', later: 'Said later', decline: 'Declined', negative: 'Declined', ooo: 'Out of office', logistics: 'Booth logistics' };
const CACHE_KEY = 'sales_intel.pipeline.v1';
const CACHE_TTL = 15 * 60 * 1000;

const fmtD = (d: string | null | undefined) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
const daysAgo = (d: string | null) => (d ? Math.floor((Date.now() - new Date(`${d}T12:00:00`).getTime()) / 86400000) : null);
const plural = (n: number, w: string, p?: string) => `${n} ${n === 1 ? w : (p || `${w}s`)}`;
const norm = (s: string | null | undefined) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(inc|llc|llp|group)$/, '');

function signal(r: Row): string {
  if (r.stage === 'account' && r.client) return `${plural(r.client.events, 'event')}, last ${fmtD(r.client.last)}`;
  if (r.last_reply) return `${SENT[r.last_sentiment || ''] || 'Replied'} ${fmtD(r.last_reply)}`;
  if (r.proposals.length) { const p = r.proposals[0]; return `Proposal ${p.status}${p.shared ? ', shared' : ''} ${fmtD(p.created)}`; }
  if (r.last_send) return `Emailed ${fmtD(r.last_send)}, ${plural(r.sends, 'touch', 'touches')}, no reply`;
  if (r.note) return 'Personal note, never emailed';
  return '';
}
const lastTouch = (r: Row) => [r.last_send, r.last_reply, ...r.proposals.map((p) => p.created)].filter(Boolean).sort().at(-1) || null;

/** One card per company for the deal-shaped columns; contacts ride along on `contacts`. */
function groupByCompany(list: Row[]): Row[] {
  const m = new Map<string, Row>();
  for (const r of list) {
    const k = norm(r.client?.name || r.company || r.name || 'unknown').slice(0, 12) || r.key;
    const g = m.get(k);
    if (!g) { m.set(k, { ...r, contacts: [r] }); continue; }
    g.contacts!.push(r);
    if (r.score > g.score) Object.assign(g, { ...r, contacts: g.contacts });
  }
  return [...m.values()].map((g) => {
    const cs = g.contacts || [];
    if (cs.length <= 1) return g;
    const names = cs.map((c) => c.name || c.emails[0]).filter(Boolean);
    return { ...g, name: `${plural(cs.length, 'contact')}: ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}`, title: null, emails: [...new Set(cs.flatMap((c) => c.emails))] };
  });
}

const PipelineBoard: React.FC = () => {
  const [board, setBoard] = useState<Board | null>(() => {
    try { const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); return c && Date.now() - c.ts < CACHE_TTL ? c.board : null; } catch { return null; }
  });
  const [viewer, setViewer] = useState<Viewer | null>(() => {
    try { const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); return c?.viewer || null; } catch { return null; }
  });
  const [repChoice, setRepChoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [filter, setFilter] = useState<Stage | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());

  const load = useCallback(async (rep?: string | null) => {
    setLoading(true); setError(null); setNote(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch(`/.netlify/functions/pipeline${rep ? `?rep=${encodeURIComponent(rep)}` : ''}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || `Failed (${res.status})`);
      setBoard(j.board); setViewer(j.viewer); if (j.note) setNote(j.note);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ board: j.board, viewer: j.viewer, ts: Date.now() })); } catch { /* quota */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your pipeline');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (!board) load(repChoice); }, [board, load, repChoice]);

  const showToast = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 1800); };

  const move = useCallback(async (targets: Row[], stage: Stage | '__suggested__') => {
    if (!board) return;
    const keys = targets.map((t) => t.key);
    // Optimistic: reflect the move immediately, then persist. Roll back on failure.
    const prev = board;
    setBoard({ ...board, rows: board.rows.map((r) => keys.includes(r.key) ? { ...r, stage: stage === '__suggested__' ? r.suggested : stage, moved: stage === '__suggested__' ? null : { set_by: viewer?.email || null, set_at: new Date().toISOString() } } : r) });
    setBusyKeys(new Set(keys));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const results = await Promise.all(targets.map((t) => fetch('/.netlify/functions/pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(stage === '__suggested__'
          ? { action: 'reset', key: t.key, rep: repChoice || undefined }
          : { action: 'move', key: t.key, stage, suggested: t.suggested, company: t.company, contact: t.name, email: t.emails[0] || null, rep: repChoice || undefined }),
      }).then(async (r) => ({ ok: r.ok, j: await r.json() }))));
      const bad = results.find((r) => !r.ok || !r.j.success);
      if (bad) throw new Error(bad.j.error || 'Move failed');
      showToast(stage === '__suggested__' ? 'Back to the suggested stage' : `Moved to ${LABEL[stage]}`);
      try { sessionStorage.removeItem(CACHE_KEY); } catch { /* */ }
    } catch (e) {
      setBoard(prev);
      showToast(e instanceof Error ? e.message : 'Move failed');
    } finally { setBusyKeys(new Set()); }
  }, [board, repChoice, viewer]);

  const rows = useMemo(() => (board?.rows || []), [board]);
  const matches = useCallback((r: Row) => {
    if (!q) return true; const s = q.toLowerCase();
    return [r.company, r.name, r.title, r.note, r.emails.join(' ')].some((v) => v && String(v).toLowerCase().includes(s));
  }, [q]);
  const listFor = useCallback((s: { id: Stage; grouped?: boolean }, src: Row[]) => {
    const l = src.filter((r) => r.stage === s.id);
    return (s.grouped ? groupByCompany(l) : l).sort((a, b) => b.score - a.score);
  }, []);

  // ---- derived panels
  const attention = useMemo(() => {
    const out: Array<{ r: Row; why: string; pri: number }> = [];
    for (const r of rows) {
      if (r.stage === 'closing') out.push({ r, why: 'Close it: confirm dates and send the invoice', pri: 0 });
      else if (r.stage === 'negotiation') out.push({ r, why: 'Keep the negotiation moving', pri: 0 });
      else if (r.stage === 'proposal_sent' && /Share|Nudge/.test(r.next || '')) out.push({ r, why: r.next!, pri: 1 });
      else if (r.stage === 'active' && /Reply|Follow up|Send times/.test(r.next || '')) out.push({ r, why: r.next!, pri: 2 });
      else if (r.stage === 'discovery' && /Reply and ask|never emailed/.test(r.next || '')) out.push({ r, why: r.next!, pri: 3 });
      else if (r.stage === 'won' && r.flags.length) out.push({ r, why: r.flags[0], pri: 2 });
    }
    return out.sort((a, b) => a.pri - b.pri || b.r.score - a.r.score);
  }, [rows]);
  const stale = useMemo(() => rows
    .filter((r) => ['active', 'discovery', 'proposal_sent', 'negotiation', 'closing'].includes(r.stage))
    .map((r) => ({ r, d: daysAgo(lastTouch(r)) })).filter((x) => x.d != null && x.d >= 30).sort((a, b) => (b.d || 0) - (a.d || 0)), [rows]);
  const notes = useMemo(() => rows.filter((r) => r.note && r.stage !== 'hidden').sort((a, b) => b.score - a.score), [rows]);

  const toggleOpen = (k: string) => setOpen((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const targetsOf = (r: Row) => r.contacts && r.contacts.length ? r.contacts : [r];

  // ---- render helpers
  const Mover = ({ r }: { r: Row }) => (
    <select
      aria-label="Move to stage"
      value={r.stage}
      disabled={busyKeys.has(r.key)}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); move(targetsOf(r), e.target.value as Stage | '__suggested__'); }}
      className="w-full min-w-0 appearance-none rounded-full border border-gray-200 bg-neutral-light-gray/60 px-3 py-1.5 pr-7 text-xs font-semibold text-text-button-blue hover:border-shortcut-teal-blue focus:border-shortcut-teal-blue focus:outline-none disabled:opacity-50 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M1 1l4 4 4-4%22 fill=%22none%22 stroke=%22%23018EA2%22 stroke-width=%221.6%22 stroke-linecap=%22round%22/></svg>')] bg-no-repeat bg-[right_0.7rem_center]"
    >
      {ALL.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      <option value="__suggested__">Suggested: {LABEL[r.suggested]}</option>
    </select>
  );

  const Card = ({ r }: { r: Row }) => {
    const isOpen = open.has(r.key);
    const hold = /^(Keep|Wait|Confirm|Set)/.test(r.next || '');
    const who = r.name ? `${r.name}${r.title ? ` · ${r.title}` : ''}` : (r.emails[0] || '');
    return (
      <article
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', r.key); e.dataTransfer.effectAllowed = 'move'; }}
        className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm hover:border-gray-300 cursor-grab ${busyKeys.has(r.key) ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="truncate text-[15px] font-bold text-shortcut-blue leading-snug" title={r.company || r.name || ''}>{r.company || r.name || 'Unknown company'}</div>
          <button onClick={() => toggleOpen(r.key)} aria-expanded={isOpen} aria-label="Show details" className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-neutral-light-gray hover:text-shortcut-blue">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {who && <div className="mt-0.5 truncate text-[13px] text-gray-600 leading-snug" title={who}>{who}</div>}
        <div className="mt-2 text-xs text-gray-500">{signal(r)}</div>
        <div className="mt-2.5 flex flex-wrap gap-1.5 empty:hidden">
          {r.moved && <span className="rounded-full bg-shortcut-teal px-2 py-0.5 text-[10.5px] font-bold text-text-button-blue">Moved</span>}
          {r.tier && <span className="rounded-full bg-neutral-light-gray px-2 py-0.5 text-[10.5px] font-bold text-gray-600">Tier {r.tier}</span>}
          {r.note && <span className="rounded-full bg-shortcut-teal/40 px-2 py-0.5 text-[10.5px] font-bold text-shortcut-blue">Personal note</span>}
          {r.lp_views > 0 && <span className="rounded-full bg-neutral-light-gray px-2 py-0.5 text-[10.5px] font-bold text-gray-600">{plural(r.lp_views, 'page view')}</span>}
          {r.client && r.stage !== 'account' && <span className="rounded-full bg-shortcut-teal/60 px-2 py-0.5 text-[10.5px] font-bold text-shortcut-blue">Client</span>}
          {r.flags.map((f) => <span key={f} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-900">{f}</span>)}
        </div>
        {r.next && r.stage !== 'hidden' && (
          <div className="mt-3 flex items-start gap-2 border-t border-gray-100 pt-3 text-[13px] leading-snug text-text-dark">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${hold ? 'bg-shortcut-teal-blue' : 'bg-shortcut-coral'}`} />
            <span>{r.next}</span>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <Mover r={r} />
        </div>
        {isOpen && (
          <div className="mt-2 space-y-2 border-t border-dashed border-gray-200 pt-2 text-xs text-gray-600">
            {r.note && (<div><div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Your note{r.note_meta ? ` (${r.note_meta})` : ''}</div><blockquote className="mt-0.5 rounded-r-md border-l-2 border-shortcut-teal-blue bg-neutral-light-gray px-2 py-1 text-text-dark">{r.note}</blockquote></div>)}
            {r.last_snippet && (<div><div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Latest reply, {fmtD(r.last_reply)}</div><blockquote className="mt-0.5 rounded-r-md border-l-2 border-shortcut-teal-blue bg-neutral-light-gray px-2 py-1 text-text-dark">{r.last_snippet}</blockquote></div>)}
            {r.proposals.length > 0 && (<div><div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Proposals</div>{r.proposals.map((p) => <div key={p.id}><a className="text-shortcut-navy-blue hover:underline" href={`/proposal/${p.id}`} target="_blank" rel="noreferrer">{p.client}</a>: {p.status}{p.shared ? ' (shared)' : ''}, {fmtD(p.created)} by {p.by}</div>)}</div>)}
            <div><div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">History</div>{plural(r.sends, 'email')} sent{r.last_send ? `, last ${fmtD(r.last_send)}` : ''}{r.replies ? `, ${plural(r.replies, 'reply', 'replies')}` : ''}{r.wh_status ? `, Workhuman: ${r.wh_status.replace(/_/g, ' ')}` : ''}{r.client ? `, client since ${r.client.first || 'earlier'}` : ''}</div>
            {r.emails.length > 0 && (<div><div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Email</div>{r.emails.map((e) => <a key={e} className="mr-2 text-shortcut-navy-blue hover:underline" href={`mailto:${e}`}>{e}</a>)}</div>)}
            {r.landing_page && <div><a className="text-shortcut-navy-blue hover:underline" href={r.landing_page} target="_blank" rel="noreferrer">Landing page</a></div>}
            {r.moved && <div className="text-gray-400">Moved by {r.moved.set_by || 'you'}, {new Date(r.moved.set_at).toLocaleDateString()}</div>}
          </div>
        )}
      </article>
    );
  };

  // ---- top-level states
  if (error) return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" /><div>{error} <button onClick={() => load(repChoice)} className="ml-2 font-semibold underline">Try again</button></div></div>
  );
  if (!board && loading) return <div className="py-16 text-center text-gray-400">Building your pipeline…</div>;
  if (!board) return (
    <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" /><div>{note || 'No board is set up for this account yet.'}</div></div>
  );

  const live = rows.filter((r) => !['cold', 'account', 'hidden', 'no_for_now'].includes(r.stage)).length;
  const cols = filter ? ALL.filter((s) => s.id === filter) : PIPE;
  const visible = rows.filter(matches);
  const tiles: Array<{ id: string; label: string; dot: string; ids: Stage[]; grouped?: boolean; filter?: Stage }> = [
    { id: 'won', label: 'Won this year', dot: 'bg-shortcut-blue', ids: ['won'], grouped: true, filter: 'won' },
    { id: 'late', label: 'Late stage', dot: 'bg-emerald-600', ids: ['negotiation', 'closing'], grouped: true },
    { id: 'proposal_sent', label: 'Proposal sent', dot: 'bg-amber-500', ids: ['proposal_sent'], grouped: true, filter: 'proposal_sent' },
    { id: 'active', label: 'Active conversation', dot: 'bg-shortcut-coral', ids: ['active'], filter: 'active' },
    { id: 'discovery', label: 'Discovery', dot: 'bg-shortcut-teal-blue', ids: ['discovery'], filter: 'discovery' },
    { id: 'future', label: 'Future pipeline', dot: 'bg-fuchsia-600', ids: ['future'], filter: 'future' },
  ];
  const tileSub = (id: string, raw: Row[]) => {
    if (id === 'late') return raw.length ? `${rows.filter((r) => r.stage === 'closing').length} closing soon` : 'Drag deals here as they progress';
    if (id === 'proposal_sent') return `${raw.filter((r) => r.flags.some((f) => /not shared/.test(f))).length} not shared yet`;
    if (id === 'active') return `${raw.filter((r) => /^(Follow up|Reply)/.test(r.next || '')).length} waiting on you`;
    if (id === 'discovery') return `${raw.filter((r) => r.note).length} with a personal note`;
    if (id === 'won') return raw.length !== groupByCompany(raw).length ? plural(raw.length, 'contact') : '';
    return raw.length ? 'Set reminders' : '';
  };

  return (
    <div>
      {/* header row */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-shortcut-blue tracking-tight">{board.first}, your pipeline since January</h2>
          <p className="mt-1 text-sm text-gray-600">{plural(live, 'live opportunity', 'live opportunities')} · {plural(rows.filter((r) => r.stage === 'account').length, 'contact')} at existing accounts · {rows.filter((r) => r.stage === 'cold').length} cold</p>
        </div>
        <div className="flex items-center gap-2">
          {viewer?.is_manager && viewer.reps.length > 1 && (
            <select value={repChoice || viewer.rep || ''} onChange={(e) => { const v = e.target.value; setRepChoice(v === viewer.rep ? null : v); setFilter(null); setBoard(null); }} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-text-button-blue" aria-label="Whose board">
              {viewer.reps.map((n) => <option key={n} value={n}>{n === viewer.rep ? `${n} (you)` : n}</option>)}
            </select>
          )}
          <button onClick={() => { try { sessionStorage.removeItem(CACHE_KEY); } catch { /* */ } load(repChoice); }} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-text-button-blue hover:border-shortcut-teal-blue disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* tiles */}
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => {
          const raw = rows.filter((r) => t.ids.includes(r.stage));
          const n = t.grouped ? groupByCompany(raw).length : raw.length;
          const active = t.filter && filter === t.filter;
          return (
            <button key={t.id} disabled={!t.filter} onClick={() => t.filter && setFilter(active ? null : t.filter)} aria-pressed={!!active}
              className={`rounded-2xl border p-4 text-left ${active ? 'border-shortcut-blue bg-white' : 'border-transparent bg-neutral-light-gray hover:border-gray-300'} disabled:cursor-default`}>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-600"><span className={`h-2 w-2 rounded-full ${t.dot}`} />{t.label}</div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-shortcut-blue">{n}</div>
              <div className="mt-1 min-h-[17px] text-xs text-gray-600">{tileSub(t.id, raw)}</div>
            </button>
          );
        })}
      </div>

      {/* pills */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400">Not on the board</span>
        {[...PARKED, ...OTHER].map((s) => {
          const n = listFor(s, rows).length; const active = filter === s.id;
          return (
            <button key={s.id} onClick={() => setFilter(active ? null : s.id)} aria-pressed={active}
              className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${active ? 'border-shortcut-teal bg-shortcut-teal text-text-button-blue' : 'border-gray-200 bg-white text-text-button-blue hover:border-shortcut-teal-blue'}`}>
              {s.label}<span className="ml-1.5 text-gray-500">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-neutral-light-gray p-0.5">
              {(['board', 'list'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-full px-3.5 py-1 text-xs font-bold ${view === v ? 'bg-white text-shortcut-blue shadow-sm' : 'text-gray-600'}`}>{v === 'board' ? 'Board' : 'List'}</button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, name, or note" aria-label="Search" className="w-64 rounded-full border-2 border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-shortcut-teal-blue focus:outline-none" />
            </div>
            <span className="ml-auto text-xs text-gray-400">{filter ? `Showing ${LABEL[filter]} only. Click it again to clear.` : 'Drag cards between columns, or use the menu on a card. Won and Future live in the tiles above.'}</span>
          </div>

          {view === 'board' ? (
            <div className="overflow-x-auto pb-2">
              <div className={`grid gap-3 ${cols.length === 1 ? 'max-w-2xl grid-cols-1' : 'grid-cols-[repeat(5,minmax(236px,1fr))]'}`}>
                {cols.map((s) => {
                  const list = listFor(s, visible);
                  const cap = showAll.has(s.id) || filter ? list.length : 8;
                  return (
                    <section key={s.id} data-stage={s.id}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(s.id); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => {
                        e.preventDefault(); setDragOver(null);
                        const key = e.dataTransfer.getData('text/plain');
                        const src = rows.find((r) => r.key === key); if (!src || src.stage === s.id) return;
                        // A dropped company card moves every contact under it.
                        const group = ALL.find((x) => x.id === src.stage)?.grouped ? groupByCompany(rows.filter((r) => r.stage === src.stage)).find((g) => g.key === key) : null;
                        move(group ? targetsOf(group) : [src], s.id);
                      }}
                      className={`rounded-2xl bg-neutral-light-gray p-2.5 ${dragOver === s.id ? 'ring-2 ring-shortcut-teal-blue' : ''}`}>
                      <header className="flex items-center gap-2 px-2 pb-3 pt-2">
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <h3 className="flex-1 text-[11.5px] font-bold uppercase tracking-wider text-gray-600">{s.label}</h3>
                        <span className="text-xs font-bold text-gray-400">{list.length}</span>
                      </header>
                      <div className="flex min-h-[40px] flex-col gap-2.5">
                        {list.slice(0, cap).map((r) => <Card key={r.key} r={r} />)}
                        {!list.length && <div className="px-2 pb-3 pt-2 text-xs text-gray-400">Nothing here yet. Drag a card in.</div>}
                      </div>
                      {list.length > cap && <button onClick={() => setShowAll((p) => new Set(p).add(s.id))} className="mt-1 w-full px-2 py-2 text-left text-xs font-bold text-shortcut-teal-blue">Show all {list.length}</button>}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-neutral-light-gray text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>{['Stage', 'Company', 'Contact', 'Last signal', 'Next action', 'Move'].map((h) => <th key={h} className="px-3.5 py-2.5">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {visible.filter((r) => !filter || r.stage === filter).sort((a, b) => ALL.findIndex((s) => s.id === a.stage) - ALL.findIndex((s) => s.id === b.stage) || b.score - a.score).map((r) => (
                    <tr key={r.key} className="border-t border-gray-100 align-top">
                      <td className="px-3.5 py-2.5"><span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${STAGE_TONE[r.stage]}`}>{LABEL[r.stage]}</span>{r.moved && <div className="text-[11px] text-gray-400">moved</div>}</td>
                      <td className="px-3.5 py-2.5 font-bold text-shortcut-blue">{r.company}</td>
                      <td className="px-3.5 py-2.5">{r.name || r.emails[0]}{r.title && <div className="text-xs text-gray-500">{r.title}</div>}</td>
                      <td className="px-3.5 py-2.5 text-gray-600">{signal(r)}{r.note && <div className="text-xs text-gray-500">{r.note.slice(0, 90)}{r.note.length > 90 ? '…' : ''}</div>}{r.flags.length > 0 && <div className="text-xs text-amber-800">{r.flags.join('; ')}</div>}</td>
                      <td className="px-3.5 py-2.5 text-text-dark">{r.next}</td>
                      <td className="px-3.5 py-2.5 w-44"><Mover r={r} /></td>
                    </tr>
                  ))}
                  {!visible.length && <tr><td colSpan={6} className="px-3.5 py-6 text-center text-gray-400">Nothing matches.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel title="This week" count={attention.length}>
            {attention.length ? attention.slice(0, 8).map((a) => <Item key={a.r.key} c={a.r.company || a.r.name || ''} a={a.why} d={LABEL[a.r.stage]} hot />) : <Empty>Nothing urgent surfaced. Work the Discovery column.</Empty>}
          </Panel>
          <Panel title="Going stale" count={stale.length}>
            {stale.length ? stale.slice(0, 6).map((x) => <Item key={x.r.key} c={x.r.company || x.r.name || ''} a={`${LABEL[x.r.stage]}${x.r.name && x.r.company ? `, ${x.r.name}` : ''}`} d={`${x.d} days`} hot />) : <Empty>Nothing over 30 days quiet.</Empty>}
          </Panel>
          <Panel title="Workhuman notes" count={notes.length}>
            {notes.length ? notes.slice(0, 8).map((r) => <Item key={r.key} c={r.name || r.company || ''} a={`${r.note!.slice(0, 100)}${r.note!.length > 100 ? '…' : ''}`} d={LABEL[r.stage]} />) : <Empty>No stamped personal notes assigned to you.</Empty>}
          </Panel>
          <Panel title="How this works">
            <p className="text-xs text-gray-600">Suggested stages come from your sends and replies, Workhuman notes, proposals, and the client event graph since {fmtD(board.since)}. Won is an approved proposal or a client whose first event was this year. Negotiation and Closing soon are yours to set. Moves are saved to your board only.</p>
            <p className="mt-2 text-xs text-gray-600">Booth-week scheduling replies and out-of-office autoreplies were not counted as warmth. Vendors and your own addresses were left out.</p>
          </Panel>
        </aside>
      </div>

      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-shortcut-blue px-4 py-2 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  );
};

const Panel: React.FC<{ title: string; count?: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <h3 className="mb-3 flex justify-between text-[11.5px] font-bold uppercase tracking-wider text-gray-600">{title}{count ? <span className="text-gray-400">{count}</span> : null}</h3>
    <div className="divide-y divide-gray-100">{children}</div>
  </div>
);
const Item: React.FC<{ c: string; a: string; d: string; hot?: boolean }> = ({ c, a, d, hot }) => (
  <div className="grid grid-cols-[1fr_auto] gap-3 py-2.5 first:pt-0 last:pb-0 text-sm">
    <div><div className="font-bold text-shortcut-blue leading-tight">{c}</div><div className="text-xs text-gray-600">{a}</div></div>
    <div className={`whitespace-nowrap text-xs font-bold ${hot ? 'text-red-700' : 'text-gray-400'}`}>{d}</div>
  </div>
);
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="text-sm text-gray-400">{children}</div>;

export default PipelineBoard;
