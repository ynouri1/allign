import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhotoAnalysis } from '@/types/patient';

interface AnalysisResultProps {
  analysis: PhotoAnalysis;
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'good':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'acceptable':
      case 'partial':
      case 'mild_inflammation':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusLabel = (type: string, status: string) => {
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

  return (
    <Card className="overflow-hidden border-0 glass-card">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Résultat de l'analyse IA</h3>
          <Badge variant="outline" className="font-mono">
            Score: <span className={`ml-1 font-bold ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}/100
            </span>
          </Badge>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon(analysis.attachmentStatus)}
            <div>
              <p className="text-xs text-muted-foreground">Taquets</p>
              <p className="text-sm font-medium">{getStatusLabel('attachment', analysis.attachmentStatus)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon(analysis.insertionQuality)}
            <div>
              <p className="text-xs text-muted-foreground">Insertion</p>
              <p className="text-sm font-medium">{getStatusLabel('insertion', analysis.insertionQuality)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon(analysis.gingivalHealth)}
            <div>
              <p className="text-xs text-muted-foreground">Gencives</p>
              <p className="text-sm font-medium">{getStatusLabel('gingival', analysis.gingivalHealth)}</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-info" />
              <p className="text-sm font-medium text-info">Recommandations</p>
            </div>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-info">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
