import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PatientPhotoRecord, usePatientPhotos } from '@/hooks/usePatientPhotos';
import { AnalysisProgressChart } from '@/components/patient/AnalysisProgressChart';
import { AnalysisHistory } from '@/components/patient/AnalysisHistory';
import { StatsOverview } from '@/components/patient/StatsOverview';
import { BarChart3, History, Loader2, Camera } from 'lucide-react';

interface PatientPhotosViewProps {
  patientId: string;
  patientName: string;
}

export function PatientPhotosView({ patientId, patientName }: PatientPhotosViewProps) {
  const { data: photos, isLoading } = usePatientPhotos(patientId);

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
        <p className="mt-2 text-muted-foreground">Chargement des photos...</p>
      </Card>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          {patientName} n'a pas encore pris de photos.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <StatsOverview photos={photos} />

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="progress" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Progression
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <AnalysisProgressChart photos={photos} />
        </TabsContent>

        <TabsContent value="history">
          <AnalysisHistory photos={photos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
