import React, { useEffect, useState } from 'react';
import { useSocialMediaPage } from '../contexts/SocialMediaPageContext';
import { trackPageView, trackConversion, trackGAEvent, trackGAPageView } from '../utils/trackingUtils';

interface SocialMediaProposalProps {
  platform: 'linkedin' | 'meta';
}

const SocialMediaProposal: React.FC<SocialMediaProposalProps> = ({ platform }) => {
  const { submitContactRequest } = useSocialMediaPage();
  const [loading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const serviceOrder = ['massage', 'hair-makeup', 'headshot', 'nails', 'mindfulness'];
  
  // Pricing Calculator State - moved to top to avoid hooks order violation
  const [selectedService, setSelectedService] = useState('massage');
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(1); // Track by index instead
  const [pricingConfig, setPricingConfig] = useState({
    totalAppointments: 24,
    appTime: 20,
    numPros: 2,
    hourlyRate: 135,
    proHourly: 50,
    earlyArrival: 25,
    retouchingCost: 0
  });

  // Contact Form State
  const [showContactForm, setShowContactForm] = useState(false);
  const [showMessageField, setShowMessageField] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    location: '',
    employees: '',
    serviceType: '',
    eventDate: '',
    appointmentCount: '',
    customAppointmentCount: '',
    message: ''
  });

  // Helper function to get UTM parameters from localStorage or URL
  const getUtmParams = () => {
    // First check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        utmParams[param] = value;
      }
    });

    // If no URL params, check localStorage
    if (Object.keys(utmParams).length === 0) {
      const storedData = localStorage.getItem('shortcut_utms');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const expiration = parsed.expiration || 0;
          if (Date.now() < expiration && parsed.params) {
            ['utm_source', 'utm_medium', 'utm_campaign'].forEach(param => {
              if (parsed.params[param]) {
                utmParams[param] = parsed.params[param];
              }
            });
          }
        } catch (e) {
          console.error('Error parsing stored UTMs:', e);
        }
      }
    }

    return utmParams;
  };

  // Track page view on component mount
  useEffect(() => {
    trackPageView(platform);
    
    // Track Google Analytics page view with enhanced tracking (automatically includes UTM params, source, referrer, etc.)
    trackGAPageView(`/social-media/${platform}`, `Social Media Landing Page - ${platform}`, {
      platform: platform,
      event_category: 'engagement',
      event_label: 'social_media_landing',
      landing_page_type: 'social_media'
    });
  }, [platform]);

  // Capture and persist UTM parameters for 90 days
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        utmParams[param] = value;
      }
    });

    // Only update if we have UTM parameters in URL
    if (Object.keys(utmParams).length > 0) {
      // Get existing UTMs from localStorage
      const existingUtms = localStorage.getItem('shortcut_utms');
      let existingParams: Record<string, string> = {};
      
      if (existingUtms) {
        try {
          existingParams = JSON.parse(existingUtms);
        } catch (e) {
          console.error('Error parsing existing UTMs:', e);
        }
      }

      // Merge new UTMs with existing (URL UTMs take priority)
      const mergedUtms = { ...existingParams, ...utmParams };
      
      // Store in localStorage with expiration date (90 days)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 90);
      
      const dataToStore = {
        params: mergedUtms,
        expiration: expirationDate.getTime()
      };
      
      localStorage.setItem('shortcut_utms', JSON.stringify(dataToStore));
      console.log('✅ UTM parameters stored:', mergedUtms);
    } else {
      // If no UTM params in URL, check if we have stored ones and if they're still valid
      const storedData = localStorage.getItem('shortcut_utms');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const expiration = parsed.expiration || 0;
          
          // If expired, remove it
          if (Date.now() > expiration) {
            localStorage.removeItem('shortcut_utms');
            console.log('🗑️ Expired UTM parameters removed');
          }
        } catch (e) {
          console.error('Error parsing stored UTMs:', e);
        }
      }
    }

    // Function to inject UTMs into all outbound links
    const injectUtmsIntoLinks = () => {
      // Get stored UTM parameters
      const getStoredUtms = (): Record<string, string> => {
        try {
          const storedData = localStorage.getItem('shortcut_utms');
          if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed.expiration && Date.now() < parsed.expiration) {
              return parsed.params || {};
            }
          }
        } catch (e) {
          console.error('Error reading stored UTMs:', e);
        }
        return {};
      };

      const storedUtms = getStoredUtms();
      
      if (Object.keys(storedUtms).length === 0) {
        return; // No UTMs to append
      }

      // Build UTM query string
      const utmQueryString = Object.keys(storedUtms)
        .map(key => `${key}=${encodeURIComponent(storedUtms[key])}`)
        .join('&');

      // Find all anchor tags with hrefs that are external links
      const links = document.querySelectorAll('a[href], button[data-calendly-url]');
      
      links.forEach((link) => {
        if (link instanceof HTMLAnchorElement) {
          const href = link.getAttribute('href');
          if (href && (href.startsWith('http') || href.startsWith('mailto:') || href.includes('calendly.com'))) {
            try {
              const url = new URL(href.includes('//') ? href : `https://${href}`, window.location.origin);
              const existingParams = new URLSearchParams(url.search);
              
              // Only add UTM if they don't already exist
              let hasNewParam = false;
              Object.keys(storedUtms).forEach(key => {
                if (!existingParams.has(key)) {
                  existingParams.set(key, storedUtms[key]);
                  hasNewParam = true;
                }
              });
              
              if (hasNewParam) {
                url.search = existingParams.toString();
                link.setAttribute('href', url.toString());
              }
            } catch (e) {
              console.error('Error processing link:', href, e);
            }
          }
        }
      });

      // Handle Calendly integration
      const calendlyElements = document.querySelectorAll('[data-calendly-url]');
      calendlyElements.forEach((element) => {
        const calendlyUrl = element.getAttribute('data-calendly-url');
        if (calendlyUrl && element instanceof HTMLElement) {
          try {
            const url = new URL(calendlyUrl);
            const existingParams = new URLSearchParams(url.search);
            
            // Add UTM parameters
            Object.keys(storedUtms).forEach(key => {
              if (!existingParams.has(key)) {
                existingParams.set(key, storedUtms[key]);
              }
            });
            
            url.search = existingParams.toString();
            element.setAttribute('data-calendly-url', url.toString());
          } catch (e) {
            console.error('Error processing Calendly URL:', e);
          }
        }
      });
    };

    // Inject UTMs into links after a short delay to ensure DOM is ready
    setTimeout(injectUtmsIntoLinks, 100);
    
    // Also re-inject when new elements are added (e.g., dynamic content)
    const observer = new MutationObserver(injectUtmsIntoLinks);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [platform]);

  // FAQ toggle functionality
  useEffect(() => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach((item) => {
      const question = item.querySelector('.faq-question');
      const content = item.querySelector('.faq-content');
      const icon = question?.querySelector('.faq-icon');
      
      question?.addEventListener('click', () => {
        const isOpen = content?.classList.contains('open');
        
        if (isOpen) {
          content?.classList.remove('open');
          if (icon) icon.textContent = '+';
        } else {
          content?.classList.add('open');
          if (icon) icon.textContent = '−';
        }
      });
    });
  }, [platform]);

  // Update meta tags for social media previews
  useEffect(() => {
    const platformName = platform === 'linkedin' ? 'LinkedIn' : 'Meta';
    const title = `Holiday Wellness Gifts from Shortcut - ${platformName}`;
    const description = 'Give your team a gift they\'ll love. From massages to holiday party glam, we bring wellness right to your office.';
    const imageUrl = 'https://proposals.getshortcut.co/Holiday Proposal/PREVIEW LINK HOLIDAY PAGES.png';
      
      // Update document title
      document.title = title;
      
      // Update meta tags
      const updateMetaTag = (property: string, content: string) => {
        let element = document.querySelector(`meta[property="${property}"]`) || 
                     document.querySelector(`meta[name="${property}"]`);
        if (element) {
          element.setAttribute('content', content);
        } else {
          element = document.createElement('meta');
          element.setAttribute(property.startsWith('og:') || property.startsWith('twitter:') ? 'property' : 'name', property);
          element.setAttribute('content', content);
          document.head.appendChild(element);
        }
      };
      
      // Open Graph tags
      updateMetaTag('og:title', title);
      updateMetaTag('og:description', description);
      updateMetaTag('og:image', imageUrl);
      updateMetaTag('og:url', window.location.href);
      
      // Twitter tags
      updateMetaTag('twitter:title', title);
      updateMetaTag('twitter:description', description);
      updateMetaTag('twitter:image', imageUrl);
      
      // Standard meta tags
      updateMetaTag('description', description);
      updateMetaTag('title', title);
  }, [platform]);

  // Add tracking pixels for LinkedIn and Meta
  useEffect(() => {
    // LinkedIn Insight Tag
    if (platform === 'linkedin') {
      const script = document.createElement('script');
      script.innerHTML = `
        _linkedin_partner_id = "8188114";
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(_linkedin_partner_id);
        (function(l) {
          if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
          window.lintrk.q=[]}
          var s = document.getElementsByTagName("script")[0];
          var b = document.createElement("script");
          b.type = "text/javascript";b.async = true;
          b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
          s.parentNode.insertBefore(b, s);})(window.lintrk);
      `;
      document.head.appendChild(script);
      
      // Add noscript tracking image for LinkedIn
      const noscript = document.createElement('noscript');
      const img = document.createElement('img');
      img.height = 1;
      img.width = 1;
      img.style.display = 'none';
      img.alt = '';
      img.src = 'https://px.ads.linkedin.com/collect/?pid=8188114&fmt=gif';
      noscript.appendChild(img);
      document.body.appendChild(noscript);
    }

    // Meta (Facebook) Pixel
    if (platform === 'meta') {
      console.log('📊 Initializing Meta Pixel for Meta platform');
      
      const script = document.createElement('script');
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        
        // Initialize pixel
        console.log('🎯 Initializing Meta Pixel with ID: 1104863743004498');
        fbq('init', '1104863743004498');
        
        // Track page view
        fbq('track', 'PageView');
        console.log('✅ Meta Pixel PageView event sent');
      `;
      document.head.appendChild(script);
      
      // Also set up manual tracking in case fbq isn't available yet
      setTimeout(() => {
        if (typeof (window as any).fbq !== 'undefined') {
          console.log('✅ Meta Pixel loaded and ready');
        } else {
          console.warn('⚠️ Meta Pixel not yet loaded');
        }
      }, 1000);
    }
  }, [platform]);

  // useEffect calls moved to top of component

  // Header scroll behavior - matching company styling
  useEffect(() => {
    const handleScroll = () => {
      const header = document.getElementById('social-media-header');
      
      if (!header) return;
      
      if (window.scrollY > 100) {
        header.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      } else {
        header.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Track current service index for arrow labels
  useEffect(() => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement | null;
    if (!scrollContainer) return;
    const onScroll = () => {
      const slideWidth = scrollContainer.clientWidth || 1;
      const index = Math.round(scrollContainer.scrollLeft / slideWidth);
      setCurrentServiceIndex(Math.max(0, Math.min(index, serviceOrder.length - 1)));
    };
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scrollContainer.removeEventListener('scroll', onScroll as EventListener);
  }, []);

  // Intersection Observer for fade-in animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Remove will-change after animation completes for better performance
          setTimeout(() => {
            (entry.target as HTMLElement).style.willChange = 'auto';
          }, 500);
        }
      });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in-section');
    fadeElements.forEach((el) => observer.observe(el));

    return () => {
      fadeElements.forEach((el) => observer.unobserve(el));
    };
  }, [platform]);

  // Custom smooth scroll with easing
  const smoothScrollTo = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Add class to disable CSS smooth scrolling during JS animation
    document.documentElement.classList.add('scrolling');

    const startPosition = window.pageYOffset;
    const targetPosition = target.getBoundingClientRect().top + startPosition - 80; // 80px offset for header
    const distance = targetPosition - startPosition;
    const duration = 700; // 0.7 seconds - optimal speed
    let start: number | null = null;

    // Easing function (easeInOutQuart) - smoother than cubic
    const easing = (t: number): number => {
      return t < 0.5
        ? 8 * t * t * t * t
        : 1 - 8 * (--t) * t * t * t;
    };

    const animation = (currentTime: number) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easing(progress);

      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        // Re-enable CSS smooth scrolling
        document.documentElement.classList.remove('scrolling');
      }
    };

    requestAnimationFrame(animation);
  };

  // Default values for when no holiday page data is available
  const partnerName = 'your';
  const partnerLogoUrl = null;
  // const customMessage = ''; // Available for future use
  
  // Debug logging
  console.log('Social Media Page Data:', {
    platform,
    partnerName,
    partnerLogoUrl
  });
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading holiday page...</p>
        </div>
      </div>
    );
  }

  // Pricing Calculator State - already moved to top

  // Service preset packages
  const SERVICE_PRESETS = {
    massage: [
      { appointments: 36, eventTime: 4, pros: 3, price: 1620 },
      { appointments: 48, eventTime: 4, pros: 4, price: 2160, popular: true },
      { appointments: 60, eventTime: 5, pros: 4, price: 2700 }
    ],
    'hair-makeup': [
      { appointments: 32, eventTime: 6, pros: 3, price: 2430 },
      { appointments: 48, eventTime: 6, pros: 4, price: 3240, popular: true },
      { appointments: 60, eventTime: 6, pros: 5, price: 4050 }
    ],
    headshot: [
      { appointments: 30, eventTime: 5, pros: 1, price: 3000 },
      { appointments: 60, eventTime: 6, pros: 2, price: 7200, popular: true },
      { appointments: 90, eventTime: 6, pros: 3, price: 10800 }
    ],
    nails: [
      { appointments: 32, eventTime: 6, pros: 3, price: 2430 },
      { appointments: 48, eventTime: 6, pros: 4, price: 3240, popular: true },
      { appointments: 60, eventTime: 6, pros: 5, price: 4050 }
    ],
    mindfulness: [
      { appointments: 1, eventTime: 0.5, pros: 1, price: 1225, name: 'Mindful Eating & Breathe Awareness', popular: true },
      { appointments: 1, eventTime: 0.5, pros: 1, price: 1225, name: 'Movement & Scan' },
      { appointments: 1, eventTime: 1, pros: 1, price: 1500, name: 'Speak & Listen' }
    ]
  } as const;

  // Get current preset based on selected service and appointment count
  const getCurrentPreset = (serviceType: string, appointmentCount: number) => {
    const presets = SERVICE_PRESETS[serviceType as keyof typeof SERVICE_PRESETS];
    if (!presets) return null;
    
    // Find closest preset by appointment count
    return presets.reduce((closest, preset) => {
      return Math.abs(preset.appointments - appointmentCount) < Math.abs(closest.appointments - appointmentCount) 
        ? preset : closest;
    });
  };

  const currentPreset = getCurrentPreset(selectedService, pricingConfig.totalAppointments);

  // Get service name for display
  const getServiceName = (serviceId: string) => {
    const names = {
      'massage': 'Massage',
      'hair-makeup': 'Holiday Glam',
      'headshot': 'Headshots',
      'nails': 'Nails',
      'mindfulness': 'Mindfulness'
    };
    return names[serviceId as keyof typeof names] || 'Service';
  };

  // Get service color
  const getServiceColor = (serviceId: string) => {
    const colors = {
      'massage': '#9EFAFF',
      'hair-makeup': '#FEDC64',
      'headshot': '#9EFAFF',
      'nails': '#F9CDFF',
      'mindfulness': '#FEDC64'
    };
    return colors[serviceId as keyof typeof colors] || '#9EFAFF';
  };

  // Get mindfulness service description
  const getMindfulnessDescription = (serviceName: string) => {
    const descriptions = {
      'Mindful Eating & Breathe Awareness': 'Slow down and reconnect through mindful eating and breath awareness. This 30-minute session uses the five senses to invite deeper presence and calm and bring ease to the holiday rush.',
      'Movement & Scan': 'Release holiday tension with gentle movement and a guided body scan. This 30-minute course awakens body awareness, eases stress, and restores balance.',
      'Speak & Listen': 'Learn mindfulness tools to step out of reactivity and more consciously respond. This 60-minute workshop introduces calming techniques to ease holiday stress and deepen meaningful connection.'
    };
    return descriptions[serviceName as keyof typeof descriptions] || '';
  };

  // Get service-specific appointment options
  const getServiceAppointmentOptions = (serviceType: string) => {
    if (!serviceType) return [];
    
    const presets = SERVICE_PRESETS[serviceType as keyof typeof SERVICE_PRESETS];
    if (!presets) return [];
    
    return presets.map((preset) => {
      const unit = serviceType === 'mindfulness' ? 'session' : 'appointments';
      const count = preset.appointments;
      const unitText = count === 1 ? unit : unit + 's';
      
      return {
        value: preset.appointments.toString(),
        label: `${count} ${unitText}`,
        isPopular: (preset as any).popular
      };
    });
  };


  // Get what's included for each service
  const getWhatsIncluded = (serviceId: string) => {
    const inclusions = {
      'massage': [
        'Choose chair or table massages',
        'Optional privacy screens',
        'Relaxing music and soothing scents',
        'Select massage pro gender',
        'Fully insured for access to any office building'
      ],
      'hair-makeup': [
        'Services for all hair styles and textures',
        'Premium brand name styling products',
        'Fully insured for access to any office building',
        'No hair left behind! Space left in pristine condition',
        'Sanitation of tools between each appointment'
      ],
      'headshot': [
        'Optional hair + makeup touchups',
        'No hidden fees for equipment or transportation',
        'Top notch backdrop and lighting options',
        'Expert guidance and coaching during session',
        'Fully insured for access to any office building'
      ],
      'nails': [
        '20+ polishes to choose from',
        'Single use nail kits for each appointment',
        'Relaxing music and soothing scents',
        'Sanitation of metal tools between appointments',
        'Fully insured for access to any office building'
      ],
      'mindfulness': [
        'Live instructor lead course',
        'Offered virtually via zoom',
        'Complimentary 1 to 1 follow-ups after first course'
      ]
    };
    return inclusions[serviceId as keyof typeof inclusions] || [];
  };

  // useEffect calls already moved to top of component

  // useEffect removed to fix hooks order - functionality moved to top of component

  const scrollToNextService = () => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement;
    if (!scrollContainer) return;
    
    const currentScroll = scrollContainer.scrollLeft;
    const slideWidth = scrollContainer.clientWidth;
    
    scrollContainer.scrollTo({
      left: currentScroll + slideWidth,
      behavior: 'smooth'
    });
  };

  const scrollToPrevService = () => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement;
    if (!scrollContainer) return;
    
    const currentScroll = scrollContainer.scrollLeft;
    const slideWidth = scrollContainer.clientWidth;
    
    scrollContainer.scrollTo({
      left: currentScroll - slideWidth,
      behavior: 'smooth'
    });
  };

  const scrollToService = (serviceIndex: number) => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement;
    if (!scrollContainer) return;
    
    const slideWidth = scrollContainer.clientWidth;
    
    scrollContainer.scrollTo({
      left: serviceIndex * slideWidth,
      behavior: 'smooth'
    });
  };

  return (
    <div className="holiday-proposal" style={{ backgroundColor: '#f8fafc' }}>
      <style>{`
        /* Mobile-first optimizations */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        
        /* Smooth scrolling with custom easing */
        html {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Disable smooth scroll during JS animation to prevent conflicts */
        html.scrolling {
          scroll-behavior: auto;
        }
        
        .holiday-proposal {
          font-family: 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial;
          color: #003756;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .container-narrow { 
          max-width: 1200px;
        }
        
        /* Mobile-optimized images */
        img {
          max-width: 100%;
          height: auto;
          display: block;
        }
        
        /* GPU acceleration for transforms */
        .fade-in-section,
        img,
        button {
          will-change: transform;
          transform: translate3d(0, 0, 0);
        }
        
        /* Fade-in animations with GPU acceleration */
        .fade-in-section {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        
        .fade-in-section.is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        
        /* Disable animations on mobile for better performance */
        @media (max-width: 768px) {
          .fade-in-section.is-visible > * {
            animation: none !important;
          }
        }
        
        /* Stagger animation for desktop only */
        @media (min-width: 769px) {
          .fade-in-section.is-visible > * {
            animation: fadeInUp 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
          }
          
          .fade-in-section.is-visible > *:nth-child(1) { animation-delay: 0.03s; }
          .fade-in-section.is-visible > *:nth-child(2) { animation-delay: 0.06s; }
          .fade-in-section.is-visible > *:nth-child(3) { animation-delay: 0.09s; }
          .fade-in-section.is-visible > *:nth-child(4) { animation-delay: 0.12s; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        
        /* Typography hierarchy - optimized for mobile */
        .h1 { font-weight: 800; line-height: 1.12; letter-spacing: -0.01em; }
        @media (min-width: 320px) { .h1 { font-size: 2.25rem; } }
        @media (min-width: 768px) { .h1 { font-size: 3.25rem; } }
        @media (min-width: 1024px) { .h1 { font-size: 3.75rem; } }
        
        .section-title { font-weight: 800; line-height: 1.15; }
        @media (min-width: 320px) { .section-title { font-size: 1.5rem; } }
        @media (min-width: 768px) { .section-title { font-size: 2.5rem; } }
        @media (min-width: 1024px) { .section-title { font-size: 3rem; } }
        
        .section-subtitle { font-weight: 600; line-height: 1.3; }
        @media (min-width: 320px) { .section-subtitle { font-size: 1.125rem; } }
        @media (min-width: 768px) { .section-subtitle { font-size: 1.5rem; } }
        
        /* Body text optimization for mobile */
        p, li {
          font-size: 1rem;
          line-height: 1.6;
        }
        
        @media (max-width: 768px) {
          p, li {
            font-size: 0.9375rem;
            line-height: 1.65;
          }
          
          /* Reduce padding on mobile */
          .container-narrow {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          
          /* Optimize button sizes for mobile */
          button {
            font-size: 0.9375rem;
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
          }
          
          /* Reduce gap spacing on mobile */
          .gap-16 { gap: 2rem; }
          .gap-20 { gap: 2.5rem; }
        }
        
        /* Touch-friendly buttons */
        button, a {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Scrollbars */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .services-scroll {
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
        }
        
        .service-slide {
          scroll-snap-align: start;
        }
        
        /* Logo scroller - SIMPLIFIED */
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .logo-track {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        
        .logo-track:hover {
          animation-play-state: paused;
        }
        
        .logo-set {
          display: flex;
          align-items: center;
          gap: 3rem;
        }
        
        .logo-set img {
          height: 3rem;
          width: 10rem;
          flex-shrink: 0;
          filter: brightness(0) saturate(100%) invert(27%) sepia(100%) saturate(2000%) hue-rotate(200deg) brightness(0.3) contrast(1.2);
          opacity: 0.9;
          transition: opacity 0.3s ease;
          object-fit: contain;
          object-position: center;
        }
        
        .logo-set img:hover {
          opacity: 1;
        }
        
        /* Make Betterment logo larger within the same container */
        .logo-set img[alt="Betterment"] {
          transform: scale(1.5);
        }
        
        /* Promotional section */
        .promotion-section {
          background-color: #214C42;
        }

        .promotion-card {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .promotion-card img {
          max-width: 100%;
          height: auto;
          display: block;
          filter: drop-shadow(0 0 0 transparent);
        }
        
        /* Promotion Animation */
        .promotion-cards-wrapper {
          position: relative;
        }
        
        .essential-card-fade {
          animation: fadeToGray 1s ease-in-out 1s forwards;
        }
        
        @keyframes fadeToGray {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.5; transform: scale(0.98); }
        }
        
        .premium-card-animated {
          animation: premiumBounce 2s ease-in-out 2s infinite;
          position: relative;
        }
        
        @keyframes premiumBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          10%, 30% { transform: translateY(-8px) scale(1.02); }
          20% { transform: translateY(-4px) scale(1.01); }
        }
        
        /* Golden Pulse Glow for Premium Card */
        .premium-card-animated::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 24px;
          padding: 4px;
          background: linear-gradient(45deg, #FFD700, #FFA500, #FFD700, #FFA500);
          background-size: 300% 300%;
          animation: goldenPulse 4.5s ease-in-out 2s infinite;
          z-index: -1;
          opacity: 0;
        }
        
        @keyframes goldenPulse {
          0%, 100% {
            opacity: 0;
            background-position: 0% 50%;
            box-shadow: 0 0 0 rgba(255, 215, 0, 0);
          }
          50% {
            opacity: 0.8;
            background-position: 100% 50%;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.4);
          }
        }
        
        
        .sparkle {
          position: absolute;
          width: 20px;
          height: 20px;
          animation: sparkleFloat 3s ease-in-out infinite;
        }
        
        .sparkle:nth-child(1) {
          top: 10%;
          right: 15%;
          animation-delay: 0s;
        }
        
        .sparkle:nth-child(2) {
          top: 25%;
          right: 10%;
          animation-delay: 0.5s;
        }
        
        .sparkle:nth-child(3) {
          bottom: 20%;
          right: 20%;
          animation-delay: 1s;
        }
        
        .sparkle:nth-child(4) {
          top: 50%;
          right: 8%;
          animation-delay: 1.5s;
        }
        
        @keyframes sparkleFloat {
          0%, 100% { 
            transform: translateY(0) rotate(0deg) scale(0); 
            opacity: 0; 
          }
          20% {
            transform: translateY(-10px) rotate(90deg) scale(1);
            opacity: 1;
          }
          80% {
            transform: translateY(-20px) rotate(180deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-30px) rotate(270deg) scale(0);
            opacity: 0;
          }
        }

        /* Testimonial section */
        .testimonial-banner {
          background-color: #ffffff;
          padding: clamp(3rem, 7vw, 4.75rem) 0;
        }

        .testimonial-wrap {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 clamp(1.5rem, 4vw, 2.5rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(3rem, 7vw, 6rem);
        }

        .testimonial-copy {
          flex: 1.3;
          display: grid;
          grid-template-columns: min-content 1fr;
          align-items: start;
          gap: clamp(1rem, 3vw, 1.75rem);
        }

        .testimonial-copy .quote-mark {
          font-weight: 700;
          font-size: 4rem;
          line-height: 0.8;
          color: #40C4BE;
          opacity: 0.9;
          transform: translateY(-0.2em);
        }
        
        @media (min-width: 768px) {
          .testimonial-copy .quote-mark {
            font-size: 5rem;
          }
        }
        
        @media (min-width: 1024px) {
          .testimonial-copy .quote-mark {
            font-size: 6rem;
          }
        }

        .testimonial-copy blockquote {
          margin: 0;
          font-size: 1.5rem;
          line-height: 1.35;
          font-weight: 500;
          color: #214C42;
        }
        
        @media (min-width: 768px) {
          .testimonial-copy blockquote {
            font-size: 2rem;
          }
        }
        
        @media (min-width: 1024px) {
          .testimonial-copy blockquote {
            font-size: 2.25rem;
          }
        }

        .testimonial-side {
          flex: 0.85;
          display: flex;
          justify-content: flex-end;
        }

        .testimonial-identity {
          display: flex;
          align-items: center;
          gap: clamp(2rem, 3.5vw, 3.5rem);
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: clamp(0.9rem, 2.2vw, 1.25rem);
        }

        .testimonial-author .photo {
          width: clamp(3.4rem, 4.4vw, 4rem);
          height: clamp(3.4rem, 4.4vw, 4rem);
          min-width: 3.4rem;
          min-height: 3.4rem;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #40C4BE;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .testimonial-author .photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .testimonial-author .meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          text-align: left;
          align-items: flex-start;
        }

        .testimonial-author .meta .name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #214C42;
          line-height: 1.2;
        }

        .testimonial-author .meta .title {
          font-size: 0.9rem;
          color: rgba(33, 76, 66, 0.75);
          line-height: 1.3;
        }

        .partner-logo {
          width: clamp(8rem, 12vw, 10rem);
          height: auto;
          filter: brightness(0) saturate(100%) invert(12%) sepia(31%) saturate(486%) hue-rotate(119deg) brightness(91%) contrast(90%);
        }

        @media (max-width: 900px) {
          .testimonial-wrap {
            flex-direction: column;
            align-items: flex-start;
          }

          .testimonial-identity {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
          }

          .testimonial-side {
            justify-content: flex-start;
            width: 100%;
          }
        }

        /* Feel Great scroller (Apple style) */
        .rail-wrap { 
          position: relative; 
        }
        .rail {
          display: flex; 
          gap: 2rem; 
          padding: 0 8vw 1rem;
          overflow-x: auto; 
          overscroll-behavior-x: contain;
          scroll-snap-type: x mandatory; 
          scroll-padding: 8vw;
          -webkit-overflow-scrolling: touch;
        }
        .card {
          scroll-snap-align: center;
          flex: 0 0 auto;
          width: min(78vw, 520px);
          aspect-ratio: 4 / 5;
          border-radius: 28px;
          box-shadow: 0 12px 28px rgba(0,55,86,.10);
          overflow: hidden;
          position: relative;
          background: transparent;
        }

        /* FAQ */
        .faq-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .faq-content.open {
          max-height: 200px;
        }
        
        /* Pulse animation */
        .pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(158, 250, 255, 0.3); }
          50% { box-shadow: 0 0 40px rgba(158, 250, 255, 0.6); }
        }
        
        /* Service Legend Fill Animation */
        .service-legend-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          background-color: var(--fill-color, #003756);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
          border-radius: inherit;
        }
        
        .service-legend-item.filling::before {
          width: 100%;
        }
        
        .service-legend-item.filling span {
          color: #003756;
          transition: color 0.3s ease;
        }
        
        /* Package Button Fill Animation */
        .package-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          background-color: var(--package-color, #9EFAFF);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 0;
          border-radius: inherit;
        }
        
        .package-button.selected::before {
          width: 100%;
        }
        
        .package-button > * {
          position: relative;
          z-index: 1;
        }
        
        /* Custom Slider Styling */
        .slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          outline: none;
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #9EFAFF;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #9EFAFF;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        /* Falling Snow Animation */
        .snow {
          position: absolute;
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          opacity: 0.8;
          animation: fall linear infinite;
        }

        @keyframes fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        .snow:nth-child(odd) {
          animation-duration: 3s;
          animation-delay: 0s;
        }

        .snow:nth-child(even) {
          animation-duration: 4s;
          animation-delay: 1s;
        }

        .snow:nth-child(3n) {
          animation-duration: 5s;
          animation-delay: 2s;
        }

        .snow:nth-child(4n) {
          animation-duration: 3.5s;
          animation-delay: 0.5s;
        }

        .snow:nth-child(5n) {
          animation-duration: 4.5s;
          animation-delay: 1.5s;
        }
      `}</style>

      {/* Professional Navigation */}
      <header id="social-media-header" className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 rounded-b-3xl">
        {/* Desktop Navigation */}
        <div className="hidden lg:block">
          <div className="max-w-[1380px] mx-auto px-5 py-4 lg:py-5">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <a
                href="#top"
                className="hover:opacity-80 transition-opacity"
                aria-label="Shortcut - Return to top"
              >
                <img
                  src="/Holiday Proposal/Shortcut Logo Social Nav Bar.png"
                  alt="Shortcut Logo"
                  className="h-9 w-auto object-contain"
                />
              </a>

              {/* Navigation Menu */}
              <nav className="flex items-center text-sm font-bold">
                <a
                  href="#services"
                  className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
                >
                  Services
                </a>
                <a
                  href="#holiday-event"
                  className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
                >
                  Holiday Special
                </a>
                <a
                  href="#pricing"
                  className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
                >
                  Pricing
                </a>
              </nav>

              {/* CTA Button */}
              <button
                onClick={() => {
                  setShowContactForm(true);
                  trackConversion(platform, 'form_start');
                }}
                className="relative overflow-hidden group bg-[#315C52] text-[#EFE0C0] font-bold text-sm rounded-full px-6 py-2.5 lg:px-8 lg:py-3 text-nowrap h-fit w-fit"
              >
                <span className="pointer-events-none absolute bg-[#FF5050] inset-0 translate-y-full duration-300 ease-in rounded-[40px] group-hover:rounded-[0] group-hover:translate-y-0" />
                <span className="pointer-events-none relative">Book a call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden px-5 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a
              href="#top"
              className="hover:opacity-80 transition-opacity"
              aria-label="Shortcut - Return to top"
            >
              <img
                src="/Holiday Proposal/Shortcut Logo Social Nav Bar.png"
                alt="Shortcut Logo"
                className="h-8 w-auto object-contain max-w-[140px]"
              />
            </a>

            {/* CTA Button for Mobile */}
            <button
              onClick={() => {
                setShowContactForm(true);
                trackConversion(platform, 'form_start');
              }}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#EFE0C0] bg-[#315C52] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#315C52] transition-all duration-200 rounded-full"
              aria-label="Contact us"
            >
              Book a call
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden rounded-b-3xl" style={{ backgroundColor: '#214C42', minHeight: '100vh', paddingTop: 0 }}>
        {/* Falling Snow Background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="snow"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
        
        {/* Main Content */}
        <div className="relative z-10">
          <div className="mx-auto container-narrow px-4 pt-40 md:pt-48 pb-16 md:pb-20">
            <div className="grid md:grid-cols-2 gap-16 md:gap-20 items-center">
              {/* Left Side - Text Content */}
              <div>
                <h1 className="h1" style={{ color: '#EFE0C0' }}>
                  <span className="block">Gift a moment of</span>
                  <span className="block">'ahhh' with Shortcut.</span>
                </h1>
                <p className="mt-6 md:mt-8 text-lg md:text-xl leading-relaxed max-w-[48ch]" style={{ color: '#EFE0C0', opacity: 0.95 }}>
                  Give your team a gift they'll love. From massages to holiday party glam, we bring the magic right to your office.
                </p>
                
                <div className="mt-10 md:mt-12 flex flex-col sm:flex-row gap-4">
                  <button onClick={() => {
                    setShowContactForm(true);
                    trackConversion(platform, 'form_start');
                  }} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#EFE0C0', color: '#214C42' }}>
                    Book a call
                  </button>
                  <button onClick={() => smoothScrollTo('services')} className="inline-flex items-center justify-center rounded-full border-2 px-8 py-4 text-base font-semibold hover:opacity-80 transition-all" style={{ borderColor: '#EFE0C0', color: '#EFE0C0' }}>
                    Explore Services
                  </button>
                </div>
              </div>
              
              {/* Right Side - Featured Service Box */}
              <div className="md:pl-8">
                <picture>
                  <source srcSet="/Holiday Proposal/Hero Images/Massage 2x.webp" type="image/webp" />
                <img 
                    src="/Holiday Proposal/Hero Images/Massage 2x.png" 
                  alt="Relaxing Massage" 
                  className="w-full h-auto"
                    width="1152"
                    height="876"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                </picture>
              </div>
            </div>
          </div>
          
          {/* Bottom Section: 4 Service Boxes */}
          <div className="mx-auto container-narrow px-4 pb-16 md:pb-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {/* Luxe Nail Care */}
              <div className="overflow-hidden rounded-lg">
                <picture>
                  <source srcSet="/Holiday Proposal/Hero Images/Nails 2x.webp" type="image/webp" />
                  <img 
                    src="/Holiday Proposal/Hero Images/Nails 2x.png" 
                    alt="Luxe Nail Care" 
                    className="w-full h-auto"
                    style={{ transform: 'scale(1.05)' }}
                    width="400"
                    height="300"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  />
                </picture>
              </div>
              
              {/* Year End Headshots */}
              <div className="overflow-hidden rounded-lg">
                <picture>
                  <source srcSet="/Holiday Proposal/Hero Images/Headshots 2x.webp" type="image/webp" />
                  <img 
                    src="/Holiday Proposal/Hero Images/Headshots 2x.png" 
                    alt="Year End Headshots" 
                    className="w-full h-auto"
                    style={{ transform: 'scale(1.05)' }}
                    width="400"
                    height="300"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  />
                </picture>
              </div>
              
              {/* Holiday Hair & Makeup */}
              <div className="overflow-hidden rounded-lg">
                <picture>
                  <source srcSet="/Holiday Proposal/Hero Images/Hair 2x.webp" type="image/webp" />
                  <img 
                    src="/Holiday Proposal/Hero Images/Hair 2x.png" 
                    alt="Holiday Hair & Makeup" 
                    className="w-full h-auto"
                    style={{ transform: 'scale(1.05)' }}
                    width="400"
                    height="300"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  />
                </picture>
              </div>
              
              {/* Stress melting Mindfulness */}
              <div className="overflow-hidden rounded-lg">
                <picture>
                  <source srcSet="/Holiday Proposal/Hero Images/Mindfulness 2x.webp" type="image/webp" />
                  <img 
                    src="/Holiday Proposal/Hero Images/Mindfulness 2x.png" 
                    alt="Stress melting Mindfulness" 
                    className="w-full h-auto"
                    style={{ transform: 'scale(1.05)' }}
                    width="400"
                    height="300"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  />
                </picture>
              </div>
            </div>
          </div>
          
          {/* Client Logos Section */}
          <div className="pb-20 md:pb-24">
            <div className="text-center mb-10 mx-auto container-narrow px-4">
              <h2 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#003756' }}>
                Top Employers Trust Shortcut
              </h2>
            </div>
            
            {/* Logo Scroller */}
            <div className="overflow-hidden py-8">
              <div className="logo-track">
                <div className="logo-set">
                  <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Wix.svg" alt="Wix" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Tripadvisor.svg" alt="Tripadvisor" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/BCG.svg" alt="BCG" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/PwC.svg" alt="PwC" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Viacom.svg" alt="Viacom" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Cencora.svg" alt="Cencora" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/MTV.svg" alt="MTV" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Paramount.svg" alt="Paramount" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Warner Bros.svg" alt="Warner Bros" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/White & Case.svg" alt="White & Case" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/betterment-logo-vector-2023.svg" alt="Betterment" loading="lazy" />
                </div>
                <div className="logo-set" aria-hidden="true">
                  <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Wix.svg" alt="Wix" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Tripadvisor.svg" alt="Tripadvisor" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/BCG.svg" alt="BCG" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/PwC.svg" alt="PwC" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Viacom.svg" alt="Viacom" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Cencora.svg" alt="Cencora" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/MTV.svg" alt="MTV" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Paramount.svg" alt="Paramount" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/Warner Bros.svg" alt="Warner Bros" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/White & Case.svg" alt="White & Case" loading="lazy" />
                  <img src="/Holiday Proposal/Parnter Logos/betterment-logo-vector-2023.svg" alt="Betterment" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="fade-in-section py-16 md:py-20 rounded-t-3xl rounded-b-3xl overflow-hidden relative" style={{ backgroundColor: '#E0F2F7' }}>
        {/* Navigation Arrows (hidden on mobile) */}
        <div id="left-nav" className="hidden md:flex absolute left-8 top-1/2 transform -translate-y-1/2 z-10 flex-col items-center gap-3 opacity-0 transition-opacity duration-300">
          <div className="text-lg font-semibold" style={{ color: '#003756' }}>{getServiceName(serviceOrder[Math.max(0, currentServiceIndex - 1)] || 'massage')}</div>
          <div className="bg-white rounded-full p-3 shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={scrollToPrevService}>
            <svg className="w-6 h-6" style={{ color: '#003756' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </div>
        </div>

        <div id="right-nav" className="hidden md:flex absolute right-8 top-1/2 transform -translate-y-1/2 z-10 flex-col items-center gap-3">
          <div className="text-lg font-semibold" style={{ color: '#003756' }}>{getServiceName(serviceOrder[Math.min(serviceOrder.length - 1, currentServiceIndex + 1)] || 'headshot')}</div>
          <div className="bg-white rounded-full p-3 shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={scrollToNextService}>
            <svg className="w-6 h-6" style={{ color: '#003756' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        {/* Mobile next control */}
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <button onClick={scrollToNextService} className="px-4 py-2 rounded-full shadow bg-white/90 backdrop-blur text-sm font-semibold flex items-center gap-2">
            <span>Next: {getServiceName(serviceOrder[(currentServiceIndex + 1) % serviceOrder.length])}</span>
            <svg className="w-4 h-4" style={{ color: '#003756' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>

        {/* Service Legend */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-12 px-4">
          <button 
            onClick={() => scrollToService(0)}
            className="service-legend-item relative px-8 py-4 rounded-full text-lg font-semibold transition-all duration-500 hover:scale-105 overflow-hidden"
            style={{ 
              backgroundColor: 'transparent', 
              color: '#003756',
              border: '3px solid #003756'
            }}
            onMouseEnter={(e) => {
              const button = e.currentTarget;
              button.style.setProperty('--fill-color', '#9EFAFF');
              button.classList.add('filling');
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget;
              button.classList.remove('filling');
            }}
          >
            <span className="relative z-10">Massage</span>
          </button>
          <button 
            onClick={() => scrollToService(1)}
            className="service-legend-item relative px-8 py-4 rounded-full text-lg font-semibold transition-all duration-500 hover:scale-105 overflow-hidden"
            style={{ 
              backgroundColor: 'transparent', 
              color: '#003756',
              border: '3px solid #003756'
            }}
            onMouseEnter={(e) => {
              const button = e.currentTarget;
              button.style.setProperty('--fill-color', '#FEDC64');
              button.classList.add('filling');
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget;
              button.classList.remove('filling');
            }}
          >
            <span className="relative z-10">Holiday Glam</span>
          </button>
          <button 
            onClick={() => scrollToService(2)}
            className="service-legend-item relative px-8 py-4 rounded-full text-lg font-semibold transition-all duration-500 hover:scale-105 overflow-hidden"
            style={{ 
              backgroundColor: 'transparent', 
              color: '#003756',
              border: '3px solid #003756'
            }}
            onMouseEnter={(e) => {
              const button = e.currentTarget;
              button.style.setProperty('--fill-color', '#9EFAFF');
              button.classList.add('filling');
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget;
              button.classList.remove('filling');
            }}
          >
            <span className="relative z-10">Headshots</span>
          </button>
          <button 
            onClick={() => scrollToService(3)}
            className="service-legend-item relative px-8 py-4 rounded-full text-lg font-semibold transition-all duration-500 hover:scale-105 overflow-hidden"
            style={{ 
              backgroundColor: 'transparent', 
              color: '#003756',
              border: '3px solid #003756'
            }}
            onMouseEnter={(e) => {
              const button = e.currentTarget;
              button.style.setProperty('--fill-color', '#F9CDFF');
              button.classList.add('filling');
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget;
              button.classList.remove('filling');
            }}
          >
            <span className="relative z-10">Nails</span>
          </button>
          <button 
            onClick={() => scrollToService(4)}
            className="service-legend-item relative px-8 py-4 rounded-full text-lg font-semibold transition-all duration-500 hover:scale-105 overflow-hidden"
            style={{ 
              backgroundColor: 'transparent', 
              color: '#003756',
              border: '3px solid #003756'
            }}
            onMouseEnter={(e) => {
              const button = e.currentTarget;
              button.style.setProperty('--fill-color', '#FEDC64');
              button.classList.add('filling');
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget;
              button.classList.remove('filling');
            }}
          >
            <span className="relative z-10">Mindfulness</span>
          </button>
        </div>
        
        <div className="flex overflow-x-auto scrollbar-hide services-scroll">
          {/* RESET ZONE SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-16 md:py-20">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Service Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Reset Zone</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Relaxing Chair or Table Massages</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Help your team unwind with soothing massages and spa treatments. Our chair or table massages provide a calming retreat, leaving them refreshed and relaxed during the busy holiday season.
                  </p>
                  
                  {/* Service Options */}
                  <div className="space-y-5">
                    {/* First Row: Sports Massage and Compression */}
                    <div className="grid grid-cols-2 gap-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Massage/icon.svg" alt="Sports Massage" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Sports Massage</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Massage/icon-2.svg" alt="Compression" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Compression Massage</span>
                      </div>
                    </div>
                    
                    {/* Second Row: Express Facial */}
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Massage/icon-1.svg" alt="Express Facial" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Express Facial</span>
                    </div>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#EFE0C0' }}>
                      Book a call
                    </button>
                    <button onClick={() => smoothScrollTo('pricing')} className="inline-flex items-center justify-center rounded-full border-2 px-8 py-4 text-base font-semibold hover:opacity-80 transition-all" style={{ borderColor: '#003756', color: '#003756' }}>
                      Pricing
                    </button>
                  </div>
                </div>
                
                {/* Right Side - Massage Image */}
                <div className="relative flex justify-center">
                  <picture>
                    <source srcSet="/Holiday Proposal/Our Services/Massage/masssage 2x.webp" type="image/webp" />
                    <img 
                      src="/Holiday Proposal/Our Services/Massage/masssage 2x.png" 
                      alt="Professional Massage Service" 
                      className="w-3/4 h-auto rounded-2xl max-w-md"
                      loading="lazy"
                    />
                  </picture>
                </div>
              </div>
            </div>
          </div>

          {/* HOLIDAY PARTY GLAM SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-16 md:py-20">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Holiday Party Glam</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Expert makeup, styling and barber services</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Get your team holiday-ready with expert hair and makeup services. From sleek styles to flawless touch-ups, we'll ensure everyone looks their best for the celebration.
                  </p>
                  
                  {/* Feature Options */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* First Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon.svg" alt="Barber Cut" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Barber Cut</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-1.svg" alt="Beard Trim" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Beard Trim</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-2.svg" alt="Makeup" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Makeup</span>
                      </div>
                    </div>
                    
                    {/* Second Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-3.svg" alt="Salon Cut & Style" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Salon Cut & Style</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-4.svg" alt="Hot Towel Shave" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Hot Towel Shave</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Holiday Party Glam/Frame 1278723.svg" alt="Blowout" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Blowout</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#EFE0C0' }}>
                      Book a call
                    </button>
                    <button onClick={() => smoothScrollTo('pricing')} className="inline-flex items-center justify-center rounded-full border-2 px-8 py-4 text-base font-semibold hover:opacity-80 transition-all" style={{ borderColor: '#003756', color: '#003756' }}>
                      Pricing
                    </button>
                  </div>
                </div>
                
                {/* Right Side - Holiday Party Glam Image */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Holiday Party Glam/Glam 2x.webp" 
                    alt="Holiday Party Hair Styling" 
                    className="w-3/4 h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* YEAR END HEADSHOTS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-16 md:py-20">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Year End Headshots</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Headshots + hair & makeup touch ups</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Our in-office headshot experience, complete with hair and makeup touch-ups, helps employees present themselves confidently and creates a consistent, professional appearance for your company.
                  </p>
                  
                  {/* Feature Options */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* First Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon.svg" alt="Outfit Guidance" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Outfit Guidance</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-2.svg" alt="Background Selection" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Background Selection</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-3.svg" alt="Fast Turnaround" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Fast 5-7 Day Turnaround</span>
                      </div>
                    </div>
                    
                    {/* Second Column */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-1.svg" alt="Hair + Makeup Touchups" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Hair + Makeup Touchups</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/icon-4.svg" alt="Flawless Retouching" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Flawless Retouching & Review</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Headshots/Frame 1278722.svg" alt="Pre & Event Day Support" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Pre & Event Day Support</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#EFE0C0' }}>
                      Book a call
                    </button>
                    <button onClick={() => smoothScrollTo('pricing')} className="inline-flex items-center justify-center rounded-full border-2 px-8 py-4 text-base font-semibold hover:opacity-80 transition-all" style={{ borderColor: '#003756', color: '#003756' }}>
                      Pricing
                    </button>
                  </div>
                </div>
                
                {/* Right Side - Headshots Image */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Headshots/Headshots 2x.webp" 
                    alt="Professional Headshot Session" 
                    className="w-3/4 h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NAILS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-16 md:py-20">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Luxe Nail Care</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Professional Manicure & Pedicure Services</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Complete nail care services to keep your team looking polished and festive. From classic manicures to holiday-themed designs, we bring the salon experience to your office.
                  </p>
                  
                  {/* Feature Options - 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-5">
                      <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon.svg" alt="Classic Manicure" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-bold" style={{ color: '#003756' }}>Classic Manicure</span>
                      </div>
                    
                      <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon-2.svg" alt="Gel Manicure" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Gel Manicure</span>
                      </div>
                    
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon-1.svg" alt="Dry Pedicure" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Dry Pedicure</span>
                    </div>
                    
                      <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Nails/icon.svg" alt="Hand Treatments" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Hand Treatments</span>
                    </div>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#EFE0C0' }}>
                      Book a call
                    </button>
                    <button onClick={() => smoothScrollTo('pricing')} className="inline-flex items-center justify-center rounded-full border-2 px-8 py-4 text-base font-semibold hover:opacity-80 transition-all" style={{ borderColor: '#003756', color: '#003756' }}>
                      Pricing
                    </button>
                  </div>
                </div>
                
                {/* Right Side - Nails Image */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Nails/Nails 2x.webp" 
                    alt="Professional Nail Services" 
                    className="w-3/4 h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEASONAL MINDFULNESS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-16 md:py-20">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Seasonal Mindfulness</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Soothing meditation and stress relief</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Led by mindfulness expert Courtney Schulnick, our holiday Mindfulness experiences go beyond apps—helping teams slow down, breathe deeply, and find balance during the busiest time of year.
                  </p>
                  
                  {/* Feature Options - 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon.svg" alt="Mindful Eating" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Mindful Eating & Breathe Awareness</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon-1.svg" alt="Qigong Movement" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Qigong Movement + Body Scan</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon-2.svg" alt="Movement" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Movement & Body Scan</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Mindfulness/icon.svg" alt="Mindful Communication" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-bold" style={{ color: '#003756' }}>Mindful Communication</span>
                    </div>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#EFE0C0' }}>
                      Book a call
                    </button>
                    <button onClick={() => smoothScrollTo('pricing')} className="inline-flex items-center justify-center rounded-full border-2 px-8 py-4 text-base font-semibold hover:opacity-80 transition-all" style={{ borderColor: '#003756', color: '#003756' }}>
                      Pricing
                    </button>
                  </div>
                </div>
                
                {/* Right Side - Courtney Frame */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.webp" 
                    alt="Courtney Schulnick - Mindfulness Leader" 
                    className="w-3/4 h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="fade-in-section testimonial-banner rounded-3xl">
        <div className="testimonial-wrap">
          <div className="testimonial-copy">
            <span className="quote-mark">&ldquo;</span>
            <blockquote>
              The Shortcut team has become an extension of the DraftKings family.
            </blockquote>
          </div>
          <div className="testimonial-side">
            <div className="testimonial-identity">
              <img src="/Holiday Proposal/Parnter Logos/DraftKings.svg" alt="DraftKings" className="partner-logo" loading="lazy" />
              <div className="testimonial-author">
                <div className="photo">
                  <img src="/Holiday Proposal/Testimonial Headshots /1745346365915.jpeg" alt="Christian W. headshot" loading="lazy" />
                </div>
                <div className="meta">
                  <span className="name">Christian W.</span>
                  <span className="title">Head of Workplace Experience</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROMOTIONAL SECTION */}
      <section id="holiday-event" className="fade-in-section promotion-section py-14 md:py-20 rounded-3xl" style={{ backgroundColor: '#214C42' }}>
        <div className="mx-auto max-w-7xl px-4">
          {/* Header Text */}
          <div className="text-center mb-12 md:mb-16">
            {(
            <h3 className="text-lg md:text-xl mb-4" style={{ color: '#EFE0C0', fontWeight: 400 }}>
              A special gift for our friends at {partnerName}
            </h3>
            )}
            <h2 className="h1 mb-4" style={{ color: '#EFE0C0', fontWeight: 600 }}>
              Book a Holiday Event and Save for 2026
            </h2>
            <p className="text-lg md:text-xl" style={{ color: '#EFE0C0', fontWeight: 400 }}>
              Unlock Premium Partner status with Shortcut and make wellness even easier.
            </p>
          </div>

          {/* Promotion Cards */}
          <div className="promotion-cards-wrapper grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Essential Card (Left) */}
            <div className="promotion-card essential-card-fade">
              <img 
                src="/Holiday Proposal/Promotion Section/Essential promotion box.svg" 
                alt="Essential Partner Promotion" 
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
            
            {/* Premium Card (Right) */}
            <div className="promotion-card premium-card-animated">
              <img 
                src="/Holiday Proposal/Promotion Section/Premium promotion box.svg" 
                alt="Premium Partner Promotion" 
                className="w-full h-auto"
                loading="lazy"
              />
              
              {/* Sparkles */}
              <div className="sparkle">✨</div>
              <div className="sparkle">✨</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING CALCULATOR */}
      {(
      <section id="pricing" className="fade-in-section py-20 md:py-24 rounded-3xl" style={{ backgroundColor: '#EFE0C0' }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="h1 mb-6" style={{ color: '#003756' }}>Popular Holiday Packages</h2>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto" style={{ color: '#003756' }}>
              Choose your perfect holiday wellness experience. All packages include premium service and professional setup.
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            {/* Left Side - Calculator */}
            <div className="space-y-8">
              {/* Service Selection */}
              <div className="mb-12">
                <label className="block text-xl font-bold mb-6 text-center" style={{ color: '#003756' }}>
                  Choose Your Service
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { 
                      id: 'massage', 
                      name: 'Massage', 
                      description: 'Relaxing chair or table massages',
                      color: '#9EFAFF',
                      icon: '💆‍♀️'
                    },
                    { 
                      id: 'hair-makeup', 
                      name: 'Holiday Glam', 
                      description: 'Hair styling & makeup services',
                      color: '#FEDC64',
                      icon: '✨'
                    },
                    { 
                      id: 'headshot', 
                      name: 'Headshots', 
                      description: 'Professional photography',
                      color: '#9EFAFF',
                      icon: '📸'
                    },
                    { 
                      id: 'nails', 
                      name: 'Nails', 
                      description: 'Manicures & nail art',
                      color: '#F9CDFF',
                      icon: '💅'
                    },
                    { 
                      id: 'mindfulness', 
                      name: 'Mindfulness', 
                      description: 'Stress-relief sessions',
                      color: '#FEDC64',
                      icon: '🧘‍♀️'
                    }
                  ].map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service.id);
                        setSelectedPackageIndex(1); // Reset to middle package when changing services
                      }}
                      className={`relative p-6 rounded-3xl text-center transition-all duration-300 transform hover:scale-105 ${
                        selectedService === service.id 
                          ? 'ring-4 ring-offset-4 shadow-xl' 
                          : 'hover:shadow-lg'
                      }`}
                      style={{
                        backgroundColor: selectedService === service.id ? service.color : 'white',
                        color: '#003756',
                        border: '2px solid #e5e7eb',
                      }}
                    >
                      <div className="text-3xl mb-3">{service.icon}</div>
                      <div className="font-bold text-lg mb-2">{service.name}</div>
                      <div className="text-sm opacity-75 leading-tight">{service.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Selection */}
              <div className="mb-12">
                <label className="block text-xl font-bold mb-8 text-center" style={{ color: '#003756' }}>
                  Popular {getServiceName(selectedService)} Packages
                </label>
                <div className="grid md:grid-cols-3 gap-6">
                  {SERVICE_PRESETS[selectedService as keyof typeof SERVICE_PRESETS]?.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedPackageIndex(index);
                        setPricingConfig((prev: any) => ({ ...prev, totalAppointments: preset.appointments }));
                      }}
                      className={`package-button relative p-8 rounded-3xl text-center transition-all duration-300 transform hover:scale-105 overflow-hidden ${
                        selectedPackageIndex === index 
                          ? 'selected ring-4 ring-offset-4 shadow-2xl scale-105' 
                          : 'hover:shadow-xl'
                      }`}
                      style={{
                        '--package-color': getServiceColor(selectedService),
                        backgroundColor: 'white',
                        color: '#003756',
                        border: selectedPackageIndex === index ? `3px solid ${getServiceColor(selectedService)}` : '2px solid #E5E7EB',
                        boxShadow: selectedPackageIndex === index ? `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)` : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      } as React.CSSProperties}
                    >
                      {(preset as any).popular && (
                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#FF5050] to-[#175071] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                          MOST POPULAR
                        </div>
                      )}
                      <div className="space-y-6">
                        {/* Package Title */}
                        <div className="text-center">
                          <h3 className="text-2xl font-bold mb-2" style={{ color: '#003756' }}>
                          {(preset as any).name || `${preset.appointments} Appointments`}
                          </h3>
                        </div>
                        
                        {/* Package Details */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-3 text-base">
                            <span className="text-lg">⏱️</span>
                            <span className="font-semibold" style={{ color: '#003756' }}>{preset.eventTime} {preset.eventTime === 1 ? 'hour' : 'hours'}</span>
                          </div>
                          <div className="flex items-center justify-center gap-3 text-base">
                            <span className="text-lg">👥</span>
                            <span className="font-semibold" style={{ color: '#003756' }}>{preset.pros} {getServiceName(selectedService).toLowerCase()} {preset.pros === 1 ? 'pro' : 'pros'}</span>
                          </div>
                          
                          {/* Mindfulness Service Descriptions */}
                          {selectedService === 'mindfulness' && (preset as any).name && (
                            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                              <p className="text-sm leading-relaxed text-center" style={{ color: '#003756' }}>
                                {getMindfulnessDescription((preset as any).name)}
                              </p>
                        </div>
                          )}
                        </div>
                        
                        {/* Price Section */}
                        <div className="pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                          <div className="text-center">
                            <div className="text-4xl font-bold mb-1" style={{ color: '#003756' }}>
                            {(preset as any).custom ? 'Custom' : `$${preset.price.toLocaleString()}`}
                            </div>
                            <div className="text-sm font-medium opacity-75" style={{ color: '#003756' }}>
                              {(preset as any).custom ? 'Contact for pricing' : 'per session'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* What's Included Section */}
              <div className="mb-12">
                <h3 className="text-xl font-bold mb-6 text-center" style={{ color: '#003756' }}>
                  What's Included:
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {getWhatsIncluded(selectedService).map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <span className="text-gray-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Pricing Display & CTA */}
              {currentPreset && (
                <div className="text-center space-y-8">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 border-2 border-blue-200">
                    <div className="text-lg font-medium mb-2" style={{ color: '#6b7280' }}>
                      {(currentPreset as any).custom ? 'Custom Quote Available' : 'Your Package Price'}
                    </div>
                    <div className="text-5xl font-bold mb-4" style={{ color: '#003756' }}>
                      {(currentPreset as any).custom ? 'Custom' : `$${currentPreset.price.toLocaleString()}`}
                    </div>
                    <div className="text-lg font-semibold mb-2" style={{ color: '#003756' }}>
                      {currentPreset.appointments} {selectedService === 'mindfulness' ? (currentPreset.appointments === 1 ? 'session' : 'sessions') : 'appointments'} • {getServiceName(selectedService)}
                    </div>
                    <div className="text-sm" style={{ color: '#6b7280' }}>
                      {currentPreset.eventTime} {currentPreset.eventTime === 1 ? 'hour' : 'hours'} • {currentPreset.pros} {getServiceName(selectedService).toLowerCase()} {currentPreset.pros === 1 ? 'pro' : 'pros'}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div>
                    <a 
                      href="#book" 
                      className="inline-flex items-center justify-center rounded-full font-bold px-12 py-6 text-xl shadow-2xl hover:opacity-90 pulse-glow transition-all transform hover:scale-105"
                      style={{ backgroundColor: '#003756', color: '#EFE0C0' }}
                    >
                      Get Your Custom Quote
                      <span className="ml-3 text-2xl">→</span>
                    </a>
                    <p className="text-sm mt-4 opacity-75" style={{ color: '#6b7280' }}>
                      Free consultation • No commitment required
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* FEEL GREAT SCROLLER */}
      <section id="feel-great" className="fade-in-section py-14 md:py-20 rounded-3xl" style={{ backgroundColor: '#003756' }}>
        <div style={{ padding: '0 8vw' }}>
          <h2 className="h1 text-left text-white" style={{ fontWeight: 600 }}>Why employees and people managers love Shortcut</h2>
        </div>
        <div className="rail-wrap mt-16 md:mt-20">
          <div className="rail" id="feel-rail">
            <article className="card">
              <img src="/Holiday Proposal/Why People/Landing Page Slider 1.webp" alt="Shortcut Service 1" className="absolute inset-0 w-full h-full object-cover object-center" style={{ transform: 'scale(1.05)' }} loading="lazy" />
            </article>
            <article className="card">
              <img src="/Holiday Proposal/Why People/Landing Page Slider 2.jpg" alt="Shortcut Service 2" className="absolute inset-0 w-full h-full object-cover object-center" style={{ transform: 'scale(1.05)' }} loading="lazy" />
            </article>
            <article className="card">
              <img src="/Holiday Proposal/Why People/Landing Page Slider 3.webp" alt="Shortcut Service 3" className="absolute inset-0 w-full h-full object-cover object-center" style={{ transform: 'scale(1.05)' }} loading="lazy" />
            </article>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      {(
        <section className="fade-in-section py-16 md:py-20 bg-gray-50 rounded-3xl">
        <div className="mx-auto container-narrow px-4">
          <h2 className="h1 text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'How quickly can you set up services?',
                a: 'We can typically set up services within 24-48 hours. For urgent requests, we offer same-day service in most major metropolitan areas.'
              },
              {
                q: "What's included in your pricing?",
                a: 'Our pricing includes all services, equipment, setup, and cleanup. No hidden fees, no surprises. We provide transparent, all-inclusive pricing for every service.'
              },
              {
                q: 'Do you work with remote teams?',
                a: "Yes! We offer virtual wellness sessions and can coordinate in-person services for distributed teams. We'll work with your team's schedule and location needs."
              },
              {
                q: 'What if we need to cancel or reschedule?',
                a: "We offer flexible cancellation and rescheduling policies. Just give us 24 hours notice and we'll work with you to find a new time that works for your team."
              }
            ].map((faq, idx) => (
              <div key={idx} className="faq-item bg-white rounded-2xl p-6">
                <button className="faq-question w-full text-left flex items-center justify-between font-semibold" style={{ color: '#003756' }}>
                  <span>{faq.q}</span>
                  <span className="faq-icon text-[#0098AD] text-xl">+</span>
                </button>
                <div className="faq-content">
                  <p className="mt-4 text-gray-700">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* FINAL CTA */}
      <section id="book" className="fade-in-section py-16 md:py-20 text-white rounded-3xl" style={{ backgroundColor: '#214C42' }}>
        <div className="mx-auto container-narrow px-4 text-center">
          <h2 className="h1 text-white mb-6">Ready to Transform Your Workplace?</h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join 500+ companies who trust Shortcut to deliver employee happiness. Book a call today and see how easy workplace wellness can be.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 shadow-glow hover:opacity-90 pulse-glow" style={{ backgroundColor: '#9EFAFF', color: '#003C5E' }}>
              Book a call
            </button>
            <div className="text-sm text-white/70">
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0098AD' }}></span>
                Free consultation • No commitment
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 rounded-t-3xl" style={{ backgroundColor: '#003756' }}>
        <div className="mx-auto container-narrow px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="h1 text-white mb-4">Shortcut</div>
              <p className="text-white/70 mb-4">Employee happiness delivered. One vendor, effortless logistics.</p>
              <div className="flex gap-4">
                <a href="#" className="text-white/70 hover:text-white">LinkedIn</a>
                <a href="#" className="text-white/70 hover:text-white">Twitter</a>
                <a href="#" className="text-white/70 hover:text-white">Instagram</a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Services</h3>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white">Massage</a></li>
                <li><a href="#" className="hover:text-white">Hair & Beauty</a></li>
                <li><a href="#" className="hover:text-white">Headshots</a></li>
                <li><a href="#" className="hover:text-white">Mindfulness</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Company</h3>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/70">
            <div className="flex justify-center items-center gap-6 mb-4">
              <a 
                href="https://www.getshortcut.co/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
              >
                About
              </a>
              <a 
                href="https://www.getshortcut.co/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
              >
                Privacy
              </a>
              <a 
                href="https://www.getshortcut.co/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
              >
                Terms
              </a>
            </div>
            <p>&copy; 2025 Shortcut. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto pt-8 md:pt-4 md:items-center">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl my-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-4xl font-bold mb-3" style={{ color: '#003756' }}>Plan Your Team's Holiday Wellness Event</h2>
                <p className="text-lg text-gray-600 max-w-2xl">
                  We'll help you design the perfect in-office wellness experience — from chair massages to mindfulness sessions. Quick, easy, and stress-free.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowContactForm(false);
                  setShowMessageField(false);
                  // Reset only the form-specific fields, keep prefilled company data
                  setFormData(prev => ({
                    ...prev,
                    serviceType: '',
                    eventDate: '',
                    appointmentCount: '',
                    customAppointmentCount: '',
                    message: ''
                  }));
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                setIsSubmitting(true);
                
                // Get UTM parameters
                const utmParams = getUtmParams();
                
                // Track form submission
                trackConversion(platform, 'form_submit');
                
                // Track Google Analytics form submission (automatically includes source/UTM tracking)
                trackGAEvent('form_submit', {
                  form_name: 'social_media_contact',
                  platform: platform,
                  event_category: 'conversion',
                  event_label: 'contact_form_submit',
                  engagement_time_msec: Date.now() - (performance.timing.navigationStart || 0)
                });
                
                // Submit to social media contact requests
                await submitContactRequest({
                  fullName: formData.fullName,
                  email: formData.email,
                  phone: formData.phone,
                  company: formData.company,
                  location: formData.location,
                  employees: formData.employees,
                  serviceType: formData.serviceType,
                  eventDate: formData.eventDate,
                  appointmentCount: formData.appointmentCount === 'custom' ? formData.customAppointmentCount : formData.appointmentCount,
                  customAppointmentCount: formData.customAppointmentCount,
                  message: formData.employees ? `Employees: ${formData.employees}. ${formData.message || ''}` : formData.message
                }, platform);

                // ✅ API call succeeded - tracking events below only fire after successful submission
                // If the API call fails, execution jumps to catch block and these events never fire

                // Track lead generation
                trackConversion(platform, 'lead');
                
                // Track Google Analytics lead conversion (automatically includes source/UTM tracking)
                // ✅ Fires ONLY after successful API submission (await resolved successfully)
                trackGAEvent('generate_lead', {
                  platform: platform,
                  event_category: 'conversion',
                  event_label: 'social_media_lead',
                  value: 1,
                  currency: 'USD',
                  engagement_time_msec: Date.now() - (performance.timing.navigationStart || 0)
                });

                // GA4 conversion tracking for Book a Call form
                // ✅ Fires ONLY after successful API submission (await resolved successfully)
                // This ensures the event only fires once the API confirms the submission was saved
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'generate_lead', {
                    event_category: 'form',
                    event_label: 'Holiday Meta Landing Page'
                  });
                  console.log('GA4 lead event fired');
                }

                // Fire LinkedIn conversion event
                if (platform === 'linkedin' && typeof (window as any).lintrk !== 'undefined') {
                  (window as any).lintrk('track', { conversion_id: 24355842 });
                  console.log('✅ LinkedIn conversion event fired');
                }

                // Get UTM parameters from localStorage
                const getStoredUtms = () => {
                  try {
                    const storedData = localStorage.getItem('shortcut_utms');
                    if (storedData) {
                      const parsed = JSON.parse(storedData);
                      if (parsed.expiration && Date.now() < parsed.expiration) {
                        return parsed.params || {};
                      }
                    }
                  } catch (e) {
                    console.error('Error reading stored UTMs:', e);
                  }
                  return {};
                };

                const storedUtmParams = getUtmParams();
                console.log('📊 UTM parameters retrieved:', storedUtmParams);

                // Show success message
                setShowContactForm(false);
                setShowSuccessMessage(true);
                // Reset only the form-specific fields, keep prefilled company data
                setFormData(prev => ({
                  ...prev,
                  serviceType: '',
                  eventDate: '',
                  appointmentCount: '',
                  customAppointmentCount: '',
                  message: ''
                }));
              } catch (err) {
                console.error('Error:', err);
                alert('There was an error submitting your request. Please try again.');
              } finally {
                setIsSubmitting(false);
              }
            }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Work Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Company *</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your company name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Location *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g. NYC office, Boston HQ, Remote"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}># of Employees *</label>
                  <input
                    type="text"
                    value={formData.employees}
                    onChange={(e) => setFormData({...formData, employees: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter number of employees"
                    required
                  />
                </div>
              </div>

              {/* Visual separator for optional fields */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-sm font-medium text-gray-500">Optional Details</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Type of service</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => {
                      setFormData({...formData, serviceType: e.target.value, appointmentCount: ''});
                    }}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select a service (optional)</option>
                    <option value="massage">Massage</option>
                    <option value="hair-makeup">Holiday Party Glam</option>
                    <option value="headshot">Headshots</option>
                    <option value="nails">Nail Care</option>
                    <option value="mindfulness">Mindfulness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Date of Event</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {formData.serviceType && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Number of appointments</label>
                  <select
                    value={formData.appointmentCount}
                    onChange={(e) => setFormData({...formData, appointmentCount: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select appointment count</option>
                    {getServiceAppointmentOptions(formData.serviceType).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} {option.isPopular ? '(Most Popular)' : ''}
                      </option>
                    ))}
                    <option value="custom">Custom number</option>
                  </select>
                </div>
              )}

              {formData.appointmentCount === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Custom number of appointments</label>
                  <input
                    type="number"
                    placeholder="Enter custom number of appointments"
                    value={formData.customAppointmentCount}
                    onChange={(e) => setFormData({...formData, customAppointmentCount: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="addMessage"
                  checked={showMessageField}
                  onChange={(e) => setShowMessageField(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="addMessage" className="text-sm font-semibold" style={{ color: '#003756' }}>
                  Add a message
                </label>
              </div>

              {showMessageField && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Your message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={4}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us more about your event or any special requirements..."
                  />
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? 'Booking...' : 'Book Intro Call'}
                </button>
                <p className="text-center text-sm text-gray-600">
                  🎁 Book your planning call before Nov 30 and save 15% on your first event.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message Modal */}
      {showSuccessMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12 transform animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Main Content */}
            <div className="text-center mb-8">
              {/* Success Checkmark */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-green-100 animate-pulse"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#315C52] to-[#214C42] flex items-center justify-center">
                  <svg className="w-12 h-12 text-white animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-5xl font-bold mb-4" style={{ color: '#003756' }}>
                Circle back soon!
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Thanks for reaching out about bringing wellness to your team! We're excited to learn about your company and craft an experience that'll make your employees feel truly appreciated. Look out for an email from us soon to schedule a time to chat.
              </p>
            </div>

            {/* Call-to-Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setTimeout(() => smoothScrollTo('services'), 100);
                }}
                className="flex-1 inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                style={{ backgroundColor: '#315C52', color: '#EFE0C0' }}
              >
                Explore Our Services
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setTimeout(() => smoothScrollTo('top'), 100);
                }}
                className="flex-1 px-8 py-4 text-lg font-semibold text-gray-700 hover:text-gray-900 transition-colors underline"
              >
                Return to home page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaProposal;

