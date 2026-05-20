import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function: /api/embed
 * =======================================
 * Secure proxy for OpenAI's text-embedding-3-small model.
 * Accepts raw text, returns a 1536-dimensional embedding vector.
 *
 * Body: { text: string }
 * Response: { embedding: number[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Method guard — POST only
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Env var loading
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('SERVER_ERROR: OPENAI_API_KEY is missing from environment variables.');
    return res.status(500).json({ error: 'Server configuration error: embedding API key not set.' });
  }

  // 3. Validate request body
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must contain a non-empty "text" field.' });
  }

  // 4. Truncate to ~8000 tokens (~32000 chars) to stay within model limits
  const truncatedText = text.slice(0, 32000);

  try {
    // 5. Call OpenAI Embedding API
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedText,
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error(`OpenAI Embedding API error (${openaiResponse.status}):`, errorBody);
      return res.status(openaiResponse.status).json({
        error: 'Embedding API request failed.',
        details: errorBody,
      });
    }

    const data = await openaiResponse.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      console.error('OpenAI returned unexpected response shape:', JSON.stringify(data).slice(0, 500));
      return res.status(500).json({ error: 'Unexpected response from embedding API.' });
    }

    // 6. Return the embedding vector
    return res.status(200).json({ embedding });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Embedding proxy error:', message);
    return res.status(500).json({ error: 'Internal server error during embedding generation.', details: message });
  }
}
