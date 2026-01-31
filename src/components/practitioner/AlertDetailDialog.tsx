import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Camera, 
  User,
  Calendar,
  Clock,
  MessageSquare,
  ImageOff
} from 'lucide-react';
import { PractitionerAlert } from '@/hooks/usePractitionerAlerts';
import { cn } from '@/lib/utils';

interface AlertDetailDialogProps {
  alert: PractitionerAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (alertId: string, notes?: string) => void;
  isResolving?: boolean;
}

export function AlertDetailDialog({ 
  alert, 
  open, 
  onOpenChange, 
  onResolve,
  isResolving 
}: AlertDetailDialogProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Reset states when alert changes
  useEffect(() => {
    if (alert) {
      setImageError(false);
      setImageLoading(true);
    }
  }, [alert?.id]);

  if (!alert) return null;

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

  const getSeverityConfig = (severity: PractitionerAlert['severity']) => {
    switch (severity) {
      case 'high':
        return { label: 'Haute', color: 'destructive' as const, icon: XCircle };
      case 'medium':
        return { label: 'Moyenne', color: 'secondary' as const, icon: AlertTriangle };
      case 'low':
        return { label: 'Basse', color: 'outline' as const, icon: Info };
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'ok':
      case 'good':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'acceptable':
      case 'partial':
      case 'mild_inflammation':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'poor':
      case 'missing':
      case 'inflammation':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (type: string, status: string | null) => {
    if (!status) return '-';
    const labels: Record<string, Record<string, string>> = {
      attachment: {
        ok: 'Tous en place',
        missing: 'Taquet manquant',
        partial: 'Partiellement visible'
      },
      insertion: {
        good: 'Bonne insertion',
        acceptable: 'Acceptable',
        poor: 'Mauvaise insertion'
      },
      gingival: {
        healthy: 'Gencives saines',
        mild_inflammation: 'Légère inflammation',
        inflammation: 'Inflammation détectée'
      }
    };
    return labels[type]?.[status] || status;
  };

  const severityConfig = getSeverityConfig(alert.severity);
  const SeverityIcon = severityConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <SeverityIcon className={cn(
              "h-6 w-6",
              alert.severity === 'high' ? 'text-destructive' :
              alert.severity === 'medium' ? 'text-warning' : 'text-info'
            )} />
            <div>
              <DialogTitle className="text-xl">
                {getAlertTypeLabel(alert.type)}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(alert.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Patient Info */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{alert.patient?.profile?.full_name || 'Patient'}</p>
                  <p className="text-sm text-muted-foreground">
                    Gouttière {alert.patient?.current_aligner}/{alert.patient?.total_aligners}
                  </p>
                </div>
                <Badge variant={severityConfig.color} className="ml-auto">
                  Priorité {severityConfig.label}
                </Badge>
              </div>
            </Card>

            {/* Alert Message */}
            <div>
              <h3 className="font-semibold mb-2">Description de l'alerte</h3>
              <Card className="p-4 bg-muted/50">
                {alert.message ? (
                  <p className="text-foreground">{alert.message}</p>
                ) : (
                  <p className="text-muted-foreground italic">Aucune description disponible</p>
                )}
              </Card>
            </div>

            {/* Photo Section */}
            {alert.photo ? (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Photo du patient
                </h3>
                
                {/* Photo - Full width, high quality display */}
                <div className="flex items-center justify-center bg-black rounded-xl overflow-hidden mb-4 relative">
                  {imageLoading && !imageError && (
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  )}
                  {imageError ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-16">
                      <ImageOff className="h-12 w-12 mb-2" />
                      <p className="text-sm">Photo non disponible</p>
                      <p className="text-xs">Le lien a peut-être expiré</p>
                    </div>
                  ) : (
                    <img
                      src={alert.photo.photo_url}
                      alt="Photo du patient"
                      className={cn(
                        "w-full h-auto max-h-[500px] object-contain transition-opacity",
                        imageLoading ? "opacity-0" : "opacity-100"
                      )}
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                    />
                  )}
                </div>

                {/* Photo metadata */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(alert.photo.created_at), 'd MMM yyyy', { locale: fr })}
                  </div>
                  <div>
                    Gouttière #{alert.photo.aligner_number}
                  </div>
                  {alert.photo.overall_score !== null && (
                    <Badge variant={
                      alert.photo.overall_score >= 80 ? 'default' :
                      alert.photo.overall_score >= 60 ? 'secondary' : 'destructive'
                    }>
                      Score: {alert.photo.overall_score}/100
                    </Badge>
                  )}
                </div>

                {/* AI Analysis Results */}
                <Card className="p-4 border-0 bg-card">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4 text-info" />
                    Observations IA
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {getStatusIcon(alert.photo.attachment_status)}
                      <div>
                        <p className="text-xs text-muted-foreground">Taquets</p>
                        <p className="text-sm font-medium">
                          {getStatusLabel('attachment', alert.photo.attachment_status)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {getStatusIcon(alert.photo.insertion_quality)}
                      <div>
                        <p className="text-xs text-muted-foreground">Insertion</p>
                        <p className="text-sm font-medium">
                          {getStatusLabel('insertion', alert.photo.insertion_quality)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {getStatusIcon(alert.photo.gingival_health)}
                      <div>
                        <p className="text-xs text-muted-foreground">Gencives</p>
                        <p className="text-sm font-medium">
                          {getStatusLabel('gingival', alert.photo.gingival_health)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {alert.photo.recommendations && alert.photo.recommendations.length > 0 && (
                    <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                      <p className="text-sm font-medium text-info mb-2">Recommandations IA</p>
                      <ul className="space-y-1">
                        {alert.photo.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-info">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Aucune photo associée à cette alerte
                </p>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        {!alert.resolved && (
          <div className="space-y-4 pt-4 border-t mt-4">
            {/* Resolution notes input */}
            <div className="space-y-2">
              <Label htmlFor="resolution-notes" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Commentaire de résolution (optionnel)
              </Label>
              <Textarea
                id="resolution-notes"
                placeholder="Ajoutez un commentaire sur cette résolution..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setResolutionNotes('');
                  onOpenChange(false);
                }}
              >
                Fermer
              </Button>
              <Button 
                variant="default"
                className="flex-1 gap-2"
                onClick={() => {
                  onResolve(alert.id, resolutionNotes.trim() || undefined);
                  setResolutionNotes('');
                }}
                disabled={isResolving}
              >
                <CheckCircle className="h-4 w-4" />
                Marquer comme résolu
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
