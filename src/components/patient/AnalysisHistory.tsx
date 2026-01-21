import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PatientPhotoRecord } from '@/hooks/usePatientPhotos';
import { CheckCircle, AlertTriangle, XCircle, Clock, ChevronRight, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnalysisResult } from './AnalysisResult';
import { PhotoAnalysis } from '@/types/patient';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisHistoryProps {
  photos: PatientPhotoRecord[];
  maxItems?: number;
}

interface ResolvedAlert {
  id: string;
  type: string;
  message: string;
  resolved_at: string;
  resolution_notes: string | null;
  resolved_by_profile?: {
    full_name: string;
  } | null;
}

function usePhotoAlerts(photoIds: string[]) {
  return useQuery({
    queryKey: ['photo-alerts', photoIds],
    queryFn: async () => {
      if (photoIds.length === 0) return {};

      // Get practitioner ID first for RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return {};

      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!practitioner) return {};

      const { data: alerts, error } = await supabase
        .from('practitioner_alerts')
        .select(`
          id,
          type,
          message,
          resolved,
          resolved_at,
          resolution_notes,
          resolved_by,
          photo_id
        `)
        .eq('practitioner_id', practitioner.id)
        .in('photo_id', photoIds)
        .eq('resolved', true);

      if (error) {
        console.error('Error fetching photo alerts:', error);
        return {};
      }

      // Get resolver profiles
      const alertsWithProfiles = await Promise.all(
        (alerts || []).map(async (alert) => {
          let resolverProfile = null;
          if (alert.resolved_by) {
            const { data: resolverData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', alert.resolved_by)
              .single();
            resolverProfile = resolverData;
          }
          return {
            ...alert,
            resolved_by_profile: resolverProfile,
          };
        })
      );

      // Group alerts by photo_id
      const alertsByPhoto: Record<string, ResolvedAlert[]> = {};
      alertsWithProfiles.forEach(alert => {
        if (alert.photo_id) {
          if (!alertsByPhoto[alert.photo_id]) {
            alertsByPhoto[alert.photo_id] = [];
          }
          alertsByPhoto[alert.photo_id].push(alert as ResolvedAlert);
        }
      });

      return alertsByPhoto;
    },
    enabled: photoIds.length > 0,
  });
}

export function AnalysisHistory({ photos, maxItems }: AnalysisHistoryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PatientPhotoRecord | null>(null);

  const analyzedPhotos = photos
    .filter(p => p.analysis_status === 'analyzed')
    .slice(0, maxItems);

  const photoIds = analyzedPhotos.map(p => p.id);
  const { data: alertsByPhoto = {} } = usePhotoAlerts(photoIds);

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'ok':
      case 'good':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'acceptable':
      case 'partial':
      case 'mild_inflammation':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'poor':
      case 'missing':
      case 'inflammation':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return null;
    
    const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="font-mono">
        {score}/100
      </Badge>
    );
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      attachment_lost: 'Taquet perdu',
      poor_insertion: 'Mauvaise insertion',
      gingival_issue: 'Problème gingival',
      missed_change: 'Changement manqué',
      photo_needed: 'Photo requise'
    };
    return labels[type] || type;
  };

  const convertToPhotoAnalysis = (photo: PatientPhotoRecord): PhotoAnalysis => ({
    status: photo.analysis_status as 'pending' | 'analyzed' | 'error',
    attachmentStatus: (photo.attachment_status as 'ok' | 'missing' | 'partial') || 'ok',
    insertionQuality: (photo.insertion_quality as 'good' | 'poor' | 'acceptable') || 'good',
    gingivalHealth: (photo.gingival_health as 'healthy' | 'mild_inflammation' | 'inflammation') || 'healthy',
    overallScore: photo.overall_score || 0,
    recommendations: photo.recommendations || [],
    analyzedAt: photo.analyzed_at ? new Date(photo.analyzed_at) : new Date(),
  });

  if (analyzedPhotos.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Aucune analyse dans l'historique
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold">Historique des analyses</h3>
        </div>
        <ScrollArea className="max-h-96">
          <div className="divide-y divide-border/50">
            {analyzedPhotos.map((photo) => {
              const photoAlerts = alertsByPhoto[photo.id] || [];
              
              return (
                <div key={photo.id} className="p-4">
                  <div
                    className="hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-4 rounded-lg p-2 -m-2"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    {/* Photo thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={photo.photo_url}
                        alt={`Photo du ${format(new Date(photo.created_at), 'd MMM', { locale: fr })}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          Gouttière #{photo.aligner_number}
                        </p>
                        {getScoreBadge(photo.overall_score)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {format(new Date(photo.created_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(photo.attachment_status)}
                          <span className="text-xs text-muted-foreground">Taquets</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(photo.insertion_quality)}
                          <span className="text-xs text-muted-foreground">Insertion</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(photo.gingival_health)}
                          <span className="text-xs text-muted-foreground">Gencives</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>

                  {/* Resolved alerts with notes for this photo */}
                  {photoAlerts.length > 0 && (
                    <div className="mt-3 ml-20 space-y-2">
                      {photoAlerts.map((alert) => (
                        <div 
                          key={alert.id}
                          className="p-3 bg-success/5 border border-success/20 rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-xs text-success mb-1">
                            <CheckCircle className="h-3 w-3" />
                            <span className="font-medium">
                              {getAlertTypeLabel(alert.type)} - Résolu le {format(new Date(alert.resolved_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                            </span>
                            {alert.resolved_by_profile && (
                              <>
                                <span className="text-muted-foreground">par</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {alert.resolved_by_profile.full_name}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Resolution notes */}
                          {alert.resolution_notes && (
                            <div className="mt-2 flex items-start gap-2">
                              <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-foreground italic">
                                "{alert.resolution_notes}"
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Detail modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Analyse du {selectedPhoto && format(new Date(selectedPhoto.created_at), 'd MMMM yyyy', { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPhoto && (
            <div className="space-y-4">
              {/* Photo */}
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedPhoto.photo_url}
                  alt="Photo analysée"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Analysis result */}
              <AnalysisResult analysis={convertToPhotoAnalysis(selectedPhoto)} />

              {/* Resolved alerts for this photo */}
              {alertsByPhoto[selectedPhoto.id]?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Alertes résolues</h4>
                  {alertsByPhoto[selectedPhoto.id].map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-3 bg-success/5 border border-success/20 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-xs text-success mb-1">
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-medium">
                          {getAlertTypeLabel(alert.type)} - Résolu le {format(new Date(alert.resolved_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </span>
                      </div>
                      {alert.resolved_by_profile && (
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          par {alert.resolved_by_profile.full_name}
                        </p>
                      )}
                      {alert.resolution_notes && (
                        <div className="mt-2 flex items-start gap-2">
                          <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-foreground italic">
                            "{alert.resolution_notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
