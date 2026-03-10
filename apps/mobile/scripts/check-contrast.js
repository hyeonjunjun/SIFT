// WCAG Contrast Ratio Checker
// AA compliance requires:
// - 4.5:1 for normal text
// - 3:1 for large text (18pt+ or 14pt+ bold)

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

function checkCompliance(ratio, size = 'normal') {
  const threshold = size === 'large' ? 3 : 4.5;
  return ratio >= threshold;
}

// SIFT Color Palette from theme.ts
const LIGHT_COLORS = {
  ink: '#443732',
  paper: '#FDFCF8',
  canvas: '#FBF8F1',
  stone: '#7C726D',
  separator: '#E7E4DF',
  subtle: '#F4F1EC',
  accent: '#CF957B',
  danger: '#C46761',
  success: '#8AAF9A',
};

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         SIFT — WCAG AA Contrast Audit (Light Mode)       ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Primary text combinations
const tests = [
  { fg: 'ink', bg: 'paper', usage: 'Primary text', size: 'normal' },
  { fg: 'ink', bg: 'canvas', usage: 'Text on canvas', size: 'normal' },
  { fg: 'ink', bg: 'subtle', usage: 'Text on cards', size: 'normal' },
  { fg: 'stone', bg: 'paper', usage: 'Secondary text (body)', size: 'normal' },
  { fg: 'stone', bg: 'subtle', usage: 'Secondary text on cards', size: 'normal' },
  { fg: 'ink', bg: 'accent', usage: 'Text on accent', size: 'normal' },
  { fg: 'paper', bg: 'ink', usage: 'Inverse text', size: 'normal' },
  { fg: 'paper', bg: 'accent', usage: 'Text on clay accent', size: 'normal' },
  { fg: 'accent', bg: 'paper', usage: 'Accent text', size: 'normal' },
  { fg: 'danger', bg: 'paper', usage: 'Error text', size: 'normal' },
  { fg: 'success', bg: 'paper', usage: 'Success text', size: 'normal' },
];

tests.forEach(({ fg, bg, usage, size }) => {
  const ratio = getContrastRatio(LIGHT_COLORS[fg], LIGHT_COLORS[bg]);
  const passes = checkCompliance(ratio, size);
  const status = passes ? '✓ PASS' : '✗ FAIL';
  const color = passes ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`${color}${status}${reset}  ${ratio.toFixed(2)}:1  ${fg} on ${bg}`);
  console.log(`       ${usage} (${size})`);
  console.log('');
});

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  Recommendations:                                        ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('  • Failing combinations should be avoided or');
console.log('    used only for large text (18pt+ or 14pt+ bold)');
console.log('  • Consider high-contrast mode for accessibility settings\n');
