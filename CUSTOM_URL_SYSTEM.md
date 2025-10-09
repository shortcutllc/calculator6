# Custom URL System

This document explains the automatic custom URL system that creates branded, shortened URLs for all shared content behind the scenes.

## 🎯 Overview

The custom URL system automatically transforms your random token-based URLs into branded, memorable URLs:

**Before:**
- `proposals.getshortcut.co/proposal/abc123def456?shared=true`
- `proposals.getshortcut.co/gallery/xyz789uvw012`
- `proposals.getshortcut.co/manager/mg_abc123def456`

**After (Auto-Generated):**
- `proposals.getshortcut.co/draftkings/proposal/draftkings`
- `proposals.getshortcut.co/draftkings/gallery/john-s`
- `proposals.getshortcut.co/draftkings/manager/draftkings`

## 🏗️ Architecture

### Database Structure

The system uses a `custom_urls` table that maps custom URLs to original records:

```sql
custom_urls (
  id UUID PRIMARY KEY,
  original_id UUID NOT NULL,           -- ID of the original record
  type TEXT NOT NULL,                  -- 'proposal', 'headshot_event', 'employee_gallery', 'photographer_token'
  custom_slug TEXT NOT NULL,           -- The custom part of the URL
  client_name TEXT NOT NULL,           -- Client name for branding
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### URL Structure

All custom URLs follow this pattern:
```
https://proposals.getshortcut.co/{client_name}/{type}/{custom_slug}
```

**Examples:**
- `https://proposals.getshortcut.co/draftkings/proposal/headshot-event-2024`
- `https://proposals.getshortcut.co/microsoft/gallery/sarah-jones`
- `https://proposals.getshortcut.co/acme-corp/manager/dashboard`

## 🚀 Usage

### 1. Automatic Generation

Custom URLs are automatically generated when records are created:

- **Headshot Events**: Generated when `HeadshotService.createEvent()` is called
- **Employee Galleries**: Generated when `HeadshotService.createEmployeeGalleries()` is called  
- **Photographer Tokens**: Generated when `PhotographerService.createToken()` is called
- **Proposals**: Ready for integration when `ProposalService.createProposal()` is called

### 2. Getting Custom URLs

```tsx
import { CustomUrlHelper } from './utils/customUrlHelper';

// Get custom URL for an employee gallery
const customUrl = await CustomUrlHelper.getEmployeeGalleryUrl(
  galleryId,
  originalToken
);

// Get custom URL for a manager dashboard
const managerUrl = await CustomUrlHelper.getManagerUrl(
  eventId,
  originalToken
);
```

### 2. Client Name Extraction

The `ClientNameExtractor` utility helps extract client names from various sources:

```tsx
// From event name
ClientNameExtractor.fromEventName("DraftKings Headshot Event") // "draftkings"

// From email
ClientNameExtractor.fromEmail("john@acme-corp.com") // "acme-corp"

// From company name
ClientNameExtractor.fromCompanyName("Microsoft LLC") // "microsoft"

// Convert any text to URL-friendly format
ClientNameExtractor.toUrlFriendly("John Smith's Gallery") // "john-smiths-gallery"
```

### 3. Service Layer

The `CustomUrlService` handles all database operations:

```tsx
import { CustomUrlService } from './services/CustomUrlService';

// Create a custom URL
const customUrl = await CustomUrlService.setCustomUrl(
  'original-id-123',
  'proposal',
  'my-custom-slug',
  'draftkings'
);

// Get custom URL by client and slug
const url = await CustomUrlService.getByCustomUrl(
  'draftkings',
  'my-custom-slug',
  'proposal'
);

// Generate the full URL
const fullUrl = CustomUrlService.generateCustomUrl(
  'draftkings',
  'my-custom-slug',
  'proposal'
);
```

## 🔄 URL Resolution

The `CustomUrlResolver` component automatically redirects custom URLs to their original endpoints:

```tsx
// In App.tsx
<Route
  path="/:client/:type/:slug"
  element={
    <CustomUrlResolver>
      <div>Redirecting...</div>
    </CustomUrlResolver>
  }
/>
```

When a user visits `proposals.getshortcut.co/draftkings/gallery/john-smith`, the resolver:
1. Looks up the custom URL in the database
2. Finds the original gallery token
3. Redirects to `/gallery/{original-token}`

## 📱 Backend Integration

### Automatic Generation

Custom URLs are generated automatically in the backend services:

**HeadshotService:**
```tsx
// In createEvent method
await CustomUrlService.autoGenerateCustomUrl(
  data.id,
  'headshot_event',
  {
    clientName: ClientNameExtractor.fromEventName(data.event_name),
    eventName: data.event_name
  }
);
```

**PhotographerService:**
```tsx
// In createToken method
await CustomUrlService.autoGenerateCustomUrl(
  data.id,
  'photographer_token',
  {
    clientName: 'photographers',
    photographerName: data.photographer_name
  }
);
```

### URL Resolution

The `CustomUrlResolver` component automatically redirects custom URLs to their original endpoints:

```tsx
// In App.tsx
<Route
  path="/:client/:type/:slug"
  element={
    <CustomUrlResolver>
      <div>Redirecting...</div>
    </CustomUrlResolver>
  }
/>
```

## 🛡️ Security & Validation

### URL Slug Validation
- Only letters, numbers, and hyphens allowed
- Automatically converted to lowercase
- Duplicate slugs are handled with numeric suffixes
- Empty slugs are rejected

### Client Name Validation
- Must be URL-friendly
- Automatically cleaned and formatted
- Fallback generation for invalid names

### Database Constraints
- Unique constraint on `(client_name, custom_slug, type)`
- Foreign key relationships maintained
- RLS policies for security

## 🔧 Configuration

### Environment Variables
No additional environment variables required. The system uses existing Supabase configuration.

### Database Migrations
The system includes a migration that:
- Adds `custom_url_slug` columns to existing tables
- Creates the `custom_urls` mapping table
- Sets up indexes for performance
- Configures RLS policies

## 📊 Performance

### Indexes
- `idx_custom_urls_client_slug` on `(client_name, custom_slug)`
- `idx_custom_urls_original_id` on `(original_id, type)`

### Caching
Consider implementing Redis caching for frequently accessed custom URLs in production.

## 🚀 Deployment

1. **Database Migration:**
   ```bash
   npx supabase db push --include-all
   ```

2. **Build & Deploy:**
   ```bash
   npm run build
   netlify deploy --prod
   ```

3. **Test Custom URLs:**
   - Create a custom URL in the admin interface
   - Test the URL resolution
   - Verify redirects work correctly

## 🎨 Customization

### URL Patterns
You can modify the URL structure by updating the `CustomUrlService.generateCustomUrl()` method.

### Client Name Extraction
Add new extraction methods to `ClientNameExtractor` for your specific use cases.

### UI Styling
The `CustomUrlManager` component uses Tailwind CSS and can be styled to match your design system.

## 🔍 Troubleshooting

### Common Issues

1. **Custom URL not found:**
   - Check if the URL was created correctly
   - Verify client name and slug match exactly
   - Check database for the mapping record

2. **Redirect not working:**
   - Verify the `CustomUrlResolver` is properly configured
   - Check that the route pattern matches your URLs
   - Ensure the original record still exists

3. **Duplicate slug error:**
   - The system automatically handles duplicates with numeric suffixes
   - Check for existing URLs with the same client and type

### Debug Mode
Enable console logging in `CustomUrlResolver` to debug URL resolution issues.

## 📈 Future Enhancements

- **Analytics:** Track custom URL usage and clicks
- **QR Codes:** Generate QR codes for custom URLs
- **Bulk Operations:** Create custom URLs for multiple items at once
- **Custom Domains:** Support for client-specific domains
- **URL Shortening:** Further shorten URLs with a service like bit.ly
