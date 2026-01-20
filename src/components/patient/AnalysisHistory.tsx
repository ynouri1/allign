import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PatientPhotoRecord } from '@/hooks/usePatientPhotos';
import { CheckCircle, AlertTriangle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnalysisResult } from './AnalysisResult';
import { PhotoAnalysis } from '@/types/patient';

interface AnalysisHistoryProps {
  photos: PatientPhotoRecord[];
  maxItems?: number;
}

export function AnalysisHistory({ photos, maxItems }: AnalysisHistoryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PatientPhotoRecord | null>(null);

  const analyzedPhotos = photos
    .filter(p => p.analysis_status === 'analyzed')
    .slice(0, maxItems);

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
        <ScrollArea className="max-h-80">
          <div className="divide-y divide-border/50">
            {analyzedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-4"
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
            ))}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
