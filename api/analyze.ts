import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing access token.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (supabaseUrl && supabaseAnonKey) {
    const sb = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openAiKey) {
    console.error('SERVER_ERROR: API keys are missing from environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Neither GROQ_API_KEY nor OPENAI_API_KEY is configured.' });
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Multi-Model Fallback List
   * ========================
   */
  const fallbackConfigs: Array<{ url: string; key: string; model: string }> = [];

  if (groqKey) {
    const requested = req.body.model;
    const groqModels = requested
      ? [requested, 'llama-3.1-8b-instant'].filter((v, i, a) => a.indexOf(v) === i)
      : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of groqModels) {
      fallbackConfigs.push({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: groqKey,
        model: model
      });
    }
  }

  if (openAiKey) {
    const openAiModels = ['gpt-4o-mini', 'gpt-4o'];
    for (const model of openAiModels) {
      fallbackConfigs.push({
        url: 'https://api.openai.com/v1/chat/completions',
        key: openAiKey,
        model: model
      });
    }
  }

  let lastError = "";
  let resultData = null;

  try {
    const { messages, temperature, response_format } = req.body;

    for (const config of fallbackConfigs) {
      let retries = config.model.includes("8b") || config.model.includes("mini") ? 1 : 2; // Fewer retries for fast/highly-available models
      let delay = 1000;
      let success = false;

      while (retries > 0 && !success) {
        try {
          console.log(`API_PROXY: Attempting with ${config.model} on ${config.url}... (Retries left: ${retries})`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout for much faster recovery

          // OpenAI doesn't always support the exact same response_format params as Groq, but type: "json_object" is safe
          const groqResponse = await fetch(config.url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.key}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: config.model,
              messages,
              temperature: temperature ?? 0.3,
              response_format: response_format?.type === 'json_object' ? { type: 'json_object' } : undefined,
            }),
          });
          clearTimeout(timeoutId);

          if (groqResponse.ok) {
            resultData = await groqResponse.json();
            success = true;
            break;
          }

          let lastErrorDetails = "";
          try {
            const errorData = await groqResponse.json();
            lastErrorDetails = errorData.error?.message || JSON.stringify(errorData);
          } catch (e) {
            lastErrorDetails = await groqResponse.text().catch(() => groqResponse.statusText);
          }
          
          lastError = lastErrorDetails || groqResponse.statusText;
          console.warn(`API_PROXY: ${config.model} failed with status ${groqResponse.status}: ${lastError}`);

          if (groqResponse.status === 429) {
            console.log(`API_PROXY: Rate limit (429) hit for ${config.model}. Instantly falling back to next engine without slow sleep retries.`);
            break; // Immediately break retry loop and proceed to next fallback model to save user's time
          }

          if (groqResponse.status >= 500) {
            console.log(`API_PROXY: Server error hit. Waiting ${delay}ms...`);
            await sleep(delay);
            delay *= 2; // Exponential backoff
            retries--;
          } else {
            // Other errors (e.g. 400 Bad Request, 401 Unauthorized, 404 Not Found), move to next model
            break;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.error(`API_PROXY: ${config.model} crash:`, lastError);
          
          // If aborted (timed out), immediately skip retries for this slow engine and try the next one
          if (lastError.includes("aborted") || lastError.includes("Abort") || lastError.includes("timeout")) {
            console.log(`API_PROXY: ${config.model} timed out. Skipping further retries and falling back to next engine.`);
            break;
          }
          
          retries--;
          if (retries > 0) {
            await sleep(delay);
          }
        }
      }
      if (success) break;
    }

    if (!resultData) {
      console.error(`API_PROXY: ALL ENGINES EXHAUSTED. Last error: ${lastError}`);
      return res.status(500).json({ 
        error: "All AI engines exhausted", 
        details: lastError,
        diagnostics: "Check GROQ_API_KEY / OPENAI_API_KEY and usage limits"
      });
    }

    return res.status(200).json(resultData);
  } catch (error) {
    console.error('PROXY_HANDLER_ERROR:', error);
    return res.status(500).json({ error: 'Internal server error while proxying request' });
  }
}
