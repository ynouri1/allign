/**
 * Offline Photo Queue — IndexedDB store
 *
 * Stores captured photos locally when the device is offline (or as a resilient
 * first-write).  Each entry holds the raw data-URL, metadata needed to
 * reproduce the full upload + analysis pipeline, and a sync status.
 *
 * Schema  : smile-tracker-photos / pending-photos
 * Engine  : idb (tiny wrapper over IndexedDB)
 */

import { openDB, type IDBPDatabase } from 'idb';

// ── Types ──────────────────────────────────────────────────────────────────

export type QueueItemStatus = 'pending' | 'uploading' | 'analyzing' | 'done' | 'error';

export interface QueuedPhoto {
  /** Auto-incremented IndexedDB key */
  id?: number;
  /** data:image/jpeg;base64,… */
  dataUrl: string;
  /** front | left | right | occlusal */
  angle: string;
  /** Patient UUID (from Supabase) */
  patientId: string;
  /** Current aligner number at capture time */
  alignerNumber: number;
  /** Teeth with attachments (for Gemini) */
  attachmentTeeth: string[];
  /** Timestamp of capture */
  capturedAt: string;
  /** Current sync status */
  status: QueueItemStatus;
  /** Number of failed sync attempts */
  retryCount: number;
  /** Last error message (if any) */
  lastError?: string;
  /** Supabase photo record ID (set after successful upload) */
  remotePhotoId?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DB_NAME = 'smile-tracker-photos';
const DB_VERSION = 1;
const STORE_NAME = 'pending-photos';
const MAX_RETRIES = 5;

// ── Database singleton ─────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-status', 'status');
          store.createIndex('by-patient', 'patientId');
        }
      },
    });
  }
  return dbPromise;
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Enqueue a captured photo for later upload + analysis. */
export async function enqueuePhoto(photo: Omit<QueuedPhoto, 'id' | 'status' | 'retryCount' | 'capturedAt'>): Promise<number> {
  const db = await getDb();
  const entry: Omit<QueuedPhoto, 'id'> = {
    ...photo,
    capturedAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };
  const id = await db.add(STORE_NAME, entry);
  return id as number;
}

/** Enqueue a batch of photos (one capture session). */
export async function enqueuePhotoBatch(
  photos: Omit<QueuedPhoto, 'id' | 'status' | 'retryCount' | 'capturedAt'>[],
): Promise<number[]> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const ids: number[] = [];
  for (const photo of photos) {
    const entry: Omit<QueuedPhoto, 'id'> = {
      ...photo,
      capturedAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    const id = await tx.store.add(entry);
    ids.push(id as number);
  }
  await tx.done;
  return ids;
}

/** Get all items that need syncing (pending or error with retries left). */
export async function getPendingPhotos(): Promise<QueuedPhoto[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE_NAME, 'by-status', 'pending');
  const retryable = (await db.getAllFromIndex(STORE_NAME, 'by-status', 'error'))
    .filter((item) => item.retryCount < MAX_RETRIES);
  return [...all, ...retryable] as QueuedPhoto[];
}

/** Get all items in the queue (for UI display). */
export async function getAllQueuedPhotos(): Promise<QueuedPhoto[]> {
  const db = await getDb();
  return (await db.getAll(STORE_NAME)) as QueuedPhoto[];
}

/** Count of items still to sync. */
export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const pending = await db.countFromIndex(STORE_NAME, 'by-status', 'pending');
  const errorRetryable = (await db.getAllFromIndex(STORE_NAME, 'by-status', 'error'))
    .filter((item) => item.retryCount < MAX_RETRIES).length;
  return pending + errorRetryable;
}

/** Update an item's status (and optionally error info). */
export async function updateQueueItem(
  id: number,
  patch: Partial<Pick<QueuedPhoto, 'status' | 'retryCount' | 'lastError' | 'remotePhotoId'>>,
): Promise<void> {
  const db = await getDb();
  const item = await db.get(STORE_NAME, id);
  if (!item) return;
  Object.assign(item, patch);
  await db.put(STORE_NAME, item);
}

/** Remove a successfully synced item. */
export async function removeQueueItem(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

/** Remove all items marked 'done'. */
export async function purgeCompleted(): Promise<number> {
  const db = await getDb();
  const done = await db.getAllFromIndex(STORE_NAME, 'by-status', 'done');
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const item of done) {
    if (item.id != null) await tx.store.delete(item.id);
  }
  await tx.done;
  return done.length;
}

/** Clear the entire queue (dev/debug). */
export async function clearQueue(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export { MAX_RETRIES };
