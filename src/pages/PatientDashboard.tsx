import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ProgressRing } from '@/components/patient/ProgressRing';
import { AlignerCard } from '@/components/patient/AlignerCard';
import { PhotoCapture } from '@/components/patient/PhotoCapture';
import { AnalysisResult } from '@/components/patient/AnalysisResult';
import { Timeline } from '@/components/patient/Timeline';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { currentPatient, generateAlignerSchedule } from '@/data/mockData';
import { PhotoAnalysis } from '@/types/patient';
import { ArrowLeft, Bell, History, Camera as CameraIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<PhotoAnalysis | null>(
    currentPatient.photos[0]?.analysisResult || null
  );

  const schedule = generateAlignerSchedule(currentPatient);
  const progress = (currentPatient.currentAligner / currentPatient.totalAligners) * 100;

  const handlePhotoTaken = async (photoUrl: string) => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis (in production, this would call Azure Cognitive Services)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const mockAnalysis: PhotoAnalysis = {
      status: 'analyzed',
      attachmentStatus: Math.random() > 0.7 ? 'missing' : 'ok',
      insertionQuality: Math.random() > 0.8 ? 'poor' : 'good',
      gingivalHealth: Math.random() > 0.9 ? 'mild_inflammation' : 'healthy',
      overallScore: Math.floor(70 + Math.random() * 30),
      recommendations: [
        'Continuez à porter vos gouttières 22h/jour',
        'Brossez-vous les dents après chaque repas'
      ],
      analyzedAt: new Date()
    };
    
    setLatestAnalysis(mockAnalysis);
    setIsAnalyzing(false);
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

        {/* Timeline */}
        <Card className="p-6 glass-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-gradient">Ma progression</span>
          </h2>
          <Timeline schedule={schedule} />
        </Card>

        {/* Photo capture section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CameraIcon className="h-5 w-5 text-primary" />
              Suivi photo
            </h2>
            <PhotoCapture onPhotoTaken={handlePhotoTaken} isAnalyzing={isAnalyzing} />
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Dernière analyse</h2>
            {latestAnalysis ? (
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
