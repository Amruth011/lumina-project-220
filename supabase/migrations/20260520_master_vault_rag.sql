-- ── COMBINED LUMINA MASTER VAULT & RAG VECTOR SEARCH MIGRATION ──
-- Migration: 20260520_master_vault_rag.sql
-- Consolidated schema setup: Base Master Vault + pgvector setup + HNSW indexing + RAG search RPC.
-- You can select all and replace your SQL runner content with this code.

-- 1. Enable pgvector extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Create the Master Vault table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.master_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    period TEXT NOT NULL,
    description TEXT NOT NULL,
    bullets TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Drops the old type restriction and applies the new one allowing products, leadership, and awards
ALTER TABLE public.master_vault DROP CONSTRAINT IF EXISTS master_vault_type_check;
ALTER TABLE public.master_vault ADD CONSTRAINT master_vault_type_check CHECK (type IN ('professional', 'project', 'education', 'certification', 'product', 'leadership', 'award'));

-- 4. Add Project GitHub, Live Demo, quantification tracker, and vector embedding columns
ALTER TABLE public.master_vault ADD COLUMN IF NOT EXISTS github_link TEXT;
ALTER TABLE public.master_vault ADD COLUMN IF NOT EXISTS live_link TEXT;
ALTER TABLE public.master_vault ADD COLUMN IF NOT EXISTS is_quantified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.master_vault ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.master_vault ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies (Idempotent)
DROP POLICY IF EXISTS "Users can manage their own master vault" ON public.master_vault;
CREATE POLICY "Users can manage their own master vault"
    ON public.master_vault FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Update Profiles table with modern metadata fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT; 
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS summary_master TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT; 

-- 8. Add triggers and functions for automatic updated_at timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_master_vault_updated_at ON public.master_vault;
CREATE TRIGGER update_master_vault_updated_at
    BEFORE UPDATE ON public.master_vault
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Create HNSW index on the vector embedding column using cosine distance
CREATE INDEX IF NOT EXISTS master_vault_embedding_hnsw_idx 
ON public.master_vault 
USING hnsw (embedding extensions.vector_cosine_ops);

-- 10. Create match_vault_items RPC function for semantic RAG search
CREATE OR REPLACE FUNCTION public.match_vault_items(
    query_embedding extensions.vector(1536),
    match_threshold double precision,
    match_count integer,
    target_user_id uuid
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    skills text[],
    similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mv.id,
        mv.title,
        mv.description,
        mv.skills,
        (1 - (mv.embedding <=> query_embedding)) AS similarity
    FROM
        public.master_vault mv
    WHERE
        mv.user_id = target_user_id
        AND mv.embedding IS NOT NULL
        AND (1 - (mv.embedding <=> query_embedding)) > match_threshold
    ORDER BY
        mv.embedding <=> query_embedding ASC
    LIMIT
        match_count;
END;
$$;
