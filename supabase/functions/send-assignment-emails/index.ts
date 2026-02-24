import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => chars[b % chars.length]).join("");
}

/* ---------- Email transports ---------- */

/**
 * Send email via Resend HTTP API (production).
 * Requires RESEND_API_KEY env var.
 */
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error (${res.status}): ${body}`);
  }
  return await res.json();
}

/**
 * Minimal SMTP send (no auth, plain TCP).
 * Works with Inbucket / Mailpit in the local Docker network.
 */
async function sendViaSmtp(
  host: string,
  port: number,
  from: string,
  to: string,
  subject: string,
  html: string
) {
  const conn = await Deno.connect({ hostname: host, port });
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function read(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? dec.decode(buf.subarray(0, n)) : "";
  }

  async function write(cmd: string): Promise<string> {
    await conn.write(enc.encode(cmd + "\r\n"));
    return await read();
  }

  await read(); // server greeting
  await write("EHLO localhost");
  await write(`MAIL FROM:<${from}>`);
  await write(`RCPT TO:<${to}>`);
  await write("DATA");

  const message = [
    `From: AlignerTrack <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
    `.`,
  ].join("\r\n");

  await conn.write(enc.encode(message + "\r\n"));
  await read();
  await write("QUIT");
  conn.close();
}

/**
 * Unified email sender — uses Resend in production, SMTP locally.
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("EMAIL_FROM") || "AlignerTrack <noreply@alignertrack.local>";

  if (resendKey) {
    // Production: use Resend API
    await sendViaResend(resendKey, from, to, subject, html);
  } else {
    // Local dev: use Inbucket SMTP
    const smtpHost =
      Deno.env.get("SMTP_HOST") || "supabase_inbucket_supabase";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "1025", 10);
    const fromAddress = from.replace(/.*<(.+)>/, "$1") || from;
    await sendViaSmtp(smtpHost, smtpPort, fromAddress, to, subject, html);
  }
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    /* ---------- Auth: require admin ---------- */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const {
      data: { user: caller },
      error: userErr,
    } = await supabaseClient.auth.getUser();
    if (userErr || !caller) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();
    if (!roleData) throw new Error("Access denied: Admin role required");

    /* ---------- Input ---------- */
    const { patient_id, practitioner_id } = await req.json();
    if (!patient_id || !practitioner_id) {
      throw new Error("Missing patient_id or practitioner_id");
    }

    /* ---------- Fetch patient & practitioner profiles ---------- */
    const { data: patient, error: patErr } = await supabaseAdmin
      .from("patients")
      .select(
        "id, profile:profiles!patients_profile_id_fkey(user_id, full_name, email)"
      )
      .eq("id", patient_id)
      .single();
    if (patErr || !patient?.profile) throw new Error("Patient not found");

    const { data: practitioner, error: pracErr } = await supabaseAdmin
      .from("practitioners")
      .select(
        "id, profile:profiles!practitioners_profile_id_fkey(full_name, email)"
      )
      .eq("id", practitioner_id)
      .single();
    if (pracErr || !practitioner?.profile)
      throw new Error("Practitioner not found");

    // Handle profile which may come as object or array from Supabase
    const patProfile = Array.isArray(patient.profile)
      ? patient.profile[0]
      : patient.profile;
    const pracProfile = Array.isArray(practitioner.profile)
      ? practitioner.profile[0]
      : practitioner.profile;

    /* ---------- Generate new password for patient ---------- */
    const newPassword = generatePassword();

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      patProfile.user_id,
      { password: newPassword }
    );
    if (updateErr)
      throw new Error(`Failed to update password: ${updateErr.message}`);

    /* ---------- Config ---------- */
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";

    /* ---------- Email to patient ---------- */
    const patientHtml = `
<h2>Bienvenue sur AlignerTrack</h2>
<p>Bonjour <strong>${patProfile.full_name}</strong>,</p>
<p>Votre praticien <strong>Dr ${pracProfile.full_name}</strong> vous a
assigné pour le suivi de votre traitement orthodontique.</p>
<p>Voici vos identifiants de connexion :</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:8px;font-weight:bold;">Email :</td>
    <td style="padding:8px;">${patProfile.email}</td>
  </tr>
  <tr>
    <td style="padding:8px;font-weight:bold;">Mot de passe :</td>
    <td style="padding:8px;font-family:monospace;background:#f3f4f6;border-radius:4px;">
      ${newPassword}
    </td>
  </tr>
</table>
<p>Connectez-vous sur : <a href="${appUrl}">${appUrl}</a></p>
<p style="color:#6b7280;font-size:12px;">
  Nous vous recommandons de changer votre mot de passe après votre première connexion.
</p>`;

    await sendEmail(
      patProfile.email,
      "AlignerTrack – Vos identifiants de connexion",
      patientHtml
    );

    /* ---------- Email to practitioner ---------- */
    const pracHtml = `
<h2>Nouveau patient assigné</h2>
<p>Bonjour <strong>Dr ${pracProfile.full_name}</strong>,</p>
<p>Un nouveau patient vous a été assigné sur AlignerTrack.</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:8px;font-weight:bold;">Patient :</td>
    <td style="padding:8px;">${patProfile.full_name}</td>
  </tr>
  <tr>
    <td style="padding:8px;font-weight:bold;">Email :</td>
    <td style="padding:8px;">${patProfile.email}</td>
  </tr>
</table>
<p>Connectez-vous pour consulter le dossier :
  <a href="${appUrl}">${appUrl}</a>
</p>`;

    await sendEmail(
      pracProfile.email,
      "AlignerTrack – Nouveau patient assigné",
      pracHtml
    );

    /* ---------- Response ---------- */
    return new Response(
      JSON.stringify({
        success: true,
        message: "Emails envoyés avec succès",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending assignment emails:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
