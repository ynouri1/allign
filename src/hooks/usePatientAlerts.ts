import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PatientAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  photo_id: string | null;
}

export function usePatientAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime: auto-refresh when alerts change in DB
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('patient-alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'practitioner_alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['patient-alerts', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['patient-alerts', user?.id],
    queryFn: async () => {
      if (!user) return { alerts: [], unresolvedCount: 0 };

      // Get patient ID from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return { alerts: [], unresolvedCount: 0 };

      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!patient) return { alerts: [], unresolvedCount: 0 };

      // Get alerts for this patient
      const { data: alerts, error } = await supabase
        .from('practitioner_alerts')
        .select('id, type, severity, message, resolved, resolved_at, created_at, photo_id')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patient alerts:', error);
        return { alerts: [], unresolvedCount: 0 };
      }

      const unresolvedCount = alerts?.filter(a => !a.resolved).length || 0;

      return {
        alerts: alerts as PatientAlert[],
        unresolvedCount,
      };
    },
    enabled: !!user,
  });
}
