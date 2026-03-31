/**
 * Generate iOS App Store assets from the existing KinderSpark icon SVG
 * - 1024x1024 App Store icon
 * - 2732x2732 splash screen (dark purple with centered icon)
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const ASSETS = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });

function createIconSVG(size) {
  const s = size;
  const pad = s * 0.06;
  const cornerR = s * 0.22;
  const cx = s / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6C3CE6"/>
      <stop offset="45%" stop-color="#5B4FE8"/>
      <stop offset="100%" stop-color="#4A7CF7"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="50%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </linearGradient>
    <linearGradient id="pageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F0E6D4"/>
    </linearGradient>
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFD4A8"/>
      <stop offset="100%" stop-color="#FFBE8A"/>
    </linearGradient>
    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5C3D1E"/>
      <stop offset="100%" stop-color="#3D2712"/>
    </linearGradient>
    <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${s * 0.02}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${s*0.005}" stdDeviation="${s*0.01}" flood-color="#00000030"/>
    </filter>
    <filter id="twinkle">
      <feGaussianBlur stdDeviation="${s * 0.005}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <rect x="${pad}" y="${pad}" width="${s - pad*2}" height="${s - pad*2}" rx="${cornerR}" fill="url(#bg)"/>
  
  <!-- Open Book -->
  <g transform="translate(${cx}, ${s * 0.68})">
    <ellipse cx="0" cy="${s*0.05}" rx="${s*0.32}" ry="${s*0.03}" fill="rgba(0,0,0,0.15)"/>
    <path d="M${-s*0.01},${-s*0.01} C${-s*0.04},${-s*0.14} ${-s*0.12},${-s*0.19} ${-s*0.3},${-s*0.17} L${-s*0.3},${s*0.04} C${-s*0.12},${s*0.02} ${-s*0.04},${s*0.06} ${-s*0.01},${s*0.04} Z"
          fill="url(#pageGrad)" opacity="0.95"/>
    <path d="M${s*0.01},${-s*0.01} C${s*0.04},${-s*0.14} ${s*0.12},${-s*0.19} ${s*0.3},${-s*0.17} L${s*0.3},${s*0.04} C${s*0.12},${s*0.02} ${s*0.04},${s*0.06} ${s*0.01},${s*0.04} Z"
          fill="url(#pageGrad)" opacity="0.9"/>
    <line x1="0" y1="${-s*0.01}" x2="0" y2="${s*0.04}" stroke="#D4B896" stroke-width="${s*0.004}" opacity="0.6"/>
    <g opacity="0.2" stroke="#8B7355" stroke-width="${s*0.002}" stroke-linecap="round">
      <line x1="${-s*0.25}" y1="${-s*0.10}" x2="${-s*0.06}" y2="${-s*0.07}"/>
      <line x1="${-s*0.24}" y1="${-s*0.06}" x2="${-s*0.05}" y2="${-s*0.03}"/>
      <line x1="${-s*0.23}" y1="${-s*0.02}" x2="${-s*0.04}" y2="${s*0.005}"/>
    </g>
    <g opacity="0.2" stroke="#8B7355" stroke-width="${s*0.002}" stroke-linecap="round">
      <line x1="${s*0.06}" y1="${-s*0.07}" x2="${s*0.25}" y2="${-s*0.10}"/>
      <line x1="${s*0.05}" y1="${-s*0.03}" x2="${s*0.24}" y2="${-s*0.06}"/>
      <line x1="${s*0.04}" y1="${s*0.005}" x2="${s*0.23}" y2="${-s*0.02}"/>
    </g>
  </g>
  
  <!-- Child -->
  <g transform="translate(${cx}, ${s * 0.46})" filter="url(#softShadow)">
    <ellipse cx="0" cy="${-s*0.02}" rx="${s*0.16}" ry="${s*0.17}" fill="url(#hairGrad)"/>
    <ellipse cx="0" cy="${s*0.03}" rx="${s*0.13}" ry="${s*0.13}" fill="url(#skinGrad)"/>
    <path d="M${-s*0.14},${-s*0.03} Q${-s*0.12},${-s*0.16} ${-s*0.02},${-s*0.16} Q${s*0.06},${-s*0.17} ${s*0.14},${-s*0.06} Q${s*0.1},${-s*0.14} ${s*0.02},${-s*0.14} Q${-s*0.06},${-s*0.14} ${-s*0.1},${-s*0.11} Z"
          fill="url(#hairGrad)"/>
    <ellipse cx="${-s*0.045}" cy="${s*0.01}" rx="${s*0.025}" ry="${s*0.03}" fill="#2D1B0E"/>
    <ellipse cx="${-s*0.04}" cy="${s*0.002}" rx="${s*0.009}" ry="${s*0.009}" fill="white" opacity="0.9"/>
    <ellipse cx="${s*0.045}" cy="${s*0.01}" rx="${s*0.025}" ry="${s*0.03}" fill="#2D1B0E"/>
    <ellipse cx="${s*0.05}" cy="${s*0.002}" rx="${s*0.009}" ry="${s*0.009}" fill="white" opacity="0.9"/>
    <circle cx="${-s*0.08}" cy="${s*0.06}" r="${s*0.025}" fill="#FF9999" opacity="0.4"/>
    <circle cx="${s*0.08}" cy="${s*0.06}" r="${s*0.025}" fill="#FF9999" opacity="0.4"/>
    <path d="M${-s*0.04},${s*0.07} Q0,${s*0.11} ${s*0.04},${s*0.07}" 
          fill="none" stroke="#C47A5A" stroke-width="${s*0.006}" stroke-linecap="round"/>
    <ellipse cx="0" cy="${s*0.045}" rx="${s*0.01}" ry="${s*0.007}" fill="#E8A878" opacity="0.6"/>
  </g>
  
  <!-- Golden Spark -->
  <g transform="translate(${cx + s*0.15}, ${s * 0.3})" filter="url(#sparkGlow)">
    <path d="M0,${-s*0.09} C${s*0.015},${-s*0.025} ${s*0.025},${-s*0.015} ${s*0.07},0 C${s*0.025},${s*0.015} ${s*0.015},${s*0.025} 0,${s*0.09} C${-s*0.015},${s*0.025} ${-s*0.025},${s*0.015} ${-s*0.07},0 C${-s*0.025},${-s*0.015} ${-s*0.015},${-s*0.025} 0,${-s*0.09}Z"
          fill="url(#sparkGrad)"/>
    <circle cx="0" cy="0" r="${s*0.02}" fill="#FFFBE6" opacity="0.95"/>
  </g>
  
  <!-- Sparkles -->
  <g filter="url(#twinkle)">
    <g transform="translate(${s*0.18}, ${s*0.18})">
      <path d="M0,${-s*0.02} L${s*0.005},0 L0,${s*0.02} L${-s*0.005},0 Z" fill="white" opacity="0.7"/>
      <path d="M${-s*0.02},0 L0,${s*0.005} L${s*0.02},0 L0,${-s*0.005} Z" fill="white" opacity="0.7"/>
    </g>
    <g transform="translate(${s*0.78}, ${s*0.22})">
      <path d="M0,${-s*0.015} L${s*0.004},0 L0,${s*0.015} L${-s*0.004},0 Z" fill="white" opacity="0.5"/>
      <path d="M${-s*0.015},0 L0,${s*0.004} L${s*0.015},0 L0,${-s*0.004} Z" fill="white" opacity="0.5"/>
    </g>
    <g transform="translate(${s*0.14}, ${s*0.42})">
      <path d="M0,${-s*0.012} L${s*0.003},0 L0,${s*0.012} L${-s*0.003},0 Z" fill="#FFD700" opacity="0.6"/>
      <path d="M${-s*0.012},0 L0,${s*0.003} L${s*0.012},0 L0,${-s*0.003} Z" fill="#FFD700" opacity="0.6"/>
    </g>
    <circle cx="${s*0.75}" cy="${s*0.15}" r="${s*0.006}" fill="white" opacity="0.4"/>
    <circle cx="${s*0.22}" cy="${s*0.82}" r="${s*0.005}" fill="white" opacity="0.3"/>
    <circle cx="${s*0.8}" cy="${s*0.78}" r="${s*0.004}" fill="white" opacity="0.25"/>
  </g>
  
  <!-- ABC on book -->
  <g transform="translate(${cx}, ${s * 0.68})" opacity="0.25">
    <text x="${-s*0.16}" y="${-s*0.08}" font-family="Arial,sans-serif" font-weight="800" font-size="${s*0.035}" fill="#6B5B3E" text-anchor="middle">A</text>
    <text x="${s*0.16}" y="${-s*0.08}" font-family="Arial,sans-serif" font-weight="800" font-size="${s*0.035}" fill="#6B5B3E" text-anchor="middle">B</text>
  </g>
</svg>`;
}

function createSplashSVG(width, height) {
  // Dark purple background with centered icon + app name
  const iconSize = Math.min(width, height) * 0.3;
  const cx = width / 2;
  const cy = height / 2 - height * 0.05;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="50%" stop-color="#16213e"/>
      <stop offset="100%" stop-color="#0f3460"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="50%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#splashBg)"/>
  
  <!-- Subtle stars in background -->
  ${Array.from({length: 30}, () => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 1 + Math.random() * 2;
    const opacity = 0.15 + Math.random() * 0.3;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="white" opacity="${opacity.toFixed(2)}"/>`;
  }).join('\n  ')}
  
  <!-- Central golden spark -->
  <g transform="translate(${cx}, ${cy})" filter="url(#glow)">
    <path d="M0,${-iconSize*0.5} C${iconSize*0.08},${-iconSize*0.15} ${iconSize*0.15},${-iconSize*0.08} ${iconSize*0.4},0 C${iconSize*0.15},${iconSize*0.08} ${iconSize*0.08},${iconSize*0.15} 0,${iconSize*0.5} C${-iconSize*0.08},${iconSize*0.15} ${-iconSize*0.15},${iconSize*0.08} ${-iconSize*0.4},0 C${-iconSize*0.15},${-iconSize*0.08} ${-iconSize*0.08},${-iconSize*0.15} 0,${-iconSize*0.5}Z"
          fill="url(#sparkGrad)" opacity="0.9"/>
    <circle cx="0" cy="0" r="${iconSize*0.12}" fill="#FFFBE6" opacity="0.8"/>
  </g>
  
  <!-- App name -->
  <text x="${cx}" y="${cy + iconSize * 0.7}" text-anchor="middle" font-family="'Nunito','Inter',Arial,sans-serif" font-weight="900" font-size="${Math.round(height * 0.035)}" fill="white" opacity="0.95">KinderSpark Pro</text>
  <text x="${cx}" y="${cy + iconSize * 0.7 + height * 0.04}" text-anchor="middle" font-family="'Inter',Arial,sans-serif" font-weight="500" font-size="${Math.round(height * 0.018)}" fill="white" opacity="0.5">Learning that sparks curiosity</text>
</svg>`;
}

async function main() {
  console.log('🎨 Generating iOS App Store assets...\n');

  // 1. App Store Icon (1024x1024) — Apple requires NO rounded corners, NO transparency
  const iconSvg = createIconSVG(1024);
  // Write a version with square corners for App Store
  const storeIconSvg = iconSvg.replace(/rx="[^"]*"/, 'rx="0"');
  fs.writeFileSync(path.join(ASSETS, 'icon-only.svg'), iconSvg);
  
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon-1024.png'));
  console.log('  ✅ icon-1024.png (App Store icon)');

  // Also generate the foreground version (no background) for Capacitor adaptive icon
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon-foreground.png'));
  console.log('  ✅ icon-foreground.png (foreground)');

  // 2. Splash screens for various iOS device sizes
  const splashSizes = [
    { w: 2732, h: 2732, name: 'splash-universal' },   // Universal
    { w: 1290, h: 2796, name: 'splash-iphone-15' },    // iPhone 14/15 Pro Max
    { w: 1179, h: 2556, name: 'splash-iphone-14' },    // iPhone 14 Pro
    { w: 1170, h: 2532, name: 'splash-iphone-13' },    // iPhone 13/12
    { w: 1125, h: 2436, name: 'splash-iphone-x' },     // iPhone X/XS/11 Pro
    { w: 1242, h: 2688, name: 'splash-iphone-xs-max' }, // iPhone XS Max/11 Pro Max
    { w: 828, h: 1792, name: 'splash-iphone-xr' },      // iPhone XR/11
    { w: 750, h: 1334, name: 'splash-iphone-8' },       // iPhone 8/SE
    { w: 2048, h: 2732, name: 'splash-ipad-pro' },      // iPad Pro
  ];

  for (const { w, h, name } of splashSizes) {
    const splashSvg = createSplashSVG(w, h);
    await sharp(Buffer.from(splashSvg))
      .resize(w, h)
      .png()
      .toFile(path.join(ASSETS, `${name}.png`));
    console.log(`  ✅ ${name}.png (${w}x${h})`);
  }

  // Also create the dark splash for Capacitor
  const darkSplash = createSplashSVG(2732, 2732);
  await sharp(Buffer.from(darkSplash))
    .resize(2732, 2732)
    .png()
    .toFile(path.join(ASSETS, 'splash-dark.png'));
  console.log('  ✅ splash-dark.png (dark mode)');

  console.log(`\n🎉 All assets generated in ${ASSETS}`);
  console.log('\nNext steps:');
  console.log('  1. npx cap add ios');
  console.log('  2. npx cap sync');
  console.log('  3. npx cap open ios  (opens Xcode)');
  console.log('  4. In Xcode: Set team, bundle ID, then Archive → Upload to App Store');
}

main().catch(console.error);
