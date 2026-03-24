import { useState } from 'react';

// Privacy screen panel designs for Workhuman Live 2026
// 5 massage stations: 2 on left wall, 3 on right wall
// 3-4 privacy screens positioned as dividers BETWEEN stations
// Screens face the center aisle (outward) — back sides are mostly hidden
// Outward-facing designs are the priority (what attendees see)

interface PanelDesign {
  id: string;
  screenNumber: number;
  copy: string;
  backgroundColor: string;
  textColor: string;
  logoVariant: 'coral' | 'navy' | 'white';
  logoPosition: 'bottom-left' | 'bottom-right';
}

// Color scheme definitions
type ColorScheme = 'coral' | 'teal' | 'pink' | 'yellow' | 'mixed';

const colorSchemes: Record<string, { label: string; description: string; swatch: string }> = {
  coral: { label: 'Coral', description: 'Bold coral (#FF5050) — high energy, stops traffic', swatch: '#FF5050' },
  teal: { label: 'Teal', description: 'Light cyan (#9EFAFF) — cool, calming, spa-like', swatch: '#9EFAFF' },
  pink: { label: 'Pink', description: 'Lavender pink (#F7BBFF) — soft, inviting, premium', swatch: '#F7BBFF' },
  yellow: { label: 'Yellow', description: 'Warm yellow (#FEDC64) — bright, optimistic, energetic', swatch: '#FEDC64' },
  mixed: { label: 'Mixed', description: 'Alternating teal, pink, yellow — each screen a different color', swatch: 'linear-gradient(135deg, #9EFAFF 33%, #F7BBFF 33%, #F7BBFF 66%, #FEDC64 66%)' },
};

// Copy lines for outward panels
const copyLines = [
  'That meeting could have been a massage.',
  'Slack, Zoom, Shortcut. One of these helps your team relax.',
  '6 SaaS tools to help your team work better. And one to help them feel like humans again.',
  'Real wellness, right between meetings.',
  'Wellness shouldn\'t be another thing to manage. That\'s our job.',
  'We create space to reset. You just pick the room.',
  'Employee Happiness Delivered.',
];

function buildPanels(scheme: ColorScheme): PanelDesign[] {
  const getSchemeColors = (index: number) => {
    switch (scheme) {
      case 'coral':
        return { bg: '#FF5050', text: '#FFFFFF', logo: 'navy' as const };
      case 'teal':
        return { bg: '#9EFAFF', text: '#003756', logo: 'coral' as const };
      case 'pink':
        return { bg: '#F7BBFF', text: '#003756', logo: 'coral' as const };
      case 'yellow':
        return { bg: '#FEDC64', text: '#003756', logo: 'coral' as const };
      case 'mixed': {
        const mixColors = [
          { bg: '#9EFAFF', text: '#003756', logo: 'coral' as const },
          { bg: '#F7BBFF', text: '#003756', logo: 'coral' as const },
          { bg: '#FEDC64', text: '#003756', logo: 'coral' as const },
          { bg: '#9EFAFF', text: '#003756', logo: 'coral' as const },
          { bg: '#F7BBFF', text: '#003756', logo: 'coral' as const },
          { bg: '#FEDC64', text: '#003756', logo: 'coral' as const },
          { bg: '#9EFAFF', text: '#003756', logo: 'coral' as const },
        ];
        return mixColors[index % mixColors.length];
      }
      default:
        return { bg: '#FF5050', text: '#FFFFFF', logo: 'navy' as const };
    }
  };

  return copyLines.map((copy, i) => {
    const colors = getSchemeColors(i);
    return {
      id: `screen-${i + 1}`,
      screenNumber: i + 1,
      copy,
      backgroundColor: colors.bg,
      textColor: colors.text,
      logoVariant: colors.logo,
      logoPosition: 'bottom-right' as const,
    };
  });
}

function PanelPreview({ panel, scale = 1 }: { panel: PanelDesign; scale?: number }) {
  // Privacy screens: retractable banner 33.5" × 80" ≈ 1:2.4 aspect ratio
  // Renders at base 400×960, then CSS-scales with a collapsed wrapper
  const baseWidth = 400;
  const baseHeight = 960;
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  return (
    <div style={{ width: scaledWidth, height: scaledHeight, overflow: 'hidden' }}>
      <div
        className="relative"
        style={{
          width: baseWidth,
          height: baseHeight,
          backgroundColor: panel.backgroundColor,
          borderRadius: 8 / scale,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Copy — same position on every panel */}
        <div className="absolute" style={{ top: '10%', left: '8%', right: '8%' }}>
          <p
            className="font-extrabold leading-[1.08] tracking-[-0.02em]"
            style={{
              fontSize: 48,
              fontFamily: 'Outfit, system-ui, sans-serif',
              color: panel.textColor,
            }}
          >
            {panel.copy}
          </p>
        </div>

        {/* Logo — same position on every panel */}
        <div
          className="absolute"
          style={{
            bottom: '5%',
            ...(panel.logoPosition === 'bottom-left' ? { left: '8%' } : { right: '8%' }),
          }}
        >
          <ShortcutLogo variant={panel.logoVariant} size={36} />
        </div>
      </div>
    </div>
  );
}

function ShortcutLogo({ variant, size }: { variant: 'coral' | 'navy' | 'white'; size: number }) {
  // Real Shortcut logo SVG paths from shortcut-logo-rgb.svg
  // Icon color and wordmark color change based on variant
  const iconColor = variant === 'coral' ? '#FF5050' : variant === 'white' ? '#FFFFFF' : '#003756';
  const wordmarkColor = variant === 'coral' ? '#FF5050' : variant === 'white' ? '#FFFFFF' : '#003C5E';

  // The original SVG viewBox is 1162×192, we scale based on height = size
  const scale = size / 192;
  const width = 1162 * scale;

  return (
    <svg width={width} height={size} viewBox="0 0 1162 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="symbol">
        <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill={iconColor}/>
        <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill={iconColor}/>
      </g>
      <g id="wordmark" transform="translate(319.6,17.5)">
        <path d="M47.1577 156.768C41.0683 156.768 35.0497 155.989 29.1019 154.431C23.2956 152.874 17.8435 150.679 12.7453 147.846C7.78882 144.872 3.54037 141.474 2.6537e-06 137.65L18.4807 118.957C21.8795 122.639 25.9155 125.542 30.5888 127.666C35.2621 129.649 40.3602 130.64 45.8832 130.64C49.7068 130.64 52.6099 130.074 54.5925 128.941C56.7167 127.808 57.7789 126.25 57.7789 124.268C57.7789 121.718 56.5043 119.807 53.9552 118.532C51.5478 117.116 48.4323 115.912 44.6087 114.921C40.7851 113.788 36.749 112.584 32.5006 111.31C28.2522 110.035 24.2161 108.265 20.3925 105.999C16.5689 103.733 13.4534 100.618 11.046 96.6526C8.63851 92.5458 7.43478 87.3768 7.43478 81.1458C7.43478 74.4899 9.13416 68.7545 12.5329 63.9396C15.9317 58.9831 20.7466 55.0887 26.9776 52.2564C33.2087 49.4241 40.5018 48.0079 48.8571 48.0079C57.6372 48.0079 65.7093 49.5657 73.0732 52.6812C80.5788 55.6551 86.6683 60.116 91.3416 66.0638L72.8608 84.757C69.6037 80.9334 65.9217 78.2427 61.8149 76.6849C57.8497 75.1272 53.9553 74.3483 50.1316 74.3483C46.4497 74.3483 43.6882 74.9147 41.8472 76.0477C40.0062 77.039 39.0857 78.5259 39.0857 80.5085C39.0857 82.6328 40.2894 84.3321 42.6969 85.6067C45.1043 86.8812 48.2198 88.0141 52.0434 89.0054C55.867 89.9967 59.9031 91.2004 64.1515 92.6166C68.4 94.0327 72.436 95.9445 76.2596 98.352C80.0832 100.759 83.1987 104.017 85.6062 108.123C88.0136 112.089 89.2173 117.328 89.2173 123.843C89.2173 133.897 85.3937 141.899 77.7465 147.846C70.241 153.794 60.0447 156.768 47.1577 156.768Z" fill={wordmarkColor}/>
        <path d="M176.517 154.219V95.3776C176.517 89.9962 174.817 85.677 171.419 82.4198C168.161 79.0211 163.984 77.3217 158.886 77.3217C155.345 77.3217 152.23 78.1006 149.539 79.6583C146.848 81.0745 144.724 83.1987 143.166 86.031C141.609 88.7217 140.83 91.8372 140.83 95.3776L128.297 89.2173C128.297 81.1453 129.996 74.0646 133.395 67.9751C136.794 61.8857 141.538 57.2124 147.627 53.9552C153.717 50.5565 160.727 48.8571 168.657 48.8571C176.729 48.8571 183.81 50.5565 189.899 53.9552C195.989 57.2124 200.662 61.8149 203.919 67.7627C207.318 73.5689 209.017 80.3664 209.017 88.1552V154.219H176.517ZM108.329 154.219V1.06148e-05H140.83V154.219H108.329Z" fill={wordmarkColor}/>
        <path d="M281.818 156.555C271.197 156.555 261.567 154.218 252.929 149.545C244.432 144.73 237.705 138.216 232.749 130.002C227.792 121.788 225.314 112.583 225.314 102.387C225.314 92.1908 227.792 83.0566 232.749 74.9846C237.705 66.9126 244.432 60.5399 252.929 55.8666C261.426 51.0517 271.056 48.6442 281.818 48.6442C292.581 48.6442 302.211 50.9809 310.708 55.6542C319.205 60.3275 325.931 66.7709 330.888 74.9846C335.844 83.0566 338.323 92.1908 338.323 102.387C338.323 112.583 335.844 121.788 330.888 130.002C325.931 138.216 319.205 144.73 310.708 149.545C302.211 154.218 292.581 156.555 281.818 156.555ZM281.818 127.028C286.492 127.028 290.598 126.037 294.139 124.054C297.679 121.93 300.37 119.027 302.211 115.345C304.193 111.521 305.185 107.202 305.185 102.387C305.185 97.5722 304.193 93.3945 302.211 89.8542C300.228 86.1722 297.467 83.3399 293.926 81.3573C290.528 79.233 286.492 78.1709 281.818 78.1709C277.287 78.1709 273.251 79.233 269.71 81.3573C266.17 83.3399 263.408 86.1722 261.426 89.8542C259.443 93.5361 258.452 97.7846 258.452 102.599C258.452 107.273 259.443 111.521 261.426 115.345C263.408 119.027 266.17 121.93 269.71 124.054C273.251 126.037 277.287 127.028 281.818 127.028Z" fill={wordmarkColor}/>
        <path d="M354.503 154.219V50.9814H387.004V154.219H354.503ZM387.004 97.5019L373.409 86.8808C376.1 74.8435 380.631 65.4969 387.004 58.841C393.377 52.1851 402.228 48.8572 413.557 48.8572C418.513 48.8572 422.833 49.636 426.515 51.1938C430.338 52.61 433.666 54.8758 436.498 57.9913L417.168 82.4199C415.752 80.8621 413.982 79.6584 411.857 78.8087C409.733 77.959 407.326 77.5342 404.635 77.5342C399.254 77.5342 394.934 79.2335 391.677 82.6323C388.562 85.8894 387.004 90.846 387.004 97.5019Z" fill={wordmarkColor}/>
        <path d="M469.727 154.219V8.28468H502.227V154.219H469.727ZM446.36 78.5964V50.9816H525.594V78.5964H446.36Z" fill={wordmarkColor}/>
        <path d="M592.198 156.555C581.577 156.555 571.947 154.218 563.309 149.545C554.67 144.872 547.873 138.428 542.916 130.214C537.96 122.001 535.481 112.796 535.481 102.599C535.481 92.2616 537.96 83.0566 542.916 74.9846C548.014 66.7709 554.883 60.3275 563.521 55.6542C572.16 50.9809 581.86 48.6442 592.623 48.6442C600.695 48.6442 608.059 50.0604 614.715 52.8927C621.512 55.5834 627.531 59.6902 632.771 65.2132L611.953 86.0306C609.546 83.3399 606.714 81.3573 603.456 80.0827C600.341 78.8082 596.73 78.1709 592.623 78.1709C587.95 78.1709 583.772 79.233 580.09 81.3573C576.55 83.3399 573.717 86.1722 571.593 89.8542C569.611 93.3945 568.619 97.5722 568.619 102.387C568.619 107.202 569.611 111.45 571.593 115.132C573.717 118.814 576.62 121.717 580.302 123.842C583.984 125.966 588.091 127.028 592.623 127.028C596.871 127.028 600.624 126.32 603.881 124.904C607.28 123.346 610.183 121.222 612.591 118.531L633.196 139.349C627.814 145.013 621.725 149.332 614.927 152.306C608.13 155.139 600.553 156.555 592.198 156.555Z" fill={wordmarkColor}/>
        <path d="M697.243 156.556C687.755 156.556 679.329 154.644 671.965 150.82C664.742 146.855 659.078 141.474 654.971 134.676C650.864 127.737 648.811 119.807 648.811 110.885V50.9818H681.311V110.46C681.311 114 681.878 117.045 683.011 119.594C684.285 122.143 686.126 124.126 688.534 125.542C690.941 126.958 693.844 127.666 697.243 127.666C702.058 127.666 705.882 126.179 708.714 123.205C711.546 120.09 712.962 115.841 712.962 110.46V50.9818H745.463V110.672C745.463 119.736 743.409 127.737 739.303 134.676C735.196 141.474 729.531 146.855 722.309 150.82C715.086 154.644 706.731 156.556 697.243 156.556Z" fill={wordmarkColor}/>
        <path d="M786.444 154.219V8.28468H818.945V154.219H786.444ZM763.078 78.5964V50.9816H842.311V78.5964H763.078Z" fill={wordmarkColor}/>
      </g>
    </svg>
  );
}

type ViewMode = 'grid' | 'single' | 'recharge-station' | 'lounge-backdrop' | 'booth-context';

export default function WorkhumanBoothDesigns() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<ColorScheme>('coral');

  const panels = buildPanels(colorScheme);

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-[#003756] text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-1">
                Workhuman Live 2026
              </p>
              <h1 className="text-3xl font-extrabold tracking-[-0.02em]">
                Booth Design System
              </h1>
              <p className="text-base opacity-70 mt-2">
                5 massage stations (2 left, 3 right) — 3-4 privacy screens as dividers
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="opacity-60">Order deadline:</span>
              <span className="bg-[#FF5050] px-3 py-1 rounded-full font-bold">April 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* View mode */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#003756] opacity-60">View:</span>
            <div className="flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
              {(['grid', 'single', 'recharge-station', 'lounge-backdrop', 'booth-context'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-[#003756] text-white'
                      : 'text-[#003756] hover:bg-gray-100'
                  }`}
                >
                  {mode === 'grid' ? 'Privacy Screens' : mode === 'single' ? 'Full Size' : mode === 'recharge-station' ? 'Recharge Station' : mode === 'lounge-backdrop' ? 'Lounge Backdrop' : 'Booth Layout'}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Color scheme selector — only for privacy screen views */}
        {(viewMode === 'grid' || viewMode === 'single') && (
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-[#003756]">Color Scheme:</span>
            <span className="text-xs text-[#003756] opacity-50">
              {colorSchemes[colorScheme].description}
            </span>
          </div>
          <div className="flex gap-2">
            {(Object.keys(colorSchemes) as ColorScheme[]).map(scheme => (
              <button
                key={scheme}
                onClick={() => setColorScheme(scheme)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
                  colorScheme === scheme
                    ? 'border-[#003756] shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 border border-gray-200"
                  style={{
                    background: colorSchemes[scheme].swatch,
                  }}
                />
                <span className="text-[#003756]">{colorSchemes[scheme].label}</span>
              </button>
            ))}
          </div>

        </div>
        )}
      </div>

      {/* Panel Grid View */}

      {viewMode === 'grid' && (
        <div className="max-w-7xl mx-auto px-6 pb-12">
          {/* Panel designs — pick 3-4 for screens */}
          <div className="mb-8">
            <p className="text-sm text-[#003756] opacity-60 mb-6">
              7 copy options — choose 3-4 for your screens. Toggle color schemes above to compare.
            </p>
            <div className="flex flex-wrap gap-6 pb-4">
              {panels.map(panel => (
                <div key={panel.id}>
                  <div className="mb-2 ml-1">
                    <span className="text-xs font-bold text-[#003756] opacity-40 uppercase tracking-wider">
                      Option {panel.screenNumber}
                    </span>
                  </div>
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedPanel(panel.id);
                      setViewMode('single');
                    }}
                  >
                    <PanelPreview panel={panel} scale={0.3} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specs */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mt-8">
            <h3 className="text-lg font-bold text-[#003756] mb-4">Print Specifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="font-semibold text-[#003756]">Format</p>
                <p className="text-[#003756] opacity-60">Retractable banner</p>
              </div>
              <div>
                <p className="font-semibold text-[#003756]">Size</p>
                <p className="text-[#003756] opacity-60">33.5" × 80" (850mm × 2000mm)</p>
              </div>
              <div>
                <p className="font-semibold text-[#003756]">Material</p>
                <p className="text-[#003756] opacity-60">Premium vinyl or fabric</p>
              </div>
              <div>
                <p className="font-semibold text-[#003756]">Finish</p>
                <p className="text-[#003756] opacity-60">Matte (reduces glare under event lighting)</p>
              </div>
              <div>
                <p className="font-semibold text-[#003756]">Font</p>
                <p className="text-[#003756] opacity-60">Outfit ExtraBold (800)</p>
              </div>
              <div>
                <p className="font-semibold text-[#003756]">Brand Colors</p>
                <div className="flex gap-1.5 mt-1">
                  {['#FF5050', '#003756', '#9EFAFF', '#F7BBFF', '#FEDC64'].map(c => (
                    <div
                      key={c}
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold text-[#003756]">Quantity</p>
                <p className="text-[#003756] opacity-60">3-4 screens (single-sided)</p>
              </div>
              <div>
                <p className="font-semibold text-[#003756]">Bleed</p>
                <p className="text-[#003756] opacity-60">0.25" all sides</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Station View */}
      {viewMode === 'recharge-station' && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-10 items-start">

            {/* Orthographic views — front + side */}
            <div className="space-y-6">
              {/* Front view */}
              <div>
                <p className="text-xs font-bold text-[#003756] opacity-40 uppercase tracking-wider mb-2">Front View</p>
                <svg width="420" height="220" viewBox="0 0 420 220" fill="none">
                  {/* Table body */}
                  <rect x="10" y="10" width="400" height="16" rx="2" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                  <rect x="10" y="26" width="400" height="160" rx="0" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                  {/* Coral inner cavity visible through open bottom */}
                  <rect x="18" y="26" width="384" height="152" fill="#FF5050" rx="0" />
                  {/* Inner top shadow */}
                  <rect x="18" y="26" width="384" height="8" fill="#E04545" />
                  {/* Copy on front face */}
                  <text x="210" y="100" textAnchor="middle" fontFamily="Outfit, system-ui" fontWeight="800" fontSize="18" fill="#FFFFFF">Currently recharging.</text>
                  <text x="210" y="124" textAnchor="middle" fontFamily="Outfit, system-ui" fontWeight="800" fontSize="18" fill="#FFFFFF">Both of you.</text>
                  {/* Logo placeholder */}
                  <text x="350" y="166" textAnchor="end" fontFamily="Outfit, system-ui" fontWeight="700" fontSize="11" fill="#FFFFFF" opacity="0.8">shortcut</text>
                  {/* Floor line */}
                  <line x1="0" y1="210" x2="420" y2="210" stroke="#E5E7EB" strokeWidth="1" />
                  {/* Dimension labels */}
                  <text x="210" y="205" textAnchor="middle" fontFamily="system-ui" fontSize="10" fill="#9CA3AF">48"</text>
                </svg>
              </div>

              {/* Side view */}
              <div>
                <p className="text-xs font-bold text-[#003756] opacity-40 uppercase tracking-wider mb-2">Side View</p>
                <svg width="260" height="220" viewBox="0 0 260 220" fill="none">
                  {/* Table top */}
                  <rect x="30" y="10" width="120" height="16" rx="2" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                  {/* Left side panel */}
                  <rect x="30" y="26" width="16" height="160" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                  {/* Right side panel */}
                  <rect x="134" y="26" width="16" height="160" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                  {/* Inner cavity — coral */}
                  <rect x="46" y="26" width="88" height="160" fill="#FF5050" />
                  {/* Open bottom — shows floor through gap */}
                  <rect x="46" y="186" width="88" height="24" fill="#F8F9FA" />
                  {/* Stool */}
                  <ellipse cx="210" cy="90" rx="22" ry="4" fill="#D4A574" />
                  <line x1="195" y1="94" x2="191" y2="208" stroke="#D4A574" strokeWidth="3" strokeLinecap="round" />
                  <line x1="225" y1="94" x2="229" y2="208" stroke="#D4A574" strokeWidth="3" strokeLinecap="round" />
                  <line x1="210" y1="94" x2="210" y2="208" stroke="#D4A574" strokeWidth="3" strokeLinecap="round" />
                  <line x1="194" y1="170" x2="226" y2="170" stroke="#D4A574" strokeWidth="2" strokeLinecap="round" />
                  {/* Floor line */}
                  <line x1="0" y1="210" x2="260" y2="210" stroke="#E5E7EB" strokeWidth="1" />
                  {/* Dimension labels */}
                  <text x="90" y="205" textAnchor="middle" fontFamily="system-ui" fontSize="10" fill="#9CA3AF">18"</text>
                  <text x="16" y="110" textAnchor="middle" fontFamily="system-ui" fontSize="10" fill="#9CA3AF" transform="rotate(-90, 16, 110)">42"</text>
                </svg>
              </div>
            </div>

            {/* Right column: Front face flat design + specs */}
            <div className="flex-1 space-y-6">
              {/* Front face signage design */}
              <div>
                <p className="text-xs font-bold text-[#003756] opacity-40 uppercase tracking-wider mb-2">Front Face Signage</p>
                <div style={{ width: '100%', maxWidth: 440, height: 200 }}>
                  <div
                    className="relative w-full h-full overflow-hidden"
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB' }}
                  >
                    <div className="absolute bottom-0 left-0 right-0" style={{ height: 40, backgroundColor: '#FF5050', borderRadius: '0 0 8px 8px' }} />
                    <div className="absolute" style={{ top: '14%', left: '6%', right: '6%' }}>
                      <p className="font-extrabold leading-[1.08] tracking-[-0.02em]" style={{ fontSize: 28, fontFamily: 'Outfit, system-ui, sans-serif', color: '#003756' }}>
                        Currently recharging. Both of you.
                      </p>
                    </div>
                    <div className="absolute" style={{ bottom: 52, right: '6%' }}>
                      <ShortcutLogo variant="coral" size={20} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Specs */}
              <div>
                <p className="text-xs font-bold text-[#003756] opacity-40 uppercase tracking-wider mb-2">Specifications</p>
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-sm space-y-2.5">
                  {[
                    ['Dimensions', '48"W × 18"D × 42"H (bar height)'],
                    ['Top + front', 'White laminate'],
                    ['Inner cavity', 'Coral (#FF5050)'],
                    ['Front signage', 'Vinyl copy + logo on white face'],
                    ['Charging', 'Recessed USB-C + Lightning ports in top'],
                    ['Stools', '3-4 natural wood bar stools'],
                    ['Copy', '"Currently recharging. Both of you."'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[#003756] opacity-60">{label}</span>
                      <span className="font-semibold text-[#003756]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Lounge Backdrop View */}
      {viewMode === 'lounge-backdrop' && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-sm text-[#003756] opacity-60 mb-8">
            Backdrop wall behind the lounge area. High-level brand messaging — explains what Shortcut does. Inspired by Instacart's bold color-blocked walls with oversized brand elements.
          </p>

          <div className="space-y-10">

            {/* Option A: Navy wall + white copy panel (Instacart corner style) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#FF5050] uppercase tracking-wider">Option A</span>
                <span className="text-sm font-bold text-[#003756]">— Two-Panel Corner (Navy + White)</span>
              </div>
              <p className="text-xs text-[#003756] opacity-50 mb-4">Like Instacart's corner lounge — dark brand wall with oversized icon, white wall with copy + QR. Couch sits in the corner.</p>
              <div className="flex rounded-lg overflow-hidden" style={{ height: 480 }}>
                {/* White panel — copy + QR */}
                <div className="relative flex-1" style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}>
                  <div className="absolute" style={{ top: 24, left: 24 }}>
                    <ShortcutLogo variant="navy" size={20} />
                  </div>
                  <div className="absolute" style={{ top: 70, left: 24, right: 24 }}>
                    <p className="font-extrabold text-2xl leading-[1.1] tracking-[-0.02em]" style={{ color: '#003756', fontFamily: 'Outfit, system-ui, sans-serif' }}>
                      From massage and beauty to headshots and mindfulness.
                    </p>
                    <p className="font-extrabold text-lg mt-2 tracking-[-0.02em]" style={{ color: '#FF5050', fontFamily: 'Outfit, system-ui, sans-serif' }}>
                      One platform. One vendor. Zero hassle.
                    </p>
                  </div>
                  {/* QR code */}
                  <div className="absolute" style={{ bottom: 24, left: 24 }}>
                    <div style={{ width: 64, height: 64, background: 'repeating-conic-gradient(#003756 0% 25%, #FFFFFF 0% 50%) 50% / 8px 8px', borderRadius: 4, border: '2px solid #E5E7EB' }} />
                    <p className="text-[9px] font-semibold mt-1" style={{ color: '#003756', opacity: 0.5 }}>Book a session</p>
                  </div>
                </div>
                {/* Navy panel — oversized icon + pattern */}
                <div className="relative flex-1" style={{ backgroundColor: '#003756' }}>
                  {/* Large Shortcut icon only (no wordmark) */}
                  <svg className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} width="160" height="160" viewBox="0 0 285 192" fill="none" opacity="0.15">
                    <path fillRule="evenodd" clipRule="evenodd" d="M180.085 123.273C178.523 136.95 174.332 150.363 166.404 161.789C147.666 188.794 115.391 197.809 83.505 187.975C52.0357 178.27 21.5169 150.798 0 106.28L29.4336 92.0535C48.1724 130.823 72.6235 150.408 93.1396 156.736C113.239 162.935 129.965 156.958 139.545 143.152C141.253 140.691 142.721 137.91 143.935 134.846C142.091 134.947 140.246 134.979 138.402 134.945C117.189 134.548 97.7708 125.343 83.1568 112.659C68.6417 100.062 57.4983 82.8406 54.2488 64.5611C50.855 45.4703 56.3132 25.3828 74.6228 11.3512C83.191 4.78496 92.5896 0.887791 102.475 0.134123C112.334 -0.61748 121.541 1.84316 129.627 6.17627C145.351 14.6033 157.577 30.4138 165.925 47.3746C171.212 58.1174 175.313 70.0533 177.861 82.3164C192.547 66.6019 208.52 57.2563 222.041 52.0055C229.027 49.2927 235.456 47.6337 240.848 46.7633C245.575 46.0002 251.284 45.5405 256.04 46.6381L248.689 78.4922C249.256 78.6231 249.56 78.669 249.56 78.669C249.558 78.6929 248.483 78.6453 246.058 79.0368C243.004 79.5298 238.792 80.5701 233.876 82.4796C224.082 86.2829 211.873 93.3814 200.548 105.942C194.094 113.1 187.222 118.845 180.085 123.273ZM147.727 101.517C146.5 87.8421 142.494 73.7985 136.594 61.8105C129.869 48.148 121.609 38.9693 114.185 34.9907C110.696 33.1211 107.663 32.5248 104.96 32.7309C102.284 32.9349 98.8002 34.0099 94.5082 37.2992C87.0974 42.9785 84.9004 50.2039 86.4355 58.8393C88.1148 68.2858 94.4842 79.2038 104.585 87.9699C114.586 96.6501 126.886 102.033 139.013 102.259C141.841 102.312 144.754 102.088 147.727 101.517Z" fill="#9EFAFF"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M227.95 60.6342C212.285 55.7034 200.552 45.6102 190.79 34.575L215.742 12.5006C223.559 21.3371 230.444 26.4925 237.953 28.8562C245.287 31.1646 255.432 31.4939 271.035 26.2883L284.604 56.5339C273.057 63.1664 266.67 73.9685 263.648 85.1433C262.14 90.7193 261.573 96.0733 261.599 100.426C261.625 104.815 262.24 107.049 262.315 107.323C262.322 107.346 262.322 107.35 262.322 107.35L231.654 120.365C229.232 114.657 228.325 107.44 228.284 100.627C228.241 93.4035 229.161 85.049 231.488 76.4463C232.7 71.9629 234.323 67.3261 236.435 62.7047C233.55 62.1969 230.724 61.5071 227.95 60.6342Z" fill="#9EFAFF"/>
                  </svg>
                  {/* Decorative wellness line-art elements */}
                  <svg className="absolute opacity-10" style={{ top: 20, right: 20 }} width="60" height="60" viewBox="0 0 60 60" fill="none">
                    <circle cx="30" cy="30" r="28" stroke="#9EFAFF" strokeWidth="1.5" fill="none" />
                    <path d="M30 10 C30 10 20 25 30 30 C40 25 30 10 30 10Z" stroke="#9EFAFF" strokeWidth="1.5" fill="none" />
                    <path d="M30 50 C30 50 20 35 30 30 C40 35 30 50 30 50Z" stroke="#9EFAFF" strokeWidth="1.5" fill="none" />
                  </svg>
                  <svg className="absolute opacity-10" style={{ bottom: 30, left: 20 }} width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 5 L25 15 L35 15 L27 22 L30 32 L20 26 L10 32 L13 22 L5 15 L15 15Z" stroke="#9EFAFF" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Option B: Navy wall with mounted TV */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#FF5050] uppercase tracking-wider">Option B</span>
                <span className="text-sm font-bold text-[#003756]">— Navy Wall + Mounted TV</span>
              </div>
              <p className="text-xs text-[#003756] opacity-50 mb-4">Bold navy backdrop with TV running content loop. Copy and logo flanking the screen. Like Instacart's digital kiosk wall.</p>
              <div className="relative overflow-hidden rounded-lg mx-auto" style={{ width: 480, height: 480, backgroundColor: '#003756' }}>
                <div className="absolute" style={{ top: 24, left: 32 }}>
                  <ShortcutLogo variant="white" size={28} />
                </div>
                {/* TV */}
                <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 240, height: 140, backgroundColor: '#1a1a1a', borderRadius: 8, border: '4px solid #222', boxShadow: '0 0 30px rgba(158,250,255,0.15)', overflow: 'hidden' }}>
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#002a44' }}>
                    <div className="text-center">
                      <p className="text-white font-extrabold text-sm">Content Loop</p>
                      <p className="text-[10px] mt-1" style={{ color: '#9EFAFF' }}>Copy slides / QR / Video / Stats</p>
                    </div>
                  </div>
                </div>
                {/* Copy below TV */}
                <div className="absolute" style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <p className="font-extrabold text-base tracking-[-0.01em]" style={{ color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    Wellness that actually works for your team.
                  </p>
                </div>
              </div>
            </div>

            {/* Option C: Coral wall — short services line */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#FF5050] uppercase tracking-wider">Option C</span>
                <span className="text-sm font-bold text-[#003756]">— Coral Wall + Services Line</span>
              </div>
              <p className="text-xs text-[#003756] opacity-50 mb-4">Bold coral wall — maximum brand visibility. Short services description. Matches privacy screen energy.</p>
              <div className="relative overflow-hidden rounded-lg mx-auto" style={{ width: 480, height: 480, backgroundColor: '#FF5050' }}>
                <div className="absolute" style={{ top: 30, left: 32 }}>
                  <ShortcutLogo variant="white" size={32} />
                </div>
                <div className="absolute" style={{ top: '50%', left: 32, right: 32, transform: 'translateY(-50%)' }}>
                  <p className="font-extrabold text-2xl leading-[1.1] tracking-[-0.02em]" style={{ color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    From massage and beauty to headshots and mindfulness. One platform. One vendor. Zero hassle.
                  </p>
                </div>
                <div className="absolute" style={{ bottom: 24, left: 32 }}>
                  <p className="text-sm font-semibold" style={{ color: '#FFFFFF', opacity: 0.7 }}>getshortcut.co</p>
                </div>
              </div>
            </div>

            {/* Option D: Navy wall — full description */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#FF5050] uppercase tracking-wider">Option D</span>
                <span className="text-sm font-bold text-[#003756]">— Navy Wall + Full Description</span>
              </div>
              <p className="text-xs text-[#003756] opacity-50 mb-4">Full Shortcut pitch on the wall. More text but tells the complete story.</p>
              <div className="relative overflow-hidden rounded-lg mx-auto" style={{ width: 480, height: 480, backgroundColor: '#003756' }}>
                <div className="absolute" style={{ top: 30, left: 32 }}>
                  <ShortcutLogo variant="white" size={32} />
                </div>
                <div className="absolute" style={{ top: '48%', left: 32, right: 32, transform: 'translateY(-50%)' }}>
                  <p className="font-extrabold text-lg leading-[1.2] tracking-[-0.01em] mb-3" style={{ color: '#FFFFFF', fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    Shortcut creates happier, more energized teams through on-site and virtual wellness experiences, including massage, beauty, headshots, mindfulness and more.
                  </p>
                  <p className="font-extrabold text-xl tracking-[-0.02em]" style={{ color: '#9EFAFF', fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    One platform. One vendor. Zero hassle.
                  </p>
                </div>
                <div className="absolute" style={{ bottom: 24, left: 32 }}>
                  <p className="text-sm font-semibold" style={{ color: '#FFFFFF', opacity: 0.5 }}>getshortcut.co</p>
                </div>
              </div>
            </div>

            {/* Option E: White wall — clean, website-style */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#FF5050] uppercase tracking-wider">Option E</span>
                <span className="text-sm font-bold text-[#003756]">— White Clean (Website Style)</span>
              </div>
              <p className="text-xs text-[#003756] opacity-50 mb-4">Clean white wall like the landing page hero. Navy text, coral accents. Premium and approachable.</p>
              <div className="relative overflow-hidden rounded-lg mx-auto" style={{ width: 480, height: 480, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <div className="absolute" style={{ top: 30, left: 32 }}>
                  <ShortcutLogo variant="navy" size={32} />
                </div>
                <div className="absolute" style={{ top: '45%', left: 32, right: 32, transform: 'translateY(-50%)' }}>
                  <p className="font-extrabold text-3xl leading-[1.1] tracking-[-0.02em]" style={{ color: '#003756', fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    Wellness that actually works for your team.
                  </p>
                  <p className="text-sm leading-[1.5] mt-3" style={{ color: '#003756', opacity: 0.6 }}>
                    We bring the spa, salon, and studio directly to your office. No scheduling headaches — just wellness your team actually wants.
                  </p>
                </div>
                <div className="absolute flex items-center gap-6" style={{ bottom: 24, left: 32 }}>
                  <div style={{ width: 48, height: 48, background: 'repeating-conic-gradient(#003756 0% 25%, #FFFFFF 0% 50%) 50% / 6px 6px', borderRadius: 4, border: '1px solid #E5E7EB' }} />
                  <p className="text-xs font-semibold" style={{ color: '#003756', opacity: 0.5 }}>Scan to learn more</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Single Panel View */}
      {viewMode === 'single' && (
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <div className="flex gap-8">
            {/* Panel selector sidebar */}
            <div className="w-48 flex-shrink-0">
              <p className="text-xs font-bold text-[#003756] opacity-40 uppercase tracking-wider mb-3">
                Select Panel
              </p>
              <div className="flex flex-col gap-2">
                {panels.map(panel => (
                  <button
                    key={panel.id}
                    onClick={() => setSelectedPanel(panel.id)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      selectedPanel === panel.id
                        ? 'bg-[#003756] text-white font-bold'
                        : 'bg-white text-[#003756] hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: panel.backgroundColor }}
                      />
                      <span>Option {panel.screenNumber}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Full-size panel */}
            <div className="flex-1 flex justify-center">
              {selectedPanel ? (
                <div className="flex flex-col items-center">
                  {(() => {
                    const panel = panels.find(p => p.id === selectedPanel)!;
                    return (
                      <>
                        <div className="mb-4 text-center">
                          <h2 className="text-lg font-bold text-[#003756]">
                            Option {panel.screenNumber}
                          </h2>
                          <p className="text-sm text-[#003756] opacity-50 mt-1">
                            {panel.backgroundColor}
                          </p>
                        </div>
                        <div className="shadow-2xl rounded-lg overflow-hidden">
                          <PanelPreview panel={panel} scale={0.7} />
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-[#003756] opacity-40">
                  <p>Select a panel from the sidebar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booth Context View */}
      {viewMode === 'booth-context' && (
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <h2 className="text-xl font-bold text-[#003756] mb-2">Booth Layout — Top-Down View</h2>
            <p className="text-sm text-[#003756] opacity-60 mb-8">
              5 massage stations (2 left, 3 right). Privacy screens sit as dividers between stations. Coral faces point toward center aisle.
            </p>

            {/* Schematic top-down layout */}
            <div className="relative mx-auto" style={{ width: 800, height: 580 }}>
              {/* Back wall */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  top: 0, left: 40, right: 40, height: 60,
                  backgroundColor: '#D4A574',
                  borderRadius: '8px 8px 0 0',
                  border: '2px solid #B8956A',
                }}
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-b from-[#FFB347] to-[#FF8C00] mb-1" />
                  <span className="text-xs font-bold text-white">Back Wall + Sunrise + Logo</span>
                </div>
              </div>

              {/* LEFT SIDE: 2 stations with 1 screen divider between them */}
              {/* Left wall reference */}
              <div className="absolute text-[9px] font-bold text-[#003756] opacity-20 uppercase tracking-wider"
                style={{ left: 45, top: 70 }}>Left wall</div>

              {/* Station L1 */}
              <div className="absolute" style={{ left: 55, top: 95 }}>
                <div className="w-10 h-14 bg-gray-300 rounded-md flex items-center justify-center text-[7px] text-gray-600">💆</div>
                <div className="text-[8px] text-center text-[#003756] opacity-40 mt-1">Stn 1</div>
              </div>

              {/* Screen between L1 and L2 (perpendicular to wall) */}
              <div className="absolute" style={{ left: 50, top: 165 }}>
                <div className="flex">
                  <div style={{ width: 8, height: 70, backgroundColor: '#003756', borderRadius: '3px 0 0 3px' }} />
                  <div style={{ width: 8, height: 70, backgroundColor: '#FF5050', borderRadius: '0 3px 3px 0' }} />
                </div>
                <div className="text-[7px] text-center text-[#003756] opacity-50 mt-1 -ml-2 w-20">Screen 1</div>
              </div>

              {/* Station L2 */}
              <div className="absolute" style={{ left: 55, top: 245 }}>
                <div className="w-10 h-14 bg-gray-300 rounded-md flex items-center justify-center text-[7px] text-gray-600">💆</div>
                <div className="text-[8px] text-center text-[#003756] opacity-40 mt-1">Stn 2</div>
              </div>

              {/* RIGHT SIDE: 3 stations with 2 screen dividers between them */}
              <div className="absolute text-[9px] font-bold text-[#003756] opacity-20 uppercase tracking-wider"
                style={{ right: 45, top: 70 }}>Right wall</div>

              {/* Station R1 */}
              <div className="absolute" style={{ right: 55, top: 95 }}>
                <div className="w-10 h-14 bg-gray-300 rounded-md flex items-center justify-center text-[7px] text-gray-600">💆</div>
                <div className="text-[8px] text-center text-[#003756] opacity-40 mt-1">Stn 3</div>
              </div>

              {/* Screen between R1 and R2 */}
              <div className="absolute" style={{ right: 50, top: 165 }}>
                <div className="flex">
                  <div style={{ width: 8, height: 70, backgroundColor: '#FF5050', borderRadius: '3px 0 0 3px' }} />
                  <div style={{ width: 8, height: 70, backgroundColor: '#003756', borderRadius: '0 3px 3px 0' }} />
                </div>
                <div className="text-[7px] text-center text-[#003756] opacity-50 mt-1 -ml-2 w-20">Screen 2</div>
              </div>

              {/* Station R2 */}
              <div className="absolute" style={{ right: 55, top: 245 }}>
                <div className="w-10 h-14 bg-gray-300 rounded-md flex items-center justify-center text-[7px] text-gray-600">💆</div>
                <div className="text-[8px] text-center text-[#003756] opacity-40 mt-1">Stn 4</div>
              </div>

              {/* Screen between R2 and R3 */}
              <div className="absolute" style={{ right: 50, top: 315 }}>
                <div className="flex">
                  <div style={{ width: 8, height: 70, backgroundColor: '#FF5050', borderRadius: '3px 0 0 3px' }} />
                  <div style={{ width: 8, height: 70, backgroundColor: '#003756', borderRadius: '0 3px 3px 0' }} />
                </div>
                <div className="text-[7px] text-center text-[#003756] opacity-50 mt-1 -ml-2 w-20">Screen 3</div>
              </div>

              {/* Station R3 */}
              <div className="absolute" style={{ right: 55, top: 395 }}>
                <div className="w-10 h-14 bg-gray-300 rounded-md flex items-center justify-center text-[7px] text-gray-600">💆</div>
                <div className="text-[8px] text-center text-[#003756] opacity-40 mt-1">Stn 5</div>
              </div>

              {/* Center open area label */}
              <div className="absolute flex items-center justify-center text-[11px] font-semibold text-[#003756] opacity-20"
                style={{ left: 200, right: 200, top: 180, height: 100 }}>
                <div className="text-center">
                  <div className="text-lg">↔</div>
                  <div>Open center</div>
                  <div className="text-[9px]">(back wall visible)</div>
                </div>
              </div>

              {/* Front-left: Lounge + TV */}
              <div
                className="absolute flex flex-col items-center justify-center text-[10px] font-semibold text-[#003756]"
                style={{
                  left: 30, bottom: 30, width: 170, height: 100,
                  backgroundColor: '#FFF0EC',
                  borderRadius: 12,
                  border: '2px dashed #FF505050',
                }}
              >
                <span>🛋️ Lounge + TV</span>
                <span className="opacity-50">Chairs + coffee table</span>
              </div>

              {/* Front-right: Check-in + Charging */}
              <div
                className="absolute flex flex-col items-center justify-center text-[10px] font-semibold text-[#003756]"
                style={{
                  right: 30, bottom: 30, width: 170, height: 100,
                  backgroundColor: '#E0F2F7',
                  borderRadius: 12,
                  border: '2px dashed #9EFAFF',
                }}
              >
                <span>📱 Charging Bar</span>
                <span className="opacity-50">+ Check-in Desk</span>
              </div>

              {/* Hedges */}
              <div className="absolute" style={{ left: 0, top: 50, width: 25, bottom: 20, backgroundColor: '#4CAF50', borderRadius: 8, opacity: 0.3 }} />
              <div className="absolute" style={{ right: 0, top: 50, width: 25, bottom: 20, backgroundColor: '#4CAF50', borderRadius: 8, opacity: 0.3 }} />
              <div className="absolute" style={{ left: 0, bottom: 0, right: 0, height: 18, backgroundColor: '#4CAF50', borderRadius: 8, opacity: 0.3 }} />

              {/* Legend */}
              <div className="absolute bottom-[-50px] left-0 flex gap-6 text-xs text-[#003756]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#FF5050]" />
                  <span>Outward face (coral) — visible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#003756]" />
                  <span>Back face (navy) — mostly hidden</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gray-300" />
                  <span>Massage station</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#4CAF50] opacity-30" />
                  <span>Hedges</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
