import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PatientPhotoRecord {
  id: string;
  patient_id: string;
  photo_url: string;
  angle: string;
  aligner_number: number;
  brightness_score: number | null;
  sharpness_score: number | null;
  framing_score: number | null;
  quality_overall: number | null;
  analysis_status: string;
  attachment_status: string | null;
  insertion_quality: string | null;
  gingival_health: string | null;
  overall_score: number | null;
  recommendations: string[] | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePatientPhotos(patientId?: string) {
  return useQuery({
    queryKey: ['patient-photos', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('patient_photos')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patient photos:', error);
        throw error;
      }

      // Generate signed URLs for each photo
      const photosWithSignedUrls = await Promise.all(
        (data as PatientPhotoRecord[]).map(async (photo) => {
          const signedUrl = await getSignedUrl(photo.photo_url);
          return { ...photo, photo_url: signedUrl };
        })
      );

      return photosWithSignedUrls;
    },
    enabled: !!patientId,
  });
}

// Helper function to extract file path from URL and get signed URL
async function getSignedUrl(photoUrl: string): Promise<string> {
  try {
    // Extract the file path from the URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/aligner-photos/patient-id/filename.jpg
    const match = photoUrl.match(/aligner-photos\/(.+)$/);
    if (!match) return photoUrl;
    
    const filePath = match[1];
    
    const { data, error } = await supabase.storage
      .from('aligner-photos')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error || !data) {
      console.error('Error creating signed URL:', error);
      return photoUrl;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('Error in getSignedUrl:', err);
    return photoUrl;
  }
}

export function useMyPhotos() {
  const queryClient = useQueryClient();

  // Realtime: auto-refresh when photos change in DB (new photo, analysis done)
  useEffect(() => {
    const channel = supabase
      .channel('patient-photos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patient_photos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-photos'] });
          queryClient.invalidateQueries({ queryKey: ['patient-photos'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['my-photos'],
    queryFn: async (): Promise<{ photos: PatientPhotoRecord[]; patientId: string } | null> => {
      // First get the current user's patient record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return null;

      // Get patient record
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!patient) return null;

      // Get photos
      const { data, error } = await supabase
        .from('patient_photos')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my photos:', error);
        throw error;
      }

      // Generate signed URLs for each photo
      const photosWithSignedUrls = await Promise.all(
        (data as PatientPhotoRecord[]).map(async (photo) => {
          const signedUrl = await getSignedUrl(photo.photo_url);
          return { ...photo, photo_url: signedUrl };
        })
      );

      return { photos: photosWithSignedUrls, patientId: patient.id };
    },
  });
}

export function useSavePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      photoDataUrl,
      angle,
      alignerNumber,
      qualityScore,
      analysisResult,
    }: {
      patientId: string;
      photoDataUrl: string;
      angle: string;
      alignerNumber: number;
      qualityScore?: {
        brightness: number;
        sharpness: number;
        framing: number;
        overall: number;
      };
      analysisResult?: {
        status: string;
        attachmentStatus: string;
        insertionQuality: string;
        gingivalHealth: string;
        overallScore: number;
        recommendations: string[];
        analyzedAt: Date;
      };
    }) => {
      // Convert base64 to blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();

      // Generate unique filename
      const fileName = `${patientId}/${Date.now()}_${angle}.jpg`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('aligner-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('aligner-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { data, error } = await supabase
        .from('patient_photos')
        .insert({
          patient_id: patientId,
          photo_url: publicUrl,
          angle,
          aligner_number: alignerNumber,
          brightness_score: qualityScore?.brightness,
          sharpness_score: qualityScore?.sharpness,
          framing_score: qualityScore?.framing,
          quality_overall: qualityScore?.overall,
          analysis_status: analysisResult?.status || 'pending',
          attachment_status: analysisResult?.attachmentStatus,
          insertion_quality: analysisResult?.insertionQuality,
          gingival_health: analysisResult?.gingivalHealth,
          overall_score: analysisResult?.overallScore,
          recommendations: analysisResult?.recommendations,
          analyzed_at: analysisResult?.analyzedAt?.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      // Create alerts for practitioners if issues detected
      if (analysisResult && (
        analysisResult.attachmentStatus === 'missing' ||
        analysisResult.attachmentStatus === 'partial' ||
        analysisResult.insertionQuality === 'poor' ||
        analysisResult.gingivalHealth === 'inflammation' ||
        analysisResult.gingivalHealth === 'mild_inflammation'
      )) {
        try {
          await supabase.functions.invoke('create-analysis-alerts', {
            body: {
              patientId,
              photoId: data.id,
              analysisResult,
            },
          });
        } catch (alertError) {
          console.error('Error creating alerts:', alertError);
          // Don't throw - photo was saved successfully
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-photos'] });
      queryClient.invalidateQueries({ queryKey: ['my-photos'] });
      toast.success('Photo sauvegardée !');
    },
    onError: (error) => {
      console.error('Save photo error:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });
}
