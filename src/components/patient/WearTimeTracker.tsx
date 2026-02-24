import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Pause, Bell, BellOff, Clock, Timer, Coffee, Moon, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useWearTimer,
  formatDuration,
  formatDurationShort,
  DAILY_GOAL_SECONDS,
  type WearSession,
} from '@/hooks/useWearTimer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Sub-components ──────────────────────────────────────────

function CircularProgress({
  percent,
  size = 180,
  strokeWidth = 10,
  children,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  // Color changes based on progress toward 16h goal
  const getColor = () => {
    if (percent >= 90) return 'stroke-green-500';
    if (percent >= 60) return 'stroke-primary';
    if (percent >= 30) return 'stroke-amber-500';
    return 'stroke-red-400';
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/20"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn('transition-all duration-500', getColor())}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: WearSession }) {
  const start = new Date(session.started_at);
  const end = session.ended_at ? new Date(session.ended_at) : new Date();
  const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{format(start, 'HH:mm', { locale: fr })}</span>
        <span className="text-muted-foreground/50">→</span>
        <span>{session.ended_at ? format(end, 'HH:mm', { locale: fr }) : 'en cours…'}</span>
      </div>
      <Badge variant={session.ended_at ? 'secondary' : 'default'} className="text-xs">
        {formatDurationShort(durationSec)}
      </Badge>
    </div>
  );
}

// ── Reminder presets ────────────────────────────────────────

const REMINDER_PRESETS = [
  { minutes: 15, label: '15 min', icon: Coffee, description: 'Pause café' },
  { minutes: 30, label: '30 min', icon: UtensilsCrossed, description: 'Déjeuner rapide' },
  { minutes: 45, label: '45 min', icon: UtensilsCrossed, description: 'Déjeuner / Dîner' },
  { minutes: 60, label: '1h', icon: Moon, description: 'Pause longue' },
] as const;

// ── Main component ──────────────────────────────────────────

interface WearTimeTrackerProps {
  patientId: string | undefined;
}

export function WearTimeTracker({ patientId }: WearTimeTrackerProps) {
  const {
    sessions,
    isLoading,
    isRunning,
    totalSeconds,
    progressPercent,
    reminder,
    reminderRemainingMs,
    start,
    stop,
    setReminderMinutes,
    cancelReminder,
    isStarting,
    isStopping,
  } = useWearTimer(patientId);

  const [customMinutes, setCustomMinutes] = useState<string>('');

  if (!patientId) return null;

  const goalHours = DAILY_GOAL_SECONDS / 3600;
  const remainingSeconds = Math.max(0, DAILY_GOAL_SECONDS - totalSeconds);

  return (
    <div className="space-y-4">
      {/* Main timer card */}
      <Card className="p-6 glass-card">
        <div className="flex flex-col items-center gap-4">
          {/* Circular progress with timer */}
          <CircularProgress percent={progressPercent} size={200} strokeWidth={12}>
            <span className="text-3xl font-mono font-bold tracking-tight">
              {formatDuration(totalSeconds)}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              sur {goalHours}h objectif
            </span>
          </CircularProgress>

          {/* Remaining time info */}
          <p className="text-sm text-muted-foreground">
            {totalSeconds >= DAILY_GOAL_SECONDS ? (
              <span className="text-green-500 font-medium">🎉 Objectif atteint !</span>
            ) : (
              <>Encore <span className="font-medium text-foreground">{formatDurationShort(remainingSeconds)}</span> pour atteindre l'objectif</>
            )}
          </p>

          {/* Start / Stop button */}
          <Button
            size="lg"
            className={cn(
              'w-full max-w-xs gap-2 text-base font-semibold transition-all',
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'gradient-primary'
            )}
            onClick={isRunning ? stop : start}
            disabled={isStarting || isStopping || isLoading}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5" />
                Retirer la gouttière
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Porter la gouttière
              </>
            )}
          </Button>

          {isRunning && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3 animate-pulse text-green-500" />
              Chrono en cours…
            </p>
          )}
        </div>
      </Card>

      {/* Reminder card — shown only when NOT wearing (paused) */}
      {!isRunning && !isLoading && (
        <Card className="p-4 glass-card border-l-4 border-l-amber-400">
          <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-amber-500" />
            Rappel de remise en bouche
          </h4>

          {reminder ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">Rappel programmé</p>
                  <p className="text-xs text-muted-foreground">
                    Dans {formatDurationShort(Math.ceil((reminderRemainingMs ?? 0) / 1000))}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelReminder}
                  className="text-destructive hover:text-destructive"
                >
                  <BellOff className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preset buttons */}
              <div className="grid grid-cols-2 gap-2">
                {REMINDER_PRESETS.map((preset) => (
                  <Button
                    key={preset.minutes}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 flex items-center gap-2 justify-start"
                    onClick={() => setReminderMinutes(preset.minutes)}
                  >
                    <preset.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-xs">{preset.label}</div>
                      <div className="text-[10px] text-muted-foreground">{preset.description}</div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* Custom duration */}
              <div className="flex gap-2">
                <Select value={customMinutes} onValueChange={setCustomMinutes}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Durée personnalisée…" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 90, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m < 60 ? `${m} min` : `${m / 60}h`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!customMinutes}
                  onClick={() => {
                    setReminderMinutes(Number(customMinutes));
                    setCustomMinutes('');
                  }}
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Today's sessions */}
      {sessions.length > 0 && (
        <Card className="p-4 glass-card">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Sessions du jour
            <Badge variant="outline" className="ml-auto text-xs">
              {sessions.length} session{sessions.length > 1 ? 's' : ''}
            </Badge>
          </h4>
          <div className="max-h-48 overflow-y-auto">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </Card>
      )}

      {/* Linear progress bar — compact summary */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Port aujourd'hui</span>
          <span>{formatDurationShort(totalSeconds)} / {goalHours}h</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
    </div>
  );
}
