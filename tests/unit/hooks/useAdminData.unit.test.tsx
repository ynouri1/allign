import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createTestWrapper } from '../../helpers/testWrapper';
import {
  mockUser,
  mockProfile,
  mockPatient,
  mockPractitioner,
  mockAssignment,
  MOCK_PATIENT_ID,
  MOCK_PRACTITIONER_ID,
  MOCK_PROFILE_ID,
} from '../../helpers/fixtures';

/* ------------------------------------------------------------------ */
/*  Supabase mock                                                      */
/* ------------------------------------------------------------------ */

const fromMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

/* ------------------------------------------------------------------ */
/*  Chainable query builder                                            */
/* ------------------------------------------------------------------ */

function createChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'order', 'single', 'maybeSingle', 'filter',
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

/* ------------------------------------------------------------------ */
/*  Imports                                                            */
/* ------------------------------------------------------------------ */

import {
  usePatients,
  usePractitioners,
  useAssignments,
  useCreatePatient,
  useCreatePractitioner,
  useAssignPatient,
  useRemoveAssignment,
  useUpdatePatient,
  useDeletePatient,
  useUpdatePractitioner,
  useDeletePractitioner,
} from '@/hooks/useAdminData';

/* ================================================================== */
/*  Queries                                                            */
/* ================================================================== */

describe('usePatients (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches all patients with joined profile', async () => {
    const patients = [
      { ...mockPatient, profile: mockProfile },
    ];
    fromMock.mockReturnValue(createChain(patients));

    const { result } = renderHook(() => usePatients(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('patients');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile.full_name).toBe('Jean Dupont');
  });

  it('propagates DB error', async () => {
    fromMock.mockReturnValue(createChain(null, { message: 'forbidden' }));

    const { result } = renderHook(() => usePatients(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('usePractitioners (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches all practitioners', async () => {
    const practitioners = [
      { ...mockPractitioner, profile: mockProfile },
    ];
    fromMock.mockReturnValue(createChain(practitioners));

    const { result } = renderHook(() => usePractitioners(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('practitioners');
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useAssignments (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches assignments with joined names', async () => {
    fromMock.mockReturnValue(createChain([mockAssignment]));

    const { result } = renderHook(() => useAssignments(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('practitioner_patients');
    expect(result.current.data![0].practitioner.profile.full_name).toBe('Dr. Martin');
  });
});

/* ================================================================== */
/*  Mutations                                                          */
/* ================================================================== */

describe('useCreatePatient (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create-user edge function and shows success toast', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useCreatePatient(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'new@patient.com',
        password: 'password123',
        full_name: 'Nouveau Patient',
      });
    });

    expect(invokeMock).toHaveBeenCalledWith('create-user', expect.objectContaining({
      body: expect.objectContaining({
        email: 'new@patient.com',
        role: 'patient',
      }),
    }));

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Patient créé',
    }));
  });

  it('shows error toast on failure', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('creation failed') });

    const { result } = renderHook(() => useCreatePatient(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          email: 'fail@test.com',
          password: 'pass',
          full_name: 'Fail',
        });
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erreur',
        variant: 'destructive',
      }));
    });
  });
});

describe('useCreatePractitioner (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create-user with role=practitioner', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useCreatePractitioner(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'doc@example.com',
        password: 'pass123',
        full_name: 'Dr. New',
        specialty: 'Orthodontie',
      });
    });

    expect(invokeMock).toHaveBeenCalledWith('create-user', expect.objectContaining({
      body: expect.objectContaining({
        role: 'practitioner',
        specialty: 'Orthodontie',
      }),
    }));

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Praticien créé',
    }));
  });
});

describe('useAssignPatient (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a new assignment', async () => {
    const insertChain = createChain({ success: true });
    fromMock.mockReturnValue(insertChain);

    const { result } = renderHook(() => useAssignPatient(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        practitioner_id: MOCK_PRACTITIONER_ID,
        patient_id: MOCK_PATIENT_ID,
      });
    });

    expect(fromMock).toHaveBeenCalledWith('practitioner_patients');
    expect(insertChain.insert).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Assignation créée',
    }));
  });

  it('shows friendly message on duplicate assignment', async () => {
    fromMock.mockReturnValue(createChain(null, { message: 'unique constraint violated' }));

    const { result } = renderHook(() => useAssignPatient(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          practitioner_id: MOCK_PRACTITIONER_ID,
          patient_id: MOCK_PATIENT_ID,
        });
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erreur',
      }));
    });
  });
});

describe('useRemoveAssignment (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes assignment by id', async () => {
    const deleteChain = createChain(null);
    fromMock.mockReturnValue(deleteChain);

    const { result } = renderHook(() => useRemoveAssignment(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('assignment-uuid-1');
    });

    expect(fromMock).toHaveBeenCalledWith('practitioner_patients');
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Assignation supprimée',
    }));
  });
});

describe('useUpdatePatient (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates both profile and patient records', async () => {
    const updateChain = createChain(null);
    fromMock.mockReturnValue(updateChain);

    const { result } = renderHook(() => useUpdatePatient(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        patientId: MOCK_PATIENT_ID,
        profileId: MOCK_PROFILE_ID,
        full_name: 'Jean Updated',
        total_aligners: 30,
      });
    });

    // Should call from('profiles') and from('patients')
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(fromMock).toHaveBeenCalledWith('patients');
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Patient modifié',
    }));
  });
});

describe('useDeletePatient (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls delete-user edge function', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useDeletePatient(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        profileId: MOCK_PROFILE_ID,
        userId: 'user-uuid-1',
      });
    });

    expect(invokeMock).toHaveBeenCalledWith('delete-user', expect.objectContaining({
      body: { user_id: 'user-uuid-1' },
    }));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Patient supprimé',
    }));
  });
});

describe('useUpdatePractitioner (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates profile and practitioner records', async () => {
    const updateChain = createChain(null);
    fromMock.mockReturnValue(updateChain);

    const { result } = renderHook(() => useUpdatePractitioner(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        practitionerId: MOCK_PRACTITIONER_ID,
        profileId: MOCK_PROFILE_ID,
        full_name: 'Dr. Updated',
        specialty: 'Dentisterie',
      });
    });

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(fromMock).toHaveBeenCalledWith('practitioners');
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Praticien modifié',
    }));
  });
});

describe('useDeletePractitioner (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls delete-user edge function', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useDeletePractitioner(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        profileId: MOCK_PROFILE_ID,
        userId: 'user-uuid-1',
      });
    });

    expect(invokeMock).toHaveBeenCalledWith('delete-user', expect.objectContaining({
      body: { user_id: 'user-uuid-1' },
    }));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Praticien supprimé',
    }));
  });
});
