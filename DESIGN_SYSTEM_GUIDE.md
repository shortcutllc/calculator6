# Apple/Airbnb Design System Guide
## Generic Landing Page Redesign

---

## Core Principles

### 1. Ruthless Simplicity
- Remove unnecessary elements
- One clear action per section
- Let content breathe with generous whitespace

### 2. Typography Hierarchy
- **Headings**: Large, bold, tight letter-spacing (-0.02em)
- **Subheadings**: Medium weight, slightly reduced opacity (0.6-0.7)
- **Body**: Clear, readable (16px base), comfortable line-height (1.6)
- **Labels**: Uppercase, tracked wider, smaller size (12px)

### 3. Motion & Animation
- **Timing**: 300-700ms duration
- **Easing**: ease-out (Apple's signature feel)
- **Purpose**: Intentional, never decorative
- **Transforms**: Subtle (-translate-y-2 on hover, scale-105 on CTAs)

### 4. Spacing & Layout
- **Section Padding**: py-20 md:py-32 (80px-128px)
- **Content Width**: max-w-6xl or max-w-5xl
- **Grid Gaps**: gap-6 minimum
- **Vertical Rhythm**: space-y-4 to space-y-8

### 5. Color Usage
- **Primary**: #003756 (Shortcut Blue) - headers, text
- **Accent**: #FF5050 (Coral) - CTAs, highlights
- **Backgrounds**: White or very light tints
- **Opacity**: Use opacity for hierarchy (0.6-0.9)

---

## Typography Scale (Using Outfit)

```
Hero Heading:       text-6xl md:text-7xl lg:text-8xl (60-96px)
Section Heading:    text-5xl md:text-6xl lg:text-7xl (48-72px)
Subheading:         text-xl md:text-2xl (20-24px)
Body Large:         text-lg (18px)
Body:               text-base (16px)
Small/Label:        text-sm or text-xs (14px or 12px)
```

**Font Weights:**
- Headings: font-semibold (600) or font-bold (700)
- Subheadings: font-medium (500) or font-semibold (600)
- Body: font-normal (400)
- Labels: font-semibold (600)

---

## Spacing System

```
Section Vertical:   py-20 md:py-32 (5rem-8rem)
Section Horizontal: px-6 or px-4
Element Margins:    mb-12 md:mb-16 (between major elements)
Text Spacing:       mb-6 to mb-8 (between heading and body)
List Items:         space-y-4 (comfortable breathing room)
```

---

## Component Patterns

### Buttons (CTAs)
```
Primary:
- Background: #FF5050 (Coral)
- Color: white
- Padding: px-10 py-5 (large touch targets)
- Border Radius: rounded-full
- Font: text-lg font-medium
- Hover: scale-105, duration-300
- Shadow: box-shadow with accent color (subtle)

Secondary:
- Background: transparent or light
- Border: 2px solid
- Same padding/sizing as primary
```

### Cards
```
- Border Radius: rounded-3xl (24px)
- Padding: p-8 md:p-10
- Background: Subtle tints or white
- Border: 1-2px solid with low opacity
- Hover: -translate-y-2, duration-700, ease-out
- Shadow: Minimal or none (Apple prefers flat)
```

### Section Headers
```
Structure:
1. Small label (if applicable) - opacity 0.6
2. Large heading - font-semibold, letterSpacing -0.02em
3. Subheading/description - opacity 0.7, max-w-2xl mx-auto
4. Visual element or CTA

Alignment: text-center
Margins: mb-12 md:mb-16
```

---

## Animation Principles

### Hover States
- **Cards**: translateY(-8px) - lift up slightly
- **Buttons**: scale(1.05) - grow slightly
- **Duration**: 300-700ms
- **Easing**: ease-out

### Entrance Animations
- **Opacity**: 0 → 1
- **Transform**: translateX or translateY with small distance
- **Scale**: 0.95 → 1
- **Duration**: 700ms
- **Easing**: ease-out

### Interactive Elements
- **Tabs/Toggles**: Background and color transition (300ms)
- **Slide-ins**: Combine opacity + translateX + scale
- **Never**: Bounce, elastic, or overly playful easing

---

## Layout Patterns

### Grid Layouts
```
Desktop: grid md:grid-cols-3 (or 2)
Gap: gap-6
Mobile: Single column (default)
Alignment: Use justifyItems for centering when needed
```

### Flex Layouts
```
Centered: justify-center items-center
Gaps: gap-3 to gap-6
Direction: flex-col on mobile, flex-row on desktop
```

### Max Widths
```
Hero Content: max-w-4xl
Section Content: max-w-6xl or max-w-5xl
Text Blocks: max-w-2xl or max-w-3xl (for readability)
```

---

## Whitespace Philosophy

**Apple's 8px Grid System:**
- All spacing should be multiples of 4 or 8
- Generous padding around interactive elements
- Let sections breathe - don't cram content
- Use negative space to guide attention

**Between Elements:**
- Heading → Subheading: mb-6
- Subheading → Body: mb-8
- Section → Section: py-20 md:py-32
- Card Internal: p-8 md:p-10

---

## Color Opacity Guide

```
Primary Text:    opacity: 1.0 (full)
Secondary Text:  opacity: 0.7-0.8
Tertiary Text:   opacity: 0.6
Disabled:        opacity: 0.4-0.5
Borders:         opacity: 0.1-0.15
```

---

## Icons & Visual Elements

- **Size**: Consistent scale (1.25rem for checkmarks, 2xl for emojis)
- **Color**: Match text hierarchy or use accent color
- **Spacing**: Adequate gap from text (gap-3)
- **Style**: Simple, minimal, functional

---

## Mobile-First Responsive

1. Start with mobile design
2. Add breakpoints: sm: md: lg: xl:
3. Progressive enhancement
4. Touch targets: Minimum 44x44px
5. Readable text: Never below 16px for body

---

## Things to Avoid (Anti-Patterns)

❌ Drop shadows (use subtle borders instead)
❌ Gradients (use solid colors)
❌ Multiple font families
❌ Overly complex animations
❌ Small touch targets
❌ Low contrast text
❌ Cluttered layouts
❌ Decorative elements without purpose
❌ Inconsistent spacing
❌ Too many accent colors

---

## Checklist for Each Section

- [ ] Typography follows hierarchy
- [ ] Spacing uses 8px grid system
- [ ] Animations are subtle and intentional
- [ ] Colors from defined palette
- [ ] Generous whitespace
- [ ] Mobile responsive
- [ ] Touch targets 44px+
- [ ] Contrast ratio meets WCAG AA
- [ ] Consistent with other sections
- [ ] No decorative bloat

---

## Current "Ways to Save" Section - Reference

This section exemplifies all principles:
- Clean typography with Outfit font
- Centered layout with generous spacing
- Interactive tabs with 300ms transitions
- Cards with rounded-3xl and hover:-translate-y-2
- Clear visual hierarchy
- Smooth 700ms animations on card entry
- Benefits lists with adequate spacing (space-y-4)
- Large CTA with hover:scale-105

Use this as the gold standard for redesigning other sections.
