/**
 * Shared Supabase mock helpers for unit tests.
 *
 * Usage:
 *   import { buildSupabaseMock, resetSupabaseMock } from '../helpers/supabaseMock';
 *
 * The mock provides chainable query-builder methods (.from().select().eq()...)
 * and utilities for auth / storage / functions / realtime.
 */
import { vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QueryResult {
  data: unknown;
  error: unknown;
}

/* ------------------------------------------------------------------ */
/*  Query builder (chainable)                                          */
/* ------------------------------------------------------------------ */

export function createQueryBuilder(resolvedValue: QueryResult = { data: [], error: null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainable = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'is', 'order',
    'limit', 'range', 'filter',
    'maybeSingle', 'single',
  ];

  chainable.forEach((method) => {
    builder[method] = vi.fn().mockReturnThis();
  });

  // Terminal — resolves the promise
  builder.then = vi.fn((resolve) => resolve(resolvedValue));

  // Make builder thenable  (await supabase.from(…).select(…))
  (builder as any)[Symbol.toStringTag] = 'SupabaseMockQuery';

  // Allow overriding resolved value per-chain
  builder.__setResult = vi.fn((result: QueryResult) => {
    builder.then = vi.fn((resolve) => resolve(result));
    return builder;
  });

  return builder;
}

/* ------------------------------------------------------------------ */
/*  Channel / Realtime mock                                            */
/* ------------------------------------------------------------------ */

export function createChannelMock() {
  const channelMock: Record<string, ReturnType<typeof vi.fn>> = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };
  return channelMock;
}

/* ------------------------------------------------------------------ */
/*  Full supabase client mock                                          */
/* ------------------------------------------------------------------ */

export function buildSupabaseMock(queryResult?: QueryResult) {
  const defaultResult = queryResult ?? { data: [], error: null };
  const queryBuilder = createQueryBuilder(defaultResult);
  const channelMock = createChannelMock();

  const mock = {
    // DB
    from: vi.fn(() => queryBuilder),
    _queryBuilder: queryBuilder,

    // Auth
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },

    // Storage
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/photo.jpg' }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/aligner-photos/test/photo.jpg' } })),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/aligner-photos/test/photo.jpg?token=abc' },
          error: null,
        }),
      })),
    },

    // Functions
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },

    // Realtime
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
    _channelMock: channelMock,
  };

  return mock;
}

/* ------------------------------------------------------------------ */
/*  Reset helper                                                       */
/* ------------------------------------------------------------------ */

export function resetSupabaseMock(mock: ReturnType<typeof buildSupabaseMock>) {
  vi.clearAllMocks();
  // Re-wire default returns after clearAllMocks
  mock.from.mockReturnValue(mock._queryBuilder);
  mock.channel.mockReturnValue(mock._channelMock);
}
