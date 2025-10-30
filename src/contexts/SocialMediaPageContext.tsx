import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SocialMediaContactRequest, SocialMediaFormData } from '../types/socialMediaPage';
import { extractTrackingData, calculateLeadScore, trackLeadGeneration, detectBot } from '../utils/trackingUtils';

interface SocialMediaPageContextType {
  contactRequests: SocialMediaContactRequest[];
  loading: boolean;
  error: string | null;
  submitContactRequest: (formData: SocialMediaFormData, platform: 'linkedin' | 'meta', campaignData?: { campaignId?: string; adSetId?: string; adId?: string }) => Promise<void>;
  updateContactRequestStatus: (id: string, status: 'new' | 'contacted' | 'followed_up' | 'closed') => Promise<void>;
  deleteContactRequest: (id: string) => Promise<void>;
  fetchContactRequests: () => Promise<void>;
}

const SocialMediaPageContext = createContext<SocialMediaPageContextType | undefined>(undefined);

export const useSocialMediaPage = () => {
  const context = useContext(SocialMediaPageContext);
  if (context === undefined) {
    throw new Error('useSocialMediaPage must be used within a SocialMediaPageProvider');
  }
  return context;
};

interface SocialMediaPageProviderProps {
  children: React.ReactNode;
}

async function sendSlackNotification(lead: any) {
  console.log('🔔 Slack notification payload:', lead);
  
  // Only send Slack notifications in production
  if (window.location.hostname === 'localhost') {
    console.log('🚫 Skipping Slack notification in development');
    return;
  }
  
  try {
    const response = await fetch('/.netlify/functions/slack-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead })
    });
    
    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('✅ Slack notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error);
    throw error;
  }
}

export const SocialMediaPageProvider: React.FC<SocialMediaPageProviderProps> = ({ children }) => {
  const [contactRequests, setContactRequests] = useState<SocialMediaContactRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContactRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching social media contact requests...');

      const { data, error } = await supabase
        .from('social_media_contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching contact requests:', error);
        throw error;
      }

      console.log('✅ Contact requests fetched successfully:', data?.length || 0);

      const transformedData: SocialMediaContactRequest[] = (data || []).map(item => ({
        id: item.id,
        createdAt: item.created_at,
        firstName: item.first_name,
        lastName: item.last_name,
        email: item.email,
        phone: item.phone,
        company: item.company,
        location: item.location,
        serviceType: item.service_type,
        eventDate: item.event_date,
        appointmentCount: item.appointment_count,
        message: item.message,
        platform: item.platform,
        campaignId: item.campaign_id,
        adSetId: item.ad_set_id,
        adId: item.ad_id,
        status: item.status,
        // UTM Tracking
        utmSource: item.utm_source,
        utmMedium: item.utm_medium,
        utmCampaign: item.utm_campaign,
        utmTerm: item.utm_term,
        utmContent: item.utm_content,
        referrer: item.referrer,
        userAgent: item.user_agent,
        ipAddress: item.ip_address,
        leadScore: item.lead_score || 0,
        conversionValue: item.conversion_value || 0
      }));

      setContactRequests(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contact requests';
      console.error('❌ Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const submitContactRequest = async (
    formData: SocialMediaFormData, 
    platform: 'linkedin' | 'meta',
    campaignData?: { campaignId?: string; adSetId?: string; adId?: string }
  ) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Submitting social media contact request:', { platform, formData, campaignData });

      // Extract tracking data
      const trackingData = extractTrackingData();
      
      // Bot protection
      if (trackingData.userAgent && detectBot(trackingData.userAgent)) {
        console.log('🤖 Bot detected, blocking submission');
        throw new Error('Bot submissions are not allowed');
      }

      // Rate limiting check (simple client-side check)
      const rateLimitKey = `social_media_${formData.email}`;
      const lastSubmission = localStorage.getItem(rateLimitKey);
      const now = Date.now();
      const rateLimitWindow = 5 * 60 * 1000; // 5 minutes

      if (lastSubmission && (now - parseInt(lastSubmission)) < rateLimitWindow) {
        const timeLeft = Math.ceil((rateLimitWindow - (now - parseInt(lastSubmission))) / 1000);
        console.warn(`⏰ Rate limit active. Time remaining: ${timeLeft} seconds`);
        throw new Error(`Please wait ${timeLeft} seconds before submitting another request`);
      }

      // Handle fullName field - split into firstName/lastName for database compatibility
      const firstName = (formData as any).firstName || '';
      const lastName = (formData as any).lastName || '';
      let finalFirstName = firstName;
      let finalLastName = lastName;
      
      // If fullName exists, split it
      if ((formData as any).fullName) {
        const nameParts = (formData as any).fullName.trim().split(/\s+/);
        finalFirstName = nameParts[0] || '';
        finalLastName = nameParts.slice(1).join(' ') || '';
      }

      // Calculate lead score and conversion value
      const { leadScore, conversionValue } = calculateLeadScore(formData, trackingData);

      const { data, error } = await supabase
        .from('social_media_contact_requests')
        .insert({
          first_name: finalFirstName,
          last_name: finalLastName,
          email: formData.email,
          phone: formData.phone || null,
          company: formData.company || null,
          location: formData.location || null,
          service_type: formData.serviceType || null,
          event_date: formData.eventDate || null,
          appointment_count: formData.appointmentCount || null,
          message: formData.message || null,
          platform: platform,
          campaign_id: campaignData?.campaignId || null,
          ad_set_id: campaignData?.adSetId || null,
          ad_id: campaignData?.adId || null,
          status: 'new',
          // UTM Tracking
          utm_source: trackingData.utmSource || null,
          utm_medium: trackingData.utmMedium || null,
          utm_campaign: trackingData.utmCampaign || null,
          utm_term: trackingData.utmTerm || null,
          utm_content: trackingData.utmContent || null,
          referrer: trackingData.referrer || null,
          user_agent: trackingData.userAgent || null,
          lead_score: leadScore,
          conversion_value: conversionValue
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error submitting contact request:', error);
        throw error;
      }

      console.log('✅ Contact request submitted successfully:', data);

      // Send Slack notification
      console.log('📱 Sending Slack notification...');
      try {
        // Get name from either fullName or firstName/lastName
        const displayName = (formData as any).fullName 
          ? (formData as any).fullName 
          : `${(formData as any).firstName || ''} ${(formData as any).lastName || ''}`.trim();
        
        await sendSlackNotification({
          name: displayName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          platform: platform.toUpperCase(),
          leadScore: leadScore,
          serviceType: formData.serviceType,
          campaign: trackingData.utmCampaign
        });
        console.log('✅ Slack notification sent successfully');
      } catch (slackError) {
        console.error('❌ Failed to send Slack notification:', slackError);
        // Don't fail the form submission if Slack fails
      }

      // Set rate limit
      localStorage.setItem(rateLimitKey, now.toString());

      // Track conversion events
      trackLeadGeneration(platform);

      // Refresh the contact requests list
      await fetchContactRequests();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit contact request';
      console.error('❌ Error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateContactRequestStatus = async (id: string, status: 'new' | 'contacted' | 'followed_up' | 'closed') => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Updating contact request status:', { id, status });

      const { error } = await supabase
        .from('social_media_contact_requests')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('❌ Error updating contact request status:', error);
        throw error;
      }

      console.log('✅ Contact request status updated successfully');

      // Refresh the contact requests list
      await fetchContactRequests();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update contact request status';
      console.error('❌ Error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteContactRequest = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Deleting contact request:', id);

      const { error } = await supabase
        .from('social_media_contact_requests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting contact request:', error);
        throw error;
      }

      console.log('✅ Contact request deleted successfully');

      // Refresh the contact requests list
      await fetchContactRequests();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete contact request';
      console.error('❌ Error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch contact requests on mount
  useEffect(() => {
    fetchContactRequests();
  }, []);

  const value: SocialMediaPageContextType = {
    contactRequests,
    loading,
    error,
    submitContactRequest,
    updateContactRequestStatus,
    deleteContactRequest,
    fetchContactRequests
  };

  return (
    <SocialMediaPageContext.Provider value={value}>
      {children}
    </SocialMediaPageContext.Provider>
  );
};
