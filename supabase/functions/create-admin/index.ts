import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // S4: CORS with restricted origins
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const bootstrapToken = req.headers.get("x-admin-bootstrap-token");
    const expectedBootstrapToken = Deno.env.get("ADMIN_BOOTSTRAP_TOKEN");

    if (!expectedBootstrapToken || bootstrapToken !== expectedBootstrapToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized bootstrap request" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      throw new Error("Missing required fields: email, password");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { count: adminCount, error: adminCountError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (adminCountError) throw adminCountError;
    if ((adminCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({ error: "Admin already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user
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
        full_name: "Administrateur",
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin",
      });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ success: true, message: "Admin créé avec succès" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
