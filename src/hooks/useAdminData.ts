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
  attachment_teeth: number[] | null;
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
          attachment_teeth,
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
      attachment_teeth?: number[];
    }) => {
      // Use edge function to create user without losing admin session
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone,
          role: 'patient',
          treatment_start: data.treatment_start,
          total_aligners: data.total_aligners,
          attachment_teeth: data.attachment_teeth,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

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
      // Use edge function to create user without losing admin session
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone,
          role: 'practitioner',
          specialty: data.specialty,
          license_number: data.license_number,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

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

      // Send notification emails (best-effort: don't fail the assignment)
      try {
        const { error: emailError } = await supabase.functions.invoke(
          'send-assignment-emails',
          {
            body: {
              patient_id: data.patient_id,
              practitioner_id: data.practitioner_id,
            },
          }
        );
        if (emailError) {
          console.warn('Email sending failed:', emailError.message);
          return { success: true, emailSent: false };
        }
        return { success: true, emailSent: true };
      } catch (emailErr) {
        console.warn('Email sending failed:', emailErr);
        return { success: true, emailSent: false };
      }
    },
    onSuccess: (_result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      const emailSent = _result?.emailSent !== false;
      toast({
        title: 'Assignation créée',
        description: emailSent
          ? 'Le patient a été assigné et les emails ont été envoyés'
          : 'Le patient a été assigné (envoi des emails échoué)',
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
      attachment_teeth?: number[];
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
          attachment_teeth: data.attachment_teeth || [],
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
    mutationFn: async ({ profileId, userId }: { profileId: string; userId: string }) => {
      // Use edge function to delete user completely (including auth)
      const { data: result, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

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
    mutationFn: async ({ profileId, userId }: { profileId: string; userId: string }) => {
      // Use edge function to delete user completely (including auth)
      const { data: result, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

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
