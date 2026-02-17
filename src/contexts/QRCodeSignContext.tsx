import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { QRCodeSign, QRCodeSignData, QRCodeSignCustomization, QRCodeSignOptions } from '../types/qrCodeSign';

interface QRCodeSignContextType {
  qrCodeSigns: QRCodeSign[];
  currentQRCodeSign: QRCodeSign | null;
  loading: boolean;
  error: string | null;
  fetchQRCodeSigns: () => Promise<void>;
  getQRCodeSign: (id: string) => Promise<QRCodeSign | null>;
  createQRCodeSign: (options: QRCodeSignOptions) => Promise<string>;
  updateQRCodeSign: (id: string, updates: Partial<QRCodeSign>) => Promise<void>;
  deleteQRCodeSign: (id: string) => Promise<void>;
  uploadPartnerLogo: (file: File) => Promise<string>;
}

const QRCodeSignContext = createContext<QRCodeSignContextType | undefined>(undefined);

export const useQRCodeSign = () => {
  const context = useContext(QRCodeSignContext);
  if (!context) {
    throw new Error('useQRCodeSign must be used within a QRCodeSignProvider');
  }
  return context;
};

export const QRCodeSignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeSigns, setQRCodeSigns] = useState<QRCodeSign[]>([]);
  const [currentQRCodeSign, setCurrentQRCodeSign] = useState<QRCodeSign | null>(null);
  const [initialized, setInitialized] = useState(false);

  const transformDatabaseQRCodeSign = (dbQRCodeSign: any): QRCodeSign => ({
    id: dbQRCodeSign.id,
    createdAt: dbQRCodeSign.created_at,
    updatedAt: dbQRCodeSign.updated_at,
    data: dbQRCodeSign.data,
    customization: dbQRCodeSign.customization,
    isEditable: dbQRCodeSign.is_editable,
    status: dbQRCodeSign.status,
    userId: dbQRCodeSign.user_id,
    uniqueToken: dbQRCodeSign.unique_token,
    customUrl: dbQRCodeSign.custom_url
  });

  const fetchQRCodeSigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('qr_code_signs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle case where table doesn't exist yet (migration not applied)
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ QR code signs table does not exist yet. Please apply the migration.');
          setQRCodeSigns([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      const transformedQRCodeSigns = data.map(transformDatabaseQRCodeSign);
      setQRCodeSigns(transformedQRCodeSigns);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch QR code signs';
      if (!errorMessage.includes('does not exist') && !errorMessage.includes('PGRST204')) {
        setError(errorMessage);
      }
      setQRCodeSigns([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    // Non-blocking fetch
    const timer = setTimeout(() => {
      fetchQRCodeSigns().catch(() => {
        setInitialized(true);
      });
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const getQRCodeSign = async (id: string): Promise<QRCodeSign | null> => {
    try {
      setLoading(true);
      setError(null);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      
      let data: any = null;
      let error: any = null;
      
      if (isUUID) {
        const result = await supabase
          .from('qr_code_signs')
          .select('*')
          .eq('id', id)
          .single();
        data = result.data;
        error = result.error;
        
        if (error && error.code === 'PGRST116') {
          const resultByToken = await supabase
            .from('qr_code_signs')
            .select('*')
            .eq('unique_token', id)
            .single();
          data = resultByToken.data;
          error = resultByToken.error;
        }
      } else {
        const result = await supabase
          .from('qr_code_signs')
          .select('*')
          .eq('unique_token', id)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      if (!data) throw new Error('QR code sign not found');

      const qrCodeSign = transformDatabaseQRCodeSign(data);
      setCurrentQRCodeSign(qrCodeSign);
      return qrCodeSign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch QR code sign';
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
      const filePath = `qr-code-sign-logos/${fileName}`;
      const bucketName = 'holiday-page-assets';
      
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload logo';
      throw new Error(errorMessage);
    }
  };

  const createQRCodeSign = async (options: QRCodeSignOptions): Promise<string> => {
    try {
      if (!options.title || !options.qrCodeUrl || !options.serviceType) {
        throw new Error('Title, QR code URL, and service type are required');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a QR code sign');

      let logoUrl = '';
      if (options.partnerLogoFile) {
        logoUrl = await uploadPartnerLogo(options.partnerLogoFile);
      } else if (options.partnerLogoUrl) {
        logoUrl = options.partnerLogoUrl;
      }

      const uniqueToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const qrCodeSignData: QRCodeSignData = {
        title: options.title.trim(),
        eventDetails: options.eventDetails || '',
        qrCodeUrl: options.qrCodeUrl.trim(),
        serviceType: options.serviceType,
        serviceTypes: options.serviceTypes || [options.serviceType],
        proposalId: options.proposalId || undefined,
        partnerLogoUrl: logoUrl || undefined,
        partnerName: options.partnerName || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const qrCodeSign = {
        data: qrCodeSignData,
        customization: options.customization || {},
        is_editable: true,
        user_id: user.id,
        status: 'published',
        unique_token: uniqueToken,
        custom_url: null
      };

      const { data: newQRCodeSign, error } = await supabase
        .from('qr_code_signs')
        .insert(qrCodeSign)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw new Error(error.message || 'Failed to create QR code sign');
      }
      if (!newQRCodeSign) throw new Error('No QR code sign data returned after creation');

      await fetchQRCodeSigns();
      return newQRCodeSign.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create QR code sign';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateQRCodeSign = async (id: string, updates: Partial<QRCodeSign>) => {
    try {
      setLoading(true);
      setError(null);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.data) updateData.data = updates.data;
      if (updates.customization) updateData.customization = updates.customization;
      if (updates.status) updateData.status = updates.status;
      if (updates.isEditable !== undefined) updateData.is_editable = updates.isEditable;

      const { data, error } = await supabase
        .from('qr_code_signs')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;

      await fetchQRCodeSigns();
      
      if (currentQRCodeSign?.id === id) {
        setCurrentQRCodeSign(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update QR code sign';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteQRCodeSign = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('qr_code_signs')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No QR code sign found with that ID or you do not have permission to delete it');
      }

      await fetchQRCodeSigns();
      
      if (currentQRCodeSign?.id === id) {
        setCurrentQRCodeSign(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete QR code sign';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value: QRCodeSignContextType = {
    qrCodeSigns,
    currentQRCodeSign,
    loading,
    error,
    fetchQRCodeSigns,
    getQRCodeSign,
    createQRCodeSign,
    updateQRCodeSign,
    deleteQRCodeSign,
    uploadPartnerLogo
  };

  return (
    <QRCodeSignContext.Provider value={value}>
      {children}
    </QRCodeSignContext.Provider>
  );
};

