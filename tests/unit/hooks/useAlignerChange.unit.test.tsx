import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createTestWrapper } from '../../helpers/testWrapper';
import { mockPatient, MOCK_PATIENT_ID } from '../../helpers/fixtures';

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
  },
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

import { useConfirmAlignerChange, useAlignerChanges } from '@/hooks/useAlignerChange';
import { toast } from 'sonner';

/* ================================================================== */
/*  useAlignerChanges                                                  */
/* ================================================================== */

describe('useAlignerChanges (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches change history for a patient', async () => {
    const changes = [
      { id: '1', patient_id: MOCK_PATIENT_ID, from_aligner: 4, to_aligner: 5, confirmed_at: '2026-02-15T14:00:00.000Z' },
      { id: '2', patient_id: MOCK_PATIENT_ID, from_aligner: 3, to_aligner: 4, confirmed_at: '2026-02-01T14:00:00.000Z' },
    ];

    fromMock.mockReturnValue(createChain(changes));

    const { result } = renderHook(() => useAlignerChanges(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('aligner_changes');
    expect(result.current.data).toHaveLength(2);
  });

  it('returns empty array when no patientId', async () => {
    const { result } = renderHook(() => useAlignerChanges(undefined), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeUndefined();
  });

  it('propagates DB error', async () => {
    fromMock.mockReturnValue(createChain(null, { message: 'DB error' }));

    const { result } = renderHook(() => useAlignerChanges(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

/* ================================================================== */
/*  useConfirmAlignerChange                                            */
/* ================================================================== */

describe('useConfirmAlignerChange (unit)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates current_aligner and inserts history record, then toasts success', async () => {
    const updateChain = createChain({ ...mockPatient, current_aligner: 6 });
    const insertChain = createChain(null);

    let callCount = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === 'patients') return updateChain;
      if (table === 'aligner_changes') return insertChain;
      return createChain([]);
    });

    const { result } = renderHook(() => useConfirmAlignerChange(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        patientId: MOCK_PATIENT_ID,
        newAlignerNumber: 6,
      });
    });

    expect(fromMock).toHaveBeenCalledWith('patients');
    expect(updateChain.update).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('aligner_changes');
    expect(insertChain.insert).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('#6')
    );
  });

  it('shows error toast when update fails', async () => {
    fromMock.mockReturnValue(createChain(null, { message: 'update error' }));

    const { result } = renderHook(() => useConfirmAlignerChange(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          patientId: MOCK_PATIENT_ID,
          newAlignerNumber: 6,
        });
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Erreur lors de la confirmation du changement'
      );
    });
  });
});
