import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestWrapper } from '../../helpers/testWrapper';
import {
  mockUser,
  mockProfile,
  mockPatient,
  mockPractitioner,
  MOCK_PRACTITIONER_ID,
} from '../../helpers/fixtures';

/* ------------------------------------------------------------------ */
/*  Supabase mock                                                      */
/* ------------------------------------------------------------------ */

const fromMock = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

/* ------------------------------------------------------------------ */
/*  Chainable query builder                                            */
/* ------------------------------------------------------------------ */

function createChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

/* ------------------------------------------------------------------ */
/*  Imports                                                            */
/* ------------------------------------------------------------------ */

import { usePractitionerPatients, usePractitionerProfile } from '@/hooks/usePractitionerData';

/* ================================================================== */
/*  usePractitionerPatients                                            */
/* ================================================================== */

describe('usePractitionerPatients (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it('fetches assigned patients through profile -> practitioner -> assignments', async () => {
    const patientWithProfile = {
      ...mockPatient,
      profile: mockProfile,
    };

    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'practitioners') return createChain(mockPractitioner);
      if (table === 'practitioner_patients') {
        return createChain([{ patient_id: mockPatient.id, patient: patientWithProfile }]);
      }
      return createChain([]);
    });

    const { result } = renderHook(() => usePractitionerPatients(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile.full_name).toBe('Jean Dupont');
  });

  it('returns empty when no practitioner record', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'practitioners') return createChain(null);
      return createChain([]);
    });

    const { result } = renderHook(() => usePractitionerPatients(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('is disabled when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => usePractitionerPatients(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

/* ================================================================== */
/*  usePractitionerProfile                                             */
/* ================================================================== */

describe('usePractitionerProfile (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it('returns merged profile + practitioner data', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return createChain({ ...mockProfile });
      if (table === 'practitioners') return createChain({ ...mockPractitioner });
      return createChain(null);
    });

    const { result } = renderHook(() => usePractitionerProfile(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      full_name: 'Jean Dupont',
      specialty: 'Orthodontie',
    });
  });

  it('returns null when no profile exists', async () => {
    fromMock.mockReturnValue(createChain(null));

    const { result } = renderHook(() => usePractitionerProfile(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
