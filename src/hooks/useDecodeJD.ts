import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DecodeResult } from "@/types/jd";
import { getCachedDecode, setCachedDecode, clearDecodeCache } from "@/lib/jdCache";
import { clearResumeAnalysisCache } from "@/lib/resumeAnalysisCache";
import { decodeJDHeuristic } from "@/lib/heuristicDecoder";

export const useDecodeJD = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<DecodeResult | null>(() => {
    try {
      const stored = localStorage.getItem("lumina_last_results");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [wasCached, setWasCached] = useState(false);

  useEffect(() => {
    if (results) {
      localStorage.setItem("lumina_last_results", JSON.stringify(results));
    } else {
      localStorage.removeItem("lumina_last_results");
    }
  }, [results]);

  const resetResults = () => setResults(null);

  const decodeJD = async (jdText: string, forceRefresh = false) => {
    if (jdText.trim().length < 20) {
      toast.error("Please paste a job description (min 20 characters).");
      return;
    }

    if (jdText.length > 15000) {
      toast.error("Character Limit Crossed", {
        description: `Max 15,000 characters allowed. Your JD is ${jdText.length.toLocaleString()} characters.`,
        duration: 5000
      });
      return;
    }

    setIsScanning(true);
    setResults(null);
    setWasCached(false);

    // ── CHECK LOCAL STORAGE CACHE FIRST ──
    if (!forceRefresh) {
      try {
        const cached = await getCachedDecode(jdText);
        if (cached) {
          setResults(cached);
          setWasCached(true);
          setIsScanning(false);
          toast.success(`Forensic Intelligence Active: ${cached.title} (Loaded from cache)`, {
            duration: 3000
          });
          return;
        }
      } catch (err) {
        console.warn("Lumina Cache Read Exception:", err);
      }
    }

    try {
      // ── READ CONFIGURATION SETTINGS ──
      const engineMode = localStorage.getItem("lumina_engine_mode") || "default";
      const customProvider = localStorage.getItem("lumina_custom_provider") || "groq";
      const customKey = localStorage.getItem("lumina_custom_key") || "";

      // ── MOCK/HEURISTIC SCANNER FOR LIFETIME RESILIENCY & OFFLINE SANDBOX ──
      if (engineMode === "heuristic") {
        console.log("── SANDBOX HEURISTIC SCAN INITIATED ──");
        // Short artificial delay to make the UX feel premium and deliberate
        await new Promise(resolve => setTimeout(resolve, 800));
        const result = decodeJDHeuristic(jdText);
        await setCachedDecode(jdText, result);
        clearResumeAnalysisCache();
        if (typeof window !== "undefined" && window.sessionStorage) {
          sessionStorage.removeItem("current_roadmap_id");
          sessionStorage.removeItem("current_roadmap_jd_title");
        }
        setResults(result);
        setWasCached(false);
        toast.success(`Forensic Intelligence Active: ${result.title} (Sandbox Engine)`, {
          description: "Using offline-first heuristic pattern scanner.",
          duration: 4000
        });
        setIsScanning(false);
        return;
      }

      let data = null;
      let error = null;

      // ── DUAL DIRECT BROWSER CONNECTION (For User/Developer Keys) ──
      const executeDirectBrowserFetch = async (): Promise<Record<string, unknown>> => {
        const url = customProvider === "openai"
          ? "https://api.openai.com/v1/chat/completions"
          : "https://api.groq.com/openai/v1/chat/completions";
        
        const model = customProvider === "openai" ? "gpt-4o-mini" : "llama-3.3-70b-versatile";
        console.log(`API_DIRECT: Initiating client-side direct request with ${model} on ${url}...`);



        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${customKey.trim()}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `ACT ON THIS JD:\n###\n${jdText.substring(0, 10000)}\n###\n\nRETURN ONLY RAW JSON MATCHING SCHEMA.` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Direct connection key error (${response.status}): ${errorBody.substring(0, 150)}`);
        }

        const resJson = await response.json();
        const contentText = resJson.choices?.[0]?.message?.content;
        if (!contentText) throw new Error("Direct API returned empty text choices.");

        const startIdx = contentText.indexOf('{');
        const endIdx = contentText.lastIndexOf('}');
        return JSON.parse(contentText.substring(startIdx, endIdx + 1));
      };

      const systemPrompt = `You are the Lumina Forensic Intelligence Architect. 
Your goal is to deconstruct JDs into hyper-accurate data structures.

MANDATORY RULES:
1. ESTIMATION IS COMPULSORY: Never return 0, null, or empty for scores or salary. If the JD is vague, use your deep knowledge of the market to provide highly probable estimates.
2. CURRENCY: India roles = INR. 
3. VERDICT: The "grade.summary" MUST be a unique, insightful sentence. The "grade.plain_english_summary" MUST contain EXACTLY 5 key insight points.
4. RED FLAGS: You MUST identify EXACTLY 2 red flags in "red_flags". If none exist, identify subtle competitive risks or growth bottlenecks.
5. INTERVIEW KIT: "interview_kit.questions" MUST contain EXACTLY 10 diverse questions. "interview_kit.reverse_questions" MUST contain EXACTLY 5 strategic questions for the candidate to ask.
6. STRATEGIC DEFICIT: "resume_help.keywords" MUST contain EXACTLY 10-12 high-impact ATS keywords extracted from the JD.
7. ICEBERG: The "role_reality" must contain non-obvious truths about working in this domain.

RETURN ONLY RAW JSON. MATCH THIS NAKED SCHEMA FORMAT EXACTLY:
{
  "valid": true,
  "title": "string",
  "skills": [{"category": "string", "skill": "string", "importance": 90}],
  "requirements": {"education": ["string"], "experience": "string", "soft_skills": ["string"], "agreements": ["string"]},
  "grade": { 
    "score": 85, "letter": "A", "summary": "string", 
    "breakdown": {"clarity": 15, "realistic": 12, "compensation": 12, "red_flags": 13, "benefits": 8, "growth": 8, "inclusivity": 8, "readability": 4}, 
    "plain_english_summary": ["string", "string", "string", "string", "string"] 
  },
  "red_flags": [{"phrase": "string", "intensity": 50, "note": "string"}, {"phrase": "string", "intensity": 50, "note": "string"}],
  "recruiter_lens": [{"jargon": "string", "reality": "string"}, {"jargon": "string", "reality": "string"}],
  "logistics": { 
    "salary_range": {"min": 120000, "max": 180000, "currency": "USD", "estimate": true, "note": "string"}, 
    "work_arrangement": {"remote_friendly": "yes", "office_presence": "none", "flexible_hours": true},
    "archetype": {"label": "string", "description": "string", "primary_focus": "string", "primary_tool": "string", "match_score": 90}
  },
  "bonus_pulse": {"ghost_job_probability": 10, "desperation_meter": 30, "skill_rarity": 60, "interview_difficulty": 80},
  "role_reality": {"iceberg_above": ["string"], "iceberg_below": ["string"]},
  "deep_dive": { 
    "day_in_life": [{"time": "09:30", "task": "string", "description": "string"}],
    "bias_analysis": {"inclusivity_score": 80, "gender_meter": "neutral", "age_bias_graph": 50, "tonal_map": [{"category": "string", "tone": "string"}]},
    "culture_radar": {"innovation": 80, "work_life_balance": 75, "collaboration": 80, "hierarchy": 40, "results_driven": 85, "stability": 70},
    "health_radar": {"market_position": 80, "tech_innovation": 85, "transparency": 70, "client_quality": 80, "employee_benefits": 75}
  },
  "interview_kit": { 
    "questions": [{"question": "string", "type": "technical", "tip": "string", "target_answer": "string"}],
    "reverse_questions": ["string", "string", "string", "string", "string"]
  },
  "resume_help": {"keywords": ["string"], "bullets": ["string"]}
}`;

      if (engineMode === "custom") {
        if (!customKey.trim()) {
          throw new Error("Lumina Auth Error: Custom API Key is missing. Click the API Configuration settings (gear icon) to input your key or switch to Sandbox Mode.");
        }
        try {
          data = await executeDirectBrowserFetch();
          toast.success("Intelligence Active (Direct Browser Connection)", { duration: 4000 });
        } catch (customErr) {
          error = customErr;
          console.error("Direct browser execution failed:", customErr);
        }
      } else {
        // ── CALL TOTAL INTELLIGENCE ENGINE (Supabase Edge Function) ──
        console.log("── LUMINA DEFAULT SERVER ENGINE REQUEST INITIATED ──");
        try {
          const invokePromise = supabase.functions.invoke('decode-jd', {
            body: { jdText }
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout: Supabase function took too long")), 45000)
          );

          const response = await Promise.race([invokePromise, timeoutPromise]) as { data: Record<string, unknown> | null; error: { message?: string; status?: number } | null };
          data = response.data;
          error = response.error;
          // If the edge function returned a JSON error payload, treat it as an error
          if (!error && data?.error) {
            error = new Error(data.error);
            data = null;
          }
        } catch (e) {
          error = e;
        }

        // ── EMERGENCY FALLBACK: Try Local API Proxy if Edge Function Fails ──
        if (error) {
          const errMsg = (error as { message?: string })?.message || '';
          console.warn("Lumina Engine: Edge Function error. Switching to Vercel API Proxy...", errMsg);
          try {
            const apiResponse = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: `ACT ON THIS JD:\n###\n${jdText.substring(0, 10000)}\n###\n\nRETURN ONLY RAW JSON MATCHING SCHEMA.` }
                ],
                response_format: { type: "json_object" }
              })
            });
            if (apiResponse.ok) {
              const fallbackData = await apiResponse.json();
              if (fallbackData?.choices?.[0]?.message?.content) {
                try {
                  data = JSON.parse(fallbackData.choices[0].message.content);
                } catch {
                  data = fallbackData.choices[0].message.content;
                }
              } else {
                data = fallbackData;
              }
              error = null;
              console.log("Lumina Engine: Vercel API Proxy fallback succeeded.");
            } else {
              const fallbackErr = await apiResponse.json().catch(() => ({ error: `HTTP ${apiResponse.status}` }));
              const fullErrMsg = fallbackErr?.details ? `${fallbackErr.error}: ${fallbackErr.details}` : (fallbackErr?.error || `Vercel proxy failed: HTTP ${apiResponse.status}`);
              throw new Error(fullErrMsg);
            }
          } catch (apiErr) {
            console.error("Vercel API Proxy also failed:", apiErr);
            
            // If the user has a custom browser key, attempt that as a secondary backend failure fallback!
            if (customKey.trim()) {
              console.warn("Vercel proxy failed. Trying direct browser connection as final LLM backup...");
              try {
                data = await executeDirectBrowserFetch();
                error = null;
                toast.success("Intelligence Active (Direct Browser Fallback Connection)", { duration: 4000 });
              } catch (customBackupErr) {
                console.error("Direct browser fallback also failed:", customBackupErr);
                throw customBackupErr;
              }
            } else {
              throw apiErr;
            }
          }
        }
      }

      // ── RESILIENT DEGRADATION: Automatically use Heuristic Parser on total LLM failure ──
      if (error || !data) {
        console.warn("── TOTAL SERVER/CLIENT LLM FAILURES ── Gracefully degrading to Premium Offline Heuristic Fallback Engine.");
        data = decodeJDHeuristic(jdText);
        error = null;
        toast.info("Active: Heuristic Fallback Scan", {
          description: "Local forensic pattern engine activated due to server API connection failure. Open settings to configure your credentials.",
          duration: 9000
        });
      }

      // ── JD SIGNAL VALIDATION ──
      if (data.valid === false) {
        toast.error(data.message || "This doesn't appear to be a job description.");
        setIsScanning(false);
        return;
      }


      // ── DATA HYDRATION & PRECISION MAPPING ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hydrate = (raw: Record<string, any>): DecodeResult => {
        // Advanced recursive fuzzy key discovery
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const find = (obj: any, target: string): any => {
          if (!obj || typeof obj !== 'object') return undefined;
          const targetLower = target.toLowerCase().replace(/_/g, '');
          const keys = Object.keys(obj);
          
          if (target in obj) return obj[target];
          
          const foundKey = keys.find(k => {
            const kl = k.toLowerCase().replace(/_/g, '');
            return kl === targetLower || kl.includes(targetLower) || targetLower.includes(kl);
          });
          
          if (foundKey) return obj[foundKey];
          
          // Broad context matching
          if (target === 'day_in_life' && (find(obj, 'timeline') || find(obj, 'schedule') || find(obj, 'routine'))) return find(obj, 'timeline') || find(obj, 'schedule') || find(obj, 'routine');
          if (target === 'interview_kit' && (find(obj, 'questions') || find(obj, 'prep'))) return find(obj, 'questions') || find(obj, 'prep');
          if (target === 'bonus_pulse' && (find(obj, 'market') || find(obj, 'pulse'))) return find(obj, 'market') || find(obj, 'pulse');
          if (target === 'winning_strategy' && (find(obj, 'tactic') || find(obj, 'strategy') || find(obj, 'pivot'))) return find(obj, 'tactic') || find(obj, 'strategy') || find(obj, 'pivot');

          return undefined;
        };

        const rawGrade = find(raw, 'grade') || find(raw, 'verdict') || {};
        const rawReq = find(raw, 'requirements') || find(raw, 'criteria') || {};
        const rawLog = find(raw, 'logistics') || find(raw, 'details') || {};
        const rawDeep = find(raw, 'deep_dive') || find(raw, 'analysis') || {};
        const rawBonus = find(raw, 'bonus_pulse') || find(raw, 'market_signals') || {};
        const rawKit = find(raw, 'interview_kit') || find(raw, 'prep_kit') || {};
        const rawHelp = find(raw, 'resume_help') || find(raw, 'cv_optimization') || {};
        const rawQual = find(raw, 'qualifiers') || find(raw, 'fit_analysis') || {};

        // Precision numeric extractor (strips %, $, , and text)
         
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeNum = (v: any, fallback = 0): number => {
          if (typeof v === 'number') return v;
          if (v === null || v === undefined || v === '') return fallback;
          const s = String(v).toLowerCase().replace(/,/g, '');
          let multiplier = 1;
          if (s.includes('k')) multiplier = 1000;
          if (s.includes('lakh') || s.includes('lac')) multiplier = 100000;
          if (s.includes('cr') || s.includes('crore')) multiplier = 10000000;
          if (s.includes('m')) multiplier = 1000000;
          const match = s.match(/-?\d+(\.\d+)?/);
          return match ? Math.round(parseFloat(match[0]) * multiplier) : (Number(v) || fallback);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeStrItem = (v: any): string => {
          if (v === null || v === undefined) return "";
          if (typeof v === 'object') {
            return Object.values(v)
              .map(val => (typeof val === 'object' ? safeStrItem(val) : String(val)))
              .filter(val => val.trim() !== "")
              .join(" ");
          }
          return String(v);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeArr = (arr: any) => {
            if (!arr) return [];
            const items = Array.isArray(arr) ? arr : [arr];
            return items.filter(v => v !== null && v !== undefined);
        };

        return {
           ...raw,
           title: safeStrItem(find(raw, 'title') || find(raw, 'job_title')) || "Forensic Intelligence Report",
           grade: {
             score: safeNum(find(rawGrade, 'score') || find(raw, 'score'), 75),
             letter: String(find(rawGrade, 'letter') || find(raw, 'letter') || "S"),
             summary: safeStrItem(find(rawGrade, 'summary') || find(raw, 'summary')) || "Forensic analysis active. Role shows high strategic alignment.",
             breakdown: {
                clarity: safeNum(find(rawGrade.breakdown, 'clarity'), 85),
                realistic: safeNum(find(rawGrade.breakdown, 'realistic'), 80),
                compensation: safeNum(find(rawGrade.breakdown, 'compensation'), 75),
                red_flags: safeNum(find(rawGrade.breakdown, 'red_flags'), 5),
                benefits: safeNum(find(rawGrade.breakdown, 'benefits'), 70),
                growth: safeNum(find(rawGrade.breakdown, 'growth'), 90),
                inclusivity: safeNum(find(rawGrade.breakdown, 'inclusivity'), 95),
                readability: safeNum(find(rawGrade.breakdown, 'readability'), 90),
             },
             plain_english_summary: (() => {
               const arr = safeArr(find(rawGrade, 'plain_english_summary'));
               if (arr.length >= 3) return arr.map(i => safeStrItem(i));
               return [
                 ...arr.map(i => safeStrItem(i)),
                 "Role involves high-impact strategic execution within the domain.",
                 "Candidate must demonstrate exceptional ownership and technical precision.",
                 "Innovation-first culture requiring rapid adaptation and elite problem-solving."
               ].slice(0, 3);
             })()
           },
           skills: (safeArr(find(raw, 'skills')) || []).map((s: unknown) => ({
             skill: safeStrItem((s as Record<string, unknown>)?.skill || s),
             importance: safeNum((s as Record<string, unknown>)?.importance, 90),
             category: safeStrItem((s as Record<string, unknown>)?.category || "Technical")
           })),
           red_flags: (() => {
             const rawFlags = safeArr(find(raw, 'red_flags') || find(raw, 'flags') || find(raw, 'risks'));
             if (rawFlags.length > 0) {
               return rawFlags.map((i: unknown) => ({
                 phrase: safeStrItem((i as Record<string, unknown>)?.phrase || i),
                 intensity: safeNum((i as Record<string, unknown>)?.intensity, 40),
                 note: safeStrItem((i as Record<string, unknown>)?.note || "Forensic risk detection active.")
               }));
             }
             return [
               { phrase: "High Growth Pressure", intensity: 45, note: "The role demands rapid scaling and immediate ownership." },
               { phrase: "Vague KPI Definitions", intensity: 35, note: "Success metrics are broad, requiring candidate-led definition." }
             ];
           })(),
           recruiter_lens: (() => {
             const rawLens = safeArr(find(raw, 'recruiter_lens') || find(raw, 'recruiter_logic') || find(raw, 'jargon'));
             if (rawLens.length > 0) {
                return rawLens.map((i: unknown) => ({
                 jargon: safeStrItem((i as Record<string, unknown>)?.jargon || i),
                 reality: safeStrItem((i as Record<string, unknown>)?.reality || "Forensic translation in progress.")
               }));
             }
             return [
               { jargon: "Fast-paced elite team", reality: "Expect high delivery pressure and weekly architectural pivots." },
               { jargon: "Self-starter wanted", reality: "Limited onboarding structure; you must navigate ambiguity independently." }
             ];
           })(),
           requirements: {
             education: safeArr(find(rawReq, 'education')).length > 0 ? safeArr(find(rawReq, 'education')).map(e => safeStrItem(e)) : ["Master's in CS or equivalent field expertise."],
             experience: safeStrItem(find(rawReq, 'experience')) || "7+ years of elite engineering experience.",
             soft_skills: safeArr(find(rawReq, 'soft_skills')).length > 0 ? safeArr(find(rawReq, 'soft_skills')).map(s => safeStrItem(s)) : ["Strategic Reasoning", "Crisis Ownership"],
             agreements: safeArr(find(rawReq, 'agreements')).map(a => safeStrItem(a))
           },
            qualifiers: {
               must_have_percent: safeNum(find(rawQual, 'must_have_percent'), 70),
               nice_to_have_percent: safeNum(find(rawQual, 'nice_to_have_percent'), 50),
               seniority_level: safeNum(find(rawQual, 'seniority_level'), 85),
               experience: {
                 professional: safeNum(find(rawQual?.experience, 'professional'), 8),
                 project_proof: safeNum(find(rawQual?.experience, 'project_proof'), 90)
               },
               education: {
                 degree_required: find(rawQual?.education, 'degree_required') ?? true,
                 skills_first_percent: safeNum(find(rawQual?.education, 'skills_first_percent'), 80)
               }
            },
           logistics: {
              ...rawLog,
              salary_range: {
                min: safeNum(find(rawLog.salary_range, 'min')),
                max: safeNum(find(rawLog.salary_range, 'max')),
                currency: (() => {
                   const c = safeStrItem(find(rawLog.salary_range, 'currency') || "USD").toUpperCase();
                   if (c.includes('$') || c.includes('USD')) return 'USD';
                   if (c.includes('₹') || c.includes('INR')) return 'INR';
                   return c || 'USD';
                })(),
                estimate: rawLog.salary_range?.estimate ?? (safeNum(find(rawLog.salary_range, 'min')) === 0 ? true : false),
                note: safeStrItem(find(rawLog.salary_range, 'note')) || "Forensic valuation based on market signals."
              },
               work_arrangement: {
                  remote_friendly: (safeStrItem(find(rawLog.work_arrangement, 'remote_friendly')) || "unspecified") as "yes" | "no" | "partial" | "unspecified",
                  office_presence: (safeStrItem(find(rawLog.work_arrangement, 'office_presence')) || "unspecified") as "none" | "occasional" | "full" | "unspecified",
                  flexible_hours: find(rawLog.work_arrangement, 'flexible_hours') ?? true
               },
              responsibility_mix: safeArr(find(rawLog, 'responsibility_mix')).length > 0
                ? safeArr(find(rawLog, 'responsibility_mix')).map((rm: unknown) => ({
                    label: safeStrItem((rm as Record<string, unknown>)?.label || rm),
                    percent: safeNum((rm as Record<string, unknown>)?.percent, 50)
                  }))
                : [
                    { label: "High-Focus Engineering", percent: 45 }, 
                    { label: "Strategic Architecture", percent: 30 }, 
                    { label: "Cross-functional Sync", percent: 25 }
                  ],
              archetype: {
                label: safeStrItem(find(rawLog.archetype, 'label')) || "Technical Strategist",
                description: safeStrItem(find(rawLog.archetype, 'description')) || "Elite role focusing on high-impact systems and architectural delivery.",
                primary_focus: safeStrItem(find(rawLog.archetype, 'primary_focus')) || "Operational Excellence",
                primary_tool: safeStrItem(find(rawLog.archetype, 'primary_tool')) || "Modern Tech Stack",
                match_score: safeNum(find(rawLog.archetype, 'match_score'), 90)
              }
           },
           deep_dive: {
              day_in_life: safeArr(find(rawDeep, 'day_in_life')).length > 0
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? safeArr(find(rawDeep, 'day_in_life')).map((dil: any) => ({
                    time: safeStrItem(dil?.time) || "09:00",
                    task: safeStrItem(dil?.task || dil),
                    description: safeStrItem(dil?.description) || "Forensic task execution."
                  }))
                : [
                    { time: "09:00", task: "Strategic Systems Review", description: "Analyzing architecture and technical debt." },
                    { time: "11:00", task: "Engineering Sprint Sync", description: "Coordination with cross-functional leads." },
                    { time: "14:00", task: "Deep-Work: Core Development", description: "High-focus implementation phase." },
                    { time: "17:00", task: "Stakeholder Technical Demo", description: "Presenting agentic flow progress." }
                  ],
              health_radar: {
                market_position: safeNum(find(rawDeep?.health_radar, 'market_position') || find(raw, 'market_position'), 85),
                tech_innovation: safeNum(find(rawDeep?.health_radar, 'tech_innovation') || find(raw, 'tech_innovation'), 90),
                transparency: safeNum(find(rawDeep?.health_radar, 'transparency') || find(raw, 'transparency'), 75),
                client_quality: safeNum(find(rawDeep?.health_radar, 'client_quality') || find(raw, 'client_quality'), 80),
                employee_benefits: safeNum(find(rawDeep?.health_radar, 'employee_benefits') || find(raw, 'employee_benefits'), 80)
              },
              bias_analysis: {
                inclusivity_score: safeNum(find(rawDeep?.bias_analysis, 'inclusivity_score') || find(raw, 'inclusivity_score'), 92),
                 gender_meter: (safeStrItem(find(rawDeep?.bias_analysis, 'gender_meter') || find(raw, 'gender_meter')) || "neutral") as "masculine" | "neutral" | "feminine",
                age_bias_graph: safeNum(find(rawDeep?.bias_analysis, 'age_bias_graph') || find(raw, 'age_bias_graph'), 45),
                tonal_map: (() => {
                  const rawTonal = safeArr(find(rawDeep?.bias_analysis, 'tonal_map') || find(raw, 'tonal_map'));
                  if (rawTonal.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return rawTonal.map((tm: any) => ({
                      category: safeStrItem(tm?.category || tm),
                      tone: safeStrItem(tm?.tone) || "neutral"
                    }));
                  }
                  return [
                    { category: "Professionalism", tone: "Executive" },
                    { category: "Urgency", tone: "High" },
                    { category: "Agency", tone: "Proactive" }
                  ];
                })()
              },
              culture_radar: {
                innovation: safeNum(find(rawDeep?.culture_radar, 'innovation') || find(raw, 'innovation'), 85),
                work_life_balance: safeNum(find(rawDeep?.culture_radar, 'work_life_balance') || find(raw, 'work_life_balance'), 75),
                collaboration: safeNum(find(rawDeep?.culture_radar, 'collaboration') || find(raw, 'collaboration'), 90),
                hierarchy: safeNum(find(rawDeep?.culture_radar, 'hierarchy') || find(raw, 'hierarchy'), 40),
                results_driven: safeNum(find(rawDeep?.culture_radar, 'results_driven') || find(raw, 'results_driven'), 95),
                stability: safeNum(find(rawDeep?.culture_radar, 'stability') || find(raw, 'stability'), 80)
              }
           },
            role_reality: {
              iceberg_above: safeArr(find(raw, 'iceberg_above')).length > 0 ? safeArr(find(raw, 'iceberg_above')) : ["Senior Strategic Architect", "Direct stakeholder pressure"],
              iceberg_below: safeArr(find(raw, 'iceberg_below')).length > 0 ? safeArr(find(raw, 'iceberg_below')) : ["High ownership expectations", "Complex architectural debt"],
              dimensions: {
                technical_depth: safeNum(find(raw?.dimensions, 'technical_depth'), 85),
                research_autonomy: safeNum(find(raw?.dimensions, 'research_autonomy'), 90),
                client_interaction: safeNum(find(raw?.dimensions, 'client_interaction'), 75),
                strategic_impact: safeNum(find(raw?.dimensions, 'strategic_impact'), 95),
                legacy_maintenance: safeNum(find(raw?.dimensions, 'legacy_maintenance'), 40)
              }
            },
            bonus_pulse: {
             ghost_job_probability: safeNum(find(rawBonus, 'ghost_job_probability')) || 5,
             desperation_meter: safeNum(find(rawBonus, 'desperation_meter')) || 25,
             competition_estimate: safeNum(find(rawBonus, 'competition_estimate')) || 90,
             skill_rarity: safeNum(find(rawBonus, 'skill_rarity')) || 95,
             interview_difficulty: safeNum(find(rawBonus, 'interview_difficulty')) || 90,
             career_growth: {
               trajectory: safeArr(find(rawBonus?.career_growth, 'trajectory')).length > 0 ? safeArr(find(rawBonus?.career_growth, 'trajectory')) : ["Lead Architect", "Director of Intelligence"],
               potential_score: safeNum(find(rawBonus?.career_growth, 'potential_score')) || 95
             },
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             tech_stack_popularity: safeArr(find(rawBonus, 'tech_stack_popularity')).map((ts: any) => ({
                name: safeStrItem(ts?.name || ts),
                 demand: (safeStrItem(ts?.demand || "High")) as "Standard" | "High" | "Extreme"
             }))
           },
           interview_kit: {
             questions: safeArr(find(rawKit, 'questions')).length > 0 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? safeArr(find(rawKit, 'questions')).map((q: any) => ({
                    question: safeStrItem(q?.question || q),
                     type: (safeStrItem(q?.type || "technical")) as "technical" | "behavioral" | "situational",
                    tip: safeStrItem(q?.tip) || "Focus on architectural clarity.",
                    target_answer: safeStrItem(q?.target_answer) || "Reference specific enterprise scale systems."
                  }))
                : [
                     { question: "How do you manage technical debt in legacy RAG systems?", type: "technical" as const, tip: "Focus on balancing velocity with quality.", target_answer: "Incremental refactoring and automated eval sets." }
                  ],
             reverse_questions: safeArr(find(rawKit, 'reverse_questions')).length >= 5 
                ? safeArr(find(rawKit, 'reverse_questions')).map(i => safeStrItem(i)) 
                : [
                    "What is the primary technical bottleneck your team currently faces?",
                    "How does this role contribute to the company's 12-month strategic roadmap?",
                    "What does the ideal outcome look like for this position in the first 90 days?",
                    "How does the team balance rapid feature delivery with long-term architectural stability?",
                    "What is the most common reason candidates fail to integrate into your engineering culture?"
                  ]
           },
           resume_help: {
             keywords: safeArr(find(rawHelp, 'keywords')).length > 0 ? safeArr(find(rawHelp, 'keywords')).map(i => safeStrItem(i)) : ["Agentic Flows", "LangGraph", "Forensic Systems"],
             bullets: safeArr(find(rawHelp, 'bullets')).length > 0 ? safeArr(find(rawHelp, 'bullets')).map(i => safeStrItem(i)) : ["Lead the engineering of high-fidelity forensic intelligence pipelines."]
           },
           winning_strategy: safeArr(find(raw, 'winning_strategy') || find(raw, 'strategy')).length > 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? safeArr(find(raw, 'winning_strategy') || find(raw, 'strategy')).map((ws: any, idx: number) => 
                typeof ws === 'string' 
                    ? { title: `Protocol ${idx + 1}`, description: ws }
                    : { title: safeStrItem(ws?.title) || `Protocol ${idx + 1}`, description: safeStrItem(ws?.description) }
                )
            : [{ title: "The Architectural Pivot", description: "Demonstrate how your Agentic flow designs reduce operational latency by 40%." }]
        };
      };

      const result: DecodeResult = hydrate(data);
      await setCachedDecode(jdText, result);
      clearResumeAnalysisCache();
      
      // Proactively clear cached roadmap values for the new job description
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem("current_roadmap_id");
        sessionStorage.removeItem("current_roadmap_jd_title");
      }

      setResults(result);
      setWasCached(false);
      toast.success(`Forensic Intelligence Active: ${result.title}`, { duration: 4000 });
      
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("── LUMINA FORENSIC CRASH DETECTED ──", errMsg);
      
      // Proactively notify UI to display the connection settings & diagnostics panel
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("lumina_scan_crashed"));
      }

      // ── EXTREME LIFETIME RESILIENT FALLBACK ──
      try {
        console.warn("── CATCH FALLBACK INITIATED ── Gracefully degrading to Sandbox Heuristic Engine due to:", errMsg);
        const fallbackResult = decodeJDHeuristic(jdText);
        await setCachedDecode(jdText, fallbackResult);
        clearResumeAnalysisCache();
        
        if (typeof window !== "undefined" && window.sessionStorage) {
          sessionStorage.removeItem("current_roadmap_id");
          sessionStorage.removeItem("current_roadmap_jd_title");
        }

        setResults(fallbackResult);
        setWasCached(false);
        
        toast.info("Active: Heuristic Fallback Scan", {
          description: `Offline Forensic engine activated (${fallbackResult.title}) due to network or server authentication fault. Open API Settings to configure.`,
          duration: 9000
        });
      } catch (fallbackErr) {
        console.error("Critical fallback engine crash:", fallbackErr);
        toast.error("Forensic Engine Fault", { 
          description: "A critical offline parser fault occurred. Workspace reset recommended.", 
          duration: 9000 
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  return { isScanning, results, setResults, resetResults, decodeJD, wasCached, clearCache: clearDecodeCache };
};
