import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to remove generic fluff words as mandated
function removeFluff(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b[Dd]elve\b/g, "focus")
    .replace(/\b[Ll]everage\b/g, "utilize")
    .replace(/\b[Rr]obust\b/g, "scalable")
    .replace(/\b[Cc]ollaborated\b/g, "architected")
    .replace(/\b[Uu]tilised\b/g, "implemented")
    .replace(/\b[Uu]tilized\b/g, "deployed");
}

// Helper to ensure bullet points are strictly between 100 and 260 characters
function adjustBullet(bullet: string): string {
  let b = bullet.trim();
  // Remove any leading bullet characters
  b = b.replace(/^[•\-*\s]+/, "");
  
  if (b.length < 100) {
    const paddings = [
      " utilizing advanced methodologies and best engineering practices.",
      " to optimize scalability, resilience, and general system performance.",
      " to deliver high-quality code and support business expansion goals.",
      " to ensure robust data integrity, security, and systems stability.",
      " to enhance team velocity and overall project execution efficiency."
    ];
    let padded = b;
    for (const pad of paddings) {
      if (!b.toLowerCase().includes(pad.split(" ")[1])) {
        padded = b.endsWith(".") ? b.slice(0, -1) + pad : b + pad;
        break;
      }
    }
    if (padded.length < 100) {
      padded = padded.endsWith(".") ? padded.slice(0, -1) + " for technical excellence." : padded + " for technical excellence.";
    }
    b = padded;
  }
  
  if (b.length > 260) {
    b = b.slice(0, 257);
    const lastSpace = b.lastIndexOf(" ");
    if (lastSpace > 50) {
      b = b.slice(0, lastSpace);
    }
    b = b.trim();
    if (!b.endsWith(".")) b += "...";
  }
  
  return b;
}

// Helper to count sentences in a text by period separation
function countSentences(text: string): number {
  if (!text) return 0;
  const parts = text.split('.').map(s => s.trim()).filter(Boolean);
  return parts.length;
}

// Helper to ensure array format
function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map(v => removeFluff(String(v || "")));
  }
  if (typeof val === "string" && val.trim()) {
    return [removeFluff(val.trim())];
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const resumeText = body.resumeText || body.masterVault || body.vaultData;
    const skills = body.skills || body.jd || body.jobDescription || body.jobTitle;
    const user_sentence_count = body.user_sentence_count || body.user_setting || body.userSetting || 3;

    if (!resumeText) throw new Error("Master Vault Data is required");

    const vaultString = typeof resumeText === "string" ? resumeText : JSON.stringify(resumeText, null, 2);
    const jdString = typeof skills === "string" ? skills : JSON.stringify(skills, null, 2);
    const user_setting = Number(user_sentence_count) || 3;

    // The "30% Context" Gate definition
    const contextBalance = "Ensure 70% of content is verbatim from Master Vault; only 30% can be derived/inferred from JD.";

    const prompt = `
Role: You are an elite ATS Resume Architect. Your goal is to map the user's Master Vault Data to the JD requirements using a 'Subtle-Alignment' approach without altering the core facts, timelines, or technical truth of their experience.

1. Strict Mapping Constraints:
- Summary: Generate EXACTLY ${user_setting * 22} words. This word count ensures it renders as exactly ${user_setting} visual lines. DO NOT output fewer or more words.
- Content Verification: Keep 80% of the original content verbatim. Use the remaining 20% to strategically insert JD-relevant keywords (Healthcare, RAG, Agents, On-premise deployment) where they naturally fit.
- Prohibition: Do not replace user project names with generic descriptors. Do not change existing metrics (e.g., 98.7% accuracy).
- Character Constraints: Every bullet point in the experience section must be between 100 and 260 characters (including spaces). Adjust wording and detail to hit this target range. Do not output single-line bullets (less than 100 characters).

2. Skills Categorization:
Group skills into exactly three columns (categories):
- "core_technical": Core AI/Healthcare (Must-haves from JD)
- "infrastructure": Applied AI Infrastructure (Cloud/Backend/On-premise)
- "operational": Operational Excellence (Communication/Agility)
Discard any skill from the Master Vault that does not appear in the JD or directly support the applied AI domain.

3. Certifications Sequence:
Sequence: Sort by JD alignment.
Priority 1: AI/LLM/RAG certifications.
Place these before other certifications.

INPUT DATA:
Master Vault Data:
${vaultString}

Job Description (JD):
${jdString}

OUTPUT SCHEMA (STRICT JSON ONLY):
Return ONLY a valid JSON object matching this schema. No markdown formatting, no explanation.
{
  "summary": "string (exactly ${user_setting * 22} words)",
  "experience": [
    { "role": "string", "bullets": ["string (100-260 chars)", "..."] }
  ],
  "skills": {
    "core_technical": ["string", "..."],
    "infrastructure": ["string", "..."],
    "operational": ["string", "..."]
  },
  "certifications": ["string", "..."]
}
`;

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      throw new Error("Missing GROQ_API_KEY");
    }

    const fallbackModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b", "meta-llama/llama-4-scout-17b-16e-instruct"];
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let lastError = "";
    let resultData = null;
    let chosenModel = "";

    for (const model of fallbackModels) {
      try {
        console.log(`Lumina Architect: Attempting with ${model}...`);
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
          chosenModel = model;
          break;
        }

        const errJson = await groqResponse.json();
        lastError = errJson.error?.message || groqResponse.statusText;
        console.warn(`Lumina Architect: ${model} failed:`, lastError);

        if (groqResponse.status === 429) {
          await sleep(1000);
        }
      } catch (err) {
        lastError = String(err);
      }
    }

    if (!resultData) throw new Error(`All engines exhausted: ${lastError}`);

    const resultText = resultData.choices?.[0]?.message?.content;
    if (!resultText) throw new Error("AI returned empty content");

    // We rely on the LLM to provide approximately the correct word count. No strict sentence-split correction needed.;

    const firstBrace = resultText.indexOf('{');
    const lastBrace = resultText.lastIndexOf('}');
    const resultJson = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));

    // Programmatic Sanitization (Ensures 100% compliance with strict specifications)
    // 1. Ensure summary has exactly user_setting sentences
    const summaryText = resultJson.summary || "";
    // 1. We removed sentence truncation to allow the LLM to generate exactly the length needed for visual lines.

    resultJson.summary = removeFluff(resultJson.summary);

    // 2. Remove fluff & check character limits for experience
    if (Array.isArray(resultJson.experience)) {
      resultJson.experience = resultJson.experience.map((exp: Record<string, unknown>) => {
        if (exp && typeof exp === "object") {
          const role = removeFluff(exp.role || exp.title || "");
          let bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
          bullets = bullets.map((b: string) => {
            let clean = removeFluff(String(b || ""));
            clean = adjustBullet(clean);
            return clean;
          }).filter(Boolean);
          return { role, bullets };
        }
        return exp;
      });
    }

    // 3. Skills Categorization
    if (!resultJson.skills || typeof resultJson.skills !== "object") {
      resultJson.skills = { core_technical: [], infrastructure: [], operational: [] };
    } else {
      const skillsArray = (val: unknown) => ensureArray(val);
      resultJson.skills = {
        core_technical: skillsArray(resultJson.skills.core_technical),
        infrastructure: skillsArray(resultJson.skills.infrastructure),
        operational: skillsArray(resultJson.skills.operational)
      };
    }

    // 4. Certifications
    resultJson.certifications = ensureArray(resultJson.certifications);

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
