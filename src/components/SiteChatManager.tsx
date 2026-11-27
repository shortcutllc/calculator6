import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, Check, CheckCheck, ArrowLeft, Mail, ExternalLink, RotateCcw, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import {
  listChats, getThread, sendReply, setHandled, SiteChatError, SITE_URL,
  ChatRow, ChatThread, ChatMessage, ChatState, Presence,
} from '../utils/siteChatApi';

// Site Chat: answer website visitors from here instead of from Slack, and see
// whether each reply was seen. Will, 2026-11-13: "i dont know if my slack
// replies are going through". Slack still works and still gets a copy of
// everything; this page adds the reply box and the receipt.
//
// The conversations live on the website (Netlify Blobs), not in Supabase, so
// this page polls the website: the list every 15 seconds, the open
// conversation every 4. Nothing is polled while the tab is hidden.

const LIST_MS = 15000;
const THREAD_MS = 4000;
const MAX_CHARS = 2000;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayOf = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const y = new Date(today.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
const whenOf = (iso: string) => (dayOf(iso) === 'Today' ? timeOf(iso) : `${dayOf(iso)}, ${timeOf(iso)}`);
const agoOf = (iso: string, now: number) => {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hr`;
  return `${Math.round(h / 24)} days`;
};

const STATE_LABEL: Record<ChatState, string> = {
  waiting: 'Needs a reply',
  answered: 'Replied',
  handled: 'Handled',
  bot: 'Answered by the script',
};
const STATE_STYLE: Record<ChatState, string> = {
  waiting: 'bg-red-100 text-red-800',
  answered: 'bg-green-100 text-green-800',
  handled: 'bg-gray-100 text-gray-700',
  bot: 'bg-gray-100 text-gray-700',
};

const presenceLine = (t: ChatThread): { text: string; live: boolean } => {
  if (t.presence === 'open') return { text: 'The visitor has the chat open right now.', live: true };
  if (t.presence === 'on-site') return { text: 'The visitor is on the site with the chat closed. They see a "New reply" badge.', live: true };
  if (t.lastOnSiteAt) return { text: `The visitor has left the site. Last there ${whenOf(t.lastOnSiteAt)}.`, live: false };
  return { text: 'The visitor is not on the site.', live: false };
};

const PresenceDot: React.FC<{ presence: Presence }> = ({ presence }) => (
  presence === 'away' ? null : (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${presence === 'open' ? 'bg-green-500' : 'bg-amber-500'}`}
      title={presence === 'open' ? 'Chat open right now' : 'On the site, chat closed'}
    />
  )
);

const Receipt: React.FC<{ m: ChatMessage; receipts: boolean; pending?: boolean }> = ({ m, receipts, pending }) => {
  if (pending) return <span className="text-gray-500">Sending…</span>;
  if (m.seenAt) {
    return (
      <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
        <CheckCheck size={14} /> Seen by the visitor at {timeOf(m.seenAt)}
      </span>
    );
  }
  if (!receipts) {
    return <span className="inline-flex items-center gap-1 text-gray-600"><Check size={14} /> Delivered to the chat</span>;
  }
  return <span className="inline-flex items-center gap-1 text-gray-600"><Check size={14} /> Delivered to the chat. Not seen yet</span>;
};

const SiteChatManager: React.FC = () => {
  const [rows, setRows] = useState<ChatRow[] | null>(null);
  const [filter, setFilter] = useState<'waiting' | 'all'>('waiting');
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const logRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  const loadList = useCallback(async () => {
    try {
      const data = await listChats();
      setRows(data.chats);
      setListError(null);
    } catch (e) {
      setListError(e instanceof SiteChatError ? e.message : 'Could not load the conversations.');
      setRows((r) => r || []);
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const data = await getThread(id);
      if (selectedRef.current === id) setThread(data.thread);
    } catch (e) {
      if (selectedRef.current === id && e instanceof SiteChatError && e.status !== 0) setError(e.message);
    }
  }, []);

  // The list, every 15 seconds while the tab is visible.
  useEffect(() => {
    loadList();
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadList(); }, LIST_MS);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(t); clearInterval(tick); };
  }, [loadList]);

  // The open conversation, every 4 seconds.
  useEffect(() => {
    if (!selected) { setThread(null); return undefined; }
    setThread(null);
    setError(null);
    setDraft('');
    loadThread(selected);
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadThread(selected); }, THREAD_MS);
    return () => clearInterval(t);
  }, [selected, loadThread]);

  // Keep the newest message in view.
  const messageCount = thread?.messages.length || 0;
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messageCount, sending, selected]);

  const waiting = useMemo(() => (rows || []).filter((r) => r.state === 'waiting'), [rows]);
  const shown = filter === 'waiting' ? waiting : rows || [];

  // Say so in the tab title, so a waiting visitor is visible from another tab.
  const pageTitle = useRef(document.title);
  useEffect(() => {
    const was = pageTitle.current;
    return () => { document.title = was; };
  }, []);
  useEffect(() => {
    document.title = waiting.length ? `(${waiting.length}) Site Chat` : 'Site Chat';
  }, [waiting.length]);

  const submit = async () => {
    const text = draft.trim().slice(0, MAX_CHARS);
    if (!text || !selected || sending) return;
    setSending(text);
    setError(null);
    setDraft('');
    try {
      const data = await sendReply(selected, text);
      if (selectedRef.current === selected) setThread(data.thread);
      loadList();
    } catch (e) {
      setDraft(text);
      setError(e instanceof SiteChatError ? `Not sent. ${e.message}` : 'Not sent. Try again.');
    } finally {
      setSending(null);
    }
  };

  const toggleHandled = async () => {
    if (!thread) return;
    try {
      const data = await setHandled(thread.id, thread.state !== 'handled');
      setThread(data.thread);
      loadList();
    } catch (e) {
      setError(e instanceof SiteChatError ? e.message : 'Could not update the conversation.');
    }
  };

  if (rows === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const presence = thread ? presenceLine(thread) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-shortcut-navy-blue flex items-center gap-3">
            <MessageSquare className="text-shortcut-blue" size={28} />
            Site Chat
            {waiting.length > 0 && (
              <span className="text-base font-medium bg-red-100 text-red-800 px-3 py-1 rounded-full">
                {waiting.length} waiting
              </span>
            )}
          </h1>
          <p className="text-text-dark-60 mt-1">
            Answer website visitors here. Every reply shows when the visitor saw it, and a copy goes to the Slack thread.
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-full bg-gray-100 p-1 self-start sm:self-auto">
          {(['waiting', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${filter === f ? 'bg-white text-shortcut-navy-blue shadow-sm' : 'text-gray-700 hover:text-shortcut-navy-blue'}`}
            >
              {f === 'waiting' ? `Needs a reply (${waiting.length})` : `All (${rows.length})`}
            </button>
          ))}
        </div>
      </div>

      {listError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 text-sm">{listError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Conversations */}
        <div className={`${selected ? 'hidden lg:block' : ''}`}>
          {shown.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-700 text-sm">
              {filter === 'waiting' ? 'Nobody is waiting for a reply.' : 'No conversations yet.'}
            </div>
          ) : (
            <ul className="space-y-2 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:pr-1">
              {shown.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r.id)}
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-colors ${selected === r.id ? 'border-shortcut-blue ring-1 ring-shortcut-blue' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <PresenceDot presence={r.presence} />
                        <span className="text-xs font-semibold text-gray-700 truncate">{r.page}</span>
                      </span>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATE_STYLE[r.state]}`}>
                        {r.state === 'waiting' ? `Waiting ${agoOf(r.since, now)}` : STATE_LABEL[r.state]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-shortcut-navy-blue line-clamp-2">{r.first}</p>
                    <div className="flex items-center justify-between gap-3 mt-2 text-xs text-gray-600">
                      <span>{whenOf(r.updatedAt)}</span>
                      <span className="flex items-center gap-2">
                        {r.hasEmail && <span className="inline-flex items-center gap-1"><Mail size={12} /> Email left</span>}
                        <span>{r.agentMessages ? `${r.agentMessages} from us` : 'No reply from us'}</span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* One conversation */}
        <div className={`${selected ? '' : 'hidden lg:block'}`}>
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-700 text-sm">
              Pick a conversation to read it and reply.
            </div>
          ) : !thread ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex justify-center">
              {error ? <p className="text-sm text-red-800">{error}</p> : <LoadingSpinner size="large" />}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col lg:h-[calc(100vh-240px)] min-h-[480px]">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button onClick={() => setSelected(null)} className="lg:hidden inline-flex items-center gap-1 text-sm font-semibold text-shortcut-blue mb-2">
                      <ArrowLeft size={16} /> All conversations
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATE_STYLE[thread.state]}`}>
                        {thread.state === 'waiting' ? `Waiting ${agoOf(thread.since, now)}` : STATE_LABEL[thread.state]}
                      </span>
                      <a href={`${SITE_URL}${thread.page}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-shortcut-blue hover:underline">
                        {thread.page} <ExternalLink size={13} />
                      </a>
                      <span className="text-sm text-gray-600">Started {whenOf(thread.createdAt)}</span>
                    </div>
                    {thread.email && (
                      <a href={`mailto:${thread.email}`} className="inline-flex items-center gap-1.5 text-sm text-shortcut-blue hover:underline mt-2">
                        <Mail size={14} /> {thread.email}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={toggleHandled}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full transition-colors text-sm"
                    title={thread.state === 'handled' ? 'Put it back in Needs a reply' : 'Nothing more to do here'}
                  >
                    {thread.state === 'handled' ? <><RotateCcw size={15} /> Reopen</> : <><CheckCircle size={15} /> Mark handled</>}
                  </button>
                </div>
                {presence && (
                  <p className={`mt-3 text-sm flex items-center gap-2 ${presence.live ? 'text-green-800 font-semibold' : 'text-gray-700'}`}>
                    <PresenceDot presence={thread.presence} />
                    {presence.text}
                    {!presence.live && thread.email ? ' They left an email, so you can follow up there.' : ''}
                  </p>
                )}
              </div>

              <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-light-gray/40">
                {thread.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'visitor' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[80%]">
                      <p className={`text-xs mb-1 text-gray-600 ${m.role === 'visitor' ? '' : 'text-right'}`}>
                        {m.role === 'visitor' ? 'Visitor' : m.role === 'bot' ? 'Script' : m.via === 'dashboard' ? (m.name || 'Shortcut') : 'Shortcut team, from Slack'}
                        {' · '}{whenOf(m.at)}
                      </p>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                        m.role === 'visitor' ? 'bg-white border border-gray-200 text-gray-900'
                          : m.role === 'bot' ? 'bg-gray-100 text-gray-800'
                            : 'bg-shortcut-blue text-white'}`}
                      >
                        {m.text}
                      </div>
                      {m.role === 'agent' && (
                        <p className="text-xs mt-1 text-right"><Receipt m={m} receipts={thread.receipts} /></p>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words bg-shortcut-blue text-white opacity-70">{sending}</div>
                      <p className="text-xs mt-1 text-right"><Receipt m={{ role: 'agent', text: sending, at: '' }} receipts pending /></p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100">
                {error && <p className="text-sm text-red-800 mb-2">{error}</p>}
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                    rows={2}
                    maxLength={MAX_CHARS}
                    placeholder="Reply to the visitor"
                    className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-transparent"
                  />
                  <button
                    onClick={submit}
                    disabled={!draft.trim() || Boolean(sending)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-shortcut-blue hover:bg-shortcut-navy-blue text-white font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} /> Send
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Enter sends, Shift and Enter adds a line. The visitor sees it in the chat within a few seconds
                  {thread.inSlack ? ', and a copy goes to the Slack thread.' : '.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteChatManager;
