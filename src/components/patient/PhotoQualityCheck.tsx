import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, RotateCcw, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotoQualityScore } from '@/types/patient';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';

interface PhotoQualityCheckProps {
  photoUrl: string;
  onAccept: () => void;
  onRetake: () => void;
  isLastPhoto?: boolean;
}

export function PhotoQualityCheck({ 
  photoUrl, 
  onAccept, 
  onRetake,
  isLastPhoto = false 
}: PhotoQualityCheckProps) {
  const { analyzePhotoQuality, isAnalyzing } = usePhotoAnalysis();
  const [quality, setQuality] = useState<PhotoQualityScore | null>(null);

  useEffect(() => {
    analyzePhotoQuality(photoUrl).then(setQuality);
  }, [photoUrl, analyzePhotoQuality]);

  const getOverallStatus = () => {
    if (!quality) return 'analyzing';
    if (quality.overall >= 70) return 'excellent';
    if (quality.overall >= 50) return 'good';
    if (quality.overall >= 30) return 'acceptable';
    return 'poor';
  };

  const status = getOverallStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'excellent':
        return {
          icon: CheckCircle,
          label: 'Excellente qualité',
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/30',
          description: 'Cette photo est parfaite pour l\'analyse.',
        };
      case 'good':
        return {
          icon: CheckCircle,
          label: 'Bonne qualité',
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/30',
          description: 'Cette photo convient pour l\'analyse.',
        };
      case 'acceptable':
        return {
          icon: AlertTriangle,
          label: 'Qualité acceptable',
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/30',
          description: 'Cette photo peut être utilisée, mais une meilleure qualité donnerait de meilleurs résultats.',
        };
      case 'poor':
        return {
          icon: XCircle,
          label: 'Qualité insuffisante',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30',
          description: 'Nous vous recommandons de reprendre cette photo pour une analyse fiable.',
        };
      default:
        return {
          icon: Loader2,
          label: 'Analyse en cours...',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-muted',
          description: 'Vérification de la qualité de la photo.',
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  const renderQualityBar = (label: string, value: number, icon: string) => (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn(
            value >= 70 ? "text-success" : 
            value >= 50 ? "text-warning" : "text-destructive"
          )}>
            {value}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              value >= 70 ? "bg-success" : 
              value >= 50 ? "bg-warning" : "bg-destructive"
            )}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Photo preview */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
        <img 
          src={photoUrl} 
          alt="Captured photo" 
          className="w-full h-full object-contain"
        />
        
        {/* Status badge */}
        <div className={cn(
          "absolute top-3 right-3 px-3 py-1.5 rounded-full flex items-center gap-2",
          config.bgColor,
          "backdrop-blur-sm"
        )}>
          <StatusIcon className={cn("h-4 w-4", config.color, status === 'analyzing' && "animate-spin")} />
          <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
        </div>
      </div>

      {/* Quality details */}
      {quality && (
        <Card className={cn("p-4 space-y-4", config.borderColor, "border")}>
          {/* Overall status */}
          <div className={cn("p-3 rounded-lg", config.bgColor)}>
            <p className={cn("text-sm", config.color)}>{config.description}</p>
          </div>

          {/* Quality metrics */}
          <div className="space-y-3">
            {renderQualityBar('Luminosité', quality.brightness, '☀️')}
            {renderQualityBar('Netteté', quality.sharpness, '🎯')}
            {renderQualityBar('Cadrage', quality.framing, '📐')}
          </div>

          {/* Issues */}
          {quality.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Problèmes détectés :</p>
              {quality.issues.map((issue, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-start gap-2 text-sm p-2 rounded-lg",
                    issue.severity === 'error' ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  )}
                >
                  {issue.severity === 'error' ? (
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Loading state */}
      {isAnalyzing && (
        <Card className="p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analyse de la qualité...</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onRetake} 
          className="flex-1 gap-2"
          disabled={isAnalyzing}
        >
          <RotateCcw className="h-4 w-4" />
          Reprendre
        </Button>
        <Button 
          variant={status === 'poor' ? 'outline' : 'gradient'}
          onClick={onAccept} 
          className="flex-1 gap-2"
          disabled={isAnalyzing}
        >
          {status === 'poor' ? 'Utiliser quand même' : isLastPhoto ? 'Terminer' : 'Continuer'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {status === 'poor' && (
        <p className="text-xs text-center text-muted-foreground">
          Une photo de meilleure qualité améliore la précision de l'analyse IA.
        </p>
      )}
    </div>
  );
}
