import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, skills, jobTitle } = await req.json();
    if (!resumeText) throw new Error("Resume text is required");

    const skillList = (skills as { skill: string }[] || []).map(s => s.skill).join(", ");
    const prompt = `
      You are an elite technical recruiter and world-class resume writer. Tailor this resume for the position of "${jobTitle || 'selected role'}".
      
      ### RECRUITER LENS & GAP-ALIGNMENT STRATEGY (CRITICAL):
      1. Actively analyze the target Job Description (JD) keywords "${skillList}" against the Original Resume. Identify structural gaps (missing keywords, scale limitations, or context variations).
      2. Proactively bridge these alignment gaps by extracting and framing the candidate's existing achievements, projects, or professional experiences to explicitly showcase the skills, stack, and methodologies demanded by the JD.
      3. If a particular technology or skill is not directly detailed with descriptions in the profile, but the item contains that technology/skill in its title or tags, highlight its utilization, execution, and integration details within the generated bullet points, bridging the gap completely using professional, concrete context.
      4. Keep 100% truth and fidelity to facts—never fabricate fake numerical metrics (like "increased sales by 85%" out of thin air). Instead, bridge gaps qualitatively by focusing on the scope of their responsibility, the exact tech stack integration, developer tooling, and the technical outcomes.
      5. STRICT RETENTION OF METADATA: You must strictly use the exact links (GitHub, live links), exact date formats, and organization details from the Candidate facts as provided. Never omit, simplify, or modify links or dates.

      Original Resume to Tailor:
      ${resumeText}

      CRITICAL: Keep all text responses EXTREMELY concise to ensure fast processing. Each bullet point generated must be a single high-impact sentence.

      STRICT BULLET POINT LINE LENGTH MANDATE: Every generated bullet point in the "experience" section MUST strictly fall into one of the following visual line character length ranges (including spaces) to beautifully and fully fill visual lines on a standard A4 PDF template without creating awkward visual orphans or underfilled trailing lines:
      - For 1 full line: EXACTLY 110 to 125 characters.
      - For 2 full lines: EXACTLY 220 to 250 characters.
      - For 3 full lines: EXACTLY 330 to 375 characters.
      DO NOT generate any bullet point that falls outside these ranges (e.g., do not return bullets less than 110 characters, or between 126 and 219 characters, or between 251 and 329 characters). Adjust wording, precision, and technical detail dynamically to hit these exact target ranges perfectly. Maintain absolute factual alignment to facts without hallucinating fake metrics.

      RETURN JSON FORMAT ONLY:
      {
        "professional_summary": "Optimized summary...",
        "experience": [
          {
            "company": "...",
            "role": "...",
            "bullets": ["Action bullet with quantified impact..."]
          }
        ],
        "skills_section": ["Categorized skills..."]
      }
    `;

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      throw new Error("Missing GROQ_API_KEY");
    }
    
    const fallbackModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "llama3-8b-8192"];
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let lastError = "";
    let resultData = null;

    for (const model of fallbackModels) {
      try {
        console.log(`Lumina Tailor: Attempting with ${model}...`);
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "You are an expert resume writer. Return ONLY raw JSON. No markdown." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0,
          }),
        });

        if (groqResponse.ok) {
          resultData = await groqResponse.json();
          break;
        }

        const errJson = await groqResponse.json();
        lastError = errJson.error?.message || groqResponse.statusText;
        console.warn(`Lumina Tailor: ${model} failed:`, lastError);

        if (groqResponse.status === 429) {
          console.log("Lumina Tailor: Rate limit hit. Waiting 1000ms...");
          await sleep(1000);
        }
      } catch (err) {
        lastError = String(err);
      }
    }

    if (!resultData) throw new Error(`All engines exhausted: ${lastError}`);

    const resultText = resultData.choices?.[0]?.message?.content;
    if (!resultText) throw new Error("AI returned empty content");

    const firstBrace = resultText.indexOf('{');
    const lastBrace = resultText.lastIndexOf('}');
    const resultJson = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));

    return new Response(JSON.stringify(resultJson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("tailor-resume error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
