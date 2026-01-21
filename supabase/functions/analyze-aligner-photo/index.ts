import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, attachmentTeeth = [] } = await req.json();

    if (!imageBase64 && !imageUrl) {
      console.error("No image provided");
      return new Response(
        JSON.stringify({ error: "Image is required (base64 or URL)" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing aligner photo with Gemini...");
    console.log("Attachment teeth provided:", attachmentTeeth);

    // Prepare the image content
    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: imageBase64 } }
      : { type: "image_url", image_url: { url: imageUrl } };

    // Build dynamic prompt based on attachment teeth
    const teethInfo = formatTeethForPrompt(attachmentTeeth);
    const hasSpecificTeeth = attachmentTeeth && attachmentTeeth.length > 0;

    const systemPrompt = `Tu es un assistant médical spécialisé dans l'analyse de photos d'aligneurs dentaires (gouttières orthodontiques).

**INFORMATIONS SUR LES TAQUETS DU PATIENT:**
${teethInfo}

Analyse l'image fournie avec une attention particulière sur les dents indiquées ci-dessus et évalue les critères suivants:

1. **État des taquets (attachments)**: ${hasSpecificTeeth 
  ? `Concentre-toi SPÉCIFIQUEMENT sur les dents ${attachmentTeeth.join(', ')}. Les taquets sur ces dents sont-ils tous présents et bien en place?`
  : 'Les taquets collés sur les dents sont-ils tous présents et bien en place?'}
   - "ok": Tous les taquets ${hasSpecificTeeth ? 'sur les dents spécifiées ' : ''}sont présents et bien positionnés
   - "partial": Certains taquets semblent décollés ou mal positionnés ${hasSpecificTeeth ? '(précise quelles dents)' : ''}
   - "missing": Un ou plusieurs taquets sont clairement manquants ${hasSpecificTeeth ? '(précise quelles dents)' : ''}

2. **Qualité d'insertion de la gouttière**: La gouttière est-elle bien enfoncée sur les dents, PARTICULIÈREMENT au niveau des dents avec taquets?
   - "good": La gouttière épouse parfaitement les dents ${hasSpecificTeeth ? 'notamment sur les dents ' + attachmentTeeth.join(', ') : ''}, pas d'espace visible
   - "acceptable": Légère imperfection mais globalement correcte
   - "poor": Espace visible entre la gouttière et les dents, mal insérée (surtout au niveau des taquets)

3. **Santé gingivale**: État des gencives visibles, ${hasSpecificTeeth 
  ? `en particulier autour des dents avec taquets (${attachmentTeeth.join(', ')}). Les taquets mal ajustés peuvent irriter les gencives.`
  : 'notamment autour des zones de taquets.'}
   - "healthy": Gencives roses, pas de gonflement ni de rougeur
   - "mild_inflammation": Légère rougeur ou gonflement localisé ${hasSpecificTeeth ? '(précise si c\'est près d\'un taquet)' : ''}
   - "inflammation": Rougeur marquée, gonflement, signe d'inflammation ${hasSpecificTeeth ? '(indique si lié aux taquets)' : ''}

4. **Score global**: Un score de 0 à 100 représentant l'état général, en tenant compte particulièrement de l'état des taquets

5. **Recommandations**: Liste de conseils personnalisés basés sur l'analyse. ${hasSpecificTeeth 
  ? `Inclus des conseils spécifiques pour les taquets sur les dents ${attachmentTeeth.join(', ')}.`
  : ''}

6. **Détails des taquets** (nouveau): ${hasSpecificTeeth 
  ? `Pour chaque dent avec taquet (${attachmentTeeth.join(', ')}), indique brièvement son état.`
  : 'Décris l\'état général des taquets visibles.'}

Réponds UNIQUEMENT avec un JSON valide sans markdown, en suivant exactement ce format:
{
  "attachmentStatus": "ok" | "partial" | "missing",
  "insertionQuality": "good" | "acceptable" | "poor",
  "gingivalHealth": "healthy" | "mild_inflammation" | "inflammation",
  "overallScore": number,
  "recommendations": ["conseil 1", "conseil 2"],
  "attachmentDetails": "Description de l'état des taquets sur les dents spécifiées"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: hasSpecificTeeth 
                  ? `Analyse cette photo d'aligneur dentaire. Concentre-toi particulièrement sur les dents ${attachmentTeeth.join(', ')} qui portent des taquets. Fournis ton évaluation en JSON.`
                  : "Analyse cette photo d'aligneur dentaire et fournis ton évaluation en JSON."
              },
              imageContent
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits AI épuisés. Veuillez ajouter des crédits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'analyse AI" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
