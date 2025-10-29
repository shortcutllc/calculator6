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
 * Extract UTM parameters and tracking data from URL and browser
 */
export const extractTrackingData = (): TrackingData => {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    utmSource: urlParams.get('utm_source') || undefined,
    utmMedium: urlParams.get('utm_medium') || undefined,
    utmCampaign: urlParams.get('utm_campaign') || undefined,
    utmTerm: urlParams.get('utm_term') || undefined,
    utmContent: urlParams.get('utm_content') || undefined,
    referrer: document.referrer || undefined,
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
 * Track Google Analytics events
 */
export const trackGAEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, parameters);
  }
};

/**
 * Track Google Analytics page view
 */
export const trackGAPageView = (pagePath: string, pageTitle?: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    const gaId = (window as any).__ENV__?.VITE_GA_MEASUREMENT_ID;
    if (gaId && gaId !== 'GA_MEASUREMENT_ID') {
      (window as any).gtag('config', gaId, {
        page_path: pagePath,
        page_title: pageTitle || document.title
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
