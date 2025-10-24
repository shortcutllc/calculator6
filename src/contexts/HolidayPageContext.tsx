import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HolidayPage, HolidayPageData, HolidayPageCustomization, HolidayPageOptions } from '../types/holidayPage';

interface HolidayPageContextType {
  holidayPages: HolidayPage[];
  currentHolidayPage: HolidayPage | null;
  loading: boolean;
  error: string | null;
  fetchHolidayPages: () => Promise<void>;
  getHolidayPage: (id: string) => Promise<HolidayPage | null>;
  createHolidayPage: (options: HolidayPageOptions) => Promise<string>;
  updateHolidayPage: (id: string, updates: Partial<HolidayPage>) => Promise<void>;
  deleteHolidayPage: (id: string) => Promise<void>;
  uploadPartnerLogo: (file: File) => Promise<string>;
}

const HolidayPageContext = createContext<HolidayPageContextType | undefined>(undefined);

export const useHolidayPage = () => {
  const context = useContext(HolidayPageContext);
  if (!context) {
    throw new Error('useHolidayPage must be used within a HolidayPageProvider');
  }
  return context;
};

export const HolidayPageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holidayPages, setHolidayPages] = useState<HolidayPage[]>([]);
  const [currentHolidayPage, setCurrentHolidayPage] = useState<HolidayPage | null>(null);

  const transformDatabaseHolidayPage = (dbHolidayPage: any): HolidayPage => ({
    id: dbHolidayPage.id,
    createdAt: dbHolidayPage.created_at,
    updatedAt: dbHolidayPage.updated_at,
    data: dbHolidayPage.data,
    customization: dbHolidayPage.customization,
    isEditable: dbHolidayPage.is_editable,
    status: dbHolidayPage.status,
    userId: dbHolidayPage.user_id,
    uniqueToken: dbHolidayPage.unique_token,
    customUrl: dbHolidayPage.custom_url
  });

  const fetchHolidayPages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching all holiday pages...');
      const { data, error } = await supabase
        .from('holiday_pages')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('🔍 Holiday pages query result:', { data, error });

      if (error) {
        console.error('❌ Error fetching holiday pages:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      console.log('✅ Holiday pages fetched successfully:', data.length, 'pages');
      const transformedHolidayPages = data.map(transformDatabaseHolidayPage);
      setHolidayPages(transformedHolidayPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch holiday pages';
      setError(errorMessage);
      console.error('❌ Error fetching holiday pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Test database schema first
    const testDatabaseSchema = async () => {
      try {
        console.log('🔍 Testing database schema...');
        const { data, error } = await supabase
          .from('holiday_pages')
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
    fetchHolidayPages();
  }, []);

  const getHolidayPage = async (id: string): Promise<HolidayPage | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching holiday page with ID:', id);

      // Check if id is a valid UUID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      
      let data: any = null;
      let error: any = null;
      
      if (isUUID) {
        // If it's a UUID, try to find by ID first
        console.log('🔍 ID is UUID, trying to fetch by ID...');
        const result = await supabase
          .from('holiday_pages')
          .select('*')
          .eq('id', id)
          .single();
        data = result.data;
        error = result.error;
        console.log('🔍 ID query result:', { data, error });
        
        // If not found by ID, try unique_token as fallback
        if (error && error.code === 'PGRST116') {
          console.log('🔍 Not found by ID, trying by unique_token...');
          const resultByToken = await supabase
            .from('holiday_pages')
            .select('*')
            .eq('unique_token', id)
            .single();
          data = resultByToken.data;
          error = resultByToken.error;
          console.log('🔍 Unique token query result:', { data, error });
        }
      } else {
        // If it's not a UUID, it's likely a unique_token
        console.log('🔍 ID is not UUID, trying to fetch by unique_token...');
        const result = await supabase
          .from('holiday_pages')
          .select('*')
          .eq('unique_token', id)
          .single();
        data = result.data;
        error = result.error;
        console.log('🔍 Unique token query result:', { data, error });
      }

      if (error) {
        console.error('❌ Error fetching holiday page:', error);
        throw error;
      }
      if (!data) throw new Error('Holiday page not found');

      console.log('✅ Holiday page found:', data);
      const holidayPage = transformDatabaseHolidayPage(data);
      setCurrentHolidayPage(holidayPage);
      return holidayPage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch holiday page';
      console.error('❌ Holiday page fetch failed:', errorMessage);
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
        .from('holiday-page-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('holiday-page-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload logo';
      throw new Error(errorMessage);
    }
  };

  const createHolidayPage = async (options: HolidayPageOptions): Promise<string> => {
    try {
      if (!options.partnerName) throw new Error('Partner name is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a holiday page');

      // Handle logo - file upload takes precedence over URL
      let logoUrl = '';
      if (options.partnerLogoFile) {
        logoUrl = await uploadPartnerLogo(options.partnerLogoFile);
      } else if (options.partnerLogoUrl) {
        logoUrl = options.partnerLogoUrl;
      }

      // Generate unique token for public access
      const uniqueToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const holidayPageData: HolidayPageData = {
        partnerName: options.partnerName.trim(),
        partnerLogoUrl: logoUrl,
        partnerLogoColor: '#003756', // Default color
        clientEmail: options.clientEmail,
        customMessage: options.customMessage,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const holidayPage = {
        data: holidayPageData,
        customization: options.customization,
        is_editable: true,
        user_id: user.id,
        status: 'published', // Auto-publish holiday pages for public access
        unique_token: uniqueToken,
        custom_url: null
      };

      const { data: newHolidayPage, error } = await supabase
        .from('holiday_pages')
        .insert(holidayPage)
        .select()
        .single();

      if (error) throw error;
      if (!newHolidayPage) throw new Error('No holiday page data returned after creation');

      await fetchHolidayPages();
      return newHolidayPage.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create holiday page';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateHolidayPage = async (id: string, updates: Partial<HolidayPage>) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Updating holiday page:', id, updates);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.data) updateData.data = updates.data;
      if (updates.customization) updateData.customization = updates.customization;
      if (updates.status) updateData.status = updates.status;
      if (updates.isEditable !== undefined) updateData.is_editable = updates.isEditable;

      console.log('📤 Sending update data to Supabase:', updateData);

      const { data, error } = await supabase
        .from('holiday_pages')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Supabase update response:', data);

      console.log('✅ Supabase update successful, fetching updated pages...');
      await fetchHolidayPages();
      
      // Update current holiday page if it's the one being updated
      if (currentHolidayPage?.id === id) {
        console.log('🔄 Updating current holiday page state');
        setCurrentHolidayPage(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update holiday page';
      console.error('❌ Update failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteHolidayPage = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Attempting to delete holiday page:', id);

      const { data, error } = await supabase
        .from('holiday_pages')
        .delete()
        .eq('id', id)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }

      // Check if any rows were actually deleted
      if (!data || data.length === 0) {
        throw new Error('No holiday page found with that ID or you do not have permission to delete it');
      }

      console.log('✅ Holiday page deleted successfully:', data[0]);

      await fetchHolidayPages();
      
      // Clear current holiday page if it's the one being deleted
      if (currentHolidayPage?.id === id) {
        setCurrentHolidayPage(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete holiday page';
      console.error('❌ Delete failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value: HolidayPageContextType = {
    holidayPages,
    currentHolidayPage,
    loading,
    error,
    fetchHolidayPages,
    getHolidayPage,
    createHolidayPage,
    updateHolidayPage,
    deleteHolidayPage,
    uploadPartnerLogo
  };

  return (
    <HolidayPageContext.Provider value={value}>
      {children}
    </HolidayPageContext.Provider>
  );
};
