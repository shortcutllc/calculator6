import { TemplateConfig } from '@/app/types/template-config';

/**
 * Example Configuration: Massage Services Company
 * 
 * This configuration demonstrates how to customize the event sign template
 * for a massage services event at a corporate office.
 */
export const massageServiceConfig: TemplateConfig = {
  branding: {
    leftLogo: {
      src: 'https://via.placeholder.com/200x80/FF5050/FFFFFF?text=Shortcut',
      alt: 'Shortcut Logo'
    },
    rightLogo: {
      src: 'https://via.placeholder.com/200x80/00C896/FFFFFF?text=Powin',
      alt: 'Powin Logo'
    },
    companyName: 'Powin PDX'
  },
  event: {
    title: 'Complimentary Massage Services for Powin PDX Employees',
    serviceType: {
      icon: 'nail',
      iconColor: '#FF5050',
      label: 'Service Type:',
      value: 'Compression & Sports'
    },
    date: {
      icon: 'calendar',
      iconColor: '#F7BBFF',
      label: 'Event Date:',
      value: 'March 5th'
    },
    time: {
      icon: 'clock',
      iconColor: '#FEE801',
      label: 'Event Time:',
      value: '1:00 PM - 5:00 PM'
    },
    location: {
      icon: 'marker',
      iconColor: '#FF5050',
      label: 'Location:',
      value: 'Quiet Room'
    }
  },
  heroImage: {
    src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=500&fit=crop',
    alt: 'Happy employee receiving massage',
    backgroundColor: '#9EFAFF',
    borderRadius: '36px'
  },
  phonePreview: {
    enabled: true,
    bookingUrl: 'https://yourcompany.com/book-massage',
    ctaText: 'Scan to book',
    screenshots: {
      primary: {
        src: 'https://via.placeholder.com/300x600/9EFAFF/003C5E?text=Book+Massage+App',
        backgroundColor: '#9EFAFF'
      }
    }
  },
  qrCode: {
    url: 'https://yourcompany.com/book-massage',
    size: 300
  },
  colors: {
    primary: '#175071',
    secondary: '#FF5050',
    accent: '#9EFAFF',
    text: {
      primary: '#003C5E',
      secondary: '#09364F',
      white: '#FFFFFF'
    },
    background: {
      main: '#F2F8FB',
      card: '#FFFFFF',
      hero: '#9EFAFF'
    }
  },
  typography: {
    fontFamily: {
      primary: 'Outfit, sans-serif',
      secondary: 'SF Pro Text, sans-serif'
    },
    sizes: {
      headline: '48px',
      title: '32px',
      body: '20px',
      label: '16px'
    }
  },
  layout: {
    backgroundColor: '#F2F8FB',
    maxWidth: '1400px',
    padding: '40px'
  }
};

/**
 * Example Configuration: Tech Company Wellness Event
 * 
 * Demonstrates a different color scheme and branding for a yoga/meditation event
 */
export const wellnessEventConfig: TemplateConfig = {
  branding: {
    leftLogo: {
      src: 'https://via.placeholder.com/200x80/7C3AED/FFFFFF?text=TechCorp',
      alt: 'TechCorp Logo'
    },
    rightLogo: {
      src: 'https://via.placeholder.com/200x80/10B981/FFFFFF?text=ZenWorks',
      alt: 'ZenWorks Logo'
    },
    companyName: 'TechCorp'
  },
  event: {
    title: 'Mindfulness & Yoga Session',
    subtitle: 'Employee Wellness Program',
    serviceType: {
      icon: 'custom',
      iconColor: '#7C3AED',
      label: 'Activity:',
      value: 'Guided Meditation & Yoga'
    },
    date: {
      icon: 'calendar',
      iconColor: '#10B981',
      label: 'Date:',
      value: 'Every Thursday'
    },
    time: {
      icon: 'clock',
      iconColor: '#F59E0B',
      label: 'Time:',
      value: '12:00 PM - 1:00 PM'
    },
    location: {
      icon: 'marker',
      iconColor: '#EF4444',
      label: 'Where:',
      value: 'Wellness Center, 3rd Floor'
    }
  },
  heroImage: {
    src: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=500&fit=crop',
    alt: 'Person meditating',
    backgroundColor: '#DDD6FE',
    borderRadius: '24px'
  },
  phonePreview: {
    enabled: true,
    bookingUrl: 'https://techcorp.com/wellness-signup',
    ctaText: 'Sign up now →',
    screenshots: {
      primary: {
        src: 'https://via.placeholder.com/300x600/DDD6FE/7C3AED?text=Wellness+App',
        backgroundColor: '#DDD6FE'
      }
    }
  },
  qrCode: {
    url: 'https://techcorp.com/wellness-signup',
    size: 300
  },
  colors: {
    primary: '#7C3AED',
    secondary: '#10B981',
    accent: '#DDD6FE',
    text: {
      primary: '#1F2937',
      secondary: '#4B5563',
      white: '#FFFFFF'
    },
    background: {
      main: '#F9FAFB',
      card: '#FFFFFF',
      hero: '#DDD6FE'
    }
  },
  typography: {
    fontFamily: {
      primary: 'Inter, sans-serif',
      secondary: 'system-ui, sans-serif'
    },
    sizes: {
      headline: '52px',
      title: '36px',
      body: '22px',
      label: '18px'
    }
  },
  layout: {
    backgroundColor: '#F9FAFB',
    maxWidth: '1200px',
    padding: '48px'
  }
};

/**
 * Example Configuration: Corporate Lunch & Learn
 * 
 * Professional styling for educational events
 */
export const lunchLearnConfig: TemplateConfig = {
  branding: {
    leftLogo: {
      src: 'https://via.placeholder.com/200x80/1E40AF/FFFFFF?text=InnovateCo',
      alt: 'InnovateCo Logo'
    },
    rightLogo: {
      src: 'https://via.placeholder.com/200x80/DC2626/FFFFFF?text=Guest+Speaker',
      alt: 'Speaker Logo'
    },
    companyName: 'InnovateCo'
  },
  event: {
    title: 'Lunch & Learn: AI in the Workplace',
    subtitle: 'Featuring Industry Expert Dr. Jane Smith',
    serviceType: {
      icon: 'custom',
      iconColor: '#1E40AF',
      label: 'Topic:',
      value: 'Artificial Intelligence Applications'
    },
    date: {
      icon: 'calendar',
      iconColor: '#7C3AED',
      label: 'Date:',
      value: 'February 15, 2026'
    },
    time: {
      icon: 'clock',
      iconColor: '#DC2626',
      label: 'Time:',
      value: '12:00 PM - 1:30 PM (Lunch Provided)'
    },
    location: {
      icon: 'marker',
      iconColor: '#059669',
      label: 'Location:',
      value: 'Main Conference Room'
    }
  },
  heroImage: {
    src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=500&fit=crop',
    alt: 'Professional presentation',
    backgroundColor: '#DBEAFE',
    borderRadius: '16px'
  },
  phonePreview: {
    enabled: true,
    bookingUrl: 'https://innovateco.com/lunch-learn-rsvp',
    ctaText: 'RSVP Required →',
    screenshots: {
      primary: {
        src: 'https://via.placeholder.com/300x600/DBEAFE/1E40AF?text=RSVP+Form',
        backgroundColor: '#DBEAFE'
      }
    }
  },
  qrCode: {
    url: 'https://innovateco.com/lunch-learn-rsvp',
    size: 300
  },
  colors: {
    primary: '#1E40AF',
    secondary: '#DC2626',
    accent: '#DBEAFE',
    text: {
      primary: '#111827',
      secondary: '#374151',
      white: '#FFFFFF'
    },
    background: {
      main: '#F3F4F6',
      card: '#FFFFFF',
      hero: '#DBEAFE'
    }
  },
  typography: {
    fontFamily: {
      primary: 'Roboto, sans-serif',
      secondary: 'Arial, sans-serif'
    },
    sizes: {
      headline: '44px',
      title: '30px',
      body: '18px',
      label: '14px'
    }
  },
  layout: {
    backgroundColor: '#F3F4F6',
    maxWidth: '1300px',
    padding: '36px'
  }
};

/**
 * All example configurations exported as an object for easy access
 */
export const exampleConfigs = {
  massageService: massageServiceConfig,
  wellnessEvent: wellnessEventConfig,
  lunchLearn: lunchLearnConfig,
};
