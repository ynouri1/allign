import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

/* ------------------------------------------------------------------ */
/*  Supabase mock                                                      */
/* ------------------------------------------------------------------ */

const onAuthStateChangeMock = vi.fn();
const getSessionMock = vi.fn();
const signInMock = vi.fn();
const signUpMock = vi.fn();
const signOutMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      signInWithPassword: (...args: unknown[]) => signInMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

/* ------------------------------------------------------------------ */
/*  Chainable query builder                                            */
/* ------------------------------------------------------------------ */

function createChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  ['select', 'eq', 'single', 'maybeSingle', 'order'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

/* ------------------------------------------------------------------ */
/*  Helper component to consume context                                */
/* ------------------------------------------------------------------ */

function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user?.email ?? 'none'}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="isPractitioner">{String(auth.isPractitioner)}</span>
      <span data-testid="isPatient">{String(auth.isPatient)}</span>
      <span data-testid="roles">{auth.roles.join(',')}</span>
      <button data-testid="signIn" onClick={() => auth.signIn('test@example.com', 'pass')}>signIn</button>
      <button data-testid="signOut" onClick={() => auth.signOut()}>signOut</button>
    </div>
  );
}

/* ================================================================== */
/*  Tests                                                              */
/* ================================================================== */

describe('AuthContext (unit)', () => {
  let authCallback: Function;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no session
    onAuthStateChangeMock.mockImplementation((cb: Function) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    getSessionMock.mockResolvedValue({
      data: { session: null },
    });

    // Roles query returns empty
    fromMock.mockReturnValue(createChain([]));
  });

  it('starts in loading state and resolves to no user', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Wait for getSession to resolve
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('provides user and roles when session exists', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'patient@test.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01',
    };

    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };

    getSessionMock.mockResolvedValue({
      data: { session: mockSession },
    });

    // Return patient role
    fromMock.mockReturnValue(createChain([{ role: 'patient' }]));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('patient@test.com');
    });

    await waitFor(() => {
      expect(screen.getByTestId('isPatient').textContent).toBe('true');
    });
  });

  it('derives isAdmin / isPractitioner / isPatient correctly', async () => {
    const mockSession = {
      user: { id: 'u-2', email: 'admin@test.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' },
      access_token: 'token',
    };

    getSessionMock.mockResolvedValue({ data: { session: mockSession } });
    fromMock.mockReturnValue(createChain([{ role: 'admin' }, { role: 'practitioner' }]));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('true');
    });

    await waitFor(() => {
      expect(screen.getByTestId('isPractitioner').textContent).toBe('true');
    });

    expect(screen.getByTestId('isPatient').textContent).toBe('false');
  });

  it('signIn delegates to supabase.auth.signInWithPassword', async () => {
    signInMock.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('signIn').click();
    });

    expect(signInMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass',
    });
  });

  it('signOut calls supabase.auth.signOut and resets roles', async () => {
    const mockSession = {
      user: { id: 'u-3', email: 'doc@test.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' },
      access_token: 'token',
    };
    getSessionMock.mockResolvedValue({ data: { session: mockSession } });
    fromMock.mockReturnValue(createChain([{ role: 'practitioner' }]));
    signOutMock.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isPractitioner').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByTestId('signOut').click();
    });

    expect(signOutMock).toHaveBeenCalled();
  });

  it('useAuth throws outside of provider', () => {
    // Suppress console.error for this expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<AuthConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });
});
