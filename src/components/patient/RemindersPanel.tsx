import { Bell, Calendar, Camera, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Reminder {
  id: string;
  type: 'aligner_change' | 'photo_needed' | 'daily_wear';
  title: string;
  message: string;
  date: Date;
  urgent: boolean;
  actionable?: boolean;
}

interface RemindersPanelProps {
  nextChangeDate: Date;
  lastPhotoDate?: Date;
  currentAligner: number;
  totalAligners: number;
  onConfirmChange?: () => void;
  isConfirming?: boolean;
}

export function RemindersPanel({ 
  nextChangeDate, 
  lastPhotoDate, 
  currentAligner, 
  totalAligners,
  onConfirmChange,
  isConfirming 
}: RemindersPanelProps) {
  const today = new Date();
  const daysUntilChange = differenceInDays(nextChangeDate, today);
  const daysSincePhoto = lastPhotoDate ? differenceInDays(today, lastPhotoDate) : 999;
  const canConfirmChange = daysUntilChange <= 0 && currentAligner < totalAligners;

  const reminders: Reminder[] = [];

  // Rappel de changement de gouttière
  if (daysUntilChange <= 3 && currentAligner < totalAligners) {
    reminders.push({
      id: 'aligner-change',
      type: 'aligner_change',
      title: 'Changement de gouttière',
      message: daysUntilChange < 0 
        ? `Vous avez ${Math.abs(daysUntilChange)} jour(s) de retard pour passer à la gouttière #${currentAligner + 1}`
        : daysUntilChange === 0 
          ? `C'est aujourd'hui ! Passez à la gouttière #${currentAligner + 1}`
          : `Dans ${daysUntilChange} jour(s), passez à la gouttière #${currentAligner + 1}`,
      date: nextChangeDate,
      urgent: daysUntilChange <= 0,
      actionable: canConfirmChange,
    });
  }

  // Rappel de photo
  if (daysSincePhoto >= 3) {
    reminders.push({
      id: 'photo-needed',
      type: 'photo_needed',
      title: 'Photo de suivi',
      message: daysSincePhoto >= 7 
        ? `Aucune photo depuis ${daysSincePhoto} jours. Prenez une photo pour votre suivi.`
        : `Il serait bien de prendre une photo de suivi.`,
      date: today,
      urgent: daysSincePhoto >= 7,
    });
  }

  // Rappel de port quotidien
  reminders.push({
    id: 'daily-wear',
    type: 'daily_wear',
    title: 'Port quotidien',
    message: 'Portez vos gouttières 22h/jour pour des résultats optimaux.',
    date: today,
    urgent: false,
  });

  const getIcon = (type: Reminder['type']) => {
    switch (type) {
      case 'aligner_change':
        return <Calendar className="h-5 w-5" />;
      case 'photo_needed':
        return <Camera className="h-5 w-5" />;
      case 'daily_wear':
        return <Clock className="h-5 w-5" />;
    }
  };

  if (reminders.length === 0) {
    return (
      <Card className="p-6 text-center glass-card">
        <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
        <p className="text-muted-foreground">Aucun rappel pour le moment</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <Card 
          key={reminder.id}
          className={cn(
            "p-4 glass-card border-l-4 transition-all",
            reminder.urgent 
              ? "border-l-destructive bg-destructive/5" 
              : "border-l-primary"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              reminder.urgent 
                ? "bg-destructive/10 text-destructive" 
                : "bg-primary/10 text-primary"
            )}>
              {getIcon(reminder.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{reminder.title}</h4>
                {reminder.urgent && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Urgent
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{reminder.message}</p>
              {reminder.type === 'aligner_change' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(reminder.date, 'EEEE d MMMM', { locale: fr })}
                </p>
              )}
              
              {/* Bouton de confirmation du changement */}
              {reminder.actionable && onConfirmChange && (
                <Button 
                  onClick={onConfirmChange}
                  disabled={isConfirming}
                  className="mt-3 w-full gradient-primary"
                  size="sm"
                >
                  {isConfirming ? (
                    'Confirmation...'
                  ) : (
                    <>
                      Confirmer le passage à la gouttière #{currentAligner + 1}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
