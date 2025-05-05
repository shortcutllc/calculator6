import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { config } from '../config';
import { getSecurityHeaders } from '../utils/security';

// Log configuration on initialization
console.log('Initializing Supabase client with:', {
  url: config.supabase.url,
  hasAnonKey: !!config.supabase.anonKey,
  env: {
    MODE: config.env.MODE,
    PROD: config.env.PROD,
    DEV: config.env.DEV
  }
});

if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('Missing Supabase configuration:', {
    url: config.supabase.url,
    hasAnonKey: !!config.supabase.anonKey
  });
  throw new Error('Missing Supabase configuration');
}

// Enhanced client configuration with explicit session handling
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: window.localStorage, // Explicitly use window.localStorage
      storageKey: 'supabase.auth.token', // Explicit storage key
      debug: config.env.DEV // Enable debug logs in development
    },
    global: {
      headers: {
        ...getSecurityHeaders(),
        'x-application-name': config.app.name
      }
    },
    db: {
      schema: 'public'
    }
  }
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const testSupabaseConnection = async (retries = 3, backoffMs = 1000) => {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Testing Supabase connection (attempt ${attempt}/${retries})...`);
      console.log('Using URL:', config.supabase.url);
      
      const { data, error } = await supabase
        .from('proposals')
        .select('count')
        .limit(1)
        .single();
        
      if (error) {
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

      console.log('Supabase connection successful:', data);
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
  return false;
};