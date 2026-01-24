import { Calendar, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAlignerChanges } from '@/hooks/useAlignerChange';
import { cn } from '@/lib/utils';

interface PatientScheduleProps {
  patientId: string;
  treatmentStart: Date;
  currentAligner: number;
  totalAligners: number;
}

export function PatientSchedule({ 
  patientId, 
  treatmentStart, 
  currentAligner, 
  totalAligners 
}: PatientScheduleProps) {
  const { data: alignerChanges, isLoading } = useAlignerChanges(patientId);

  // Generate expected schedule
  const generateSchedule = () => {
    const schedule = [];
    for (let i = 1; i <= totalAligners; i++) {
      const startDate = addDays(treatmentStart, (i - 1) * 14);
      const endDate = addDays(startDate, 13);
      
      // Find if this aligner was confirmed
      const confirmedChange = alignerChanges?.find((c: any) => c.to_aligner === i);
      
      schedule.push({
        alignerNumber: i,
        startDate,
        endDate,
        status: i < currentAligner ? 'completed' : i === currentAligner ? 'current' : 'upcoming',
        confirmedAt: confirmedChange?.confirmed_at ? new Date(confirmedChange.confirmed_at) : null,
      });
    }
    return schedule;
  };

  const schedule = generateSchedule();

  return (
    <div className="space-y-4">
      {/* Aligner Change History */}
      {alignerChanges && alignerChanges.length > 0 && (
        <Card className="p-4 glass-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Mes changements confirmés
          </h3>
          
          <div className="space-y-2">
            {alignerChanges.slice(0, 5).map((change: any) => (
              <div 
                key={change.id}
                className="flex items-center justify-between p-2 rounded-lg bg-success/10"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{change.from_aligner}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge className="bg-success text-success-foreground text-xs">
                    #{change.to_aligner}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(change.confirmed_at), "d MMM yyyy", { locale: fr })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Full Schedule */}
      <Card className="p-4 glass-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Planning prévisionnel complet
        </h3>
        
        <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
          {schedule.map((item) => (
            <div 
              key={item.alignerNumber}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg text-sm transition-all",
                item.status === 'current' 
                  ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                  : item.status === 'completed'
                    ? 'bg-success/5'
                    : 'bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                {item.status === 'completed' && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                {item.status === 'current' && (
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                )}
                {item.status === 'upcoming' && (
                  <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                )}
                <div>
                  <span className={cn(
                    "font-medium",
                    item.status === 'current' && 'text-primary'
                  )}>
                    Gouttière #{item.alignerNumber}
                  </span>
                  {item.status === 'current' && (
                    <Badge className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5">
                      En cours
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">
                  {format(item.startDate, 'd MMM', { locale: fr })} - {format(item.endDate, 'd MMM', { locale: fr })}
                </span>
                {item.confirmedAt && (
                  <p className="text-[10px] text-success">
                    ✓ Confirmé le {format(item.confirmedAt, 'd MMM', { locale: fr })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
