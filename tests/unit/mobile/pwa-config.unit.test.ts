import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '../../..');

describe('PWA configuration (unit)', () => {
  // ----------------------------------------------------------------
  // Manifest (via vite.config.ts plugin config)
  // ----------------------------------------------------------------
  describe('Manifest', () => {
    it('vite.config.ts contains VitePWA plugin', () => {
      const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf-8');
      expect(config).toContain('VitePWA');
      expect(config).toContain("registerType: \"autoUpdate\"");
    });

    it('manifest specifies required PWA fields', () => {
      const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf-8');
      expect(config).toContain('name:');
      expect(config).toContain('short_name:');
      expect(config).toContain('theme_color:');
      expect(config).toContain('background_color:');
      expect(config).toContain("display: \"standalone\"");
      expect(config).toContain("orientation: \"portrait\"");
      expect(config).toContain("start_url: \"/\"");
    });

    it('manifest includes all required icon sizes', () => {
      const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf-8');
      expect(config).toContain('192x192');
      expect(config).toContain('512x512');
      expect(config).toContain('"maskable"');
    });
  });

  // ----------------------------------------------------------------
  // Icon files
  // ----------------------------------------------------------------
  describe('PWA icon files', () => {
    it('pwa-192x192.png exists', () => {
      expect(existsSync(resolve(root, 'public/pwa-192x192.png'))).toBe(true);
    });

    it('pwa-512x512.png exists', () => {
      expect(existsSync(resolve(root, 'public/pwa-512x512.png'))).toBe(true);
    });

    it('pwa-maskable-512x512.png exists', () => {
      expect(existsSync(resolve(root, 'public/pwa-maskable-512x512.png'))).toBe(true);
    });

    it('apple-touch-icon.png exists', () => {
      expect(existsSync(resolve(root, 'public/apple-touch-icon.png'))).toBe(true);
    });

    it('icon.svg source exists', () => {
      expect(existsSync(resolve(root, 'public/icon.svg'))).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // index.html meta tags
  // ----------------------------------------------------------------
  describe('index.html mobile meta tags', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf-8');

    it('has viewport with viewport-fit=cover', () => {
      expect(html).toContain('viewport-fit=cover');
    });

    it('has apple-touch-icon link', () => {
      expect(html).toContain('apple-touch-icon');
    });

    it('has theme-color meta tag', () => {
      expect(html).toMatch(/meta\s+name="theme-color"/);
    });

    it('has apple-mobile-web-app-capable', () => {
      expect(html).toContain('apple-mobile-web-app-capable');
    });

    it('has apple-mobile-web-app-status-bar-style', () => {
      expect(html).toContain('apple-mobile-web-app-status-bar-style');
    });

    it('theme-color matches teal brand (#0D9488)', () => {
      expect(html).toContain('#0D9488');
    });
  });

  // ----------------------------------------------------------------
  // Offline fallback
  // ----------------------------------------------------------------
  describe('Offline fallback', () => {
    it('offline.html exists in public/', () => {
      expect(existsSync(resolve(root, 'public/offline.html'))).toBe(true);
    });

    it('offline.html contains retry button', () => {
      const offline = readFileSync(resolve(root, 'public/offline.html'), 'utf-8');
      expect(offline).toContain('Réessayer');
    });

    it('offline.html includes safe-area support', () => {
      const offline = readFileSync(resolve(root, 'public/offline.html'), 'utf-8');
      expect(offline).toContain('safe-area-inset');
    });

    it('offline.html references app icon', () => {
      const offline = readFileSync(resolve(root, 'public/offline.html'), 'utf-8');
      expect(offline).toContain('pwa-192x192.png');
    });
  });

  // ----------------------------------------------------------------
  // Service worker / Workbox config
  // ----------------------------------------------------------------
  describe('Workbox configuration', () => {
    const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf-8');

    it('has globPatterns for precaching', () => {
      expect(config).toContain('globPatterns');
    });

    it('has navigateFallback for SPA routing', () => {
      expect(config).toContain('navigateFallback');
    });

    it('has runtime caching for API calls (NetworkFirst)', () => {
      expect(config).toContain('NetworkFirst');
    });

    it('has runtime caching for images (CacheFirst)', () => {
      expect(config).toContain('CacheFirst');
    });
  });
});
