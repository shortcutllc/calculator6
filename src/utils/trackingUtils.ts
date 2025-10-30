// Utility functions for tracking and analytics

export interface TrackingData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LeadScoringData {
  leadScore: number;
  conversionValue: number;
}

/**
 * Parse referrer domain from referrer URL
 */
const parseReferrerDomain = (referrer: string): string => {
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return referrer;
  }
};

/**
 * Detect traffic source from referrer
 */
const detectSourceFromReferrer = (referrer: string): string => {
  if (!referrer) return 'direct';
  
  const domain = parseReferrerDomain(referrer).toLowerCase();
  
  // Social media platforms
  if (domain.includes('linkedin.com')) return 'linkedin';
  if (domain.includes('facebook.com') || domain.includes('fb.com')) return 'facebook';
  if (domain.includes('instagram.com')) return 'instagram';
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter';
  if (domain.includes('tiktok.com')) return 'tiktok';
  if (domain.includes('pinterest.com')) return 'pinterest';
  
  // Search engines
  if (domain.includes('google.com')) return 'google';
  if (domain.includes('bing.com')) return 'bing';
  if (domain.includes('yahoo.com')) return 'yahoo';
  
  // Other common sources
  if (domain.includes('reddit.com')) return 'reddit';
  if (domain.includes('youtube.com')) return 'youtube';
  
  return 'other';
};

/**
 * Extract UTM parameters and tracking data from URL and browser
 */
export const extractTrackingData = (): TrackingData => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check localStorage for stored UTM params
  let storedUtms: Record<string, string> = {};
  try {
    const storedData = localStorage.getItem('shortcut_utms');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed.expiration && Date.now() < parsed.expiration && parsed.params) {
        storedUtms = parsed.params;
      }
    }
  } catch (e) {
    console.error('Error reading stored UTMs:', e);
  }
  
  // Priority: URL params > stored params
  const utmSource = urlParams.get('utm_source') || storedUtms.utm_source || undefined;
  const utmMedium = urlParams.get('utm_medium') || storedUtms.utm_medium || undefined;
  const utmCampaign = urlParams.get('utm_campaign') || storedUtms.utm_campaign || undefined;
  const utmTerm = urlParams.get('utm_term') || storedUtms.utm_term || undefined;
  const utmContent = urlParams.get('utm_content') || storedUtms.utm_content || undefined;
  
  const referrer = document.referrer || undefined;
  const detectedSource = referrer ? detectSourceFromReferrer(referrer) : 'direct';
  
  // Determine final source (UTM > detected referrer > direct)
  const finalSource = utmSource || (referrer ? detectedSource : 'direct');
  const finalMedium = utmMedium || (referrer ? 'referral' : 'none');
  
  return {
    utmSource: finalSource,
    utmMedium: finalMedium,
    utmCampaign: utmCampaign,
    utmTerm: utmTerm,
    utmContent: utmContent,
    referrer: referrer,
    userAgent: navigator.userAgent || undefined,
    ipAddress: undefined, // Will be set server-side
  };
};

/**
 * Calculate lead score based on form completion and engagement
 */
export const calculateLeadScore = (formData: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  serviceType?: string;
  eventDate?: string;
  appointmentCount?: string;
  message?: string;
}, trackingData: TrackingData): LeadScoringData => {
  let score = 0;
  let conversionValue = 0;

  // Base score for form submission
  score += 10;

  // Contact information completeness
  if (formData.firstName && formData.lastName) score += 5;
  if (formData.email) score += 5;
  if (formData.phone) score += 10; // Phone is high value
  if (formData.company) score += 5;

  // Service details
  if (formData.serviceType) score += 5;
  if (formData.eventDate) score += 10; // Specific date is high intent
  if (formData.appointmentCount) score += 5;
  if (formData.message && formData.message.length > 50) score += 10; // Detailed message

  // UTM source scoring
  if (trackingData.utmSource === 'linkedin') {
    score += 15; // LinkedIn leads are typically higher quality
    conversionValue = 150; // Higher value for LinkedIn
  } else if (trackingData.utmSource === 'facebook' || trackingData.utmSource === 'instagram') {
    score += 10;
    conversionValue = 100;
  } else if (trackingData.utmSource === 'google') {
    score += 12;
    conversionValue = 120;
  }

  // Campaign-specific scoring
  if (trackingData.utmCampaign?.includes('holiday')) {
    score += 5; // Holiday campaigns have urgency
    conversionValue += 25;
  }
  if (trackingData.utmCampaign?.includes('enterprise')) {
    score += 10; // Enterprise campaigns are high value
    conversionValue += 50;
  }

  // Referrer quality
  if (trackingData.referrer?.includes('linkedin.com')) {
    score += 5;
  }

  // Cap the score at 100
  score = Math.min(score, 100);

  return { leadScore: score, conversionValue };
};

/**
 * Track conversion events for LinkedIn and Meta
 */
export const trackConversion = (platform: 'linkedin' | 'meta', eventType: 'lead' | 'form_submit' | 'page_view' | 'form_start' | 'form_complete', value?: number) => {
  if (platform === 'linkedin') {
    // LinkedIn conversion tracking
    if (typeof window !== 'undefined' && (window as any).lintrk) {
      (window as any).lintrk('track', eventType, {
        conversionId: `social_media_${eventType}`,
        value: value || 1
      });
    }
  } else if (platform === 'meta') {
    // Meta conversion tracking
    if (typeof window !== 'undefined' && (window as any).fbq) {
      const eventMap = {
        'lead': 'Lead',
        'form_submit': 'SubmitApplication',
        'page_view': 'PageView',
        'form_start': 'InitiateCheckout',
        'form_complete': 'CompleteRegistration'
      };
      
      (window as any).fbq('track', eventMap[eventType] || 'Lead', {
        content_name: 'Social Media Landing Page',
        value: value || 1,
        currency: 'USD'
      });
    }
  }
};

/**
 * Get all tracking context for events
 */
export const getTrackingContext = (): Record<string, any> => {
  const trackingData = extractTrackingData();
  const storedUtms = getStoredUtmParams();
  
  // Build comprehensive tracking context
  const utmSource = trackingData.utmSource || storedUtms.utm_source || 'direct';
  const utmMedium = trackingData.utmMedium || storedUtms.utm_medium || 'none';
  const utmCampaign = trackingData.utmCampaign || storedUtms.utm_campaign || '';
  
  const context: Record<string, any> = {
    // GA4 standard parameter names (for built-in dimensions)
    source: utmSource,
    medium: utmMedium,
    campaign: utmCampaign,
    
    // Custom dimension parameter names (matching your GA4 custom dimensions)
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    
    // Traffic source for user segmentation
    traffic_source: utmSource,
    
    // Additional UTM parameters
    utm_term: trackingData.utmTerm || storedUtms.utm_term || '',
    utm_content: trackingData.utmContent || storedUtms.utm_content || '',
    
    // Referrer data
    referrer_domain: trackingData.referrer ? parseReferrerDomain(trackingData.referrer) : '',
    
    // Additional context
    page_location: window.location.href,
    page_path: window.location.pathname,
  };
  
  return context;
};

/**
 * Get stored UTM parameters from localStorage
 */
const getStoredUtmParams = (): Record<string, string> => {
  try {
    const storedData = localStorage.getItem('shortcut_utms');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed.expiration && Date.now() < parsed.expiration && parsed.params) {
        return parsed.params;
      }
    }
  } catch (e) {
    console.error('Error reading stored UTMs:', e);
  }
  return {};
};

/**
 * Set user properties for audience segmentation
 */
export const setGAUserProperties = (properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('set', 'user_properties', properties);
  }
};

/**
 * Track Google Analytics events with enhanced tracking context
 */
export const trackGAEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    // Merge tracking context with event parameters
    const trackingContext = getTrackingContext();
    const enhancedParams = {
      ...trackingContext,
      ...parameters,
    };
    
    (window as any).gtag('event', eventName, enhancedParams);
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 GA Event:', eventName, enhancedParams);
    }
  }
};

/**
 * Track Google Analytics page view with enhanced tracking
 */
export const trackGAPageView = (pagePath: string, pageTitle?: string, additionalParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    const gaId = (window as any).__ENV__?.VITE_GA_MEASUREMENT_ID;
    if (gaId && gaId !== 'GA_MEASUREMENT_ID') {
      const trackingContext = getTrackingContext();
      
      // Initialize session tracking on first page view
      const isFirstPageView = !sessionStorage.getItem('session_start_time');
      if (isFirstPageView) {
        initSessionTracking();
      }
      
      // Track session page view
      trackSessionPageView();
      
      // Set page config with tracking context
      (window as any).gtag('config', gaId, {
        page_path: pagePath,
        page_title: pageTitle || document.title,
        page_location: window.location.href,
        ...trackingContext,
        ...additionalParams
      });
      
      // Set user properties for audience segmentation
      const pageCount = parseInt(sessionStorage.getItem('page_count') || '1');
      setGAUserProperties({
        traffic_source: trackingContext.source,
        traffic_medium: trackingContext.medium,
        referrer_domain: trackingContext.referrer_domain,
        campaign_name: trackingContext.campaign || null,
        page_count: pageCount,
      });
      
      // Track page_view event with full context
      trackGAEvent('page_view', {
        page_title: pageTitle || document.title,
        page_path: pagePath,
        ...additionalParams
      });
    }
  }
};

/**
 * Track page view events
 */
export const trackPageView = (platform: 'linkedin' | 'meta') => {
  trackConversion(platform, 'page_view');
};

/**
 * Track form submission events
 */
export const trackFormSubmit = (platform: 'linkedin' | 'meta') => {
  trackConversion(platform, 'form_submit');
};

/**
 * Track lead generation events
 */
export const trackLeadGeneration = (platform: 'linkedin' | 'meta') => {
  trackConversion(platform, 'lead');
};

/**
 * Initialize session tracking data
 */
export const initSessionTracking = () => {
  if (typeof window === 'undefined') return;
  
  // Set session start time
  if (!sessionStorage.getItem('session_start_time')) {
    sessionStorage.setItem('session_start_time', Date.now().toString());
  }
  
  // Track session properties
  const trackingContext = getTrackingContext();
  setGAUserProperties({
    ...trackingContext,
    session_start_time: sessionStorage.getItem('session_start_time'),
    page_count: 1,
  });
};

/**
 * Track session page view
 */
export const trackSessionPageView = () => {
  if (typeof window === 'undefined') return;
  
  const pageCount = parseInt(sessionStorage.getItem('page_count') || '0') + 1;
  sessionStorage.setItem('page_count', pageCount.toString());
  
  setGAUserProperties({
    page_count: pageCount,
  });
};

/**
 * Bot protection helper
 */
export function detectBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
    /googlebot/i, /bingbot/i, /yandexbot/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}
