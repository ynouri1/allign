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
    const { user_id } = body;

    if (!user_id) {
      throw new Error("Missing required field: user_id");
    }

    // Prevent deleting yourself
    if (user_id === callerUser.id) {
      throw new Error("Cannot delete your own account");
    }

    console.log(`Attempting to delete user: ${user_id}`);

    // Delete related data first (cascade should handle most, but let's be explicit)
    // Delete from user_roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);
    
    if (rolesError) {
      console.error("Error deleting user roles:", rolesError);
    }

    // Get profile to delete related patient/practitioner records
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (profile) {
      // Delete patient record if exists
      await supabaseAdmin
        .from("patients")
        .delete()
        .eq("profile_id", profile.id);

      // Delete practitioner record if exists
      await supabaseAdmin
        .from("practitioners")
        .delete()
        .eq("profile_id", profile.id);

      // Delete profile
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", profile.id);
    }

    // Finally, delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted user: ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Utilisateur supprimé avec succès"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting user:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
