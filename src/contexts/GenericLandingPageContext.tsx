import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GenericLandingPage, GenericLandingPageData, GenericLandingPageCustomization, GenericLandingPageOptions } from '../types/genericLandingPage';

interface GenericLandingPageContextType {
  genericLandingPages: GenericLandingPage[];
  currentGenericLandingPage: GenericLandingPage | null;
  loading: boolean;
  error: string | null;
  fetchGenericLandingPages: () => Promise<void>;
  getGenericLandingPage: (id: string) => Promise<GenericLandingPage | null>;
  createGenericLandingPage: (options: GenericLandingPageOptions) => Promise<string>;
  updateGenericLandingPage: (id: string, updates: Partial<GenericLandingPage>) => Promise<void>;
  deleteGenericLandingPage: (id: string) => Promise<void>;
  uploadPartnerLogo: (file: File) => Promise<string>;
}

const GenericLandingPageContext = createContext<GenericLandingPageContextType | undefined>(undefined);

export const useGenericLandingPage = () => {
  const context = useContext(GenericLandingPageContext);
  if (!context) {
    throw new Error('useGenericLandingPage must be used within a GenericLandingPageProvider');
  }
  return context;
};

export const GenericLandingPageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genericLandingPages, setGenericLandingPages] = useState<GenericLandingPage[]>([]);
  const [currentGenericLandingPage, setCurrentGenericLandingPage] = useState<GenericLandingPage | null>(null);

  const transformDatabaseGenericLandingPage = (dbPage: any): GenericLandingPage => ({
    id: dbPage.id,
    createdAt: dbPage.created_at,
    updatedAt: dbPage.updated_at,
    data: dbPage.data,
    customization: dbPage.customization,
    isEditable: dbPage.is_editable,
    status: dbPage.status,
    userId: dbPage.user_id,
    uniqueToken: dbPage.unique_token,
    customUrl: dbPage.custom_url
  });

  const fetchGenericLandingPages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching all generic landing pages...');
      const { data, error } = await supabase
        .from('generic_landing_pages')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('🔍 Generic landing pages query result:', { data, error });

      if (error) {
        console.error('❌ Error fetching generic landing pages:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      console.log('✅ Generic landing pages fetched successfully:', data.length, 'pages');
      const transformedPages = data.map(transformDatabaseGenericLandingPage);
      setGenericLandingPages(transformedPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch generic landing pages';
      setError(errorMessage);
      console.error('❌ Error fetching generic landing pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const testDatabaseSchema = async () => {
      try {
        console.log('🔍 Testing generic landing pages database schema...');
        const { data, error } = await supabase
          .from('generic_landing_pages')
          .select('id, unique_token, created_at')
          .limit(1);
        
        console.log('🔍 Schema test result:', { data, error });
        
        if (error) {
          console.error('❌ Schema test failed:', error);
        } else {
          console.log('✅ Schema test passed, columns exist');
        }
      } catch (err) {
        console.error('❌ Schema test error:', err);
      }
    };
    
    testDatabaseSchema();
    fetchGenericLandingPages();
  }, []);

  const getGenericLandingPage = async (id: string): Promise<GenericLandingPage | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching generic landing page with ID:', id);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      
      let data: any = null;
      let error: any = null;
      
      if (isUUID) {
        console.log('🔍 ID is UUID, trying to fetch by ID...');
        const result = await supabase
          .from('generic_landing_pages')
          .select('*')
          .eq('id', id)
          .single();
        data = result.data;
        error = result.error;
        
        if (error && error.code === 'PGRST116') {
          console.log('🔍 Not found by ID, trying by unique_token...');
          const resultByToken = await supabase
            .from('generic_landing_pages')
            .select('*')
            .eq('unique_token', id)
            .single();
          data = resultByToken.data;
          error = resultByToken.error;
        }
      } else {
        console.log('🔍 ID is not UUID, trying to fetch by unique_token...');
        const result = await supabase
          .from('generic_landing_pages')
          .select('*')
          .eq('unique_token', id)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Error fetching generic landing page:', error);
        throw error;
      }
      if (!data) throw new Error('Generic landing page not found');

      console.log('✅ Generic landing page found:', data);
      const page = transformDatabaseGenericLandingPage(data);
      setCurrentGenericLandingPage(page);
      return page;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch generic landing page';
      console.error('❌ Generic landing page fetch failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadPartnerLogo = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `partner-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('generic-landing-page-assets')
        .upload(filePath, file);

      if (uploadError) {
        // Fallback to holiday-page-assets if generic bucket doesn't exist
        const { error: fallbackError } = await supabase.storage
          .from('holiday-page-assets')
          .upload(filePath, file);
        
        if (fallbackError) throw fallbackError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('holiday-page-assets')
          .getPublicUrl(filePath);
        
        return publicUrl;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('generic-landing-page-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload logo';
      throw new Error(errorMessage);
    }
  };

  const createGenericLandingPage = async (options: GenericLandingPageOptions): Promise<string> => {
    try {
      if (!options.partnerName) throw new Error('Partner name is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a generic landing page');

      let logoUrl = '';
      if (options.partnerLogoFile) {
        logoUrl = await uploadPartnerLogo(options.partnerLogoFile);
      } else if (options.partnerLogoUrl) {
        logoUrl = options.partnerLogoUrl;
      }

      const uniqueToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const pageData: GenericLandingPageData = {
        partnerName: options.partnerName.trim(),
        partnerLogoUrl: logoUrl,
        partnerLogoColor: '#003756',
        clientEmail: options.clientEmail,
        customMessage: options.customMessage,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const page = {
        data: pageData,
        customization: options.customization,
        is_editable: true,
        user_id: user.id,
        status: 'published',
        unique_token: uniqueToken,
        custom_url: null
      };

      const { data: newPage, error } = await supabase
        .from('generic_landing_pages')
        .insert(page)
        .select()
        .single();

      if (error) throw error;
      if (!newPage) throw new Error('No generic landing page data returned after creation');

      await fetchGenericLandingPages();
      return newPage.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create generic landing page';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateGenericLandingPage = async (id: string, updates: Partial<GenericLandingPage>) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Updating generic landing page:', id, updates);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.data) updateData.data = updates.data;
      if (updates.customization) updateData.customization = updates.customization;
      if (updates.status) updateData.status = updates.status;
      if (updates.isEditable !== undefined) updateData.is_editable = updates.isEditable;

      const { data, error } = await supabase
        .from('generic_landing_pages')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }

      console.log('✅ Supabase update successful');
      await fetchGenericLandingPages();
      
      if (currentGenericLandingPage?.id === id) {
        setCurrentGenericLandingPage(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update generic landing page';
      console.error('❌ Update failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteGenericLandingPage = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Attempting to delete generic landing page:', id);

      const { data, error } = await supabase
        .from('generic_landing_pages')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No generic landing page found with that ID or you do not have permission to delete it');
      }

      console.log('✅ Generic landing page deleted successfully');
      await fetchGenericLandingPages();
      
      if (currentGenericLandingPage?.id === id) {
        setCurrentGenericLandingPage(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete generic landing page';
      console.error('❌ Delete failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value: GenericLandingPageContextType = {
    genericLandingPages,
    currentGenericLandingPage,
    loading,
    error,
    fetchGenericLandingPages,
    getGenericLandingPage,
    createGenericLandingPage,
    updateGenericLandingPage,
    deleteGenericLandingPage,
    uploadPartnerLogo
  };

  return (
    <GenericLandingPageContext.Provider value={value}>
      {children}
    </GenericLandingPageContext.Provider>
  );
};
