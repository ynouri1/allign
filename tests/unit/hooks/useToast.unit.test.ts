import { describe, it, expect } from 'vitest';
import { reducer } from '@/hooks/use-toast';

/**
 * Test the toast reducer pure logic (no React rendering needed).
 */
describe('use-toast reducer (unit)', () => {
  const baseState = { toasts: [] as any[] };

  const sampleToast = {
    id: '1',
    title: 'Test',
    description: 'Hello',
    open: true,
    onOpenChange: () => {},
  };

  it('ADD_TOAST adds a toast to the beginning', () => {
    const next = reducer(baseState, {
      type: 'ADD_TOAST',
      toast: sampleToast,
    });

    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].title).toBe('Test');
  });

  it('ADD_TOAST respects TOAST_LIMIT=1 and evicts oldest', () => {
    const stateWithOne = {
      toasts: [{ ...sampleToast, id: '1' }],
    };

    const next = reducer(stateWithOne, {
      type: 'ADD_TOAST',
      toast: { ...sampleToast, id: '2', title: 'New' },
    });

    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe('2');
  });

  it('UPDATE_TOAST patches matching toast by id', () => {
    const stateWithOne = {
      toasts: [{ ...sampleToast }],
    };

    const next = reducer(stateWithOne, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });

    expect(next.toasts[0].title).toBe('Updated');
    expect(next.toasts[0].description).toBe('Hello'); // unchanged
  });

  it('DISMISS_TOAST sets open=false for matching toast', () => {
    const stateWithOne = {
      toasts: [{ ...sampleToast, open: true }],
    };

    const next = reducer(stateWithOne, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    });

    expect(next.toasts[0].open).toBe(false);
  });

  it('DISMISS_TOAST without id dismisses all', () => {
    const stateWithTwo = {
      toasts: [
        { ...sampleToast, id: '1', open: true },
        { ...sampleToast, id: '2', open: true },
      ],
    };

    const next = reducer(stateWithTwo, {
      type: 'DISMISS_TOAST',
    });

    expect(next.toasts.every((t: any) => t.open === false)).toBe(true);
  });

  it('REMOVE_TOAST removes matching toast by id', () => {
    const stateWithTwo = {
      toasts: [
        { ...sampleToast, id: '1' },
        { ...sampleToast, id: '2' },
      ],
    };

    const next = reducer(stateWithTwo, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });

    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe('2');
  });

  it('REMOVE_TOAST without id clears all toasts', () => {
    const stateWithTwo = {
      toasts: [
        { ...sampleToast, id: '1' },
        { ...sampleToast, id: '2' },
      ],
    };

    const next = reducer(stateWithTwo, {
      type: 'REMOVE_TOAST',
      toastId: undefined,
    });

    expect(next.toasts).toHaveLength(0);
  });
});
