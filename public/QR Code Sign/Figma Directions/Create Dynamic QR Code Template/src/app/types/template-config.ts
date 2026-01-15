/**
 * Configuration Interface for Dynamic Event Sign Template
 * 
 * This template allows you to customize every element of the sign
 * including logos, colors, text, images, and more.
 */

export interface TemplateConfig {
  // Company Branding
  branding: {
    leftLogo: {
      src: string; // URL or import path for left logo
      alt: string;
    };
    rightLogo: {
      src: string; // URL or import path for right logo
      alt: string;
    };
    companyName: string; // Used in title
  };

  // Event Information
  event: {
    title: string; // Main headline
    subtitle?: string; // Optional subtitle
    serviceType: {
      icon: 'nail' | 'calendar' | 'clock' | 'location' | 'custom';
      iconColor: string;
      label: string; // e.g., "Service Type:"
      value: string; // e.g., "Compression & Sports"
    };
    date: {
      icon: 'calendar' | 'custom';
      iconColor: string;
      label: string; // e.g., "Event Date:"
      value: string; // e.g., "March 5th"
    };
    time: {
      icon: 'clock' | 'custom';
      iconColor: string;
      label: string; // e.g., "Event Time:"
      value: string; // e.g., "1:00 PM - 5:00 PM"
    };
    location: {
      icon: 'marker' | 'custom';
      iconColor: string;
      label: string; // e.g., "Location:"
      value: string; // e.g., "Quiet Room"
    };
  };

  // Hero Image (person image with curved background)
  heroImage: {
    src: string; // URL or import path
    alt: string;
    backgroundColor: string; // Background color behind image
    borderRadius: string; // e.g., "36.24px"
  };

  // Mobile Phone Preview
  phonePreview: {
    enabled: boolean;
    bookingUrl: string; // QR code destination
    ctaText: string; // e.g., "Scan to book"
    screenshots: {
      primary: {
        src: string;
        backgroundColor: string;
      };
      secondary?: {
        src: string;
        backgroundColor: string;
      };
    };
  };

  // QR Code
  qrCode: {
    url: string; // URL to encode in QR
    size: number; // Size in pixels
  };

  // Color Scheme
  colors: {
    primary: string; // Main brand color
    secondary: string; // Secondary brand color
    accent: string; // Accent color (e.g., for icons)
    text: {
      primary: string; // Main text color
      secondary: string; // Secondary text color
      white: string; // White text for dark backgrounds
    };
    background: {
      main: string; // Main background
      card: string; // Card background
      hero: string; // Hero section background
    };
  };

  // Typography
  typography: {
    fontFamily: {
      primary: string; // e.g., "Outfit"
      secondary: string; // e.g., "SF Pro Text"
    };
    sizes: {
      headline: string; // Main title size
      title: string; // Section titles
      body: string; // Body text
      label: string; // Small labels
    };
  };

  // Layout
  layout: {
    backgroundColor: string;
    maxWidth: string;
    padding: string;
  };
}

/**
 * Example configuration for a massage services company
 */
export const massageTemplateExample: TemplateConfig = {
  branding: {
    leftLogo: {
      src: "/path/to/shortcut-logo.png",
      alt: "Shortcut Logo"
    },
    rightLogo: {
      src: "/path/to/powin-logo.png",
      alt: "Powin Logo"
    },
    companyName: "Powin PDX"
  },
  event: {
    title: "Complimentary Massage Services for Powin PDX Employees",
    serviceType: {
      icon: 'nail',
      iconColor: '#FF5050',
      label: "Service Type:",
      value: "Compression & Sports"
    },
    date: {
      icon: 'calendar',
      iconColor: '#F7BBFF',
      label: "Event Date:",
      value: "March 5th"
    },
    time: {
      icon: 'clock',
      iconColor: '#FEE801',
      label: "Event Time:",
      value: "1:00 PM - 5:00 PM"
    },
    location: {
      icon: 'marker',
      iconColor: '#FF5050',
      label: "Location:",
      value: "Quiet Room"
    }
  },
  heroImage: {
    src: "/path/to/person-image.jpg",
    alt: "Happy employee",
    backgroundColor: "#9EFAFF",
    borderRadius: "36.24px"
  },
  phonePreview: {
    enabled: true,
    bookingUrl: "https://yourcompany.com/book",
    ctaText: "Scan to book",
    screenshots: {
      primary: {
        src: "/path/to/app-screenshot.jpg",
        backgroundColor: "#9EFAFF"
      }
    }
  },
  qrCode: {
    url: "https://yourcompany.com/book",
    size: 668
  },
  colors: {
    primary: "#175071",
    secondary: "#FF5050",
    accent: "#9EFAFF",
    text: {
      primary: "#003C5E",
      secondary: "#09364F",
      white: "#FFFFFF"
    },
    background: {
      main: "#F2F8FB",
      card: "#FFFFFF",
      hero: "#9EFAFF"
    }
  },
  typography: {
    fontFamily: {
      primary: "Outfit",
      secondary: "SF Pro Text"
    },
    sizes: {
      headline: "72.29px",
      title: "45.301px",
      body: "22.65px",
      label: "18px"
    }
  },
  layout: {
    backgroundColor: "#F2F8FB",
    maxWidth: "2560px",
    padding: "40px"
  }
};
