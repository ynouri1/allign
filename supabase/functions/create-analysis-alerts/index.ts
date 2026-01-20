import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, photoId, analysisResult } = await req.json();

    if (!patientId || !analysisResult) {
      return new Response(
        JSON.stringify({ error: "patientId and analysisResult are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all practitioners assigned to this patient
    const { data: assignments, error: assignError } = await supabase
      .from('practitioner_patients')
      .select('practitioner_id')
      .eq('patient_id', patientId);

    if (assignError) {
      console.error('Error fetching practitioner assignments:', assignError);
      throw assignError;
    }

    if (!assignments || assignments.length === 0) {
      console.log('No practitioners assigned to this patient');
      return new Response(
        JSON.stringify({ alertsCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which alerts to create based on analysis
    const alertsToCreate: Array<{
      type: string;
      severity: string;
      message: string;
    }> = [];

    if (analysisResult.attachmentStatus === 'missing') {
      alertsToCreate.push({
        type: 'attachment_lost',
        severity: 'high',
        message: 'Un ou plusieurs taquets semblent manquants. Vérification recommandée.'
      });
    } else if (analysisResult.attachmentStatus === 'partial') {
      alertsToCreate.push({
        type: 'attachment_lost',
        severity: 'medium',
        message: 'Certains taquets semblent partiellement décollés.'
      });
    }

    if (analysisResult.insertionQuality === 'poor') {
      alertsToCreate.push({
        type: 'poor_insertion',
        severity: 'high',
        message: 'La gouttière semble mal insérée. Contact avec le patient recommandé.'
      });
    }

    if (analysisResult.gingivalHealth === 'inflammation') {
      alertsToCreate.push({
        type: 'gingival_issue',
        severity: 'high',
        message: 'Inflammation gingivale détectée. Consultation recommandée.'
      });
    } else if (analysisResult.gingivalHealth === 'mild_inflammation') {
      alertsToCreate.push({
        type: 'gingival_issue',
        severity: 'medium',
        message: 'Légère inflammation gingivale détectée.'
      });
    }

    if (alertsToCreate.length === 0) {
      console.log('No issues detected, no alerts to create');
      return new Response(
        JSON.stringify({ alertsCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create alerts for each practitioner
    let totalAlertsCreated = 0;
    
    for (const assignment of assignments) {
      for (const alertData of alertsToCreate) {
        const { error: insertError } = await supabase
          .from('practitioner_alerts')
          .insert({
            patient_id: patientId,
            photo_id: photoId,
            practitioner_id: assignment.practitioner_id,
            type: alertData.type,
            severity: alertData.severity,
            message: alertData.message,
          });

        if (insertError) {
          console.error('Error creating alert:', insertError);
        } else {
          totalAlertsCreated++;
        }
      }
    }

    console.log(`Created ${totalAlertsCreated} alerts for patient ${patientId}`);

    return new Response(
      JSON.stringify({ alertsCreated: totalAlertsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in create-analysis-alerts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
