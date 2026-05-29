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
  
  // ── DETECT SENIORITY LEVEL ──
  // Check for experience levels, years, fresher status, etc.
  const isFresher = /fresher|freshers|intern|internship|trainee|campus|graduate|on-campus|entry\s*-?\s*level/i.test(jdLower) ||
                    jdLower.includes("2026 batch") || jdLower.includes("2025 batch") || jdLower.includes("2024 batch") ||
                    jdLower.includes("no experience") || jdLower.includes("0 years") || jdLower.includes("0-1 years") || 
                    jdLower.includes("0-2 years") || jdLower.includes("0 to 2 years") || jdLower.includes("0 to 1 years");

  const isJunior = !isFresher && (/junior|jr|1-2 years|1-3 years|2-3 years|1 to 3 years|1 to 2 years/i.test(jdLower));

  const isSenior = /senior|sr|lead|principal|staff|architect|manager|director|head|vp|executive/i.test(jdLower);

  // ── 1. Job Title Extraction Heuristic ──
  let extractedTitle = "";
  
  // A. Direct label extraction (e.g., Designation: Software Engineer)
  const titleRegexes = [
    /(?:designation|job title|role|position|title)\s*:\s*([^\n\r]+)/i,
    /(?:hiring for|looking for a)\s+([a-zA-Z\s]+(?:engineer|developer|architect|designer|manager|analyst|specialist|intern|associate))/i
  ];
  
  for (const regex of titleRegexes) {
    const match = jdText.match(regex);
    if (match && match[1] && match[1].trim().length > 3 && match[1].trim().length < 80) {
      extractedTitle = match[1].replace(/^[#\-*\s]+|[#\-*\s]+$/g, "").trim();
      break;
    }
  }

  // B. Fallback to dictionary matching
  if (!extractedTitle) {
    for (const item of COMMON_TITLES) {
      if (item.keywords.some(kw => {
        if (kw.length <= 3) {
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          return regex.test(jdText);
        }
        return jdLower.includes(kw);
      })) {
        extractedTitle = item.title;
        break;
      }
    }
  }

  // C. Generic Fallback
  if (!extractedTitle) {
    const lines = jdText.split("\n").map(l => l.trim()).filter(l => l.length > 5 && l.length < 80);
    if (lines.length > 0) {
      const match = lines.find(l => /engineer|developer|architect|manager|lead|specialist|officer|analyst/i.test(l));
      extractedTitle = match || lines[0];
    } else {
      extractedTitle = isFresher ? "Software Engineer" : "Technical Systems Specialist";
    }
  }

  // D. Adjust Title Prefix based on seniority
  extractedTitle = extractedTitle.replace(/^[#\-*\s]+|[#\-*\s]+$/g, "").trim();
  if (isFresher || isJunior) {
    // Strip "Senior", "Lead", "Principal", "Staff", etc.
    extractedTitle = extractedTitle
      .replace(/\b(senior|lead|principal|staff|sr\.?|lead|chief)\b/gi, "")
      .replace(/\barchitect\b/gi, "Engineer")
      .replace(/\s+/g, " ")
      .trim();
    
    // Capitalize properly
    extractedTitle = extractedTitle.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    if (isFresher && !extractedTitle.toLowerCase().includes("fresher") && !extractedTitle.toLowerCase().includes("intern") && !extractedTitle.toLowerCase().includes("junior") && !extractedTitle.toLowerCase().includes("entry")) {
      extractedTitle = `${extractedTitle} (Entry Level / Fresher)`;
    } else if (isJunior && !extractedTitle.toLowerCase().includes("junior") && !extractedTitle.toLowerCase().includes("entry")) {
      extractedTitle = `${extractedTitle} (Junior)`;
    }
  }

  // 2. Skills Scavenging using scavengeSkills
  const detectedSkills = scavengeSkills([], null, jdText);
  
  // Make fallbacks seniority-calibrated so freshers do not get "Strategic Architecture"
  let fallbackSkills: Skill[] = [];
  if (isFresher || isJunior) {
    if (/frontend|react|ui|ux|web/i.test(extractedTitle)) {
      fallbackSkills = [
        { skill: "JavaScript Core & DOM", importance: 90, category: "Technical" },
        { skill: "HTML5 & CSS3 Responsive Layouts", importance: 88, category: "Technical" },
        { skill: "React Basics & Components", importance: 85, category: "Technical" },
        { skill: "Git & Version Control", importance: 80, category: "Foundations" },
        { skill: "Clean Code & Debugging", importance: 82, category: "Foundations" }
      ];
    } else if (/backend|node|python|java|api/i.test(extractedTitle)) {
      fallbackSkills = [
        { skill: "Core Programming Logic", importance: 90, category: "Technical" },
        { skill: "Basic SQL & Databases", importance: 88, category: "Technical" },
        { skill: "REST API Principles", importance: 85, category: "Technical" },
        { skill: "Git & GitHub Workflow", importance: 80, category: "Foundations" },
        { skill: "Data Structures & Algorithms", importance: 82, category: "Foundations" }
      ];
    } else {
      fallbackSkills = [
        { skill: "Core Data Structures & Algorithms", importance: 92, category: "Technical" },
        { skill: "Object-Oriented Programming (OOP)", importance: 88, category: "Technical" },
        { skill: "Web Fundamentals (HTML/CSS/JS)", importance: 85, category: "Technical" },
        { skill: "Git & Version Control", importance: 80, category: "Foundations" },
        { skill: "Basic Testing & Debugging", importance: 82, category: "Foundations" }
      ];
    }
  } else {
    fallbackSkills = [
      { skill: "Strategic Architecture", importance: 92, category: "Technical" },
      { skill: "System Decomposition", importance: 88, category: "Technical" },
      { skill: "Cross-Functional Sync", importance: 85, category: "Foundations" },
      { skill: "Agile Development", importance: 80, category: "Preferred" },
      { skill: "Root Cause Forensics", importance: 90, category: "Technical" }
    ];
  }

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
  } else if (jdLower.includes("onsite") || jdLower.includes("on-site") || jdLower.includes("in-office") || jdLower.includes("office mandatory") || jdLower.includes("wfo")) {
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
    // Check for INR/Lakhs patterns or LPA
    const inrRegex = /(?:rs|inr|₹)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:-|to)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:lakh|lacs|lac|lpa)/i;
    const matchInr = jdText.match(inrRegex);
    if (matchInr) {
      minSalary = Math.round(parseFloat(matchInr[1]) * 100000);
      maxSalary = Math.round(parseFloat(matchInr[2]) * 100000);
      currency = "INR";
      isEstimate = false;
      salaryNote = "Explicit Indian National Rupee salary scale extracted from source.";
    } else {
      // Dynamic fallbacks based on Job Title & Seniority
      const isAI = /ai|ml|machine|llm|agent/i.test(extractedTitle);
      const isIndia = jdLower.includes("india") || jdLower.includes("bangalore") || jdLower.includes("bengaluru") || jdLower.includes("hyderabad") || jdLower.includes("mumbai") || jdLower.includes("lpa") || jdLower.includes("lakh");

      if (isIndia) {
        currency = "INR";
        if (isFresher) {
          minSalary = 300000;
          maxSalary = 600000;
        } else if (isJunior) {
          minSalary = 600000;
          maxSalary = 1200000;
        } else {
          minSalary = isAI ? (isSenior ? 2800000 : 1800000) : (isSenior ? 2200000 : 1200000);
          maxSalary = isAI ? (isSenior ? 5500000 : 3800000) : (isSenior ? 4200000 : 2500000);
        }
      } else {
        currency = "USD";
        if (isFresher) {
          minSalary = 50000;
          maxSalary = 80000;
        } else if (isJunior) {
          minSalary = 75000;
          maxSalary = 105000;
        } else {
          minSalary = isAI ? (isSenior ? 160000 : 125000) : (isSenior ? 140000 : 100000);
          maxSalary = isAI ? (isSenior ? 260000 : 190000) : (isSenior ? 220000 : 150000);
        }
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

  if (isFresher || isJunior) {
    archetypeLabel = "Junior Systems Engineer";
    archetypeDesc = "A motivated entry-level developer focusing on mastering core technical execution, coding fundamentals, and expanding skills under guidance.";
    primaryFocus = "Learning & Core Delivery";
    primaryTool = "IDE / Git Workflow";
  } else if (/ai|ml|machine|llm|agent/i.test(extractedTitle)) {
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
  let expText = isFresher ? "Entry Level (Freshers Welcome)" : (isJunior ? "1-3 years of programming experience." : "5+ years of elite industry experience.");
  const expMatch = jdText.match(/(\d+)\+?\s*years?/i);
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
      education: jdLower.includes("degree") || jdLower.includes("bachelor") || jdLower.includes("b.e") || jdLower.includes("btech") 
        ? ["Bachelor's or Master's degree in Computer Science, MCA, B.E., B.Tech, or related field."] 
        : ["Proven portfolio demonstrating core systems execution in production, bypassing traditional degrees."],
      experience: expText,
      soft_skills: isFresher || isJunior
        ? ["Proactive Learning", "Active Collaboration", "Logical Problem Solving"]
        : ["Strategic System Architecture", "Extreme Ambiguity Ownership", "Crisis Communication"],
      agreements: jdLower.includes("nda") || jdLower.includes("background check") ? ["Candidate must pass background check and sign proprietary NDA."] : []
    },
    grade: {
      score: isDetailedJd ? 86 : 74,
      letter: isDetailedJd ? "A" : "B",
      summary: `Forensic scan of ${extractedTitle} is active. Role demonstrates high tactical momentum and a strong technological stack, calibrated for ${isFresher ? "freshers/entry-level" : (isJunior ? "juniors" : "seniors")}.`,
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
        isFresher 
          ? "Primary emphasis sits on solid fundamental coding, git workflows, and rapid learning."
          : "Primary emphasis sits on rapid feature scaling and complex technology integrations.",
        isFresher
          ? "Campus hires and entry-level grads are welcome; mentoring will be provided by senior engineers."
          : "Onboarding support is thin; candidate must be highly self-driven from day one.",
        `Expected salary scale maps to ${currency} ${minSalary.toLocaleString()} - ${maxSalary.toLocaleString()} based on forensic markers.`,
        "High context switching is typical due to rapid market pivots and client requirements."
      ]
    },
    red_flags: flags,
    recruiter_lens: recruiterLens,
    qualifiers: {
      must_have_percent: Math.min(85, Math.max(50, finalSkills.filter(s => s.importance > 85).length * 10 + 40)),
      nice_to_have_percent: 60,
      seniority_level: isFresher ? 15 : (isJunior ? 40 : (/senior/i.test(extractedTitle) ? 75 : 85)),
      experience: {
        professional: expMatch ? parseInt(expMatch[1]) : (isFresher ? 0 : 3),
        project_proof: 85
      },
      education: {
        degree_required: jdLower.includes("degree") || jdLower.includes("b.s.") || jdLower.includes("bs") || jdLower.includes("bachelor") || jdLower.includes("b.e") || jdLower.includes("btech"),
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
      responsibility_mix: isFresher || isJunior
        ? [
            { label: "Core Feature Coding", percent: 70 },
            { label: "Testing & Bug Fixing", percent: 20 },
            { label: "Sprint Learning & Sync", percent: 10 }
          ]
        : [
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
      iceberg_above: isFresher || isJunior
        ? [
            "Learn the codebase rapidly and master environment tools.",
            "Implement features cleanly using core standards."
          ]
        : [
            `Build and optimize the core ${extractedTitle} features.`,
            "Deploy stable pipelines and manage technical debt."
          ],
      iceberg_below: isFresher || isJunior
        ? [
            "Adapting to large production codebases with high complexity.",
            "Navigating undocumented modules and legacy setup quirks.",
            "Translating academic concepts to real-world deployment patterns."
          ]
        : [
            "Shielding key modules from constant scope changes in mid-sprint.",
            "Managing historical legacy hacks introduced by early founders.",
            "Coordinating with cross-functional stakeholders who lack engineering context."
          ],
      dimensions: {
        technical_depth: isFresher ? 55 : (isJunior ? 70 : 85),
        research_autonomy: isFresher ? 50 : (isJunior ? 70 : 90),
        client_interaction: isFresher ? 10 : 40,
        strategic_impact: isFresher ? 30 : 90,
        legacy_maintenance: 55
      }
    },
    deep_dive: {
      day_in_life: isFresher || isJunior
        ? [
            { time: "09:30", task: "Morning Standup & Mentorship Sync", description: "Coordinate sprint tasks and clarify requirements with senior lead." },
            { time: "10:30", task: "Focused Feature Coding", description: "Write clean code, construct unit tests, and resolve backend/frontend tickets." },
            { time: "14:00", task: "Code Review & Collaborative Debugging", description: "Review pull requests, absorb code best practices, and pair program with peers." },
            { time: "16:30", task: "Continuous Learning & Specs Sweep", description: "Study project documentation, learn new libraries, and document progress logs." }
          ]
        : [
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
      interview_difficulty: isFresher ? 55 : (isJunior ? 70 : 80),
      career_growth: {
        trajectory: isFresher || isJunior
          ? ["Associate Software Engineer", "Software Engineer", "Senior Developer", "Tech Lead / Architect"]
          : [`Senior ${extractedTitle}`, `Lead Technical Architect`, `Engineering Director`],
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
        
        let qText = `Explain your core understanding and experience working with ${s.skill}.`;
        let tipText = `Focus on basic structures, standard implementations, and simple projects you have built.`;
        let answerText = `Candidate should detail a clean implementation utilizing ${s.skill}, showing structured logic and proper testing.`;

        if (!isFresher && !isJunior) {
          if (type === "behavioral") {
            qText = `Describe a time when you had to align a team around a controversial architectural decision concerning ${s.skill}.`;
            tipText = `Focus on collaboration, active listening, structured decision matrix, and conflict resolution.`;
            answerText = `Look for STAR method storytelling. Candidate should demonstrate high emotional agency and alignment skills.`;
          } else if (type === "situational") {
            qText = `Suppose our main production system utilizing ${s.skill} is hitting critical latency blockages under load. What is your triage protocol?`;
            tipText = `Walk through tracing logging telemetry, setting automated limits, and deploying rapid fixes.`;
            answerText = `Candidate must detail structured root-cause forensic analysis: measuring, isolating variables, and executing targeted hotfixes.`;
          }
        } else {
          if (type === "behavioral") {
            qText = `Tell me about a time when you ran into a bug with ${s.skill} that you couldn't solve easily. How did you handle it?`;
            tipText = `Focus on systematic troubleshooting, using console.logs/debugging tools, reading documentation, and asking for help.`;
            answerText = `Look for persistence, continuous learning, and proper collaborative growth mindset.`;
          } else if (type === "situational") {
            qText = `If you are assigned a task using ${s.skill} that you have never used before, what is your step-by-step approach to get it done?`;
            tipText = `Talk about researching official documentation, creating a sandbox project, and seeking team feedback.`;
            answerText = `Candidate should demonstrate proactive self-learning protocols and high agency.`;
          }
        }

        return {
          question: qText,
          type: type,
          tip: tipText,
          target_answer: answerText
        };
      }).slice(0, 10), // Return up to 10 questions
      reverse_questions: isFresher || isJunior
        ? [
            "What kind of mentoring and training resources are available for entry-level developers here?",
            "What does a successful first 90 days look like for a fresher in this position?",
            "What are the typical technologies or modules that freshers start working on?",
            "How does the team review code and provide feedback for juniors?",
            "What is the team's culture regarding asking questions and learning new frameworks?"
          ]
        : [
            "What is the primary technical debt bottleneck that the engineering team currently wrestles with?",
            "How is the sprint priority negotiated when sales requirements clash with technical debt resolution?",
            "What does the ideal operational output look like for this position in the first 90 days?",
            "How does the team foster continuous technological learning and architectural upskilling?",
            "What is the most common friction point candidates experience during their onboarding here?"
          ]
    },
    resume_help: {
      keywords: finalSkills.map(s => s.skill).concat(isFresher || isJunior ? ["Algorithms", "Git Flow", "Problem Solving"] : ["Systems Architecture", "ATS Matching Optimization", "Operational Autonomy"]),
      bullets: finalSkills.slice(0, 5).map(s => {
        return isFresher || isJunior
          ? `Developed responsive features and cleanly integrated modules using ${s.skill}, improving load latency by 15% and passing exhaustive testing.`
          : `Engineered high-fidelity systems using ${s.skill}, boosting architectural throughput by 35% and slicing memory latency under peak load.`;
      })
    },
    winning_strategy: isFresher || isJunior
      ? [
          {
            title: "Demonstrate Solid Engineering Foundations",
            description: `Highlight projects in your portfolio where you built robust systems using ${finalSkills[0]?.skill || "core languages"}, showing clean design, proper git commits, and unit tests.`
          },
          {
            title: "Proactive Learning Mindset",
            description: "Show that you are a rapid learner who can read official documentations and quickly build sandboxed working models to master new tools."
          },
          {
            title: "Crush Core Coding Rounds",
            description: "Practice fundamental data structures, algorithms, and logical problem solving, as entry-level screening focus heavily on raw execution logic."
          }
        ]
      : [
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
