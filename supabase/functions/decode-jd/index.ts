/**
 * LUMINA DECODING ENGINE v3.0
 * Native Deno Strategy with Structured JD Parser
 */

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
      const out = { role: title || "Not specified", company: "Not specified", location: "Not specified", work_mode: "Not specified", employment_type: "Not specified", package: "Not disclosed", experience_required: "Not specified", industry: "", seniority: "" };
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
      const compM = text.match(/\b(?:at|join|with|@)\s+([A-Z][A-Za-0-9&.\- ]{1,40}?)(?:\s+in\s+|\s+is\s+|,|\.|\s+as\s+)/);
      if (compM) out.company = compM[1].trim();
      const locM = text.match(/\bin\s+([A-Z][A-Za- .-]{2,30}?)(?:,|\.|\s+(?:hybrid|remote|on[-\s]?site|office))/i);
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
      keywords_for_ats: Array.isArray(sd.keywords_for_ats) ? sd.keywords_for_ats : defaultSd.keywords_for_ats,
      red_flags: { ...defaultSd.red_flags, ...(typeof sd.red_flags === 'object' ? sd.red_flags : {}) }
    };

    // ── Post-processing guardrails for salary and experience ──
    if (finalResult.overview) {
      const ov = finalResult.overview as Record<string, any>;
      if (ov.package) {
        const pkgStr = String(ov.package).toLowerCase();
        const numbers = pkgStr.match(/\d+/g);
        if (numbers) {
          const firstNum = parseInt(numbers[0], 10);
          const hasScaling = pkgStr.includes("lpa") || pkgStr.includes("lakh") || pkgStr.includes("k") || pkgStr.includes("m") || pkgStr.includes("crore");
          // If the matched salary value is unrealistically small (like 4 or 4000 without LPA), reset to Not disclosed
          if (firstNum < 1000 && !hasScaling) {
            ov.package = "Not disclosed";
            if (finalResult.structured_data) {
              (finalResult.structured_data as Record<string, any>).salary_range = "Not disclosed";
            }
            if (finalResult.logistics) {
              const log = finalResult.logistics as Record<string, any>;
              if (log.salary_range) {
                log.salary_range = { min: 0, max: 0, currency: "", estimate: true, note: "Not specified" };
              }
            }
          }
        }
      }
      
      if (ov.experience_required) {
        const expStr = String(ov.experience_required).toLowerCase();
        const numbers = expStr.match(/\d+/g);
        if (numbers) {
          const val = parseInt(numbers[0], 10);
          // If we matched 35 (the health screening age), clean it up
          if (val > 20 && (jdText.toLowerCase().includes("health screening") || jdText.toLowerCase().includes("screening"))) {
            ov.experience_required = "Not specified";
          }
        }
      }
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
