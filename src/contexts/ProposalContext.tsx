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
  createProposal: (data: ProposalData, customization: ProposalCustomization, clientEmail?: string, isTest?: boolean) => Promise<string>;
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
    hasPricingOptions: dbProposal.has_pricing_options,
    // New proposal group fields
    proposalGroupId: dbProposal.proposal_group_id,
    optionName: dbProposal.option_name,
    optionOrder: dbProposal.option_order,
    // Test proposal flag
    isTest: dbProposal.is_test || false,
    // Proposal type
    proposal_type: dbProposal.proposal_type || 'event'
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
    clientEmail?: string,
    isTest: boolean = false
  ): Promise<string> => {
    try {
      if (!data.clientName) throw new Error('Client name is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a proposal');

      // Determine proposal type based on data structure
      const proposalType = data.mindfulnessProgram ? 'mindfulness-program' : 'event';

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
        client_email: clientEmail || data.clientEmail || null,
        client_logo_url: data.clientLogoUrl || null,
        notes: '',
        is_test: isTest,
        proposal_type: proposalType
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
      // client_name is NOT NULL, so we need to ensure it's always set
      if (updates.clientName !== undefined) {
        // Ensure client_name is never empty or null
        updateData.client_name = updates.clientName?.trim() || (updates.data?.clientName?.trim()) || 'Client';
      }
      if (updates.changeSource) updateData.change_source = updates.changeSource;
      if (updates.proposal_type) updateData.proposal_type = updates.proposal_type;
      // New pricing options fields
      if (updates.pricingOptions) updateData.pricing_options = updates.pricingOptions;
      if (updates.selectedOptions) updateData.selected_options = updates.selectedOptions;
      if (updates.hasPricingOptions !== undefined) updateData.has_pricing_options = updates.hasPricingOptions;

      // Remove undefined values to avoid issues
      const cleanUpdateData: any = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          cleanUpdateData[key] = updateData[key];
        }
      });
      
      // Validate that client_name is not empty before sending
      if (cleanUpdateData.client_name !== undefined && (!cleanUpdateData.client_name || cleanUpdateData.client_name.trim() === '')) {
        console.warn('⚠️ client_name is empty, using fallback');
        cleanUpdateData.client_name = cleanUpdateData.data?.clientName || 'Client';
      }
      
      // Validate JSON fields are serializable
      try {
        if (cleanUpdateData.data) {
          JSON.stringify(cleanUpdateData.data);
        }
        if (cleanUpdateData.customization) {
          JSON.stringify(cleanUpdateData.customization);
        }
        if (cleanUpdateData.original_data) {
          JSON.stringify(cleanUpdateData.original_data);
        }
      } catch (jsonError) {
        console.error('❌ JSON serialization error:', jsonError);
        throw new Error(`Invalid JSON data: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
      }
      
      console.log('🔍 Updating proposal:', { id, updateData: cleanUpdateData });
      
      const { error, data } = await supabase
        .from('proposals')
        .update(cleanUpdateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Supabase update error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('❌ Update data that failed:', JSON.stringify(cleanUpdateData, null, 2));
        console.error('❌ Full error object:', error);
        throw new Error(`Failed to update proposal: ${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (${error.hint})` : ''}`);
      }
      
      console.log('✅ Proposal updated successfully:', data);

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