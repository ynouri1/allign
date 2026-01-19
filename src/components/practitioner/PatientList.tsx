import { AlertCircle, Camera, Calendar, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Patient } from '@/types/patient';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PatientListProps {
  patients: Patient[];
  onPatientSelect: (patient: Patient) => void;
  selectedPatientId?: string;
}

export function PatientList({ patients, onPatientSelect, selectedPatientId }: PatientListProps) {
  const getAlertBadge = (patient: Patient) => {
    const highAlerts = patient.alerts.filter(a => a.severity === 'high' && !a.resolved).length;
    const mediumAlerts = patient.alerts.filter(a => a.severity === 'medium' && !a.resolved).length;
    
    if (highAlerts > 0) {
      return (
        <Badge className="bg-destructive text-destructive-foreground border-0">
          <AlertCircle className="h-3 w-3 mr-1" />
          {highAlerts} urgent{highAlerts > 1 ? 's' : ''}
        </Badge>
      );
    }
    if (mediumAlerts > 0) {
      return (
        <Badge className="bg-warning text-warning-foreground border-0">
          {mediumAlerts} alerte{mediumAlerts > 1 ? 's' : ''}
        </Badge>
      );
    }
    return (
      <Badge className="bg-success/20 text-success border-0">
        OK
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-3">
      {patients.map((patient) => {
        const daysSincePhoto = patient.lastPhotoDate 
          ? differenceInDays(new Date(), patient.lastPhotoDate)
          : null;
        
        return (
          <Card
            key={patient.id}
            className={cn(
              "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
              selectedPatientId === patient.id 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            )}
            onClick={() => onPatientSelect(patient)}
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">
                  {getInitials(patient.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{patient.name}</h3>
                  {getAlertBadge(patient)}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">
                      #{patient.currentAligner}
                    </span>
                    /{patient.totalAligners}
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(patient.nextChangeDate, 'd MMM', { locale: fr })}
                  </span>
                  
                  {daysSincePhoto !== null && (
                    <span className={cn(
                      "flex items-center gap-1",
                      daysSincePhoto > 5 && "text-warning"
                    )}>
                      <Camera className="h-3 w-3" />
                      {daysSincePhoto === 0 ? "Aujourd'hui" : `${daysSincePhoto}j`}
                    </span>
                  )}
                </div>
              </div>
              
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
