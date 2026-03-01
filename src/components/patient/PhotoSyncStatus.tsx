/**
 * PhotoSyncStatus — small status bar displayed when photos are queued.
 *
 * Shows:
 *  - Pending count + sync progress
 *  - Online / Offline badge
 *  - Manual retry button
 */

import { Wifi, WifiOff, RefreshCw, CloudUpload, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflinePhotoQueue } from '@/hooks/useOfflinePhotoQueue';
import { cn } from '@/lib/utils';

export function PhotoSyncStatus() {
  const { pendingCount, isOnline, isSyncing, retry, queue } = useOfflinePhotoQueue();

  // Nothing to show if queue is empty and online
  if (pendingCount === 0 && isOnline && queue.length === 0) return null;

  const errorCount = queue.filter((q) => q.status === 'error').length;
  const uploadingCount = queue.filter((q) => q.status === 'uploading' || q.status === 'analyzing').length;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2 text-sm transition-colors',
        !isOnline
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
          : errorCount > 0
            ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
            : 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950',
      )}
    >
      {/* Network badge */}
      {isOnline ? (
        <Badge variant="outline" className="gap-1 border-teal-400 text-teal-700 dark:text-teal-300">
          <Wifi className="h-3 w-3" /> En ligne
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700 dark:text-amber-300">
          <WifiOff className="h-3 w-3" /> Hors ligne
        </Badge>
      )}

      {/* Status text */}
      <span className="flex-1">
        {isSyncing ? (
          <span className="flex items-center gap-1">
            <CloudUpload className="h-4 w-4 animate-pulse" />
            Synchronisation… ({uploadingCount}/{pendingCount})
          </span>
        ) : pendingCount === 0 ? (
          <span className="flex items-center gap-1 text-teal-700 dark:text-teal-300">
            <CheckCircle2 className="h-4 w-4" />
            Toutes les photos sont synchronisées
          </span>
        ) : (
          <span>
            {pendingCount} photo(s) en attente
            {errorCount > 0 && (
              <span className="ml-1 text-red-600 dark:text-red-400">
                ({errorCount} erreur{errorCount > 1 ? 's' : ''})
              </span>
            )}
          </span>
        )}
      </span>

      {/* Retry button */}
      {pendingCount > 0 && isOnline && !isSyncing && (
        <Button variant="ghost" size="sm" onClick={retry} className="h-7 gap-1 text-xs">
          <RefreshCw className="h-3 w-3" /> Réessayer
        </Button>
      )}
    </div>
  );
}
