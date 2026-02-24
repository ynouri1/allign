import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const WINDOW_MS = Number(Deno.env.get("ANALYZE_RATE_WINDOW_MS") ?? "60000");
const MAX_REQUESTS_PER_WINDOW = Number(Deno.env.get("ANALYZE_RATE_MAX_REQUESTS") ?? "15");
const COOLDOWN_MS = Number(Deno.env.get("ANALYZE_RATE_COOLDOWN_MS") ?? "30000");
const UPSTREAM_429_COOLDOWN_MS = Number(Deno.env.get("ANALYZE_UPSTREAM_429_COOLDOWN_MS") ?? "30000");

type RateState = {
  windowStart: number;
  requestCount: number;
  cooldownUntil: number;
};

const rateLimitByUser = new Map<string, RateState>();

function getOrInitRateState(userId: string, now: number): RateState {
  const existing = rateLimitByUser.get(userId);
  if (existing) return existing;

  const initial: RateState = {
    windowStart: now,
    requestCount: 0,
    cooldownUntil: 0,
  };
  rateLimitByUser.set(userId, initial);
  return initial;
}

function getRetryAfterSeconds(cooldownUntil: number, now: number): number {
  return Math.max(1, Math.ceil((cooldownUntil - now) / 1000));
}

function applyLocalRateLimit(userId: string): { blocked: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const state = getOrInitRateState(userId, now);

  if (state.cooldownUntil > now) {
    return { blocked: true, retryAfterSeconds: getRetryAfterSeconds(state.cooldownUntil, now) };
  }

  if (now - state.windowStart >= WINDOW_MS) {
    state.windowStart = now;
    state.requestCount = 0;
  }

  state.requestCount += 1;

  if (state.requestCount > MAX_REQUESTS_PER_WINDOW) {
    state.cooldownUntil = now + COOLDOWN_MS;
    state.windowStart = now;
    state.requestCount = 0;
    return { blocked: true, retryAfterSeconds: getRetryAfterSeconds(state.cooldownUntil, now) };
  }

  return { blocked: false };
}

function applyUpstreamCooldown(userId: string): number {
  const now = Date.now();
  const state = getOrInitRateState(userId, now);
  state.cooldownUntil = Math.max(state.cooldownUntil, now + UPSTREAM_429_COOLDOWN_MS);
  return getRetryAfterSeconds(state.cooldownUntil, now);
}

// Helper to format teeth numbers for the prompt
function formatTeethForPrompt(teeth: number[]): string {
  if (!teeth || teeth.length === 0) {
    return "Aucune dent spécifique n'a été indiquée comme portant des taquets.";
  }
  
  const upperTeeth = teeth.filter(t => t >= 11 && t <= 28).sort((a, b) => a - b);
  const lowerTeeth = teeth.filter(t => t >= 31 && t <= 48).sort((a, b) => a - b);
  
  let description = `Le patient a ${teeth.length} taquets sur les dents suivantes (notation FDI):\n`;
  
  if (upperTeeth.length > 0) {
    description += `- Arcade supérieure: ${upperTeeth.join(', ')}\n`;
  }
  if (lowerTeeth.length > 0) {
    description += `- Arcade inférieure: ${lowerTeeth.join(', ')}\n`;
  }
  
  return description;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function resolveImageInput(imageBase64?: string, imageUrl?: string): Promise<{ mimeType: string; data: string } | null> {
  if (imageBase64) {
    const dataUrlMatch = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (dataUrlMatch) {
      return {
        mimeType: dataUrlMatch[1] || "image/jpeg",
        data: dataUrlMatch[2],
      };
    }

    return {
      mimeType: "image/jpeg",
      data: imageBase64,
    };
  }

  if (imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error("Unable to fetch image URL");
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      mimeType: contentType,
      data: uint8ToBase64(bytes),
    };
  }

  return null;
}

serve(async (req) => {
  // S4: CORS with restricted origins
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const localRateLimit = applyLocalRateLimit(user.id);
    if (localRateLimit.blocked) {
      return new Response(
        JSON.stringify({
          error: `Trop de requêtes locales. Réessaie dans ${localRateLimit.retryAfterSeconds}s.`,
          retryAfterSeconds: localRateLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(localRateLimit.retryAfterSeconds ?? 1),
          },
        }
      );
    }

    const { imageBase64, imageUrl, attachmentTeeth = [] } = await req.json();

    if (!imageBase64 && !imageUrl) {
      console.error("No image provided");
      return new Response(
        JSON.stringify({ error: "Image is required (base64 or URL)" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing aligner photo with Gemini...");
    console.log("Attachment teeth provided:", attachmentTeeth);

    const imageInput = await resolveImageInput(imageBase64, imageUrl);
    if (!imageInput) {
      return new Response(
        JSON.stringify({ error: "Image is required (base64 or URL)" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build dynamic prompt based on attachment teeth
    const teethInfo = formatTeethForPrompt(attachmentTeeth);
    const hasSpecificTeeth = attachmentTeeth && attachmentTeeth.length > 0;

const systemPrompt = `Tu es un assistant médical TRÈS STRICT spécialisé dans l'analyse de photos d'aligneurs dentaires (gouttières orthodontiques).

**RÈGLE CRITIQUE**: Tu dois être EXTRÊMEMENT VIGILANT et signaler le MOINDRE problème visible. En cas de doute, TOUJOURS signaler un problème potentiel plutôt que de dire que tout va bien. La sécurité du patient prime.

**INFORMATIONS SUR LES TAQUETS DU PATIENT:**
${teethInfo}

Analyse l'image fournie avec une attention MAXIMALE sur les dents indiquées ci-dessus et évalue les critères suivants:

1. **État des taquets (attachments)**: ${hasSpecificTeeth 
  ? `Examine ATTENTIVEMENT chaque dent: ${attachmentTeeth.join(', ')}. Les taquets sont-ils TOUS clairement visibles et parfaitement en place?`
  : 'Les taquets collés sur les dents sont-ils tous présents et bien en place?'}
   - "ok": TOUS les taquets sont CLAIREMENT visibles, parfaitement positionnés, aucun doute
   - "partial": Le MOINDRE doute sur un taquet = partial. Taquet partiellement visible, légèrement décollé, ou position incertaine
   - "missing": Un ou plusieurs taquets clairement absents ou invisibles

2. **Qualité d'insertion de la gouttière**: EXAMINE TRÈS ATTENTIVEMENT si la gouttière est parfaitement insérée.
   - "good": La gouttière épouse PARFAITEMENT les dents, AUCUN espace visible nulle part, insertion complète et homogène
   - "acceptable": Le MOINDRE espace visible, même minime, entre la gouttière et une dent = acceptable (pas good!)
   - "poor": Espace clairement visible, gouttière décalée, mal positionnée, ou soulevée même partiellement sur UNE dent

   **CRITÈRES D'ALERTE pour insertion "poor":**
   - Gouttière qui ne descend pas complètement sur les dents
   - Bord de la gouttière visible au-dessus de la ligne gingivale
   - Espace/gap entre le plastique et la surface dentaire
   - Gouttière qui semble "flotter" ou ne pas adhérer

3. **Santé gingivale**: État des gencives visibles (ÉVALUATION MODÉRÉE)
   - "healthy": Gencives roses à légèrement rosées, variations de couleur mineures acceptables, pas de gonflement visible
   - "mild_inflammation": Rougeur CLAIREMENT visible et localisée (pas juste une légère variation de teinte), OU gonflement léger mais distinct
   - "inflammation": Rougeur marquée étendue, gonflement évident, saignement apparent

4. **Score global**: Score CONSERVATEUR de 0 à 100. En cas de TOUT problème détecté:
   - Problème d'insertion = score max 60
   - Taquet manquant/partial = score max 50
   - Inflammation = score max 55
   - Cumul de problèmes = réduire encore plus

5. **Recommandations**: OBLIGATOIRE: si tu détectes un problème, recommande de contacter le praticien.

6. **Détails des taquets**: ${hasSpecificTeeth 
  ? `Pour CHAQUE dent (${attachmentTeeth.join(', ')}), décris précisément ce que tu observes.`
  : 'Décris l\'état de chaque taquet visible.'}

**RAPPEL**: Il vaut MIEUX signaler un faux positif qu'ignorer un vrai problème. Sois STRICT dans ton évaluation.

Réponds UNIQUEMENT avec un JSON valide sans markdown, en suivant exactement ce format:
{
  "attachmentStatus": "ok" | "partial" | "missing",
  "insertionQuality": "good" | "acceptable" | "poor",
  "gingivalHealth": "healthy" | "mild_inflammation" | "inflammation",
  "overallScore": number,
  "recommendations": ["conseil 1", "conseil 2"],
  "attachmentDetails": "Description de l'état des taquets sur les dents spécifiées"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${hasSpecificTeeth
                  ? `Analyse cette photo d'aligneur dentaire. Concentre-toi particulièrement sur les dents ${attachmentTeeth.join(', ')} qui portent des taquets. Fournis ton évaluation en JSON.`
                  : "Analyse cette photo d'aligneur dentaire et fournis ton évaluation en JSON."}`,
              },
              {
                inline_data: {
                  mime_type: imageInput.mimeType,
                  data: imageInput.data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      let upstreamMessage = "Erreur lors de l'analyse AI";
      try {
        const parsed = JSON.parse(errorText) as {
          error?: {
            message?: string;
            details?: Array<{ reason?: string }>;
          };
        };
        const reason = parsed.error?.details?.[0]?.reason;
        const message = parsed.error?.message ?? "";

        if (reason === "API_KEY_INVALID" || /api key expired|api key invalid/i.test(message)) {
          upstreamMessage = "Clé Gemini invalide ou expirée. Mets à jour GEMINI_API_KEY.";
        }
      } catch {
        // Ignore JSON parse errors and keep fallback message.
      }
      
      if (response.status === 429) {
        const retryAfterSeconds = applyUpstreamCooldown(user.id);
        return new Response(
          JSON.stringify({
            error: `Quota Gemini atteint. Réessaie dans ${retryAfterSeconds}s.`,
            retryAfterSeconds,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfterSeconds),
            },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: upstreamMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    // Gemini 2.5 "thinking" models may include thought parts — filter them out
    const content = data.candidates?.[0]?.content?.parts
      ?.filter((part: { thought?: boolean }) => !part.thought)
      ?.map((part: { text?: string }) => part.text || "")
      .join("");

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Réponse AI vide" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("AI response content:", content);

    // Parse the JSON response from Gemini
    let analysis;
    try {
      // Remove potential markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(
        JSON.stringify({ error: "Erreur de parsing de la réponse AI" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and structure the response
    const result = {
      status: 'analyzed',
      attachmentStatus: analysis.attachmentStatus || 'ok',
      insertionQuality: analysis.insertionQuality || 'good',
      gingivalHealth: analysis.gingivalHealth || 'healthy',
      overallScore: typeof analysis.overallScore === 'number' ? analysis.overallScore : 70,
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      attachmentDetails: analysis.attachmentDetails || null,
      teethAnalyzed: attachmentTeeth,
      analyzedAt: new Date().toISOString(),
    };

    console.log("Analysis result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-aligner-photo:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
