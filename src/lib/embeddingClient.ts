import { supabase } from "@/integrations/supabase/client";

/**
 * Lumina Embedding Client
 * =======================
 * Handles all vector embedding operations for the RAG pipeline:
 * 1. generateEmbedding() — Calls /api/embed proxy to vectorize text
 * 2. generateAndStoreEmbedding() — Generates + writes embedding to master_vault row
 * 3. matchVaultItems() — Calls the match_vault_items RPC for semantic search
 * 4. serializeVaultItemForEmbedding() — Converts a vault item into embeddable text
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VaultMatchResult {
  id: string;
  title: string;
  description: string;
  skills: string[];
  similarity: number;
}

export interface VaultItemForEmbedding {
  title?: string;
  organization?: string;
  description?: string;
  bullets?: string[];
  skills?: string[];
  type?: string;
  period?: string;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Generates a 1536-dimensional embedding vector for the given text
 * by calling the /api/embed Vercel serverless proxy.
 *
 * @param text - The raw text to vectorize
 * @returns The embedding vector as number[], or null on failure
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) {
    console.warn("[EmbeddingClient] Empty text provided, skipping embedding generation.");
    return null;
  }

  try {
    const response = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[EmbeddingClient] Proxy error (${response.status}):`, errorData);
      return null;
    }

    const data = await response.json();
    if (!data.embedding || !Array.isArray(data.embedding)) {
      console.error("[EmbeddingClient] Invalid embedding response shape:", data);
      return null;
    }

    return data.embedding;
  } catch (err) {
    console.error("[EmbeddingClient] Network error during embedding generation:", err);
    return null;
  }
}

/**
 * Serializes a vault item into a single text string optimized for embedding.
 * This is the canonical text representation used for vectorization.
 *
 * Format: "type: title at organization. description. Skills: skill1, skill2"
 */
export function serializeVaultItemForEmbedding(item: VaultItemForEmbedding): string {
  const parts: string[] = [];

  if (item.type) {
    parts.push(`[${item.type.toUpperCase()}]`);
  }
  if (item.title) {
    parts.push(item.title);
  }
  if (item.organization) {
    parts.push(`at ${item.organization}`);
  }
  if (item.period) {
    parts.push(`(${item.period})`);
  }

  let text = parts.join(" ");

  if (item.description) {
    text += `. ${item.description}`;
  }

  if (item.bullets && item.bullets.length > 0) {
    text += ". " + item.bullets.join(". ");
  }

  if (item.skills && item.skills.length > 0) {
    text += `. Skills: ${item.skills.join(", ")}`;
  }

  return text.trim();
}

/**
 * Generates an embedding for a vault item and stores it in the database.
 * This is called after a successful vault item upsert.
 *
 * @param itemId - The UUID of the master_vault row to update
 * @param item - The vault item data to serialize and embed
 * @returns true if embedding was stored successfully, false otherwise
 */
export async function generateAndStoreEmbedding(
  itemId: string,
  item: VaultItemForEmbedding
): Promise<boolean> {
  const text = serializeVaultItemForEmbedding(item);
  if (!text) {
    console.warn("[EmbeddingClient] Empty serialized text for item:", itemId);
    return false;
  }

  const embedding = await generateEmbedding(text);
  if (!embedding) {
    console.warn("[EmbeddingClient] Failed to generate embedding for item:", itemId);
    return false;
  }

  try {
    const { error } = await supabase
      .from("master_vault")
      .update({ embedding: JSON.stringify(embedding) } as Record<string, unknown>)
      .eq("id", itemId);

    if (error) {
      console.error("[EmbeddingClient] Failed to store embedding:", error);
      return false;
    }

    console.log(`[EmbeddingClient] ✓ Embedding stored for vault item ${itemId}`);
    return true;
  } catch (err) {
    console.error("[EmbeddingClient] Error storing embedding:", err);
    return false;
  }
}

/**
 * Performs a semantic similarity search against the user's vault items
 * using the match_vault_items RPC function.
 *
 * @param queryText - The JD or search text to match against
 * @param userId - The authenticated user's UUID
 * @param matchThreshold - Minimum similarity score (0-1), default 0.40
 * @param matchCount - Maximum number of results, default 10
 * @returns Array of matching vault items with similarity scores
 */
export async function matchVaultItems(
  queryText: string,
  userId: string,
  matchThreshold: number = 0.40,
  matchCount: number = 10
): Promise<VaultMatchResult[]> {
  // 1. Generate embedding for the query text (JD)
  const queryEmbedding = await generateEmbedding(queryText);
  if (!queryEmbedding) {
    console.warn("[EmbeddingClient] Could not generate query embedding, returning empty results.");
    return [];
  }

  try {
    // 2. Call the match_vault_items RPC
    const { data, error } = await supabase.rpc("match_vault_items", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: matchThreshold,
      match_count: matchCount,
      target_user_id: userId,
    });

    if (error) {
      console.error("[EmbeddingClient] RPC match_vault_items error:", error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      console.warn("[EmbeddingClient] Unexpected RPC response:", data);
      return [];
    }

    console.log(`[EmbeddingClient] ✓ Found ${data.length} matching vault items (threshold: ${matchThreshold})`);
    return data as VaultMatchResult[];
  } catch (err) {
    console.error("[EmbeddingClient] Error during vault matching:", err);
    return [];
  }
}

/**
 * Batch generates and stores embeddings for multiple vault items.
 * Used during bulk import and backfill operations.
 *
 * @param items - Array of { id, ...vaultItemData } to embed
 * @returns Number of successfully embedded items
 */
export async function batchGenerateEmbeddings(
  items: Array<{ id: string } & VaultItemForEmbedding>
): Promise<number> {
  let successCount = 0;

  for (const item of items) {
    const success = await generateAndStoreEmbedding(item.id, item);
    if (success) successCount++;
    // Small delay to avoid rate limiting on the embedding API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`[EmbeddingClient] Batch embedding complete: ${successCount}/${items.length} succeeded.`);
  return successCount;
}
