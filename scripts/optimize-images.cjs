const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function optimizeImages(dir) {
  console.log(`\n🎨 Optimizing images in: ${dir}\n`);
  
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let count = 0;
  
  async function processDirectory(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.name.match(/\.(png|jpg|jpeg)$/i) && !entry.name.includes('optimized')) {
        try {
          const stats = await fs.stat(fullPath);
          const originalSize = stats.size;
          
          // Read the image
          const buffer = await fs.readFile(fullPath);
          
          // Determine output format - keep PNG as PNG, convert JPG to WebP
          let optimized;
          let outputPath;
          
          if (entry.name.match(/\.png$/i)) {
            // Create both optimized PNG and WebP versions
            const optimizedPng = await sharp(buffer)
              .png({ quality: 85, compressionLevel: 9 })
              .toBuffer();
            
            const optimizedWebp = await sharp(buffer)
              .webp({ quality: 85 })
              .toBuffer();
            
            // Write both versions
            await fs.writeFile(fullPath, optimizedPng);
            await fs.writeFile(fullPath.replace(/\.png$/i, '.webp'), optimizedWebp);
            
            optimized = optimizedWebp; // Use WebP size for reporting
            outputPath = fullPath.replace(/\.png$/i, '.webp');
          } else {
            // Convert JPG to WebP
            optimized = await sharp(buffer)
              .webp({ quality: 85 })
              .toBuffer();
            outputPath = fullPath.replace(/\.(jpg|jpeg)$/i, '.webp');
            
            // Write optimized image
            await fs.writeFile(outputPath, optimized);
          }
          
          const optimizedSize = optimized.length;
          const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
          
          totalOriginalSize += originalSize;
          totalOptimizedSize += optimizedSize;
          count++;
          
          console.log(`✓ ${entry.name}`);
          console.log(`  ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${savings}% smaller)\n`);
          
        } catch (err) {
          console.log(`✗ Failed: ${entry.name} - ${err.message}\n`);
        }
      }
    }
  }
  
  await processDirectory(dir);
  
  const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
  
  console.log(`\n✅ Optimization Complete!`);
  console.log(`📊 Processed: ${count} images`);
  console.log(`📉 Total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB → ${(totalOptimizedSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🚀 Saved: ${totalSavings}% (${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)}MB)\n`);
}

// Optimize Holiday Proposal images
const publicDir = path.join(__dirname, '..', 'public', 'Holiday Proposal');
optimizeImages(publicDir).catch(console.error);

