import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Proposal, ProposalData, ProposalCustomization } from '../types/proposal';

interface ProposalContextType {
  proposals: Proposal[];
  currentProposal: Proposal | null;
  loading: boolean;
  error: string | null;
  fetchProposals: () => Promise<void>;
  getProposal: (id: string) => Promise<Proposal | null>;
  createProposal: (data: ProposalData, customization: ProposalCustomization, clientEmail?: string) => Promise<string>;
  updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
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
    clientLogoUrl: dbProposal.client_logo_url,
    changeSource: dbProposal.change_source,
    // New pricing options fields
    pricingOptions: dbProposal.pricing_options,
    selectedOptions: dbProposal.selected_options,
    hasPricingOptions: dbProposal.has_pricing_options
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

  const updateProposal = async (id: string, updates: Partial<Proposal>) => {
    try {
      setLoading(true);
      setError(null);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map frontend fields to database fields
      if (updates.data) updateData.data = updates.data;
      if (updates.customization) updateData.customization = updates.customization;
      if (updates.isEditable !== undefined) updateData.is_editable = updates.isEditable;
      if (updates.status) updateData.status = updates.status;
      if (updates.pendingReview !== undefined) updateData.pending_review = updates.pendingReview;
      if (updates.hasChanges !== undefined) updateData.has_changes = updates.hasChanges;
      if (updates.originalData) updateData.original_data = updates.originalData;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.clientEmail !== undefined) updateData.client_email = updates.clientEmail;
      if (updates.clientLogoUrl !== undefined) updateData.client_logo_url = updates.clientLogoUrl;
      if (updates.changeSource) updateData.change_source = updates.changeSource;
      // New pricing options fields
      if (updates.pricingOptions) updateData.pricing_options = updates.pricingOptions;
      if (updates.selectedOptions) updateData.selected_options = updates.selectedOptions;
      if (updates.hasPricingOptions !== undefined) updateData.has_pricing_options = updates.hasPricingOptions;

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setProposals(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ));
      
      if (currentProposal?.id === id) {
        setCurrentProposal(prev => prev ? { ...prev, ...updates } : null);
      }

      await fetchProposals();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update proposal';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteProposal = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProposals(prev => prev.filter(p => p.id !== id));
      if (currentProposal?.id === id) {
        setCurrentProposal(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete proposal';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value: ProposalContextType = {
    proposals,
    currentProposal,
    loading,
    error,
    fetchProposals,
    getProposal,
    createProposal,
    updateProposal,
    deleteProposal
  };

  return (
    <ProposalContext.Provider value={value}>
      {children}
    </ProposalContext.Provider>
  );
};