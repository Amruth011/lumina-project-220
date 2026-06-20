/**
 * LUMINA DECODING ENGINE v3.0
 * Native Deno Strategy with Structured JD Parser
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  resume_help: { keywords: [], bullets: [] },
  structured_data: {
    role_title: "",
    company_name: "",
    department: "",
    employment_type: "",
    location: "",
    salary_range: "",
    hard_requirements: [],
    soft_requirements: [],
    responsibilities: [],
    culture_signals: [],
    company_context: { stage: "", size: "", industry: "", work_style: "", communication_style: "" },
    keywords_for_ats: [],
    red_flags: { vague_requirements: [], unrealistic_expectations: [] }
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS", } });
  }

  try {
    const body = await req.json().catch(() => { throw new Error("Failed to parse request body."); });
    const { jdText } = body;
    if (!jdText) throw new Error("Job description input is missing.");

    const groqKey = Deno.env.get("GROQ_API_KEY")?.trim();
    const openAiKey = Deno.env.get("OPENAI_API_KEY")?.trim();

    if (!groqKey && !openAiKey) {
        console.error("API keys are missing from Supabase secrets.");
        throw new Error("Lumina Auth Error: Missing GROQ_API_KEY or OPENAI_API_KEY in Supabase secrets. Please run 'supabase secrets set GROQ_API_KEY=your_key'.");
    }

    const safeJD = jdText.substring(0, 12000); 
    const fallbackConfigs: Array<{ url: string; key: string; model: string }> = [];
    
    if (groqKey) {
      fallbackConfigs.push(
        { url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "llama-3.3-70b-versatile" },
        { url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "llama-3.1-8b-instant" },
        { url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "qwen/qwen3-32b" }
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
      valid: "boolean (true if this is a job description, false if it's a resume or other non-JD text)",
      title: "string (exact job title from JD)",
      overview: { 
        role: "string (exact job title from JD)", 
        company: "string (company/organization name, 'Not specified' if absent)", 
        location: "string (city, state/country; 'Not specified' if absent)", 
        work_mode: "Remote|Hybrid|On-site|Not specified", 
        employment_type: "Full-time|Part-time|Contract|Internship|Not specified", 
        package: "string (salary/CTC range exactly as stated, e.g. '₹12-18 LPA' or 'Not disclosed')", 
        experience_required: "string (years of experience exactly as stated, or 'Not specified')", 
        industry: "string", 
        seniority: "Entry|Mid|Senior|Lead|Principal" 
      },
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
        day_in_life: [{ time: "string", task: "string", description: "string" }],
        bias_analysis: { inclusivity_score: "0-100", gender_meter: "masculine/feminine/neutral", age_bias_graph: "0-100", tonal_map: [{ category: "string", tone: "string" }] },
        culture_radar: { innovation: "0-100", work_life_balance: "0-100", collaboration: "0-100", hierarchy: "0-100", results_driven: "0-100", stability: "0-100" },
        health_radar: { market_position: "0-100", tech_innovation: "0-100", transparency: "0-100", client_quality: "0-100", employee_benefits: "0-100" }
      },
      interview_kit: { 
        questions: [{ question: "string", type: "technical/behavioral/situational", tip: "string", target_answer: "string" }],
        reverse_questions: ["string"]
      },
      resume_help: { keywords: ["string"], bullets: ["string"] },
      structured_data: {
        role_title: "string (job/role title)",
        company_name: "string (name of the hiring company)",
        department: "string (department/group or 'Not specified')",
        employment_type: "Full-time|Part-time|Contract|Internship|Not specified",
        location: "string (city/state/country or Remote)",
        salary_range: "string (salary range as stated in JD, or 'Not disclosed')",
        hard_requirements: [{ category: "string (e.g. Engineering, Education)", priority: "must-have|nice-to-have", minimum_years: "number (years required)", specific_technologies: ["string"] }],
        soft_requirements: [{ traits: ["string"], context: "string (how/where is this trait needed)", evidence_type: "string (how candidate can prove it)" }],
        responsibilities: [{ scope: "string (details of task)", impact_area: "string (what it affects)" }],
        culture_signals: [{ evidence: "string (text fragment signaling culture)", tone: "string (collaborative/intense/etc.)" }],
        company_context: { stage: "string (e.g. Startup/Enterprise/Series A)", size: "string (e.g. 50-100 or 'Not specified')", industry: "string", work_style: "string (e.g. Async/Collaborative)", communication_style: "string" },
        keywords_for_ats: [{ spelled_out: "string (full keyword name)", acronym: "string (optional acronym, e.g. AWS)" }],
        red_flags: { vague_requirements: ["string"], unrealistic_expectations: ["string"] }
      }
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
1. ACCURACY OVERRIDES ALL: Every field MUST be derived from the JD text. NEVER invent companies, locations, salaries, or experience years. If a field is not present, write "Not specified" or the closest faithful summary. Do NOT hallucinate.
2. NO JOB-ID SALARY HALLUCINATIONS: Do NOT confuse alphanumeric Job IDs (like "Job ID: R0434408") as salary amounts. If no salary/package is explicitly disclosed in the text, you MUST return package: "Not disclosed" and set logistics.salary_range min and max to 0.
3. NO AGE SCREENING EXPERIENCE CONFUSION: Do NOT confuse health screening or age requirements (e.g. "health screening for 35 yrs. and above") with required years of experience. If no experience tenure is specified, return "Not specified".
4. OVERVIEW CARD: Populate "overview" and "structured_data" with the EXACT role title, company name, location, work mode (Remote/Hybrid/On-site), employment type, and salary range.
5. ESTIMATION FOR SCORES ONLY: For numeric scores (grade.*, bonus_pulse.*, radars) provide market-grounded estimates; never 0/null. But salary/experience/company/location/title MUST stay faithful to the JD.
6. VERDICT: "grade.summary" MUST be unique, insightful, and free of speculative years. "grade.plain_english_summary" MUST have EXACTLY 5 points.
7. RED FLAGS: EXACTLY 2 entries in "red_flags" grounded in JD phrasing, and populate "structured_data.red_flags" with vague requirements and unrealistic expectations.
8. INTERVIEW KIT: EXACTLY 10 diverse "questions" + EXACTLY 5 "reverse_questions".
9. KEYWORDS: "resume_help.keywords" MUST contain EXACTLY 10-12 high-impact ATS keywords pulled VERBATIM from the JD.
10. SKILLS: Extract every tool, framework, language, methodology mentioned in the JD with correct category and importance weighted by frequency and emphasis.
11. ICEBERG: "role_reality" must contain non-obvious truths specific to this JD's domain.
12. DAY IN LIFE TIMELINES: Return EXACTLY 5 sequential entries in 'day_in_life'. Do NOT use clock times (e.g. '09:00 AM'). Instead, use task order sequential labels: '1st Task', '2nd Task', '3rd Task', '4th Task', '5th Task' in the 'time' field.
13. RESUME BULLETS: "resume_help.bullets" MUST contain EXACTLY 5 unique high-impact resume bullet points tailored to the JD's requirements and target role, starting with strong action verbs.

RETURN ONLY RAW JSON.` },
                        { role: "user", content: `ACT ON THIS JD:
###
${safeJD}
###

OUTPUT JSON FORMAT:
${JSON.stringify(nakedSchema)}` }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.3,
                    max_tokens: 2500,
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
    const extractOverview = (jd: string, title: string) => {
      const out = { role: title || "Not specified", company: "Not specified", location: "Not specified", work_mode: "Not specified", employment_type: "Not specified", package: "Not disclosed", experience_required: "Not specified", experience_is_estimated: false, industry: "", seniority: "" };
      const text = jd.replace(/\s+/g, " ");
      if (/\bhybrid\b/i.test(text)) out.work_mode = "Hybrid";
      else if (/\bremote\b|work\s*from\s*home|wfh\b/i.test(text)) out.work_mode = "Remote";
      else if (/on[-\s]?site|in[-\s]?office|onsite/i.test(text)) out.work_mode = "On-site";
      if (/full[-\s]?time/i.test(text)) out.employment_type = "Full-time";
      else if (/part[-\s]?time/i.test(text)) out.employment_type = "Part-time";
      else if (/\bcontract\b|contractor/i.test(text)) out.employment_type = "Contract";
      else if (/intern(ship)?/i.test(text)) out.employment_type = "Internship";
      // Experience extraction heuristic
      const expMatches = text.matchAll(/(\d{1,2}\s*(?:-|to|–)\s*\d{1,2}\+?\s*(?:years|yrs|yoe|years of experience))|(\d{1,2}\+?\s*(?:years|yrs|yoe|years of experience))/gi);
      for (const match of expMatches) {
        const matchedText = match[0];
        const val = parseInt(matchedText.match(/\d+/)?.[0] || "0", 10);
        const idx = text.indexOf(matchedText);
        const context = text.substring(Math.max(0, idx - 40), Math.min(text.length, idx + matchedText.length + 40)).toLowerCase();
        const isAgeOrScreening = context.includes("screening") || context.includes("age") || context.includes("above") || context.includes("health") || context.includes("years old");
        if (val > 15 && isAgeOrScreening) continue;
        if (val > 25) continue;
        out.experience_required = matchedText;
        break;
      }

      // Salary extraction heuristic
      const pkgM = text.match(/(?:₹|inr|usd|\$|€|eur|gbp|£|\brs\b|\brs\.)\s*\d[\d,.\s\-–to]*\s*(?:lpa|lakh|lakhs|cr|crore|k|m|mn|million|per\s*annum|p\.?a\.?)?/i)
        || text.match(/\b\d{1,3}\s*(?:-|to|–)\s*\d{1,3}\s*(?:lpa|lakh|lakhs|k\s*usd|usd|inr)\b/i);
      if (pkgM) {
        const valStr = pkgM[0].trim();
        const digits = valStr.match(/\d+/g);
        if (digits) {
          const firstVal = parseInt(digits[0], 10);
          const lowerValStr = valStr.toLowerCase();
          const hasScaling = lowerValStr.includes("lpa") || lowerValStr.includes("lakh") || lowerValStr.includes("k") || lowerValStr.includes("m") || lowerValStr.includes("million") || lowerValStr.includes("crore") || lowerValStr.includes("cr");
          if (firstVal < 1000 && !hasScaling) {
            // skip false positive
          } else {
            out.package = valStr;
          }
        }
      }
      const compM = text.match(/\b(?:at|join|@)\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?:\s+in\s+|\s+is\s+|,|\.|\s+as\s+)/);
      if (compM) out.company = compM[1].trim();
      const locM = text.match(/\bin\s+([A-Z][A-Za-z .-]{2,30}?)(?:,|\.|\s+(?:hybrid|remote|on[-\s]?site|office))/i);
      if (locM) out.location = locM[1].trim();
      return out;
    };

    const ov = (finalResult.overview ?? {}) as Record<string, unknown>;
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
        experience_is_estimated: ov.experience_is_estimated !== undefined 
          ? Boolean(ov.experience_is_estimated) 
          : heur.experience_is_estimated,
        industry: ov.industry || "",
        seniority: ov.seniority || "",
      };
    }

    // Handle structured_data mappings and guarantees
    const sd = (finalResult.structured_data ?? {}) as Record<string, unknown>;
    const defaultSd = JD_SCHEMA.structured_data;
    
    finalResult.structured_data = {
      role_title: sd.role_title || (finalResult.overview as Record<string, string>)?.role || finalResult.title || "Not specified",
      company_name: sd.company_name || (finalResult.overview as Record<string, string>)?.company || "Not specified",
      department: sd.department || "Not specified",
      employment_type: sd.employment_type || (finalResult.overview as Record<string, string>)?.employment_type || "Not specified",
      location: sd.location || (finalResult.overview as Record<string, string>)?.location || "Not specified",
      salary_range: sd.salary_range || (finalResult.overview as Record<string, string>)?.package || "Not disclosed",
      hard_requirements: Array.isArray(sd.hard_requirements) ? sd.hard_requirements : defaultSd.hard_requirements,
      soft_requirements: Array.isArray(sd.soft_requirements) ? sd.soft_requirements : defaultSd.soft_requirements,
      responsibilities: Array.isArray(sd.responsibilities) ? sd.responsibilities : defaultSd.responsibilities,
      culture_signals: Array.isArray(sd.culture_signals) ? sd.culture_signals : defaultSd.culture_signals,
      company_context: { ...defaultSd.company_context, ...(typeof sd.company_context === 'object' ? sd.company_context : {}) },
      keywords_for_ats: Array.isArray(sd.keywords_for_ats) && sd.keywords_for_ats.length > 0
        ? sd.keywords_for_ats
        : (Array.isArray((finalResult.resume_help as Record<string, unknown>)?.keywords) && ((finalResult.resume_help as Record<string, unknown>).keywords as string[]).length > 0
            ? ((finalResult.resume_help as Record<string, unknown>).keywords as string[]).map((kw: string) => {
                const parts = kw.split(/\s+\(|\)/);
                const spelled = parts[0].trim();
                const acr = parts[1] ? parts[1].trim() : undefined;
                return { spelled_out: spelled, acronym: acr };
              })
            : (Array.isArray(finalResult.skills) && finalResult.skills.length > 0
                ? (finalResult.skills as Array<{ skill: string }>).map((s) => {
                    const parts = s.skill.split(/\s+\(|\)/);
                    const spelled = parts[0].trim();
                    const acr = parts[1] ? parts[1].trim() : undefined;
                    return { spelled_out: spelled, acronym: acr };
                  }).slice(0, 12)
                : defaultSd.keywords_for_ats)),
      red_flags: { ...defaultSd.red_flags, ...(typeof sd.red_flags === 'object' ? sd.red_flags : {}) }
    };

    // ── Post-processing guardrails for salary, experience, and seniority ──
    if (finalResult.overview) {
      const ov = finalResult.overview as Record<string, unknown>;
      
      // 1. Seniority Level Override based on Title (AVP, VP, Director, Lead etc.)
      const titleUpper = String(ov.role || finalResult.title || "").toUpperCase();
      if (finalResult.qualifiers) {
        const qual = finalResult.qualifiers as Record<string, unknown>;
        let level = qual.seniority_level ?? 0;
        
        if (titleUpper.includes("DIRECTOR") || titleUpper.includes("VP") || titleUpper.includes("AVP") || titleUpper.includes("VICE PRESIDENT")) {
          level = Math.max(level, 75); // Executive / AVP level
          ov.seniority = "Executive";
        } else if (titleUpper.includes("LEAD") || titleUpper.includes("PRINCIPAL") || titleUpper.includes("ARCHITECT") || titleUpper.includes("SENIOR") || titleUpper.includes("SR.")) {
          level = Math.max(level, 55); // Mid-Senior level
          ov.seniority = "Senior";
        }
        qual.seniority_level = level;
      }

      // 2. Strict Hallucination Verification for Experience Required
      if (ov.experience_required && ov.experience_required !== "Not specified") {
        const expStr = String(ov.experience_required).toLowerCase();
        const numbers = expStr.match(/\d+/g);
        if (numbers) {
          const val = parseInt(numbers[0], 10);
          
          // Verify if at least one number in the experience string exists in the original JD text.
          let existsInJd = false;
          for (const num of numbers) {
            const numRegex = new RegExp("\\b" + num + "\\b");
            if (numRegex.test(jdText)) {
              existsInJd = true;
            }
          }

          // If numbers are not in JD, or if we matched 35 (the health screening age), clean it up
          const isAgeOrScreening = val > 20 && (jdText.toLowerCase().includes("health screening") || jdText.toLowerCase().includes("screening"));
          if (!existsInJd || isAgeOrScreening) {
            ov.experience_required = "Not specified";
            ov.experience_is_estimated = true;
          }
        }
      }

      // 3. Strict Hallucination Verification for Salary Package
      if (ov.package && ov.package !== "Not disclosed") {
        const pkgStr = String(ov.package).toLowerCase();
        const numbers = pkgStr.match(/\d+/g);
        if (numbers) {
          const firstNum = parseInt(numbers[0], 10);
          const hasScaling = pkgStr.includes("lpa") || pkgStr.includes("lakh") || pkgStr.includes("k") || pkgStr.includes("m") || pkgStr.includes("crore");
          
          // Verify if the digits actually exist in the original JD text.
          let existsInJd = false;
          for (const num of numbers) {
            const numRegex = new RegExp("\\b" + num + "\\b");
            if (numRegex.test(jdText)) {
              existsInJd = true;
            }
          }

          // Reset if digits do not exist in the text, or if values are unrealistically small without scaling
          if (!existsInJd || (firstNum < 1000 && !hasScaling)) {
            ov.package = "Not disclosed";
            if (finalResult.structured_data) {
              (finalResult.structured_data as Record<string, unknown>).salary_range = "Not disclosed";
            }
            if (finalResult.logistics) {
              const log = finalResult.logistics as Record<string, unknown>;
              if (log.salary_range) {
                log.salary_range = { min: 0, max: 0, currency: "", estimate: true, note: "Not specified" };
              }
            }
          }
        }
      }

      // Synchronize overview.work_mode and logistics.work_arrangement.remote_friendly
      if (finalResult.logistics) {
        const log = finalResult.logistics as Record<string, unknown>;
        if (!log.work_arrangement) {
          log.work_arrangement = { remote_friendly: "unspecified", office_presence: "unspecified", flexible_hours: false };
        }
        
        const wm = String(ov.work_mode || "").toLowerCase();
        if (wm === "remote") {
          log.work_arrangement.remote_friendly = "yes";
        } else if (wm === "hybrid") {
          log.work_arrangement.remote_friendly = "partial";
        } else if (wm === "on-site" || wm === "onsite") {
          log.work_arrangement.remote_friendly = "no";
          ov.work_mode = "On-site";
        } else {
          const rf = String(log.work_arrangement.remote_friendly || "").toLowerCase();
          if (rf === "yes") {
            ov.work_mode = "Remote";
          } else if (rf === "partial") {
            ov.work_mode = "Hybrid";
          } else if (rf === "no") {
            ov.work_mode = "On-site";
          }
        }
      }
    }

    // Heuristic cleanup for education degree hallucinations
    const educationRegex = /\b(degree|bachelor|bachelors|master|masters|phd|university|college|graduate|graduates|graduation)\b/i;
    const hasEducationMention = educationRegex.test(jdText);
    if (!hasEducationMention) {
      if (finalResult.requirements) {
        const reqs = finalResult.requirements as Record<string, unknown>;
        reqs.education = [];
      }
      if (finalResult.structured_data) {
        const sd = finalResult.structured_data as Record<string, unknown>;
        if (Array.isArray(sd.hard_requirements)) {
          sd.hard_requirements = (sd.hard_requirements as Array<{ category?: string }>).filter((hr) => {
            const cat = String(hr.category || "").toLowerCase();
            return !cat.includes("degree") && !cat.includes("education") && !cat.includes("qualification");
          });
        }
      }
    }

    // ── Post-processing guardrails for bullets, questions, and timeline counts ──
    // Enforce exactly 5 bullets in resume_help.bullets
    // Enforce exactly 5 bullets and keywords fallback in resume_help
    if (finalResult.resume_help) {
      const rh = finalResult.resume_help as Record<string, unknown>;
      
      // Fallback for keywords if empty
      if (!Array.isArray(rh.keywords) || rh.keywords.length === 0) {
        if (Array.isArray(finalResult.skills) && finalResult.skills.length > 0) {
          rh.keywords = (finalResult.skills as Array<{ skill: string }>).map((s) => s.skill).slice(0, 12);
        } else {
          rh.keywords = ["SQL", "Python", "Pandas", "Snowflake", "BigQuery", "dbt", "Qlik", "Data Engineering", "Data Science", "Analytics"];
        }
      }

      const roleTitle = finalResult.title || "Target Position";
      const topSkills = Array.isArray(finalResult.skills) 
        ? (finalResult.skills as Array<{ skill: string }>).map((s) => s.skill).filter(Boolean).slice(0, 5)
        : [];
      while (topSkills.length < 5) {
        topSkills.push(["Python", "SQL", "Git", "Cloud Infrastructure", "System Design"][topSkills.length] || "Problem Solving");
      }

      if (Array.isArray(rh.bullets) && rh.bullets.filter(b => b && b.trim().length > 0).length > 0) {
        rh.bullets = rh.bullets.filter(b => b && b.trim().length > 0).slice(0, 5);
        while (rh.bullets.length < 5) {
          const idx = rh.bullets.length;
          const skill = topSkills[idx % topSkills.length];
          rh.bullets.push(`Leveraged **${skill}** to design, test, and execute modular features within the ${roleTitle} ecosystem.`);
        }
      } else {
        rh.bullets = [
          `Architected and scaled robust systems for ${roleTitle} tasks using **${topSkills[0]}** to drive core business objectives.`,
          `Designed, developed, and maintained production workflows utilizing **${topSkills[1]}** to enhance efficiency.`,
          `Collaborated with cross-functional partners to cleanly integrate **${topSkills[2]}** into reliable services.`,
          `Optimized performance, resource utilization, and throughput by leveraging **${topSkills[3]}**.`,
          `Applied industry best practices, testing, and version control using **${topSkills[4]}** to ensure code quality.`
        ];
      }
    }

    // Enforce exactly 10 questions in interview_kit.questions
    if (finalResult.interview_kit) {
      const ik = finalResult.interview_kit as Record<string, unknown>;
      const fallbackQuestions = [
        { question: "Can you detail your technical approach to scaling data pipelines in high-throughput environments?", type: "technical", tip: "Discuss optimization, partitioning, and resource allocation.", target_answer: "Explain design principles such as pipeline decoupling, database indexing, and query optimization." },
        { question: "How do you approach stakeholder management when there are conflicting data requirements?", type: "behavioral", tip: "Focus on discovery, alignment, and communicating trade-offs.", target_answer: "Describe gathering structured requirements and leading the group to a consensus based on business impact." },
        { question: "Describe a time you had to optimize a slow SQL query or dbt model. What was your process?", type: "technical", tip: "Mention indexing, partitioning, explaining plans, or CTE refactoring.", target_answer: "Explain using profiling tools and rewriting queries to minimize scans and joins." },
        { question: "How do you decide between a simple pragmatic solution and a complex, highly scalable system?", type: "situational", tip: "Explain prioritizing business value, risk, and speed.", target_answer: "Emphasize iterating with simple solutions first and scaling up when justified by usage and metrics." },
        { question: "What is your experience with modern data platforms like Snowflake or BigQuery?", type: "technical", tip: "Focus on pricing/compute models, clustering, and performance.", target_answer: "Share hands-on configurations, storage-compute separation, and cost-control strategies." },
        { question: "How do you ensure data quality and govern lineage across dbt models?", type: "technical", tip: "Talk about dbt tests, source freshness checks, and documentation.", target_answer: "Outline automated validation rules and schema tests integrated into the CI/CD pipeline." },
        { question: "How do you translate ambiguous business questions into concrete hypotheses?", type: "situational", tip: "Detail your Discovery process and active listening.", target_answer: "Explain asking clarifying questions about the business decision being supported and defining simple metrics." },
        { question: "Describe your experience setting up BI dashboards (e.g. Qlik, Power BI) for self-service analytics.", type: "technical", tip: "Highlight user adoption, semantic layers, and visual hierarchy.", target_answer: "Discuss building reusable semantic models and designing reports around user questions." },
        { question: "How do you keep up with emerging trends in analytics engineering and data science?", type: "behavioral", tip: "Mention communities, blogs, or personal projects.", target_answer: "Detail specific newsletters, open source projects, or professional networks you follow." },
        { question: "What is your approach to automated pipeline monitoring and alerting?", type: "technical", tip: "Talk about Slack alerts, health-checks, and logs.", target_answer: "Describe alerting on schema changes, volume anomalies, or run failures to fix issues proactively." }
      ];

      if (Array.isArray(ik.questions)) {
        ik.questions = (ik.questions as Array<{ question?: string }>).filter((q) => q && q.question).slice(0, 10);
        while (ik.questions.length < 10) {
          const fb = fallbackQuestions[ik.questions.length % fallbackQuestions.length];
          ik.questions.push({ ...fb });
        }
      } else {
        ik.questions = fallbackQuestions.map(fb => ({ ...fb }));
      }

      // Enforce exactly 5 reverse_questions in interview_kit.reverse_questions
      const fallbackReverse = [
        "What does the technical roadmap look like for the data platform over the next two quarters?",
        "How does the team balance long-term technical debt with immediate business delivery?",
        "What are the biggest data quality/governance challenges the team faces right now?",
        "Can you describe the working dynamic between the data engineers and business stakeholders?",
        "What opportunities for training, certification, and career growth are supported for this role?"
      ];

      if (Array.isArray(ik.reverse_questions)) {
        ik.reverse_questions = (ik.reverse_questions as unknown[]).filter((q) => q && String(q).trim().length > 0).slice(0, 5);
        while (ik.reverse_questions.length < 5) {
          ik.reverse_questions.push(fallbackReverse[ik.reverse_questions.length % fallbackReverse.length]);
        }
      } else {
        ik.reverse_questions = [...fallbackReverse];
      }
    }

    // Enforce sequential task order for day_in_life (e.g. 1st Task, 2nd Task...) and exactly 5 items
    if (finalResult.deep_dive) {
      const dd = finalResult.deep_dive as Record<string, unknown>;
      const fallbackDay = [
        { time: "1st Task", task: "Standup & Daily Prioritization", description: "Align on daily engineering deliverables and coordinate tasks with cross-functional stakeholders." },
        { time: "2nd Task", task: "Core Execution & Engineering", description: "Write optimized queries, design data transformations, or develop models depending on the daily priority." },
        { time: "3rd Task", task: "Data Quality & Review", description: "Verify transformation runtimes, run tests, and refine reporting dashboard features." },
        { time: "4th Task", task: "Stakeholder Consultation", description: "Consult with business partners to clarify data requirements and align on success metrics." },
        { time: "5th Task", task: "Documentation & Handovers", description: "Document schemas in the repository, update technical docs, and outline next priorities." }
      ];

      if (Array.isArray(dd.day_in_life)) {
        dd.day_in_life = (dd.day_in_life as Array<{ task?: string; description?: string }>).filter((entry) => entry && entry.task).slice(0, 5);
        while (dd.day_in_life.length < 5) {
          const fb = fallbackDay[dd.day_in_life.length % fallbackDay.length];
          dd.day_in_life.push({ ...fb });
        }
      } else {
        dd.day_in_life = fallbackDay.map(fb => ({ ...fb }));
      }

      dd.day_in_life = (dd.day_in_life as Array<{ task?: string; description?: string }>).map((entry, index: number) => {
        const suffix = ["st", "nd", "rd"][index] || "th";
        const label = `${index + 1}${suffix} Task`;
        return {
          time: label,
          task: entry.task || "Collaborative Work",
          description: entry.description || "Executing role-specific engineering tasks and collaborating with stakeholders."
        };
      });
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
