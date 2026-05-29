import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { originalBullet, jdContext, focusKeywords } = await req.json();
    if (!originalBullet) throw new Error("Original bullet point is required");

    const prompt = `
      You are an expert resume optimizer. Rewrite this resume bullet point to be more high-impact and ATS-friendly.
      Original: ${originalBullet}
      Context: ${jdContext || 'General role'}
      Focus Keywords: ${focusKeywords?.join(", ") || 'Action verbs, impact'}

      CRITICAL: Keep all text responses EXTREMELY concise (max 1 sentence) to ensure fast processing.
      
      STRICT BULLET POINT LINE LENGTH MANDATE: The optimized "bullet" MUST strictly fall into one of the following visual line character length ranges (including spaces) to beautifully and fully fill visual lines on a standard A4 PDF template without creating awkward visual orphans or underfilled trailing lines:
      - For 1 full line: EXACTLY 110 to 125 characters.
      - For 2 full lines: EXACTLY 220 to 250 characters.
      - For 3 full lines: EXACTLY 330 to 375 characters.
      DO NOT return a bullet point that falls outside these ranges (e.g., do not return bullets less than 110 characters, or between 126 and 219 characters, or between 251 and 329 characters). Adjust wording, precision, and technical detail dynamically to hit these exact target ranges perfectly. Maintain absolute factual alignment to facts without hallucinating fake metrics.

      RETURN JSON FORMAT ONLY:
      {
        "bullet": "The optimized high-impact bullet point",
        "impact_score": 0-100,
        "changes_made": ["Brief explanation of what was improved"]
      }
    `;

    // Use the Groq Key from Environment Variables
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      console.error("GROQ_API_KEY is not set in Supabase secrets.");
      throw new Error("Server configuration error: Missing API Key");
    }
    
    const fallbackModels = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
    let resultJson = null;
    let lastError = "";

    for (const model of fallbackModels) {
      try {
        console.log(`True Resilience: Attempting Bullet Optimization with Groq (${model})...`);
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "You are an expert resume writer. Return ONLY raw JSON." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0,
          }),
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json();
          const resultText = data.choices?.[0]?.message?.content;
          if (resultText) {
            const firstBrace = resultText.indexOf('{');
            const lastBrace = resultText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
              resultJson = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));
              break;
            }
          }
        }

        const errJson = await groqResponse.json().catch(() => ({}));
        lastError = errJson.error?.message || groqResponse.statusText;
        console.warn(`Lumina Bullet: ${model} failed:`, lastError);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`Model ${model} crash:`, lastError);
      }
    }

    if (!resultJson) throw new Error(`All analysis engines exhausted: ${lastError}`);

    return new Response(JSON.stringify(resultJson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-bullet error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
