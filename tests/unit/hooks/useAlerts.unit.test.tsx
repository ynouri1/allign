import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestWrapper } from '../../helpers/testWrapper';
import {
  mockUser,
  mockProfile,
  mockPatient,
  mockAlert,
  MOCK_ALERT_ID,
} from '../../helpers/fixtures';

/* ------------------------------------------------------------------ */
/*  Supabase mock                                                      */
/* ------------------------------------------------------------------ */

const fromMock = vi.fn();
const channelMock = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.example.com/photo.jpg?token=abc' },
          error: null,
        }),
      })),
    },
    functions: { invoke: vi.fn() },
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

// Mock useAuth for usePatientAlerts
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useToast for admin hooks that use it
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

/* ------------------------------------------------------------------ */
/*  Chainable query builder                                            */
/* ------------------------------------------------------------------ */

function createChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'single', 'maybeSingle', 'filter'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

/* ------------------------------------------------------------------ */
/*  Patient alerts                                                     */
/* ------------------------------------------------------------------ */

import { usePatientAlerts } from '@/hooks/usePatientAlerts';

describe('usePatientAlerts (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it('returns alerts and unresolvedCount for the current patient', async () => {
    const alerts = [
      { ...mockAlert, resolved: false },
      { ...mockAlert, id: 'alert-2', resolved: true, resolved_at: '2026-02-19T00:00:00Z' },
    ];

    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'patients') return createChain(mockPatient);
      if (table === 'practitioner_alerts') return createChain(alerts);
      return createChain([]);
    });

    const { result } = renderHook(() => usePatientAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data!.alerts).toHaveLength(2);
    expect(result.current.data!.unresolvedCount).toBe(1);
  });

  it('returns empty when user has no patient record', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      return createChain(null); // no patient
    });

    const { result } = renderHook(() => usePatientAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data!.alerts).toHaveLength(0);
    expect(result.current.data!.unresolvedCount).toBe(0);
  });

  it('is disabled when no user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => usePatientAlerts(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

/* ------------------------------------------------------------------ */
/*  Practitioner alerts                                                */
/* ------------------------------------------------------------------ */

import { usePractitionerAlerts, useResolveAlert, useCreateAlert } from '@/hooks/usePractitionerAlerts';
import { mockAlertWithJoins, mockPractitioner, MOCK_PATIENT_ID, MOCK_PRACTITIONER_ID } from '../../helpers/fixtures';

describe('usePractitionerAlerts (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches alerts with joined patient + photo and signed URLs', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'practitioners') return createChain(mockPractitioner);
      if (table === 'practitioner_alerts') return createChain([mockAlertWithJoins]);
      return createChain([]);
    });

    const { result } = renderHook(() => usePractitionerAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    const alert = result.current.data![0];
    expect(alert.patient?.profile?.full_name).toBe('Jean Dupont');
    // Signed URL should have been generated
    expect(alert.photo?.photo_url).toContain('signed');
  });

  it('returns empty array when practitioner record not found', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'practitioners') return createChain(null);
      return createChain([]);
    });

    const { result } = renderHook(() => usePractitionerAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('normalizes array-wrapped PostgREST photo/patient data', async () => {
    const alertWithArrayJoins = {
      ...mockAlertWithJoins,
      patient: [mockAlertWithJoins.patient],   // PostgREST can return array
      photo: [mockAlertWithJoins.photo],       // PostgREST can return array
    };

    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'practitioners') return createChain(mockPractitioner);
      if (table === 'practitioner_alerts') return createChain([alertWithArrayJoins]);
      return createChain([]);
    });

    const { result } = renderHook(() => usePractitionerAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have been normalized to single objects
    expect(Array.isArray(result.current.data![0].patient)).toBe(false);
    expect(Array.isArray(result.current.data![0].photo)).toBe(false);
  });
});

describe('useResolveAlert (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with resolved=true', async () => {
    const updateChain = createChain({ id: MOCK_ALERT_ID });

    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'practitioner_alerts') return updateChain;
      return createChain([]);
    });

    // Mock auth
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

    const { result } = renderHook(() => useResolveAlert(), {
      wrapper: createTestWrapper(),
    });

    await result.current.mutateAsync({ alertId: MOCK_ALERT_ID, notes: 'Resolved via test' });

    expect(fromMock).toHaveBeenCalledWith('practitioner_alerts');
    expect(updateChain.update).toHaveBeenCalled();
  });
});

describe('useCreateAlert (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a new alert', async () => {
    const insertChain = createChain({ id: 'new-alert-id' });

    fromMock.mockReturnValue(insertChain);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    await result.current.mutateAsync({
      patientId: MOCK_PATIENT_ID,
      practitionerId: MOCK_PRACTITIONER_ID,
      type: 'attachment_lost',
      severity: 'high',
      message: 'Test alert',
    });

    expect(fromMock).toHaveBeenCalledWith('practitioner_alerts');
    expect(insertChain.insert).toHaveBeenCalled();
  });
});
