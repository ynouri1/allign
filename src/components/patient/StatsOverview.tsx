import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { PatientPhotoRecord } from '@/hooks/usePatientPhotos';
import { Camera, Timer, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePatientAlerts } from '@/hooks/usePatientAlerts';
import { useWearTimer, formatDurationShort, DAILY_GOAL_SECONDS } from '@/hooks/useWearTimer';

interface StatsOverviewProps {
  photos: PatientPhotoRecord[];
  patientId?: string;
  /** When provided, overrides the usePatientAlerts() lookup (useful in practitioner context) */
  alertCount?: number;
}

export function StatsOverview({ photos, patientId, alertCount }: StatsOverviewProps) {
  const { data: alertsData } = usePatientAlerts();
  const { totalSeconds } = useWearTimer(patientId);
  
  const stats = useMemo(() => {
    const analyzed = photos.filter(p => p.analysis_status === 'analyzed');

    const healthy = analyzed.filter(p =>
      p.attachment_status === 'ok' &&
      (p.insertion_quality === 'good' || p.insertion_quality === 'acceptable') &&
      (p.gingival_health === 'healthy' || p.gingival_health === 'mild_inflammation')
    ).length;

    return {
      totalPhotos: photos.length,
      analyzedPhotos: analyzed.length,
      healthyCount: healthy,
    };
  }, [photos]);

  // Use prop override if provided (practitioner view), otherwise use hook (patient view)
  const unresolvedAlerts = alertCount ?? alertsData?.unresolvedCount ?? 0;

  const goalHours = DAILY_GOAL_SECONDS / 3600;
  const wearPercent = Math.min(100, Math.round((totalSeconds / DAILY_GOAL_SECONDS) * 100));
  const goalReached = totalSeconds >= DAILY_GOAL_SECONDS;

  const statCards = [
    {
      label: 'Photos prises',
      value: stats.totalPhotos,
      icon: Camera,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: `Port (obj. ${goalHours}h)`,
      value: totalSeconds > 0 ? formatDurationShort(totalSeconds) : '-',
      icon: Timer,
      color: goalReached ? 'text-green-500' : wearPercent >= 50 ? 'text-primary' : 'text-amber-500',
      bgColor: goalReached ? 'bg-green-500/10' : wearPercent >= 50 ? 'bg-primary/10' : 'bg-amber-500/10',
    },
    {
      label: 'Analyses OK',
      value: stats.healthyCount,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Alertes',
      value: unresolvedAlerts,
      icon: AlertTriangle,
      color: unresolvedAlerts > 0 ? 'text-warning' : 'text-muted-foreground',
      bgColor: unresolvedAlerts > 0 ? 'bg-warning/10' : 'bg-muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
