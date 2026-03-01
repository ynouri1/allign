import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '../../..');

describe('Mobile responsive & safe-area (unit)', () => {
  // ----------------------------------------------------------------
  // Safe-area CSS
  // ----------------------------------------------------------------
  describe('Safe-area CSS', () => {
    const css = readFileSync(resolve(root, 'src/index.css'), 'utf-8');

    it('html element has safe-area padding', () => {
      expect(css).toContain('env(safe-area-inset-top)');
      expect(css).toContain('env(safe-area-inset-right)');
      expect(css).toContain('env(safe-area-inset-bottom)');
      expect(css).toContain('env(safe-area-inset-left)');
    });
  });

  // ----------------------------------------------------------------
  // Header safe-area
  // ----------------------------------------------------------------
  describe('Header safe-area', () => {
    const header = readFileSync(resolve(root, 'src/components/layout/Header.tsx'), 'utf-8');

    it('header has safe-area-inset-top padding', () => {
      expect(header).toContain('safe-area-inset-top');
    });
  });

  // ----------------------------------------------------------------
  // MobileTabBar responsive
  // ----------------------------------------------------------------
  describe('MobileTabBar responsive classes', () => {
    const code = readFileSync(resolve(root, 'src/components/layout/MobileTabBar.tsx'), 'utf-8');

    it('is hidden on desktop via md:hidden', () => {
      expect(code).toContain('md:hidden');
    });

    it('uses fixed positioning at bottom', () => {
      expect(code).toContain('fixed');
      expect(code).toContain('bottom-0');
    });

    it('has safe-area bottom padding', () => {
      expect(code).toContain('safe-area-inset-bottom');
    });

    it('has minimum 56px touch target', () => {
      expect(code).toContain('min-h-[56px]');
    });

    it('uses backdrop-blur for glassmorphism', () => {
      expect(code).toContain('backdrop-blur');
    });
  });

  // ----------------------------------------------------------------
  // PatientDashboard mobile integration
  // ----------------------------------------------------------------
  describe('PatientDashboard mobile integration', () => {
    const code = readFileSync(resolve(root, 'src/pages/PatientDashboard.tsx'), 'utf-8');

    it('imports MobileTabBar', () => {
      expect(code).toContain('MobileTabBar');
    });

    it('desktop TabsList hidden on mobile (hidden md:grid)', () => {
      // The classic tab list should be hidden on mobile viewports
      expect(code).toContain('hidden md:grid');
    });

    it('has bottom spacer for mobile tab bar', () => {
      // A spacer div prevents content from being hidden behind the fixed tab bar
      // Uses h-20 with md:hidden to only show on mobile
      expect(code).toContain('h-20 md:hidden');
    });
  });

  // ----------------------------------------------------------------
  // CSS @import ordering
  // ----------------------------------------------------------------
  describe('CSS @import order', () => {
    const css = readFileSync(resolve(root, 'src/index.css'), 'utf-8');

    it('@import appears before @tailwind directives', () => {
      const importIndex = css.indexOf('@import');
      const tailwindIndex = css.indexOf('@tailwind');

      if (importIndex !== -1 && tailwindIndex !== -1) {
        expect(importIndex).toBeLessThan(tailwindIndex);
      }
    });
  });
});
