# Shortcut Master Style & Typography Guide

**Version:** 2.0  
**Last Updated:** January 2025  
**Status:** ✅ **IMPLEMENTED & ACTIVE**

---

## Table of Contents

1. [Typography System](#typography-system)
2. [Color Palette](#color-palette)
3. [Button System](#button-system)
4. [Card System](#card-system)
5. [Spacing & Layout](#spacing--layout)
6. [Component Usage](#component-usage)
7. [Implementation Examples](#implementation-examples)

---

## Typography System

### Font Family

**Primary Font:** `'Outfit'`  
**Fallback Stack:** `'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

**Font Loading:**
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
```

**Available Weights:**
- `100` - Thin
- `200` - Extra Light
- `300` - Light
- `400` - Normal
- `500` - Medium ⭐ (Body text)
- `600` - Semi Bold
- `700` - Bold ⭐ (Buttons)
- `800` - Extra Bold ⭐ (Headings)
- `900` - Black

---

### Heading Typography

#### H1 - Hero Titles

**Class:** `.h1` or `h1`

**Responsive Scale:**
- **Mobile (default):** `2.5rem` (40px)
- **Tablet (≥768px):** `3rem` (48px)
- **Desktop (≥1024px):** `3.5rem` (56px)
- **Large Desktop (≥1280px):** `4rem` (64px)

**Properties:**
- **Font Weight:** `800` (ExtraBold)
- **Line Height:** `1.1`
- **Letter Spacing:** `-0.01em`
- **Color:** `#003756` (Shortcut Blue)

**Usage:**
```tsx
<h1 className="h1">Create New Proposal</h1>
// or
<h1>Page Title</h1> // Automatically styled
```

**CSS Implementation:**
```css
h1, .h1 {
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.01em;
  font-size: 2.5rem; /* Mobile */
}

@media (min-width: 768px) {
  h1, .h1 { font-size: 3rem; } /* Tablet */
}

@media (min-width: 1024px) {
  h1, .h1 { font-size: 3.5rem; } /* Desktop */
}

@media (min-width: 1280px) {
  h1, .h1 { font-size: 4rem; } /* Large Desktop */
}
```

---

#### H2 - Section Titles

**Class:** `.h2` or `h2`

**Responsive Scale:**
- **Mobile (default):** `2rem` (32px)
- **Desktop (≥1024px):** `4rem` (64px)

**Properties:**
- **Font Weight:** `800` (ExtraBold)
- **Line Height:** `1`
- **Letter Spacing:** `-0.01em`
- **Color:** `#003756` (Shortcut Blue)

**Usage:**
```tsx
<h2 className="h2">Event Details</h2>
// or
<h2>Section Title</h2> // Automatically styled
```

**CSS Implementation:**
```css
h2, .h2 {
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.01em;
  font-size: 2rem; /* Mobile */
}

@media (min-width: 1024px) {
  h2, .h2 { font-size: 4rem; } /* Desktop */
}
```

---

#### Subsection Titles (Day Summary, Event Summary, etc.)

**Class:** `text-xl font-extrabold`

**Properties:**
- **Font Size:** `1.25rem` (20px)
- **Font Weight:** `800` (ExtraBold)
- **Color:** 
  - `text-shortcut-navy-blue` for white/light backgrounds
  - `text-white` for dark backgrounds (e.g., navy blue cards)

**Usage:**
```tsx
<h4 className="text-xl font-extrabold mb-4 text-shortcut-navy-blue">Day 1 Summary</h4>
<h2 className="text-xl font-extrabold mb-6 text-white">Event Summary</h2>
```

**Common Patterns:**
- **Day Summary titles:** `text-xl font-extrabold mb-4 text-shortcut-navy-blue`
- **Event Summary titles:** `text-xl font-extrabold mb-6 text-white` (on navy blue background)
- **Location subsection titles:** `text-xl font-extrabold text-shortcut-navy-blue`

---

### Body Text

**Default Properties:**
- **Mobile Font Size:** `16px` (1rem)
- **Desktop Font Size:** `18px` (1.125rem)
- **Font Weight:** `500` (Medium) ⭐
- **Line Height:** `1.1`
- **Letter Spacing:** `-0.01em`
- **Color:** `#003756` (Shortcut Blue)

**CSS Implementation:**
```css
body {
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 16px; /* Mobile */
  font-weight: 500; /* Medium */
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: #003756;
}

@media (min-width: 1024px) {
  body {
    font-size: 18px; /* Desktop */
  }
}
```

---

### Typography Utilities

**Font Weights:**
- `font-thin` → 100
- `font-extralight` → 200
- `font-light` → 300
- `font-normal` → 400
- `font-medium` → 500 ⭐ (Body text)
- `font-semibold` → 600
- `font-bold` → 700 ⭐ (Buttons)
- `font-extrabold` → 800 ⭐ (Headings)
- `font-black` → 900

**Letter Spacing:**
- Default: `-0.01em` (applied to all headings)
- Custom: Use Tailwind's `tracking-*` utilities

---

## Color Palette

### Primary Brand Colors

| Color Name | Hex Code | Usage | Tailwind Class |
|------------|----------|-------|----------------|
| **Shortcut Blue** | `#003756` | Primary brand color, headings, text | `text-shortcut-blue`, `bg-shortcut-blue` |
| Dark Blue | `#003C5E` | Headers, sections | `text-shortcut-dark-blue` |
| Navy Blue | `#00456D` | Navigation active states | `text-shortcut-navy-blue` |
| Light Blue | `#013D5E` | Section backgrounds | `text-shortcut-light-blue` |
| Teal Blue | `#018EA2` | Accent sections | `text-shortcut-teal-blue` |
| Cyan Blue | `#054469` | Badges, highlights | `text-shortcut-cyan-blue` |

### Accent Colors

| Color Name | Hex Code | Usage | Tailwind Class |
|------------|----------|-------|----------------|
| **Coral** | `#FF5050` | Logo, accents, highlights, CTAs | `text-shortcut-coral`, `bg-shortcut-coral` |
| **Teal (Light Cyan)** | `#9EFAFF` | Button backgrounds, accents, highlights | `text-shortcut-teal`, `bg-shortcut-teal` |
| **Service Yellow** | `#FEDC64` | Hair services, button hover overlay | `text-shortcut-service-yellow` |
| **Pink** | `#F7BBFF` | Nails & facial services, accent sections | `text-shortcut-pink`, `bg-shortcut-pink` |

### Text Colors

| Color Name | Hex Code | Usage | Tailwind Class |
|------------|----------|-------|----------------|
| **Dark Text** | `#032232` | Primary text color | `text-text-dark` |
| **Dark Text 60%** | `#03223299` | Secondary text (60% opacity) | `text-text-dark-60` |
| **Button Blue** | `#09364f` | Button text color | `text-text-button-blue` |

### Neutral Colors

| Color Name | Hex Code | Usage | Tailwind Class |
|------------|----------|-------|----------------|
| **White** | `#FFFFFF` | Backgrounds, cards | `bg-neutral-white` |
| **Gray** | `#F5F5F5` | Secondary backgrounds | `bg-neutral-gray` |
| **Light Gray** | `#F1F6F5` | Background sections, FAQ cards | `bg-neutral-light-gray` |
| **Dark** | `#333333` | Secondary text | `text-neutral-dark` |

### Background Colors

| Color Name | Hex Code | Usage | Tailwind Class |
|------------|----------|-------|----------------|
| **Light Red** | `#ffeb69` | Section backgrounds | `bg-bg-light-red` |

---

## Button System

### Button Component

**Location:** `src/components/Button.tsx`

**Variants:**
- `primary` - Main CTA buttons (yellow hover overlay)
- `secondary` - Secondary actions (border style)
- `white` - White background buttons
- `green` - Success/approve actions (teal blue hover overlay)

**Sizes:**
- `sm` - Small buttons
- `md` - Medium buttons (default)
- `lg` - Large buttons

---

### Primary Button

**Variant:** `variant="primary"`

**Specifications:**
- **Background:** `#9EFAFF` (Cyan)
- **Text Color:** `#09364f` (Dark Blue)
- **Font:** Outfit, `14px`, weight `700` (Bold)
- **Border Radius:** `9999px` (fully rounded)
- **Padding:**
  - Mobile: `0.625rem 1.5rem` (py-2.5 px-6)
  - Desktop: `1rem 2rem` (py-4 px-8)
- **Min Width:** `160px` (desktop), `100%` (mobile)

**Hover Animation:**
- Yellow overlay (`#FEDC64`) slides up from bottom
- Border radius changes from `9999px` to `0` on hover
- Scale bounce animation (slight scale down then up)

**Usage:**
```tsx
import { Button } from './Button';

<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

<Button variant="primary" icon={<Icon />} loading={isLoading}>
  Submit
</Button>
```

**CSS Structure:**
```css
.btn-primary {
  background: #9efaff;
  color: #09364f;
  border-radius: 9999px;
  padding: 0.625rem 1.5rem; /* Mobile */
  min-width: 160px;
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  background: #FEDC64; /* Yellow overlay */
  transform: translateY(100%);
  transition: transform 0.3s ease-in;
  z-index: 1;
}

.btn-primary:hover::before {
  transform: translateY(0);
  border-radius: 0;
}
```

---

### Secondary Button

**Variant:** `variant="secondary"`

**Specifications:**
- **Background:** Transparent
- **Border:** `2px solid #9EFAFF`
- **Text Color:** `#09364f`
- **Hover:** Light teal background with 10% opacity

**Usage:**
```tsx
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>
```

---

### Green Button

**Variant:** `variant="green"`

**Specifications:**
- **Background:** `green-600`
- **Text Color:** `white` (changes to `#09364f` on hover)
- **Hover Overlay:** Teal blue (`#9EFAFF`) slides up from bottom
- **Text Transition:** White → Dark Blue on hover

**Usage:**
```tsx
<Button variant="green" onClick={handleApprove}>
  Approve Proposal
</Button>
```

**Special Behavior:**
- Text color transitions from white to dark blue (`#09364f`) when hover overlay appears
- Ensures readability on teal blue background

---

### Button States

**Loading State:**
```tsx
<Button variant="primary" loading={true}>
  Processing...
</Button>
```

**Disabled State:**
```tsx
<Button variant="primary" disabled>
  Disabled Button
</Button>
```

**With Icon:**
```tsx
<Button variant="primary" icon={<Plus size={20} />}>
  Add Item
</Button>
```

---

## Card System

The Shortcut design system uses a refined premium card system with three sizes: Large, Medium, and Small. All cards feature subtle multi-layer shadows for depth without heaviness, smooth hover effects, and consistent border radius. The shadow system has been carefully tuned to provide visual separation while maintaining a clean, modern aesthetic.

### Card Sizes

#### Large Card (`.card-large`)

**Specifications:**
- **Border Radius:** `24px`
- **Padding:**
  - Desktop: `48px`
  - Mobile: `32px 24px`
- **Box Shadow:** Refined 3-layer shadow (subtle depth)
- **Hover Effect:** Lifts up 2px with enhanced shadow
- **Border:** Subtle dark border for natural separation

**Usage:**
```tsx
<div className="card-large">
  <h2 className="h2">Card Title</h2>
  <p>Card content...</p>
</div>
```

**CSS:**
```css
.card-large {
  background: white;
  border-radius: 24px;
  padding: 48px; /* Desktop */
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-large:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.06);
}
```

---

#### Medium Card (`.card-medium`)

**Specifications:**
- **Border Radius:** `24px`
- **Padding:**
  - Desktop: `32px`
  - Mobile: `24px`
- **Box Shadow:** Refined 3-layer shadow (subtle depth)
- **Hover Effect:** Lifts up 2px with enhanced shadow
- **Border:** Subtle dark border for natural separation

**Implementation:**
```css
.card-medium {
  background: white;
  border-radius: 24px;
  padding: 32px; /* Desktop */
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-medium:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.06);
}
```

**Usage:**
```tsx
<div className="card-medium">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>
```

---

#### Small Card (`.card-small`)

**Specifications:**
- **Border Radius:** `20px`
- **Padding:**
  - Desktop: `24px`
  - Mobile: `20px`
- **Box Shadow:** Light 3-layer shadow (most subtle)
- **Hover Effect:** Lifts up 2px with enhanced shadow
- **Border:** Subtle dark border for natural separation

**Implementation:**
```css
.card-small {
  background: white;
  border-radius: 20px;
  padding: 24px; /* Desktop */
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 4px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-small:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 16px rgba(0, 0, 0, 0.1),
    0 3px 8px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}
```

**Usage:**
```tsx
<div className="card-small">
  <h4>Card Title</h4>
  <p>Card content...</p>
</div>
```

---

### Card Accent Variants

**Yellow Accent:**
```tsx
<div className="card-large card-accent-yellow">
  <!-- Content -->
</div>
```

**Pink Accent:**
```tsx
<div className="card-medium card-accent-pink">
  <!-- Content -->
</div>
```

**Blue Accent:**
```tsx
<div className="card-small card-accent-blue">
  <!-- Content -->
</div>
```

---

## Page Layout Patterns

### Standard Page Container

**Full-Width Pages (Home, History, Admin):**
```tsx
<div className="min-h-screen bg-neutral-light-gray">
  <div className="max-w-7xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
    <!-- Content -->
  </div>
</div>
```

**Narrow Container Pages (Forms, Single Column):**
```tsx
<div className="min-h-screen bg-neutral-light-gray">
  <div className="max-w-2xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
    <!-- Content -->
  </div>
</div>
```

**Modal Containers:**
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  <div className="card-large max-w-4xl w-full max-h-[90vh] overflow-y-auto z-50 relative">
    <!-- Modal content -->
  </div>
</div>
```

---

## Spacing & Layout

### Container Padding

**Section Padding Pattern:**
- **Mobile:** `px-5` (20px horizontal padding)
- **Desktop (lg):** `px-[90px]` (90px horizontal padding)
- **Vertical Padding:** `py-8 lg:py-12` (32px mobile, 48px desktop)

**Implementation:**
```tsx
<div className="max-w-7xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
  <!-- Content -->
</div>
```

**For Narrower Containers (Forms, Modals):**
```tsx
<div className="max-w-2xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
  <!-- Content -->
</div>
```

---

### Spacing Scale

**Consistent Spacing Patterns:**
- **Form Fields:** `space-y-6` or `space-y-8` for form sections
- **Section Margins:** `mb-8` for major sections, `mb-6` for subsections
- **Card Spacing:** `space-y-6` or `space-y-8` within cards
- **Grid Gaps:** `gap-6` for form grids, `gap-4` for smaller grids

**Implementation:**
```tsx
<form className="space-y-6">
  <div className="space-y-4">
    <!-- Form fields -->
  </div>
</form>

<div className="space-y-8">
  <div className="card-large mb-8">
    <!-- Section -->
  </div>
</div>
```

---

### Responsive Breakpoints

**Tailwind Default Breakpoints:**
- `sm`: `640px`
- `md`: `768px`
- `lg`: `1024px`
- `xl`: `1280px`
- `2xl`: `1536px`

**Typography Breakpoints:**
- H1 scales at: `768px`, `1024px`, `1280px`
- H2 scales at: `1024px`
- Body text scales at: `1024px`

---

## Component Usage

### Form Inputs

**Standard Input Styling:**
```tsx
<input
  type="text"
  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
/>
```

**Key Properties:**
- **Padding:** `px-4 py-3` (16px horizontal, 12px vertical)
- **Border:** `border-2 border-gray-200` (2px border)
- **Focus:** `focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal`
- **Text Size:** `text-base` (16px) for better readability

**Textarea:**
```tsx
<textarea
  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y"
  rows={4}
/>
```

**Select:**
```tsx
<select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal">
  <option>Option 1</option>
</select>
```

**Form Labels:**
```tsx
<label className="block text-sm font-bold text-shortcut-blue mb-2">
  Label Text
</label>
```

**Form Field Grouping:**
```tsx
<div className="space-y-6">
  <div>
    <label className="block text-sm font-bold text-shortcut-blue mb-2">
      Field Label
    </label>
    <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal" />
  </div>
</div>
```

**Error States:**
```tsx
<input
  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${
    hasError ? 'border-red-500' : 'border-gray-200'
  }`}
/>
{hasError && (
  <p className="mt-2 text-sm text-red-600">Error message</p>
)}
```

---

### Modals

**Modal Overlay & Container:**
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
  <div className="card-large max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[200] relative">
    <div className="flex justify-between items-center mb-8">
      <h2 className="h2">Modal Title</h2>
      <button
        onClick={onClose}
        className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
        aria-label="Close modal"
      >
        <X size={24} />
      </button>
    </div>
    <!-- Modal content -->
  </div>
</div>
```

**Modal Form Layout:**
```tsx
<form onSubmit={handleSubmit}>
  <div className="space-y-8">
    <!-- Form sections with space-y-8 -->
  </div>
  <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary" type="submit">Submit</Button>
  </div>
</form>
```

---

### Badges & Indicators

**Info Badge (Light Blue):**
```tsx
<div className="bg-shortcut-light-blue text-shortcut-navy-blue px-3 py-1.5 rounded-full text-sm font-bold">
  Total Appointments: 50
</div>
```

**Accent Badge (Teal):**
```tsx
<div className="bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue px-3 py-1.5 rounded-full text-sm font-bold">
  Total Cost: $1,250.00
</div>
```

**⚠️ CRITICAL DESIGN RULE - NEVER VIOLATE:** 

**NEVER use blue text on blue backgrounds.** This creates poor contrast and readability issues.

**Correct Usage:**
- `text-shortcut-navy-blue` or `text-shortcut-blue` → **ONLY** on white, light gray, or teal opacity backgrounds
- `text-white` → on dark blue backgrounds (navy blue, shortcut-blue, etc.)
- `text-text-dark` → on light blue backgrounds (shortcut-light-blue, etc.)
- `text-shortcut-dark-blue` → on white or very light backgrounds only

**Examples of WRONG usage (DO NOT DO THIS):**
- ❌ `bg-shortcut-light-blue text-shortcut-navy-blue` (blue text on blue background)
- ❌ `bg-shortcut-navy-blue text-shortcut-blue` (blue text on blue background)
- ❌ `bg-shortcut-blue text-shortcut-dark-blue` (blue text on blue background)

**Examples of CORRECT usage:**
- ✅ `bg-shortcut-light-blue text-text-dark` (dark text on light blue background)
- ✅ `bg-shortcut-navy-blue text-white` (white text on dark blue background)
- ✅ `bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue` (blue text on teal opacity - OK)
- ✅ `bg-white text-shortcut-blue` (blue text on white - OK)

**Status Badge (Neutral):**
```tsx
<div className="bg-neutral-light-gray text-shortcut-blue px-3 py-1.5 rounded-full text-sm font-bold">
  Status Text
</div>
```

---

### Day Summary Cards

**Pattern:** White card with navy blue border and teal accent boxes

**Structure:**
```tsx
<div className="mt-6 bg-white rounded-xl p-6 border-2 border-shortcut-navy-blue shadow-md">
  <h4 className="text-xl font-extrabold mb-4 text-shortcut-navy-blue">Day 1 Summary</h4>
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-4 border border-shortcut-teal">
      <div className="text-sm font-bold text-shortcut-navy-blue mb-1">Total Appointments</div>
      <div className="text-2xl font-extrabold text-shortcut-navy-blue">{count}</div>
    </div>
    <div className="bg-shortcut-teal bg-opacity-10 rounded-lg p-4 border border-shortcut-teal">
      <div className="text-sm font-bold text-shortcut-navy-blue mb-1">Total Cost</div>
      <div className="text-2xl font-extrabold text-shortcut-navy-blue">${cost}</div>
    </div>
  </div>
</div>
```

**Key Properties:**
- **Card:** `bg-white rounded-xl p-6 border-2 border-shortcut-navy-blue shadow-md`
- **Title:** `text-xl font-extrabold mb-4 text-shortcut-navy-blue`
- **Accent Boxes:** `bg-shortcut-teal bg-opacity-10 rounded-lg p-4 border border-shortcut-teal`
- **Labels:** `text-sm font-bold text-shortcut-navy-blue mb-1`
- **Values:** `text-2xl font-extrabold text-shortcut-navy-blue`

---

### Navigation Links

**Standard Nav Link:**
```tsx
<a className="nav-link">Link Text</a>
```

**Dark Nav Link (for dark backgrounds):**
```tsx
<a className="nav-link-dark">Link Text</a>
```

---

## Implementation Examples

### Complete Page Example

```tsx
import { Button } from './Button';

export const ExamplePage = () => {
  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <div className="max-w-7xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
        {/* Hero Section */}
        <div className="card-large mb-8">
          <h1 className="h1 mb-8">Page Title</h1>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-shortcut-blue mb-2">
                Field Label
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                placeholder="Enter value..."
              />
            </div>
            <div className="pt-4">
              <Button variant="primary" icon={<Icon />}>
                Primary Action
              </Button>
            </div>
          </form>
        </div>

        {/* Content Section */}
        <div className="card-medium mb-8">
          <h2 className="h2 mb-6">Section Title</h2>
          <div className="space-y-4">
        <p>Section content goes here...</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="primary">Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="green">Approve</Button>
      </div>
    </div>
  );
};
```

---

### Form Example

```tsx
export const ExampleForm = () => {
  return (
    <div className="card-large">
      <h1 className="h1 mb-6">Create New Proposal</h1>
      
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Client Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="primary">
            Submit
          </Button>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
```

---

### Card Grid Example

```tsx
export const CardGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="card-medium">
        <h3 className="font-bold text-lg mb-2">Card 1</h3>
        <p>Card content...</p>
      </div>
      
      <div className="card-medium card-accent-yellow">
        <h3 className="font-bold text-lg mb-2">Card 2</h3>
        <p>Card with yellow accent...</p>
      </div>
      
      <div className="card-small">
        <h4 className="font-semibold mb-2">Card 3</h4>
        <p>Small card content...</p>
      </div>
    </div>
  );
};
```

---

## Quick Reference

### Typography Classes
- `.h1` - Hero titles (responsive: 40px → 64px)
- `.h2` - Section titles (responsive: 32px → 64px)
- `text-xl font-extrabold` - Subsection titles (Day Summary, Event Summary, etc.)
- `body` - Body text (16px mobile, 18px desktop, weight 500)

### Color Classes
- `text-shortcut-blue` - `#003756`
- `bg-shortcut-teal` - `#9EFAFF`
- `text-text-button-blue` - `#09364f`
- `bg-shortcut-service-yellow` - `#FEDC64`

### Button Variants
- `variant="primary"` - Main CTA (yellow hover)
- `variant="secondary"` - Secondary action
- `variant="green"` - Success/approve (teal hover)
- `variant="white"` - White background

### Card Classes
- `.card-large` - 48px padding (desktop)
- `.card-medium` - 32px padding (desktop)
- `.card-small` - 24px padding (desktop)

---

## File Locations

**Main Stylesheet:** `src/index.css`  
**Tailwind Config:** `tailwind.config.js`  
**Button Component:** `src/components/Button.tsx`  
**Font Loading:** `index.html`

---

## Notes

- All typography uses the **Outfit** font family
- Body text uses **Medium (500)** weight, not Normal (400)
- Headings use **ExtraBold (800)** weight
- Buttons use **Bold (700)** weight
- All headings have `-0.01em` letter spacing
- Primary buttons have yellow hover overlay animation
- Green buttons have teal blue hover overlay with text color transition
- Cards have refined subtle 3-layer shadows and smooth hover lift effects
- All colors are defined in `tailwind.config.js` for consistency
- **Modals must use `z-[200]` to appear above navigation bar (`z-[100]`)**
- **Never use blue text on blue backgrounds** - use `text-shortcut-navy-blue` on light backgrounds, `text-white` on dark backgrounds
- **Subsection titles** (Day Summary, Event Summary) use `text-xl font-extrabold` not `.h2`

---

**Last Updated:** January 2025  
**Maintained By:** Development Team  
**Questions?** Refer to `DESIGN_AUDIT_REPORT.md` for detailed audit findings.

---

## Critical Design Rules - Always Follow

### ⚠️ NEVER Use Blue Text on Blue Backgrounds

This is a **CRITICAL** design rule that must never be violated. Blue text on blue backgrounds creates poor contrast, reduces readability, and looks unprofessional.

**Always use:**
- `text-white` on dark blue backgrounds (`bg-shortcut-navy-blue`, `bg-shortcut-blue`)
- `text-text-dark` on light blue backgrounds (`bg-shortcut-light-blue`, `bg-shortcut-navy-blue bg-opacity-10`)
- `text-shortcut-navy-blue` or `text-shortcut-blue` **ONLY** on white, light gray, or teal opacity backgrounds

**Examples:**
- ✅ `bg-shortcut-navy-blue text-white` (white text on dark blue)
- ✅ `bg-shortcut-light-blue text-text-dark` (dark text on light blue)
- ✅ `bg-white text-shortcut-blue` (blue text on white)
- ❌ `bg-shortcut-light-blue text-shortcut-navy-blue` (blue on blue - WRONG)
- ❌ `bg-shortcut-navy-blue bg-opacity-10 text-shortcut-navy-blue` (blue on blue - WRONG)

