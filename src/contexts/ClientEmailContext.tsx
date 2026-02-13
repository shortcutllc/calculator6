import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ClientEmailDraft, EmailType, ServiceVariant, EmailDraftStatus, ClientEmailTemplateData } from '../types/clientEmail';

interface ClientEmailContextType {
  drafts: ClientEmailDraft[];
  loading: boolean;
  error: string | null;
  fetchDrafts: () => Promise<void>;
  createDraft: (options: {
    proposalId?: string | null;
    emailType: EmailType;
    serviceVariant?: ServiceVariant | null;
    subject: string;
    templateData: ClientEmailTemplateData;
    generatedHtml?: string | null;
  }) => Promise<string>;
  updateDraft: (id: string, updates: Partial<{
    emailType: EmailType;
    serviceVariant: ServiceVariant | null;
    subject: string;
    templateData: ClientEmailTemplateData;
    generatedHtml: string | null;
    status: EmailDraftStatus;
    notes: string | null;
  }>) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
}

const ClientEmailContext = createContext<ClientEmailContextType | undefined>(undefined);

export const useClientEmail = () => {
  const context = useContext(ClientEmailContext);
  if (!context) {
    throw new Error('useClientEmail must be used within a ClientEmailProvider');
  }
  return context;
};

export const ClientEmailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ClientEmailDraft[]>([]);

  const transformRow = (row: any): ClientEmailDraft => ({
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    proposalId: row.proposal_id,
    emailType: row.email_type,
    serviceVariant: row.service_variant,
    subject: row.subject,
    templateData: row.template_data,
    generatedHtml: row.generated_html,
    status: row.status,
    notes: row.notes,
  });

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('client_email_drafts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('client_email_drafts table does not exist yet.');
          setDrafts([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      setDrafts((data || []).map(transformRow));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch email drafts';
      if (!msg.includes('does not exist') && !msg.includes('PGRST204')) {
        setError(msg);
      }
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDrafts().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const createDraft = async (options: {
    proposalId?: string | null;
    emailType: EmailType;
    serviceVariant?: ServiceVariant | null;
    subject: string;
    templateData: ClientEmailTemplateData;
    generatedHtml?: string | null;
  }): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      const row = {
        user_id: user.id,
        proposal_id: options.proposalId || null,
        email_type: options.emailType,
        service_variant: options.serviceVariant || null,
        subject: options.subject,
        template_data: options.templateData,
        generated_html: options.generatedHtml || null,
        status: 'draft',
      };

      const { data, error } = await supabase
        .from('client_email_drafts')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned after creation');

      await fetchDrafts();
      return data.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create draft';
      setError(msg);
      throw new Error(msg);
    }
  };

  const updateDraft = async (id: string, updates: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);

      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.emailType !== undefined) updateData.email_type = updates.emailType;
      if (updates.serviceVariant !== undefined) updateData.service_variant = updates.serviceVariant;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.templateData !== undefined) updateData.template_data = updates.templateData;
      if (updates.generatedHtml !== undefined) updateData.generated_html = updates.generatedHtml;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { error } = await supabase
        .from('client_email_drafts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchDrafts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update draft';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('client_email_drafts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchDrafts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete draft';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const value: ClientEmailContextType = {
    drafts,
    loading,
    error,
    fetchDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
  };

  return (
    <ClientEmailContext.Provider value={value}>
      {children}
    </ClientEmailContext.Provider>
  );
};
