import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { BabyProfile } from './types';

// Rosie-specific user profile
export interface RosieUserProfile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

// Extended baby profile from database
export interface RosieBabyProfile extends BabyProfile {
  id: string;
  user_id: string;
  created_at: string;
}

interface RosieAuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  profile: RosieUserProfile | null;
  babies: RosieBabyProfile[];
  currentBaby: RosieBabyProfile | null;
  loading: boolean;
  error: string | null;

  // Auth methods
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;

  // Profile methods
  createProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
  addBaby: (baby: Omit<BabyProfile, 'id'>) => Promise<{ success: boolean; baby?: RosieBabyProfile; error?: string }>;
  updateBaby: (babyId: string, updates: Partial<BabyProfile>) => Promise<{ success: boolean; error?: string }>;
  setCurrentBaby: (babyId: string) => void;

  // Utility
  clearError: () => void;
}

const RosieAuthContext = createContext<RosieAuthContextType | undefined>(undefined);

export const RosieAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<RosieUserProfile | null>(null);
  const [babies, setBabies] = useState<RosieBabyProfile[]>([]);
  const [currentBaby, setCurrentBabyState] = useState<RosieBabyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from rosie_profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rosie_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is OK for new users
        console.error('Error fetching profile:', fetchError);
        return null;
      }

      return data as RosieUserProfile | null;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  }, []);

  // Fetch babies for user
  const fetchBabies = useCallback(async (userId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rosie_babies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching babies:', fetchError);
        return [];
      }

      return (data || []) as RosieBabyProfile[];
    } catch (err) {
      console.error('Error in fetchBabies:', err);
      return [];
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);

          // Fetch Rosie-specific data
          const userProfile = await fetchProfile(currentSession.user.id);
          setProfile(userProfile);

          const userBabies = await fetchBabies(currentSession.user.id);
          setBabies(userBabies);

          // Set current baby from localStorage or first baby
          const savedBabyId = localStorage.getItem('rosie_current_baby_id');
          const savedBaby = userBabies.find(b => b.id === savedBabyId);
          setCurrentBabyState(savedBaby || userBabies[0] || null);
        }
      } catch (err) {
        console.error('Error initializing Rosie auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[RosieAuth] Auth state changed:', event);

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);

        // Fetch profile and babies on sign in
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const userProfile = await fetchProfile(newSession.user.id);
          setProfile(userProfile);

          const userBabies = await fetchBabies(newSession.user.id);
          setBabies(userBabies);

          if (!currentBaby && userBabies.length > 0) {
            setCurrentBabyState(userBabies[0]);
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setBabies([]);
        setCurrentBabyState(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchBabies, currentBaby]);

  // Sign in with Magic Link
  const signInWithMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/rosie`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send magic link';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/rosie`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('rosie_current_baby_id');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setBabies([]);
      setCurrentBabyState(null);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create user profile (called after first sign in)
  const createProfile = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('rosie_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setProfile(data as RosieUserProfile);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Add a baby
  const addBaby = async (baby: Omit<BabyProfile, 'id'>): Promise<{ success: boolean; baby?: RosieBabyProfile; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('rosie_babies')
        .insert({
          user_id: user.id,
          name: baby.name,
          birth_date: baby.birthDate,
          photo_url: baby.photoUrl || null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const newBaby: RosieBabyProfile = {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        birthDate: data.birth_date,
        photoUrl: data.photo_url,
        created_at: data.created_at,
      };

      setBabies(prev => [...prev, newBaby]);

      // Set as current if it's the first baby
      if (babies.length === 0) {
        setCurrentBabyState(newBaby);
        localStorage.setItem('rosie_current_baby_id', newBaby.id);
      }

      return { success: true, baby: newBaby };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add baby';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update a baby
  const updateBaby = async (babyId: string, updates: Partial<BabyProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.birthDate !== undefined) updateData.birth_date = updates.birthDate;
      if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl;

      const { error: updateError } = await supabase
        .from('rosie_babies')
        .update(updateData)
        .eq('id', babyId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setBabies(prev => prev.map(b =>
        b.id === babyId
          ? { ...b, ...updates }
          : b
      ));

      // Update current baby if it's the one being updated
      if (currentBaby?.id === babyId) {
        setCurrentBabyState(prev => prev ? { ...prev, ...updates } : null);
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update baby';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Set current baby
  const setCurrentBaby = (babyId: string) => {
    const baby = babies.find(b => b.id === babyId);
    if (baby) {
      setCurrentBabyState(baby);
      localStorage.setItem('rosie_current_baby_id', babyId);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  return (
    <RosieAuthContext.Provider
      value={{
        user,
        session,
        profile,
        babies,
        currentBaby,
        loading,
        error,
        signInWithMagicLink,
        signInWithGoogle,
        signOut,
        createProfile,
        addBaby,
        updateBaby,
        setCurrentBaby,
        clearError,
      }}
    >
      {children}
    </RosieAuthContext.Provider>
  );
};

export const useRosieAuth = () => {
  const context = useContext(RosieAuthContext);
  if (context === undefined) {
    throw new Error('useRosieAuth must be used within a RosieAuthProvider');
  }
  return context;
};
