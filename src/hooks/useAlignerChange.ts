import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useConfirmAlignerChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, newAlignerNumber }: { patientId: string; newAlignerNumber: number }) => {
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
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Félicitations ! Vous êtes passé à la gouttière #${variables.newAlignerNumber}`);
      queryClient.invalidateQueries({ queryKey: ['my-patient-data'] });
    },
    onError: (error) => {
      console.error('Error confirming aligner change:', error);
      toast.error('Erreur lors de la confirmation du changement');
    },
  });
}
