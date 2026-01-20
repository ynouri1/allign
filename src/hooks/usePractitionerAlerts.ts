import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PractitionerAlert {
  id: string;
  patient_id: string;
  photo_id: string | null;
  practitioner_id: string;
  type: 'attachment_lost' | 'poor_insertion' | 'gingival_issue' | 'missed_change' | 'photo_needed';
  severity: 'low' | 'medium' | 'high';
  message: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    profile: {
      full_name: string;
      email: string;
    };
    current_aligner: number;
    total_aligners: number;
  };
  photo?: {
    id: string;
    photo_url: string;
    angle: string;
    aligner_number: number;
    overall_score: number | null;
    attachment_status: string | null;
    insertion_quality: string | null;
    gingival_health: string | null;
    recommendations: string[] | null;
    analyzed_at: string | null;
    created_at: string;
  };
}

export function usePractitionerAlerts() {
  return useQuery({
    queryKey: ['practitioner-alerts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get practitioner ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!practitioner) return [];

      // Get alerts with patient and photo data
      const { data, error } = await supabase
        .from('practitioner_alerts')
        .select(`
          *,
          patient:patients (
            id,
            current_aligner,
            total_aligners,
            profile:profiles (
              full_name,
              email
            )
          ),
          photo:patient_photos (
            id,
            photo_url,
            angle,
            aligner_number,
            overall_score,
            attachment_status,
            insertion_quality,
            gingival_health,
            recommendations,
            analyzed_at,
            created_at
          )
        `)
        .eq('practitioner_id', practitioner.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        throw error;
      }

      return data as PractitionerAlert[];
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('practitioner_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: profile?.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioner-alerts'] });
      toast.success('Alerte marquée comme résolue');
    },
    onError: (error) => {
      console.error('Error resolving alert:', error);
      toast.error('Erreur lors de la résolution');
    },
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      photoId,
      practitionerId,
      type,
      severity,
      message,
    }: {
      patientId: string;
      photoId?: string;
      practitionerId: string;
      type: PractitionerAlert['type'];
      severity: PractitionerAlert['severity'];
      message: string;
    }) => {
      const { data, error } = await supabase
        .from('practitioner_alerts')
        .insert({
          patient_id: patientId,
          photo_id: photoId,
          practitioner_id: practitionerId,
          type,
          severity,
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioner-alerts'] });
    },
  });
}
