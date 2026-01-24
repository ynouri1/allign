import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { PatientPhotoRecord } from '@/hooks/usePatientPhotos';
import { Camera, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePatientAlerts } from '@/hooks/usePatientAlerts';

interface StatsOverviewProps {
  photos: PatientPhotoRecord[];
}

export function StatsOverview({ photos }: StatsOverviewProps) {
  const { data: alertsData } = usePatientAlerts();
  
  const stats = useMemo(() => {
    const analyzed = photos.filter(p => p.analysis_status === 'analyzed');
    
    const avgScore = analyzed.length > 0
      ? Math.round(analyzed.reduce((sum, p) => sum + (p.overall_score || 0), 0) / analyzed.length)
      : null;

    const healthy = analyzed.filter(p =>
      p.attachment_status === 'ok' &&
      (p.insertion_quality === 'good' || p.insertion_quality === 'acceptable') &&
      (p.gingival_health === 'healthy' || p.gingival_health === 'mild_inflammation')
    ).length;

    return {
      totalPhotos: photos.length,
      analyzedPhotos: analyzed.length,
      avgScore,
      healthyCount: healthy,
    };
  }, [photos]);

  // Use unresolved alerts count from practitioner_alerts
  const unresolvedAlerts = alertsData?.unresolvedCount || 0;

  const statCards = [
    {
      label: 'Photos prises',
      value: stats.totalPhotos,
      icon: Camera,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Score moyen',
      value: stats.avgScore !== null ? `${stats.avgScore}%` : '-',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
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
