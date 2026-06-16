const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Image optimization middleware
async function optimizeImage(buffer, options = {}) {
  const {
    width = 1200,
    height = null,
    quality = 80,
    format = 'jpeg'
  } = options;

  try {
    let image = sharp(buffer);
    
    // Resize if dimensions provided
    if (width || height) {
      image = image.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Convert format and optimize
    switch (format) {
      case 'webp':
        image = image.webp({ quality });
        break;
      case 'png':
        image = image.png({ quality, compressionLevel: 9 });
        break;
      case 'jpeg':
      default:
        image = image.jpeg({ quality });
    }
    
    const optimized = await image.toBuffer();
    return optimized;
  } catch (error) {
    console.error('Image optimization error:', error);
    return buffer; // Return original if optimization fails
  }
}

// Generate multiple sizes for responsive images
async function generateResponsiveImages(buffer, filename) {
  const sizes = [
    { name: 'thumbnail', width: 150, height: 150 },
    { name: 'small', width: 400 },
    { name: 'medium', width: 800 },
    { name: 'large', width: 1200 }
  ];

  const results = {};
  const ext = path.extname(filename).replace('.', '');
  const baseName = path.basename(filename, path.extname(filename));

  for (const size of sizes) {
    try {
      const optimized = await optimizeImage(buffer, {
        width: size.width,
        height: size.height,
        quality: 80,
        format: 'webp'
      });
      results[size.name] = {
        buffer: optimized,
        filename: `${baseName}-${size.name}.webp`
      };
    } catch (error) {
      console.error(`Error generating ${size.name} size:`, error);
    }
  }

  return results;
}

// Save optimized image
async function saveOptimizedImage(buffer, outputPath, options = {}) {
  const optimized = await optimizeImage(buffer, options);
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, optimized);
  return outputPath;
}

module.exports = {
  optimizeImage,
  generateResponsiveImages,
  saveOptimizedImage
};
