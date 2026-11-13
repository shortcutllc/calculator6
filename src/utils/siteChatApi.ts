// The website's chat, for the team. Calls www.getshortcut.co/api/chat/admin/*
// (shortcutllc/getshortcut.co, frontend/netlify/functions/chat-admin.mjs) with
// the signed-in person's session token. The website asks Supabase whose token
// it is and then checks a named staff list (frontend/data/chat-staff.js in
// that repo), so being signed in here is not enough on its own.
import { supabase } from '../lib/supabaseClient';

// VITE_SITE_CHAT_API points this at a website deploy preview for testing.
// It is read from the build or env-config.js only, never from the URL: the
// session token goes wherever this says.
const windowEnv = typeof window !== 'undefined' && (window as any).__ENV__ ? (window as any).__ENV__ : {};
export const SITE_URL = 'https://www.getshortcut.co';
const API_BASE: string = (windowEnv.VITE_SITE_CHAT_API || import.meta.env.VITE_SITE_CHAT_API || SITE_URL).replace(/\/$/, '');

export type ChatState = 'waiting' | 'answered' | 'handled' | 'bot';
export type Presence = 'open' | 'on-site' | 'away';

export interface ChatRow {
  id: string;
  page: string;
  createdAt: string;
  updatedAt: string;
  first: string;
  last: { role: string; text: string; at: string } | null;
  state: ChatState;
  since: string;
  reason: string | null;
  hasEmail: boolean;
  visitorMessages: number;
  agentMessages: number;
  presence: Presence;
}

export interface ChatMessage {
  role: 'visitor' | 'bot' | 'agent';
  text: string;
  at: string;
  name?: string;
  via?: string;
  by?: string;
  link?: { label: string; href: string };
  seenAt?: string | null;
}

export interface ChatThread {
  id: string;
  page: string;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  state: ChatState;
  since: string;
  reason: string | null;
  handledAt: string | null;
  handledBy: string | null;
  inSlack: boolean;
  receipts: boolean;
  presence: Presence;
  lastOpenAt: string | null;
  lastOnSiteAt: string | null;
  messages: ChatMessage[];
}

export class SiteChatError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MESSAGES: Record<string, string> = {
  auth: 'This account is not on the site chat staff list. Ask Will to add it.',
  origin: 'The website does not accept requests from this address.',
  limit: 'Too many replies in a minute. Wait a moment and send again.',
  busy: 'The visitor was typing at the same moment. Send it again.',
  'not found': 'That conversation no longer exists.',
  empty: 'Type a reply first.',
};

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new SiteChatError(401, 'Sign in again to use the site chat.');
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat/admin/${path}`, {
      method: init?.method || 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new SiteChatError(0, 'Could not reach the website. Check your connection.');
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new SiteChatError(res.status, MESSAGES[data?.error] || `The website answered ${res.status}.`);
  return data as T;
}

export const listChats = () => call<{ chats: ChatRow[]; waiting: number; now: string }>('list');
export const getThread = (id: string) => call<{ thread: ChatThread; now: string }>(`thread?id=${encodeURIComponent(id)}`);
export const sendReply = (id: string, text: string) =>
  call<{ thread: ChatThread; now: string; slack: boolean }>('reply', { method: 'POST', body: { id, text } });
export const setHandled = (id: string, handled: boolean) =>
  call<{ thread: ChatThread; now: string }>('handled', { method: 'POST', body: { id, handled } });
