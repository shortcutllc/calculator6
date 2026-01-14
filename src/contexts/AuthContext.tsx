import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T,>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries === 0 || !error?.message?.includes('rate limit')) {
      throw error;
    }
    await wait(delay);
    return retryWithBackoff(operation, retries - 1, delay * 2);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as true to wait for auth check
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Enhanced session initialization with retry mechanism
  useEffect(() => {
    const initAuth = async () => {
      console.log('[AuthContext] Starting auth initialization...');
      try {
        // Use Promise.race with timeout to prevent hanging
        const sessionPromise = retryWithBackoff(
          () => {
            console.log('[AuthContext] Attempting to get session...');
            return supabase.auth.getSession();
          }
        );
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => {
            console.warn('[AuthContext] Auth check timed out after 5 seconds');
            reject(new Error('Auth check timeout'));
          }, 5000)
        );

        try {
          const result = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]);
          
          console.log('[AuthContext] Session result received:', { hasSession: !!result?.data?.session, hasError: !!result?.error });
          const { data: { session }, error: sessionError } = result;

          if (sessionError) {
            console.error('Session retrieval error:', sessionError);
            // Clear invalid session
            setUser(null);
            // Clear any stale session data
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              // Ignore sign out errors
            }
          } else if (session) {
            // Validate session is not expired
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            
            if (expiresAt && expiresAt < now) {
              // Session expired, clear it
              console.log('Session expired, clearing...');
              setUser(null);
              try {
                await supabase.auth.signOut();
              } catch (signOutErr) {
                // Ignore sign out errors
              }
            } else if (session.user) {
              // Valid session with user
              setUser(session.user);
            } else {
              // Session exists but no user (invalid)
              setUser(null);
              try {
                await supabase.auth.signOut();
              } catch (signOutErr) {
                // Ignore sign out errors
              }
            }
          } else {
            // No session found
            setUser(null);
          }
        } catch (err: any) {
          console.error('Error initializing auth:', err);
          // Clear any potentially corrupted session data if it's not a timeout
          if (!err.message?.includes('timeout')) {
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              // Ignore sign out errors
            }
          }
          setUser(null);
        } finally {
          console.log('[AuthContext] Auth initialization complete, setting loading to false');
          setLoading(false);
          setInitialized(true);
        }
      } catch (err) {
        console.error('[AuthContext] Outer error initializing auth:', err);
        setLoading(false);
        setInitialized(true);
        setUser(null);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (initialized) {
        console.log('Auth state changed:', event);
        
        // Validate session if it exists
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          
          if (expiresAt && expiresAt < now) {
            // Session expired
            console.log('Session expired in auth state change, clearing...');
            setUser(null);
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              // Ignore sign out errors
            }
          } else if (session.user) {
            // Valid session
            setUser(session.user);
          } else {
            // Invalid session (no user)
            setUser(null);
          }
        } else {
          // No session
          setUser(null);
        }
        
        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          // Clear any remaining session data
          localStorage.removeItem('supabase.auth.token');
          setUser(null);
        }
      }
    });

    // Suppress refresh token errors when there's no session (expected on public pages)
    // This prevents console errors on generic landing pages and other public routes
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      
      // Suppress refresh token errors when there's no session
      if (errorMessage.includes('Refresh Token Not Found') || 
          errorMessage.includes('Invalid Refresh Token')) {
        // Check if there's a session - if not, suppress the error
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            // No session exists, so this error is expected on public pages - suppress it
            event.preventDefault();
            console.debug('Suppressed expected refresh token error (no session exists)');
          }
        }).catch(() => {
          // If we can't check session, suppress to avoid noise
          event.preventDefault();
        });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const { data, error } = await retryWithBackoff(() => 
        supabase.auth.signInWithPassword({
          email,
          password
        })
      );

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        throw new Error(error.message);
      }

      setUser(data.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Clear any existing session data first
      localStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      console.error('Sign out error:', errorMessage);
    } finally {
      setLoading(false);
      setUser(null); // Ensure user is cleared even if there's an error
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};