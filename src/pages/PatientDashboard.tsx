import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ProgressRing } from '@/components/patient/ProgressRing';
import { AlignerCard } from '@/components/patient/AlignerCard';
import { MultiAngleCapture } from '@/components/patient/MultiAngleCapture';
import { AnalysisResult } from '@/components/patient/AnalysisResult';
import { AnalysisProgressChart } from '@/components/patient/AnalysisProgressChart';
import { AnalysisHistory } from '@/components/patient/AnalysisHistory';
import { StatsOverview } from '@/components/patient/StatsOverview';
import { Timeline } from '@/components/patient/Timeline';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { currentPatient, generateAlignerSchedule } from '@/data/mockData';
import { PhotoAnalysis, PhotoAngle } from '@/types/patient';
import { ArrowLeft, Bell, History, Camera as CameraIcon, BarChart3, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAlignerAnalysis } from '@/hooks/useAlignerAnalysis';
import { useMyPhotos, useSavePhoto, PatientPhotoRecord } from '@/hooks/usePatientPhotos';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { analyzePhoto, isAnalyzing } = useAlignerAnalysis();
  const { data: photosData, isLoading: isLoadingPhotos } = useMyPhotos();
  const savePhoto = useSavePhoto();
  
  const [latestAnalysis, setLatestAnalysis] = useState<PhotoAnalysis | null>(
    currentPatient.photos[0]?.analysisResult || null
  );

  const schedule = generateAlignerSchedule(currentPatient);
  const progress = (currentPatient.currentAligner / currentPatient.totalAligners) * 100;

  const photos = photosData?.photos || [];
  const patientId = photosData?.patientId;

  const handlePhotosComplete = async (capturedPhotos: { angle: PhotoAngle; url: string }[]) => {
    console.log('Photos captured:', capturedPhotos.length);
    
    // Analyze the front photo with AI (Gemini)
    const frontPhoto = capturedPhotos.find(p => p.angle === 'front') || capturedPhotos[0];
    if (!frontPhoto) {
      toast.error('Aucune photo à analyser');
      return;
    }

    toast.info('Analyse IA en cours...');
    const analysis = await analyzePhoto(frontPhoto.url);
    
    if (analysis) {
      setLatestAnalysis(analysis);
      toast.success('Analyse terminée !');

      // Save to database if we have a patient ID
      if (patientId) {
        for (const photo of capturedPhotos) {
          await savePhoto.mutateAsync({
            patientId,
            photoDataUrl: photo.url,
            angle: photo.angle,
            alignerNumber: currentPatient.currentAligner,
            analysisResult: photo.angle === frontPhoto.angle ? {
              status: analysis.status,
              attachmentStatus: analysis.attachmentStatus,
              insertionQuality: analysis.insertionQuality,
              gingivalHealth: analysis.gingivalHealth,
              overallScore: analysis.overallScore,
              recommendations: analysis.recommendations,
              analyzedAt: analysis.analyzedAt,
            } : undefined,
          });
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userType="patient" 
        userName={currentPatient.name}
        alertCount={currentPatient.alerts.filter(a => !a.resolved).length}
      />
      
      <main className="container max-w-4xl py-6 px-4 space-y-6 animate-fade-in">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'accueil
        </Button>

        {/* Hero section with progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 flex flex-col items-center justify-center glass-card">
            <ProgressRing progress={progress} size={160} />
            <p className="mt-4 text-center text-muted-foreground">
              Gouttière <span className="font-semibold text-foreground">{currentPatient.currentAligner}</span> sur {currentPatient.totalAligners}
            </p>
            <p className="text-sm text-muted-foreground">
              Début du traitement : {format(currentPatient.treatmentStart, 'd MMMM yyyy', { locale: fr })}
            </p>
          </Card>
          
          <div className="space-y-4">
            <AlignerCard
              currentAligner={currentPatient.currentAligner}
              totalAligners={currentPatient.totalAligners}
              nextChangeDate={currentPatient.nextChangeDate}
            />
            
            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                <Bell className="h-5 w-5" />
                <span className="text-xs">Rappels</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                <History className="h-5 w-5" />
                <span className="text-xs">Historique</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {photos.length > 0 && <StatsOverview photos={photos} />}

        {/* Tabs for different views */}
        <Tabs defaultValue="capture" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture" className="gap-2">
              <CameraIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Capture</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Progression</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          </TabsList>

          {/* Capture Tab */}
          <TabsContent value="capture" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CameraIcon className="h-5 w-5 text-primary" />
                  Suivi photo
                </h2>
                <MultiAngleCapture onComplete={handlePhotosComplete} isAnalyzing={isAnalyzing || savePhoto.isPending} />
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-4">Dernière analyse</h2>
                {isAnalyzing ? (
                  <Card className="p-8 text-center glass-card">
                    <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-3" />
                    <p className="text-muted-foreground">Analyse IA en cours...</p>
                  </Card>
                ) : latestAnalysis ? (
                  <AnalysisResult analysis={latestAnalysis} />
                ) : (
                  <Card className="p-8 text-center glass-card">
                    <CameraIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Prenez une photo pour recevoir une analyse IA
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Ma progression
            </h2>
            
            {isLoadingPhotos ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              </Card>
            ) : (
              <AnalysisProgressChart photos={photos} />
            )}

            {/* Timeline */}
            <Card className="p-6 glass-card">
              <h3 className="font-semibold mb-4">Planning des gouttières</h3>
              <Timeline schedule={schedule} />
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historique des analyses
            </h2>
            
            {isLoadingPhotos ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              </Card>
            ) : (
              <AnalysisHistory photos={photos} />
            )}
          </TabsContent>
        </Tabs>

        {/* Alerts */}
        {currentPatient.alerts.filter(a => !a.resolved).length > 0 && (
          <Card className="p-6 border-warning/30 bg-warning/5">
            <h2 className="text-lg font-semibold mb-4 text-warning">
              ⚠️ Alertes actives
            </h2>
            <div className="space-y-3">
              {currentPatient.alerts.filter(a => !a.resolved).map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <div className="text-warning mt-0.5">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(alert.createdAt, 'd MMM à HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
