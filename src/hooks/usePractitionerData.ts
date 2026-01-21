import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PatientWithProfile {
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
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export function usePractitionerPatients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['practitioner-patients', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get the practitioner record
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return [];

      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!practitioner) return [];

      // Get assigned patients
      const { data: assignments, error } = await supabase
        .from('practitioner_patients')
        .select(`
          patient_id,
          patient:patients!practitioner_patients_patient_id_fkey (
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
              full_name,
              email,
              phone
            )
          )
        `)
        .eq('practitioner_id', practitioner.id);

      if (error) throw error;

      return assignments?.map(a => a.patient).filter(Boolean) as PatientWithProfile[];
    },
    enabled: !!user,
  });
}

export function usePractitionerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['practitioner-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return null;

      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      return practitioner ? { ...profile, ...practitioner } : null;
    },
    enabled: !!user,
  });
}
