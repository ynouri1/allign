import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// ── S5: Input validation helpers ──────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ATTACHMENT_STATUS = ['ok', 'partial', 'missing'] as const;
const VALID_INSERTION_QUALITY = ['good', 'acceptable', 'poor'] as const;
const VALID_GINGIVAL_HEALTH = ['healthy', 'mild_inflammation', 'inflammation'] as const;

interface AnalysisInput {
  attachmentStatus?: string;
  insertionQuality?: string;
  gingivalHealth?: string;
  overallScore?: number;
  [key: string]: unknown;
}

function validateInputs(
  patientId: unknown,
  photoId: unknown,
  analysisResult: unknown,
): string | null {
  if (!patientId || typeof patientId !== 'string' || !UUID_RE.test(patientId)) {
    return 'patientId must be a valid UUID';
  }
  if (photoId !== undefined && photoId !== null) {
    if (typeof photoId !== 'string' || !UUID_RE.test(photoId)) {
      return 'photoId must be a valid UUID if provided';
    }
  }
  if (!analysisResult || typeof analysisResult !== 'object') {
    return 'analysisResult must be a non-null object';
  }
  const ar = analysisResult as AnalysisInput;
  if (ar.attachmentStatus && !(VALID_ATTACHMENT_STATUS as readonly string[]).includes(ar.attachmentStatus)) {
    return `attachmentStatus must be one of: ${VALID_ATTACHMENT_STATUS.join(', ')}`;
  }
  if (ar.insertionQuality && !(VALID_INSERTION_QUALITY as readonly string[]).includes(ar.insertionQuality)) {
    return `insertionQuality must be one of: ${VALID_INSERTION_QUALITY.join(', ')}`;
  }
  if (ar.gingivalHealth && !(VALID_GINGIVAL_HEALTH as readonly string[]).includes(ar.gingivalHealth)) {
    return `gingivalHealth must be one of: ${VALID_GINGIVAL_HEALTH.join(', ')}`;
  }
  if (ar.overallScore !== undefined && (typeof ar.overallScore !== 'number' || ar.overallScore < 0 || ar.overallScore > 100)) {
    return 'overallScore must be a number between 0 and 100';
  }
  return null; // valid
}

// ── Main handler ──────────────────────────────────────────────────────

serve(async (req) => {
  // S4: CORS with restricted origins
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    // S3: verify_jwt = true in config.toml; also check header as defense-in-depth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { patientId, photoId, analysisResult } = await req.json();

    // S5: Strict input validation
    const validationError = validateInputs(patientId, photoId, analysisResult);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: callerUser }, error: callerError } = await authClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [{ data: callerRoles }, { data: callerProfile }] = await Promise.all([
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', callerUser.id),
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', callerUser.id)
        .maybeSingle(),
    ]);

    const isAdmin = (callerRoles || []).some((r) => r.role === 'admin');

    if (!isAdmin) {
      if (!callerProfile) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: callerPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', callerProfile.id)
        .maybeSingle();

      if (!callerPatient || callerPatient.id !== patientId) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Find all practitioners assigned to this patient
    const { data: assignments, error: assignError } = await supabase
      .from('practitioner_patients')
      .select('practitioner_id')
      .eq('patient_id', patientId);

    if (assignError) {
      console.error('Error fetching practitioner assignments:', assignError);
      throw assignError;
    }

    // S5: If a photoId was provided, verify it belongs to this patient
    if (photoId) {
      const { data: photo, error: photoError } = await supabase
        .from('patient_photos')
        .select('id, patient_id')
        .eq('id', photoId)
        .maybeSingle();

      if (photoError || !photo) {
        return new Response(
          JSON.stringify({ error: "Photo not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (photo.patient_id !== patientId) {
        return new Response(
          JSON.stringify({ error: "Photo does not belong to this patient" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
