import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // S4: CORS with restricted origins
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Get current user
    const { data: { user: callerUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !callerUser) {
      throw new Error("Unauthorized");
    }

    // Check if caller is admin using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: roleData, error: roleCheckError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .single();

    if (roleCheckError || !roleData) {
      throw new Error("Access denied: Admin role required");
    }

    // Parse request body
    const body = await req.json();
    const { 
      email, 
      password, 
      full_name, 
      phone, 
      role, // 'patient' or 'practitioner'
      // Patient-specific fields
      treatment_start,
      total_aligners,
      attachment_teeth,
      // Practitioner-specific fields
      specialty,
      license_number
    } = body;

    if (!email || !password || !full_name || !role) {
      throw new Error("Missing required fields: email, password, full_name, role");
    }

    if (!["patient", "practitioner"].includes(role)) {
      throw new Error("Invalid role. Must be 'patient' or 'practitioner'");
    }

    // Create auth user with service role (won't affect caller's session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    const userId = authData.user.id;

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        email: email,
        full_name: full_name,
        phone: phone || null,
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: role,
      });

    if (roleError) {
      // Cleanup
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw roleError;
    }

    // Create role-specific record
    if (role === "patient") {
      const { error: patientError } = await supabaseAdmin
        .from("patients")
        .insert({
          profile_id: profile.id,
          treatment_start: treatment_start || null,
          total_aligners: total_aligners || 0,
          attachment_teeth: attachment_teeth || [],
        });

      if (patientError) {
        // Cleanup
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw patientError;
      }
    } else if (role === "practitioner") {
      const { error: practitionerError } = await supabaseAdmin
        .from("practitioners")
        .insert({
          profile_id: profile.id,
          specialty: specialty || null,
          license_number: license_number || null,
        });

      if (practitionerError) {
        // Cleanup
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw practitionerError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${role === 'patient' ? 'Patient' : 'Praticien'} créé avec succès`,
        profile_id: profile.id,
        user_id: userId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating user:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
