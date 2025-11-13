# Social Landing Page Navigation Bar Code

This is the complete navigation bar code for the social media landing pages (Meta/LinkedIn).

## HTML/JSX Structure

```tsx
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
```

## Scroll Behavior JavaScript

```javascript
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
```

## Color Palette

- **Background:** `#FFFFFF` (white)
- **Border:** `#E5E7EB` (gray-200)
- **Nav Link Text:** `#003C5E` (dark blue) on hover
- **CTA Button Background:** `#315C52` (dark green)
- **CTA Button Text:** `#EFE0C0` (cream)
- **CTA Button Hover Effect:** `#FF5050` (red) - slides up on hover

## Key Features

1. **Fixed Positioning:** Stays at top of page while scrolling (`fixed top-0 z-50`)
2. **Responsive Design:** 
   - Desktop: Full navigation menu with logo, links, and CTA button
   - Mobile: Simplified with just logo and CTA button
3. **Smooth Animations:**
   - Nav links have hover effects with background color change
   - CTA button has a sliding red overlay on hover
   - Scroll shadow changes dynamically
4. **Rounded Bottom:** `rounded-b-3xl` for modern look
5. **Accessibility:** Proper ARIA labels and semantic HTML

## Required Dependencies

- React/React hooks (`useEffect`, `useState`)
- Tailwind CSS classes
- Logo image at path: `/Holiday Proposal/Shortcut Logo Social Nav Bar.png`

## Notes

- The CTA button uses a creative hover effect with a red overlay that slides up from the bottom
- Navigation links use smooth transitions on hover
- The header shadow increases when user scrolls past 100px
- Breakpoint for mobile/desktop toggle is `lg` (1024px in Tailwind)

