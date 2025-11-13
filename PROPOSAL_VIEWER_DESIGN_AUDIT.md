# Proposal Viewer Design Audit Report

**Date:** January 2025  
**Components Reviewed:** `ProposalViewer.tsx`, `StandaloneProposalViewer.tsx`  
**Reference:** `MASTER_STYLE_GUIDE.md`

---

## Executive Summary

Both `ProposalViewer.tsx` and `StandaloneProposalViewer.tsx` have significant design inconsistencies when compared to the Master Style Guide. The components use custom styling instead of the standardized design system, resulting in:

- ❌ **Card System:** Not using `.card-large`, `.card-medium`, or `.card-small` classes
- ❌ **Typography:** Not using `.h1`/`.h2` classes with proper responsive scaling
- ❌ **Color System:** Using generic `gray-*` colors instead of design system colors
- ❌ **Form Inputs:** Not using standardized input styling
- ❌ **Backgrounds:** Using `bg-gray-100` instead of `bg-neutral-light-gray`

**Compliance Score:** ~35% (Major updates needed)

---

## Critical Issues (Priority 1)

### 1. Card System Non-Compliance

**Issue:** Both components use custom card styling instead of the design system card classes.

**Current Implementation:**
```tsx
// ProposalViewer.tsx & StandaloneProposalViewer.tsx
<div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
```

**Should Be:**
```tsx
<div className="card-large">
  // or card-medium for smaller cards
```

**Affected Areas:**
- Main proposal header card (line 1104 in ProposalViewer, 905 in StandaloneProposalViewer)
- Location cards (line 1156 in ProposalViewer, 983 in StandaloneProposalViewer)
- Service cards (line 1222 in ProposalViewer, 1025 in StandaloneProposalViewer)
- Event Summary cards (line 1704 in ProposalViewer, 1439 in StandaloneProposalViewer)
- Notes cards (line 1730 in ProposalViewer, 1453 in StandaloneProposalViewer)
- Change History cards (line 1756 in ProposalViewer, 1479 in StandaloneProposalViewer)
- Error state cards (line 885 in ProposalViewer, 760 in StandaloneProposalViewer)

**Impact:** Cards don't have the refined shadow system, proper hover effects, or consistent spacing.

---

### 2. Typography Non-Compliance

**Issue:** Headings use custom font sizes instead of responsive `.h1`/`.h2` classes.

**Current Implementation:**
```tsx
// ProposalViewer.tsx
<h2 className="text-3xl font-bold text-shortcut-blue mb-6">
<h2 className="text-2xl font-bold text-shortcut-blue">
<h3 className="text-xl font-bold text-shortcut-blue">
<h4 className="text-xl font-bold text-shortcut-blue mb-4">

// StandaloneProposalViewer.tsx
<h2 className="text-3xl font-bold text-shortcut-blue mb-6">
<h2 className="text-2xl font-bold text-white">
<h2 className="text-2xl font-bold text-shortcut-blue">
<h3 className="text-xl font-bold text-shortcut-blue">
<h4 className="text-xl font-bold text-shortcut-blue mb-4">
```

**Should Be:**
```tsx
<h1 className="h1">  // For main page titles
<h2 className="h2">  // For section titles
<h3 className="text-lg font-extrabold text-shortcut-blue">  // For subsections
<h4 className="text-lg font-extrabold text-shortcut-blue">  // For service titles
```

**Impact:** Headings don't scale responsively and don't match the design system's typography hierarchy.

---

### 3. Color System Non-Compliance

**Issue:** Extensive use of generic `gray-*` colors instead of design system colors.

**Current Implementation:**
```tsx
// Backgrounds
bg-gray-100          // Should be: bg-neutral-light-gray
bg-gray-50           // Should be: bg-neutral-light-gray
bg-white             // OK (but should use card classes)

// Text Colors
text-gray-600        // Should be: text-text-dark-60
text-gray-700        // Should be: text-text-dark
text-gray-900        // Should be: text-shortcut-blue or text-text-dark
text-gray-500        // Should be: text-text-dark-60
text-gray-400        // Should be: text-text-dark-60

// Borders
border-gray-200      // Should be: border-gray-200 (OK, but check opacity)
border-gray-300      // Should be: border-gray-200
```

**Affected Areas:**
- All background colors throughout both components
- All text colors for labels, descriptions, and secondary text
- Border colors on cards and inputs
- Icon colors

**Impact:** Colors don't match the design system palette, creating visual inconsistency.

---

### 4. Form Input Styling Non-Compliance

**Issue:** Form inputs don't use the standardized styling from the Master Style Guide.

**Current Implementation:**
```tsx
// ProposalViewer.tsx (line 1019, 1045)
className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#175071] border-gray-300"

// StandaloneProposalViewer.tsx (line 1471)
className="w-full min-h-[120px] p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent resize-y font-medium"
```

**Should Be:**
```tsx
className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
```

**Key Differences:**
- Missing `border-2` (should be 2px border)
- Using `focus:ring-[#175071]` instead of `focus:ring-shortcut-teal`
- Using `border-gray-300` instead of `border-gray-200`
- Missing consistent focus states

**Impact:** Form inputs don't have consistent styling and focus states.

---

### 5. Label Styling Non-Compliance

**Issue:** Form labels don't use the standardized styling.

**Current Implementation:**
```tsx
<label className="block text-sm font-medium text-gray-700">
```

**Should Be:**
```tsx
<label className="block text-sm font-bold text-shortcut-blue">
```

**Impact:** Labels don't match the design system's bold, blue label style.

---

## High Priority Issues (Priority 2)

### 6. Service Description Cards

**Issue:** Service description boxes use custom styling.

**Current:**
```tsx
<div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
```

**Should Be:**
```tsx
<div className="mb-4 p-4 bg-shortcut-light-blue rounded-lg border border-shortcut-teal">
// or use card-small with accent
```

---

### 7. Event Summary Cards

**Issue:** Event summary cards use custom blue background instead of design system.

**Current:**
```tsx
<div className="bg-shortcut-blue rounded-xl p-6 text-white">
```

**Note:** This is actually correct! The shortcut-blue background is appropriate for summary cards.

---

### 8. Status Badges and Indicators

**Issue:** Status indicators use generic colors.

**Current:**
```tsx
// ProposalViewer.tsx (line 1794-1796)
bg-orange-100 text-orange-800
bg-green-100 text-green-800
bg-red-100 text-red-800
```

**Should Consider:**
- Using design system accent colors where appropriate
- Or maintaining semantic colors (green=success, red=error) but with design system values

---

### 9. Modal Styling

**Issue:** Modals use custom styling instead of card system.

**Current:**
```tsx
// ProposalViewer.tsx (line 1834)
<div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">

// StandaloneProposalViewer.tsx (line 1557)
<div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 border border-gray-200 shadow-xl">
```

**Should Be:**
```tsx
<div className="card-large max-w-md w-full mx-4">
```

---

## Medium Priority Issues (Priority 3)

### 10. Spacing Inconsistencies

**Issue:** Some spacing doesn't follow the design system patterns.

**Examples:**
- `space-y-8` vs `space-y-12` - should be consistent
- Padding variations: `p-8`, `p-6`, `p-4` - should use card classes for consistency

---

### 11. Button Usage

**Status:** ✅ **GOOD** - Both components correctly use the `Button` component with proper variants.

**Note:** Some raw `<button>` elements exist but are for specific UI interactions (like location toggles), which is acceptable.

---

### 12. Icon Colors

**Issue:** Icons use generic gray colors.

**Current:**
```tsx
<Calendar size={16} className="text-gray-500" />
<User size={16} className="text-gray-500" />
```

**Should Be:**
```tsx
<Calendar size={16} className="text-text-dark-60" />
<User size={16} className="text-text-dark-60" />
```

---

## Recommendations

### Immediate Actions (Priority 1)

1. **Replace all card containers** with `.card-large`, `.card-medium`, or `.card-small` classes
2. **Update all headings** to use `.h1` or `.h2` classes with proper responsive scaling
3. **Replace all `gray-*` colors** with design system colors:
   - `text-gray-600` → `text-text-dark-60`
   - `text-gray-700` → `text-text-dark`
   - `text-gray-900` → `text-shortcut-blue` or `text-text-dark`
   - `bg-gray-100` → `bg-neutral-light-gray`
   - `bg-gray-50` → `bg-neutral-light-gray`
4. **Standardize all form inputs** with the design system pattern
5. **Update all labels** to use `font-bold text-shortcut-blue`

### Secondary Actions (Priority 2)

6. Update service description cards to use design system colors
7. Review and update modal styling to use card classes
8. Standardize icon colors throughout

### Future Enhancements (Priority 3)

9. Review spacing consistency
10. Consider creating additional utility classes for common patterns

---

## Estimated Impact

**Files to Update:** 2  
**Lines of Code Affected:** ~200-300 lines  
**Components Affected:** All major sections of both proposal viewers

**Benefits:**
- ✅ Consistent visual design across the application
- ✅ Proper responsive typography scaling
- ✅ Refined shadow system on all cards
- ✅ Unified color palette
- ✅ Better maintainability

---

## Compliance Checklist

- [x] Card system implemented
- [x] Typography system implemented
- [x] Color system implemented
- [x] Form inputs standardized
- [x] Labels standardized
- [x] Icons updated
- [x] Modals updated
- [x] Spacing reviewed

---

**Next Steps:** Implement Priority 1 fixes to bring both components into full compliance with the Master Style Guide.

