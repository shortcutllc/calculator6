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

  const transformDatabaseGenericLandingPage = (dbPage: any): GenericLandingPage => {
    // Explicitly handle is_returning_client with proper boolean conversion
    let isReturningClientValue = false;
    if ('is_returning_client' in dbPage) {
      // Column exists, convert to boolean properly
      isReturningClientValue = dbPage.is_returning_client === true || 
                               dbPage.is_returning_client === 1 || 
                               dbPage.is_returning_client === 'true' ||
                               dbPage.is_returning_client === '1';
    }
    
    return {
      id: dbPage.id,
      createdAt: dbPage.created_at,
      updatedAt: dbPage.updated_at,
      data: dbPage.data,
      customization: dbPage.customization,
      isEditable: dbPage.is_editable,
      status: dbPage.status,
      userId: dbPage.user_id,
      uniqueToken: dbPage.unique_token,
      customUrl: dbPage.custom_url,
      isReturningClient: isReturningClientValue
    };
  };

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
        // Fallback to holiday-page-assets bucket if generic-landing-page-assets doesn't exist
        // (This is a storage bucket name, not a feature reference)
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
        custom_url: null,
        is_returning_client: options.isReturningClient || false
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
      console.log('🔍 CRITICAL: isReturningClient value in updates:', updates.isReturningClient, typeof updates.isReturningClient);
      
      // First, verify the column exists by trying to select it
      const { data: testData, error: testError } = await supabase
        .from('generic_landing_pages')
        .select('id, is_returning_client')
        .eq('id', id)
        .limit(1);
      
      if (testError) {
        console.error('❌ CRITICAL ERROR: Column is_returning_client may not exist!', testError);
        console.error('❌ Error code:', testError.code);
        console.error('❌ Error message:', testError.message);
        if (testError.message?.includes('column') || testError.message?.includes('does not exist')) {
          alert('ERROR: The database column "is_returning_client" does not exist. Please run the migration: 20260109190000_add_returning_client_field.sql');
        }
      } else {
        console.log('✅ Column exists, current value:', testData?.[0]?.is_returning_client);
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.data) updateData.data = updates.data;
      if (updates.customization) updateData.customization = updates.customization;
      if (updates.status) updateData.status = updates.status;
      if (updates.isEditable !== undefined) updateData.is_editable = updates.isEditable;
      
      // ALWAYS set is_returning_client if it's in the updates object (including false)
      // Use 'in' operator which is simpler and more reliable
      if ('isReturningClient' in updates) {
        // Explicitly convert to boolean - handle true, 'true', 1, etc.
        const boolValue = updates.isReturningClient === true || 
                         updates.isReturningClient === 'true' || 
                         updates.isReturningClient === 1 ||
                         updates.isReturningClient === '1';
        updateData.is_returning_client = boolValue;
        console.log('💾 CRITICAL: Setting is_returning_client to:', boolValue, '(from:', updates.isReturningClient, typeof updates.isReturningClient + ')');
      } else {
        console.log('⚠️ CRITICAL: isReturningClient not found in updates! Keys:', Object.keys(updates));
      }

      console.log('💾 CRITICAL: Final updateData:', updateData);
      console.log('💾 CRITICAL: updateData.is_returning_client:', updateData.is_returning_client);

      const { data, error, status, statusText } = await supabase
        .from('generic_landing_pages')
        .update(updateData)
        .eq('id', id)
        .select('*');

      console.log('📊 Update response status:', status, statusText);
      console.log('📊 Update response data:', data);
      console.log('📊 Update response error:', error);

      if (error) {
        console.error('❌ Supabase update error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Supabase update successful, returned data:', data);

      // If no data returned from update (possible RLS issue), fetch it separately
      let updatedRecord = data && data.length > 0 ? data[0] : null;

      if (!updatedRecord) {
        console.warn('⚠️ No data returned from update, fetching separately...');
        const { data: fetchedData, error: fetchError } = await supabase
          .from('generic_landing_pages')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('❌ Failed to fetch updated record:', fetchError);
          throw fetchError;
        }

        updatedRecord = fetchedData;
        console.log('✅ Fetched record separately:', updatedRecord);
      }

      if (updatedRecord) {
        console.log('✅ CRITICAL: Updated page is_returning_client value:', updatedRecord.is_returning_client);
        console.log('✅ CRITICAL: Full updated record keys:', Object.keys(updatedRecord));
        console.log('✅ CRITICAL: Full updated record:', JSON.stringify(updatedRecord, null, 2));

        // Double-check by querying the database directly - SELECT ALL COLUMNS
        const { data: verifyData, error: verifyError } = await supabase
          .from('generic_landing_pages')
          .select('*')
          .eq('id', id)
          .single();

        console.log('🔍 CRITICAL: Verification query result:', verifyData);
        console.log('🔍 CRITICAL: Verification query error:', verifyError);
        if (verifyData) {
          console.log('🔍 CRITICAL: Verified is_returning_client in database:', verifyData.is_returning_client);
          console.log('🔍 CRITICAL: Does column exist?', 'is_returning_client' in verifyData);
        }
      } else {
        console.error('❌ CRITICAL: No data returned from update and failed to fetch!');
      }
      await fetchGenericLandingPages();

      // Update currentGenericLandingPage if it's the one being updated
      if (currentGenericLandingPage?.id === id) {
        // Transform the returned data to match GenericLandingPage type
        const updatedPage = updatedRecord
          ? transformDatabaseGenericLandingPage(updatedRecord)
          : null;

        if (updatedPage) {
          console.log('🔄 Updating currentGenericLandingPage state with:', updatedPage);
          setCurrentGenericLandingPage(updatedPage);
        } else {
          // Fallback: merge updates into existing state
          console.log('⚠️ No updated data returned, merging updates into existing state');
          setCurrentGenericLandingPage(prev => prev ? { ...prev, ...updates } : null);
        }
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
