// Generate PWA icons from SVG
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/icon.svg');
const svg = readFileSync(svgPath);

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  const outPath = resolve(root, 'public', name);
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`✓ ${name} (${size}x${size})`);
}

// Maskable icon (has padding for safe zone)
const maskableSvg = readFileSync(svgPath);
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 13, g: 148, b: 136, alpha: 1 } }
})
  .composite([{ input: await sharp(maskableSvg).resize(410, 410).toBuffer(), top: 51, left: 51 }])
  .png()
  .toFile(resolve(root, 'public/pwa-maskable-512x512.png'));
console.log('✓ pwa-maskable-512x512.png (512x512, maskable)');
