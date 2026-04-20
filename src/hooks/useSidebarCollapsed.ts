import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sidebar_collapsed';
const EVENT_NAME = 'sidebar-collapsed-change';

function read(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Shared sidebar collapsed state for the Navigation sidebar and the main
 * content offset in App.tsx. Persists to localStorage and syncs across
 * components via a custom event.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(read);

  useEffect(() => {
    const handler = () => setCollapsed(read());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const setAndBroadcast = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // noop
    }
    setCollapsed(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const toggle = useCallback(() => {
    setAndBroadcast(!collapsed);
  }, [collapsed, setAndBroadcast]);

  return { collapsed, toggle, setCollapsed: setAndBroadcast };
}
