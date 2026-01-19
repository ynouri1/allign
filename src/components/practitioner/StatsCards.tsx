import { Users, AlertTriangle, Camera, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'warning' | 'success' | 'info';
}

function StatCard({ title, value, subtitle, icon, trend, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'bg-card',
    warning: 'bg-warning/5 border-warning/20',
    success: 'bg-success/5 border-success/20',
    info: 'bg-info/5 border-info/20'
  };

  return (
    <Card className={cn("p-5 transition-all duration-200 hover:shadow-md", variantClasses[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium mt-2",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              <TrendingUp className={cn("h-3 w-3", !trend.positive && "rotate-180")} />
              {trend.positive ? '+' : ''}{trend.value}%
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          variant === 'warning' && "bg-warning/10 text-warning",
          variant === 'success' && "bg-success/10 text-success",
          variant === 'info' && "bg-info/10 text-info",
          variant === 'default' && "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface StatsCardsProps {
  totalPatients: number;
  activeAlerts: number;
  photosToday: number;
  complianceRate: number;
}

export function StatsCards({ totalPatients, activeAlerts, photosToday, complianceRate }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Patients actifs"
        value={totalPatients}
        subtitle="En traitement"
        icon={<Users className="h-6 w-6" />}
        variant="info"
      />
      <StatCard
        title="Alertes actives"
        value={activeAlerts}
        subtitle="Requiert attention"
        icon={<AlertTriangle className="h-6 w-6" />}
        variant={activeAlerts > 0 ? 'warning' : 'success'}
      />
      <StatCard
        title="Photos aujourd'hui"
        value={photosToday}
        subtitle="Reçues"
        icon={<Camera className="h-6 w-6" />}
        variant="default"
      />
      <StatCard
        title="Taux d'observance"
        value={`${complianceRate}%`}
        subtitle="Moyenne globale"
        icon={<TrendingUp className="h-6 w-6" />}
        trend={{ value: 3.2, positive: true }}
        variant="success"
      />
    </div>
  );
}
