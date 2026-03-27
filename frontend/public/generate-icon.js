const fs = require('fs');
const path = require('path');

/**
 * KinderSpark Pro — Meaningful Icon Design
 * 
 * Concept: A child's face peeking over an open book, with a golden spark/star
 * rising from the pages. Surrounded by a warm purple-to-blue gradient.
 * 
 * Symbolism:
 * - Child face → the user (kindergarten kids)
 * - Open book → learning & education
 * - Golden spark → the "spark" in KinderSpark (creativity, curiosity, AI magic)
 * - Warm gradient → safety, trust, fun
 * - Rounded corners → friendly, approachable
 */

function createIcon(size) {
  const s = size; // shorthand
  const pad = s * 0.06;
  const cornerR = s * 0.22;
  
  // Proportional measurements
  const cx = s / 2;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <!-- Background gradient: deep purple to indigo -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6C3CE6"/>
      <stop offset="45%" stop-color="#5B4FE8"/>
      <stop offset="100%" stop-color="#4A7CF7"/>
    </linearGradient>
    
    <!-- Golden spark gradient -->
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="50%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </linearGradient>
    
    <!-- Book page gradient (warm white) -->
    <linearGradient id="pageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F0E6D4"/>
    </linearGradient>
    
    <!-- Face skin gradient -->
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFD4A8"/>
      <stop offset="100%" stop-color="#FFBE8A"/>
    </linearGradient>
    
    <!-- Hair gradient -->
    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5C3D1E"/>
      <stop offset="100%" stop-color="#3D2712"/>
    </linearGradient>
    
    <!-- Glow filter for the spark -->
    <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${s * 0.02}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    
    <!-- Soft shadow for the child -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${s*0.005}" stdDeviation="${s*0.01}" flood-color="#00000030"/>
    </filter>
    
    <!-- Tiny star sparkle filter -->
    <filter id="twinkle">
      <feGaussianBlur stdDeviation="${s * 0.005}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <!-- ═══ Background rounded square ═══ -->
  <rect x="${pad}" y="${pad}" width="${s - pad*2}" height="${s - pad*2}" rx="${cornerR}" fill="url(#bg)"/>
  
  <!-- Subtle pattern dots for texture -->
  <g opacity="0.06">
    ${Array.from({length: 12}, (_, i) => {
      const x = pad + (s - pad*2) * (0.1 + Math.random() * 0.8);
      const y = pad + (s - pad*2) * (0.05 + Math.random() * 0.4);
      const r = s * (0.005 + Math.random() * 0.008);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="white"/>`;
    }).join('\n    ')}
  </g>
  
  <!-- ═══ Open Book ═══ -->
  <g transform="translate(${cx}, ${s * 0.68})">
    <!-- Book shadow -->
    <ellipse cx="0" cy="${s*0.05}" rx="${s*0.32}" ry="${s*0.03}" fill="rgba(0,0,0,0.15)"/>
    
    <!-- Left page -->
    <path d="M${-s*0.01},${-s*0.01} C${-s*0.04},${-s*0.14} ${-s*0.12},${-s*0.19} ${-s*0.3},${-s*0.17} L${-s*0.3},${s*0.04} C${-s*0.12},${s*0.02} ${-s*0.04},${s*0.06} ${-s*0.01},${s*0.04} Z"
          fill="url(#pageGrad)" opacity="0.95"/>
    
    <!-- Right page -->
    <path d="M${s*0.01},${-s*0.01} C${s*0.04},${-s*0.14} ${s*0.12},${-s*0.19} ${s*0.3},${-s*0.17} L${s*0.3},${s*0.04} C${s*0.12},${s*0.02} ${s*0.04},${s*0.06} ${s*0.01},${s*0.04} Z"
          fill="url(#pageGrad)" opacity="0.9"/>
    
    <!-- Book spine line -->
    <line x1="0" y1="${-s*0.01}" x2="0" y2="${s*0.04}" stroke="#D4B896" stroke-width="${s*0.004}" opacity="0.6"/>
    
    <!-- Page lines (left) -->
    <g opacity="0.2" stroke="#8B7355" stroke-width="${s*0.002}" stroke-linecap="round">
      <line x1="${-s*0.25}" y1="${-s*0.10}" x2="${-s*0.06}" y2="${-s*0.07}"/>
      <line x1="${-s*0.24}" y1="${-s*0.06}" x2="${-s*0.05}" y2="${-s*0.03}"/>
      <line x1="${-s*0.23}" y1="${-s*0.02}" x2="${-s*0.04}" y2="${s*0.005}"/>
    </g>
    
    <!-- Page lines (right) -->
    <g opacity="0.2" stroke="#8B7355" stroke-width="${s*0.002}" stroke-linecap="round">
      <line x1="${s*0.06}" y1="${-s*0.07}" x2="${s*0.25}" y2="${-s*0.10}"/>
      <line x1="${s*0.05}" y1="${-s*0.03}" x2="${s*0.24}" y2="${-s*0.06}"/>
      <line x1="${s*0.04}" y1="${s*0.005}" x2="${s*0.23}" y2="${-s*0.02}"/>
    </g>
  </g>
  
  <!-- ═══ Child peeking over the book ═══ -->
  <g transform="translate(${cx}, ${s * 0.46})" filter="url(#softShadow)">
    <!-- Hair (back) -->
    <ellipse cx="0" cy="${-s*0.02}" rx="${s*0.16}" ry="${s*0.17}" fill="url(#hairGrad)"/>
    
    <!-- Face -->
    <ellipse cx="0" cy="${s*0.03}" rx="${s*0.13}" ry="${s*0.13}" fill="url(#skinGrad)"/>
    
    <!-- Hair (bangs/fringe) -->
    <path d="M${-s*0.14},${-s*0.03} Q${-s*0.12},${-s*0.16} ${-s*0.02},${-s*0.16} Q${s*0.06},${-s*0.17} ${s*0.14},${-s*0.06} Q${s*0.1},${-s*0.14} ${s*0.02},${-s*0.14} Q${-s*0.06},${-s*0.14} ${-s*0.1},${-s*0.11} Z"
          fill="url(#hairGrad)"/>
    
    <!-- Left eye -->
    <ellipse cx="${-s*0.045}" cy="${s*0.01}" rx="${s*0.025}" ry="${s*0.03}" fill="#2D1B0E"/>
    <ellipse cx="${-s*0.04}" cy="${s*0.002}" rx="${s*0.009}" ry="${s*0.009}" fill="white" opacity="0.9"/>
    
    <!-- Right eye -->
    <ellipse cx="${s*0.045}" cy="${s*0.01}" rx="${s*0.025}" ry="${s*0.03}" fill="#2D1B0E"/>
    <ellipse cx="${s*0.05}" cy="${s*0.002}" rx="${s*0.009}" ry="${s*0.009}" fill="white" opacity="0.9"/>
    
    <!-- Rosy cheeks -->
    <circle cx="${-s*0.08}" cy="${s*0.06}" r="${s*0.025}" fill="#FF9999" opacity="0.4"/>
    <circle cx="${s*0.08}" cy="${s*0.06}" r="${s*0.025}" fill="#FF9999" opacity="0.4"/>
    
    <!-- Happy smile -->
    <path d="M${-s*0.04},${s*0.07} Q0,${s*0.11} ${s*0.04},${s*0.07}" 
          fill="none" stroke="#C47A5A" stroke-width="${s*0.006}" stroke-linecap="round"/>
    
    <!-- Tiny nose -->
    <ellipse cx="0" cy="${s*0.045}" rx="${s*0.01}" ry="${s*0.007}" fill="#E8A878" opacity="0.6"/>
  </g>
  
  <!-- ═══ Golden Spark rising from book ═══ -->
  <g transform="translate(${cx + s*0.15}, ${s * 0.3})" filter="url(#sparkGlow)">
    <!-- Main 4-point star -->
    <path d="M0,${-s*0.09} C${s*0.015},${-s*0.025} ${s*0.025},${-s*0.015} ${s*0.07},0 C${s*0.025},${s*0.015} ${s*0.015},${s*0.025} 0,${s*0.09} C${-s*0.015},${s*0.025} ${-s*0.025},${s*0.015} ${-s*0.07},0 C${-s*0.025},${-s*0.015} ${-s*0.015},${-s*0.025} 0,${-s*0.09}Z"
          fill="url(#sparkGrad)"/>
    <!-- Inner bright center -->
    <circle cx="0" cy="0" r="${s*0.02}" fill="#FFFBE6" opacity="0.95"/>
  </g>
  
  <!-- ═══ Small decorative sparkles ═══ -->
  <g filter="url(#twinkle)">
    <!-- Top-left sparkle -->
    <g transform="translate(${s*0.18}, ${s*0.18})">
      <path d="M0,${-s*0.02} L${s*0.005},0 L0,${s*0.02} L${-s*0.005},0 Z" fill="white" opacity="0.7"/>
      <path d="M${-s*0.02},0 L0,${s*0.005} L${s*0.02},0 L0,${-s*0.005} Z" fill="white" opacity="0.7"/>
    </g>
    
    <!-- Top-right sparkle -->
    <g transform="translate(${s*0.78}, ${s*0.22})">
      <path d="M0,${-s*0.015} L${s*0.004},0 L0,${s*0.015} L${-s*0.004},0 Z" fill="white" opacity="0.5"/>
      <path d="M${-s*0.015},0 L0,${s*0.004} L${s*0.015},0 L0,${-s*0.004} Z" fill="white" opacity="0.5"/>
    </g>
    
    <!-- Middle-left sparkle -->
    <g transform="translate(${s*0.14}, ${s*0.42})">
      <path d="M0,${-s*0.012} L${s*0.003},0 L0,${s*0.012} L${-s*0.003},0 Z" fill="#FFD700" opacity="0.6"/>
      <path d="M${-s*0.012},0 L0,${s*0.003} L${s*0.012},0 L0,${-s*0.003} Z" fill="#FFD700" opacity="0.6"/>
    </g>
    
    <!-- Near spark sparkle -->
    <g transform="translate(${s*0.75}, ${s*0.15})">
      <circle cx="0" cy="0" r="${s*0.006}" fill="white" opacity="0.4"/>
    </g>
    
    <!-- Bottom sparkle dots -->
    <circle cx="${s*0.22}" cy="${s*0.82}" r="${s*0.005}" fill="white" opacity="0.3"/>
    <circle cx="${s*0.8}" cy="${s*0.78}" r="${s*0.004}" fill="white" opacity="0.25"/>
  </g>
  
  <!-- ═══ Subtle "ABC" on the book pages ═══ -->
  <g transform="translate(${cx}, ${s * 0.68})" opacity="0.25">
    <text x="${-s*0.16}" y="${-s*0.08}" font-family="Arial, sans-serif" font-weight="800" font-size="${s*0.035}" fill="#6B5B3E" text-anchor="middle">A</text>
    <text x="${s*0.16}" y="${-s*0.08}" font-family="Arial, sans-serif" font-weight="800" font-size="${s*0.035}" fill="#6B5B3E" text-anchor="middle">B</text>
  </g>

</svg>`;
}

// Write SVG files
const sizes = [
  { name: 'icon-512.svg', size: 512 },
  { name: 'icon-192.svg', size: 192 },
  { name: 'apple-touch-icon.svg', size: 180 },
  { name: 'favicon.svg', size: 64 },
];

for (const { name, size } of sizes) {
  const svg = createIcon(size);
  fs.writeFileSync(path.join(__dirname, name), svg);
  console.log(`Created ${name} (${size}x${size})`);
}

console.log('\nDone! Now run convert-icons.js to create PNGs.');
