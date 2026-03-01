/**
 * Tests for the offline photo queue (IndexedDB store).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

import {
  enqueuePhoto,
  enqueuePhotoBatch,
  getPendingPhotos,
  getAllQueuedPhotos,
  getPendingCount,
  updateQueueItem,
  removeQueueItem,
  purgeCompleted,
  clearQueue,
} from '@/lib/offlinePhotoQueue';

// Reset the queue between tests
beforeEach(async () => {
  await clearQueue();
});

const makePhoto = (overrides = {}) => ({
  dataUrl: 'data:image/jpeg;base64,/9j/TESTDATA',
  angle: 'front',
  patientId: 'patient-uuid-1',
  alignerNumber: 5,
  attachmentTeeth: ['11', '21'],
  ...overrides,
});

describe('offlinePhotoQueue', () => {
  it('enqueues a single photo and retrieves it', async () => {
    const id = await enqueuePhoto(makePhoto());
    expect(id).toBeGreaterThan(0);

    const all = await getAllQueuedPhotos();
    expect(all).toHaveLength(1);
    expect(all[0].dataUrl).toBe('data:image/jpeg;base64,/9j/TESTDATA');
    expect(all[0].status).toBe('pending');
    expect(all[0].retryCount).toBe(0);
    expect(all[0].capturedAt).toBeTruthy();
  });

  it('enqueues a batch of photos atomically', async () => {
    const ids = await enqueuePhotoBatch([
      makePhoto({ angle: 'front' }),
      makePhoto({ angle: 'left' }),
      makePhoto({ angle: 'right' }),
    ]);
    expect(ids).toHaveLength(3);

    const all = await getAllQueuedPhotos();
    expect(all).toHaveLength(3);
    expect(all.map((p) => p.angle)).toEqual(['front', 'left', 'right']);
  });

  it('getPendingPhotos returns pending and retryable error items', async () => {
    const id1 = await enqueuePhoto(makePhoto({ angle: 'front' }));
    const id2 = await enqueuePhoto(makePhoto({ angle: 'left' }));

    // Mark one as error with retries left
    await updateQueueItem(id2, { status: 'error', retryCount: 2 });

    const pending = await getPendingPhotos();
    expect(pending).toHaveLength(2);

    // Mark error item as exhausted (5 retries)
    await updateQueueItem(id2, { retryCount: 5 });
    const pending2 = await getPendingPhotos();
    expect(pending2).toHaveLength(1);
    expect(pending2[0].id).toBe(id1);
  });

  it('getPendingCount returns correct count', async () => {
    expect(await getPendingCount()).toBe(0);

    await enqueuePhotoBatch([makePhoto(), makePhoto()]);
    expect(await getPendingCount()).toBe(2);
  });

  it('updateQueueItem patches status and error', async () => {
    const id = await enqueuePhoto(makePhoto());
    await updateQueueItem(id, { status: 'uploading' });

    const all = await getAllQueuedPhotos();
    expect(all[0].status).toBe('uploading');

    await updateQueueItem(id, { status: 'error', lastError: 'Network failure', retryCount: 1 });
    const all2 = await getAllQueuedPhotos();
    expect(all2[0].status).toBe('error');
    expect(all2[0].lastError).toBe('Network failure');
    expect(all2[0].retryCount).toBe(1);
  });

  it('removeQueueItem deletes a specific item', async () => {
    const id1 = await enqueuePhoto(makePhoto({ angle: 'front' }));
    const id2 = await enqueuePhoto(makePhoto({ angle: 'left' }));

    await removeQueueItem(id1);
    const all = await getAllQueuedPhotos();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(id2);
  });

  it('purgeCompleted removes only done items', async () => {
    const id1 = await enqueuePhoto(makePhoto({ angle: 'front' }));
    const id2 = await enqueuePhoto(makePhoto({ angle: 'left' }));
    const id3 = await enqueuePhoto(makePhoto({ angle: 'right' }));

    await updateQueueItem(id1, { status: 'done' });
    await updateQueueItem(id3, { status: 'done' });

    const purged = await purgeCompleted();
    expect(purged).toBe(2);

    const remaining = await getAllQueuedPhotos();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(id2);
    expect(remaining[0].status).toBe('pending');
  });

  it('clearQueue removes everything', async () => {
    await enqueuePhotoBatch([makePhoto(), makePhoto(), makePhoto()]);
    expect(await getAllQueuedPhotos()).toHaveLength(3);

    await clearQueue();
    expect(await getAllQueuedPhotos()).toHaveLength(0);
  });

  it('preserves all fields through enqueue → read cycle', async () => {
    await enqueuePhoto({
      dataUrl: 'data:image/jpeg;base64,ABC',
      angle: 'occlusal',
      patientId: 'p-123',
      alignerNumber: 12,
      attachmentTeeth: ['14', '24', '34'],
    });

    const [item] = await getAllQueuedPhotos();
    expect(item.dataUrl).toBe('data:image/jpeg;base64,ABC');
    expect(item.angle).toBe('occlusal');
    expect(item.patientId).toBe('p-123');
    expect(item.alignerNumber).toBe(12);
    expect(item.attachmentTeeth).toEqual(['14', '24', '34']);
    expect(item.status).toBe('pending');
    expect(item.retryCount).toBe(0);
  });
});
