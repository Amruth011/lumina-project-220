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
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://esjzitabjftwiqjzjttw.supabase.co';
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanppdGFiamZ0d2lxanpqdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzA2NTQsImV4cCI6MjA4OTkwNjY1NH0.rF4FNw2X94XEkl4Vm7XyrnbXF1m1rtyGdV9Wbdh7lXE';

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

  // 4. Retrieve and Validate Payload
  const { jd_data, vault_data, duration, jd_id } = req.body || {};
  
  if (!jd_data || !duration) {
    return res.status(400).json({ error: 'Request body must contain "jd_data" and "duration" fields.' });
  }

  // 5. Load Groq API Key
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.error('SERVER_ERROR: GROQ_API_KEY is missing from environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Groq API key is not configured.' });
  }

  // 6. Build the prompt targeting the exact JSON structure
  const formattedVaultEntries = Array.isArray(vault_data?.items) 
    ? vault_data.items.map((item: VaultItemInput) => 
        `- [${item.type.toUpperCase()}] Title: "${item.title}" at "${item.organization}" (Period: ${item.period})\n  Description: ${item.description || ''}\n  Bullets: ${Array.isArray(item.bullets) ? item.bullets.join('; ') : ''}`
      ).join('\n\n')
    : 'No vault entries recorded.';

  const formattedVaultProfile = vault_data?.profile 
    ? `Full Name: ${vault_data.profile.full_name || ''}\nProfessional Summary: ${vault_data.profile.summary_master || ''}`
    : 'No master profile summary recorded.';

  const systemMessage = `You are a world-class career strategist and technology upskilling coach.
Your job is to analyze the exact skill gaps between a Job Description (JD) and a candidate's recorded experience, skills, and highlights (Vault Data).
Then, you must construct a highly detailed, professional, and practical week-by-week study syllabus (Roadmap) tailored exactly to the candidate's requested duration.

You must return ONLY a raw JSON object matching this schema definition exactly:
{
  "target_role": string (the exact job title matching the scanned JD),
  "duration": string (the requested duration),
  "skill_gaps_identified": string[] (list of concrete skills, tools, or concepts missing from the candidate's profile compared to the JD),
  "timeline": [
    {
      "phase_number": number (1-indexed phase number),
      "phase_title": string (engaging title e.g. "Phase 1: React State & Custom Hooks Mastery"),
      "focus_area": string (e.g. "Advanced State Management"),
      "gap_addressed": string (explain precisely which identified gap from the candidate's profile is addressed by this phase),
      "actionable_tasks": [
        {
          "id": string (unique short ID like "task-1-1"),
          "title": string (very specific actionable task title e.g., "Build a high-performance custom hook using useReducer to manage complex form validation state"),
          "estimated_hours": number (realistic estimated effort e.g., 4),
          "is_completed": false
        }
      ],
      "deep_dive_resources": [
        {
          "title": string (highly specific learning reference e.g., "React Docs: Reusing Logic with Custom Hooks"),
          "url": string (high-quality URL e.g., "https://react.dev/learn/reusing-logic-with-custom-hooks"),
          "source_type": string (must be "documentation", "video", or "course")
        }
      ]
    }
  ]
}

CRITICAL DIRECTIVES:
1. Focus heavily on providing high-impact, realistic upskilling items.
2. DO NOT output any explanations, markdown code fences (\`\`\`json), comments, or extra conversational text.
3. The response MUST be ONLY valid parseable JSON starting with '{' and ending with '}'.`;

  const userMessage = `Please generate my adaptive roadmap based on the following metrics:

JOB DESCRIPTION (Scanned JD Data):
- Target Role/Title: ${jd_data.title || 'Not Specified'}
- Target Skills: ${Array.isArray(jd_data.skills) ? jd_data.skills.join(', ') : 'Not Specified'}
- Description: ${jd_data.description || 'Not Specified'}

CANDIDATE VAULT PROFILE:
${formattedVaultProfile}

CANDIDATE VAULT RECORDS:
${formattedVaultEntries}

REQUESTED ROADMAP DURATION:
${duration} (Please adjust the density and count of phases/tasks to fit this exact timeframe logically)`;

  const fallbackModels = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ];

  let rawResponseText = '';
  let lastError = '';
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 7. Execute Multi-Model Fallback Groq request
  for (const model of fallbackModels) {
    try {
      console.log(`API_ROADMAP: Fetching from Groq using model ${model}...`);
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        }),
      });

      if (groqResponse.ok) {
        const responseData = await groqResponse.json();
        rawResponseText = responseData?.choices?.[0]?.message?.content || '';
        if (rawResponseText.trim()) {
          console.log(`API_ROADMAP: Successfully generated roadmap with ${model}`);
          break;
        }
      }

      let errorText = '';
      try {
        const errorData = await groqResponse.json();
        errorText = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        errorText = await groqResponse.text().catch(() => groqResponse.statusText);
      }
      
      lastError = errorText;
      console.warn(`API_ROADMAP: Model ${model} failed: ${errorText}`);

      if (groqResponse.status === 429) {
        await sleep(1500);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`API_ROADMAP: Model ${model} crash error:`, lastError);
    }
  }

  if (!rawResponseText) {
    console.error('API_ROADMAP: All Groq models exhausted.');
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
}
