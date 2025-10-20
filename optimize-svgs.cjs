#!/usr/bin/env node

const { optimize } = require('svgo');
const fs = require('fs');
const path = require('path');

// Target the specific large SVG files
const filesToOptimize = [
  'public/Holiday Proposal/Our Services/Nails/Frame 1278980.svg',
  'public/Holiday Proposal/Our Services/Headshots/Frame 1278980.svg',
  'public/Holiday Proposal/Our Services/Holiday Party Glam/Frame 1278980.svg',
  'public/Holiday Proposal/Our Services/Massage/Frame 1278980.svg',
  'public/Holiday Proposal/Our Services/Mindfulness/Courtney Frame.svg',
  'public/Holiday Proposal/Why People/Landing Page Slider 1 copy.svg',
  'public/Holiday Proposal/Why People/Landing Page Slider 2 copy.svg',
  'public/Holiday Proposal/Hero Images/Mindfulness.svg',
  'public/Holiday Proposal/Hero Images/Headshots .svg',
];

console.log('🖼️  Optimizing large SVG files...\n');

filesToOptimize.forEach((filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${filePath} (not found)`);
    return;
  }

  const originalSize = fs.statSync(filePath).size;
  const svgString = fs.readFileSync(filePath, 'utf8');

  try {
    const result = optimize(svgString, {
      path: filePath,
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              // Keep viewBox for responsive sizing
              removeViewBox: false,
              // Keep IDs for potential animations
              cleanupIds: false,
            },
          },
        },
        // Additional optimization
        'removeScriptElement',
        'removeStyleElement',
      ],
    });

    // Write the optimized SVG
    fs.writeFileSync(filePath, result.data);
    
    const newSize = fs.statSync(filePath).size;
    const savedPercent = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    const savedMB = ((originalSize - newSize) / 1024 / 1024).toFixed(2);

    console.log(`✅ ${path.basename(filePath)}`);
    console.log(`   ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(newSize / 1024 / 1024).toFixed(2)}MB (saved ${savedMB}MB / ${savedPercent}%)\n`);
  } catch (error) {
    console.error(`❌ Error optimizing ${filePath}:`, error.message);
  }
});

console.log('✨ Done!');

