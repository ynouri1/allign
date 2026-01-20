import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePractitionerPatients, usePractitionerProfile } from '@/hooks/usePractitionerData';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Users, Calendar, Mail, Phone, Loader2, User } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const NewPractitionerDashboard = () => {
  const navigate = useNavigate();
  const { signOut, isPractitioner, loading } = useAuth();
  const { data: patients, isLoading: loadingPatients } = usePractitionerPatients();
  const { data: profile } = usePractitionerProfile();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const selectedPatient = patients?.find(p => p.id === selectedPatientId);

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

  const getDaysUntilChange = (nextChangeDate: string | null) => {
    if (!nextChangeDate) return null;
    const days = differenceInDays(new Date(nextChangeDate), new Date());
    return days;
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Liste des patients</h2>
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
                {patients?.map((patient) => {
                  const daysUntilChange = getDaysUntilChange(patient.next_change_date);
                  
                  return (
                    <Card 
                      key={patient.id}
                      className={`glass-card cursor-pointer transition-all hover:shadow-md ${
                        selectedPatientId === patient.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(patient.profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{patient.profile.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Aligneur {patient.current_aligner}/{patient.total_aligners}
                            </p>
                          </div>
                          {daysUntilChange !== null && daysUntilChange <= 2 && (
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

                  {/* Treatment Info */}
                  <div>
                    <h3 className="font-semibold mb-3">Informations du traitement</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-primary/5 text-center">
                        <p className="text-2xl font-bold text-primary">{selectedPatient.current_aligner}</p>
                        <p className="text-sm text-muted-foreground">Aligneur actuel</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50 text-center">
                        <p className="text-2xl font-bold">{selectedPatient.total_aligners}</p>
                        <p className="text-sm text-muted-foreground">Total aligneurs</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50 text-center">
                        <p className="text-2xl font-bold">
                          {selectedPatient.total_aligners > 0 
                            ? Math.round((selectedPatient.current_aligner / selectedPatient.total_aligners) * 100)
                            : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Progression</p>
                      </div>
                      {selectedPatient.next_change_date && (
                        <div className="p-3 rounded-lg bg-secondary/50 text-center">
                          <p className="text-lg font-bold">
                            {format(new Date(selectedPatient.next_change_date), 'dd MMM', { locale: fr })}
                          </p>
                          <p className="text-sm text-muted-foreground">Prochain changement</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Treatment Start */}
                  {selectedPatient.treatment_start && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Début du traitement</p>
                        <p className="font-medium">
                          {format(new Date(selectedPatient.treatment_start), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedPatient.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-muted-foreground p-3 rounded-lg bg-secondary/50">
                        {selectedPatient.notes}
                      </p>
                    </div>
                  )}
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
