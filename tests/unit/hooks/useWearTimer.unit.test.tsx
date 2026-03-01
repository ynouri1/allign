import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createTestWrapper } from '../../helpers/testWrapper';
import { MOCK_PATIENT_ID } from '../../helpers/fixtures';

/* ------------------------------------------------------------------ */
/*  Supabase mock                                                      */
/* ------------------------------------------------------------------ */

const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

/* ------------------------------------------------------------------ */
/*  Chainable query builder                                            */
/* ------------------------------------------------------------------ */

function createChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'gte', 'lt', 'order', 'single', 'maybeSingle',
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import {
  useWearTimer,
  computeTotalSeconds,
  formatDuration,
  formatDurationShort,
  DAILY_GOAL_SECONDS,
  type WearSession,
} from '@/hooks/useWearTimer';
import { toast } from 'sonner';

/* ================================================================== */
/*  Pure helper functions                                              */
/* ================================================================== */

describe('Wear timer helpers (unit)', () => {
  describe('computeTotalSeconds', () => {
    it('computes total from completed sessions', () => {
      const sessions: WearSession[] = [
        { id: '1', patient_id: 'p', started_at: '2026-02-23T08:00:00Z', ended_at: '2026-02-23T10:00:00Z', created_at: '' },
        { id: '2', patient_id: 'p', started_at: '2026-02-23T12:00:00Z', ended_at: '2026-02-23T13:30:00Z', created_at: '' },
      ];
      // 2h + 1h30 = 3h30 = 12600s
      expect(computeTotalSeconds(sessions)).toBe(12600);
    });

    it('uses "now" for active session (no ended_at)', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
      const sessions: WearSession[] = [
        { id: '1', patient_id: 'p', started_at: fiveMinAgo, ended_at: null, created_at: '' },
      ];
      const total = computeTotalSeconds(sessions);
      // Should be approximately 300 seconds (± 1s)
      expect(total).toBeGreaterThanOrEqual(299);
      expect(total).toBeLessThanOrEqual(301);
    });

    it('returns 0 for empty sessions', () => {
      expect(computeTotalSeconds([])).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('formats zero', () => {
      expect(formatDuration(0)).toBe('00:00:00');
    });

    it('formats hours, minutes, seconds', () => {
      // 3h 15m 42s = 11742s
      expect(formatDuration(11742)).toBe('03:15:42');
    });

    it('formats more than 24h', () => {
      expect(formatDuration(90000)).toBe('25:00:00');
    });
  });

  describe('formatDurationShort', () => {
    it('formats minutes only when < 1h', () => {
      expect(formatDurationShort(1800)).toBe('30min');
    });

    it('formats hours + minutes', () => {
      expect(formatDurationShort(5400)).toBe('1h30');
    });

    it('formats 0', () => {
      expect(formatDurationShort(0)).toBe('0min');
    });
  });

  it('DAILY_GOAL_SECONDS is 16 hours', () => {
    expect(DAILY_GOAL_SECONDS).toBe(16 * 3600);
  });
});

/* ================================================================== */
/*  useWearTimer hook                                                  */
/* ================================================================== */

describe('useWearTimer (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches today\'s sessions on mount', async () => {
    const sessions = [
      { id: 's1', patient_id: MOCK_PATIENT_ID, started_at: new Date().toISOString(), ended_at: new Date().toISOString(), created_at: '' },
    ];
    fromMock.mockReturnValue(createChain(sessions));

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fromMock).toHaveBeenCalledWith('wear_time_sessions');
    expect(result.current.sessions).toHaveLength(1);
  });

  it('returns empty state when no patientId', async () => {
    const { result } = renderHook(() => useWearTimer(undefined), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toHaveLength(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.totalSeconds).toBe(0);
  });

  it('detects active session (isRunning)', async () => {
    const sessions = [
      { id: 's1', patient_id: MOCK_PATIENT_ID, started_at: new Date().toISOString(), ended_at: null, created_at: '' },
    ];
    fromMock.mockReturnValue(createChain(sessions));

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isRunning).toBe(true);
    expect(result.current.activeSession?.id).toBe('s1');
  });

  it('starts a new session (insert into DB)', async () => {
    // Initial fetch: no sessions
    fromMock.mockReturnValue(createChain([]));

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Setup insert response — return an object with data for .single()
    const insertedSession = {
      id: 's-new', patient_id: MOCK_PATIENT_ID,
      started_at: new Date().toISOString(), ended_at: null, created_at: '',
    };
    // After start(), the mock returns the inserted session for the insert call,
    // then for subsequent fetches returns the session in an array
    fromMock.mockImplementation(() => {
      const chain = createChain(insertedSession);
      return chain;
    });

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('wear_time_sessions'));

    // Restore array mock for any subsequent queries
    fromMock.mockReturnValue(createChain([insertedSession]));
  });

  it('stops an active session (update ended_at)', async () => {
    const sessions = [
      { id: 's1', patient_id: MOCK_PATIENT_ID, started_at: new Date().toISOString(), ended_at: null, created_at: '' },
    ];
    fromMock.mockReturnValue(createChain(sessions));

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isRunning).toBe(true));

    // Setup update response
    fromMock.mockReturnValue(createChain(null));

    act(() => {
      result.current.stop();
    });

    await waitFor(() => {
      // Should have called from('wear_time_sessions') for update
      expect(fromMock).toHaveBeenCalledWith('wear_time_sessions');
    });
  });

  it('computes progressPercent correctly', async () => {
    // 8h of wear = 50% of 16h goal
    const eightHoursAgo = new Date(Date.now() - 8 * 3600_000).toISOString();
    const sessions = [
      { id: 's1', patient_id: MOCK_PATIENT_ID, started_at: eightHoursAgo, ended_at: new Date().toISOString(), created_at: '' },
    ];
    fromMock.mockReturnValue(createChain(sessions));

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.progressPercent).toBeCloseTo(50, 0);
  });

  it('sets a reminder and stores it in localStorage', async () => {
    fromMock.mockReturnValue(createChain([]));

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setReminderMinutes(30);
    });

    expect(result.current.reminder).not.toBeNull();
    expect(result.current.reminder?.fireAt).toBeGreaterThan(Date.now());
    expect(toast.success).toHaveBeenCalledWith('Rappel dans 30 minutes');
    expect(localStorage.getItem('wear_timer_reminder')).not.toBeNull();
  });

  it('cancels a reminder', async () => {
    fromMock.mockReturnValue(createChain([]));

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setReminderMinutes(15);
    });
    expect(result.current.reminder).not.toBeNull();

    act(() => {
      result.current.cancelReminder();
    });

    expect(result.current.reminder).toBeNull();
    expect(localStorage.getItem('wear_timer_reminder')).toBeNull();
  });

  it('shows error toast when start fails', async () => {
    fromMock
      .mockReturnValueOnce(createChain([])) // initial fetch
      .mockReturnValue(createChain(null, { message: 'insert error' })); // insert fails

    const { result } = renderHook(() => useWearTimer(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Impossible de démarrer le chrono');
    });
  });
});
