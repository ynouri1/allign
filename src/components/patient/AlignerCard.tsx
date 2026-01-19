import { Calendar, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlignerCardProps {
  currentAligner: number;
  totalAligners: number;
  nextChangeDate: Date;
}

export function AlignerCard({ currentAligner, totalAligners, nextChangeDate }: AlignerCardProps) {
  const today = new Date();
  const daysUntilChange = differenceInDays(nextChangeDate, today);
  
  const getStatusColor = () => {
    if (daysUntilChange < 0) return 'bg-destructive';
    if (daysUntilChange <= 1) return 'bg-warning';
    return 'bg-success';
  };

  const getStatusText = () => {
    if (daysUntilChange < 0) return `${Math.abs(daysUntilChange)} jour(s) de retard`;
    if (daysUntilChange === 0) return "Aujourd'hui !";
    if (daysUntilChange === 1) return 'Demain';
    return `Dans ${daysUntilChange} jours`;
  };

  return (
    <Card className="relative overflow-hidden border-0 glass-card p-6">
      <div className="absolute inset-0 gradient-primary opacity-5" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Gouttière actuelle</p>
            <p className="text-4xl font-bold text-gradient mt-1">
              #{currentAligner}
              <span className="text-lg text-muted-foreground font-normal"> / {totalAligners}</span>
            </p>
          </div>
          <Badge className={`${getStatusColor()} text-white border-0`}>
            <Clock className="w-3 h-3 mr-1" />
            {getStatusText()}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Prochain changement : </span>
          <span className="font-medium text-foreground">
            {format(nextChangeDate, 'EEEE d MMMM', { locale: fr })}
          </span>
        </div>
        
        {/* Mini progress bar */}
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full gradient-primary transition-all duration-500"
            style={{ width: `${(currentAligner / totalAligners) * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
