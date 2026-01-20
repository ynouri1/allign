import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PhotoAnalysis } from '@/types/patient';
import { toast } from 'sonner';

export function useAlignerAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzePhoto = useCallback(async (photoUrl: string): Promise<PhotoAnalysis | null> => {
    setIsAnalyzing(true);

    try {
      // Convert image URL to base64 if it's a blob or data URL
      let imageBase64: string | undefined;
      let imageUrlParam: string | undefined;

      if (photoUrl.startsWith('data:')) {
        imageBase64 = photoUrl;
      } else if (photoUrl.startsWith('blob:')) {
        // Convert blob URL to base64
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Use URL directly for external URLs
        imageUrlParam = photoUrl;
      }

      const { data, error } = await supabase.functions.invoke('analyze-aligner-photo', {
        body: { 
          imageBase64,
          imageUrl: imageUrlParam,
        },
      });

      if (error) {
        console.error('Analysis error:', error);
        toast.error('Erreur lors de l\'analyse de la photo');
        return null;
      }

      if (data.error) {
        console.error('Analysis API error:', data.error);
        toast.error(data.error);
        return null;
      }

      const result: PhotoAnalysis = {
        status: data.status,
        attachmentStatus: data.attachmentStatus,
        insertionQuality: data.insertionQuality,
        gingivalHealth: data.gingivalHealth,
        overallScore: data.overallScore,
        recommendations: data.recommendations,
        analyzedAt: new Date(data.analyzedAt),
      };

      return result;

    } catch (error) {
      console.error('Failed to analyze photo:', error);
      toast.error('Impossible d\'analyser la photo');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isAnalyzing,
    analyzePhoto,
  };
}
