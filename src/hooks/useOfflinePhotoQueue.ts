/**
 * useOfflinePhotoQueue — React hook for the offline photo queue.
 *
 * Provides:
 *  - `enqueue(photos)` — save captured photos to IndexedDB
 *  - `pendingCount` — number of items waiting to sync
 *  - `queue` — full queue state for UI display
 *  - `isOnline` / `isSyncing` — reactive status
 *  - `retry()` — manually trigger a sync attempt
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  enqueuePhotoBatch,
  getAllQueuedPhotos,
  getPendingCount,
  type QueuedPhoto,
} from '@/lib/offlinePhotoQueue';
import {
  onSyncEvent,
  triggerSync,
  getOnlineStatus,
  getSyncingStatus,
  type SyncEvent,
} from '@/lib/photoSyncService';

export interface EnqueueParams {
  patientId: string;
  alignerNumber: number;
  attachmentTeeth: string[];
  photos: { angle: string; url: string }[];
}

export function useOfflinePhotoQueue() {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [isSyncing, setIsSyncing] = useState(getSyncingStatus());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Refresh queue state from IndexedDB ─────────────────────────────────

  const refreshQueue = useCallback(async () => {
    try {
      const [items, count] = await Promise.all([
        getAllQueuedPhotos(),
        getPendingCount(),
      ]);
      setQueue(items);
      setPendingCount(count);
    } catch (e) {
      console.warn('[useOfflinePhotoQueue] refresh error:', e);
    }
  }, []);

  // ── Helper: force React Query to refetch photos from Supabase ────────

  const invalidatePhotoQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-photos'] });
    queryClient.invalidateQueries({ queryKey: ['patient-photos'] });
  }, [queryClient]);

  // ── Listen to sync events ──────────────────────────────────────────────

  useEffect(() => {
    // Initial load
    refreshQueue();

    const unsubscribe = onSyncEvent((event: SyncEvent) => {
      setIsOnline(getOnlineStatus());
      setIsSyncing(getSyncingStatus());

      switch (event.type) {
        case 'network-change':
          if (event.online) {
            toast.info('Connexion rétablie — synchronisation en cours…');
          } else {
            toast.warning('Hors ligne — les photos seront synchronisées automatiquement.');
          }
          break;
        case 'sync-start':
          toast.info(`Synchronisation de ${event.pendingCount} photo(s)…`);
          break;
        case 'item-uploaded':
          refreshQueue();
          invalidatePhotoQueries();
          break;
        case 'item-analyzed':
          refreshQueue();
          invalidatePhotoQueries();
          break;
        case 'item-error':
          toast.error(`Erreur sync photo #${event.itemId}: ${event.error}`);
          refreshQueue();
          break;
        case 'sync-end':
          if (event.pendingCount === 0) {
            toast.success('Toutes les photos sont synchronisées !');
          }
          refreshQueue();
          invalidatePhotoQueries();
          break;
      }
    });

    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refreshQueue, invalidatePhotoQueries]);

  // ── Enqueue captured photos ────────────────────────────────────────────

  const enqueue = useCallback(
    async (params: EnqueueParams): Promise<number[]> => {
      const items = params.photos.map((p) => ({
        dataUrl: p.url,
        angle: p.angle,
        patientId: params.patientId,
        alignerNumber: params.alignerNumber,
        attachmentTeeth: params.attachmentTeeth,
      }));

      const ids = await enqueuePhotoBatch(items);

      toast.success(`${ids.length} photo(s) enregistrée(s) localement`);

      // Refresh UI state
      await refreshQueue();

      // If online, trigger immediate sync
      if (getOnlineStatus()) {
        triggerSync();
      }

      return ids;
    },
    [refreshQueue],
  );

  // ── Manual retry ───────────────────────────────────────────────────────

  const retry = useCallback(() => {
    triggerSync();
  }, []);

  return {
    /** Save captured photos to the local queue. */
    enqueue,
    /** Full queue (all statuses) for UI rendering. */
    queue,
    /** Number of items still waiting to sync. */
    pendingCount,
    /** Device connectivity status (reactive). */
    isOnline,
    /** Whether the sync service is currently uploading. */
    isSyncing,
    /** Manually trigger sync. */
    retry,
    /** Refresh queue state from IndexedDB. */
    refreshQueue,
  };
}
