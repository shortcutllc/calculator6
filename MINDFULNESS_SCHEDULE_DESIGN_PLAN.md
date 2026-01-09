# Mindfulness Proposal Schedule Display - Design Plan

## Current Issues

1. **Width Constraint**: Schedule table is constrained to `lg:col-span-8` (66.67% width), making it feel narrow
2. **Fixed Min-Width**: Table has `minWidth: '1400px'` forcing horizontal scrolling even on large screens
3. **Mobile Experience**: Table will be cramped and hard to read on mobile devices
4. **Readability**: Dense table layout doesn't optimize for scanning and reading

## Design Goals

1. **Full-Width Utilization**: Schedule should span the full page width for better readability
2. **Responsive Design**: Optimized experience across all device sizes
3. **Mobile-First**: Card-based layout on mobile, table on desktop
4. **Visual Hierarchy**: Clear information architecture with proper spacing and typography

## Implementation Plan

### Phase 1: Restructure Layout
- Break schedule table out of the 8-column grid constraint
- Position schedule section to span full width (12 columns)
- Maintain sidebar positioning but allow schedule to break out

### Phase 2: Responsive Table Design
- **Desktop (lg+)**: Full-width table with all columns, optimized column widths
- **Tablet (md)**: Table with horizontal scroll, but remove fixed min-width
- **Mobile (sm and below)**: Hide table, show card-based layout

### Phase 3: Mobile Card Layout
- Create card component for each session
- Display all session information in a scannable format
- Use icons and visual hierarchy
- Stack information vertically for easy reading

### Phase 4: Typography & Spacing Improvements
- Increase cell padding for better readability
- Optimize font sizes for different screen sizes
- Improve visual hierarchy with colors and spacing
- Better hover states and interactions

### Phase 5: Mobile Optimization Check
- Review entire proposal viewer for mobile responsiveness
- Ensure sidebar collapses appropriately
- Check spacing and padding on mobile
- Verify touch targets are adequate

## Technical Approach

1. **Layout Structure**:
   ```
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
     <div className="lg:col-span-8">
       {/* Main content sections */}
     </div>
     <div className="lg:col-span-4">
       {/* Sidebar */}
     </div>
     {/* Schedule breaks out here */}
     <div className="lg:col-span-12">
       {/* Full-width schedule */}
     </div>
   </div>
   ```

2. **Responsive Breakpoints**:
   - `sm`: 640px (mobile)
   - `md`: 768px (tablet)
   - `lg`: 1024px (desktop)

3. **Component Structure**:
   - Desktop: `<table>` with responsive column widths
   - Mobile: `<div>` cards with session information

4. **CSS Classes**:
   - Use Tailwind responsive utilities
   - Hide/show elements based on breakpoints
   - Optimize spacing with responsive padding

## Visual Design Improvements

1. **Table Header**: 
   - Maintain gradient background
   - Better column width distribution
   - Improved text hierarchy

2. **Table Rows**:
   - Increased padding (py-8 → py-10)
   - Better hover states
   - Improved visual separation

3. **Mobile Cards**:
   - Card design with border and shadow
   - Icon-based visual indicators
   - Clear information hierarchy
   - Easy to scan vertically

4. **Spacing**:
   - Consistent padding throughout
   - Better use of whitespace
   - Improved visual breathing room

## Success Criteria

- [ ] Schedule spans full width on desktop
- [ ] No horizontal scrolling on desktop (unless necessary)
- [ ] Mobile shows card-based layout
- [ ] All information is readable and accessible
- [ ] Visual hierarchy is clear
- [ ] Responsive across all breakpoints
- [ ] Maintains design consistency with rest of proposal


