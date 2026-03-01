/**
 * Photo Sync Service — drains the offline queue when network is available.
 *
 * Responsibilities:
 *   1. Detect online/offline transitions (browser API + Capacitor Network)
 *   2. Iterate over pending queue items
 *   3. For each: upload → Supabase Storage → insert DB row → trigger Gemini
 *      analysis → create alerts → mark done
 *   4. Exponential back-off on transient errors
 *
 * The service is a singleton — call `startPhotoSyncService()` once at app boot
 * and it will self-manage from there.
 */

import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { isNative } from '@/lib/capacitor';
import {
  getPendingPhotos,
  updateQueueItem,
  removeQueueItem,
  purgeCompleted,
  type QueuedPhoto,
  MAX_RETRIES,
} from '@/lib/offlinePhotoQueue';

// ── Types ──────────────────────────────────────────────────────────────────

export type SyncEventType = 'sync-start' | 'sync-end' | 'item-uploaded' | 'item-analyzed' | 'item-error' | 'network-change';

export interface SyncEvent {
  type: SyncEventType;
  itemId?: number;
  online?: boolean;
  pendingCount?: number;
  error?: string;
}

type SyncListener = (event: SyncEvent) => void;

// ── State ──────────────────────────────────────────────────────────────────

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isSyncing = false;
let started = false;
const listeners: Set<SyncListener> = new Set();

// ── Event emitter ──────────────────────────────────────────────────────────

export function onSyncEvent(fn: SyncListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event: SyncEvent) {
  listeners.forEach((fn) => {
    try { fn(event); } catch { /* listener errors are non-fatal */ }
  });
}

// ── Network detection ──────────────────────────────────────────────────────

function handleOnlineChange(online: boolean) {
  const changed = isOnline !== online;
  isOnline = online;
  if (changed) {
    emit({ type: 'network-change', online });
  }
  if (online && !isSyncing) {
    drainQueue();
  }
}

async function setupNetworkListeners() {
  // Browser events (always available)
  window.addEventListener('online', () => handleOnlineChange(true));
  window.addEventListener('offline', () => handleOnlineChange(false));

  // Capacitor Network plugin (native only — more reliable)
  if (isNative) {
    try {
      const status = await Network.getStatus();
      handleOnlineChange(status.connected);

      await Network.addListener('networkStatusChange', (s) => {
        handleOnlineChange(s.connected);
      });
    } catch (e) {
      console.warn('[PhotoSync] Capacitor Network plugin unavailable:', e);
    }
  }
}

// ── Sync engine ────────────────────────────────────────────────────────────

async function syncSingleItem(item: QueuedPhoto): Promise<void> {
  const id = item.id!;

  // 1. Mark uploading
  await updateQueueItem(id, { status: 'uploading' });

  // 2. Convert data-URL → Blob
  const response = await fetch(item.dataUrl);
  const blob = await response.blob();

  // 3. Upload to Supabase Storage
  const fileName = `${item.patientId}/${Date.now()}_${item.angle}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('aligner-photos')
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 4. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('aligner-photos')
    .getPublicUrl(fileName);

  // 5. Insert DB row (analysis_status = 'pending')
  const { data: dbRow, error: dbError } = await supabase
    .from('patient_photos')
    .insert({
      patient_id: item.patientId,
      photo_url: publicUrl,
      angle: item.angle,
      aligner_number: item.alignerNumber,
      analysis_status: 'pending',
    })
    .select()
    .single();

  if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

  await updateQueueItem(id, { status: 'analyzing', remotePhotoId: dbRow.id });
  emit({ type: 'item-uploaded', itemId: id });

  // 6. Trigger async Gemini analysis (front photos only)
  if (item.angle === 'front') {
    try {
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-aligner-photo',
        {
          body: {
            imageBase64: item.dataUrl,
            attachmentTeeth: item.attachmentTeeth,
          },
        },
      );

      if (analysisError) {
        console.warn('[PhotoSync] Analysis failed (non-blocking):', analysisError);
      } else if (analysisData && !analysisData.error) {
        // 7. Update DB row with analysis results
        await supabase
          .from('patient_photos')
          .update({
            analysis_status: analysisData.status,
            attachment_status: analysisData.attachmentStatus,
            insertion_quality: analysisData.insertionQuality,
            gingival_health: analysisData.gingivalHealth,
            overall_score: analysisData.overallScore,
            recommendations: analysisData.recommendations,
            analyzed_at: analysisData.analyzedAt,
          })
          .eq('id', dbRow.id);

        // 8. Create practitioner alerts if needed
        if (
          analysisData.attachmentStatus === 'missing' ||
          analysisData.attachmentStatus === 'partial' ||
          analysisData.insertionQuality === 'poor' ||
          analysisData.gingivalHealth === 'inflammation' ||
          analysisData.gingivalHealth === 'mild_inflammation'
        ) {
          await supabase.functions.invoke('create-analysis-alerts', {
            body: {
              patientId: item.patientId,
              photoId: dbRow.id,
              analysisResult: analysisData,
            },
          }).catch((e) => console.warn('[PhotoSync] Alert creation failed:', e));
        }
      }
    } catch (e) {
      // Analysis failure is non-blocking — photo is already uploaded
      console.warn('[PhotoSync] Gemini analysis error (non-blocking):', e);
    }
  }

  emit({ type: 'item-analyzed', itemId: id });

  // 9. Mark done
  await updateQueueItem(id, { status: 'done' });
}

async function drainQueue(): Promise<void> {
  if (isSyncing || !isOnline) return;
  isSyncing = true;

  const pending = await getPendingPhotos();
  if (pending.length === 0) {
    isSyncing = false;
    return;
  }

  emit({ type: 'sync-start', pendingCount: pending.length });

  for (const item of pending) {
    // Recheck connectivity before each item
    if (!isOnline) break;

    try {
      await syncSingleItem(item);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[PhotoSync] Item ${item.id} failed:`, msg);
      await updateQueueItem(item.id!, {
        status: 'error',
        retryCount: (item.retryCount || 0) + 1,
        lastError: msg,
      });
      emit({ type: 'item-error', itemId: item.id, error: msg });
    }
  }

  // Housekeeping: remove completed items
  await purgeCompleted();

  isSyncing = false;
  const remaining = await getPendingPhotos();
  emit({ type: 'sync-end', pendingCount: remaining.length });

  // If there are still items (new ones arrived during sync), go again
  if (remaining.length > 0 && isOnline) {
    setTimeout(() => drainQueue(), 2000);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Start the sync service. Safe to call multiple times — only initialises once. */
export async function startPhotoSyncService(): Promise<void> {
  if (started) return;
  started = true;
  await setupNetworkListeners();

  // Immediate drain on startup if we're online
  if (isOnline) {
    drainQueue();
  }

  // Periodic sweep every 30s (safety net)
  setInterval(() => {
    if (isOnline && !isSyncing) drainQueue();
  }, 30_000);
}

/** Manually trigger a sync attempt. */
export function triggerSync(): void {
  if (!isSyncing) drainQueue();
}

/** Current network status. */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/** Whether a sync is in progress. */
export function getSyncingStatus(): boolean {
  return isSyncing;
}

export { MAX_RETRIES };
