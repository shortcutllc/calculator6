import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Proposal, ProposalData, ProposalCustomization } from '../types/proposal';

interface ProposalContextType {
  loading: boolean;
  error: string | null;
  proposals: Proposal[];
  currentProposal: Proposal | null;
  createProposal: (data: ProposalData, customization: ProposalCustomization, clientEmail?: string) => Promise<string>;
  getProposal: (id: string) => Promise<Proposal | null>;
  updateProposal: (id: string, updates: Partial<Proposal>) => Promise<boolean>;
  deleteProposal: (id: string) => Promise<boolean>;
  fetchProposals: () => Promise<void>;
}

const ProposalContext = createContext<ProposalContextType | undefined>(undefined);

export const useProposal = () => {
  const context = useContext(ProposalContext);
  if (context === undefined) {
    throw new Error('useProposal must be used within a ProposalProvider');
  }
  return context;
};

export const ProposalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);

  const transformDatabaseProposal = (dbProposal: any): Proposal => ({
    id: dbProposal.id,
    createdAt: dbProposal.created_at,
    updatedAt: dbProposal.updated_at,
    data: dbProposal.data,
    customization: dbProposal.customization,
    isEditable: dbProposal.is_editable,
    status: dbProposal.status,
    pendingReview: dbProposal.pending_review,
    hasChanges: dbProposal.has_changes,
    userId: dbProposal.user_id,
    originalData: dbProposal.original_data,
    notes: dbProposal.notes,
    clientEmail: dbProposal.client_email,
    changeSource: dbProposal.change_source
  });

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      const transformedProposals = data.map(transformDatabaseProposal);
      setProposals(transformedProposals);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch proposals';
      setError(errorMessage);
      console.error('Error fetching proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const getProposal = async (id: string): Promise<Proposal | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Proposal not found');

      const proposal = transformDatabaseProposal(data);
      setCurrentProposal(proposal);
      return proposal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch proposal';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async (
    data: ProposalData,
    customization: ProposalCustomization,
    clientEmail?: string
  ): Promise<string> => {
    try {
      if (!data.clientName) throw new Error('Client name is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a proposal');

      const proposalData = {
        data,
        customization,
        is_editable: true,
        user_id: user.id,
        status: 'draft',
        pending_review: false,
        has_changes: false,
        original_data: data,
        client_name: data.clientName.trim(),
        notes: ''
      };

      const { data: newProposal, error } = await supabase
        .from('proposals')
        .insert(proposalData)
        .select()
        .single();

      if (error) throw error;
      if (!newProposal) throw new Error('No proposal data returned after creation');

      await fetchProposals();
      return newProposal.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateProposal = async (id: string, updates: Partial<Proposal>): Promise<boolean> => {
    try {
      const proposal = await getProposal(id);
      if (!proposal) throw new Error('Proposal not found');

      const { data: currentData, error: fetchError } = await supabase
        .from('proposals')
        .select('data, original_data, has_changes')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const originalData = currentData.has_changes ? currentData.original_data : currentData.data;

      const updateData: any = {
        updated_at: new Date().toISOString(),
        has_changes: true,
        pending_review: true,
        change_source: 'staff'
      };

      if (updates.data) {
        updateData.data = updates.data;
        updateData.original_data = originalData;
      }

      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchProposals();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update proposal';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteProposal = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (currentProposal?.id === id) {
        setCurrentProposal(null);
      }
      
      await fetchProposals();
      return true;
    } catch (err) {
      setError('Failed to delete proposal');
      return false;
    }
  };

  return (
    <ProposalContext.Provider
      value={{
        loading,
        error,
        proposals,
        currentProposal,
        createProposal,
        getProposal,
        updateProposal,
        deleteProposal,
        fetchProposals
      }}
    >
      {children}
    </ProposalContext.Provider>
  );
};