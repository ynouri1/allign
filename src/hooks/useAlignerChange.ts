import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useConfirmAlignerChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, newAlignerNumber }: { patientId: string; newAlignerNumber: number }) => {
      // First update the current aligner
      const { data, error } = await supabase
        .from('patients')
        .update({ 
          current_aligner: newAlignerNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId)
        .select()
        .single();

      if (error) throw error;

      // Then record the change in history
      const { error: historyError } = await supabase
        .from('aligner_changes')
        .insert({
          patient_id: patientId,
          from_aligner: newAlignerNumber - 1,
          to_aligner: newAlignerNumber,
          confirmed_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Error saving aligner change history:', historyError);
        // Don't throw, the main update succeeded
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Félicitations ! Vous êtes passé à la gouttière #${variables.newAlignerNumber}`);
      queryClient.invalidateQueries({ queryKey: ['my-patient-data'] });
      queryClient.invalidateQueries({ queryKey: ['aligner-changes'] });
    },
    onError: (error) => {
      console.error('Error confirming aligner change:', error);
      toast.error('Erreur lors de la confirmation du changement');
    },
  });
}

// Hook to fetch aligner change history for a patient
export function useAlignerChanges(patientId: string | undefined) {
  return useQuery({
    queryKey: ['aligner-changes', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('aligner_changes')
        .select('*')
        .eq('patient_id', patientId)
        .order('confirmed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId,
  });
}
