import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { GenericLandingPage as GenericLandingPageType } from '../types/genericLandingPage';
import { supabase } from '../lib/supabaseClient';
import { useProposal } from '../contexts/ProposalContext';
import { prepareProposalFromCalculation } from '../utils/proposalGenerator';
import ClientProposalBuilder from './ClientProposalBuilder';
import { Button } from './Button';

interface GenericLandingPageProps {
  genericLandingPageData?: GenericLandingPageType;
  isGeneric?: boolean;
}

const GenericLandingPage: React.FC<GenericLandingPageProps> = ({ isGeneric = false }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { createProposal } = useProposal();
  const [genericLandingPage, setGenericLandingPage] = useState<GenericLandingPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProposalPreview, setShowProposalPreview] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [showProposalBuilder, setShowProposalBuilder] = useState(false);
  
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
  const shortcutSectionRef = useRef<HTMLElement>(null);
  const [shortcutSectionInView, setShortcutSectionInView] = useState(false);
  const [commitmentLevel, setCommitmentLevel] = useState<'4plus' | '9plus'>('4plus');
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

      console.log('🔍 Raw data from database:', data);
      console.log('🔍 is_returning_client from database:', data.is_returning_client, typeof data.is_returning_client);
      console.log('🔍 Does is_returning_client exist in data?', 'is_returning_client' in data);
      console.log('🔍 All database columns:', Object.keys(data));

      // Explicitly handle is_returning_client - check if column exists
      let isReturningClientValue = false;
      if ('is_returning_client' in data) {
        // Column exists, use its value (handle null, undefined, false, true)
        isReturningClientValue = data.is_returning_client === true || data.is_returning_client === 1 || data.is_returning_client === 'true';
        console.log('✅ is_returning_client column exists, value:', isReturningClientValue, 'raw:', data.is_returning_client);
      } else {
        console.warn('⚠️ WARNING: is_returning_client column does NOT exist in database! Migration may not have been run.');
        console.warn('⚠️ Please run migration: 20260109190000_add_returning_client_field.sql');
        isReturningClientValue = false;
      }

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
        customUrl: data.custom_url,
        isReturningClient: isReturningClientValue
      };

      console.log('🔍 Transformed data isReturningClient:', transformedData.isReturningClient, typeof transformedData.isReturningClient);

      setGenericLandingPage(transformedData);
        } catch (error) {
          console.error('Error fetching generic landing page:', error);
        } finally {
          setLoading(false);
        }
      };

  useEffect(() => {
    if (id || isGeneric) {
      console.log('🔄 Fetching generic landing page, id:', id, 'location.search:', location.search);
      fetchGenericLandingPage();
    }
  }, [id, isGeneric, location.search]); // Added location.search to trigger refetch on URL changes

  // Update meta tags for social media previews
  useEffect(() => {
    if (genericLandingPage || isGeneric) {
      const partnerName = isGeneric ? 'Your Team' : (genericLandingPage?.data.partnerName || 'Your Company');
      const title = isGeneric ? 'Wellness Gifts from Shortcut' : `Wellness Gift from Shortcut - ${partnerName}`;
      const description = isGeneric
        ? 'Give your team a gift they\'ll love. From massages to hair & makeup, we bring wellness right to your office.'
        : `Give the ${partnerName} team a gift they'll love. From massages to hair & makeup, we bring wellness right to your office.`;
      const imageUrl = 'https://proposals.getshortcut.co/Holiday Proposal/PREVIEW LINK HOLIDAY PAGES.png'; // Note: Using existing asset path
      
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

  // Intersection Observer for ShortcutSection scroll-into-view animation
  useEffect(() => {
    // Always set to true after a short delay to ensure animations trigger
    // This prevents the issue where content disappears
    const fallbackTimer = setTimeout(() => {
      setShortcutSectionInView(true);
    }, 300);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Trigger when section is 25-35% visible (threshold 0.25-0.35)
          if (entry.intersectionRatio >= 0.25) {
            setShortcutSectionInView(true);
          }
        });
      },
      {
        threshold: [0.1, 0.25, 0.30, 0.35], // More thresholds to catch the range
        rootMargin: '0px',
      }
    );

    if (shortcutSectionRef.current) {
      observer.observe(shortcutSectionRef.current);
      
      // Check if already in view on mount (fallback) - use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (shortcutSectionRef.current) {
          const rect = shortcutSectionRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const elementTop = rect.top;
          const elementHeight = rect.height;
          const visibleHeight = Math.min(viewportHeight - elementTop, elementHeight);
          const visibleRatio = visibleHeight / elementHeight;
          
          if (visibleRatio >= 0.1) {
            setShortcutSectionInView(true);
          }
        }
      }, 100);
    }

    return () => {
      clearTimeout(fallbackTimer);
      if (shortcutSectionRef.current) {
        observer.unobserve(shortcutSectionRef.current);
      }
    };
  }, []);

  // Track current service index for arrow labels
  useEffect(() => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement | null;
    if (!scrollContainer) return;
    
    const onScroll = () => {
      const slideWidth = scrollContainer.clientWidth || 1;
      const scrollLeft = scrollContainer.scrollLeft;
      // Calculate index with a small threshold to handle rounding
      const index = Math.round(scrollLeft / slideWidth);
      const clampedIndex = Math.max(0, Math.min(index, serviceOrder.length - 1));
      setCurrentServiceIndex(clampedIndex);
    };
    
    // Use both scroll and scrollend events for better accuracy
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    scrollContainer.addEventListener('scrollend', onScroll, { passive: true });
    
    // Initial calculation
    onScroll();
    
    // Also listen for resize to recalculate
    const onResize = () => {
      setTimeout(onScroll, 100);
    };
    window.addEventListener('resize', onResize);
    
    return () => {
      scrollContainer.removeEventListener('scroll', onScroll as EventListener);
      scrollContainer.removeEventListener('scrollend', onScroll as EventListener);
      window.removeEventListener('resize', onResize);
    };
  }, [serviceOrder.length]);

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

  // Default values for when no generic landing page data is available
  const partnerName = isGeneric ? 'your' : (genericLandingPage?.data.partnerName || 'Your Company');
  const partnerLogoUrl = isGeneric ? null : genericLandingPage?.data.partnerLogoUrl;
  const isReturningClient = genericLandingPage?.isReturningClient || false;
  // const customMessage = genericLandingPage?.data.customMessage; // Available for future use
  
  // CRITICAL DEBUG LOGGING - This will show if the value is being read correctly
  useEffect(() => {
    console.log('🔍🔍🔍 GenericLandingPage Debug:', {
      genericLandingPage,
      isReturningClient,
      rawIsReturningClient: genericLandingPage?.isReturningClient,
      partnerName,
      'WILL_SHOW_RETURNING_CLIENT_UI': isReturningClient === true
    });
    
    // VERY VISIBLE ALERT-STYLE LOG
    if (isReturningClient) {
      console.log('%c✅✅✅ RETURNING CLIENT MODE IS ACTIVE ✅✅✅', 'background: #00ff00; color: #000; font-size: 20px; font-weight: bold; padding: 10px;');
      console.log('%cThe page should show "Welcome back" messaging and simplified form', 'background: #ffff00; color: #000; font-size: 14px; padding: 5px;');
    } else {
      console.log('%c❌❌❌ RETURNING CLIENT MODE IS NOT ACTIVE ❌❌❌', 'background: #ff0000; color: #fff; font-size: 20px; font-weight: bold; padding: 10px;');
      console.log('%cThe page will show standard new client messaging', 'background: #ffcccc; color: #000; font-size: 14px; padding: 5px;');
    }
  }, [genericLandingPage, isReturningClient, partnerName]);
  
  console.log('🔍🔍🔍 Generic Landing Page Data:', {
    hasGenericLandingPage: !!genericLandingPage,
    partnerName,
    partnerLogoUrl,
    isReturningClient,
    'genericLandingPage?.isReturningClient': genericLandingPage?.isReturningClient,
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
      { appointments: 1, eventTime: 0.5, pros: 1, price: 1250, name: 'Mindful Eating & Breathe Awareness', popular: true },
      { appointments: 1, eventTime: 0.5, pros: 1, price: 1250, name: 'Movement & Scan' },
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
      'hair-makeup': 'Hair & Beauty',
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

  // Get service image path
  const getServiceImagePath = (serviceId: string) => {
    const images = {
      'massage': '/QR Code Sign/Service Images/Massage.png',
      'hair-makeup': '/QR Code Sign/Service Images/Hair & Beauty.png',
      'headshot': '/QR Code Sign/Service Images/Headshots.png',
      'nails': '/QR Code Sign/Service Images/Nails.png',
      'mindfulness': '/QR Code Sign/Service Images/Mindfulness.png'
    };
    return images[serviceId as keyof typeof images] || '/QR Code Sign/Service Images/Massage.png';
  };

  // Get mindfulness service description
  const getMindfulnessDescription = (serviceName: string) => {
    const descriptions = {
      'Mindful Eating & Breathe Awareness': 'Slow down and reconnect through mindful eating and breath awareness. This 30-minute session uses the five senses to invite deeper presence and calm and bring ease to the daily rush.',
      'Movement & Scan': 'Release tension with gentle movement and a guided body scan. This 30-minute course awakens body awareness, eases stress, and restores balance.',
      'Speak & Listen': 'Learn mindfulness tools to step out of reactivity and more consciously respond. This 60-minute workshop introduces calming techniques to ease stress and deepen meaningful connection.'
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


  // Handle building proposal from calculator
  const handleBuildProposal = async () => {
    if (!currentPreset || !partnerName) {
      alert('Please select a package and ensure partner name is set');
      return;
    }

    try {
      setIsGeneratingProposal(true);

      // Map service IDs to proposal service types
      const serviceTypeMap: { [key: string]: string } = {
        'massage': 'massage',
        'hair-makeup': 'hair-makeup',
        'headshot': 'headshot',
        'nails': 'nails',
        'mindfulness': 'mindfulness'
      };

      const proposalServiceType = serviceTypeMap[selectedService] || 'massage';

      // Calculate pricing based on preset
      const basePrice = currentPreset.price;
      const discountPercent = isReturningClient ? 15 : 0;

      // Create service data structure for proposal
      const serviceData = {
        serviceType: proposalServiceType,
        totalHours: currentPreset.eventTime,
        numPros: currentPreset.pros,
        appTime: proposalServiceType === 'headshot' ? 20 : (proposalServiceType === 'mindfulness' ? 30 : 20),
        hourlyRate: proposalServiceType === 'headshot' ? 200 : (proposalServiceType === 'mindfulness' ? 0 : 135),
        proHourly: proposalServiceType === 'headshot' ? 100 : (proposalServiceType === 'mindfulness' ? 0 : 50),
        earlyArrival: proposalServiceType === 'mindfulness' ? 0 : 25,
        retouchingCost: proposalServiceType === 'headshot' ? 50 : 0,
        discountPercent: discountPercent,
        date: 'TBD',
        fixedPrice: proposalServiceType === 'mindfulness' ? basePrice : undefined
      };

      // Create client data structure
      const clientData = {
        name: partnerName,
        locations: ['Main Office'],
        events: {
          'Main Office': [{
            services: [serviceData]
          }]
        }
      };

      // Generate proposal data
      const proposalData = prepareProposalFromCalculation(clientData);
      
      // Add client email if available
      if (genericLandingPage?.data?.clientEmail) {
        proposalData.clientEmail = genericLandingPage.data.clientEmail;
      }

      // Add quarterly commitment metadata
      if (isReturningClient) {
        const basePriceForCommitment = proposalServiceType === 'mindfulness' ? basePrice : currentPreset.price;
        const discountAmount = basePriceForCommitment * (discountPercent / 100);
        (proposalData as any).quarterlyCommitment = {
          eventsCommitted: 4,
          discountPercent: 15,
          deadline: '2026-02-16',
          totalSavings: discountAmount * 4 // Assuming 4 events
        };
      }

      // Create proposal
      const customization = {
        includeSummary: true,
        includeCalculations: false,
        includeCalculator: false,
        customNote: isReturningClient
          ? `We're excited to continue our partnership with ${partnerName}! This quarterly commitment proposal includes a 15% discount for committing to 4+ events in 2026.`
          : `We are so excited to service the incredible staff at ${partnerName}! Our team is looking forward to providing an exceptional experience for everyone involved.`
      };

      const proposalId = await createProposal(
        proposalData,
        customization,
        genericLandingPage?.data?.clientEmail
      );

      // Navigate to proposal
      navigate(`/proposal/${proposalId}`);
    } catch (error) {
      console.error('Error building proposal:', error);
      alert(error instanceof Error ? error.message : 'Failed to build proposal. Please try again.');
    } finally {
      setIsGeneratingProposal(false);
      setShowProposalPreview(false);
    }
  };

  // Calculate proposal preview data
  const getProposalPreviewData = () => {
    if (!currentPreset) return null;

    const basePrice = currentPreset.price;
    const discountPercent = isReturningClient ? 15 : 0;
    const discountAmount = basePrice * (discountPercent / 100);
    const finalPrice = basePrice - discountAmount;
    const quarterlySavings = discountAmount * 4; // 4 events

    return {
      serviceName: getServiceName(selectedService),
      appointments: currentPreset.appointments,
      eventTime: currentPreset.eventTime,
      pros: currentPreset.pros,
      basePrice,
      discountPercent,
      discountAmount,
      finalPrice: finalPrice, // Used in preview modal
      quarterlySavings
    };
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
    
    const slideWidth = scrollContainer.clientWidth;
    const nextIndex = (currentServiceIndex + 1) % serviceOrder.length;
    
    scrollContainer.scrollTo({
      left: nextIndex * slideWidth,
      behavior: 'smooth'
    });
    
    // Update index immediately for arrow labels
    setCurrentServiceIndex(nextIndex);
  };

  const scrollToPrevService = () => {
    const scrollContainer = document.querySelector('.services-scroll') as HTMLElement;
    if (!scrollContainer) return;
    
    const slideWidth = scrollContainer.clientWidth;
    const prevIndex = currentServiceIndex > 0 ? currentServiceIndex - 1 : serviceOrder.length - 1;
    
    scrollContainer.scrollTo({
      left: prevIndex * slideWidth,
      behavior: 'smooth'
    });
    
    // Update index immediately for arrow labels
    setCurrentServiceIndex(prevIndex);
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
          filter: brightness(0) saturate(100%) invert(27%) sepia(100%) saturate(2000%) hue-rotate(200deg) brightness(0.3) contrast(1.2);
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
          {/* Partner Logo - Left Side (always visible) */}
          <div className="flex items-center flex-shrink-0">
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
          <nav className="hidden lg:flex flex-1 items-center justify-center text-sm font-bold">
            <a
              href="#services"
              className="duration-300 text-opacity-60 px-5 py-3 flex items-center gap-2 cursor-pointer relative rounded-full hover:text-[#003C5E] hover:bg-gray-50"
            >
              Services
            </a>
            <a
              href="#pricing-section"
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

      {/* HERO - Apple/Airbnb Style */}
      <section id="top" className="relative overflow-hidden rounded-b-3xl" style={{ backgroundColor: '#F0F0FF', minHeight: '100vh', paddingTop: 0 }}>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="mx-auto max-w-5xl px-4 md:px-6 py-16 md:py-20 lg:py-32 text-center">

            {/* Animated Icons Stack - Simplified fade transition */}
            <div className="mb-8 md:mb-12 flex justify-center items-center relative mx-auto" style={{ height: '96px', width: '96px' }}>
              {[
                '/Generic Landing Page/Icons/Group 633170.png',
                '/Generic Landing Page/Icons/Group 633171.png',
                '/Generic Landing Page/Icons/Group 633182.png',
                '/Generic Landing Page/Icons/Group 633183.png',
                '/Generic Landing Page/Icons/Group 633184.png'
              ].map((icon, index) => (
                <div
                  key={index}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    animation: `iconFade 20s ease-out infinite`,
                    animationDelay: `${index * 4}s`,
                    opacity: 0
                  }}
                >
                  <img
                    src={icon}
                    alt=""
                    className="w-24 h-24 md:w-32 md:h-32 object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Headline */}
            <h1
              className="text-3xl md:text-6xl lg:text-7xl font-semibold mb-4 md:mb-6 lg:mb-8 max-w-4xl mx-auto px-2"
              style={{
                color: '#003756',
                letterSpacing: '-0.02em',
                lineHeight: '1.2'
              }}
            >
              {isReturningClient ? (
                <>
                  To our friends at {partnerName}, let's keep the feel-good moments rolling in 2026.
                </>
              ) : (
                'Wellness that actually works for your team'
              )}
            </h1>

            {/* Subheadline */}
            <p className="text-sm md:text-xl lg:text-2xl font-normal mb-6 md:mb-12 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto px-6" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.7', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              {isReturningClient ? (
                'As a thank-you for a great 2025, partners who commit to at least four events in 2026 unlock Premier Partner status — including priority scheduling and 15% off all services.'
              ) : (
                'We bring the spa, salon, and studio directly to your office. No scheduling headaches, no employee complaints—just wellness that your team actually wants.'
              )}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 md:mb-20 max-w-md sm:max-w-none mx-auto">
              <button
                onClick={() => setShowProposalBuilder(true)}
                className="px-8 py-4 md:px-10 md:py-5 rounded-full text-base md:text-lg font-medium transition-all duration-300 hover:scale-105 w-full sm:w-auto min-h-[48px]"
                style={{ backgroundColor: '#FF5050', color: 'white', boxShadow: '0 10px 40px rgba(255, 80, 80, 0.2)' }}
              >
                {isReturningClient ? 'Build My 2026 Proposal' : 'Get in touch'}
              </button>

              {!isReturningClient && (
                <button
                  onClick={() => smoothScrollTo('services')}
                  className="px-8 py-4 md:px-10 md:py-5 rounded-full text-base md:text-lg font-medium transition-all duration-300 hover:scale-105 w-full sm:w-auto min-h-[48px]"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#003756',
                    border: '2px solid #003756'
                  }}
                >
                  Explore Services
                </button>
              )}
            </div>

            {/* Client Logos Section */}
            <div className="pt-12 md:pt-16">
              <p className="text-sm font-semibold uppercase tracking-wider mb-12" style={{ color: '#003756', opacity: 0.6 }}>
                Trusted by Top Employers
              </p>

              {/* Logo Scroller */}
              <div className="overflow-hidden py-8 -mx-6">
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
        </div>

        {/* Animation Styles - Simplified Apple-style fade */}
        <style>{`
          @keyframes iconFade {
            0% {
              opacity: 0;
              transform: scale(0.95);
            }
            5% {
              opacity: 1;
              transform: scale(1);
            }
            20% {
              opacity: 1;
              transform: scale(1);
            }
            25% {
              opacity: 0;
              transform: scale(0.95);
            }
            100% {
              opacity: 0;
              transform: scale(0.95);
            }
          }
        `}</style>
      </section>

      {/* WAYS TO SAVE SECTION - Apple/Airbnb Style */}
      {isReturningClient && (
        <section id="pricing-section" className="fade-in-section py-20 md:py-32" style={{ backgroundColor: 'white' }}>
          <div className="mx-auto max-w-6xl px-6">
            {/* Header */}
            <div className="text-center mb-12 md:mb-16">
              {!isGeneric && (
                <h3 className="text-lg md:text-xl mb-4" style={{ color: '#003756', opacity: 0.6, fontWeight: 400 }}>
                  A special thank you for our friends at {partnerName}
                </h3>
              )}
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-4 md:mb-6" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                Ways to Save
              </h2>
              <p className="text-base md:text-xl lg:text-2xl font-normal max-w-2xl mx-auto mb-6 md:mb-8" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.5' }}>
                Lock in 4+ events and unlock Premier Partner benefits with priority booking and guaranteed availability
              </p>

              {/* Deadline Timer */}
              {(() => {
                const deadline = new Date('2026-02-16T23:59:59');
                const now = new Date();
                const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isPastDeadline = daysUntil < 0;

                return !isPastDeadline ? (
                  <div className="inline-flex items-center gap-3 md:gap-4 px-6 py-3 md:px-8 md:py-4 rounded-full" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                    <span className="text-xl md:text-2xl">⏰</span>
                    <div className="text-left">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#92400E', opacity: 0.8 }}>
                        Commitment Deadline
                      </p>
                      <p className="text-xl md:text-2xl font-semibold" style={{ color: '#92400E' }}>
                        {daysUntil} {daysUntil === 1 ? 'Day' : 'Days'} Left
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-base md:text-lg font-semibold" style={{ color: '#DC2626' }}>
                    Deadline Passed - Contact Us for Availability
                  </p>
                );
              })()}
            </div>

            {/* Commitment Level Selector */}
            <div className="flex justify-center gap-3 mb-16">
              <button
                onClick={() => setCommitmentLevel('4plus')}
                className="px-8 py-4 rounded-full text-base font-medium transition-all duration-300"
                style={{
                  backgroundColor: commitmentLevel === '4plus' ? '#003756' : '#E0F2F7',
                  color: commitmentLevel === '4plus' ? 'white' : '#003756'
                }}
              >
                4+ Events • Save 15%
              </button>
              <button
                onClick={() => setCommitmentLevel('9plus')}
                className="px-8 py-4 rounded-full text-base font-medium transition-all duration-300"
                style={{
                  backgroundColor: commitmentLevel === '9plus' ? '#003756' : '#E0F2F7',
                  color: commitmentLevel === '9plus' ? 'white' : '#003756'
                }}
              >
                9+ Events • Save 20%
              </button>
            </div>

            {/* Savings Cards Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto" style={{
              justifyItems: commitmentLevel === '4plus' ? 'center' : 'stretch'
            }}>
              {/* Single Event */}
              <div
                className="relative overflow-hidden rounded-3xl transition-all duration-700 ease-out hover:-translate-y-2"
                style={{
                  backgroundColor: '#F8F9FA',
                  border: '1px solid rgba(0, 55, 86, 0.1)',
                  width: '100%',
                  maxWidth: commitmentLevel === '4plus' ? '400px' : '100%'
                }}
              >
                <div className="p-8 md:p-10">
                  <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#003756', opacity: 0.6 }}>
                      Single
                    </p>
                    <h3 className="text-4xl md:text-5xl font-semibold mb-3" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                      Pay as you go
                    </h3>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold" style={{ color: '#003756' }}>$0</span>
                      <span className="text-lg" style={{ color: '#003756', opacity: 0.6 }}>saved</span>
                    </div>
                    <p className="text-base" style={{ color: '#003756', opacity: 0.8, lineHeight: '1.6' }}>
                      Standard pricing per event
                    </p>
                  </div>
                  <div className="pt-6 border-t" style={{ borderColor: 'rgba(0, 55, 86, 0.15)' }}>
                    <p className="text-base font-medium" style={{ color: '#003756', opacity: 0.7 }}>
                      Flexibility • No commitment
                    </p>
                  </div>
                </div>
              </div>

              {/* Quarterly - 4+ Events - Always visible */}
              <div
                className="relative overflow-hidden rounded-3xl transition-all duration-700 ease-out hover:-translate-y-2"
                style={{
                  backgroundColor: '#E0F2F7',
                  border: '2px solid #9EFAFF',
                  width: '100%',
                  maxWidth: commitmentLevel === '4plus' ? '400px' : '100%'
                }}
              >
                <div className="absolute top-6 right-6">
                  <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: '#9EFAFF', color: '#003756' }}>
                    Premier
                  </div>
                </div>
                <div className="p-8 md:p-10">
                  <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#003756', opacity: 0.6 }}>
                      Quarterly
                    </p>
                    <h3 className="text-4xl md:text-5xl font-semibold mb-3" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                      15% off
                    </h3>
                  </div>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base uppercase tracking-wider font-semibold" style={{ color: '#003756', opacity: 0.6 }}>
                        4+ Events
                      </span>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-4 mt-6">
                      <div className="flex items-start gap-3">
                        <span style={{ color: '#003756', fontSize: '1.25rem', fontWeight: 'bold', marginTop: '2px' }}>✓</span>
                        <p className="text-base" style={{ color: '#003756', opacity: 0.9, lineHeight: '1.6' }}>
                          Priority scheduling: First choice on event dates
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span style={{ color: '#003756', fontSize: '1.25rem', fontWeight: 'bold', marginTop: '2px' }}>✓</span>
                        <p className="text-base" style={{ color: '#003756', opacity: 0.9, lineHeight: '1.6' }}>
                          Additional discount: 15% off Headshot and Mindfulness experiences ✨
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span style={{ color: '#003756', fontSize: '1.25rem', fontWeight: 'bold', marginTop: '2px' }}>✓</span>
                        <p className="text-base" style={{ color: '#003756', opacity: 0.9, lineHeight: '1.6' }}>
                          Switch it up: Rotate different services throughout the year
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise - 9+ Events - Slides in elegantly when 9+ tab is active */}
              <div
                className="relative overflow-hidden rounded-3xl transition-all duration-700 ease-out hover:-translate-y-2"
                style={{
                  backgroundColor: '#003756',
                  border: '2px solid #FF5050',
                  opacity: commitmentLevel === '9plus' ? 1 : 0,
                  transform: commitmentLevel === '9plus' ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.9)',
                  pointerEvents: commitmentLevel === '9plus' ? 'auto' : 'none',
                  width: '100%'
                }}
              >
                <div className="absolute top-6 right-6">
                  <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: '#FF5050', color: 'white' }}>
                    Best Value
                  </div>
                </div>
                <div className="p-8 md:p-10">
                  <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'white', opacity: 0.7 }}>
                      Enterprise
                    </p>
                    <h3 className="text-4xl md:text-5xl font-semibold mb-3" style={{ color: 'white', letterSpacing: '-0.02em' }}>
                      20% off
                    </h3>
                  </div>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base uppercase tracking-wider font-semibold text-white" style={{ opacity: 0.6 }}>
                        9+ Events
                      </span>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-4 mt-6">
                      <div className="flex items-start gap-3">
                        <span style={{ color: '#FF5050', fontSize: '1.25rem', marginTop: '2px' }}>✓</span>
                        <p className="text-base text-white" style={{ opacity: 0.95, lineHeight: '1.6' }}>
                          Priority scheduling: First choice on event dates
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span style={{ color: '#FF5050', fontSize: '1.25rem', marginTop: '2px' }}>✓</span>
                        <p className="text-base text-white" style={{ opacity: 0.95, lineHeight: '1.6' }}>
                          Additional discount: 15% off Headshot and Mindfulness experiences ✨
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span style={{ color: '#FF5050', fontSize: '1.25rem', marginTop: '2px' }}>✓</span>
                        <p className="text-base text-white" style={{ opacity: 0.95, lineHeight: '1.6' }}>
                          Switch it up: Rotate different services throughout the year
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span style={{ color: '#FEDC64', fontSize: '1.25rem', marginTop: '2px' }}>✓</span>
                        <p className="text-base font-semibold text-white" style={{ lineHeight: '1.6' }}>
                          1 free event included
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-16">
              <button
                onClick={() => setShowProposalBuilder(true)}
                className="px-10 py-5 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
                style={{ backgroundColor: '#FF5050', color: 'white', boxShadow: '0 10px 40px rgba(255, 80, 80, 0.2)' }}
              >
                Build My 2026 Proposal
              </button>
              <p className="mt-6 text-sm" style={{ color: '#003756', opacity: 0.5 }}>
                Commit by February 16, 2026 to secure your quarterly program
              </p>
            </div>
          </div>
        </section>
      )}

      {/* PROMOTIONAL SECTION - For Non-Returning Clients */}
      {!isReturningClient && (
        <section id="pricing-section" className="fade-in-section promotion-section py-14 md:py-20 rounded-3xl" style={{ backgroundColor: '#003756' }}>
          <div className="mx-auto max-w-7xl px-4">
            {/* Header Text */}
            <div className="text-center mb-12 md:mb-16">
              {!isGeneric && (
                <h3 className="text-lg md:text-xl mb-4" style={{ color: '#FFFFFF', fontWeight: 400 }}>
                  A special gift for our friends at {partnerName}
                </h3>
              )}
              <h2 className="h1 mb-6 md:mb-8" style={{ color: '#FFFFFF' }}>
                Book your first event for 2026 and save
              </h2>
              <p className="text-base lg:text-lg font-medium mb-4 max-w-3xl mx-auto" style={{ color: '#FFFFFF', lineHeight: '1.1', letterSpacing: '-0.01em' }}>
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
      )}


      {/* SERVICES SECTION - Apple/Airbnb Style */}
      <section id="services" className="fade-in-section py-20 md:py-32 rounded-3xl overflow-hidden relative" style={{ backgroundColor: '#E0F2F7' }}>
        {/* Mobile swipe indicator */}
        <div className="md:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#003756', opacity: 0.7 }}>
              Swipe to explore
            </span>
            <svg className="w-4 h-4" style={{ color: '#003756', opacity: 0.7 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        {/* Service Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 md:mb-16 px-4 md:px-6">
          <button
            onClick={() => scrollToService(0)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#9EFAFF',
              color: '#003756'
            }}
          >
            Massage
          </button>
          <button
            onClick={() => scrollToService(1)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#FEDC64',
              color: '#003756'
            }}
          >
            Glam
          </button>
          <button
            onClick={() => scrollToService(2)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#9EFAFF',
              color: '#003756'
            }}
          >
            Headshots
          </button>
          <button
            onClick={() => scrollToService(3)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#F9CDFF',
              color: '#003756'
            }}
          >
            Nails
          </button>
          <button
            onClick={() => scrollToService(4)}
            className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
            style={{
              backgroundColor: '#FEDC64',
              color: '#003756'
            }}
          >
            Mindfulness
          </button>
        </div>
        
        <div className="flex overflow-x-auto scrollbar-hide services-scroll">
          {/* RESET ZONE SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-6 py-12 md:py-16">
              <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                {/* Left Side - Text and Service Options */}
                <div>
                  <h2 className="text-3xl md:text-5xl font-semibold mb-4 md:mb-6" style={{ color: '#003756', letterSpacing: '-0.02em' }}>Reset Zone</h2>
                  <p className="text-base md:text-lg font-medium mb-6 md:mb-8" style={{ color: '#003756', opacity: 0.6 }}>Relaxing Chair or Table Massages</p>

                  <p className="text-base md:text-xl mb-8 md:mb-12" style={{ color: '#003756', opacity: 0.8, lineHeight: '1.6' }}>
                    Treat your team to rejuvenating chair or table massage sessions right in the workplace. Our expert therapists create a luxurious spa-like ambiance with soothing scents, customized lighting and relaxing sounds.
                  </p>

                  {/* Service Options */}
                  <div className="space-y-6">
                    {/* First Row: Sports Massage and Compression */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Massage/icon.svg" alt="Sports Massage" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-semibold" style={{ color: '#003756' }}>Sports Massage</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src="/Holiday Proposal/Our Services/Massage/icon-2.svg" alt="Compression" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                        <span className="text-base font-semibold" style={{ color: '#003756' }}>Compression Massage</span>
                      </div>
                    </div>

                    {/* Second Row: Express Facial */}
                    <div className="flex items-center gap-3">
                      <img src="/Holiday Proposal/Our Services/Massage/icon-1.svg" alt="Express Facial" className="w-12 h-12 flex-shrink-0" loading="lazy" />
                      <span className="text-base font-semibold" style={{ color: '#003756' }}>Express Facial</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Massage Image */}
                <div className="relative flex justify-center">
                  <picture>
                    <source srcSet="/Holiday Proposal/Our Services/Massage/masssage 2x.webp" type="image/webp" />
                    <img
                      src="/Holiday Proposal/Our Services/Massage/masssage 2x.png"
                      alt="Professional Massage Service"
                      className="w-full h-auto rounded-3xl max-w-md"
                      loading="lazy"
                    />
                  </picture>
                </div>
              </div>
            </div>
          </div>

          {/* HAIR & MAKEUP SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-6 py-12 md:py-16">
              <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="text-3xl md:text-5xl font-semibold mb-4 md:mb-6" style={{ color: '#003756', letterSpacing: '-0.02em' }}>Hair & Makeup</h2>
                  <p className="text-lg font-medium mb-8" style={{ color: '#003756', opacity: 0.6 }}>Expert makeup, styling and barber services</p>

                  <p className="text-lg md:text-xl mb-12" style={{ color: '#003756', opacity: 0.8, lineHeight: '1.6' }}>
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
                </div>
                
                {/* Right Side - Hair & Makeup Image */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Holiday Party Glam/Glam 2x.webp" 
                    alt="Hair & Makeup Styling" 
                    className="w-full h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* YEAR END HEADSHOTS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-8 md:py-12">
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
                    {!isReturningClient && (
                      <Button onClick={() => setShowContactForm(true)} variant="primary" size="lg">
                        Get in touch
                      </Button>
                    )}
                    <Button
                      onClick={() => smoothScrollTo('pricing')}
                      variant={isReturningClient ? "primary" : "secondary"}
                      size="lg"
                    >
                      {isReturningClient ? 'Build my 2026 Schedule' : 'Pricing'}
                    </Button>
                  </div>
                </div>
                
                {/* Right Side - Headshots Image */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Headshots/Headshots 2x.webp" 
                    alt="Professional Headshot Session" 
                    className="w-full h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NAILS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-8 md:py-12">
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
                </div>
                
                {/* Right Side - Nails Image */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Nails/Nails 2x.webp" 
                    alt="Professional Nail Services" 
                    className="w-full h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEASONAL MINDFULNESS SERVICE */}
          <div className="w-full flex-shrink-0 service-slide">
            <div className="mx-auto container-narrow px-4 py-8 md:py-12">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text and Feature Options */}
                <div>
                  <h2 className="h1 mb-4" style={{ color: '#003756' }}>Mindfulness</h2>
                  <h3 className="section-subtitle mb-6" style={{ color: '#003756' }}>Soothing meditation and stress relief</h3>
                  
                  <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: '#003756' }}>
                    In just one initial course your team will learn the fundamentals, experience guided meditations and gain practical tools to reduce stress and enhance focus.
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
                </div>
                
                {/* Right Side - Courtney Frame */}
                <div className="relative flex justify-center">
                  <img 
                    src="/Holiday Proposal/Our Services/Mindfulness/Courtney Frame 2x.webp" 
                    alt="Courtney Schulnick - Mindfulness Leader" 
                    className="w-full h-auto rounded-2xl max-w-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Packages Section - Integrated Below Services */}
      </section>

      {/* CHOOSE YOUR PACKAGE SECTION - Apple/Airbnb Style */}
      {(!genericLandingPage || genericLandingPage.customization.includePricingCalculator) && (
        <section id="pricing" className="fade-in-section py-20 md:py-32 rounded-3xl" style={{ backgroundColor: 'white' }}>
          <div className="mx-auto max-w-6xl px-6">
            {/* Section Header */}
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-4xl md:text-6xl font-semibold mb-6 md:mb-8" style={{ color: '#003756', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
                Choose Your Perfect Package
              </h2>
              <p className="text-base md:text-xl lg:text-2xl max-w-3xl mx-auto" style={{ color: '#003756', opacity: 0.7, lineHeight: '1.6' }}>
                Select the {getServiceName(serviceOrder[currentServiceIndex]).toLowerCase()} package that fits your team's needs. All packages include premium service and professional setup.
              </p>
            </div>

            {/* Service Selector Tabs */}
            <div className="mb-12 md:mb-16">
              <div className="flex flex-wrap justify-center gap-3">
                {serviceOrder.map((service, index) => {
                  const isActive = currentServiceIndex === index;
                  const serviceColor = getServiceColor(service);
                  return (
                    <button
                      key={service}
                      onClick={() => setCurrentServiceIndex(index)}
                      className="px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 min-h-[44px]"
                      style={{
                        backgroundColor: isActive ? serviceColor : 'transparent',
                        color: isActive ? '#003756' : '#003756',
                        border: `2px solid ${serviceColor}`
                      }}
                    >
                      {getServiceName(service)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Package Selection */}
            <div className="mb-12 md:mb-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {SERVICE_PRESETS[serviceOrder[currentServiceIndex] as keyof typeof SERVICE_PRESETS]?.map((preset, index) => {
                  const currentService = serviceOrder[currentServiceIndex];
                  const serviceColor = getServiceColor(currentService);
                  const isSelected = selectedService === currentService && selectedPackageIndex === index;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedService(currentService);
                        setSelectedPackageIndex(index);
                        setPricingConfig((prev: any) => ({ ...prev, totalAppointments: preset.appointments }));
                      }}
                      className="relative p-6 md:p-8 lg:p-10 rounded-3xl text-center transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                      style={{
                        backgroundColor: isSelected ? serviceColor : '#F8F9FA',
                        border: isSelected ? `2px solid ${serviceColor}` : '1px solid rgba(0, 55, 86, 0.1)'
                      }}
                    >
                      {/* Package Title */}
                      <div className="mb-6">
                        {(preset as any).popular && (
                          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4" style={{ backgroundColor: '#FF5050', color: 'white' }}>
                            Most Popular
                          </div>
                        )}
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                          {(preset as any).name || `${preset.appointments} Appointments`}
                        </h3>
                      </div>

                      {/* Package Details */}
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xl">⏱️</span>
                          <span className="text-base font-medium" style={{ color: '#003756', opacity: 0.9 }}>{preset.eventTime} {preset.eventTime === 1 ? 'hour' : 'hours'}</span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xl">👥</span>
                          <span className="text-base font-medium" style={{ color: '#003756', opacity: 0.9 }}>{preset.pros} {getServiceName(currentService).toLowerCase()} {preset.pros === 1 ? 'pro' : 'pros'}</span>
                        </div>

                        {/* Mindfulness Service Descriptions */}
                        {currentService === 'mindfulness' && (preset as any).name && (
                          <div className="mt-6 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                            <p className="text-sm text-center" style={{ color: '#003756', opacity: 0.9, lineHeight: '1.6' }}>
                              {getMindfulnessDescription((preset as any).name)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Price Section */}
                      <div className="pt-6 border-t" style={{ borderColor: 'rgba(0, 55, 86, 0.15)' }}>
                        <div className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-2" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                          {(preset as any).custom ? 'Custom' : `$${preset.price.toLocaleString()}`}
                        </div>
                        <p className="text-sm font-medium" style={{ color: '#003756', opacity: 0.6 }}>
                          {(preset as any).custom ? 'Contact for pricing' : 'per session'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* What's Included Section */}
            <div className="mb-12 md:mb-16 p-6 md:p-10 lg:p-12 rounded-3xl" style={{ backgroundColor: '#F8F9FA' }}>
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-8 md:mb-10 text-center" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
                What's Included
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {getWhatsIncluded(serviceOrder[currentServiceIndex]).map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: getServiceColor(serviceOrder[currentServiceIndex]) }}>
                      <span className="text-sm font-bold" style={{ color: '#003756' }}>✓</span>
                    </div>
                    <span className="text-base" style={{ color: '#003756', opacity: 0.9, lineHeight: '1.6' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Build Your Proposal Button */}
            <div className="text-center">
              <button
                onClick={() => setShowProposalBuilder(true)}
                className="px-8 py-4 md:px-10 md:py-5 rounded-full text-base md:text-lg font-medium transition-all duration-300 hover:scale-105 min-h-[48px]"
                style={{ backgroundColor: '#FF5050', color: 'white', boxShadow: '0 10px 40px rgba(255, 80, 80, 0.2)' }}
              >
                Build Your Proposal
              </button>
              <p className="text-base mt-6 font-medium" style={{ color: '#003756', opacity: 0.5 }}>
                Free consultation • No commitment required
              </p>
            </div>
          </div>
        </section>
      )}

      {/* HIGH PERFORMANCE STARTS HERE - Apple/Airbnb Style */}
      <section
        ref={shortcutSectionRef}
        className={`fade-in-section py-20 md:py-32 ${shortcutSectionInView ? 'shortcut-section-in-view' : ''}`}
        style={{ backgroundColor: '#F8F9FA' }}
      >
        <style>{`
          .shortcut-section-card {
            position: relative;
            border-radius: 24px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          .shortcut-section-card:hover {
            transform: scale(1.02);
          }
          .shortcut-section-card:active {
            transform: scale(0.98);
          }
          .shortcut-checklist-container {
            position: relative;
            height: 315px;
            overflow: hidden;
          }
          .shortcut-checklist-scroll {
            position: relative;
            z-index: 1;
            animation: scrollChecklist 22s linear infinite;
            will-change: transform;
          }
          @keyframes scrollChecklist {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(calc(-50% - 26px));
            }
          }
          .shortcut-checklist-mask {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 2;
            background: linear-gradient(to bottom,
              rgba(252, 242, 254, 1) 0%,
              rgba(252, 242, 254, 0) 8%,
              rgba(252, 242, 254, 0) 92%,
              rgba(252, 242, 254, 1) 100%);
          }
          .shortcut-checklist-container[data-card="calm"] .shortcut-checklist-mask {
            background: linear-gradient(to bottom,
              rgba(229, 252, 254, 1) 0%,
              rgba(229, 252, 254, 0) 8%,
              rgba(229, 252, 254, 0) 92%,
              rgba(229, 252, 254, 1) 100%);
          }
          .shortcut-checkbox {
            width: 33px;
            height: 33px;
            border-radius: 17px;
            border: 2px solid;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .shortcut-check-icon {
            width: 15px;
            height: 10px;
          }
          .shortcut-plus-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .shortcut-plus-icon svg {
            width: 100%;
            height: 100%;
          }
          .shortcut-checklist-item {
            opacity: 0;
            transform: translateY(8px);
            transition: none;
          }
          /* Animate bullets when section comes into view */
          .shortcut-section-in-view .shortcut-checklist-item {
            animation: fadeInBullet 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(1) { 
            animation-delay: 0s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(2) { 
            animation-delay: 0.175s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(3) { 
            animation-delay: 0.35s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(4) { 
            animation-delay: 0.525s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(5) { 
            animation-delay: 0.7s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(6) { 
            animation-delay: 0s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(7) { 
            animation-delay: 0.175s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(8) { 
            animation-delay: 0.35s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(9) { 
            animation-delay: 0.525s; 
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(10) { 
            animation-delay: 0.7s; 
          }
          @keyframes fadeInBullet {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 0.95;
              transform: translateY(0);
            }
          }
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(1),
          .shortcut-section-in-view .shortcut-checklist-item:nth-child(6) {
            animation-name: fadeInBulletStrong;
          }
          @keyframes fadeInBulletStrong {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-semibold mb-6 md:mb-8"
              style={{ color: '#003756', letterSpacing: '-0.02em', lineHeight: '1.15' }}
            >
              Slack. Zoom. <span style={{ color: '#FF5050' }}>Shortcut</span>.<br />
              One of these helps your team relax.
            </h2>
            <p
              className="text-base md:text-xl lg:text-2xl max-w-3xl mx-auto"
              style={{ color: '#003756', opacity: 0.7, lineHeight: '1.6' }}
            >
              Real moments of calm at work — felt by employees, effortless for employers.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1 - Reset at work */}
            <div 
              className="shortcut-section-card"
              style={{
                backgroundColor: '#fcf2fe',
                border: '1px solid rgba(0, 31, 31, 0.08)',
              }}
            >
              <div className="border border-solid rounded-[24px] pb-0" style={{ borderColor: 'rgba(0, 31, 31, 0.08)' }}>
                {/* Title and icon */}
                <div className="relative px-8 pt-[52px] pb-6">
                  <h3 
                    className="text-[37px] leading-[43px] tracking-[-0.95px] m-0 font-medium"
                    style={{ color: '#001f1f' }}
                  >
                    Reset at work
                  </h3>
                  
                  {/* Plus icon button */}
                  <button
                    className="absolute right-8 top-8 flex items-center justify-center rounded-[20px]"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#e063c7',
                    }}
                    aria-label="Expand Reset at work"
                  >
                    <div className="shortcut-plus-icon">
                      <svg fill="none" viewBox="0 0 19.7345 19.7345">
                        <path d="M 9.86725 4.11175 L 9.86725 15.6228" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                        <path d="M 4.11175 9.86725 L 15.6228 9.86725" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                      </svg>
                    </div>
                  </button>
                </div>

                {/* Checklist items with scroll */}
                <div className="shortcut-checklist-container px-8 pb-6" data-card="reset">
                  <div className="shortcut-checklist-mask"></div>
                  <div className="shortcut-checklist-scroll">
                    <div className="space-y-[52px]">
                      {[
                        { text: 'Chair & table massage', boldText: 'massage' },
                        { text: 'Office grooming & self-care', boldText: 'self-care' },
                        { text: 'Headshots & confidence boosts', boldText: 'confidence boosts' },
                        { text: 'Pop-up wellness experiences', boldText: 'wellness' },
                        { text: 'On-site, zero planning required', boldText: 'zero planning' },
                      ].concat([
                        { text: 'Chair & table massage', boldText: 'massage' },
                        { text: 'Office grooming & self-care', boldText: 'self-care' },
                        { text: 'Headshots & confidence boosts', boldText: 'confidence boosts' },
                        { text: 'Pop-up wellness experiences', boldText: 'wellness' },
                        { text: 'On-site, zero planning required', boldText: 'zero planning' },
                      ]).map((item, idx) => (
                        <div key={idx} className="shortcut-checklist-item flex items-center gap-[11px]">
                          <div
                            className="shortcut-checkbox"
                            style={{
                              backgroundColor: '#fde5ff',
                              borderColor: 'rgba(224, 99, 199, 0.36)',
                            }}
                          >
                            <div className="shortcut-check-icon">
                              <svg fill="none" viewBox="0 0 14.3715 9.7279">
                                <path d="M 1.215 4.8045 L 5.06625 8.5125 L 13.15675 1.215" stroke="#b8337a" strokeLinecap="square" strokeWidth="2.43" />
                              </svg>
                            </div>
                          </div>
                          <p
                            className="m-0 text-[27px] leading-[36px] font-medium"
                            style={{ color: '#b8337a' }}
                          >
                            {item.boldText ? (
                              <>
                                {item.text.split(item.boldText).map((part, i) => (
                                  <span key={i}>
                                    {part}
                                    {i < item.text.split(item.boldText).length - 1 && (
                                      <strong className="font-bold">{item.boldText}</strong>
                                    )}
                                  </span>
                                ))}
                              </>
                            ) : (
                              item.text
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="px-8 pb-8">
                  <p
                    className="m-0 text-[19px] leading-[26px] font-normal opacity-64"
                    style={{ color: '#b8337a' }}
                  >
                    Physical, on-site wellness experiences that help your team recharge and refocus.
                  </p>
                </div>
              </div>

              {/* CTA strip */}
              <button
                onClick={() => smoothScrollTo('services')}
                className="w-full rounded-b-[24px] border-t-0 border-r border-b border-l border-solid flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                style={{
                  height: '82px',
                  backgroundColor: '#fab8ff',
                  borderColor: 'rgba(0, 31, 31, 0.08)',
                }}
              >
                <p
                  className="m-0 text-[18px] leading-[26px] font-medium text-center"
                  style={{ color: '#b8337a' }}
                >
                  See Services →
                </p>
              </button>
            </div>

            {/* Card 2 - Calm, delivered */}
            <div
              className="shortcut-section-card"
              style={{
                backgroundColor: '#E5FCFE',
                border: '1px solid rgba(0, 31, 31, 0.08)',
              }}
            >
              <div className="border border-solid rounded-[24px] pb-0" style={{ borderColor: 'rgba(0, 31, 31, 0.08)' }}>
                {/* Title and icon */}
                <div className="relative px-8 pt-[52px] pb-6">
                  <h3
                    className="text-[37px] leading-[43px] tracking-[-0.95px] m-0 font-medium"
                    style={{ color: '#001f1f' }}
                  >
                    Calm, delivered
                  </h3>

                  {/* Plus icon button */}
                  <button
                    className="absolute right-8 top-8 flex items-center justify-center rounded-[20px]"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#018EA2',
                    }}
                    aria-label="Expand Calm, delivered"
                  >
                    <div className="shortcut-plus-icon">
                      <svg fill="none" viewBox="0 0 19.7345 19.7345">
                        <path d="M 9.86725 4.11175 L 9.86725 15.6228" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                        <path d="M 4.11175 9.86725 L 15.6228 9.86725" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.28917" />
                      </svg>
                    </div>
                  </button>
                </div>

                {/* Checklist items with scroll */}
                <div className="shortcut-checklist-container px-8 pb-6" data-card="calm">
                  <div className="shortcut-checklist-mask"></div>
                  <div className="shortcut-checklist-scroll">
                    <div className="space-y-[52px]">
                      {[
                        { text: 'One vendor, multiple services', boldText: 'One vendor' },
                        { text: 'Easy scheduling & sign-ups', boldText: 'Easy' },
                        { text: 'Nationwide provider network', boldText: 'Nationwide' },
                        { text: 'Consistent quarterly programs', boldText: 'Consistent' },
                        { text: 'Zero admin headaches', boldText: 'Zero admin' },
                      ].concat([
                        { text: 'One vendor, multiple services', boldText: 'One vendor' },
                        { text: 'Easy scheduling & sign-ups', boldText: 'Easy' },
                        { text: 'Nationwide provider network', boldText: 'Nationwide' },
                        { text: 'Consistent quarterly programs', boldText: 'Consistent' },
                        { text: 'Zero admin headaches', boldText: 'Zero admin' },
                      ]).map((item, idx) => (
                        <div key={idx} className="shortcut-checklist-item flex items-center gap-[11px]">
                          <div
                            className="shortcut-checkbox"
                            style={{
                              backgroundColor: '#D4F7FB',
                              borderColor: 'rgba(1, 142, 162, 0.36)',
                            }}
                          >
                            <div className="shortcut-check-icon">
                              <svg fill="none" viewBox="0 0 14.3715 9.7279">
                                <path d="M 1.215 4.8045 L 5.06625 8.5125 L 13.15675 1.215" stroke="#018EA2" strokeLinecap="square" strokeWidth="2.43" />
                              </svg>
                            </div>
                          </div>
                          <p
                            className="m-0 text-[27px] leading-[36px] font-medium"
                            style={{ color: '#018EA2' }}
                          >
                            {item.boldText ? (
                              <>
                                {item.text.split(item.boldText).map((part, i) => (
                                  <span key={i}>
                                    {part}
                                    {i < item.text.split(item.boldText).length - 1 && (
                                      <strong className="font-bold">{item.boldText}</strong>
                                    )}
                                  </span>
                                ))}
                              </>
                            ) : (
                              item.text
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="px-8 pb-8">
                  <p
                    className="m-0 text-[19px] leading-[26px] font-normal opacity-64"
                    style={{ color: '#018EA2' }}
                  >
                    Operational simplicity and ease that remove friction from your day.
                  </p>
                </div>
              </div>

              {/* CTA strip */}
              <button
                onClick={() => smoothScrollTo('pricing')}
                className="w-full rounded-b-[24px] border-t-0 border-r border-b border-l border-solid flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                style={{
                  height: '82px',
                  backgroundColor: '#9EFAFF',
                  borderColor: 'rgba(0, 31, 31, 0.08)',
                }}
              >
                <p
                  className="m-0 text-[18px] leading-[26px] font-medium text-center"
                  style={{ color: '#003756' }}
                >
                  See Pricing →
                </p>
              </button>
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

      {/* SOCIAL PROOF STATS - Only for returning clients - Moved above promo for better trust-building */}
      {isReturningClient && (
        <section className="py-12 md:py-16 bg-white">
          <div className="mx-auto container-narrow px-4">
            <h2 className="h2 text-center mb-8 md:mb-12" style={{ color: '#003756' }}>
              Why Companies Renew Year After Year
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Stat 1 */}
              <div className="card-medium text-center">
                <div className="text-5xl md:text-6xl font-extrabold mb-3" style={{ color: '#018EA2' }}>
                  87%
                </div>
                <p className="text-xl font-bold mb-2" style={{ color: '#003756' }}>
                  Client Retention Rate
                </p>
                <p className="font-medium" style={{ color: '#003756' }}>
                  Most partners renew and expand their programs
                </p>
              </div>

              {/* Stat 2 */}
              <div className="card-medium text-center">
                <div className="text-5xl md:text-6xl font-extrabold mb-3" style={{ color: '#018EA2' }}>
                  94%
                </div>
                <p className="text-xl font-bold mb-2" style={{ color: '#003756' }}>
                  Employee Satisfaction
                </p>
                <p className="font-medium" style={{ color: '#003756' }}>
                  Employees love the convenience and quality
                </p>
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

      {/* FAQ SECTION - Apple/Airbnb Style */}
      {(!genericLandingPage || genericLandingPage.customization.includeFAQ) && (
        <section className="fade-in-section py-20 md:py-32 rounded-3xl" style={{ backgroundColor: 'white' }}>
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-center mb-12 md:mb-16" style={{ color: '#003756', letterSpacing: '-0.02em' }}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
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
                <div key={idx} className="faq-item rounded-3xl p-8" style={{ backgroundColor: '#F8F9FA', border: '1px solid rgba(0, 55, 86, 0.1)' }}>
                  <button className="faq-question w-full text-left flex items-center justify-between text-xl font-semibold" style={{ color: '#003756' }}>
                    <span>{faq.q}</span>
                    <span className="faq-icon text-2xl" style={{ color: '#003756', opacity: 0.6 }}>+</span>
                  </button>
                  <div className="faq-content">
                    <p className="mt-6 text-base" style={{ color: '#003756', opacity: 0.8, lineHeight: '1.6' }}>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* FINAL CTA - Apple/Airbnb Style */}
      <section id="book" className="fade-in-section py-20 md:py-32 rounded-3xl" style={{ backgroundColor: '#003756' }}>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold mb-6 md:mb-8" style={{ color: 'white', letterSpacing: '-0.02em', lineHeight: '1.15' }}>
            {isReturningClient
              ? 'Ready to Lock In Your 2026 Quarterly Program?'
              : 'Ready to Transform Your Workplace?'
            }
          </h2>
          <p className="text-base md:text-xl lg:text-2xl mb-8 md:mb-12 max-w-3xl mx-auto" style={{ color: 'white', opacity: 0.8, lineHeight: '1.6' }}>
            {isReturningClient
              ? `As a valued partner, commit to 4+ quarterly events and save 15% while securing priority booking and guaranteed availability on your preferred dates. Commit by February 16, 2026.`
              : 'Join 500+ companies who trust Shortcut to deliver employee happiness. Book a call today and see how easy workplace wellness can be.'
            }
          </p>

          <div className="flex flex-col items-center gap-4 md:gap-6">
            <button
              onClick={() => setShowContactForm(true)}
              className="px-8 py-4 md:px-10 md:py-5 rounded-full text-base md:text-lg font-medium transition-all duration-300 hover:scale-105 min-h-[48px] w-full sm:w-auto"
              style={{ backgroundColor: '#FF5050', color: 'white', boxShadow: '0 10px 40px rgba(255, 80, 80, 0.3)' }}
            >
              {isReturningClient ? 'Commit to Quarterly Program & Save 15%' : 'Get in touch'}
            </button>
            <p className="text-sm font-medium" style={{ color: 'white', opacity: 0.6 }}>
              {isReturningClient
                ? 'Schedule commitment call • Lock in your calendar'
                : 'Free consultation • No commitment'
              }
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12" style={{ backgroundColor: 'white' }}>
        <div className="mx-auto container-narrow px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <a href="#top" className="inline-block mb-4" aria-label="Shortcut logo - return to top">
                <svg viewBox="0 0 192 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
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
                    d="M56.5498 29.8609C54.8024 29.8609 53.218 29.4765 51.7968 28.7076C50.3988 27.9155 49.2921 26.8437 48.4767 25.4924C47.6612 24.141 47.2535 22.6266 47.2535 20.949C47.2535 19.2715 47.6612 17.7687 48.4767 16.4407C49.2921 15.1126 50.3988 14.0642 51.7968 13.2953C53.1947 12.5031 54.7791 12.1071 56.5498 12.1071C58.3205 12.1071 59.9049 12.4915 61.3028 13.2604C62.7008 14.0292 63.8075 15.0893 64.623 16.4407C65.4384 17.7687 65.8461 19.2715 65.8461 20.949C65.8461 22.6266 65.4384 24.141 64.623 25.4924C63.8075 26.8437 62.7008 27.9155 61.3028 28.7076C59.9049 29.4765 58.3205 29.8609 56.5498 29.8609ZM56.5498 25.0031C57.3187 25.0031 57.9943 24.84 58.5768 24.5138C59.1593 24.1643 59.6019 23.6867 59.9049 23.0809C60.2311 22.4518 60.3942 21.7412 60.3942 20.949C60.3942 20.1569 60.2311 19.4696 59.9049 18.8871C59.5787 18.2813 59.1243 17.8153 58.5418 17.4891C57.9826 17.1396 57.3187 16.9649 56.5498 16.9649C55.8042 16.9649 55.1403 17.1396 54.5578 17.4891C53.9753 17.8153 53.5209 18.2813 53.1947 18.8871C52.8685 19.4929 52.7054 20.1918 52.7054 20.984C52.7054 21.7529 52.8685 22.4518 53.1947 23.0809C53.5209 23.6867 53.9753 24.1643 54.5578 24.5138C55.1403 24.84 55.8042 25.0031 56.5498 25.0031Z"
                    fill="#175071" />
                </svg>
              </a>
              <p className="mb-4" style={{ color: '#003756' }}>Employee happiness delivered. One vendor, effortless logistics.</p>
              <div className="flex gap-4">
                <a href="#" style={{ color: '#003756' }} className="hover:opacity-70">LinkedIn</a>
                <a href="#" style={{ color: '#003756' }} className="hover:opacity-70">Twitter</a>
                <a href="#" style={{ color: '#003756' }} className="hover:opacity-70">Instagram</a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4" style={{ color: '#003756' }}>Services</h3>
              <ul className="space-y-2">
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">Massage</a></li>
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">Hair & Beauty</a></li>
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">Headshots</a></li>
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">Mindfulness</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4" style={{ color: '#003756' }}>Company</h3>
              <ul className="space-y-2">
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">About</a></li>
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">Contact</a></li>
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">Privacy</a></li>
                <li><a href="#" style={{ color: '#003756', opacity: 0.7 }} className="hover:opacity-100">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 text-center" style={{ borderTop: '1px solid rgba(0, 55, 86, 0.2)', color: '#003756' }}>
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
                <h2 className="text-4xl font-bold mb-3" style={{ color: '#003756' }}>
                  {isReturningClient ? 'Welcome back! Ready to lock in your quarterly program?' : 'Get in touch'}
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl">
                  {isReturningClient 
                    ? `Commit to 4+ quarterly events and save 15% on your 2026 calendar. Build your personalized proposal below and lock in your preferred dates.`
                    : 'Experience the future of wellness at work with Shortcut, from soothing massages to calming mindfulness sessions.'}
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
                // Save form data to Supabase
                // For returning clients, use simplified data; for new clients, use full form data
                const contactData: any = {
                      email: formData.email,
                      service_type: formData.serviceType,
                      event_date: formData.eventDate,
                  message: formData.message || null,
                      generic_landing_page_id: genericLandingPage?.id || null,
                      created_at: new Date().toISOString()
                };

                // Add full form fields only for new clients
                if (!isReturningClient) {
                  contactData.first_name = formData.firstName;
                  contactData.last_name = formData.lastName;
                  contactData.phone = formData.phone;
                  contactData.company = formData.company;
                  contactData.location = formData.location;
                  contactData.appointment_count = formData.appointmentCount === 'custom' ? formData.customAppointmentCount : formData.appointmentCount;
                } else {
                  // For returning clients, use company name from the landing page if available
                  contactData.company = genericLandingPage?.data?.partnerName || null;
                }

                const { data, error } = await supabase
                  .from('contact_requests')
                  .insert([contactData]);

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
              {isReturningClient ? (
                // Simplified form for returning clients
                <>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Type of service *</label>
                      <select
                        value={formData.serviceType}
                        onChange={(e) => {
                          setFormData({...formData, serviceType: e.target.value, appointmentCount: ''});
                        }}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                        required
                      >
                        <option value="">Select a service</option>
                        <option value="massage">Massage</option>
                        <option value="hair-makeup">Hair & Makeup</option>
                        <option value="headshot">Headshots</option>
                        <option value="nails">Nail Care</option>
                        <option value="mindfulness">Mindfulness</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Preferred date *</label>
                      <input
                        type="date"
                        value={formData.eventDate}
                        onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Message (optional)</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all resize-none"
                        placeholder="Any special requests or questions?"
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Full form for new clients
                <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>First name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Last name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                    placeholder="Enter your last name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Phone number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Company *</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                    placeholder="Enter your company name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Location *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                    placeholder="Enter your location"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Type of service *</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => {
                      setFormData({...formData, serviceType: e.target.value, appointmentCount: ''});
                    }}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
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
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Date of event *</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
                    required
                  />
                </div>
              </div>

              {formData.serviceType && (
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Number of appointments *</label>
                  <select
                    value={formData.appointmentCount}
                    onChange={(e) => setFormData({...formData, appointmentCount: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
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
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Custom number of appointments *</label>
                  <input
                    type="number"
                    placeholder="Enter custom number of appointments"
                    value={formData.customAppointmentCount}
                    onChange={(e) => setFormData({...formData, customAppointmentCount: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all"
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
                  <label className="block text-sm font-bold mb-2" style={{ color: '#003756' }}>Your message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal transition-all resize-none"
                    placeholder="Tell us more about your event or any special requirements..."
                  />
                </div>
                  )}
                </>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {isReturningClient ? 'Send Request' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Proposal Preview Modal */}
      {showProposalPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[200] relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold" style={{ color: '#003756' }}>
                Your Quarterly Proposal Preview
              </h2>
              <button
                onClick={() => setShowProposalPreview(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl"
              >
                ×
              </button>
            </div>

            {getProposalPreviewData() && (() => {
              const preview = getProposalPreviewData()!;
              return (
                <div className="space-y-6">
                  {/* Service Summary */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-4" style={{ color: '#003756' }}>
                      Selected Package
                    </h3>
                    <div className="space-y-2">
                      <p className="text-lg">
                        <strong>Service:</strong> {preview.serviceName}
                      </p>
                      <p className="text-lg">
                        <strong>Appointments:</strong> {preview.appointments} per event
                      </p>
                      <p className="text-lg">
                        <strong>Event Duration:</strong> {preview.eventTime} {preview.eventTime === 1 ? 'hour' : 'hours'}
                      </p>
                      <p className="text-lg">
                        <strong>Professionals:</strong> {preview.pros} {preview.pros === 1 ? 'pro' : 'pros'}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                    <h3 className="text-xl font-bold mb-4" style={{ color: '#003756' }}>
                      Pricing Breakdown
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-lg">Base Price (per event):</span>
                        <span className="text-lg font-bold">${preview.basePrice.toLocaleString()}</span>
                      </div>
                      {isReturningClient && (
                        <>
                          <div className="flex justify-between text-green-600">
                            <span className="text-lg">Quarterly Discount ({preview.discountPercent}%):</span>
                            <span className="text-lg font-bold">-${preview.discountAmount.toLocaleString()}</span>
                          </div>
                          <div className="border-t-2 border-blue-300 pt-3 mt-3">
                            <div className="flex justify-between">
                              <span className="text-xl font-bold">Price Per Event:</span>
                              <span className="text-xl font-bold" style={{ color: '#003756' }}>
                                ${preview.finalPrice.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="bg-yellow-100 rounded-lg p-4 mt-4">
                            <p className="text-sm font-semibold mb-1" style={{ color: '#003756' }}>
                              Quarterly Commitment (4 events)
                            </p>
                            <p className="text-2xl font-bold" style={{ color: '#003756' }}>
                              Total Savings: ${preview.quarterlySavings.toLocaleString()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Commitment Terms */}
                  {isReturningClient && (
                    <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
                      <h3 className="text-xl font-bold mb-3" style={{ color: '#003756' }}>
                        Quarterly Commitment Terms
                      </h3>
                      <ul className="space-y-2 list-disc list-inside">
                        <li>Commit to 4+ events in 2026</li>
                        <li>15% discount applied to all events</li>
                        <li>Priority booking and guaranteed availability</li>
                        <li>Dedicated account manager</li>
                        <li>Deadline: February 16, 2026</li>
                      </ul>
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      onClick={handleBuildProposal}
                      disabled={isGeneratingProposal}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingProposal ? 'Generating Proposal...' : 'Generate Full Proposal'}
                    </button>
                    <button
                      onClick={() => setShowProposalPreview(false)}
                      className="flex-1 border-2 border-gray-300 text-gray-700 font-bold py-4 px-8 rounded-xl transition-all hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Client Proposal Builder Modal */}
      <ClientProposalBuilder
        isOpen={showProposalBuilder}
        onClose={() => setShowProposalBuilder(false)}
      />
    </div>
  );
};

export default GenericLandingPage;

