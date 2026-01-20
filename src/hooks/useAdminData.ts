import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  role?: 'admin' | 'practitioner' | 'patient';
}

export interface PatientWithProfile {
  id: string;
  profile_id: string;
  treatment_start: string | null;
  total_aligners: number;
  current_aligner: number;
  next_change_date: string | null;
  notes: string | null;
  profile: {
    id: string;
    user_id?: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export interface PractitionerWithProfile {
  id: string;
  profile_id: string;
  specialty: string | null;
  license_number: string | null;
  profile: {
    id: string;
    user_id?: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
}

interface PractitionerPatientAssignment {
  id: string;
  practitioner_id: string;
  patient_id: string;
  assigned_at: string;
  practitioner: {
    profile: {
      full_name: string;
    };
  };
  patient: {
    profile: {
      full_name: string;
    };
  };
}

export function usePatients() {
  return useQuery({
    queryKey: ['admin-patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          profile_id,
          treatment_start,
          total_aligners,
          current_aligner,
          next_change_date,
          notes,
          profile:profiles!patients_profile_id_fkey (
            id,
            user_id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PatientWithProfile[];
    },
  });
}

export function usePractitioners() {
  return useQuery({
    queryKey: ['admin-practitioners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practitioners')
        .select(`
          id,
          profile_id,
          specialty,
          license_number,
          profile:profiles!practitioners_profile_id_fkey (
            id,
            user_id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PractitionerWithProfile[];
    },
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: ['admin-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practitioner_patients')
        .select(`
          id,
          practitioner_id,
          patient_id,
          assigned_at,
          practitioner:practitioners!practitioner_patients_practitioner_id_fkey (
            profile:profiles!practitioners_profile_id_fkey (
              full_name
            )
          ),
          patient:patients!practitioner_patients_patient_id_fkey (
            profile:profiles!patients_profile_id_fkey (
              full_name
            )
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PractitionerPatientAssignment[];
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      treatment_start?: string;
      total_aligners?: number;
    }) => {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // 2. Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 3. Create patient role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'patient',
        });

      if (roleError) throw roleError;

      // 4. Create patient record
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          profile_id: profile.id,
          treatment_start: data.treatment_start || null,
          total_aligners: data.total_aligners || 0,
        });

      if (patientError) throw patientError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
      toast({
        title: 'Patient créé',
        description: 'Le patient a été ajouté avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCreatePractitioner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      specialty?: string;
      license_number?: string;
    }) => {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // 2. Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 3. Create practitioner role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'practitioner',
        });

      if (roleError) throw roleError;

      // 4. Create practitioner record
      const { error: practitionerError } = await supabase
        .from('practitioners')
        .insert({
          profile_id: profile.id,
          specialty: data.specialty || null,
          license_number: data.license_number || null,
        });

      if (practitionerError) throw practitionerError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      toast({
        title: 'Praticien créé',
        description: 'Le praticien a été ajouté avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAssignPatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      practitioner_id: string;
      patient_id: string;
    }) => {
      const { error } = await supabase
        .from('practitioner_patients')
        .insert({
          practitioner_id: data.practitioner_id,
          patient_id: data.patient_id,
        });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      toast({
        title: 'Assignation créée',
        description: 'Le patient a été assigné au praticien',
      });
    },
    onError: (error: Error) => {
      let message = error.message;
      if (error.message.includes('unique')) {
        message = 'Cette assignation existe déjà';
      }
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('practitioner_patients')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      toast({
        title: 'Assignation supprimée',
        description: 'L\'assignation a été retirée',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      patientId: string;
      profileId: string;
      full_name: string;
      phone?: string;
      treatment_start?: string;
      total_aligners?: number;
      current_aligner?: number;
      next_change_date?: string;
      notes?: string;
    }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
        })
        .eq('id', data.profileId);

      if (profileError) throw profileError;

      // Update patient
      const { error: patientError } = await supabase
        .from('patients')
        .update({
          treatment_start: data.treatment_start || null,
          total_aligners: data.total_aligners || 0,
          current_aligner: data.current_aligner || 1,
          next_change_date: data.next_change_date || null,
          notes: data.notes || null,
        })
        .eq('id', data.patientId);

      if (patientError) throw patientError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
      toast({
        title: 'Patient modifié',
        description: 'Les informations ont été mises à jour',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Deleting profile will cascade to patient due to FK constraint
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      toast({
        title: 'Patient supprimé',
        description: 'Le patient a été supprimé avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePractitioner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      practitionerId: string;
      profileId: string;
      full_name: string;
      phone?: string;
      specialty?: string;
      license_number?: string;
    }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
        })
        .eq('id', data.profileId);

      if (profileError) throw profileError;

      // Update practitioner
      const { error: practitionerError } = await supabase
        .from('practitioners')
        .update({
          specialty: data.specialty || null,
          license_number: data.license_number || null,
        })
        .eq('id', data.practitionerId);

      if (practitionerError) throw practitionerError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      toast({
        title: 'Praticien modifié',
        description: 'Les informations ont été mises à jour',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePractitioner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Deleting profile will cascade to practitioner due to FK constraint
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      toast({
        title: 'Praticien supprimé',
        description: 'Le praticien a été supprimé avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
