import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  usePatients, 
  usePractitioners, 
  useAssignments, 
  useRemoveAssignment,
  useDeletePatient,
  useDeletePractitioner,
  PatientWithProfile,
  PractitionerWithProfile
} from '@/hooks/useAdminData';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreatePatientDialog } from '@/components/admin/CreatePatientDialog';
import { CreatePractitionerDialog } from '@/components/admin/CreatePractitionerDialog';
import { AssignPatientDialog } from '@/components/admin/AssignPatientDialog';
import { EditPatientDialog } from '@/components/admin/EditPatientDialog';
import { EditPractitionerDialog } from '@/components/admin/EditPractitionerDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { VideoManagement } from '@/components/admin/VideoManagement';
import { ArrowLeft, Users, Stethoscope, Link2, Loader2, Trash2, Mail, Phone, Calendar, Pencil, Video, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin, loading } = useAuth();

  const { data: patients, isLoading: loadingPatients } = usePatients();
  const { data: practitioners, isLoading: loadingPractitioners } = usePractitioners();
  const { data: assignments, isLoading: loadingAssignments } = useAssignments();
  const removeAssignment = useRemoveAssignment();
  const deletePatient = useDeletePatient();
  const deletePractitioner = useDeletePractitioner();

  // Edit dialogs state
  const [editingPatient, setEditingPatient] = useState<PatientWithProfile | null>(null);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editingPractitioner, setEditingPractitioner] = useState<PractitionerWithProfile | null>(null);
  const [editPractitionerOpen, setEditPractitionerOpen] = useState(false);

  // Delete dialogs state
  const [deletePatientOpen, setDeletePatientOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<PatientWithProfile | null>(null);
  const [deletePractitionerOpen, setDeletePractitionerOpen] = useState(false);
  const [practitionerToDelete, setPractitionerToDelete] = useState<PractitionerWithProfile | null>(null);

  // Search state
  const [patientSearch, setPatientSearch] = useState('');
  const [practitionerSearch, setPractitionerSearch] = useState('');
  const [assignPractitionerSearch, setAssignPractitionerSearch] = useState('');
  const [assignPatientSearch, setAssignPatientSearch] = useState('');

  const filteredPatients = patients?.filter((p) =>
    p.profile.full_name?.toLowerCase().includes(patientSearch.toLowerCase().trim())
  );

  const filteredPractitioners = practitioners?.filter((p) =>
    p.profile.full_name?.toLowerCase().includes(practitionerSearch.toLowerCase().trim())
  );

  const filteredAssignments = assignments?.filter((a) => {
    const prac = a.practitioner?.profile?.full_name?.toLowerCase() || '';
    const pat = a.patient?.profile?.full_name?.toLowerCase() || '';
    const sp = assignPractitionerSearch.toLowerCase().trim();
    const spt = assignPatientSearch.toLowerCase().trim();
    return (!sp || prac.includes(sp)) && (!spt || pat.includes(spt));
  });

  const handleEditPatient = (patient: PatientWithProfile) => {
    setEditingPatient(patient);
    setEditPatientOpen(true);
  };

  const handleDeletePatient = (patient: PatientWithProfile) => {
    setPatientToDelete(patient);
    setDeletePatientOpen(true);
  };

  const confirmDeletePatient = async () => {
    if (patientToDelete && patientToDelete.profile.user_id) {
      await deletePatient.mutateAsync({
        profileId: patientToDelete.profile_id,
        userId: patientToDelete.profile.user_id,
      });
      setDeletePatientOpen(false);
      setPatientToDelete(null);
    }
  };

  const handleEditPractitioner = (practitioner: PractitionerWithProfile) => {
    setEditingPractitioner(practitioner);
    setEditPractitionerOpen(true);
  };

  const handleDeletePractitioner = (practitioner: PractitionerWithProfile) => {
    setPractitionerToDelete(practitioner);
    setDeletePractitionerOpen(true);
  };

  const confirmDeletePractitioner = async () => {
    if (practitionerToDelete && practitionerToDelete.profile.user_id) {
      await deletePractitioner.mutateAsync({
        profileId: practitionerToDelete.profile_id,
        userId: practitionerToDelete.profile.user_id,
      });
      setDeletePractitionerOpen(false);
      setPractitionerToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Accès refusé</h2>
          <p className="text-muted-foreground mb-4">Vous n'avez pas les droits d'administrateur.</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userName="Administrateur" 
        userRole="admin" 
        onLogout={signOut}
      />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Administration</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patients</p>
                  <p className="text-2xl font-bold">{patients?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/10">
                  <Stethoscope className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Praticiens</p>
                  <p className="text-2xl font-bold">{practitioners?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/10">
                  <Link2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assignations</p>
                  <p className="text-2xl font-bold">{assignments?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="patients" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="practitioners">Praticiens</TabsTrigger>
            <TabsTrigger value="assignments">Assignations</TabsTrigger>
            <TabsTrigger value="videos" className="gap-1">
              <Video className="h-4 w-4" />
              Vidéos
            </TabsTrigger>
          </TabsList>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Liste des patients</h2>
              <CreatePatientDialog />
            </div>

            <Card className="glass-card">
              <CardContent className="p-0">
                {loadingPatients ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Nom"
                              value={patientSearch}
                              onChange={(e) => setPatientSearch(e.target.value)}
                              className="h-8 pl-7 text-sm font-normal"
                            />
                          </div>
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Traitement</TableHead>
                        <TableHead>Progrès</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {patientSearch ? 'Aucun patient trouvé' : 'Aucun patient enregistré'}
                          </TableCell>
                        </TableRow>
                      ) : filteredPatients?.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">
                            {patient.profile.full_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {patient.profile.email}
                              </span>
                              {patient.profile.phone && (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {patient.profile.phone}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {patient.treatment_start && (
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(patient.treatment_start), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {patient.current_aligner}/{patient.total_aligners} aligneurs
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPatient(patient)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePatient(patient)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Practitioners Tab */}
          <TabsContent value="practitioners" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Liste des praticiens</h2>
              <CreatePractitionerDialog />
            </div>
            <Card className="glass-card">
              <CardContent className="p-0">
                {loadingPractitioners ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Nom"
                              value={practitionerSearch}
                              onChange={(e) => setPractitionerSearch(e.target.value)}
                              className="h-8 pl-7 text-sm font-normal"
                            />
                          </div>
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Spécialité</TableHead>
                        <TableHead>N° Licence</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPractitioners?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {practitionerSearch ? 'Aucun praticien trouvé' : 'Aucun praticien enregistré'}
                          </TableCell>
                        </TableRow>
                      ) : filteredPractitioners?.map((practitioner) => (
                        <TableRow key={practitioner.id}>
                          <TableCell className="font-medium">
                            {practitioner.profile.full_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {practitioner.profile.email}
                              </span>
                              {practitioner.profile.phone && (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {practitioner.profile.phone}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {practitioner.specialty || '-'}
                          </TableCell>
                          <TableCell>
                            {practitioner.license_number || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPractitioner(practitioner)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePractitioner(practitioner)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Assignations praticien-patient</h2>
              <AssignPatientDialog />
            </div>
            <Card className="glass-card">
              <CardContent className="p-0">
                {loadingAssignments ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Praticien"
                              value={assignPractitionerSearch}
                              onChange={(e) => setAssignPractitionerSearch(e.target.value)}
                              className="h-8 pl-7 text-sm font-normal"
                            />
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[180px]">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Patient"
                              value={assignPatientSearch}
                              onChange={(e) => setAssignPatientSearch(e.target.value)}
                              className="h-8 pl-7 text-sm font-normal"
                            />
                          </div>
                        </TableHead>
                        <TableHead>Date d'assignation</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {(assignPractitionerSearch || assignPatientSearch) ? 'Aucune assignation trouvée' : 'Aucune assignation'}
                          </TableCell>
                        </TableRow>
                      ) : filteredAssignments?.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.practitioner?.profile?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {assignment.patient?.profile?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(assignment.assigned_at), 'dd MMM yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAssignment.mutate(assignment.id)}
                              disabled={removeAssignment.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            <VideoManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialogs */}
      <EditPatientDialog
        patient={editingPatient}
        open={editPatientOpen}
        onOpenChange={setEditPatientOpen}
      />
      <EditPractitionerDialog
        practitioner={editingPractitioner}
        open={editPractitionerOpen}
        onOpenChange={setEditPractitionerOpen}
      />

      {/* Delete Confirm Dialogs */}
      <DeleteConfirmDialog
        open={deletePatientOpen}
        onOpenChange={setDeletePatientOpen}
        onConfirm={confirmDeletePatient}
        title="Supprimer le patient"
        description={`Êtes-vous sûr de vouloir supprimer ${patientToDelete?.profile.full_name} ? Cette action est irréversible.`}
        isLoading={deletePatient.isPending}
      />
      <DeleteConfirmDialog
        open={deletePractitionerOpen}
        onOpenChange={setDeletePractitionerOpen}
        onConfirm={confirmDeletePractitioner}
        title="Supprimer le praticien"
        description={`Êtes-vous sûr de vouloir supprimer ${practitionerToDelete?.profile.full_name} ? Cette action est irréversible.`}
        isLoading={deletePractitioner.isPending}
      />
    </div>
  );
};

export default AdminDashboard;
