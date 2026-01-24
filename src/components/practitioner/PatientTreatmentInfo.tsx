import { Calendar, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAlignerChanges } from '@/hooks/useAlignerChange';

interface PatientTreatmentInfoProps {
  patientId: string;
  treatmentStart: Date | null;
  currentAligner: number;
  totalAligners: number;
}

export function PatientTreatmentInfo({ 
  patientId, 
  treatmentStart, 
  currentAligner, 
  totalAligners 
}: PatientTreatmentInfoProps) {
  const { data: alignerChanges, isLoading } = useAlignerChanges(patientId);

  // Calculate next change date dynamically
  const nextChangeDate = treatmentStart 
    ? addDays(new Date(treatmentStart), currentAligner * 14)
    : null;

  const today = new Date();
  const daysUntilChange = nextChangeDate ? differenceInDays(nextChangeDate, today) : 0;

  // Generate expected schedule
  const generateSchedule = () => {
    if (!treatmentStart) return [];
    const schedule = [];
    for (let i = 1; i <= totalAligners; i++) {
      const startDate = addDays(new Date(treatmentStart), (i - 1) * 14);
      const endDate = addDays(startDate, 13);
      schedule.push({
        alignerNumber: i,
        startDate,
        endDate,
        status: i < currentAligner ? 'completed' : i === currentAligner ? 'current' : 'upcoming',
      });
    }
    return schedule;
  };

  const schedule = generateSchedule();

  return (
    <div className="space-y-4">
      {/* Treatment Overview Card */}
      <Card className="p-4 glass-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Informations du traitement
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Début du traitement</p>
            <p className="font-medium">
              {treatmentStart 
                ? format(new Date(treatmentStart), 'd MMMM yyyy', { locale: fr })
                : 'Non défini'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Gouttière actuelle</p>
            <p className="font-medium text-primary">#{currentAligner} / {totalAligners}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prochain changement</p>
            <p className="font-medium">
              {nextChangeDate 
                ? format(nextChangeDate, 'd MMMM yyyy', { locale: fr })
                : 'Non calculable'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Statut</p>
            {daysUntilChange < 0 ? (
              <Badge variant="destructive" className="text-xs">
                {Math.abs(daysUntilChange)} jour(s) de retard
              </Badge>
            ) : daysUntilChange <= 2 ? (
              <Badge className="bg-warning text-warning-foreground text-xs">
                Changement imminent
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                En cours
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Aligner Change History */}
      <Card className="p-4 glass-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Historique des changements confirmés
        </h3>
        
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : alignerChanges && alignerChanges.length > 0 ? (
          <div className="space-y-2">
            {alignerChanges.map((change: any) => (
              <div 
                key={change.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{change.from_aligner}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    #{change.to_aligner}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(change.confirmed_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun changement confirmé par le patient
          </p>
        )}
      </Card>

      {/* Expected Schedule */}
      <Card className="p-4 glass-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Planning prévisionnel
        </h3>
        
        <div className="max-h-48 overflow-y-auto space-y-1">
          {schedule.slice(0, 10).map((item) => (
            <div 
              key={item.alignerNumber}
              className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                item.status === 'current' 
                  ? 'bg-primary/10 border border-primary/20' 
                  : item.status === 'completed'
                    ? 'bg-success/10'
                    : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.status === 'completed' && (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                )}
                {item.status === 'current' && (
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
                {item.status === 'upcoming' && (
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                )}
                <span className={item.status === 'current' ? 'font-medium text-primary' : ''}>
                  Gouttière #{item.alignerNumber}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(item.startDate, 'd MMM', { locale: fr })} - {format(item.endDate, 'd MMM', { locale: fr })}
              </span>
            </div>
          ))}
          {schedule.length > 10 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              ... et {schedule.length - 10} autres gouttières
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
