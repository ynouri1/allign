import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/* ------------------------------------------------------------------ */
/*  matchMedia mock helpers                                            */
/* ------------------------------------------------------------------ */

let mediaListeners: Array<() => void> = [];
let currentMatches = false;

function mockMatchMedia(matches: boolean) {
  currentMatches = matches;
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: matches ? 375 : 1024,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: currentMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: () => void) => {
        mediaListeners.push(cb);
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useIsMobile (unit)', () => {
  beforeEach(() => {
    vi.resetModules();
    mediaListeners = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when viewport < 768px', async () => {
    mockMatchMedia(true);
    const { useIsMobile } = await import('@/hooks/use-mobile');
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport >= 768px', async () => {
    mockMatchMedia(false);
    const { useIsMobile } = await import('@/hooks/use-mobile');
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('reacts to viewport resize via matchMedia change', async () => {
    mockMatchMedia(false);
    const { useIsMobile } = await import('@/hooks/use-mobile');
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      mediaListeners.forEach((cb) => cb());
    });

    expect(result.current).toBe(true);
  });

  it('uses MOBILE_BREAKPOINT of 768px', async () => {
    // At exactly 768px should NOT be mobile
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true, configurable: true });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const mod = await import('@/hooks/use-mobile');
    const { result } = renderHook(() => mod.useIsMobile());
    expect(result.current).toBe(false);
  });
});
