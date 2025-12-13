import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GenericLandingPage as GenericLandingPageType } from '../types/genericLandingPage';
import { supabase } from '../lib/supabaseClient';

interface GenericLandingPageProps {
  genericLandingPageData?: GenericLandingPageType;
  isGeneric?: boolean;
}

const GenericLandingPage: React.FC<GenericLandingPageProps> = ({ isGeneric = false }) => {
  const { id } = useParams<{ id: string }>();
  const [genericLandingPage, setGenericLandingPage] = useState<GenericLandingPageType | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Pricing Calculator State - moved to top to avoid hooks order violation
  const [selectedService, setSelectedService] = useState('massage');
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const serviceOrder = ['massage', 'hair-makeup', 'headshot', 'nails', 'mindfulness'];
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    location: '',
    serviceType: '',
    eventDate: '',
    appointmentCount: '',
    customAppointmentCount: '',
    message: ''
  });

  // Initialize form with generic landing page data when available
  useEffect(() => {
    if (genericLandingPage && genericLandingPage.data.partnerName) {
      const contactName = `${genericLandingPage.customization.contactFirstName || ''} ${genericLandingPage.customization.contactLastName || ''}`.trim();
      const nameParts = contactName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData(prev => ({
        ...prev,
        firstName,
        lastName,
        email: genericLandingPage.data.clientEmail || '',
        phone: '', // Phone not stored in generic landing page data
        company: genericLandingPage.data.partnerName || '',
        location: '' // Location not stored in generic landing page data
      }));
    }
  }, [genericLandingPage]);

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
  }, [genericLandingPage]);

      const fetchGenericLandingPage = async () => {
    if (!id && !isGeneric) return;
    
    if (isGeneric) {
      // For generic page, set loading to false immediately
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      if (!id) throw new Error('Generic landing page ID is required');

      // Check if id is a valid UUID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      
      let data: any = null;
      let error: any = null;
      
      if (isUUID) {
        // If it's a UUID, try to find by ID first
        const result = await supabase
          .from('generic_landing_pages')
          .select('*')
          .eq('id', id)
          .single();
        data = result.data;
        error = result.error;
        
        // If not found by ID, try unique_token as fallback
        if (error && error.code === 'PGRST116') {
          const resultByToken = await supabase
            .from('generic_landing_pages')
            .select('*')
            .eq('unique_token', id)
            .single();
          data = resultByToken.data;
          error = resultByToken.error;
        }
      } else {
        // If it's not a UUID, it's likely a unique_token
        const result = await supabase
          .from('generic_landing_pages')
          .select('*')
          .eq('unique_token', id)
          .single();
        data = result.data;
        error = result.error;
      }
      
      if (error) {
        throw error;
      }

      if (!data) throw new Error('Generic landing page not found');

      const transformedData: GenericLandingPageType = {
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        data: data.data,
        customization: data.customization,
        isEditable: data.is_editable,
        status: data.status,
        userId: data.user_id,
        uniqueToken: data.unique_token,
        customUrl: data.custom_url
      };

      setGenericLandingPage(transformedData);
        } catch (error) {
          console.error('Error fetching generic landing page:', error);
        } finally {
          setLoading(false);
        }
      };

  useEffect(() => {
    if (id || isGeneric) {
      fetchGenericLandingPage();
    }
  }, [id, isGeneric]);

  // Update meta tags for social media previews
  useEffect(() => {
    if (genericLandingPage || isGeneric) {
      const partnerName = isGeneric ? 'Your Team' : (genericLandingPage?.data.partnerName || 'Your Company');
      const title = isGeneric ? 'Wellness Gifts from Shortcut' : `Wellness Gift from Shortcut - ${partnerName}`;
      const description = isGeneric
        ? 'Give your team a gift they\'ll love. From massages to hair & makeup, we bring wellness right to your office.'
        : `Give the ${partnerName} team a gift they'll love. From massages to hair & makeup, we bring wellness right to your office.`;
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
    }
  }, [genericLandingPage]);

  // useEffect calls moved to top of component

  // Header scroll behavior - simplified since header is now always white
  useEffect(() => {
    const handleScroll = () => {
      const header = document.getElementById('generic-header');
      
      if (!header) return;
      
      if (window.scrollY > 100) {
        header.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      } else {
        header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
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
  }, [genericLandingPage]);

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
  const partnerName = isGeneric ? 'your' : (genericLandingPage?.data.partnerName || 'Your Company');
  const partnerLogoUrl = isGeneric ? null : genericLandingPage?.data.partnerLogoUrl;
  // const customMessage = genericLandingPage?.data.customMessage; // Available for future use
  
  // Debug logging
  console.log('Generic Landing Page Data:', {
    hasGenericLandingPage: !!genericLandingPage,
    partnerName,
    partnerLogoUrl,
    fullData: genericLandingPage?.data
  });
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
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
      'hair-makeup': 'Glam',
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
    <div className="generic-landing-page" style={{ backgroundColor: '#f8fafc' }}>
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
        
        .generic-landing-page {
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
          filter: brightness(0) invert(1);
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
          background-color: #003756;
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
        
        .arrow-pointer {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 4rem;
          color: #FFFFFF;
          z-index: 10;
          animation: arrowBounce 2s ease-in-out infinite;
          pointer-events: none;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
        }
        
        @keyframes arrowBounce {
          0%, 100% { transform: translate(-50%, -50%) translateX(0); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translateX(20px); opacity: 1; }
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
          color: #003756;
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
          color: #003756;
          line-height: 1.2;
        }

        .testimonial-author .meta .title {
          font-size: 0.9rem;
          color: rgba(0, 55, 86, 0.75);
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

        /* Snow animation removed for generic landing page */
      `}</style>

      {/* HEADER */}
      <header id="generic-header" className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 rounded-b-3xl">
        <div className="mx-auto container-narrow px-4 py-4 flex items-center justify-between">
          {/* Partner Logo - Left Side (hidden on small screens, visible on larger) */}
          <div className="hidden lg:flex items-center flex-shrink-0">
            {!isGeneric && (
              <>
          {partnerLogoUrl ? (
              <img 
                src={partnerLogoUrl} 
                alt={partnerName} 
                    className="h-8 sm:h-10 w-auto object-contain"
                    style={{ maxWidth: '120px' }}
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-600">
                    {partnerName}
                  </span>
                )}
              </>
            )}
          </div>
          
          {/* Navigation Menu - Centered (hidden on mobile) */}
          <nav className="hidden lg:flex items-center text-sm font-bold">
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
              Special Offers
            </a>
            <a
              href="#pricing"
              className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
            >
              Pricing
            </a>
          </nav>
          
          {/* Shortcut Logo - Right Side */}
          <a href="#top" className="flex items-center" aria-label="Shortcut logo - return to top">
            <svg id="generic-logo-svg" viewBox="0 0 192 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M29.6284 21.5003C29.3713 23.7505 28.6818 25.9572 27.3774 27.8371C24.2946 32.28 18.9846 33.7633 13.7386 32.1453C8.56113 30.5486 3.54006 26.0287 0 18.7044L4.84254 16.3639C7.92552 22.7425 11.9483 25.9647 15.3237 27.0057C18.6305 28.0256 21.3824 27.0423 22.9585 24.7709C23.2395 24.366 23.481 23.9084 23.6808 23.4043C23.3774 23.4209 23.0738 23.4262 22.7704 23.4206C19.2805 23.3553 16.0856 21.8408 13.6813 19.7541C11.2932 17.6815 9.45986 14.8481 8.92523 11.8407C8.36688 8.69984 9.26489 5.39496 12.2773 3.08642C13.6869 2.00611 15.2332 1.36494 16.8596 1.24094C18.4816 1.11728 19.9964 1.52212 21.3267 2.23502C23.9138 3.62146 25.9253 6.22268 27.2987 9.01314C28.1685 10.7806 28.8433 12.7443 29.2624 14.7619C31.6786 12.1765 34.3066 10.6389 36.5311 9.77503C37.6804 9.3287 38.7381 9.05577 39.6253 8.91256C40.403 8.78701 41.3422 8.71138 42.1247 8.89196L40.9153 14.1327C41.0086 14.1543 41.0586 14.1618 41.0586 14.1618C41.0583 14.1658 40.8815 14.1579 40.4824 14.2223C39.98 14.3034 39.2871 14.4746 38.4782 14.7887C36.8668 15.4145 34.8583 16.5824 32.995 18.6489C31.9331 19.8266 30.8025 20.7717 29.6284 21.5003ZM24.3046 17.9209C24.1028 15.671 23.4436 13.3605 22.4729 11.3882C21.3666 9.14038 20.0076 7.63027 18.7861 6.97569C18.2121 6.66808 17.7132 6.56999 17.2685 6.60389C16.8283 6.63745 16.255 6.81433 15.5489 7.35549C14.3296 8.28987 13.9682 9.47863 14.2207 10.8994C14.497 12.4535 15.5449 14.2498 17.2067 15.692C18.8522 17.1202 20.8758 18.0057 22.871 18.043C23.3362 18.0517 23.8156 18.0149 24.3046 17.9209Z"
                fill="#FF5050" />
              <path fillRule="evenodd" clipRule="evenodd"
                d="M37.5033 11.1947C34.926 10.3834 32.9956 8.72285 31.3895 6.90729L35.4947 3.27552C36.7809 4.72933 37.9135 5.57753 39.149 5.96641C40.3556 6.34619 42.0247 6.40038 44.5918 5.54394L46.8242 10.5201C44.9245 11.6113 43.8736 13.3885 43.3764 15.227C43.1283 16.1444 43.035 17.0253 43.0393 17.7413C43.0437 18.4635 43.1448 18.831 43.1572 18.8761C43.1582 18.8799 43.1583 18.8806 43.1583 18.8806L38.1127 21.0218C37.7142 20.0827 37.565 18.8953 37.5583 17.7744C37.5511 16.586 37.7026 15.2115 38.0853 13.7961C38.2848 13.0585 38.5517 12.2956 38.8993 11.5353C38.4247 11.4518 37.9596 11.3383 37.5033 11.1947Z"
                fill="#FF5050" />
              <path d="M182.038 29.4766V5.46692H187.385V29.4766H182.038ZM178.194 17.0349V12.4916H191.23V17.0349H178.194Z"
                fill="#175071" />
              <path
                d="M167.362 29.861C165.801 29.861 164.415 29.5465 163.203 28.9174C162.015 28.265 161.083 27.3797 160.408 26.2613C159.732 25.1197 159.394 23.8149 159.394 22.3471V12.4916H164.741V22.2772C164.741 22.8597 164.834 23.3606 165.021 23.78C165.23 24.1994 165.533 24.5255 165.929 24.7585C166.326 24.9915 166.803 25.108 167.362 25.108C168.154 25.108 168.784 24.8634 169.25 24.3741C169.716 23.8615 169.949 23.1625 169.949 22.2772V12.4916H175.296V22.3121C175.296 23.8033 174.958 25.1197 174.282 26.2613C173.606 27.3797 172.675 28.265 171.486 28.9174C170.298 29.5465 168.923 29.861 167.362 29.861Z"
                fill="#175071" />
              <path
                d="M150.08 29.8609C148.332 29.8609 146.748 29.4765 145.327 28.7076C143.906 27.9388 142.787 26.8787 141.972 25.5273C141.156 24.176 140.749 22.6615 140.749 20.984C140.749 19.2832 141.156 17.7687 141.972 16.4407C142.81 15.0893 143.941 14.0292 145.362 13.2604C146.783 12.4915 148.379 12.1071 150.15 12.1071C151.478 12.1071 152.689 12.34 153.784 12.806C154.903 13.2487 155.893 13.9244 156.755 14.833L153.33 18.258C152.934 17.8153 152.468 17.4891 151.932 17.2794C151.419 17.0698 150.825 16.9649 150.15 16.9649C149.381 16.9649 148.694 17.1396 148.088 17.4891C147.505 17.8153 147.039 18.2813 146.69 18.8871C146.364 19.4696 146.201 20.1569 146.201 20.949C146.201 21.7412 146.364 22.4402 146.69 23.046C147.039 23.6517 147.517 24.1294 148.123 24.4789C148.728 24.8283 149.404 25.0031 150.15 25.0031C150.849 25.0031 151.466 24.8866 152.002 24.6536C152.561 24.3973 153.039 24.0478 153.435 23.6051L156.825 27.0301C155.94 27.9621 154.938 28.6727 153.819 29.162C152.701 29.6279 151.454 29.8609 150.08 29.8609Z"
                fill="#175071" />
              <path d="M129.93 29.4766V5.46692H135.277V29.4766H129.93ZM126.086 17.0349V12.4916H139.122V17.0349H126.086Z"
                fill="#175071" />
              <path
                d="M110.973 29.4766V12.4916H116.32V29.4766H110.973ZM116.32 20.1453L114.084 18.3979C114.526 16.4175 115.272 14.8797 116.32 13.7847C117.369 12.6896 118.825 12.1421 120.689 12.1421C121.504 12.1421 122.215 12.2702 122.821 12.5265C123.45 12.7595 123.997 13.1323 124.463 13.6449L121.283 17.664C121.05 17.4077 120.759 17.2096 120.409 17.0698C120.06 16.93 119.664 16.8601 119.221 16.8601C118.336 16.8601 117.625 17.1397 117.089 17.6989C116.577 18.2348 116.32 19.0503 116.32 20.1453Z"
                fill="#175071" />
              <path
                d="M99.0146 29.8609C97.2672 29.8609 95.6828 29.4765 94.2616 28.7076C92.8636 27.9155 91.7569 26.8437 90.9415 25.4924C90.126 24.141 89.7183 22.6266 89.7183 20.949C89.7183 19.2715 90.126 17.7687 90.9415 16.4407C91.7569 15.1126 92.8636 14.0642 94.2616 13.2953C95.6595 12.5031 97.2439 12.1071 99.0146 12.1071C100.785 12.1071 102.37 12.4915 103.768 13.2604C105.166 14.0292 106.272 15.0893 107.088 16.4407C107.903 17.7687 108.311 19.2715 108.311 20.949C108.311 22.6266 107.903 24.141 107.088 25.4924C106.272 26.8437 105.166 27.9155 103.768 28.7076C102.37 29.4765 100.785 29.8609 99.0146 29.8609ZM99.0146 25.0031C99.7835 25.0031 100.459 24.84 101.042 24.5138C101.624 24.1643 102.067 23.6867 102.37 23.0809C102.696 22.4518 102.859 21.7412 102.859 20.949C102.859 20.1569 102.696 19.4696 102.37 18.8871C102.043 18.2813 101.589 17.8153 101.007 17.4891C100.447 17.1396 99.7835 16.9649 99.0146 16.9649C98.269 16.9649 97.605 17.1396 97.0225 17.4891C96.44 17.8153 95.9857 18.2813 95.6595 18.8871C95.3333 19.4929 95.1702 20.1918 95.1702 20.984C95.1702 21.7529 95.3333 22.4518 95.6595 23.0809C95.9857 23.6867 96.44 24.1643 97.0225 24.5138C97.605 24.84 98.269 25.0031 99.0146 25.0031Z"
                fill="#175071" />
              <path
                d="M81.6902 29.4766V19.7958C81.6902 18.9104 81.4106 18.1998 80.8514 17.6639C80.3155 17.1048 79.6282 16.8252 78.7894 16.8252C78.207 16.8252 77.6944 16.9533 77.2517 17.2096C76.809 17.4426 76.4595 17.7921 76.2032 18.2581C75.947 18.7007 75.8188 19.2133 75.8188 19.7958L73.7568 18.7823C73.7568 17.4542 74.0364 16.2893 74.5956 15.2874C75.1548 14.2856 75.9353 13.5167 76.9372 12.9808C77.939 12.4216 79.0923 12.1421 80.3971 12.1421C81.7251 12.1421 82.8901 12.4216 83.8919 12.9808C84.8938 13.5167 85.6627 14.2739 86.1985 15.2525C86.7577 16.2077 87.0373 17.3261 87.0373 18.6075V29.4766H81.6902ZM70.4717 29.4766V4.10388H75.8188V29.4766H70.4717Z"
                fill="#175071" />
              <path
                d="M60.4075 29.896C59.4057 29.896 58.4154 29.7678 57.4369 29.5116C56.4816 29.2553 55.5846 28.8941 54.7458 28.4282C53.9304 27.9389 53.2314 27.3797 52.6489 26.7506L55.6895 23.6751C56.2486 24.2809 56.9127 24.7585 57.6815 25.108C58.4504 25.4342 59.2892 25.5973 60.1978 25.5973C60.8269 25.5973 61.3045 25.5041 61.6307 25.3177C61.9802 25.1313 62.1549 24.875 62.1549 24.5489C62.1549 24.1295 61.9452 23.8149 61.5259 23.6052C61.1298 23.3723 60.6172 23.1742 59.9881 23.0111C59.3591 22.8247 58.695 22.6267 57.9961 22.417C57.2971 22.2073 56.6331 21.9161 56.004 21.5433C55.3749 21.1705 54.8623 20.6579 54.4663 20.0055C54.0702 19.3299 53.8721 18.4795 53.8721 17.4543C53.8721 16.3592 54.1517 15.4156 54.7109 14.6235C55.2701 13.808 56.0622 13.1673 57.0874 12.7013C58.1126 12.2353 59.3125 12.0023 60.6871 12.0023C62.1316 12.0023 63.4597 12.2586 64.6712 12.7712C65.9061 13.2605 66.9079 13.9944 67.6768 14.9729L64.6363 18.0484C64.1004 17.4193 63.4946 16.9767 62.819 16.7204C62.1666 16.4641 61.5259 16.3359 60.8968 16.3359C60.291 16.3359 59.8367 16.4291 59.5338 16.6155C59.2309 16.7786 59.0795 17.0233 59.0795 17.3495C59.0795 17.6989 59.2775 17.9785 59.6736 18.1882C60.0697 18.3979 60.5823 18.5843 61.2113 18.7474C61.8404 18.9105 62.5044 19.1085 63.2034 19.3415C63.9024 19.5745 64.5664 19.889 65.1955 20.2851C65.8245 20.6812 66.3371 21.2171 66.7332 21.8928C67.1293 22.5451 67.3273 23.4072 67.3273 24.479C67.3273 26.1332 66.6983 27.4496 65.4401 28.4282C64.2053 29.4067 62.5277 29.896 60.4075 29.896Z"
                fill="#175071" />
            </svg>
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden rounded-b-3xl" style={{ backgroundColor: '#003756', minHeight: '100vh', paddingTop: 0 }}>
        {/* Main Content */}
        <div className="relative z-10">
          <div className="mx-auto container-narrow px-4 pt-40 md:pt-48 pb-16 md:pb-20">
            <div className="grid md:grid-cols-2 gap-16 md:gap-20 items-center">
              {/* Left Side - Text Content */}
              <div>
                <h1 className="h1" style={{ color: '#FFFFFF' }}>
                  <span className="block">Employee Happiness</span>
                  <span className="block">Delivered</span>
                </h1>
                <p className="mt-6 md:mt-8 text-lg md:text-xl leading-relaxed max-w-[48ch]" style={{ color: '#FFFFFF', opacity: 0.95 }}>
                  Say goodbye to outdated office perks and hello to a new era of employee wellness with Shortcut
                </p>
                
                <div className="mt-10 md:mt-12 flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#FFFFFF', color: '#003756' }}>
                    Get in touch
                  </button>
                  <button onClick={() => smoothScrollTo('services')} className="inline-flex items-center justify-center rounded-full border-2 px-8 py-4 text-base font-semibold hover:opacity-80 transition-all" style={{ borderColor: '#FFFFFF', color: '#FFFFFF' }}>
                    Explore Services
                  </button>
                </div>
              </div>
              
              {/* Right Side - Featured Service Box */}
              <div className="md:pl-8">
                <img 
                  src="/Landing Page Hero Images/Massage Hero.png" 
                  alt="Relaxing Massage" 
                  className="w-full h-auto"
                  width="1152"
                  height="876"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </div>
          </div>
          
          {/* Bottom Section: 4 Service Boxes */}
          <div className="mx-auto container-narrow px-4 pb-16 md:pb-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {/* Nail Care */}
              <div className="overflow-hidden rounded-lg">
                <img 
                  src="/Landing Page Hero Images/Nails Hero.png" 
                  alt="Nail Care" 
                  className="w-full h-auto"
                  style={{ transform: 'scale(1.05)' }}
                  width="400"
                  height="300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                />
              </div>
              
              {/* Hair & Makeup */}
              <div className="overflow-hidden rounded-lg">
                <img 
                  src="/Landing Page Hero Images/Hair Hero.png" 
                  alt="Hair & Makeup" 
                  className="w-full h-auto"
                  style={{ transform: 'scale(1.05)' }}
                  width="400"
                  height="300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                />
              </div>
              
              {/* Professional Headshots */}
              <div className="overflow-hidden rounded-lg">
                <img 
                  src="/Landing Page Hero Images/Headshots Hero.png" 
                  alt="Professional Headshots" 
                  className="w-full h-auto"
                  style={{ transform: 'scale(1.05)' }}
                  width="400"
                  height="300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                />
              </div>
              
              {/* Mindfulness */}
              <div className="overflow-hidden rounded-lg">
                <img 
                  src="/Landing Page Hero Images/Mindfulness Hero.png" 
                  alt="Mindfulness" 
                  className="w-full h-auto"
                  style={{ transform: 'scale(1.05)' }}
                  width="400"
                  height="300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                />
              </div>
            </div>
          </div>
          
          {/* Client Logos Section */}
          <div className="pb-20 md:pb-24">
            <div className="text-center mb-10 mx-auto container-narrow px-4">
              <h2 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
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
            <span className="relative z-10">Glam</span>
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
                    Treat your team to rejuvenating chair or table massage sessions right in the workplace. Our expert therapists create a luxurious spa-like ambiance with soothing scents, customized lighting and relaxing sounds.
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
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#FFFFFF' }}>
                      Get in touch
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
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Hair & Makeup</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Expert makeup, styling and barber services</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    Enjoy a personalized makeup look, from natural to glamorous, paired with a quick hair touch-up using hot tools for a polished finish. Perfect for any occasion.
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
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#FFFFFF' }}>
                      Get in touch
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
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Professional Headshots</h2>
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
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#FFFFFF' }}>
                      Get in touch
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
                    Experience manicures and pedicures that blend relaxation with elegance, offering a pampered escape that leaves employees refreshed and polished.
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
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#FFFFFF' }}>
                      Get in touch
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
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Mindfulness</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Soothing meditation and stress relief</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    In just one 60 minute workshop your team will learn the fundamentals, experience guided meditations and gain practical tools to reduce stress and enhance focus.
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
                    <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 text-base shadow-soft hover:opacity-90 pulse-glow transition-all" style={{ backgroundColor: '#003756', color: '#FFFFFF' }}>
                      Get in touch
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
      {(!genericLandingPage || genericLandingPage.customization.includeTestimonials) && (
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
      )}

      {/* PROMOTIONAL SECTION */}
      <section id="holiday-event" className="fade-in-section promotion-section py-14 md:py-20 rounded-3xl" style={{ backgroundColor: '#003756' }}>
        <div className="mx-auto max-w-7xl px-4">
          {/* Header Text */}
          <div className="text-center mb-12 md:mb-16">
            {!isGeneric && (
            <h3 className="text-lg md:text-xl mb-4" style={{ color: '#FFFFFF', fontWeight: 400 }}>
              A special gift for our friends at {partnerName}
            </h3>
            )}
            <h2 className="h1 mb-4" style={{ color: '#FFFFFF', fontWeight: 600 }}>
              Book your first event for 2026 and save
            </h2>
            <p className="text-lg md:text-xl" style={{ color: '#FFFFFF', fontWeight: 400 }}>
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
            
            {/* Animated Arrow Pointer */}
            <div className="arrow-pointer hidden md:block">
              →
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
      {(!genericLandingPage || genericLandingPage.customization.includePricingCalculator) && (
      <section id="pricing" className="fade-in-section py-20 md:py-24 rounded-3xl" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="h1 mb-6" style={{ color: '#003756' }}>Popular Packages</h2>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto" style={{ color: '#003756' }}>
              Choose your perfect wellness experience. All packages include premium service and professional setup.
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
                      name: 'Hair & Makeup', 
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
      {(!genericLandingPage || genericLandingPage.customization.includeFAQ) && (
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
      <section id="book" className="fade-in-section py-16 md:py-20 text-white rounded-3xl" style={{ backgroundColor: '#003756' }}>
        <div className="mx-auto container-narrow px-4 text-center">
          <h2 className="h1 text-white mb-6">Ready to Transform Your Workplace?</h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join 500+ companies who trust Shortcut to deliver employee happiness. Book a call today and see how easy workplace wellness can be.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button onClick={() => setShowContactForm(true)} className="inline-flex items-center justify-center rounded-full font-bold px-8 py-4 shadow-glow hover:opacity-90 pulse-glow" style={{ backgroundColor: '#9EFAFF', color: '#003C5E' }}>
              Get in touch
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
      <footer className="py-12" style={{ backgroundColor: '#FF5050' }}>
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
            <p>&copy; 2025 Shortcut. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-4xl font-bold mb-3" style={{ color: '#003756' }}>Get in touch</h2>
                <p className="text-lg text-gray-600 max-w-2xl">Experience the future of wellness at work with Shortcut, from soothing massages to calming mindfulness sessions.</p>
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
                // Save form data to Supabase
                const { data, error } = await supabase
                  .from('contact_requests')
                  .insert([
                    {
                      first_name: formData.firstName,
                      last_name: formData.lastName,
                      email: formData.email,
                      phone: formData.phone,
                      company: formData.company,
                      location: formData.location,
                      service_type: formData.serviceType,
                      event_date: formData.eventDate,
                      appointment_count: formData.appointmentCount === 'custom' ? formData.customAppointmentCount : formData.appointmentCount,
                      message: formData.message,
                      generic_landing_page_id: genericLandingPage?.id || null,
                      created_at: new Date().toISOString()
                    }
                  ]);

                if (error) {
                  console.error('Error saving contact request:', error);
                  alert('There was an error submitting your request. Please try again.');
                } else {
                  console.log('Contact request saved successfully:', data);
                  alert('Thank you for your interest! We\'ll be in touch soon.');
                  setShowContactForm(false);
                  // Reset only the form-specific fields, keep prefilled company data
                  setFormData(prev => ({
                    ...prev,
                    serviceType: '',
                    eventDate: '',
                    appointmentCount: '',
                    customAppointmentCount: '',
                    message: ''
                  }));
                }
              } catch (err) {
                console.error('Error:', err);
                alert('There was an error submitting your request. Please try again.');
              }
            }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>First name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Last name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your last name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Email *</label>
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
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Phone number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your phone number"
                    required
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
                    placeholder="Enter your location"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Type of service *</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => {
                      setFormData({...formData, serviceType: e.target.value, appointmentCount: ''});
                    }}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Select a service</option>
                    <option value="massage">Massage</option>
                    <option value="hair-makeup">Holiday Party Glam</option>
                    <option value="headshot">Headshots</option>
                    <option value="nails">Nail Care</option>
                    <option value="mindfulness">Mindfulness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Date of event *</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              {formData.serviceType && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Number of appointments *</label>
                  <select
                    value={formData.appointmentCount}
                    onChange={(e) => setFormData({...formData, appointmentCount: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
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
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#003756' }}>Custom number of appointments *</label>
                  <input
                    type="number"
                    placeholder="Enter custom number of appointments"
                    value={formData.customAppointmentCount}
                    onChange={(e) => setFormData({...formData, customAppointmentCount: e.target.value})}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
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

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericLandingPage;

