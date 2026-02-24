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

/* ---------- Email transports (same as send-assignment-emails) ------ */

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

  await read();
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

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("EMAIL_FROM") || "AlignerTrack <noreply@alignertrack.local>";

  if (resendKey) {
    await sendViaResend(resendKey, from, to, subject, html);
  } else {
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
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      throw new Error("Email requis");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    /* ---------- Find user by email ---------- */
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, full_name, email")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (profileErr || !profile) {
      // Don't reveal if the account exists or not (security best practice)
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Si un compte existe avec cet email, un nouveau mot de passe vous sera envoyé.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    /* ---------- Check account is active in auth.users ---------- */
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (authErr || !authUser) {
      // Account doesn't exist in auth — silently succeed
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Si un compte existe avec cet email, un nouveau mot de passe vous sera envoyé.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if email is confirmed (account is active)
    if (!authUser.email_confirmed_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ce compte n'est pas encore activé. Contactez votre administrateur.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    /* ---------- Check user has a patient or practitioner role ---------- */
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.user_id);

    const userRoles = roles?.map((r) => r.role) || [];
    if (
      !userRoles.includes("patient") &&
      !userRoles.includes("practitioner")
    ) {
      // Admin accounts cannot reset password this way
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Si un compte existe avec cet email, un nouveau mot de passe vous sera envoyé.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    /* ---------- Generate new password ---------- */
    const newPassword = generatePassword();

    const { error: updateErr } =
      await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
        password: newPassword,
      });
    if (updateErr)
      throw new Error(
        `Échec de la réinitialisation du mot de passe: ${updateErr.message}`
      );

    /* ---------- Send email ---------- */
    const html = `
<h2>Réinitialisation de votre mot de passe</h2>
<p>Bonjour <strong>${profile.full_name}</strong>,</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe AlignerTrack.</p>
<p>Voici votre nouveau mot de passe :</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:8px;font-weight:bold;">Email :</td>
    <td style="padding:8px;">${profile.email}</td>
  </tr>
  <tr>
    <td style="padding:8px;font-weight:bold;">Nouveau mot de passe :</td>
    <td style="padding:8px;font-family:monospace;background:#f3f4f6;border-radius:4px;padding:8px 12px;">
      ${newPassword}
    </td>
  </tr>
</table>`;

    await sendEmail(
      profile.email,
      "AlignerTrack – Réinitialisation de votre mot de passe",
      html
    );

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Si un compte existe avec cet email, un nouveau mot de passe vous sera envoyé.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error resetting password:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
