import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { config } from '../config';
import { getSecurityHeaders } from '../utils/security';

if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('Missing Supabase configuration:', {
    url: config.supabase.url,
    hasAnonKey: !!config.supabase.anonKey
  });
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: window.localStorage,
      storageKey: 'supabase.auth.token',
      debug: config.env.DEV
    },
    global: {
      headers: {
        ...getSecurityHeaders(),
        'x-application-name': config.app.name
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const testSupabaseConnection = async (retries = 3, backoffMs = 1000) => {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Testing Supabase connection (attempt ${attempt}/${retries})...`);
      
      const { data, error } = await supabase
        .from('proposals')
        .select('count')
        .limit(1)
        .single();
        
      if (error) {
        if (error.message?.includes('Failed to fetch')) {
          console.warn('Network connectivity issue detected');
          throw new Error('Unable to connect to the database. Please check your internet connection.');
        }
        
        console.warn(`Attempt ${attempt}: Supabase query error:`, error);
        lastError = error;
        
        if (attempt < retries) {
          const waitTime = backoffMs * Math.pow(2, attempt - 1);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
          continue;
        }
        throw error;
      }

      console.log('Supabase connection successful');
      connectionStatus.connected = true;
      connectionStatus.lastError = null;
      return true;
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt}: Supabase connection error:`, err);
      
      if (attempt < retries) {
        const waitTime = backoffMs * Math.pow(2, attempt - 1);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        continue;
      }
    }
  }

  console.error('Failed to connect to Supabase after', retries, 'attempts. Last error:', lastError);
  connectionStatus.connected = false;
  connectionStatus.lastError = lastError;
  return false;
};

// Connection status tracking
export const connectionStatus = {
  connected: false,
  lastError: null as Error | null,
  isOffline: false
};

// Network status monitoring
window.addEventListener('online', () => {
  console.log('Connection restored');
  connectionStatus.isOffline = false;
  testSupabaseConnection();
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
  connectionStatus.isOffline = true;
  connectionStatus.connected = false;
});

// Export connection status checker
export const checkConnection = () => ({
  isConnected: connectionStatus.connected,
  isOffline: connectionStatus.isOffline,
  lastError: connectionStatus.lastError
});