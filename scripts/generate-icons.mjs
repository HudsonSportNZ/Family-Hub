import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(__dirname, 'PWAicon.png');
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const icons = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of icons) {
  await sharp(SOURCE)
    .resize(size, size)
    .png()
    .toFile(path.join(ICONS_DIR, name));

  console.log(`✓ ${name} (${size}x${size})`);
}

console.log('\nAll icons generated in public/icons/');
