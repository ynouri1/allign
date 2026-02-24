import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestWrapper } from '../../helpers/testWrapper';
import {
  mockUser,
  mockProfile,
  mockPatient,
  mockPhoto,
  MOCK_PATIENT_ID,
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
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/photo.jpg' }, error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/aligner-photos/test/photo.jpg' },
        })),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed-url.example.com/photo.jpg?token=abc' },
          error: null,
        }),
      })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/* ------------------------------------------------------------------ */
/*  Chainable query builder helper                                     */
/* ------------------------------------------------------------------ */

function createChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // Thenable
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

/* ------------------------------------------------------------------ */
/*  Import hooks (after mocks)                                         */
/* ------------------------------------------------------------------ */

import { usePatientPhotos, useMyPhotos } from '@/hooks/usePatientPhotos';

describe('usePatientPhotos (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no patientId is provided', async () => {
    const { result } = renderHook(() => usePatientPhotos(undefined), {
      wrapper: createTestWrapper(),
    });

    // query should be disabled
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBeUndefined();
  });

  it('fetches photos and generates signed URLs for a patient', async () => {
    const photosRow = [{ ...mockPhoto }];

    fromMock.mockReturnValue(createChain(photosRow));

    const { result } = renderHook(() => usePatientPhotos(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fromMock).toHaveBeenCalledWith('patient_photos');
    expect(result.current.data).toHaveLength(1);
    // The photo_url should now be the signed URL
    expect(result.current.data![0].photo_url).toContain('signed');
  });

  it('throws on Supabase error', async () => {
    fromMock.mockReturnValue(createChain(null, { message: 'Database error' }));

    const { result } = renderHook(() => usePatientPhotos(MOCK_PATIENT_ID), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useMyPhotos (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches current user photos through profile -> patient chain', async () => {
    // Sequence: profiles (single) -> patients (single) -> patient_photos (list)
    let callIndex = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChain(mockProfile);
      }
      if (table === 'patients') {
        return createChain(mockPatient);
      }
      if (table === 'patient_photos') {
        return createChain([mockPhoto]);
      }
      return createChain([]);
    });

    const { result } = renderHook(() => useMyPhotos(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.patientId).toBe(MOCK_PATIENT_ID);
    expect(result.current.data!.photos).toHaveLength(1);
  });

  it('returns null when no patient record exists', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChain(mockProfile);
      }
      // No patient record
      return createChain(null);
    });

    const { result } = renderHook(() => useMyPhotos(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});
