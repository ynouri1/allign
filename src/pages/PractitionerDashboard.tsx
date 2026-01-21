import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PatientList } from '@/components/practitioner/PatientList';
import { AlertsPanelNew } from '@/components/practitioner/AlertsPanelNew';
import { StatsCards } from '@/components/practitioner/StatsCards';
import { AnalysisResult } from '@/components/patient/AnalysisResult';
import { PatientPhotosView } from '@/components/practitioner/PatientPhotosView';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockPatients } from '@/data/mockData';
import { Patient } from '@/types/patient';
import { ArrowLeft, Users, AlertTriangle, BarChart3, X, Camera, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { usePractitionerAlerts, useResolveAlert } from '@/hooks/usePractitionerAlerts';
import { usePractitionerPatients, usePractitionerProfile } from '@/hooks/usePractitionerData';
import { useAuth } from '@/contexts/AuthContext';

export default function PractitionerDashboard() {
  const navigate = useNavigate();
  const { signOut, isPractitioner, loading: authLoading } = useAuth();
  const { data: profile } = usePractitionerProfile();
  const { data: dbPatients = [], isLoading: loadingPatients } = usePractitionerPatients();
  const { data: alerts = [], isLoading: loadingAlerts } = usePractitionerAlerts();
  const resolveAlert = useResolveAlert();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDbPatientId, setSelectedDbPatientId] = useState<string | null>(null);
  
  // Use real alerts from database
  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  
  // Stats from mock data for now (can be updated to use real data)
  const photosToday = mockPatients.filter(p => 
    p.lastPhotoDate && differenceInDays(new Date(), p.lastPhotoDate) === 0
  ).length;

  const handleViewPatient = (patientId: string) => {
    const patient = mockPatients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
    }
  };

  // Get the selected db patient for photos view
  const selectedDbPatient = dbPatients.find(p => p.id === selectedDbPatientId);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userType="practitioner" 
        userName={profile?.full_name || "Dr. Martin"}
        alertCount={unresolvedAlerts.length}
      />
      
      <main className="container py-6 px-4 space-y-6 animate-fade-in">
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

        {/* Stats overview */}
        <StatsCards
          totalPatients={dbPatients.length || mockPatients.length}
          activeAlerts={unresolvedAlerts.length}
          photosToday={photosToday}
          complianceRate={87}
        />

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="alerts" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="alerts" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alertes
                  {unresolvedAlerts.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                      {unresolvedAlerts.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="patients" className="gap-2">
                  <Users className="h-4 w-4" />
                  Patients
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Statistiques
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="alerts" className="mt-0">
                {loadingAlerts ? (
                  <Card className="p-8 text-center">
                    <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                    <p className="mt-2 text-muted-foreground">Chargement des alertes...</p>
                  </Card>
                ) : (
                  <AlertsPanelNew 
                    alerts={alerts}
                    onResolve={(id, notes) => resolveAlert.mutate({ alertId: id, notes })}
                    isResolving={resolveAlert.isPending}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="patients" className="mt-0">
                {loadingPatients ? (
                  <Card className="p-8 text-center">
                    <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                  </Card>
                ) : dbPatients.length > 0 ? (
                  <div className="space-y-3">
                    {dbPatients.map((patient) => (
                      <Card 
                        key={patient.id}
                        className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedDbPatientId === patient.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedDbPatientId(patient.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-medium text-primary">
                              {patient.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{patient.profile.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Gouttière {patient.current_aligner}/{patient.total_aligners}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDbPatientId(patient.id);
                            }}
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            Photos
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <PatientList 
                    patients={mockPatients}
                    onPatientSelect={setSelectedPatient}
                    selectedPatientId={selectedPatient?.id}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-0">
                <Card className="p-8 text-center glass-card">
                  <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Statistiques avancées</h3>
                  <p className="text-muted-foreground mb-4">
                    Visualisez les tendances de vos patients
                  </p>
                  <Button variant="gradient">
                    Voir les statistiques
                  </Button>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right panel - Patient detail or Photos */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">
              {selectedDbPatientId ? 'Photos du patient' : 'Détail patient'}
            </h2>
            
            {selectedDbPatient ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{selectedDbPatient.profile.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Gouttière {selectedDbPatient.current_aligner}/{selectedDbPatient.total_aligners}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedDbPatientId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
                <PatientPhotosView 
                  patientId={selectedDbPatient.id}
                  patientName={selectedDbPatient.profile.full_name}
                />
              </div>
            ) : selectedPatient ? (
              <Card className="p-5 glass-card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPatient.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedPatient(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Gouttière</p>
                    <p className="font-semibold text-lg">
                      #{selectedPatient.currentAligner}/{selectedPatient.totalAligners}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Prochain changement</p>
                    <p className="font-semibold">
                      {format(selectedPatient.nextChangeDate, 'd MMM', { locale: fr })}
                    </p>
                  </div>
                </div>
                
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full gradient-primary"
                    style={{ 
                      width: `${(selectedPatient.currentAligner / selectedPatient.totalAligners) * 100}%` 
                    }}
                  />
                </div>
                
                {selectedPatient.photos.length > 0 && selectedPatient.photos[0].analysisResult && (
                  <div>
                    <p className="text-sm font-medium mb-2">Dernière analyse</p>
                    <AnalysisResult analysis={selectedPatient.photos[0].analysisResult} />
                  </div>
                )}
                
                {selectedPatient.alerts.filter(a => !a.resolved).length > 0 && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm font-medium text-warning mb-2">
                      Alertes actives ({selectedPatient.alerts.filter(a => !a.resolved).length})
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {selectedPatient.alerts.filter(a => !a.resolved).map(alert => (
                        <li key={alert.id}>• {alert.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <Button className="w-full" variant="gradient">
                  Contacter le patient
                </Button>
              </Card>
            ) : (
              <Card className="p-8 text-center glass-card">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Sélectionnez un patient ou cliquez sur "Voir" dans une alerte
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
