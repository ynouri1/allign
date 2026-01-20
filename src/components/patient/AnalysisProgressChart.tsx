import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PatientPhotoRecord } from '@/hooks/usePatientPhotos';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalysisProgressChartProps {
  photos: PatientPhotoRecord[];
}

export function AnalysisProgressChart({ photos }: AnalysisProgressChartProps) {
  const chartData = useMemo(() => {
    // Filter only analyzed photos and sort by date
    const analyzed = photos
      .filter(p => p.analysis_status === 'analyzed' && p.overall_score !== null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return analyzed.map(photo => ({
      date: format(new Date(photo.created_at), 'd MMM', { locale: fr }),
      fullDate: format(new Date(photo.created_at), 'd MMMM yyyy', { locale: fr }),
      score: photo.overall_score,
      aligner: photo.aligner_number,
      attachment: photo.attachment_status === 'ok' ? 100 : photo.attachment_status === 'partial' ? 50 : 0,
      insertion: photo.insertion_quality === 'good' ? 100 : photo.insertion_quality === 'acceptable' ? 70 : 40,
      gingival: photo.gingival_health === 'healthy' ? 100 : photo.gingival_health === 'mild_inflammation' ? 60 : 30,
    }));
  }, [photos]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].score || 0;
    const last = chartData[chartData.length - 1].score || 0;
    const diff = last - first;
    return {
      value: diff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          Pas encore d'analyse disponible. Prenez des photos pour voir votre progression.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Évolution du score global</h3>
        {trend && (
          <Badge
            variant={trend.direction === 'up' ? 'default' : trend.direction === 'down' ? 'destructive' : 'secondary'}
            className="flex items-center gap-1"
          >
            {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
            {trend.direction === 'stable' && <Minus className="h-3 w-3" />}
            {trend.value > 0 ? '+' : ''}{trend.value} pts
          </Badge>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  score: 'Score global',
                  attachment: 'Taquets',
                  insertion: 'Insertion',
                  gingival: 'Gencives',
                };
                return [`${value}%`, labels[name] || name];
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  score: 'Score global',
                  attachment: 'Taquets',
                  insertion: 'Insertion',
                  gingival: 'Gencives',
                };
                return labels[value] || value;
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="attachment"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="insertion"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="gingival"
              stroke="hsl(var(--info))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {chartData.length} analyse{chartData.length > 1 ? 's' : ''} depuis le début du traitement
      </p>
    </Card>
  );
}
