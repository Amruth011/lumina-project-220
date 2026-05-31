import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sanitize = (val: string | undefined) => (val || '').replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    const groqKey = process.env.GROQ_API_KEY;
    const supabaseUrl = sanitize(process.env.VITE_SUPABASE_URL);
    const supabaseKey = sanitize(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

    const diagnostics = {
      groq_key_set: !!groqKey,
      supabase_url_set: !!supabaseUrl,
      supabase_key_set: !!supabaseKey,
      node_version: process.version,
    };

    // Test Supabase connection
    let supabase_test = 'skipped';
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { error } = await sb.from('profiles').select('id').limit(1);
      supabase_test = error ? `ERROR: ${error.message}` : 'OK';
    } catch(e: unknown) {
      supabase_test = `CRASH: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Test Groq API connectivity
    let groq_test = 'skipped';
    if (groqKey) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${groqKey}` }
        });
        groq_test = r.ok ? `OK (status ${r.status})` : `HTTP ${r.status}`;
      } catch(e: unknown) {
        groq_test = `CRASH: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    return res.status(200).json({
      status: 'diagnostic_ok',
      diagnostics,
      supabase_test,
      groq_test,
    });
  } catch(err: unknown) {
    return res.status(500).json({
      status: 'diagnostic_crashed',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}
