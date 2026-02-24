/**
 * React wrapper for testing hooks that need QueryClientProvider.
 *
 * Usage:
 *   import { createTestWrapper } from '../helpers/testWrapper';
 *   const { result } = renderHook(() => useMyHook(), { wrapper: createTestWrapper() });
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createTestWrapper() {
  const queryClient = createTestQueryClient();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}
