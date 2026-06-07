/**
 * LUMINA DECODING ENGINE v2.5
 * Native Deno Strategy (Linter-Safe Version)
 */

// We use globalThis to avoid "red squiggles" in web-based editors
const NativeDeno = (globalThis as unknown as { Deno: { serve: (h: (r: Request) => Response | Promise<Response>) => void; env: { get: (k: string) => string | undefined } } }).Deno;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JD_SCHEMA = {
  valid: true,
  title: "",
  overview: { role: "", company: "", location: "", work_mode: "", employment_type: "", package: "", experience_required: "", industry: "", seniority: "" },
  skills: [{ category: "", skill: "", importance: 0 }],
  requirements: { education: [], experience: "", soft_skills: [], agreements: [] },
  winning_strategy: [{ title: "", description: "" }],
  grade: { 
    score: 0, letter: "S", summary: "", 
    breakdown: { clarity: 0, realistic: 0, compensation: 0, red_flags: 0, benefits: 0, growth: 0, inclusivity: 0, readability: 0 }, 
    plain_english_summary: [] 
  },
  red_flags: [{ phrase: "", intensity: 0, note: "" }],
  recruiter_lens: [{ jargon: "", reality: "" }],
  qualifiers: { must_have_percent: 0, nice_to_have_percent: 0, seniority_level: 0, experience: { professional: 0, project_proof: 0 }, education: { degree_required: false, skills_first_percent: 0 } },
  logistics: { 
    salary_range: { min: 0, max: 0, currency: "", estimate: true, note: "" }, 
    work_arrangement: { remote_friendly: "", office_presence: "", flexible_hours: false }, 
    responsibility_mix: [{ label: "", percent: 0 }], 
    archetype: { label: "", description: "", primary_focus: "", primary_tool: "", match_score: 0 },
    hard_soft_ratio: { hard: 0, soft: 0 }
  },
  role_reality: { iceberg_above: [], iceberg_below: [], dimensions: { technical_depth: 0, research_autonomy: 0, client_interaction: 0, strategic_impact: 0, legacy_maintenance: 0 } },
  deep_dive: { 
    day_in_life: [{ time: "09:00", task: "", description: "" }], 
    health_radar: { market_position: 0, tech_innovation: 0, transparency: 0, client_quality: 0, employee_benefits: 0 }, 
    bias_analysis: { inclusivity_score: 0, gender_meter: "neutral", age_bias_graph: 0, tonal_map: [{ category: "", tone: "" }] }, 
    culture_radar: { innovation: 0, work_life_balance: 0, collaboration: 0, hierarchy: 0, results_driven: 0, stability: 0 } 
  },
  bonus_pulse: { ghost_job_probability: 0, desperation_meter: 0, competition_estimate: 0, skill_rarity: 0, interview_difficulty: 0, career_growth: { trajectory: [], potential_score: 0 }, tech_stack_popularity: [{ name: "", demand: "Standard" }] },
  interview_kit: { questions: [{ question: "", type: "technical", tip: "", target_answer: "" }], reverse_questions: [] },
  resume_help: { keywords: [], bullets: [] }
};

NativeDeno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS", } });
  }

  try {
    const body = await req.json().catch(() => { throw new Error("Failed to parse request body."); });
    const { jdText } = body;
    if (!jdText) throw new Error("Job description input is missing.");

    const groqKey = NativeDeno.env.get("GROQ_API_KEY")?.trim();
    const openAiKey = NativeDeno.env.get("OPENAI_API_KEY")?.trim();

    if (!groqKey && !openAiKey) {
        console.error("API keys are missing from Supabase secrets.");
        throw new Error("Lumina Auth Error: Missing GROQ_API_KEY or OPENAI_API_KEY in Supabase secrets. Please run 'supabase secrets set GROQ_API_KEY=your_key'.");
    }

    const safeJD = jdText.substring(0, 15000); 
    const fallbackConfigs: Array<{ url: string; key: string; model: string }> = [];
    if (groqKey) {
      fallbackConfigs.push(
        { url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "llama-3.1-8b-instant" },
        { url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "llama-3.3-70b-versatile" }
      );
    }
    if (openAiKey) {
      fallbackConfigs.push(
        { url: "https://api.openai.com/v1/chat/completions", key: openAiKey, model: "gpt-4o-mini" },
        { url: "https://api.openai.com/v1/chat/completions", key: openAiKey, model: "gpt-4o" }
      );
    }

    let resultText = "";
    let lastError = "";

    // ── NAKED SCHEMA (No Defaults) ──
    const nakedSchema = {
      valid: "boolean", title: "string",
      overview: { role: "string (exact job title from JD)", company: "string (company/organization name, 'Not specified' if absent)", location: "string (city, state/country; 'Not specified' if absent)", work_mode: "Remote|Hybrid|On-site|Not specified", employment_type: "Full-time|Part-time|Contract|Internship|Not specified", package: "string (salary/CTC range exactly as stated, e.g. '₹12-18 LPA' or 'Not disclosed')", experience_required: "string (years of experience exactly as stated, or 'Not specified')", industry: "string", seniority: "Entry|Mid|Senior|Lead|Principal" },
      skills: [{ category: "string", skill: "string", importance: "number (0-100)" }],
      requirements: { education: ["string"], experience: "string", soft_skills: ["string"], agreements: ["string"] },
      grade: { 
        score: "number (0-100)", letter: "string (S,A,B,C,D,F)", summary: "string", 
        breakdown: { clarity: "0-20", realistic: "0-15", compensation: "0-15", red_flags: "0-15", benefits: "0-10", growth: "0-10", inclusivity: "0-10", readability: "0-10" }, 
        plain_english_summary: ["string"] 
      },
      red_flags: [{ phrase: "string", intensity: "number (0-100)", note: "string" }],
      recruiter_lens: [{ jargon: "string", reality: "string" }],
      logistics: { 
        salary_range: { min: "number", max: "number", currency: "string", estimate: "boolean", note: "string" }, 
        work_arrangement: { remote_friendly: "yes/no/partial", office_presence: "string", flexible_hours: "boolean" },
        archetype: { label: "string", description: "string", primary_focus: "string", primary_tool: "string", match_score: "0-100" }
      },
      bonus_pulse: { ghost_job_probability: "0-100", desperation_meter: "0-100", skill_rarity: "0-100", interview_difficulty: "0-100" },
      role_reality: { iceberg_above: ["string"], iceberg_below: ["string"] },
      deep_dive: { 
        day_in_life: [{ time: "string", task: "string" }],
        bias_analysis: { inclusivity_score: "0-100", gender_meter: "masculine/feminine/neutral", age_bias_graph: "0-100", tonal_map: [{ category: "string", tone: "string" }] },
        culture_radar: { innovation: "0-100", work_life_balance: "0-100", collaboration: "0-100", hierarchy: "0-100", results_driven: "0-100", stability: "0-100" },
        health_radar: { market_position: "0-100", tech_innovation: "0-100", transparency: "0-100", client_quality: "0-100", employee_benefits: "0-100" }
      },
      interview_kit: { 
        questions: [{ question: "string", type: "technical/behavioral", tip: "string", target_answer: "string" }],
        reverse_questions: ["string"]
      },
      resume_help: { keywords: ["string"], bullets: ["string"] }
    };

    for (const config of fallbackConfigs) {
        try {
            console.log(`Lumina Engine: Activating Forensic Scan with ${config.model}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s per-model strict timeout

            const llmResponse = await fetch(config.url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.key}` },
                signal: controller.signal,
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: "system", content: `You are the Lumina Forensic Intelligence Architect.
Your goal is to deconstruct JDs into hyper-accurate data structures grounded ONLY in the JD text.

MANDATORY RULES:
1. ACCURACY OVERRIDES ALL: Every field MUST be derived from the JD text. NEVER invent companies, locations, salaries, or experience years. If a field is not present, write "Not specified" (for overview fields) or the closest faithful summary. Do NOT hallucinate.
2. OVERVIEW CARD: Populate "overview" with the EXACT role title, company name, location, work mode (Remote/Hybrid/On-site), employment type, compensation/package string (verbatim units & range from JD, e.g. "₹12-18 LPA", "$120k-$150k", "Not disclosed"), and experience_required (verbatim, e.g. "3-5 years" or "Not specified"). Detect Indian roles → INR; US → USD; EU → EUR based on textual cues.
3. ESTIMATION FOR SCORES ONLY: For numeric scores (grade.*, bonus_pulse.*, radars) provide market-grounded estimates; never 0/null. But salary/experience/company/location/title MUST stay faithful to the JD.
4. VERDICT: "grade.summary" MUST be unique, insightful, and free of speculative years. "grade.plain_english_summary" MUST have EXACTLY 5 points.
5. RED FLAGS: EXACTLY 2 entries in "red_flags" grounded in JD phrasing.
6. INTERVIEW KIT: EXACTLY 10 diverse "questions" + EXACTLY 5 "reverse_questions".
7. KEYWORDS: "resume_help.keywords" MUST contain EXACTLY 10-12 high-impact ATS keywords pulled VERBATIM from the JD.
8. SKILLS: Extract every tool, framework, language, methodology mentioned in the JD with correct category and importance weighted by frequency and emphasis (must-have phrasing = 85-100, nice-to-have = 40-60).
9. ICEBERG: "role_reality" must contain non-obvious truths specific to this JD's domain.

RETURN ONLY RAW JSON.` },
                        { role: "user", content: `ACT ON THIS JD:
###
${safeJD}
###

OUTPUT JSON FORMAT:
${JSON.stringify(nakedSchema)}` }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.2,
                    max_tokens: 5000,
                }),
            });
            clearTimeout(timeoutId);

            if (!llmResponse.ok) {
                const status = llmResponse.status;
                if (status === 429 || status === 400 || status === 404 || status >= 500) {
                    lastError = `Model ${config.model} unavailable (${status})`;
                    continue; 
                }
                const errorBody = await llmResponse.text();
                throw new Error(`AI Provider Error (${status}): ${errorBody.substring(0, 100)}`);
            }

            const data = await llmResponse.json();
            resultText = data.choices?.[0]?.message?.content;
            if (resultText && resultText.trim().startsWith('{')) break;
        } catch (err: unknown) {
            lastError = err instanceof Error ? err.message : String(err);
            console.error(`Lumina Engine Error with ${config.model}:`, lastError);
            if (lastError.includes("aborted") || lastError.includes("Abort") || lastError.includes("429") || lastError.includes("400") || lastError.includes("404") || lastError.includes("timeout")) {
                continue; 
            }
            throw err;
        }
    }

    if (!resultText) throw new Error(`Engines exhausted: ${lastError}`);

    let parsed;
    try {
      const firstBrace = resultText.indexOf('{');
      const lastBrace = resultText.lastIndexOf('}');
      parsed = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));
    } catch (e) {
      throw new Error("Intelligence Engine returned malformed content.");
    }
    
    // Merge with original schema to ensure all fields exist for frontend
    const finalResult: Record<string, unknown> = { ...JD_SCHEMA, ...parsed };

    // ── Overview heuristic fallback ──
    // Ensure the Role Overview card always has data even if the model omitted "overview".
    const extractOverview = (jd: string, title: string) => {
      const out = { role: title || "Not specified", company: "Not specified", location: "Not specified", work_mode: "Not specified", employment_type: "Not specified", package: "Not disclosed", experience_required: "Not specified", industry: "", seniority: "" };
      const text = jd.replace(/\s+/g, " ");
      // Work mode
      if (/\bhybrid\b/i.test(text)) out.work_mode = "Hybrid";
      else if (/\bremote\b|work\s*from\s*home|wfh\b/i.test(text)) out.work_mode = "Remote";
      else if (/on[-\s]?site|in[-\s]?office|onsite/i.test(text)) out.work_mode = "On-site";
      // Employment type
      if (/full[-\s]?time/i.test(text)) out.employment_type = "Full-time";
      else if (/part[-\s]?time/i.test(text)) out.employment_type = "Part-time";
      else if (/\bcontract\b|contractor/i.test(text)) out.employment_type = "Contract";
      else if (/intern(ship)?/i.test(text)) out.employment_type = "Internship";
      // Experience
      const expM = text.match(/(\d{1,2}\s*(?:-|to|–)\s*\d{1,2}\+?\s*(?:years|yrs|yoe))|(\d{1,2}\+?\s*(?:years|yrs|yoe))/i);
      if (expM) out.experience_required = expM[0].trim();
      // Package
      const pkgM = text.match(/(?:₹|rs\.?|inr|usd|\$|€|eur|gbp|£)\s*\d[\d,.\s\-–to]*\s*(?:lpa|lakh|lakhs|cr|crore|k|m|mn|million|per\s*annum|p\.?a\.?)?/i)
        || text.match(/\d{1,3}\s*(?:-|to|–)\s*\d{1,3}\s*(?:lpa|lakh|lakhs|k\s*usd|usd|inr)/i);
      if (pkgM) out.package = pkgM[0].trim();
      // Company "at <Company>" or "join <Company>"
      const compM = text.match(/\b(?:at|join|with|@)\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?:\s+in\s+|\s+is\s+|,|\.|\s+as\s+)/);
      if (compM) out.company = compM[1].trim();
      // Location "in <City>"
      const locM = text.match(/\bin\s+([A-Z][A-Za-z .-]{2,30}?)(?:,|\.|\s+(?:hybrid|remote|on[-\s]?site|office))/i);
      if (locM) out.location = locM[1].trim();
      return out;
    };

    const ov = (finalResult.overview ?? {}) as Record<string, string>;
    const needsOverview = !finalResult.overview || !ov.role || ov.role === "Not specified";
    const isPlaceholder = (v?: string) => !v || v === "Not specified" || v === "Not disclosed" || v === "";
    if (needsOverview) {
      finalResult.overview = extractOverview(jdText, String((finalResult as { title?: string }).title || ""));
    } else {
      const heur = extractOverview(jdText, String((finalResult as { title?: string }).title || ""));
      finalResult.overview = {
        role: isPlaceholder(ov.role) ? heur.role : ov.role,
        company: isPlaceholder(ov.company) ? heur.company : ov.company,
        location: isPlaceholder(ov.location) ? heur.location : ov.location,
        work_mode: isPlaceholder(ov.work_mode) ? heur.work_mode : ov.work_mode,
        employment_type: isPlaceholder(ov.employment_type) ? heur.employment_type : ov.employment_type,
        package: isPlaceholder(ov.package) ? heur.package : ov.package,
        experience_required: isPlaceholder(ov.experience_required) ? heur.experience_required : ov.experience_required,
        industry: ov.industry || "",
        seniority: ov.seniority || "",
      };
    }

    
    return new Response(JSON.stringify(finalResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "System Exception";
    return new Response(JSON.stringify({ error: `Lumina Engine Fault: ${errorMsg}`, details: errorMsg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
