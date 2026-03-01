import React, { useState, Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { ProgressRing } from '@/components/patient/ProgressRing';
import { AlignerCard } from '@/components/patient/AlignerCard';
import { MultiAngleCapture } from '@/components/patient/MultiAngleCapture';
import { PhotoSyncStatus } from '@/components/patient/PhotoSyncStatus';
import { AnalysisResult } from '@/components/patient/AnalysisResult';
import { AnalysisHistory } from '@/components/patient/AnalysisHistory';
import { StatsOverview } from '@/components/patient/StatsOverview';
import { Timeline } from '@/components/patient/Timeline';
import { RemindersPanel } from '@/components/patient/RemindersPanel';
import { PatientSchedule } from '@/components/patient/PatientSchedule';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoAnalysis, PhotoAngle } from '@/types/patient';
import { ArrowLeft, Bell, History, Camera as CameraIcon, BarChart3, Loader2, PlayCircle, Timer } from 'lucide-react';
import { WearTimeTracker } from '@/components/patient/WearTimeTracker';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { format, addDays } from 'date-fns';

// Lazy load heavy components — only loaded when their tab is active
const AnalysisProgressChart = React.lazy(() => import('@/components/patient/AnalysisProgressChart').then(m => ({ default: m.AnalysisProgressChart })));
const VideoTutorials = React.lazy(() => import('@/components/patient/VideoTutorials').then(m => ({ default: m.VideoTutorials })));

import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useMyPhotos } from '@/hooks/usePatientPhotos';
import { useOfflinePhotoQueue } from '@/hooks/useOfflinePhotoQueue';
import { useConfirmAlignerChange } from '@/hooks/useAlignerChange';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientAlerts } from '@/hooks/usePatientAlerts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
// Hook pour récupérer les données du patient connecté
function useMyPatientData() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-patient-data', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) return null;
      
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('profile_id', profile.id)
        .single();
      
      if (!patient) return null;
      
      const currentAligner = patient.current_aligner || 1;
      const totalAligners = patient.total_aligners || 15;
      const treatmentStart = patient.treatment_start ? new Date(patient.treatment_start) : new Date();
      
      // Calcul dynamique de la date du prochain changement basé sur treatment_start et current_aligner
      // Chaque gouttière dure 14 jours, donc le prochain changement = début + (currentAligner * 14 jours)
      const nextChangeDate = addDays(treatmentStart, currentAligner * 14);
      
      return {
        id: patient.id,
        name: profile.full_name,
        currentAligner,
        totalAligners,
        treatmentStart,
        nextChangeDate,
        attachmentTeeth: (patient as any).attachment_teeth || [],
      };
    },
    enabled: !!user,
  });
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: photosData, isLoading: isLoadingPhotos } = useMyPhotos();
  const { data: patientData, isLoading: isLoadingPatient } = useMyPatientData();
  const { data: alertsData } = usePatientAlerts();
  const { enqueue, pendingCount, isOnline, isSyncing } = useOfflinePhotoQueue();
  const confirmChange = useConfirmAlignerChange();
  
  const [latestAnalysis, setLatestAnalysis] = useState<PhotoAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('capture');
  
  const photos = photosData?.photos || [];
  const patientId = patientData?.id ?? photosData?.patientId;
  
  // Générer le planning des gouttières
  const generateSchedule = () => {
    if (!patientData) return [];
    const schedule = [];
    const startDate = patientData.treatmentStart;
    for (let i = 1; i <= patientData.totalAligners; i++) {
      schedule.push({
        alignerNumber: i,
        startDate: addDays(startDate, (i - 1) * 14),
        endDate: addDays(startDate, i * 14 - 1),
        status: i < patientData.currentAligner ? 'completed' as const : 
                i === patientData.currentAligner ? 'current' as const : 'upcoming' as const,
      });
    }
    return schedule;
  };

  const schedule = generateSchedule();
  const progress = patientData ? (patientData.currentAligner / patientData.totalAligners) * 100 : 0;

  const handlePhotosComplete = async (capturedPhotos: { angle: PhotoAngle; url: string }[]) => {
    console.log('Photos captured:', capturedPhotos.length);

    if (!patientId || !patientData) {
      toast.error('Aucun dossier patient — impossible de sauvegarder');
      return;
    }

    // Enqueue photos locally (instant) — sync service handles upload + analysis
    try {
      await enqueue({
        patientId,
        alignerNumber: patientData.currentAligner,
        attachmentTeeth: (patientData.attachmentTeeth || []).map(String),
        photos: capturedPhotos,
      });
    } catch (e) {
      console.error('Enqueue error:', e);
      toast.error('Erreur lors de l\'enregistrement local des photos');
    }
  };

  // Loading state
  if (isLoadingPatient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun dossier patient trouvé.</p>
          <Button onClick={() => navigate('/')} className="mt-4">Retour</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100vh] bg-background">
      <Header 
        userType="patient" 
        userName={patientData.name}
        alertCount={alertsData?.unresolvedCount ?? 0}
        alerts={alertsData?.alerts}
        onLogout={() => signOut()}
      />
      
      <main className="container max-w-4xl py-6 px-4 space-y-6 animate-fade-in pb-24">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => signOut().then(() => navigate('/'))}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>

        {/* Hero section with progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 flex flex-col items-center justify-center glass-card">
            <ProgressRing progress={progress} size={160} />
            <p className="mt-4 text-center text-muted-foreground">
              Gouttière <span className="font-semibold text-foreground">{patientData.currentAligner}</span> sur {patientData.totalAligners}
            </p>
            <p className="text-sm text-muted-foreground">
              Début du traitement : {format(patientData.treatmentStart, 'd MMMM yyyy', { locale: fr })}
            </p>
          </Card>
          
          <div className="space-y-4">
            <AlignerCard
              currentAligner={patientData.currentAligner}
              totalAligners={patientData.totalAligners}
              nextChangeDate={patientData.nextChangeDate}
            />
            
            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setActiveTab('reminders')}
              >
                <Bell className="h-5 w-5" />
                <span className="text-xs">Rappels</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setActiveTab('history')}
              >
                <History className="h-5 w-5" />
                <span className="text-xs">Historique</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {photos.length > 0 && <StatsOverview photos={photos} patientId={patientId} />}

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden md:grid w-full grid-cols-6">
            <TabsTrigger value="capture" className="gap-2">
              <CameraIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Capture</span>
            </TabsTrigger>
            <TabsTrigger value="wear" className="gap-2">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Chrono</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Rappels</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Progression</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Bonnes pratiques</span>
            </TabsTrigger>
          </TabsList>

          {/* Wear Time Tab */}
          <TabsContent value="wear" className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Temps de port quotidien
            </h2>
            <WearTimeTracker patientId={patientId} />
          </TabsContent>

          {/* Capture Tab */}
          <TabsContent value="capture" className="space-y-6">
            <PhotoSyncStatus />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CameraIcon className="h-5 w-5 text-primary" />
                  Suivi photo
                </h2>
                <MultiAngleCapture onComplete={handlePhotosComplete} isAnalyzing={isSyncing} />
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-4">Dernière analyse</h2>
                {isSyncing ? (
                  <Card className="p-8 text-center glass-card">
                    <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-3" />
                    <p className="text-muted-foreground">Synchronisation et analyse IA en cours…</p>
                  </Card>
                ) : pendingCount > 0 ? (
                  <Card className="p-8 text-center glass-card">
                    <CameraIcon className="h-12 w-12 mx-auto text-amber-500 mb-3" />
                    <p className="text-muted-foreground">
                      {pendingCount} photo(s) en attente de synchronisation
                    </p>
                    {!isOnline && (
                      <p className="text-xs text-amber-600 mt-1">Hors ligne — sync automatique au retour du réseau</p>
                    )}
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

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Bonnes pratiques
            </h2>
            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <VideoTutorials />
            </Suspense>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Mes rappels
            </h2>
            {patientData?.nextChangeDate ? (
              <RemindersPanel 
                nextChangeDate={patientData.nextChangeDate}
                lastPhotoDate={photos.length > 0 ? new Date(photos[0].created_at) : undefined}
                treatmentStartDate={patientData.treatmentStart}
                currentAligner={patientData.currentAligner}
                totalAligners={patientData.totalAligners}
                onConfirmChange={() => confirmChange.mutate({ 
                  patientId: patientData.id, 
                  newAlignerNumber: patientData.currentAligner + 1 
                })}
                isConfirming={confirmChange.isPending}
              />
            ) : (
              <Card className="p-6 text-center glass-card">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Chargement des rappels...</p>
              </Card>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Ma progression
            </h2>

            {/* Timeline */}
            <Card className="p-6 glass-card">
              <h3 className="font-semibold mb-4">Aperçu rapide</h3>
              <Timeline schedule={schedule} />
            </Card>

            {/* Full Schedule with history */}
            <PatientSchedule
              patientId={patientData.id}
              treatmentStart={patientData.treatmentStart}
              currentAligner={patientData.currentAligner}
              totalAligners={patientData.totalAligners}
            />
            
            {/* Score global à la fin */}
            {isLoadingPhotos ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              </Card>
            ) : (
              <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <AnalysisProgressChart photos={photos} />
              </Suspense>
            )}
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

        {/* Bottom spacer for mobile nav */}
        <div className="h-20 md:hidden" />
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { value: 'capture', icon: <CameraIcon className="h-5 w-5" />, label: 'Capture' },
          { value: 'wear', icon: <Timer className="h-5 w-5" />, label: 'Chrono' },
          { value: 'reminders', icon: <Bell className="h-5 w-5" />, label: 'Rappels' },
          { value: 'progress', icon: <BarChart3 className="h-5 w-5" />, label: 'Progrès' },
          { value: 'history', icon: <History className="h-5 w-5" />, label: 'Historique' },
          { value: 'videos', icon: <PlayCircle className="h-5 w-5" />, label: 'Vidéos' },
        ]}
      />
    </div>
  );
}
