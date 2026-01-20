import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Camera, XCircle, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PractitionerAlert } from '@/hooks/usePractitionerAlerts';
import { AlertDetailDialog } from './AlertDetailDialog';

interface AlertsPanelNewProps {
  alerts: PractitionerAlert[];
  onResolve: (alertId: string) => void;
  isResolving?: boolean;
}

export function AlertsPanelNew({ alerts, onResolve, isResolving }: AlertsPanelNewProps) {
  const [selectedAlert, setSelectedAlert] = useState<PractitionerAlert | null>(null);

  const getAlertIcon = (type: PractitionerAlert['type']) => {
    switch (type) {
      case 'attachment_lost':
        return <XCircle className="h-5 w-5" />;
      case 'poor_insertion':
        return <AlertTriangle className="h-5 w-5" />;
      case 'gingival_issue':
        return <AlertTriangle className="h-5 w-5" />;
      case 'missed_change':
        return <Clock className="h-5 w-5" />;
      case 'photo_needed':
        return <Camera className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertTypeLabel = (type: PractitionerAlert['type']) => {
    const labels: Record<PractitionerAlert['type'], string> = {
      attachment_lost: 'Taquet perdu',
      poor_insertion: 'Mauvaise insertion',
      gingival_issue: 'Problème gingival',
      missed_change: 'Changement manqué',
      photo_needed: 'Photo requise'
    };
    return labels[type];
  };

  const getSeverityClasses = (severity: PractitionerAlert['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'medium':
        return 'bg-warning/10 border-warning/30 text-warning';
      case 'low':
        return 'bg-info/10 border-info/30 text-info';
    }
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  if (unresolvedAlerts.length === 0) {
    return (
      <Card className="p-8 text-center glass-card">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucune alerte</h3>
        <p className="text-sm text-muted-foreground">Tous vos patients sont en bonne voie</p>
      </Card>
    );
  }

  const handleResolve = (alertId: string) => {
    onResolve(alertId);
    setSelectedAlert(null);
  };

  return (
    <>
      <div className="space-y-3">
        {unresolvedAlerts.map((alert) => (
          <Card
            key={alert.id}
            className={cn(
              "p-4 border transition-all duration-200 hover:shadow-md cursor-pointer",
              getSeverityClasses(alert.severity)
            )}
            onClick={() => setSelectedAlert(alert)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                    {getAlertTypeLabel(alert.type)}
                  </span>
                  <span className="text-xs opacity-60">•</span>
                  <span className="text-xs opacity-60">
                    {format(new Date(alert.created_at), 'd MMM HH:mm', { locale: fr })}
                  </span>
                  {alert.photo && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Camera className="h-3 w-3" />
                      Photo
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm font-medium text-foreground mb-1">
                  {alert.patient?.profile?.full_name || 'Patient'}
                </p>
                
                <p className="text-sm opacity-80 line-clamp-2">
                  {alert.message}
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAlert(alert);
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Voir
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(alert.id);
                  }}
                  disabled={isResolving}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Résolu
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDetailDialog
        alert={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        onResolve={handleResolve}
        isResolving={isResolving}
      />
    </>
  );
}
