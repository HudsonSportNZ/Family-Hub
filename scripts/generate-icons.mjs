import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function createSVG(size) {
  const fontSize = Math.round(size * 0.40);
  const letterSpacing = -(size * 0.015);
  const textY = Math.round(size * 0.645);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0D0F14"/>
  <text
    x="${size / 2}"
    y="${textY}"
    font-family="Arial Black, Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    text-anchor="middle"
    letter-spacing="${letterSpacing}"
    fill="#6C8EFF"
  >HF</text>
</svg>`;
}

const icons = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of icons) {
  const svg = Buffer.from(createSVG(size));
  const outputPath = path.join(ICONS_DIR, name);

  await sharp(svg).png().toFile(outputPath);
  console.log(`✓ ${name} (${size}x${size})`);
}

console.log('\nAll icons generated in public/icons/');
