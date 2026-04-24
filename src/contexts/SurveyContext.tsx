import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  Survey,
  SurveyData,
  SurveyOptions,
  SurveyResponse,
  SurveyAnswer,
} from '../types/survey';

interface SurveyContextType {
  surveys: Survey[];
  currentSurvey: Survey | null;
  loading: boolean;
  error: string | null;
  fetchSurveys: () => Promise<void>;
  getSurvey: (id: string) => Promise<Survey | null>;
  createSurvey: (options: SurveyOptions) => Promise<string>;
  updateSurvey: (id: string, updates: Partial<Survey>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  submitResponse: (
    surveyId: string,
    answers: Record<string, SurveyAnswer>,
    respondent?: { name?: string; email?: string }
  ) => Promise<void>;
  getResponses: (surveyId: string) => Promise<SurveyResponse[]>;
  enableResultsSharing: (id: string) => Promise<string>;
  disableResultsSharing: (id: string) => Promise<void>;
  getSharedResults: (
    resultsToken: string,
    password?: string
  ) => Promise<
    | { status: 'ok'; survey: Survey; responses: SurveyResponse[] }
    | { status: 'password_required'; wrongPassword: boolean }
    | { status: 'not_found' }
  >;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

export const useSurvey = () => {
  const context = useContext(SurveyContext);
  if (!context) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }
  return context;
};

const transformSurvey = (row: any): Survey => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
  proposalId: row.proposal_id,
  data: row.data,
  customization: row.customization || {},
  isEditable: row.is_editable,
  status: row.status,
  uniqueToken: row.unique_token,
  customUrl: row.custom_url,
  resultsToken: row.results_token || undefined,
  resultsPassword: row.results_password || undefined,
});

const randomToken = () =>
  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const transformResponse = (row: any): SurveyResponse => ({
  id: row.id,
  createdAt: row.created_at,
  surveyId: row.survey_id,
  respondentName: row.respondent_name || undefined,
  respondentEmail: row.respondent_email || undefined,
  answers: row.answers || {},
});

export const SurveyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ surveys table does not exist yet. Please apply the migration.');
          setSurveys([]);
          return;
        }
        throw error;
      }
      setSurveys((data || []).map(transformSurvey));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch surveys';
      if (!msg.includes('does not exist')) setError(msg);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchSurveys().catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, [fetchSurveys]);

  const getSurvey = async (id: string): Promise<Survey | null> => {
    try {
      setLoading(true);
      setError(null);

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      let data: any = null;
      let qErr: any = null;

      if (isUUID) {
        const r = await supabase.from('surveys').select('*').eq('id', id).single();
        data = r.data;
        qErr = r.error;
        if (qErr && qErr.code === 'PGRST116') {
          const r2 = await supabase.from('surveys').select('*').eq('unique_token', id).single();
          data = r2.data;
          qErr = r2.error;
        }
      } else {
        const r = await supabase.from('surveys').select('*').eq('unique_token', id).single();
        data = r.data;
        qErr = r.error;
      }

      if (qErr) throw qErr;
      if (!data) throw new Error('Survey not found');

      const survey = transformSurvey(data);
      setCurrentSurvey(survey);
      return survey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch survey';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createSurvey = async (options: SurveyOptions): Promise<string> => {
    if (!options.title?.trim()) throw new Error('Title is required');
    if (!options.questions?.length) throw new Error('At least one question is required');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to create a survey');

    const uniqueToken = randomToken();

    const surveyData: SurveyData = {
      title: options.title.trim(),
      description: options.description || '',
      introMessage: options.introMessage || '',
      thankYouMessage: options.thankYouMessage || '',
      nameField: options.nameField ?? 'required',
      emailField: options.emailField ?? 'required',
      questions: options.questions,
      proposalId: options.proposalId,
      partnerName: options.partnerName,
      partnerLogoUrl: options.partnerLogoUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertRow = {
      user_id: user.id,
      proposal_id: options.proposalId || null,
      data: surveyData,
      customization: options.customization || {},
      is_editable: true,
      status: options.status || 'published',
      unique_token: uniqueToken,
      custom_url: null,
      results_password: options.resultsPassword?.trim() || null,
    };

    const { data, error } = await supabase
      .from('surveys')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create survey:', error);
      throw new Error(error.message || 'Failed to create survey');
    }

    await fetchSurveys();
    return data.id;
  };

  const updateSurvey = async (id: string, updates: Partial<Survey>) => {
    try {
      setLoading(true);
      setError(null);

      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.data) updateData.data = updates.data;
      if (updates.customization) updateData.customization = updates.customization;
      if (updates.status) updateData.status = updates.status;
      if (updates.isEditable !== undefined) updateData.is_editable = updates.isEditable;
      if (updates.proposalId !== undefined) updateData.proposal_id = updates.proposalId || null;
      if (updates.resultsPassword !== undefined) {
        updateData.results_password = updates.resultsPassword?.trim() || null;
      }

      const { error } = await supabase.from('surveys').update(updateData).eq('id', id);
      if (error) throw error;

      await fetchSurveys();
      if (currentSurvey?.id === id) {
        setCurrentSurvey(prev => (prev ? { ...prev, ...updates } : null));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update survey';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteSurvey = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('surveys').delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No survey found with that ID or you do not have permission to delete it');
      }
      await fetchSurveys();
      if (currentSurvey?.id === id) setCurrentSurvey(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete survey';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async (
    surveyId: string,
    answers: Record<string, SurveyAnswer>,
    respondent?: { name?: string; email?: string }
  ) => {
    const insertRow = {
      survey_id: surveyId,
      respondent_name: respondent?.name?.trim() || null,
      respondent_email: respondent?.email?.trim() || null,
      answers,
    };
    const { error } = await supabase.from('survey_responses').insert(insertRow);
    if (error) {
      console.error('❌ Failed to submit survey response:', error);
      throw new Error(error.message || 'Failed to submit response');
    }
  };

  const getResponses = async (surveyId: string): Promise<SurveyResponse[]> => {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(transformResponse);
  };

  const enableResultsSharing = async (id: string): Promise<string> => {
    const existing = surveys.find(s => s.id === id);
    if (existing?.resultsToken) return existing.resultsToken;
    const token = randomToken();
    const { error } = await supabase
      .from('surveys')
      .update({ results_token: token, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await fetchSurveys();
    return token;
  };

  const disableResultsSharing = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('surveys')
      .update({ results_token: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await fetchSurveys();
  };

  const getSharedResults: SurveyContextType['getSharedResults'] = async (
    resultsToken,
    password
  ) => {
    const { data, error } = await supabase.rpc('get_shared_survey_results', {
      p_results_token: resultsToken,
      p_password: password ?? null,
    });
    if (error) {
      console.error('get_shared_survey_results failed:', error);
      throw new Error(error.message || 'Failed to load shared results');
    }
    if (!data) return { status: 'not_found' };
    if (data.requiresPassword) {
      return { status: 'password_required', wrongPassword: !!data.attempted };
    }
    return {
      status: 'ok',
      survey: transformSurvey(data.survey),
      responses: (data.responses || []).map(transformResponse),
    };
  };

  const value: SurveyContextType = {
    surveys,
    currentSurvey,
    loading,
    error,
    fetchSurveys,
    getSurvey,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    submitResponse,
    getResponses,
    enableResultsSharing,
    disableResultsSharing,
    getSharedResults,
  };

  return <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>;
};
