import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jdSkills, resumeText, jobTitle, jdText } = await req.json();
    if (!jdSkills || !resumeText) throw new Error("JD skills and resume text are required");

    const skillNames = (jdSkills as { skill: string }[]).map((s) => s.skill).join(", ");
    const prompt = `
      You are an expert Career Gap Analyst. Compare the Candidate's Resume against the Target Job Description (JD) and identify exactly what is missing.

      Target Job Title: ${jobTitle || "Not specified"}
      Target Job Skills (Core): ${skillNames}
      ${jdText ? `Target Job Description Raw Text:\n${jdText}\n` : ""}

      Candidate Resume:
      ${resumeText}

      CRITICAL RULES:
      - Be extremely honest and constructive. Do not sugarcoat gaps.
      - For every gap, provide a highly specific, actionable mitigation strategy.
      - Prioritize actions by impact/effort ratio.
      - Suggest realistic alternatives (e.g. if missing a specific tool, suggest emphasizing experience with equivalent tools).
      - Ensure all output strings are clean and contain no markdown.

      You MUST return exactly this combined JSON structure containing both legacy and detailed fields:
      {
        "overall_match": 0-100,
        "summary": "2-3 sentence executive summary of the match, strengths, and primary gaps.",
        "skill_matches": [
          { "skill": "Skill Name", "match_percent": 0-100, "verdict": "strong" | "partial" | "missing" }
        ],
        "deductions": [
          { "reason": "Short summary of gap", "percent": 0-100, "fix_snippet": "Action to fix" }
        ],
        "actionable_directives": [
          { "action": "Action Verb", "description": "Details of the action" }
        ],
        "detailed_gaps": {
          "overall_match_score": 0-100,
          "summary": "Same executive summary as above.",
          "technical_gaps": [
            {
              "requirement": "Exact technical requirement (e.g., dbt or Snowflake)",
              "status": "has_it" | "missing" | "partial",
              "impact": "dealbreaker" | "important" | "minor",
              "description": "Why this is a gap or how it is met.",
              "mitigation_strategy": "Specific steps to compensate (e.g., certification, portfolio project)"
            }
          ],
          "experience_gaps": [
            {
              "requirement": "Experience requirement (e.g., leadership, specific industry, years of tenure)",
              "status": "has_it" | "missing" | "partial",
              "impact": "dealbreaker" | "important" | "minor",
              "description": "Description of experience gap.",
              "mitigation_strategy": "Specific steps to compensate"
            }
          ],
          "education_gaps": [
            {
              "requirement": "Degree or certification requirement (e.g., B.Tech in CS, Snowflake certification)",
              "user_status": "has_it" | "missing" | "partial",
              "impact": "dealbreaker" | "important" | "minor",
              "alternative_path": "Alternative certifications or online course details"
            }
          ],
          "keyword_gaps": {
            "missing_keywords": ["important keywords from JD not in resume"],
            "underrepresented_keywords": ["keywords in resume but only once or twice, needs prominence"],
            "keyword_density_suggestions": ["specific natural recommendations for adding keywords in resume sections"]
          },
          "culture_fit_analysis": {
            "alignment_score": 0-100,
            "matched_signals": ["culture signals user demonstrates"],
            "missing_signals": ["culture signals user should emphasize"],
            "red_flags": ["potential culture mismatches or warnings"]
          },
          "achievement_gaps": {
            "has_quantified_achievements": true | false,
            "achievement_quality_score": 0-100,
            "missing_impact_areas": ["impact areas that lack metrics"],
            "suggested_achievements": ["suggested bullets with placeholders for user to quantify"]
          },
          "priority_action_plan": [
            {
              "priority": 1,
              "action": "Core action to take",
              "impact": "high" | "medium" | "low",
              "effort": "hours" | "days" | "weeks",
              "how_to_do_it": "Detailed step-by-step description of how to complete this action"
            }
          ],
          "competitive_positioning": {
            "user_strengths": ["primary candidate advantages"],
            "user_weaknesses": ["primary candidate disadvantages"],
            "differentiation_opportunities": ["how candidate can stand out from others"]
          }
        }
      }
    `;

    // Use the Groq Key from Environment Variables
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      console.error("GROQ_API_KEY is not set in Supabase secrets.");
      throw new Error("Server configuration error: Missing API Key");
    }
    
    const fallbackModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ];

    let resultJson = null;
    let lastError = "";

    for (const model of fallbackModels) {
      try {
        console.log(`True Resilience: Attempting Compare Scan with ${model}...`);
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "You are an expert resume analyst specializing in high-fidelity gap analysis. Return ONLY raw JSON." },
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
            resultJson = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));
            break;
          }
        }

        const errText = await groqResponse.text();
        lastError = `Model ${model} failed: ${errText.substring(0, 100)}`;
        if (groqResponse.status === 429) {
            console.warn(`Rate limit hit for ${model}. Waiting 500ms...`);
            await new Promise(r => setTimeout(r, 500));
        }
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
    console.error("compare-resume error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
