import { supabase } from "@/integrations/supabase/client";
import type { ResumeExtractedData } from "@/types/resume";
import type { StructuredJdData } from "@/types/jd";
import type { 
  RequirementMapping, 
  GeneratedBulletItem, 
  MultiPassBulletResult, 
  PipelineProgress, 
  BulletVariant 
} from "@/types/bulletGenerator";
import { validateGeneratedContent } from "./hallucinationGuardrail";

/**
 * Clean and normalize text helper.
 */
function cleanText(t: string): string {
  return (t || "").trim();
}

/**
 * Heuristic mapping fallback when LLM is unavailable.
 */
export function heuristicMapRequirements(
  resume: ResumeExtractedData, 
  jd: StructuredJdData
): RequirementMapping[] {
  const mappings: RequirementMapping[] = [];

  // Get all hard requirements
  const requirements = (jd.hard_requirements || []).flatMap(r => 
    r.specific_technologies.length > 0 
      ? r.specific_technologies 
      : [r.category]
  );

  if (requirements.length === 0) {
    requirements.push("SQL", "Python", "Data Engineering");
  }

  requirements.forEach(req => {
    let bestMatch = "General Experience";
    let maxScore = 0;
    
    // Look in experience
    resume.experience.forEach(exp => {
      let score = 0;
      if (exp.company.toLowerCase().includes(req.toLowerCase())) score += 3;
      if (exp.title.toLowerCase().includes(req.toLowerCase())) score += 2;
      exp.bullets.forEach(b => {
        if (b.original_text.toLowerCase().includes(req.toLowerCase())) score += 1;
        if (b.technologies.some(t => t.toLowerCase() === req.toLowerCase())) score += 2;
      });
      if (score > maxScore) {
        maxScore = score;
        bestMatch = exp.company;
      }
    });

    // Look in projects
    resume.projects.forEach(proj => {
      let score = 0;
      if (proj.name.toLowerCase().includes(req.toLowerCase())) score += 3;
      if (proj.technologies.some(t => t.toLowerCase() === req.toLowerCase())) score += 2;
      if (proj.description.toLowerCase().includes(req.toLowerCase())) score += 1;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = `Project: ${proj.name}`;
      }
    });

    mappings.push({
      jd_requirement: `demonstrated expertise in ${req}`,
      matching_experience: bestMatch,
      match_strength: maxScore > 2 ? "strong" : maxScore > 0 ? "moderate" : "weak",
      gap_notes: maxScore === 0 ? `No direct experience with ${req} found in resume.` : `Matches tech stack in ${bestMatch}.`
    });
  });

  return mappings;
}

/**
 * Heuristic bullet generation fallback when LLM is unavailable.
 */
export function heuristicGenerateBullets(
  mappings: RequirementMapping[],
  resume: ResumeExtractedData
): GeneratedBulletItem[] {
  return mappings
    .filter(m => m.match_strength === "strong" || m.match_strength === "moderate")
    .map(m => {
      const expName = m.matching_experience;
      const req = m.jd_requirement;

      // Try to find matching original bullet from resume
      let originalBulletText = "Led development of core modules and data preprocessing pipelines.";
      
      if (expName.startsWith("Project: ")) {
        const pName = expName.replace("Project: ", "").trim();
        const proj = resume.projects.find(p => p.name.toLowerCase() === pName.toLowerCase());
        if (proj) originalBulletText = proj.description;
      } else {
        const exp = resume.experience.find(e => e.company.toLowerCase() === expName.toLowerCase());
        if (exp && exp.bullets.length > 0) {
          originalBulletText = exp.bullets[0].original_text;
        }
      }

      // Generate standard variants
      const metric_heavy = `Optimized performance for ${req} within ${expName}, reducing latency and achieving [METRIC: system speedup %].`;
      const impact_heavy = `Managed execution of ${req} projects in ${expName}, driving collaboration and delivering [METRIC: business outcome].`;
      const technical_heavy = `Architected data integration using ${req} at ${expName}, ensuring highly scalable, decoupled microservices.`;

      return {
        jd_requirement: req,
        matching_experience: expName,
        variants: { metric_heavy, impact_heavy, technical_heavy },
        confidence_score: 60,
        validation_results: {
          metric_heavy: { is_safe: true, score: 100 },
          impact_heavy: { is_safe: true, score: 100 },
          technical_heavy: { is_safe: true, score: 100 }
        }
      };
    });
}

/**
 * Coordinates the 3-pass generation pipeline.
 */
export async function generateMultiPassBullets(
  resume: ResumeExtractedData,
  jd: StructuredJdData,
  onProgress?: (progress: PipelineProgress) => void
): Promise<MultiPassBulletResult> {
  const updateProgress = (stage: PipelineProgress["stage"], percent: number, message: string) => {
    if (onProgress) onProgress({ stage, percent, message });
  };

  try {
    // ── PASS 1: REQUIREMENT MAPPING ──
    updateProgress("mapping", 15, "Pass 1/3: Analyzing job requirements and mapping candidate experiences...");

    const mappingPrompt = `You are a career gap analyst and expert technical recruiter. Compare the target Job Description (JD) hard requirements against the Candidate's Resume.
For each JD hard requirement, find the best matching candidate experience (company or project).
Provide match_strength (strong/moderate/weak/none) and gap_notes.

JD Hard Requirements:
${JSON.stringify(jd.hard_requirements || [])}

Candidate Experience:
${JSON.stringify(resume.experience.map(e => ({ company: e.company, title: e.title, bullets: e.bullets.map(b => b.original_text) })))}
${JSON.stringify(resume.projects.map(p => ({ name: p.name, description: p.description, technologies: p.technologies })))}

Return ONLY a valid JSON list matching this structure:
{
  "mappings": [
    { "jd_requirement": "exact name of requirement", "matching_experience": "company name or project name", "match_strength": "strong" | "moderate" | "weak" | "none", "gap_notes": "" }
  ]
}`;

    let mappings: RequirementMapping[] = [];

    try {
      const { data: mapData, error: mapError } = await supabase.functions.invoke("analyze", {
        body: {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: mappingPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.1
        }
      });

      if (mapError) throw new Error(mapError.message);
      const content = mapData?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty mapping response.");
      
      const parsed = JSON.parse(content);
      mappings = parsed.mappings || [];
    } catch (err) {
      console.warn("[MultiPassBulletGenerator] Pass 1 mapping failed, falling back to heuristics:", err);
      mappings = heuristicMapRequirements(resume, jd);
    }

    // ── PASS 2: BULLET GENERATION ──
    updateProgress("generating", 45, "Pass 2/3: Synthesizing STAR-framework bullet variants...");

    const activeMappings = mappings.filter(m => m.match_strength === "strong" || m.match_strength === "moderate");
    
    let generatedItems: GeneratedBulletItem[] = [];

    if (activeMappings.length > 0) {
      const generationPrompt = `You are an elite resume writer. Write 3 high-impact bullet points (Metric-Heavy, Impact-Heavy, Technical-Heavy) for each mapped requirement.
Rules:
1. Use the STAR framework (Situation, Task, Action, Result).
2. Keep bullets strictly 1-2 lines (110-250 characters).
3. Do NOT hallucinate metrics. Use ONLY metrics found in the Candidate Facts below, OR use a clear placeholder in this format: [METRIC: detailed context].
4. Align the tone with the JD company culture: ${jd.company_context?.work_style || "collaborative"} and ${jd.company_context?.communication_style || "professional"}.

Candidate Facts & Metrics:
${JSON.stringify(resume.experience)}
${JSON.stringify(resume.projects)}

Mapped Requirements:
${JSON.stringify(activeMappings)}

Return ONLY a valid JSON list matching this structure:
{
  "bullets": [
    {
      "jd_requirement": "jd_requirement from map",
      "matching_experience": "matching_experience from map",
      "variants": {
        "metric_heavy": "A bullet leading with or emphasizing numbers/savings",
        "impact_heavy": "A bullet emphasizing business outcome, leadership, or ownership",
        "technical_heavy": "A bullet detailing the exact stack, tools, and technical architecture used"
      }
    }
  ]
}`;

      try {
        const { data: genData, error: genError } = await supabase.functions.invoke("analyze", {
          body: {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: generationPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.2
          }
        });

        if (genError) throw new Error(genError.message);
        const genContent = genData?.choices?.[0]?.message?.content;
        if (!genContent) throw new Error("Empty generation response.");

        const parsedGen = JSON.parse(genContent);
        
        // Match items
        const rawBullets = parsedGen.bullets || [];
        rawBullets.forEach((rb: unknown) => {
          const bullet = rb as { jd_requirement?: string; matching_experience?: string; variants?: unknown; confidence_score?: number };
          if (bullet.jd_requirement && bullet.matching_experience && bullet.variants) {
            const bVariants = bullet.variants as { metric_heavy?: string; impact_heavy?: string; technical_heavy?: string };
            generatedItems.push({
              jd_requirement: bullet.jd_requirement,
              matching_experience: bullet.matching_experience,
              variants: {
                metric_heavy: cleanText(bVariants.metric_heavy || ""),
                impact_heavy: cleanText(bVariants.impact_heavy || ""),
                technical_heavy: cleanText(bVariants.technical_heavy || "")
              },
              confidence_score: 100,
              validation_results: {
                metric_heavy: { is_safe: true, score: 100 },
                impact_heavy: { is_safe: true, score: 100 },
                technical_heavy: { is_safe: true, score: 100 }
              }
            });
          }
        });
      } catch (err) {
        console.warn("[MultiPassBulletGenerator] Pass 2 generation failed, falling back to heuristics:", err);
        generatedItems = heuristicGenerateBullets(activeMappings, resume);
      }
    }

    // ── PASS 3: VALIDATION & POLISH ──
    updateProgress("polishing", 80, "Pass 3/3: Running hallucination guardrails and auditing metrics...");

    generatedItems.forEach(item => {
      // Validate Metric-Heavy
      const vMetric = validateGeneratedContent(item.variants.metric_heavy, resume);
      item.variants.metric_heavy = vMetric.corrected_text;
      item.validation_results.metric_heavy = {
        is_safe: vMetric.is_safe,
        score: vMetric.score,
        issue: vMetric.findings.map(f => f.issue_description).join(", ") || undefined
      };

      // Validate Impact-Heavy
      const vImpact = validateGeneratedContent(item.variants.impact_heavy, resume);
      item.variants.impact_heavy = vImpact.corrected_text;
      item.validation_results.impact_heavy = {
        is_safe: vImpact.is_safe,
        score: vImpact.score,
        issue: vImpact.findings.map(f => f.issue_description).join(", ") || undefined
      };

      // Validate Technical-Heavy
      const vTech = validateGeneratedContent(item.variants.technical_heavy, resume);
      item.variants.technical_heavy = vTech.corrected_text;
      item.validation_results.technical_heavy = {
        is_safe: vTech.is_safe,
        score: vTech.score,
        issue: vTech.findings.map(f => f.issue_description).join(", ") || undefined
      };

      // Confidence score is the average of validation scores
      item.confidence_score = Math.round(
        (vMetric.score + vImpact.score + vTech.score) / 3
      );
    });

    // ── GATHER UNMAPPED REQUIREMENTS ──
    const unmapped_requirements = mappings
      .filter(m => m.match_strength === "weak" || m.match_strength === "none")
      .map(m => {
        let suggestion = `Review courses or complete a small project in ${m.jd_requirement} to add it to your skillset.`;
        if (m.jd_requirement.toLowerCase().includes("dbt")) {
          suggestion = "Highlight your DataCamp AI Engineer training or self-study dbt projects. Build a basic dbt repository on GitHub.";
        } else if (m.jd_requirement.toLowerCase().includes("airflow") || m.jd_requirement.toLowerCase().includes("orchestration")) {
          suggestion = "Mention experience configuring CRON schedulers or review Apache Airflow fundamentals. Create a simple workflow DAG.";
        }
        return {
          requirement: m.jd_requirement,
          suggestion
        };
      });

    // Compute overall quality score
    const totalItems = generatedItems.length;
    const overall_quality_score = totalItems > 0
      ? Math.round(generatedItems.reduce((acc, item) => acc + item.confidence_score, 0) / totalItems)
      : 80;

    updateProgress("complete", 100, "Calibration completed. Resume bullets tailored successfully.");

    return {
      generated_bullets: generatedItems,
      unmapped_requirements,
      overall_quality_score
    };

  } catch (err: unknown) {
    console.error("[MultiPassBulletGenerator] Fatal error:", err);
    updateProgress("complete", 100, "Error calibrating bullets.");
    throw err;
  }
}
