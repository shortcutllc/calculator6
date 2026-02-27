import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ProAgreement, ProAgreementTemplate } from '../types/proAgreement';

interface ProAgreementContextType {
  agreements: ProAgreement[];
  templates: ProAgreementTemplate[];
  loading: boolean;
  error: string | null;
  fetchAgreements: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  sendAgreement: (templateId: string, proName: string, proEmail: string, sendToClient?: boolean) => Promise<{ signingUrl: string; signingSlug: string }>;
  syncAgreementStatus: (agreementId: string) => Promise<void>;
  resendEmail: (agreementId: string) => Promise<void>;
  createTemplate: (name: string, documentType: string, docusealTemplateId: number) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<ProAgreementTemplate>) => Promise<void>;
}

const ProAgreementContext = createContext<ProAgreementContextType | undefined>(undefined);

export const useProAgreement = () => {
  const context = useContext(ProAgreementContext);
  if (!context) {
    throw new Error('useProAgreement must be used within a ProAgreementProvider');
  }
  return context;
};

const transformAgreementRow = (row: any): ProAgreement => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  templateId: row.template_id,
  proName: row.pro_name,
  proEmail: row.pro_email,
  status: row.status,
  docusealSubmissionId: row.docuseal_submission_id,
  signingSlug: row.signing_slug,
  signingUrl: row.signing_url,
  completedAt: row.completed_at,
  documentsUrl: row.documents_url,
  sentAt: row.sent_at,
  openedAt: row.opened_at,
  createdByUserId: row.created_by_user_id,
  templateName: row.pro_agreement_templates?.name,
  documentType: row.pro_agreement_templates?.document_type,
});

const transformTemplateRow = (row: any): ProAgreementTemplate => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  name: row.name,
  documentType: row.document_type,
  docusealTemplateId: row.docuseal_template_id,
  isActive: row.is_active,
  createdByUserId: row.created_by_user_id,
});

export const ProAgreementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<ProAgreement[]>([]);
  const [templates, setTemplates] = useState<ProAgreementTemplate[]>([]);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('pro_agreements')
        .select('*, pro_agreement_templates(name, document_type)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          setAgreements([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      setAgreements((data || []).map(transformAgreementRow));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch agreements';
      setError(msg);
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('pro_agreement_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          setTemplates([]);
          return;
        }
        throw error;
      }

      setTemplates((data || []).map(transformTemplateRow));
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setTemplates([]);
    }
  };

  const sendAgreement = async (templateId: string, proName: string, proEmail: string, sendToClient = true) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/.netlify/functions/send-pro-agreement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ templateId, proName, proEmail, sendToClient })
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`Server returned invalid response (${response.status}): ${text.slice(0, 200)}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to send agreement');
    }

    await fetchAgreements();
    return { signingUrl: result.signingUrl, signingSlug: result.signingSlug };
  };

  const syncAgreementStatus = async (agreementId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/.netlify/functions/send-pro-agreement?action=sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ agreementId })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to sync status');
    }

    await fetchAgreements();
  };

  const resendEmail = async (agreementId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/.netlify/functions/send-pro-agreement?action=resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ agreementId })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to resend email');
    }

    await fetchAgreements();
  };

  const createTemplate = async (name: string, documentType: string, docusealTemplateId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('pro_agreement_templates')
      .insert({
        name,
        document_type: documentType,
        docuseal_template_id: docusealTemplateId,
        created_by_user_id: user.id,
      });

    if (error) throw error;
    await fetchTemplates();
  };

  const updateTemplate = async (id: string, updates: Partial<ProAgreementTemplate>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.documentType !== undefined) dbUpdates.document_type = updates.documentType;
    if (updates.docusealTemplateId !== undefined) dbUpdates.docuseal_template_id = updates.docusealTemplateId;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { error } = await supabase
      .from('pro_agreement_templates')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
    await fetchTemplates();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      Promise.all([fetchAgreements(), fetchTemplates()]).catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const value: ProAgreementContextType = {
    agreements,
    templates,
    loading,
    error,
    fetchAgreements,
    fetchTemplates,
    sendAgreement,
    syncAgreementStatus,
    resendEmail,
    createTemplate,
    updateTemplate,
  };

  return (
    <ProAgreementContext.Provider value={value}>
      {children}
    </ProAgreementContext.Provider>
  );
};
