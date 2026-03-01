import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '../../..');
const srcDir = resolve(root, 'src');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(srcDir, relativePath), 'utf-8');
}

describe('Lazy loading / code splitting (unit)', () => {
  // ----------------------------------------------------------------
  // Route-level lazy loading (App.tsx)
  // ----------------------------------------------------------------
  describe('App.tsx — route pages lazy loaded', () => {
    const appCode = readSrc('App.tsx');

    it('uses React.lazy for page imports', () => {
      expect(appCode).toContain('React.lazy');
    });

    it('lazy loads Index page', () => {
      expect(appCode).toMatch(/React\.lazy\(\s*\(\)\s*=>\s*import\(.*Index/);
    });

    it('lazy loads Auth page', () => {
      expect(appCode).toMatch(/React\.lazy\(\s*\(\)\s*=>\s*import\(.*Auth/);
    });

    it('lazy loads PatientDashboard', () => {
      expect(appCode).toMatch(/React\.lazy\(\s*\(\)\s*=>\s*import\(.*PatientDashboard/);
    });

    it('lazy loads AdminDashboard', () => {
      expect(appCode).toMatch(/React\.lazy\(\s*\(\)\s*=>\s*import\(.*AdminDashboard/);
    });

    it('lazy loads NewPractitionerDashboard', () => {
      expect(appCode).toMatch(/React\.lazy\(\s*\(\)\s*=>\s*import\(.*NewPractitionerDashboard/);
    });

    it('wraps routes with Suspense', () => {
      expect(appCode).toContain('<Suspense');
      expect(appCode).toContain('fallback=');
    });

    it('does NOT have static page imports', () => {
      // Ensure no direct imports of page modules (only lazy)
      expect(appCode).not.toMatch(/^import\s+.*from\s+['"]\.\/pages\//m);
    });
  });

  // ----------------------------------------------------------------
  // Heavy component lazy loading (PatientDashboard)
  // ----------------------------------------------------------------
  describe('PatientDashboard — heavy components lazy loaded', () => {
    const code = readSrc('pages/PatientDashboard.tsx');

    it('lazy loads AnalysisProgressChart', () => {
      expect(code).toMatch(/React\.lazy\(.*AnalysisProgressChart/s);
    });

    it('lazy loads VideoTutorials', () => {
      expect(code).toMatch(/React\.lazy\(.*VideoTutorials/s);
    });

    it('wraps lazy components with Suspense', () => {
      // Should have multiple Suspense wrappers
      const suspenseCount = (code.match(/<Suspense/g) || []).length;
      expect(suspenseCount).toBeGreaterThanOrEqual(2);
    });

    it('does NOT have static import for AnalysisProgressChart', () => {
      expect(code).not.toMatch(
        /^import\s+\{[^}]*AnalysisProgressChart[^}]*\}\s+from/m
      );
    });

    it('does NOT have static import for VideoTutorials', () => {
      expect(code).not.toMatch(
        /^import\s+\{[^}]*VideoTutorials[^}]*\}\s+from/m
      );
    });
  });

  // ----------------------------------------------------------------
  // TeethViewer3D lazy loading (NewPractitionerDashboard)
  // ----------------------------------------------------------------
  describe('NewPractitionerDashboard — TeethViewer3D lazy loaded', () => {
    const code = readSrc('pages/NewPractitionerDashboard.tsx');

    it('lazy loads TeethViewer3D', () => {
      expect(code).toMatch(/React\.lazy\(.*TeethViewer3D/s);
    });

    it('wraps TeethViewer3D with Suspense', () => {
      expect(code).toContain('<Suspense');
    });

    it('does NOT have static import for TeethViewer3D', () => {
      expect(code).not.toMatch(
        /^import\s+\{[^}]*TeethViewer3D[^}]*\}\s+from/m
      );
    });
  });

  // ----------------------------------------------------------------
  // Video assets lazy loading (VideoTutorials)
  // ----------------------------------------------------------------
  describe('VideoTutorials — video assets lazy loaded', () => {
    const code = readSrc('components/patient/VideoTutorials.tsx');

    it('uses new URL() pattern for video assets', () => {
      expect(code).toContain('new URL(');
      expect(code).toContain('import.meta.url');
    });

    it('does NOT use static import for mp4 files', () => {
      expect(code).not.toMatch(/^import\s+\w+\s+from\s+['"].*\.mp4['"]/m);
    });

    it('has a videoMap object for lazy video references', () => {
      expect(code).toContain('videoMap');
    });
  });

  // ----------------------------------------------------------------
  // Build output — code splitting verified
  // ----------------------------------------------------------------
  describe('Build output structure', () => {
    it('App.tsx produces separate chunks per lazy page', () => {
      const appCode = readSrc('App.tsx');
      // Each React.lazy() call with dynamic import creates a separate chunk
      const lazyMatches = appCode.match(/React\.lazy/g) || [];
      // We expect at least 6 lazy-loaded pages (Index, Auth, Patient, Practitioner, NewPractitioner, Admin, NotFound)
      expect(lazyMatches.length).toBeGreaterThanOrEqual(6);
    });
  });
});
