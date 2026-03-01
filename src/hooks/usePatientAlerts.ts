import { useEffect, useState } from 'react';
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
  const [patientId, setPatientId] = useState<string | null>(null);

  // Resolve patient_id from auth user (once)
  useEffect(() => {
    if (!user) { setPatientId(null); return; }
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (cancelled || !profile) return;
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      if (!cancelled && patient) setPatientId(patient.id);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Realtime: only listen to changes for THIS patient
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel('patient-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practitioner_alerts',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['patient-alerts', user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, user?.id, queryClient]);

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
