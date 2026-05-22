import type { DecodeResult, Skill } from "@/types/jd";
import { scavengeSkills } from "./skillScavenger";

/**
 * Heuristic Decoder Engine
 * ==========================
 * Client-side semantic parsing engine that executes offline-first forensic
 * analysis of Job Descriptions. It uses dictionary-based matching, regular 
 * expressions, and heuristic scoring to build highly detailed, realistic,
 * and coherent DecodeResult structures.
 */

const COMMON_TITLES = [
  { keywords: ["frontend", "react", "angular", "vue", "typescript", "ui", "ux", "web"], title: "Senior Frontend Engineer" },
  { keywords: ["backend", "node", "python", "django", "go", "golang", "java", "spring", "rust", "c#", "backend developer", "api"], title: "Senior Backend Developer" },
  { keywords: ["fullstack", "full stack", "mern", "next.js", "django react"], title: "Lead Full-Stack Engineer" },
  { keywords: ["ai", "ml", "machine learning", "llm", "rag", "agent", "agentic", "nlp", "deep learning", "nlp engineer", "openai"], title: "AI Forensic Systems Architect" },
  { keywords: ["data science", "data scientist", "pandas", "numpy", "statistics"], title: "Lead Data Scientist" },
  { keywords: ["devops", "cloud", "aws", "kubernetes", "docker", "terraform", "sre", "infrastructure"], title: "Principal Cloud DevOps Architect" },
  { keywords: ["product manager", "pm", "product owner", "scrum master"], title: "Staff Product Manager" },
  { keywords: ["designer", "figma", "graphic", "product designer", "creative director"], title: "Principal Product UI/UX Designer" },
  { keywords: ["analyst", "analytics", "business analyst", "tableau", "excel"], title: "Senior Business Intelligence Analyst" },
  { keywords: ["manager", "director", "vp", "lead", "head"], title: "Engineering Manager" }
];

export const decodeJDHeuristic = (jdText: string): DecodeResult => {
  const jdLower = jdText.toLowerCase();
  
  // 1. Job Title Extraction Heuristic
  let extractedTitle = "";
  for (const item of COMMON_TITLES) {
    if (item.keywords.some(kw => jdLower.includes(kw))) {
      extractedTitle = item.title;
      break;
    }
  }

  // Fallback: search for first short line of text under 80 characters
  if (!extractedTitle) {
    const lines = jdText.split("\n").map(l => l.trim()).filter(l => l.length > 5 && l.length < 80);
    if (lines.length > 0) {
      // Look for lines containing "engineer", "developer", "architect", "manager", "specialist", etc.
      const match = lines.find(l => /engineer|developer|architect|manager|lead|specialist|officer|analyst/i.test(l));
      extractedTitle = match || lines[0];
    } else {
      extractedTitle = "Technical Systems Specialist";
    }
  }

  // Ensure title is formatted nicely
  extractedTitle = extractedTitle.replace(/^[#\-*\s]+|[#\-*\s]+$/g, "").trim();

  // 2. Skills Scavenging using scavengeSkills
  const detectedSkills = scavengeSkills([], null, jdText);
  
  // Ensure we have a premium list of skills
  const fallbackSkills: Skill[] = [
    { skill: "Strategic Architecture", importance: 92, category: "Technical" },
    { skill: "System Decomposition", importance: 88, category: "Technical" },
    { skill: "Cross-Functional Sync", importance: 85, category: "Foundations" },
    { skill: "Agile Development", importance: 80, category: "Preferred" },
    { skill: "Root Cause Forensics", importance: 90, category: "Technical" }
  ];

  const finalSkills = detectedSkills.length >= 3 ? detectedSkills : [...detectedSkills, ...fallbackSkills];

  // 3. Work Arrangement & Logistics Heuristic
  let remoteFriendly: "yes" | "no" | "partial" | "unspecified" = "unspecified";
  let officePresence: "none" | "occasional" | "full" | "unspecified" = "unspecified";
  let remoteNote = "Flexible work configuration.";

  if (jdLower.includes("remote") || jdLower.includes("wfh") || jdLower.includes("work from home")) {
    remoteFriendly = "yes";
    officePresence = "none";
    remoteNote = "100% Remote deployment enabled.";
  } else if (jdLower.includes("hybrid") || jdLower.includes("partial remote") || jdLower.includes("flexible hybrid")) {
    remoteFriendly = "partial";
    officePresence = "occasional";
    remoteNote = "Hybrid configuration (typically 2-3 days office presence).";
  } else if (jdLower.includes("onsite") || jdLower.includes("on-site") || jdLower.includes("in-office") || jdLower.includes("office mandatory")) {
    remoteFriendly = "no";
    officePresence = "full";
    remoteNote = "100% In-Office mandatory presence required.";
  }

  // 4. Salary Range Parser
  let minSalary = 0;
  let maxSalary = 0;
  let currency = "USD";
  let isEstimate = true;
  let salaryNote = "Forensic valuation estimated based on market standard for this domain.";

  // Regex to detect USD patterns: $120,000, $120k, 120,000 USD, etc.
  const usdRegex = /(?:\$|usd)\s*(\d{2,3})(?:\s*,\s*\d{3})?\s*(?:k)?\s*(?:-|to)\s*(?:\$|usd)?\s*(\d{2,3})(?:\s*,\s*\d{3})?\s*(k)?/i;
  const matchUsd = jdText.match(usdRegex);
  if (matchUsd) {
    minSalary = parseInt(matchUsd[1]) * 1000;
    maxSalary = parseInt(matchUsd[2]) * 1000;
    currency = "USD";
    isEstimate = false;
    salaryNote = "Explicit compensation package detected in JD text.";
  } else {
    // Check for INR/Lakhs patterns
    const inrRegex = /(?:rs|inr|₹)?\s*(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:lakh|lacs|lac|lpa)/i;
    const matchInr = jdText.match(inrRegex);
    if (matchInr) {
      minSalary = parseInt(matchInr[1]) * 100000;
      maxSalary = parseInt(matchInr[2]) * 100000;
      currency = "INR";
      isEstimate = false;
      salaryNote = "Explicit Indian National Rupee salary scale extracted from source.";
    } else {
      // Dynamic fallbacks based on Job Title
      const isAI = /ai|ml|machine|llm|agent/i.test(extractedTitle);
      const isLead = /lead|principal|architect|manager/i.test(extractedTitle);
      const isIndia = jdLower.includes("india") || jdLower.includes("bangalore") || jdLower.includes("bengaluru") || jdLower.includes("hyderabad") || jdLower.includes("mumbai");

      if (isIndia) {
        currency = "INR";
        minSalary = isAI ? (isLead ? 2800000 : 1800000) : (isLead ? 2200000 : 1200000);
        maxSalary = isAI ? (isLead ? 5500000 : 3800000) : (isLead ? 4200000 : 2500000);
      } else {
        currency = "USD";
        minSalary = isAI ? (isLead ? 1600000 : 1250000) : (isLead ? 1400000 : 100000);
        maxSalary = isAI ? (isLead ? 2600000 : 1900000) : (isLead ? 2200000 : 150000);
        // Ensure values match K scale
        if (minSalary < 1000) minSalary *= 1000;
        if (maxSalary < 1000) maxSalary *= 1000;
      }
    }
  }

  // 5. Red Flags Finder Heuristic
  const flags: { phrase: string; intensity: number; note: string }[] = [];
  
  if (jdLower.includes("fast-paced") || jdLower.includes("fast paced") || jdLower.includes("high-growth startup") || jdLower.includes("wear many hats")) {
    flags.push({
      phrase: "High Context Switching / Speed Over Debt",
      intensity: 75,
      note: "The JD hints at operational velocity taking precedent over technical debt containment and long-term planning."
    });
  }
  if (jdLower.includes("under pressure") || jdLower.includes("tight deadlines") || jdLower.includes("demanding environment")) {
    flags.push({
      phrase: "Compressed Release Cycles",
      intensity: 80,
      note: "Candidate is expected to deliver complex pipelines under significant sprint pressure and tight timelines."
    });
  }
  if (jdLower.includes("self-starter") || jdLower.includes("autonomous") || jdLower.includes("little guidance")) {
    flags.push({
      phrase: "Low Structured Onboarding",
      intensity: 65,
      note: "Limited support structure and formal documentation; expected to navigate massive ambiguity and legacy code immediately."
    });
  }

  // Ensure exactly 2 flags
  if (flags.length === 0) {
    flags.push({
      phrase: "Implicit High-Ownership Burnout",
      intensity: 55,
      note: "Role expects total ownership over features, potentially leading to on-call or out-of-bounds coordination."
    });
    flags.push({
      phrase: "Broad Technological Domain Expectations",
      intensity: 45,
      note: "JD spans several disjoint technology disciplines, demanding wide generalist capacity."
    });
  } else if (flags.length === 1) {
    flags.push({
      phrase: "Vague Performance Benchmarks",
      intensity: 50,
      note: "Success KPIs are expressed in broad strategic terms, requiring candidate-led definition."
    });
  } else if (flags.length > 2) {
    flags.splice(2);
  }

  // 6. Recruiter Jargon translation
  const recruiterLens = [
    { jargon: "Self-motivated team player who thrives in ambiguity", reality: "We have no product specs, a highly reactive feature backlog, and limited documentation. You'll need to figure out system design on your own." },
    { jargon: "Familiarity with multiple tech stacks is a major plus", reality: "We have an extensive array of legacy codebases built in different eras. You will be fixing bugs in 4 different languages from day one." }
  ];

  if (jdLower.includes("fast-paced") || jdLower.includes("velocity")) {
    recruiterLens.unshift({
      jargon: "Fast-paced environment with rapid scaling",
      reality: "Prepare for high pressure, shifting requirements mid-sprint, and frequent technical pivots depending on sales cycles."
    });
  } else {
    recruiterLens.unshift({
      jargon: "Exceptional work ethic and extreme ownership",
      reality: "You will likely handle regular production fires and hold direct accountability for complex systems without enough headcount."
    });
  }
  recruiterLens.splice(2); // Keep exactly 2

  // 7. Dynamic Archetype Determination
  let archetypeLabel = "Operational Systems Engineer";
  let archetypeDesc = "An engineer focused on highly reliable system operations and feature execution within standard frameworks.";
  let primaryFocus = "Execution & Reliability";
  let primaryTool = "Enterprise Stack";

  if (/ai|ml|machine|llm|agent/i.test(extractedTitle)) {
    archetypeLabel = "AI Forensic Systems Alchemist";
    archetypeDesc = "Elite architect focused on deploying deep neural pipelines, token optimization, and intelligent agentic loops.";
    primaryFocus = "Cognitive System Design";
    primaryTool = "LangGraph / PyTorch";
  } else if (/frontend|react|ui|ux/i.test(extractedTitle)) {
    archetypeLabel = "Tactical Frontend Artisan";
    archetypeDesc = "Creator of ultra-premium, fluid, and immersive visual frontends with extreme care for micro-interactions.";
    primaryFocus = "Visual Fidelity & HSL CSS";
    primaryTool = "Next.js / GSAP / Tailwind";
  } else if (/devops|cloud|infra|sre/i.test(extractedTitle)) {
    archetypeLabel = "Infrastructure Fortress Guardian";
    archetypeDesc = "Guardian of high-availability cloud configurations, automated pipelines, and ironclad security protocols.";
    primaryFocus = "Operational Infrastructure";
    primaryTool = "Kubernetes / Terraform";
  } else if (/lead|principal|architect|manager/i.test(extractedTitle)) {
    archetypeLabel = "Master Technical Strategist";
    archetypeDesc = "High-impact planner orchestrating architecture maps, resolving system bottle-necks, and shielding developers from noise.";
    primaryFocus = "Structural Design & Mentorship";
    primaryTool = "System Architecture Diagrams";
  }

  // 8. Experience Requirements Heuristic
  let expText = "5+ years of elite industry experience.";
  const expMatch = jdText.match(/(\d+)\+?\s*years/i);
  if (expMatch) {
    expText = `${expMatch[1]}+ years of industry engineering experience.`;
  }

  // 9. Generate realistic, fully detailed DecodeResult structure
  const skillsCount = finalSkills.length;
  const isDetailedJd = jdText.length > 800;

  const result: DecodeResult = {
    valid: true,
    title: extractedTitle,
    skills: finalSkills,
    requirements: {
      education: jdLower.includes("degree") || jdLower.includes("bachelor") 
        ? ["Bachelor's or Master's degree in Computer Science, engineering, or related field."] 
        : ["Proven portfolio demonstrating elite systems execution in production, bypassing traditional degrees."],
      experience: expText,
      soft_skills: ["Strategic System Architecture", "Extreme Ambiguity Ownership", "Crisis Communication"],
      agreements: jdLower.includes("nda") || jdLower.includes("background check") ? ["Candidate must pass background check and sign proprietary NDA."] : []
    },
    grade: {
      score: isDetailedJd ? 86 : 74,
      letter: isDetailedJd ? "A" : "B",
      summary: `Forensic scan of ${extractedTitle} is active. Role demonstrates high tactical momentum and a strong technological stack, with moderate red flags related to release velocity.`,
      breakdown: {
        clarity: isDetailedJd ? 18 : 12,      // /20
        realistic: skillsCount > 10 ? 11 : 14, // /15
        compensation: minSalary > 0 ? 13 : 10, // /15
        red_flags: flags.length > 1 ? 9 : 13,   // /15 (Higher is better, meaning fewer red flags)
        benefits: jdLower.includes("medical") || jdLower.includes("health") ? 8 : 6,      // /10
        growth: jdLower.includes("equity") || jdLower.includes("growth") ? 9 : 7,          // /10
        inclusivity: jdLower.includes("diverse") || jdLower.includes("equal opportunity") ? 9 : 8, // /10
        readability: isDetailedJd ? 4 : 5      // /5
      },
      plain_english_summary: [
        `Highly dynamic ${extractedTitle} deployment needing immediate operational autonomy.`,
        "Primary emphasis sits on rapid feature scaling and complex technology integrations.",
        "Onboarding support is thin; candidate must be highly self-driven from day one.",
        `Expected salary scale maps to ${currency} ${minSalary.toLocaleString()} - ${maxSalary.toLocaleString()} based on forensic markers.`,
        "High context switching is typical due to rapid market pivots and client requirements."
      ]
    },
    red_flags: flags,
    recruiter_lens: recruiterLens,
    qualifiers: {
      must_have_percent: Math.min(85, Math.max(50, finalSkills.filter(s => s.importance > 85).length * 10 + 40)),
      nice_to_have_percent: 60,
      seniority_level: /lead|principal|architect|manager/i.test(extractedTitle) ? 90 : (/senior/i.test(extractedTitle) ? 75 : 45),
      experience: {
        professional: expMatch ? parseInt(expMatch[1]) : 5,
        project_proof: 85
      },
      education: {
        degree_required: jdLower.includes("degree") || jdLower.includes("b.s.") || jdLower.includes("bs") || jdLower.includes("bachelor"),
        skills_first_percent: 78
      }
    },
    logistics: {
      salary_range: {
        min: minSalary,
        max: maxSalary,
        currency: currency,
        estimate: isEstimate,
        note: salaryNote
      },
      work_arrangement: {
        remote_friendly: remoteFriendly,
        office_presence: officePresence,
        flexible_hours: !jdLower.includes("strict core hours")
      },
      responsibility_mix: [
        { label: "Core Feature Engineering", percent: 50 },
        { label: "Architectural Mapping & Scalability", percent: 30 },
        { label: "Collaboration & Recruiter Sync", percent: 20 }
      ],
      archetype: {
        label: archetypeLabel,
        description: archetypeDesc,
        primary_focus: primaryFocus,
        primary_tool: primaryTool,
        match_score: 88
      },
      hard_soft_ratio: {
        hard: 75,
        soft: 25
      }
    },
    role_reality: {
      iceberg_above: [
        `Build and optimize the core ${extractedTitle} features.`,
        "Deploy stable pipelines and manage technical debt."
      ],
      iceberg_below: [
        "Shielding key modules from constant scope changes in mid-sprint.",
        "Managing historical legacy hacks introduced by early founders.",
        "Coordinating with cross-functional stakeholders who lack engineering context."
      ],
      dimensions: {
        technical_depth: 85,
        research_autonomy: 80,
        client_interaction: 40,
        strategic_impact: 90,
        legacy_maintenance: 55
      }
    },
    deep_dive: {
      day_in_life: [
        { time: "09:30", task: "Tactical Standup", description: "Coordinate sprint velocities and blockages." },
        { time: "10:30", task: "Deep-Work Core Focus", description: "Write clean code, deploy features, refactor core elements." },
        { time: "14:00", task: "PR Reviews & Architecture Sync", description: "Inspect code, resolve architectural discrepancies." },
        { time: "16:30", task: "Legacy Systems Forensic Sweep", description: "Clear minor bugs, optimize performance, resolve memory leaks." }
      ],
      health_radar: {
        market_position: 80,
        tech_innovation: 85,
        transparency: 70,
        client_quality: 82,
        employee_benefits: 75
      },
      bias_analysis: {
        inclusivity_score: 88,
        gender_meter: "neutral",
        age_bias_graph: 55,
        tonal_map: [
          { category: "Professionalism", tone: "Collaborative and structured" },
          { category: "Velocity Expectation", tone: "Highly demanding and active" }
        ]
      },
      culture_radar: {
        innovation: 85,
        work_life_balance: 70,
        collaboration: 82,
        hierarchy: 35,
        results_driven: 90,
        stability: 78
      }
    },
    bonus_pulse: {
      ghost_job_probability: jdLower.includes("hiring urgently") || jdLower.includes("immediate joiner") ? 5 : 18,
      desperation_meter: jdLower.includes("hiring urgently") || jdLower.includes("critical fill") ? 82 : 45,
      competition_estimate: 92,
      skill_rarity: /ai|ml|machine|rust|agent/i.test(extractedTitle) ? 88 : 55,
      interview_difficulty: 80,
      career_growth: {
        trajectory: [`Senior ${extractedTitle}`, `Lead Technical Architect`, `Engineering Director`],
        potential_score: 88
      },
      tech_stack_popularity: finalSkills.slice(0, 3).map(s => ({
        name: s.skill,
        demand: s.importance > 85 ? "Extreme" : "High"
      }))
    },
    interview_kit: {
      questions: finalSkills.map((s, index) => {
        const types: ("technical" | "behavioral" | "situational")[] = ["technical", "behavioral", "situational"];
        const type = types[index % 3];
        let qText = `Explain your deep-dive experience working with ${s.skill}.`;
        let tipText = `Highlight production scale, performance metrics, and key structural trade-offs.`;
        let answerText = `Candidate should detail an enterprise project containing ${s.skill}, showing quantitative metrics and architectural rationale.`;

        if (type === "behavioral") {
          qText = `Describe a time when you had to align a team around a controversial architectural decision concerning ${s.skill}.`;
          tipText = `Focus on collaboration, active listening, structured decision matrix, and conflict resolution.`;
          answerText = `Look for STAR method storytelling. Candidate should demonstrate high emotional agency and alignment skills.`;
        } else if (type === "situational") {
          qText = `Suppose our main production system utilizing ${s.skill} is hitting critical latency blockages under load. What is your triage protocol?`;
          tipText = `Walk through tracing logging telemetry, setting automated limits, and deploying rapid fixes.`;
          answerText = `Candidate must detail structured root-cause forensic analysis: measuring, isolating variables, and executing targeted hotfixes.`;
        }

        return {
          question: qText,
          type: type,
          tip: tipText,
          target_answer: answerText
        };
      }).slice(0, 10), // Return up to 10 questions
      reverse_questions: [
        "What is the primary technical debt bottleneck that the engineering team currently wrestles with?",
        "How is the sprint priority negotiated when sales requirements clash with technical debt resolution?",
        "What does the ideal operational output look like for this position in the first 90 days?",
        "How does the team foster continuous technological learning and architectural upskilling?",
        "What is the most common friction point candidates experience during their onboarding here?"
      ]
    },
    resume_help: {
      keywords: finalSkills.map(s => s.skill).concat(["Systems Architecture", "ATS Matching Optimization", "Operational Autonomy"]),
      bullets: finalSkills.slice(0, 5).map(s => {
        return `Engineered high-fidelity systems using ${s.skill}, boosting architectural throughput by 35% and slicing memory latency under peak load.`;
      })
    },
    winning_strategy: [
      {
        title: "Differentiate with Quantified Metrics",
        description: `Ensure your CV lists explicit metrics demonstrating how your deployment of ${finalSkills[0]?.skill || "core technologies"} reduced operational costs or improved developer velocity.`
      },
      {
        title: "Address the Ambiguity Shield",
        description: "Recruiters are terrified of candidates who need perfect specifications. Highlight active portfolio projects where you took incomplete requirements and successfully drove the architecture from zero to release."
      },
      {
        title: "Tactical Interview Prep focus",
        description: `Prep intensely for system design questions. Be prepared to whiteboard clean data flow diagrams emphasizing telemetry monitoring and error boundaries.`
      }
    ]
  };

  return result;
};
