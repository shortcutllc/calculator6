import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { config } from '../config';

// Constants for connection handling
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Validate configuration
if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error('Missing Supabase configuration');
}

// Create Supabase client
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    },
    global: {
      headers: {
        'x-application-name': config.app.name
      }
    }
  }
);

// Connection status tracking
export const connectionStatus = {
  connected: false,
  lastError: null as Error | null,
  isOffline: !navigator.onLine
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const testSupabaseConnection = async () => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const { error } = await supabase
        .from('proposals')
        .select('id')
        .limit(1);

      if (error) throw error;

      connectionStatus.connected = true;
      connectionStatus.lastError = null;
      return true;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');
      
      if (attempt < MAX_RETRIES) {
        await delay(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
        continue;
      }
    }
  }

  connectionStatus.connected = false;
  connectionStatus.lastError = lastError;
  return false;
};

// Network status monitoring
window.addEventListener('online', () => {
  connectionStatus.isOffline = false;
  testSupabaseConnection();
});

window.addEventListener('offline', () => {
  connectionStatus.isOffline = true;
  connectionStatus.connected = false;
});