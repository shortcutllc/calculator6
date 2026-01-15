# Dynamic Event Sign Template - Usage Guide

This template system allows you to create fully customized event signs/posters for any company by simply providing a configuration object. Every element can be customized - colors, text, images, logos, and more.

## Quick Start

```tsx
import { EventSignTemplate } from '@/app/components/EventSignTemplate';
import { massageServiceConfig } from '@/app/config/example-configs';

function App() {
  return <EventSignTemplate config={massageServiceConfig} />;
}
```

## Configuration Structure

The template is controlled by a single `TemplateConfig` object. Here's the complete structure:

### 1. Branding

```typescript
branding: {
  leftLogo: {
    src: string;        // URL or path to left logo image
    alt: string;        // Alt text for accessibility
  },
  rightLogo: {
    src: string;        // URL or path to right logo image
    alt: string;        // Alt text for accessibility
  },
  companyName: string;  // Company name (used in title)
}
```

**Example:**
```typescript
branding: {
  leftLogo: {
    src: 'https://mycompany.com/logo.png',
    alt: 'My Company Logo'
  },
  rightLogo: {
    src: 'https://partner.com/logo.png',
    alt: 'Partner Logo'
  },
  companyName: 'My Company'
}
```

### 2. Event Information

```typescript
event: {
  title: string;              // Main headline
  subtitle?: string;          // Optional subtitle
  serviceType: {
    icon: 'nail' | 'calendar' | 'clock' | 'location' | 'custom';
    iconColor: string;        // Hex color code
    label: string;            // e.g., "Service Type:"
    value: string;            // e.g., "Compression & Sports"
  },
  date: { ... },             // Same structure as serviceType
  time: { ... },             // Same structure as serviceType
  location: { ... }          // Same structure as serviceType
}
```

**Example:**
```typescript
event: {
  title: 'Employee Health & Wellness Day',
  subtitle: 'Free Services for All Staff',
  serviceType: {
    icon: 'custom',
    iconColor: '#FF5050',
    label: 'Activity:',
    value: 'Health Screening & Massage'
  },
  date: {
    icon: 'calendar',
    iconColor: '#10B981',
    label: 'Date:',
    value: 'April 10, 2026'
  },
  time: {
    icon: 'clock',
    iconColor: '#F59E0B',
    label: 'Time:',
    value: '9:00 AM - 4:00 PM'
  },
  location: {
    icon: 'marker',
    iconColor: '#EF4444',
    label: 'Location:',
    value: 'Main Lobby'
  }
}
```

### 3. Hero Image

```typescript
heroImage: {
  src: string;              // URL to hero image
  alt: string;              // Alt text
  backgroundColor: string;  // Background color (hex)
  borderRadius: string;     // Border radius (e.g., "36px")
}
```

**Example:**
```typescript
heroImage: {
  src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
  alt: 'Happy employee',
  backgroundColor: '#9EFAFF',
  borderRadius: '24px'
}
```

### 4. Phone Preview & QR Code

```typescript
phonePreview: {
  enabled: boolean;        // Show/hide phone preview section
  bookingUrl: string;      // URL for QR code destination
  ctaText: string;         // Call-to-action text
  screenshots: {
    primary: {
      src: string;         // App screenshot image
      backgroundColor: string;
    },
    secondary?: { ... }    // Optional second screenshot
  }
}

qrCode: {
  url: string;             // URL to encode in QR code
  size: number;            // QR code size in pixels
}
```

**Example:**
```typescript
phonePreview: {
  enabled: true,
  bookingUrl: 'https://mycompany.com/book',
  ctaText: 'Scan to register',
  screenshots: {
    primary: {
      src: '/images/app-screenshot.png',
      backgroundColor: '#DBEAFE'
    }
  }
},
qrCode: {
  url: 'https://mycompany.com/book',
  size: 300
}
```

### 5. Color Scheme

```typescript
colors: {
  primary: string;         // Main brand color
  secondary: string;       // Secondary brand color
  accent: string;          // Accent color
  text: {
    primary: string;       // Main text color
    secondary: string;     // Secondary text color
    white: string;         // White text (for dark backgrounds)
  },
  background: {
    main: string;          // Page background
    card: string;          // Card/section background
    hero: string;          // Hero image background
  }
}
```

**Example:**
```typescript
colors: {
  primary: '#1E40AF',      // Blue
  secondary: '#DC2626',    // Red
  accent: '#DBEAFE',       // Light blue
  text: {
    primary: '#111827',    // Dark gray
    secondary: '#4B5563',  // Medium gray
    white: '#FFFFFF'
  },
  background: {
    main: '#F9FAFB',       // Light gray
    card: '#FFFFFF',       // White
    hero: '#DBEAFE'        // Light blue
  }
}
```

### 6. Typography

```typescript
typography: {
  fontFamily: {
    primary: string;       // Main font (e.g., "Outfit, sans-serif")
    secondary: string;     // Secondary font
  },
  sizes: {
    headline: string;      // Main title size (e.g., "48px")
    title: string;         // Section title size
    body: string;          // Body text size
    label: string;         // Small label size
  }
}
```

**Example:**
```typescript
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
}
```

### 7. Layout

```typescript
layout: {
  backgroundColor: string;  // Page background color
  maxWidth: string;         // Maximum width (e.g., "1400px")
  padding: string;          // Page padding (e.g., "40px")
}
```

**Example:**
```typescript
layout: {
  backgroundColor: '#F2F8FB',
  maxWidth: '1200px',
  padding: '48px'
}
```

## Creating a Custom Configuration

### Step 1: Define Your Configuration

```typescript
import { TemplateConfig } from '@/app/types/template-config';

const myEventConfig: TemplateConfig = {
  branding: {
    leftLogo: {
      src: '/path/to/your/logo.png',
      alt: 'Your Company'
    },
    rightLogo: {
      src: '/path/to/partner/logo.png',
      alt: 'Partner Company'
    },
    companyName: 'Your Company Name'
  },
  event: {
    title: 'Your Event Title',
    serviceType: {
      icon: 'custom',
      iconColor: '#YOUR_COLOR',
      label: 'Your Label:',
      value: 'Your Value'
    },
    // ... rest of event details
  },
  // ... rest of configuration
};
```

### Step 2: Use the Template

```typescript
import { EventSignTemplate } from '@/app/components/EventSignTemplate';

export default function MyEventSign() {
  return <EventSignTemplate config={myEventConfig} />;
}
```

## Example Configurations

Three example configurations are provided in `/src/app/config/example-configs.ts`:

1. **massageServiceConfig** - Wellness/massage event with bright, friendly colors
2. **wellnessEventConfig** - Yoga/meditation event with calming purple/green theme
3. **lunchLearnConfig** - Professional educational event with corporate styling

You can use these as starting points and modify them for your needs.

## Tips for Claude Code Implementation

When implementing this template in Claude Code, provide:

1. **Company Details:**
   - Company name
   - Logo URLs (or describe them for placeholder generation)
   - Brand colors (hex codes)

2. **Event Information:**
   - Event title and subtitle
   - Service/activity type
   - Date, time, and location
   - Any special instructions

3. **Visual Preferences:**
   - Desired color scheme
   - Font preferences
   - Image style (professional, casual, vibrant, etc.)

4. **Booking/Registration:**
   - URL for QR code
   - Call-to-action text
   - Any app screenshots (if available)

### Example Prompt for Claude Code:

```
Create a custom event sign configuration for:
- Company: TechStart Inc.
- Event: "Annual Team Building Retreat"
- Date: June 20, 2026
- Time: 9:00 AM - 5:00 PM
- Location: Riverside Park
- Brand Colors: Primary #0066CC (blue), Secondary #FF6B35 (orange)
- Style: Fun and energetic
- QR Code URL: https://techstart.com/retreat-rsvp
```

Claude Code can then generate a complete configuration matching your specifications!

## Customization Examples

### Change to Dark Mode

```typescript
colors: {
  primary: '#60A5FA',
  secondary: '#F87171',
  accent: '#818CF8',
  text: {
    primary: '#F9FAFB',
    secondary: '#E5E7EB',
    white: '#FFFFFF'
  },
  background: {
    main: '#111827',
    card: '#1F2937',
    hero: '#374151'
  }
}
```

### Add Multiple Languages

```typescript
event: {
  title: 'Employee Wellness Event / Evento de Bienestar para Empleados',
  // ... rest of config
}
```

### Disable Phone Preview

```typescript
phonePreview: {
  enabled: false,
  // ... other fields (still required but won't be displayed)
}
```

## File Structure

```
/src
  /app
    /components
      EventSignTemplate.tsx      # Main template component
    /types
      template-config.ts         # TypeScript interfaces
    /config
      example-configs.ts         # Example configurations
  TEMPLATE_INSTRUCTIONS.md      # This file
```

## Support

For questions or issues:
1. Check the example configurations in `/src/app/config/example-configs.ts`
2. Review the TypeScript interfaces in `/src/app/types/template-config.ts`
3. Refer to this documentation

## License

This template is provided as-is for use in your projects. Feel free to modify and adapt as needed.
