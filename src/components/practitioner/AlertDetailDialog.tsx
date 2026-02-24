import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ImageOff,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { PractitionerAlert } from '@/hooks/usePractitionerAlerts';
import { supabase } from '@/integrations/supabase/client';
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
  const [fetchedPhoto, setFetchedPhoto] = useState<PractitionerAlert['photo'] | null>(null);
  const [photoZoomed, setPhotoZoomed] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number } | null>(null);

  const toggleZoom = useCallback(() => {
    setPhotoZoomed(prev => {
      if (prev) setPanOffset({ x: 0, y: 0 });
      return !prev;
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!photoZoomed) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }, [photoZoomed, panOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!panStart.current) return;
    setPanOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const handlePointerUp = useCallback(() => {
    panStart.current = null;
  }, []);

  // Fetch photo directly if not provided in the alert join
  useEffect(() => {
    if (!alert) return;
    setImageError(false);
    setImageLoading(true);
    setFetchedPhoto(null);

    // If photo data is already present from the join, use it
    if (alert.photo?.photo_url) return;

    // Otherwise, fetch it directly using photo_id
    if (!alert.photo_id) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('patient_photos')
          .select('id, photo_url, angle, aligner_number, overall_score, attachment_status, insertion_quality, gingival_health, recommendations, analyzed_at, created_at')
          .eq('id', alert.photo_id!)
          .single();

        if (error || !data) {
          console.error('Error fetching photo for alert:', error);
          return;
        }

        // Create signed URL
        const match = data.photo_url.match(/aligner-photos\/(.+)$/);
        let signedUrl = data.photo_url;
        if (match) {
          const { data: signData } = await supabase.storage
            .from('aligner-photos')
            .createSignedUrl(match[1], 7200);
          if (signData?.signedUrl) {
            signedUrl = signData.signedUrl;
          }
        }

        setFetchedPhoto({ ...data, photo_url: signedUrl } as PractitionerAlert['photo']);
      } catch (err) {
        console.error('Failed to fetch photo for alert:', err);
      }
    })();
  }, [alert?.id, alert?.photo_id, alert?.photo?.photo_url]);

  if (!alert) return null;

  // Use photo from join if available, otherwise use directly fetched photo
  const photoData = alert.photo?.photo_url ? alert.photo : fetchedPhoto;

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
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPhotoZoomed(false); setPanOffset({ x: 0, y: 0 }); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col p-0" onPointerDownOutside={() => { setPhotoZoomed(false); setPanOffset({ x: 0, y: 0 }); }}>
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-2">
          <div className="flex items-center gap-3">
            <SeverityIcon className={cn(
              "h-5 w-5 sm:h-6 sm:w-6 shrink-0",
              alert.severity === 'high' ? 'text-destructive' :
              alert.severity === 'medium' ? 'text-warning' : 'text-info'
            )} />
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl">
                {getAlertTypeLabel(alert.type)}
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {format(new Date(alert.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-2">
          <div className="space-y-4 sm:space-y-6">
            {/* Patient Info */}
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base truncate">{alert.patient?.profile?.full_name || 'Patient'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Gouttière {alert.patient?.current_aligner}/{alert.patient?.total_aligners}
                  </p>
                </div>
                <Badge variant={severityConfig.color} className="ml-auto shrink-0 text-xs">
                  {severityConfig.label}
                </Badge>
              </div>
            </Card>

            {/* Alert Message */}
            <div>
              <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Description de l'alerte</h3>
              <Card className="p-3 sm:p-4 bg-muted/50">
                {alert.message ? (
                  <p className="text-foreground">{alert.message}</p>
                ) : (
                  <p className="text-muted-foreground italic">Aucune description disponible</p>
                )}
              </Card>
            </div>

            {/* Photo Section */}
            {photoData ? (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Photo du patient
                </h3>
                
                {/* Photo - responsive display with zoom */}
                <div className="relative mb-3 sm:mb-4">
                  <div
                    className={cn(
                      'bg-black rounded-lg sm:rounded-xl overflow-hidden relative min-h-[150px] sm:min-h-[200px]',
                      photoZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
                    )}
                    onClick={!photoZoomed ? toggleZoom : undefined}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  >
                    {imageLoading && !imageError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <Camera className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 animate-pulse" />
                          <p className="text-xs sm:text-sm">Chargement de la photo...</p>
                        </div>
                      </div>
                    )}
                    {imageError ? (
                      <div className="flex flex-col items-center justify-center text-muted-foreground py-8 sm:py-16">
                        <ImageOff className="h-8 w-8 sm:h-12 sm:w-12 mb-2" />
                        <p className="text-xs sm:text-sm">Photo non disponible</p>
                        <p className="text-xs">Le lien a peut-être expiré</p>
                      </div>
                    ) : (
                      <img
                        src={photoData.photo_url}
                        alt="Photo du patient"
                        className={cn(
                          "w-full h-auto max-h-[40vh] sm:max-h-[500px] object-contain transition-transform duration-200 select-none",
                          imageLoading ? "h-0 overflow-hidden" : "opacity-100"
                        )}
                        draggable={false}
                        style={{
                          transform: photoZoomed
                            ? `scale(2.5) translate(${panOffset.x / 2.5}px, ${panOffset.y / 2.5}px)`
                            : 'scale(1)',
                        }}
                        onLoad={() => setImageLoading(false)}
                        onError={() => {
                          setImageLoading(false);
                          setImageError(true);
                        }}
                      />
                    )}
                  </div>
                  {!imageError && !imageLoading && (
                    <button
                      onClick={toggleZoom}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      title={photoZoomed ? 'Dézoomer' : 'Zoomer'}
                    >
                      {photoZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {/* Photo metadata */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    {format(new Date(photoData.created_at), 'd MMM yyyy', { locale: fr })}
                  </div>
                  <div>
                    Gouttière #{photoData.aligner_number}
                  </div>
                  {photoData.overall_score !== null && (
                    <Badge variant={
                      photoData.overall_score >= 80 ? 'default' :
                      photoData.overall_score >= 60 ? 'secondary' : 'destructive'
                    }>
                      Score: {photoData.overall_score}/100
                    </Badge>
                  )}
                </div>

                {/* AI Analysis Results */}
                <Card className="p-3 sm:p-4 border-0 bg-card">
                  <h4 className="font-medium mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                    <Info className="h-4 w-4 text-info" />
                    Observations IA
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 text-center sm:text-left">
                      <span className="shrink-0">{getStatusIcon(photoData.attachment_status)}</span>
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Taquets</p>
                        <p className="text-xs sm:text-sm font-medium leading-tight">
                          {getStatusLabel('attachment', photoData.attachment_status)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 text-center sm:text-left">
                      <span className="shrink-0">{getStatusIcon(photoData.insertion_quality)}</span>
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Insertion</p>
                        <p className="text-xs sm:text-sm font-medium leading-tight">
                          {getStatusLabel('insertion', photoData.insertion_quality)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 text-center sm:text-left">
                      <span className="shrink-0">{getStatusIcon(photoData.gingival_health)}</span>
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Gencives</p>
                        <p className="text-xs sm:text-sm font-medium leading-tight">
                          {getStatusLabel('gingival', photoData.gingival_health)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {photoData.recommendations && photoData.recommendations.length > 0 && (
                    <div className="bg-info/10 border border-info/20 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm font-medium text-info mb-1 sm:mb-2">Recommandations IA</p>
                      <ul className="space-y-1">
                        {photoData.recommendations.map((rec, index) => (
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
            ) : alert.photo_id ? (
              <Card className="p-8 text-center">
                <Skeleton className="h-48 w-full rounded-lg mb-3" />
                <p className="text-muted-foreground text-sm">Chargement de la photo...</p>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Aucune photo associée à cette alerte
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        {!alert.resolved && (
          <div className="space-y-3 sm:space-y-4 px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 border-t shrink-0">
            {/* Resolution notes input */}
            <div className="space-y-2">
              <Label htmlFor="resolution-notes" className="flex items-center gap-2 text-xs sm:text-sm">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                Commentaire (optionnel)
              </Label>
              <Textarea
                id="resolution-notes"
                placeholder="Ajoutez un commentaire..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm"
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
