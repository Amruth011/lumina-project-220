import { supabase } from "@/integrations/supabase/client";
import type { DecodeResult, StructuredJdData } from "@/types/jd";
import { getCachedDecode, setCachedDecode } from "./jdCache";
import { decodeJDHeuristic } from "./heuristicDecoder";
import { clearResumeAnalysisCache } from "./resumeAnalysisCache";

/**
 * Normalizes messy job description text to clean up excessive spacing,
 * trailing whitespaces, and standardizing common formats.
 */
export function cleanAndNormalizeJdText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width spaces
    .replace(/\s+/g, " ")                 // collapse multiple spaces/newlines
    .trim();
}

/**
 * Validates and ensures the returned DecodeResult matches the required structure,
 * providing safe defaults and schema validation to prevent UI crashes.
 */
export function validateAndRepairJdResult(raw: Partial<DecodeResult>, jdText: string): DecodeResult {
  const title = raw.title || "Target Position";
  
  const overview = {
    role: raw.overview?.role || title,
    company: raw.overview?.company || "Not specified",
    location: raw.overview?.location || "Not specified",
    work_mode: raw.overview?.work_mode || "Not specified",
    employment_type: raw.overview?.employment_type || "Not specified",
    package: raw.overview?.package || "Not disclosed",
    experience_required: raw.overview?.experience_required || "Not specified",
    industry: raw.overview?.industry || "",
    seniority: raw.overview?.seniority || ""
  };

  const skills = Array.isArray(raw.skills) ? raw.skills.map(s => ({
    skill: s?.skill || "",
    importance: typeof s?.importance === "number" ? s.importance : 50,
    category: s?.category || "Technical"
  })) : [];

  const requirements = {
    education: Array.isArray(raw.requirements?.education) ? raw.requirements.education : [],
    experience: raw.requirements?.experience || "Not explicitly specified in the JD.",
    soft_skills: Array.isArray(raw.requirements?.soft_skills) ? raw.requirements.soft_skills : [],
    agreements: Array.isArray(raw.requirements?.agreements) ? raw.requirements.agreements : []
  };

  const grade = {
    score: typeof raw.grade?.score === "number" ? raw.grade.score : 70,
    letter: raw.grade?.letter || "B",
    summary: raw.grade?.summary || "Forensic analysis active.",
    breakdown: {
      clarity: typeof raw.grade?.breakdown?.clarity === "number" ? raw.grade.breakdown.clarity : 10,
      realistic: typeof raw.grade?.breakdown?.realistic === "number" ? raw.grade.breakdown.realistic : 10,
      compensation: typeof raw.grade?.breakdown?.compensation === "number" ? raw.grade.breakdown.compensation : 10,
      red_flags: typeof raw.grade?.breakdown?.red_flags === "number" ? raw.grade.breakdown.red_flags : 5,
      benefits: typeof raw.grade?.breakdown?.benefits === "number" ? raw.grade.breakdown.benefits : 5,
      growth: typeof raw.grade?.breakdown?.growth === "number" ? raw.grade.breakdown.growth : 5,
      inclusivity: typeof raw.grade?.breakdown?.inclusivity === "number" ? raw.grade.breakdown.inclusivity : 5,
      readability: typeof raw.grade?.breakdown?.readability === "number" ? raw.grade.breakdown.readability : 3,
    },
    plain_english_summary: Array.isArray(raw.grade?.plain_english_summary) ? raw.grade.plain_english_summary : []
  };

  const red_flags = Array.isArray(raw.red_flags) ? raw.red_flags.map(rf => ({
    phrase: rf?.phrase || "",
    intensity: typeof rf?.intensity === "number" ? rf.intensity : 50,
    note: rf?.note || ""
  })) : [];

  const recruiter_lens = Array.isArray(raw.recruiter_lens) ? raw.recruiter_lens.map(rl => ({
    jargon: rl?.jargon || "",
    reality: rl?.reality || ""
  })) : [];

  const qualifiers = {
    must_have_percent: typeof raw.qualifiers?.must_have_percent === "number" ? raw.qualifiers.must_have_percent : 70,
    nice_to_have_percent: typeof raw.qualifiers?.nice_to_have_percent === "number" ? raw.qualifiers.nice_to_have_percent : 50,
    seniority_level: typeof raw.qualifiers?.seniority_level === "number" ? raw.qualifiers.seniority_level : 50,
    experience: {
      professional: typeof raw.qualifiers?.experience?.professional === "number" ? raw.qualifiers.experience.professional : 2,
      project_proof: typeof raw.qualifiers?.experience?.project_proof === "number" ? raw.qualifiers.experience.project_proof : 80
    },
    education: {
      degree_required: typeof raw.qualifiers?.education?.degree_required === "boolean" ? raw.qualifiers.education.degree_required : false,
      skills_first_percent: typeof raw.qualifiers?.education?.skills_first_percent === "number" ? raw.qualifiers.education.skills_first_percent : 80
    }
  };

  const logistics = {
    salary_range: {
      min: typeof raw.logistics?.salary_range?.min === "number" ? raw.logistics.salary_range.min : 0,
      max: typeof raw.logistics?.salary_range?.max === "number" ? raw.logistics.salary_range.max : 0,
      currency: raw.logistics?.salary_range?.currency || "USD",
      estimate: typeof raw.logistics?.salary_range?.estimate === "boolean" ? raw.logistics.salary_range.estimate : true,
      note: raw.logistics?.salary_range?.note || ""
    },
    work_arrangement: {
      remote_friendly: raw.logistics?.work_arrangement?.remote_friendly || "unspecified",
      office_presence: raw.logistics?.work_arrangement?.office_presence || "unspecified",
      flexible_hours: typeof raw.logistics?.work_arrangement?.flexible_hours === "boolean" ? raw.logistics.work_arrangement.flexible_hours : true
    },
    responsibility_mix: Array.isArray(raw.logistics?.responsibility_mix) ? raw.logistics.responsibility_mix : [],
    archetype: {
      label: raw.logistics?.archetype?.label || "Generalist Engineer",
      description: raw.logistics?.archetype?.description || "",
      primary_focus: raw.logistics?.archetype?.primary_focus || "",
      primary_tool: raw.logistics?.archetype?.primary_tool || "",
      match_score: typeof raw.logistics?.archetype?.match_score === "number" ? raw.logistics.archetype.match_score : 80
    },
    hard_soft_ratio: {
      hard: typeof raw.logistics?.hard_soft_ratio?.hard === "number" ? raw.logistics.hard_soft_ratio.hard : 70,
      soft: typeof raw.logistics?.hard_soft_ratio?.soft === "number" ? raw.logistics.hard_soft_ratio.soft : 30
    }
  };

  const role_reality = {
    iceberg_above: Array.isArray(raw.role_reality?.iceberg_above) ? raw.role_reality.iceberg_above : [],
    iceberg_below: Array.isArray(raw.role_reality?.iceberg_below) ? raw.role_reality.iceberg_below : [],
    dimensions: {
      technical_depth: typeof raw.role_reality?.dimensions?.technical_depth === "number" ? raw.role_reality.dimensions.technical_depth : 50,
      research_autonomy: typeof raw.role_reality?.dimensions?.research_autonomy === "number" ? raw.role_reality.dimensions.research_autonomy : 50,
      client_interaction: typeof raw.role_reality?.dimensions?.client_interaction === "number" ? raw.role_reality.dimensions.client_interaction : 50,
      strategic_impact: typeof raw.role_reality?.dimensions?.strategic_impact === "number" ? raw.role_reality.dimensions.strategic_impact : 50,
      legacy_maintenance: typeof raw.role_reality?.dimensions?.legacy_maintenance === "number" ? raw.role_reality.dimensions.legacy_maintenance : 50
    }
  };

  const deep_dive = {
    day_in_life: Array.isArray(raw.deep_dive?.day_in_life) ? raw.deep_dive.day_in_life : [],
    health_radar: {
      market_position: typeof raw.deep_dive?.health_radar?.market_position === "number" ? raw.deep_dive.health_radar.market_position : 70,
      tech_innovation: typeof raw.deep_dive?.health_radar?.tech_innovation === "number" ? raw.deep_dive.health_radar.tech_innovation : 70,
      transparency: typeof raw.deep_dive?.health_radar?.transparency === "number" ? raw.deep_dive.health_radar.transparency : 70,
      client_quality: typeof raw.deep_dive?.health_radar?.client_quality === "number" ? raw.deep_dive.health_radar.client_quality : 70,
      employee_benefits: typeof raw.deep_dive?.health_radar?.employee_benefits === "number" ? raw.deep_dive.health_radar.employee_benefits : 70
    },
    bias_analysis: {
      inclusivity_score: typeof raw.deep_dive?.bias_analysis?.inclusivity_score === "number" ? raw.deep_dive.bias_analysis.inclusivity_score : 80,
      gender_meter: raw.deep_dive?.bias_analysis?.gender_meter || "neutral",
      age_bias_graph: typeof raw.deep_dive?.bias_analysis?.age_bias_graph === "number" ? raw.deep_dive.bias_analysis.age_bias_graph : 50,
      tonal_map: Array.isArray(raw.deep_dive?.bias_analysis?.tonal_map) ? raw.deep_dive.bias_analysis.tonal_map : []
    },
    culture_radar: {
      innovation: typeof raw.deep_dive?.culture_radar?.innovation === "number" ? raw.deep_dive.culture_radar.innovation : 70,
      work_life_balance: typeof raw.deep_dive?.culture_radar?.work_life_balance === "number" ? raw.deep_dive.culture_radar.work_life_balance : 70,
      collaboration: typeof raw.deep_dive?.culture_radar?.collaboration === "number" ? raw.deep_dive.culture_radar.collaboration : 70,
      hierarchy: typeof raw.deep_dive?.culture_radar?.hierarchy === "number" ? raw.deep_dive.culture_radar.hierarchy : 50,
      results_driven: typeof raw.deep_dive?.culture_radar?.results_driven === "number" ? raw.deep_dive.culture_radar.results_driven : 70,
      stability: typeof raw.deep_dive?.culture_radar?.stability === "number" ? raw.deep_dive.culture_radar.stability : 70
    }
  };

  const bonus_pulse = {
    ghost_job_probability: typeof raw.bonus_pulse?.ghost_job_probability === "number" ? raw.bonus_pulse.ghost_job_probability : 10,
    desperation_meter: typeof raw.bonus_pulse?.desperation_meter === "number" ? raw.bonus_pulse.desperation_meter : 30,
    competition_estimate: typeof raw.bonus_pulse?.competition_estimate === "number" ? raw.bonus_pulse.competition_estimate : 50,
    skill_rarity: typeof raw.bonus_pulse?.skill_rarity === "number" ? raw.bonus_pulse.skill_rarity : 50,
    interview_difficulty: typeof raw.bonus_pulse?.interview_difficulty === "number" ? raw.bonus_pulse.interview_difficulty : 70,
    career_growth: {
      trajectory: Array.isArray(raw.bonus_pulse?.career_growth?.trajectory) ? raw.bonus_pulse.career_growth.trajectory : [],
      potential_score: typeof raw.bonus_pulse?.career_growth?.potential_score === "number" ? raw.bonus_pulse.career_growth.potential_score : 70
    },
    tech_stack_popularity: Array.isArray(raw.bonus_pulse?.tech_stack_popularity) ? raw.bonus_pulse.tech_stack_popularity : []
  };

  const interview_kit = {
    questions: Array.isArray(raw.interview_kit?.questions) ? raw.interview_kit.questions : [],
    reverse_questions: Array.isArray(raw.interview_kit?.reverse_questions) ? raw.interview_kit.reverse_questions : []
  };

  const resume_help = {
    keywords: Array.isArray(raw.resume_help?.keywords) ? raw.resume_help.keywords : [],
    bullets: Array.isArray(raw.resume_help?.bullets) ? raw.resume_help.bullets : []
  };

  // Structured Data Defaults
  const structured_data: StructuredJdData = {
    role_title: raw.structured_data?.role_title || overview.role || title,
    company_name: raw.structured_data?.company_name || overview.company || "Not specified",
    department: raw.structured_data?.department || "Not specified",
    employment_type: raw.structured_data?.employment_type || overview.employment_type || "Not specified",
    location: raw.structured_data?.location || overview.location || "Not specified",
    salary_range: raw.structured_data?.salary_range || overview.package || "Not disclosed",
    hard_requirements: Array.isArray(raw.structured_data?.hard_requirements) ? raw.structured_data.hard_requirements.map(hr => ({
      category: hr?.category || "General",
      priority: hr?.priority === "nice-to-have" ? "nice-to-have" : "must-have",
      minimum_years: typeof hr?.minimum_years === "number" || typeof hr?.minimum_years === "string" ? hr.minimum_years : undefined,
      specific_technologies: Array.isArray(hr?.specific_technologies) ? hr.specific_technologies : []
    })) : [],
    soft_requirements: Array.isArray(raw.structured_data?.soft_requirements) ? raw.structured_data.soft_requirements.map(sr => ({
      traits: Array.isArray(sr?.traits) ? sr.traits : [],
      context: sr?.context || "",
      evidence_type: sr?.evidence_type || ""
    })) : [],
    responsibilities: Array.isArray(raw.structured_data?.responsibilities) ? raw.structured_data.responsibilities.map(r => ({
      scope: r?.scope || "",
      impact_area: r?.impact_area || ""
    })) : [],
    culture_signals: Array.isArray(raw.structured_data?.culture_signals) ? raw.structured_data.culture_signals.map(cs => ({
      evidence: cs?.evidence || "",
      tone: cs?.tone || "neutral"
    })) : [],
    company_context: {
      stage: raw.structured_data?.company_context?.stage || "",
      size: raw.structured_data?.company_context?.size || "",
      industry: raw.structured_data?.company_context?.industry || "",
      work_style: raw.structured_data?.company_context?.work_style || "",
      communication_style: raw.structured_data?.company_context?.communication_style || ""
    },
    keywords_for_ats: Array.isArray(raw.structured_data?.keywords_for_ats) ? raw.structured_data.keywords_for_ats.map(kw => ({
      spelled_out: kw?.spelled_out || "",
      acronym: kw?.acronym || undefined
    })) : [],
    red_flags: {
      vague_requirements: Array.isArray(raw.structured_data?.red_flags?.vague_requirements) ? raw.structured_data.red_flags.vague_requirements : [],
      unrealistic_expectations: Array.isArray(raw.structured_data?.red_flags?.unrealistic_expectations) ? raw.structured_data.red_flags.unrealistic_expectations : []
    }
  };

  return {
    ...raw,
    valid: raw.valid !== false,
    title,
    overview,
    skills,
    requirements,
    winning_strategy: Array.isArray(raw.winning_strategy) ? raw.winning_strategy : [],
    grade,
    red_flags,
    recruiter_lens,
    qualifiers,
    logistics,
    role_reality,
    deep_dive,
    bonus_pulse,
    interview_kit,
    resume_help,
    structured_data
  };
}

/**
 * Reusable Structured Job Description Parser.
 * Uses Groq Llama 3.3 70B via Supabase Edge Functions with a client-side offline fallback.
 */
export async function parseJobDescription(jdText: string, options?: { forceRefresh?: boolean }): Promise<DecodeResult> {
  const cleanedText = cleanAndNormalizeJdText(jdText);
  if (cleanedText.length < 20) {
    throw new Error("Job description input too short. Minimum 20 characters required.");
  }

  // 1. Check local cache first
  if (!options?.forceRefresh) {
    try {
      const cached = await getCachedDecode(cleanedText);
      if (cached) {
        return cached;
      }
    } catch (err) {
      console.warn("[StructuredJdParser] Cache lookup failed:", err);
    }
  }

  // 2. Call Supabase Edge Function decode-jd
  try {
    const { data, error } = await supabase.functions.invoke("decode-jd", {
      body: { jdText: cleanedText }
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message || "Unknown error"}`);
    }

    if (!data) {
      throw new Error("Edge function returned empty data.");
    }

    if (data.error) {
      throw new Error(data.error);
    }

    if (data.valid === false) {
      throw new Error(data.message || "The input text does not appear to be a valid job description.");
    }

    // Repair the schema to protect against missing fields
    const parsedResult = validateAndRepairJdResult(data, cleanedText);

    // Save to cache
    await setCachedDecode(cleanedText, parsedResult);
    clearResumeAnalysisCache();

    return parsedResult;
  } catch (err: unknown) {
    console.warn(`[StructuredJdParser] Primary LLM parser failed, falling back to offline heuristics. Error: ${(err as Error).message || err}`);
    
    // 3. Fallback to heuristic parser
    try {
      const fallbackResult = decodeJDHeuristic(cleanedText);
      await setCachedDecode(cleanedText, fallbackResult);
      clearResumeAnalysisCache();
      return fallbackResult;
    } catch (fallbackErr: unknown) {
      console.error("[StructuredJdParser] Heuristic fallback also failed:", fallbackErr);
      throw new Error(`JD parsing failed completely: ${(err as Error).message || err}`);
    }
  }
}
