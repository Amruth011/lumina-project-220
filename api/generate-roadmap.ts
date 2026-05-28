import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

interface VaultItemInput {
  type: string;
  title: string;
  organization: string;
  period: string;
  description?: string;
  bullets?: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Guard against non-POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  // 2. Validate Authorization header and retrieve User JWT
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing access token.' });
  }

  // 3. Initialize Supabase client inside secure server context using user's JWT
  // Strip any surrounding quotes Vercel may inject into env var values
  const sanitize = (val: string | undefined) => (val || '').replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
  let supabaseUrl = sanitize(process.env.VITE_SUPABASE_URL);
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = 'https://esjzitabjftwiqjzjttw.supabase.co';
  }
  let supabaseAnonKey = sanitize(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
    supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanppdGFiamZ0d2lxanpqdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzA2NTQsImV4cCI6MjA4OTkwNjY1NH0.rF4FNw2X94XEkl4Vm7XyrnbXF1m1rtyGdV9Wbdh7lXE';
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify the token by fetching the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error('API_ROADMAP: JWT validation failed:', authError?.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token session.', details: authError?.message });
  }

  // Ensure the profile row exists to prevent database insert foreign key constraints from failing
  try {
    const { data: profileExists, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.warn('API_ROADMAP: Profile check error:', profileCheckError.message);
    }

    if (!profileExists) {
      console.log(`API_ROADMAP: Profile record missing for user ${user.id}, auto-creating standard fallback...`);
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.email ? user.email.split('@')[0] : 'User'
        });

      if (profileInsertError) {
        console.error('API_ROADMAP: Fallback profile insertion failed:', profileInsertError.message);
      } else {
        console.log(`API_ROADMAP: Fallback profile successfully created for user ${user.id}.`);
      }
    }
  } catch (err) {
    console.error('API_ROADMAP: Profile recovery block failed:', err);
  }

  // 4. Retrieve and Validate Payload
  const { jd_data, vault_data, duration, jd_id } = req.body || {};
  
  if (!jd_data || !duration) {
    return res.status(400).json({ error: 'Request body must contain "jd_data" and "duration" fields.' });
  }

  // 5. Load API Keys
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  
  if (!groqKey && !openAiKey) {
    console.error('SERVER_ERROR: API keys are missing from environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Neither GROQ_API_KEY nor OPENAI_API_KEY is configured.' });
  }

  // 6. Build the elite prompt targeting the exact JSON structure
  const formattedVaultEntries = Array.isArray(vault_data?.items)
    ? vault_data.items.map((item: VaultItemInput) =>
        `- [${(item.type || 'UNKNOWN').toUpperCase()}] Title: "${item.title || 'Not Specified'}" at "${item.organization || 'Not Specified'}" (Period: ${item.period || 'Not Specified'})\n  Description: ${item.description || ''}\n  Bullets: ${Array.isArray(item.bullets) ? item.bullets.join('; ') : ''}`
      ).join('\n\n')
    : 'No vault entries recorded.';

  const formattedVaultProfile = vault_data?.profile
    ? `Full Name: ${vault_data.profile.full_name || ''}\nProfessional Summary: ${vault_data.profile.summary_master || ''}`
    : 'No master profile summary recorded.';

  // Duration → time-budget calibration table injected into the prompt
  const durationBudgetTable: Record<string, { hours_per_task: string; phase_count: string; depth: string }> = {
    '1 Week':   { hours_per_task: '1.5-2',  phase_count: '3-4',   depth: 'hyper-focused, single-skill micro-builds only. Each task must be completable in one sitting.' },
    '2 Weeks':  { hours_per_task: '2-3',    phase_count: '4-5',   depth: 'tight, daily-sprint sized builds with clear start/finish artefacts.' },
    '3 Weeks':  { hours_per_task: '3-4',    phase_count: '5-6',   depth: 'multi-day feature builds with basic integration.' },
    '4 Weeks':  { hours_per_task: '4-6',    phase_count: '6-8',   depth: 'feature-complete mini-projects with testing and documentation.' },
    '2 Months': { hours_per_task: '6-8',    phase_count: '8-10',  depth: 'full sub-system implementations with CI integration and peer-review readiness.' },
    '3 Months': { hours_per_task: '8-12',   phase_count: '10-12', depth: 'end-to-end module designs including architecture decisions and load considerations.' },
    '6 Months': { hours_per_task: '12-18',  phase_count: '12-16', depth: 'production-grade systems with observability, fault-tolerance, and scalability baked in.' },
    '1 Year':   { hours_per_task: '15-20',  phase_count: '16-20', depth: 'full-stack architecture designs with deployment pipelines, monitoring, and team-scale documentation.' },
  };
  const budget = durationBudgetTable[duration] || { hours_per_task: '4-6', phase_count: '6-8', depth: 'feature-complete mini-projects.' };

  const systemMessage = `You are an elite-tier technical career architect operating at the 0.01% level.
Your singular mission: transform skill gaps into a ruthlessly actionable, production-grade implementation curriculum.
Generic study plans are STRICTLY FORBIDDEN. Every task in the roadmap must represent a high-quality, professional, production-grade project (as if designed by a Staff/Senior Engineer to teach the candidate), but the difficulty, complexity, and topics of the tasks MUST be strictly calibrated to the target experience level (e.g. if target experience is "Freshers" or entry-level, keep tasks focused on solid foundations, clean implementations, and core programming; do not issue senior architect/management assignments).

══════════════════════════════════════════
RULE 1 — PRODUCTION MICRO-PROJECT TASKS (NON-NEGOTIABLE)
══════════════════════════════════════════
Every task in "actionable_tasks" MUST be a concrete, scenario-based micro-project tied directly to the target role.
The task must specify: WHAT to build, HOW it works, and WHAT production constraint applies.

XXX BANNED (Generic Directive):
  "Learn Docker fundamentals"
  "Practice TypeScript generics"
  "Study system design concepts"

✓✓✓ REQUIRED (Elite Micro-Project):
  "Containerise a Node.js REST API with a multi-stage Dockerfile that reduces the final image to under 80 MB, configure a non-root user, and add a health-check endpoint consumed by Docker Compose."
  "Write a generic Result<T, E> type in TypeScript that models Ok/Err variants, implement a safe fetch wrapper using it, and test exhaustive narrowing with vitest."
  "Design a URL-shortener at 10k RPS: sketch the consistent-hashing ring, justify the read/write replica split, and document the cache-aside strategy with TTL rationale."

Every title must answer: What do I build? What constraint or production reality makes it non-trivial?

══════════════════════════════════════════
RULE 2 — AI VERIFICATION PROMPT (MANDATORY FIELD)
══════════════════════════════════════════
Every task object MUST include a "verification_prompt" string field.
This is a ready-to-paste expert reviewer prompt the user can drop into any AI assistant (ChatGPT, Claude, etc.) after completing the task.
It must:
  a) Name a specific senior reviewer persona relevant to the technology used
  b) List 3-4 concrete code review criteria targeting the exact artefact built
  c) Include at least one adversarial challenge (e.g. "What happens when X fails?", "How does this behave under Y load?")

Example format:
  "Act as a Staff-level Site Reliability Engineer. Review my multi-stage Dockerfile for: (1) layer-caching efficiency and whether non-root user setup is correct, (2) whether the COPY --chown directive avoids permission escalation, (3) final image size — can you spot any unnecessary layers? Adversarial: what happens when the health-check endpoint itself is the source of the crash loop?"

══════════════════════════════════════════
RULE 3 — STRICT TIME-BUDGET CALIBRATION
══════════════════════════════════════════
For the requested duration "${duration}":
- Target phase count: YOU MUST GENERATE EXACTLY ${budget.phase_count} PHASES. This is non-negotiable.
- Tasks per phase: YOU MUST GENERATE EXACTLY 3 to 4 actionable_tasks per phase.
- estimated_hours per task: ${budget.hours_per_task} hours
- Task depth level: ${budget.depth}

Do NOT generate tasks that overflow or underflow this time-budget. A 1-week roadmap must NOT have 15-hour tasks. A 1-year roadmap must NOT have 2-hour trivial exercises.
CRITICAL: You MUST output exactly ${budget.phase_count} phases in the timeline array. Outputting fewer phases than requested will result in system failure.

══════════════════════════════════════════
RULE 4 — RESOURCE LINK INTEGRITY (NON-NEGOTIABLE)
══════════════════════════════════════════
Every URL provided in the "deep_dive_resources" MUST be a 100% real, active, verified, permanent, and functional public website or documentation URL.
1. ABSOLUTELY FORBIDDEN to guess nested routes, write fake paths, or invent detailed resource subdirectories (e.g. no fake subdirectories that cause 404s).
2. ONLY use official technology landing pages, standard documentations, or stable reference sections.
3. Every URL MUST match the target technology.
4. Banned domains: placeholder.com, example.com, yourdocs.com, domain.com, tutorial.com, datacamp.com, coursera.org, udemy.com, pluralsight.com.
5. STRICTLY PROHIBITED: Do not include links to paid courses, paid tutorials, or paid subscription platforms (such as DataCamp, Coursera, Udemy, Pluralsight, etc.). All resources must be completely FREE, prioritizing official technology documentations.
6. Standard safe documentation URLs to prioritize for matching topics:
   - React: https://react.dev
   - MDN Web Docs: https://developer.mozilla.org
   - TypeScript: https://www.typescriptlang.org/docs
   - Node.js: https://nodejs.org/docs
   - Python: https://docs.python.org/3/
   - AWS: https://docs.aws.amazon.com/
   - PostgreSQL: https://www.postgresql.org/docs/
   - Docker: https://docs.docker.com/
   - Next.js: https://nextjs.org/docs
   - Tailwind CSS: https://tailwindcss.com/docs
   - GitHub/Git: https://git-scm.com/doc
   - Vite: https://vite.dev
   - Vitest: https://vitest.dev
   - Prisma: https://www.prisma.io/docs
   - Redux: https://redux.js.org
   - GraphQL: https://graphql.org/learn/
   - Kubernetes: https://kubernetes.io/docs/
   - Terraform: https://developer.hashicorp.com/terraform/docs
   - NestJS: https://docs.nestjs.com
If the technology is not listed here, use its official verified main documentation home page. All URLs must start with https://.

══════════════════════════════════════════
RULE 5 — STRICT GAP-ALIGNED TARGETING (MANDATORY)
══════════════════════════════════════════
You MUST compare the candidate's existing vault entries against the exact target job description details and required skills. Identify the specific skills or concepts that are demanded by the JD but are missing or weak in the candidate's vault. Every single phase of the roadmap MUST map directly to bridging these specific identified gaps. The 'gap_addressed' field in each phase must state the exact missing JD skill being resolved, rather than a generic concept.

══════════════════════════════════════════
RULE 6 — EXACT ROLE & EXPERIENCE ALIGNMENT (CRITICAL)
══════════════════════════════════════════
1. The "target_role" field in your JSON output MUST match the exact title from "TARGET ROLE" combined with the seniority level from "TARGET EXPERIENCE LEVEL" and "JD DESCRIPTION". For example, if target role is "Software Engineer" and the experience is for "2026 Freshers" or entry level, "target_role" MUST be something like "Software Engineer (Entry Level / Fresher)" — under no circumstances should you inflate or upgrade the role title to a senior level (e.g. "Senior Frontend Engineer") just because the candidate has frontend entries or because you are a senior AI.
2. Calibrate all task difficulties and topics strictly to the target seniority. If it is an entry-level/fresher role, focus on core programming concepts, standard libraries, testing, and clean basic feature implementation. BANNED topics for freshman/junior roles: "Strategic Architecture", "Enterprise Decomposition", "Cross-Functional Sync", "Observability at Scale", "Enterprise Design Patterns". Only use high-level system architecture and leadership topics if the role's experience level is explicitly Mid/Senior/Staff.

══════════════════════════════════════════
OUTPUT SCHEMA (return ONLY this JSON — no markdown, no prose)
══════════════════════════════════════════
{
  "target_role": string,
  "duration": string,
  "skill_gaps_identified": string[],
  "timeline": [
    {
      "phase_number": number,
      "phase_title": string (e.g. "Phase 2: Stateful Streaming Pipelines"),
      "focus_area": string,
      "gap_addressed": string,
      "actionable_tasks": [
        {
          "id": string (e.g. "task-2-1"),
          "title": string (MUST be a concrete micro-project per Rule 1 — no generic verbs like 'learn', 'study', 'read'),
          "estimated_hours": number (MUST fall within ${budget.hours_per_task} per Rule 3),
          "verification_prompt": string (MUST follow Rule 2 format — senior persona + 3 review criteria + 1 adversarial),
          "is_completed": false
        }
      ],
      "deep_dive_resources": [
        {
          "title": string,
          "url": string,
          "source_type": "documentation" | "video" | "course",
          "estimated_time": string (e.g. "45m", "2h", "15m")
        }
      ]
    }
  ]
}

FINAL ENFORCEMENT: The JSON must begin with '{' and end with '}'. No triple backticks. No commentary. Only parseable JSON.`;

  const formattedJdSkills = Array.isArray(jd_data.skills)
    ? jd_data.skills.map((s: { skill?: string; name?: string; importance?: number }) => {
        if (!s) return "";
        return `${s.skill || s.name || ""} (Importance: ${s.importance || 50})`;
      }).filter(Boolean).join(", ")
    : "Not Specified";

  const userMessage = `Generate my elite adaptive roadmap:

TARGET ROLE: ${jd_data.title || 'Not Specified'}
TARGET EXPERIENCE LEVEL: ${jd_data.experience || 'Not Specified'}
REQUIRED SKILLS FROM JD: ${formattedJdSkills}
JD DESCRIPTION: ${(jd_data.description || '').substring(0, 4000)}

CANDIDATE VAULT PROFILE:
${formattedVaultProfile}

CANDIDATE VAULT RECORDS (existing experience — DO NOT repeat these as tasks):
${formattedVaultEntries}

REQUESTED DURATION: ${duration}
TIME BUDGET: ${budget.hours_per_task} hours/task · ${budget.phase_count} phases · ${budget.depth}

Generate the roadmap now. Every task must be a production micro-project with a verification_prompt. Zero generic directives.`;

  // Lead with the most capable model for this complex structured-output task
  // 6b. Configure Fallbacks
  const fallbackConfigs: Array<{ url: string; key: string; model: string }> = [];

  if (groqKey) {
    const groqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
    ];
    for (const m of groqModels) {
      fallbackConfigs.push({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: groqKey,
        model: m
      });
    }
  }

  if (openAiKey) {
    const openAiModels = ['gpt-4o', 'gpt-4o-mini'];
    for (const model of openAiModels) {
      fallbackConfigs.push({
        url: 'https://api.openai.com/v1/chat/completions',
        key: openAiKey,
        model: model
      });
    }
  }

  let rawResponseText = '';
  let lastError = '';
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 7. Execute Multi-Model Fallback request
  for (const config of fallbackConfigs) {
    let retries = 3;
    let delay = 2000;
    let success = false;

    while (retries > 0 && !success) {
      try {
        console.log(`API_ROADMAP: Fetching from ${config.url} using model ${config.model}... (Retries left: ${retries})`);
        const apiResponse = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
          }),
        });

        // Read the body ONCE as text to avoid "body used already" crash
        const rawBody = await apiResponse.text().catch(() => '');

        if (apiResponse.ok) {
          try {
            const responseData = JSON.parse(rawBody);
            rawResponseText = responseData?.choices?.[0]?.message?.content || '';
            if (rawResponseText.trim()) {
              console.log(`API_ROADMAP: Successfully generated roadmap with ${config.model}`);
              success = true;
              break;
            }
          } catch {
            console.warn(`API_ROADMAP: Could not parse success body for model ${config.model}`);
          }
        } else {
          // Parse error from already-read text body
          try {
            const errorData = JSON.parse(rawBody);
            lastError = errorData?.error?.message || JSON.stringify(errorData);
          } catch {
            lastError = rawBody || apiResponse.statusText;
          }
          console.warn(`API_ROADMAP: Model ${config.model} failed (HTTP ${apiResponse.status}): ${lastError}`);
        }

        if (apiResponse.status === 429 || apiResponse.status >= 500) {
          console.log(`API_ROADMAP: Rate limited or server error on ${config.model}, waiting ${delay}ms...`);
          await sleep(delay);
          delay *= 2;
          retries--;
        } else {
          break; // Move to next config on other errors
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`API_ROADMAP: Model ${config.model} crash error:`, lastError);
        break;
      }
    }
    if (success) break;
  }

  if (!rawResponseText) {
    console.error('API_ROADMAP: All AI engines exhausted.');
    return res.status(500).json({ error: 'All AI engines exhausted', details: lastError });
  }

  // 8. Parse and clean raw response JSON
  let roadmapJSONData: Record<string, unknown> | null = null;
  try {
    const cleanJSONText = rawResponseText
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/m, '')
      .trim();

    roadmapJSONData = JSON.parse(cleanJSONText) as Record<string, unknown>;
  } catch (parseError) {
    console.error('API_ROADMAP: JSON parsing failed on output:', rawResponseText);
    return res.status(500).json({ 
      error: 'AI generated invalid roadmap payload format.', 
      details: parseError instanceof Error ? parseError.message : String(parseError),
      rawOutput: rawResponseText 
    });
  }

  // 9. Save roadmap to Supabase database (respecting user security/ownership)
  try {
    console.log(`API_ROADMAP: Saving generated roadmap to database for user ${user.id}...`);
    const { data: dbRow, error: dbError } = await supabase
      .from('roadmaps')
      .insert({
        user_id: user.id,
        jd_id: jd_id || null,
        duration: duration,
        roadmap_data: roadmapJSONData
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('API_ROADMAP: Supabase insert operation failed:', dbError);
      throw dbError;
    }

    // 10. Return the successfully saved database entry to the client
    return res.status(200).json(dbRow);

  } catch (dbErr) {
    const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error('API_ROADMAP: Database error:', dbErrMsg);
    return res.status(500).json({ 
      error: 'Failed to write the generated roadmap to the database.', 
      details: dbErrMsg
    });
  }
  } catch (globalError) {
    console.error('API_ROADMAP: Unhandled server error:', globalError);
    return res.status(500).json({ error: 'Internal server error', details: String(globalError) });
  }
}
