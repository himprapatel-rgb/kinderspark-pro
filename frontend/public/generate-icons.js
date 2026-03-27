// Generate PWA icons from SVG
const fs = require('fs');
const path = require('path');

// Beautiful KinderSpark icon SVG
function createIconSVG(size) {
  const pad = Math.round(size * 0.1);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - pad;
  const sparkSize = Math.round(size * 0.35);
  const sparkX = cx - sparkSize / 2;
  const sparkY = cy - sparkSize / 2 - size * 0.04;
  const textSize = Math.round(size * 0.12);
  const textY = cy + size * 0.32;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5E5CE6"/>
      <stop offset="50%" stop-color="#7B61FF"/>
      <stop offset="100%" stop-color="#AF52DE"/>
    </linearGradient>
    <linearGradient id="spark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD60A"/>
      <stop offset="100%" stop-color="#FF9F0A"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.015}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <!-- Rounded square background -->
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r * 0.35}" fill="url(#bg)"/>
  <!-- Spark/star icon -->
  <g transform="translate(${cx}, ${cy - size * 0.06})" filter="url(#glow)">
    <path d="M0,${-sparkSize/2} C${sparkSize*0.12},${-sparkSize*0.15} ${sparkSize*0.15},${-sparkSize*0.12} ${sparkSize/2},0 C${sparkSize*0.15},${sparkSize*0.12} ${sparkSize*0.12},${sparkSize*0.15} 0,${sparkSize/2} C${-sparkSize*0.12},${sparkSize*0.15} ${-sparkSize*0.15},${sparkSize*0.12} ${-sparkSize/2},0 C${-sparkSize*0.15},${-sparkSize*0.12} ${-sparkSize*0.12},${-sparkSize*0.15} 0,${-sparkSize/2}Z"
          fill="url(#spark)"/>
    <!-- Inner glow circle -->
    <circle cx="0" cy="0" r="${sparkSize * 0.18}" fill="white" opacity="0.9"/>
    <!-- Small sparkles -->
    <circle cx="${sparkSize*0.35}" cy="${-sparkSize*0.35}" r="${sparkSize*0.04}" fill="white" opacity="0.8"/>
    <circle cx="${-sparkSize*0.3}" cy="${-sparkSize*0.4}" r="${sparkSize*0.03}" fill="white" opacity="0.6"/>
    <circle cx="${sparkSize*0.4}" cy="${sparkSize*0.25}" r="${sparkSize*0.03}" fill="white" opacity="0.7"/>
  </g>
  <!-- Text "KS" -->
  <text x="${cx}" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${textSize}" fill="white" text-anchor="middle" opacity="0.95">KS</text>
</svg>`;
}

// Write SVGs
[192, 512].forEach(size => {
  const svg = createIconSVG(size);
  fs.writeFileSync(path.join(__dirname, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
});

// Create a simple favicon.svg
const faviconSvg = createIconSVG(32);
fs.writeFileSync(path.join(__dirname, 'favicon.svg'), faviconSvg);
console.log('Created favicon.svg');

// Create apple-touch-icon SVG (180x180)
const appleSvg = createIconSVG(180);
fs.writeFileSync(path.join(__dirname, 'apple-touch-icon.svg'), appleSvg);
console.log('Created apple-touch-icon.svg');

console.log('\nDone! Now convert SVGs to PNGs using a tool or browser.');
