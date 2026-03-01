import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePractitionerPatients, usePractitionerProfile } from '@/hooks/usePractitionerData';
import { usePractitionerAlerts, useResolveAlert } from '@/hooks/usePractitionerAlerts';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Calendar, Mail, Phone, Loader2, User, BarChart3, Bell, Search, CheckCircle } from 'lucide-react';
import { differenceInDays, addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PatientPhotosView } from '@/components/practitioner/PatientPhotosView';
import { AlertsPanelNew } from '@/components/practitioner/AlertsPanelNew';
import { PatientTreatmentInfo } from '@/components/practitioner/PatientTreatmentInfo';

// Lazy load Three.js viewer (~1MB) — only loaded when practitioner opens patient details
const TeethViewer3D = React.lazy(() => import('@/components/practitioner/TeethViewer3D').then(m => ({ default: m.TeethViewer3D })));

const NewPractitionerDashboard = () => {
  const navigate = useNavigate();
  const { signOut, isPractitioner, loading } = useAuth();
  const { data: patients, isLoading: loadingPatients } = usePractitionerPatients();
  const { data: profile } = usePractitionerProfile();
  const { data: alerts = [], isLoading: loadingAlerts } = usePractitionerAlerts();
  const resolveAlert = useResolveAlert();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const selectedPatient = patients?.find(p => p.id === selectedPatientId);

  const isFinished = (p: { current_aligner: number; total_aligners: number }) =>
    p.current_aligner >= p.total_aligners;

  const filteredPatients = patients?.filter(p =>
    p.profile.full_name.toLowerCase().includes(patientSearch.toLowerCase())
  );
  
  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const unresolvedAlertCount = unresolvedAlerts.length;

  // Group unresolved alerts by patient for badge display
  const alertsByPatient = unresolvedAlerts.reduce((acc, alert) => {
    const patientId = alert.patient_id;
    if (!acc[patientId]) {
      acc[patientId] = { total: 0, high: 0 };
    }
    acc[patientId].total++;
    if (alert.severity === 'high') {
      acc[patientId].high++;
    }
    return acc;
  }, {} as Record<string, { total: number; high: number }>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPractitioner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Accès refusé</h2>
          <p className="text-muted-foreground mb-4">Vous n'avez pas les droits de praticien.</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDaysUntilChange = (patient: any) => {
    // Calculate dynamically based on treatment_start and current_aligner
    if (!patient.treatment_start) return null;
    const nextChangeDate = addDays(new Date(patient.treatment_start), patient.current_aligner * 14);
    return differenceInDays(nextChangeDate, new Date());
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userName={profile?.full_name || 'Praticien'} 
        userRole="practitioner" 
        onLogout={signOut}
      />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Mes patients</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patients assignés</p>
                  <p className="text-2xl font-bold">{patients?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={unresolvedAlertCount > 0 ? "glass-card border-warning/50" : "glass-card"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${unresolvedAlertCount > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
                  <Bell className={`h-6 w-6 ${unresolvedAlertCount > 0 ? 'text-warning' : 'text-success'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alertes actives</p>
                  <p className="text-2xl font-bold">{unresolvedAlertCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {unresolvedAlertCount > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              Alertes à traiter
            </h2>
            <AlertsPanelNew 
              alerts={alerts} 
              onResolve={(id, notes) => resolveAlert.mutate({ alertId: id, notes })}
              isResolving={resolveAlert.isPending}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Liste des patients</h2>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un patient…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {loadingPatients ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : patients?.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Aucun patient assigné
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredPatients?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun patient trouvé</p>
                )}
                {filteredPatients?.map((patient) => {
                  const daysUntilChange = getDaysUntilChange(patient);
                  const finished = isFinished(patient);
                  
                  return (
                    <Card 
                      key={patient.id}
                      className={`glass-card cursor-pointer transition-all hover:shadow-md ${
                        selectedPatientId === patient.id ? 'ring-2 ring-primary' : ''
                      } ${alertsByPatient[patient.id]?.high > 0 ? 'border-l-4 border-l-destructive' : ''} ${finished ? 'opacity-50' : ''}`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className={finished ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}>
                              {getInitials(patient.profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium truncate ${finished ? 'text-muted-foreground' : ''}`}>{patient.profile.full_name}</p>
                              {finished && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Terminé
                                </Badge>
                              )}
                              {!finished && alertsByPatient[patient.id]?.high > 0 && (
                                <Badge className="bg-destructive text-destructive-foreground text-xs">
                                  {alertsByPatient[patient.id].high} urgent
                                </Badge>
                              )}
                              {!finished && alertsByPatient[patient.id]?.total > 0 && alertsByPatient[patient.id]?.high === 0 && (
                                <Badge className="bg-warning text-warning-foreground text-xs">
                                  {alertsByPatient[patient.id].total} alerte{alertsByPatient[patient.id].total > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Aligneur {patient.current_aligner}/{patient.total_aligners}
                            </p>
                          </div>
                          {!finished && daysUntilChange !== null && daysUntilChange <= 2 && (
                            <Badge variant={daysUntilChange <= 0 ? 'destructive' : 'secondary'}>
                              {daysUntilChange <= 0 ? 'Changement dû' : `${daysUntilChange}j`}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {getInitials(selectedPatient.profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{selectedPatient.profile.full_name}</CardTitle>
                      <p className="text-muted-foreground">Patient</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="info" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="info" className="gap-2">
                        <User className="h-4 w-4" />
                        Informations
                      </TabsTrigger>
                      <TabsTrigger value="photos" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Photos & Analyses
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-6">
                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{selectedPatient.profile.email}</p>
                          </div>
                        </div>
                        {selectedPatient.profile.phone && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Téléphone</p>
                              <p className="font-medium">{selectedPatient.profile.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Treatment Info with Aligner Change History */}
                      <PatientTreatmentInfo 
                        patientId={selectedPatient.id}
                        treatmentStart={selectedPatient.treatment_start ? new Date(selectedPatient.treatment_start) : null}
                        currentAligner={selectedPatient.current_aligner}
                        totalAligners={selectedPatient.total_aligners}
                      />

                      {/* Notes */}
                      {selectedPatient.notes && (
                        <div>
                          <h3 className="font-semibold mb-2">Notes</h3>
                          <p className="text-muted-foreground p-3 rounded-lg bg-secondary/50">
                            {selectedPatient.notes}
                          </p>
                        </div>
                      )}

                      {/* Teeth with Attachments */}
                      <div>
                        <h3 className="font-semibold mb-3">Taquets (attachements)</h3>
                        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                          <TeethViewer3D attachmentTeeth={selectedPatient.attachment_teeth || []} />
                        </Suspense>
                      </div>
                    </TabsContent>

                    <TabsContent value="photos">
                      <PatientPhotosView 
                        patientId={selectedPatient.id} 
                        patientName={selectedPatient.profile.full_name}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Sélectionnez un patient pour voir ses détails
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewPractitionerDashboard;
