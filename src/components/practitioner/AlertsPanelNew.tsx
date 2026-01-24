import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Camera, XCircle, Eye, User, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PractitionerAlert } from '@/hooks/usePractitionerAlerts';
import { AlertDetailDialog } from './AlertDetailDialog';

interface AlertsPanelNewProps {
  alerts: PractitionerAlert[];
  onResolve: (alertId: string, notes?: string) => void;
  isResolving?: boolean;
}

interface GroupedAlerts {
  patientId: string;
  patientName: string;
  photoGroups: {
    photoId: string | null;
    photoUrl: string | null;
    photoDate: string | null;
    alerts: PractitionerAlert[];
  }[];
  totalAlerts: number;
  highSeverityCount: number;
}

export function AlertsPanelNew({ alerts, onResolve, isResolving }: AlertsPanelNewProps) {
  const [selectedAlert, setSelectedAlert] = useState<PractitionerAlert | null>(null);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());

  const getAlertIcon = (type: PractitionerAlert['type']) => {
    switch (type) {
      case 'attachment_lost':
        return <XCircle className="h-4 w-4" />;
      case 'poor_insertion':
        return <AlertTriangle className="h-4 w-4" />;
      case 'gingival_issue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'missed_change':
        return <Clock className="h-4 w-4" />;
      case 'photo_needed':
        return <Camera className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
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

  const getSeverityBadge = (severity: PractitionerAlert['severity']) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-destructive text-destructive-foreground text-xs">Urgent</Badge>;
      case 'medium':
        return <Badge className="bg-warning text-warning-foreground text-xs">Modéré</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Faible</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  // Group alerts by patient, then by photo
  const groupedAlerts: GroupedAlerts[] = (() => {
    const patientMap = new Map<string, GroupedAlerts>();

    unresolvedAlerts.forEach(alert => {
      const patientId = alert.patient_id;
      const patientName = alert.patient?.profile?.full_name || 'Patient inconnu';
      const photoId = alert.photo_id || null;
      const photoUrl = alert.photo?.photo_url || null;
      const photoDate = alert.photo?.created_at || null;

      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patientId,
          patientName,
          photoGroups: [],
          totalAlerts: 0,
          highSeverityCount: 0
        });
      }

      const patientGroup = patientMap.get(patientId)!;
      patientGroup.totalAlerts++;
      if (alert.severity === 'high') {
        patientGroup.highSeverityCount++;
      }

      // Find or create photo group
      let photoGroup = patientGroup.photoGroups.find(pg => pg.photoId === photoId);
      if (!photoGroup) {
        photoGroup = {
          photoId,
          photoUrl,
          photoDate,
          alerts: []
        };
        patientGroup.photoGroups.push(photoGroup);
      }
      photoGroup.alerts.push(alert);
    });

    // Sort by high severity count, then total alerts
    return Array.from(patientMap.values()).sort((a, b) => {
      if (b.highSeverityCount !== a.highSeverityCount) {
        return b.highSeverityCount - a.highSeverityCount;
      }
      return b.totalAlerts - a.totalAlerts;
    });
  })();

  const togglePatient = (patientId: string) => {
    setExpandedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

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

  const handleResolve = (alertId: string, notes?: string) => {
    onResolve(alertId, notes);
    setSelectedAlert(null);
  };

  return (
    <>
      <div className="space-y-3">
        {groupedAlerts.map((patientGroup) => {
          const isExpanded = expandedPatients.has(patientGroup.patientId);
          
          return (
            <Card key={patientGroup.patientId} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => togglePatient(patientGroup.patientId)}>
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "p-4 cursor-pointer transition-all hover:bg-muted/50 flex items-center gap-3",
                    patientGroup.highSeverityCount > 0 && "border-l-4 border-l-destructive"
                  )}>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="gradient-primary text-primary-foreground font-semibold text-sm">
                        {getInitials(patientGroup.patientName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {patientGroup.patientName}
                        </h3>
                        {patientGroup.highSeverityCount > 0 && (
                          <Badge className="bg-destructive text-destructive-foreground text-xs">
                            {patientGroup.highSeverityCount} urgent{patientGroup.highSeverityCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {patientGroup.totalAlerts} alerte{patientGroup.totalAlerts > 1 ? 's' : ''} • 
                        {patientGroup.photoGroups.filter(pg => pg.photoId).length} photo{patientGroup.photoGroups.filter(pg => pg.photoId).length > 1 ? 's' : ''} concernée{patientGroup.photoGroups.filter(pg => pg.photoId).length > 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="border-t bg-muted/20">
                    {patientGroup.photoGroups.map((photoGroup, idx) => (
                      <div key={photoGroup.photoId || `no-photo-${idx}`} className="border-b last:border-b-0">
                        {/* Photo header if there's a photo */}
                        {photoGroup.photoId && (
                          <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
                            <Camera className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Photo du {photoGroup.photoDate 
                                ? format(new Date(photoGroup.photoDate), 'd MMM yyyy à HH:mm', { locale: fr })
                                : 'Date inconnue'
                              }
                            </span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {photoGroup.alerts.length} alerte{photoGroup.alerts.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Alerts list */}
                        <div className="divide-y">
                          {photoGroup.alerts.map((alert) => (
                            <div
                              key={alert.id}
                              className={cn(
                                "px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors",
                                getSeverityClasses(alert.severity)
                              )}
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <div className="shrink-0">
                                {getAlertIcon(alert.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium uppercase tracking-wide">
                                    {getAlertTypeLabel(alert.type)}
                                  </span>
                                  {getSeverityBadge(alert.severity)}
                                </div>
                                <p className="text-sm line-clamp-1 opacity-90">
                                  {alert.message}
                                </p>
                                <span className="text-xs opacity-60">
                                  {format(new Date(alert.created_at), 'd MMM à HH:mm', { locale: fr })}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAlert(alert);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8"
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
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
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
