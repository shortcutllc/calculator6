import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SignUpLink, CreateSignUpLinkOptions } from '../types/signUpLink';

interface SignUpLinkContextType {
  signUpLinks: SignUpLink[];
  loading: boolean;
  error: string | null;
  fetchSignUpLinks: () => Promise<void>;
  createSignUpLink: (options: CreateSignUpLinkOptions) => Promise<string>;
  updateSignUpLink: (id: string, updates: Partial<SignUpLink>) => Promise<void>;
  deleteSignUpLink: (id: string) => Promise<void>;
}

const SignUpLinkContext = createContext<SignUpLinkContextType | undefined>(undefined);

export const useSignUpLinks = () => {
  const context = useContext(SignUpLinkContext);
  if (!context) {
    throw new Error('useSignUpLinks must be used within a SignUpLinkProvider');
  }
  return context;
};

const transformDbRow = (row: any): SignUpLink => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
  proposalId: row.proposal_id,
  proposalClientName: row.proposal_client_name,
  eventDate: row.event_date,
  eventLocation: row.event_location,
  eventName: row.event_name,
  serviceTypes: row.service_types || [],
  coordinatorEventId: row.coordinator_event_id,
  signupUrl: row.signup_url,
  status: row.status,
  eventPayload: row.event_payload,
});

export const SignUpLinkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signUpLinks, setSignUpLinks] = useState<SignUpLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignUpLinks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sign_up_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === 'PGRST204' || fetchError.code === '42P01' || fetchError.message?.includes('does not exist')) {
          console.warn('sign_up_links table does not exist yet.');
          setSignUpLinks([]);
          return;
        }
        throw fetchError;
      }

      setSignUpLinks((data || []).map(transformDbRow));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch sign-up links';
      if (!msg.includes('does not exist')) {
        setError(msg);
      }
      setSignUpLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSignUpLinks().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const createSignUpLink = async (options: CreateSignUpLinkOptions): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error: insertError } = await supabase
      .from('sign_up_links')
      .insert({
        user_id: user.id,
        proposal_id: options.proposalId,
        proposal_client_name: options.proposalClientName,
        event_date: options.eventDate,
        event_location: options.eventLocation,
        event_name: options.eventName,
        service_types: options.serviceTypes,
        coordinator_event_id: options.coordinatorEventId || null,
        signup_url: options.signupUrl || null,
        status: options.coordinatorEventId ? 'active' : 'pending',
        event_payload: options.eventPayload || null,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    await fetchSignUpLinks();
    return data.id;
  };

  const updateSignUpLink = async (id: string, updates: Partial<SignUpLink>) => {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.coordinatorEventId !== undefined) dbUpdates.coordinator_event_id = updates.coordinatorEventId;
    if (updates.signupUrl !== undefined) dbUpdates.signup_url = updates.signupUrl;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.eventName !== undefined) dbUpdates.event_name = updates.eventName;
    if (updates.eventDate !== undefined) dbUpdates.event_date = updates.eventDate;
    if (updates.eventLocation !== undefined) dbUpdates.event_location = updates.eventLocation;
    if (updates.serviceTypes !== undefined) dbUpdates.service_types = updates.serviceTypes;
    if (updates.eventPayload !== undefined) dbUpdates.event_payload = updates.eventPayload;

    const { error: updateError } = await supabase
      .from('sign_up_links')
      .update(dbUpdates)
      .eq('id', id);

    if (updateError) throw updateError;
    await fetchSignUpLinks();
  };

  const deleteSignUpLink = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('sign_up_links')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    await fetchSignUpLinks();
  };

  return (
    <SignUpLinkContext.Provider value={{
      signUpLinks,
      loading,
      error,
      fetchSignUpLinks,
      createSignUpLink,
      updateSignUpLink,
      deleteSignUpLink,
    }}>
      {children}
    </SignUpLinkContext.Provider>
  );
};
