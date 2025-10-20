const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  async onPostBuild({ constants }) {
    const publishDir = constants.PUBLISH_DIR;
    const imageDir = path.join(publishDir, 'Holiday Proposal');
    
    console.log('🎨 Optimizing images...');
    
    async function optimizeImages(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await optimizeImages(fullPath);
        } else if (entry.name.match(/\.(png|jpg|jpeg)$/i)) {
          try {
            const buffer = await fs.readFile(fullPath);
            const optimized = await sharp(buffer)
              .webp({ quality: 85 })
              .toBuffer();
            
            // Replace .png/.jpg with .webp
            const webpPath = fullPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
            await fs.writeFile(webpPath, optimized);
            
            console.log(`✓ Optimized: ${entry.name}`);
          } catch (err) {
            console.log(`✗ Skipped: ${entry.name} - ${err.message}`);
          }
        }
      }
    }
    
    if (await fs.access(imageDir).then(() => true).catch(() => false)) {
      await optimizeImages(imageDir);
      console.log('✅ Image optimization complete!');
    }
  }
};

