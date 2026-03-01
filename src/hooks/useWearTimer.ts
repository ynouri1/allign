import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────

const DAILY_GOAL_HOURS = 16;
export const DAILY_GOAL_SECONDS = DAILY_GOAL_HOURS * 3600;

const LS_ACTIVE_SESSION_KEY = 'wear_timer_active_session';
const LS_REMINDER_KEY = 'wear_timer_reminder';

// ── Types ────────────────────────────────────────────────────

export interface WearSession {
  id: string;
  patient_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

interface ActiveSessionCache {
  sessionId: string;
  startedAt: string; // ISO string
}

interface ReminderCache {
  fireAt: number; // epoch ms
  label: string;
}

// ── Helpers ──────────────────────────────────────────────────

function todayRange(): { startOfDay: string; endOfDay: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    startOfDay: start.toISOString(),
    endOfDay: end.toISOString(),
  };
}

/** Compute total seconds from a list of sessions (including a running one). */
export function computeTotalSeconds(sessions: WearSession[], now: Date = new Date()): number {
  let total = 0;
  for (const s of sessions) {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : now.getTime();
    total += Math.max(0, end - start);
  }
  return Math.floor(total / 1000);
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDurationShort(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}min`;
}

// ── Notification helpers ─────────────────────────────────────

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function fireNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
  // Also fire a toast as fallback / supplement
  toast.info(title, { description: body, duration: 15_000 });
}

// ── Hook ─────────────────────────────────────────────────────

export function useWearTimer(patientId: string | undefined) {
  const queryClient = useQueryClient();
  const [tick, setTick] = useState(0); // forces re-render every second
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reminderTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reminderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reminder, setReminder] = useState<ReminderCache | null>(null);

  // ── Fetch today's sessions ──────────────────────────────

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['wear-sessions', patientId, 'today'],
    queryFn: async () => {
      if (!patientId) return [];
      const { startOfDay, endOfDay } = todayRange();
      const { data, error } = await supabase
        .from('wear_time_sessions')
        .select('*')
        .eq('patient_id', patientId)
        .gte('started_at', startOfDay)
        .lt('started_at', endOfDay)
        .order('started_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WearSession[];
    },
    enabled: !!patientId,
    refetchInterval: 60_000, // light background sync
  });

  // ── Derive state ────────────────────────────────────────

  const activeSession = Array.isArray(sessions) ? sessions.find((s) => s.ended_at === null) ?? null : null;
  const isRunning = activeSession !== null;

  const totalSeconds = computeTotalSeconds(Array.isArray(sessions) ? sessions : []);
  const progressPercent = Math.min(100, (totalSeconds / DAILY_GOAL_SECONDS) * 100);

  // ── Tick (real-time update while running) ───────────────

  useEffect(() => {
    if (isRunning) {
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isRunning]);

  // ── Reminder tick (update countdown every second while paused) ──

  useEffect(() => {
    if (!isRunning && reminder) {
      // When chrono is paused and a reminder is active, tick every second
      // to keep the reminder countdown display up to date
      reminderTickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      if (reminderTickRef.current) clearInterval(reminderTickRef.current);
      reminderTickRef.current = null;
    }
    return () => {
      if (reminderTickRef.current) clearInterval(reminderTickRef.current);
    };
  }, [isRunning, reminder]);

  // ── Restore reminder from localStorage ─────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_REMINDER_KEY);
      if (stored) {
        const parsed: ReminderCache = JSON.parse(stored);
        if (parsed.fireAt > Date.now()) {
          setReminder(parsed);
        } else {
          localStorage.removeItem(LS_REMINDER_KEY);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ── Schedule reminder timeout ──────────────────────────

  useEffect(() => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }

    if (!reminder) return;

    const ms = reminder.fireAt - Date.now();
    if (ms <= 0) {
      // Already due
      fireNotification('🦷 Remettez votre gouttière !', reminder.label);
      setReminder(null);
      localStorage.removeItem(LS_REMINDER_KEY);
      return;
    }

    reminderTimeoutRef.current = setTimeout(() => {
      fireNotification('🦷 Remettez votre gouttière !', reminder.label);
      setReminder(null);
      localStorage.removeItem(LS_REMINDER_KEY);
    }, ms);

    return () => {
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
    };
  }, [reminder]);

  // ── Mutations ──────────────────────────────────────────

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('No patient');
      const { data, error } = await supabase
        .from('wear_time_sessions')
        .insert({ patient_id: patientId })
        .select()
        .single();
      if (error) throw error;
      return data as WearSession;
    },
    onSuccess: (data) => {
      // Cache for fast reload
      const cache: ActiveSessionCache = { sessionId: data.id, startedAt: data.started_at };
      localStorage.setItem(LS_ACTIVE_SESSION_KEY, JSON.stringify(cache));
      // Cancel any active reminder since we're wearing again
      cancelReminder();
      queryClient.invalidateQueries({ queryKey: ['wear-sessions', patientId] });
    },
    onError: (err) => {
      console.error('Error starting wear session:', err);
      toast.error('Impossible de démarrer le chrono');
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error('No active session');
      const { error } = await supabase
        .from('wear_time_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      localStorage.removeItem(LS_ACTIVE_SESSION_KEY);
      queryClient.invalidateQueries({ queryKey: ['wear-sessions', patientId] });
    },
    onError: (err) => {
      console.error('Error stopping wear session:', err);
      toast.error('Impossible d\'arrêter le chrono');
    },
  });

  // ── Public API ─────────────────────────────────────────

  const start = useCallback(() => {
    if (isRunning) return;
    startMutation.mutate();
  }, [isRunning, startMutation]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    stopMutation.mutate();
  }, [isRunning, stopMutation]);

  const setReminderMinutes = useCallback(async (minutes: number) => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      toast.warning('Notifications désactivées', {
        description: 'Activez les notifications dans les paramètres de votre navigateur pour recevoir le rappel.',
      });
    }
    const fireAt = Date.now() + minutes * 60_000;
    const label = `Pause de ${minutes} min terminée — remettez votre gouttière !`;
    const cache: ReminderCache = { fireAt, label };
    localStorage.setItem(LS_REMINDER_KEY, JSON.stringify(cache));
    setReminder(cache);
    toast.success(`Rappel dans ${minutes} minutes`);
  }, []);

  const cancelReminder = useCallback(() => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }
    setReminder(null);
    localStorage.removeItem(LS_REMINDER_KEY);
  }, []);

  const reminderRemainingMs = reminder ? Math.max(0, reminder.fireAt - Date.now()) : null;

  return {
    // State
    sessions,
    isLoading,
    isRunning,
    activeSession,
    totalSeconds,
    progressPercent,
    reminder,
    reminderRemainingMs,

    // Actions
    start,
    stop,
    setReminderMinutes,
    cancelReminder,

    // Mutation states
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
