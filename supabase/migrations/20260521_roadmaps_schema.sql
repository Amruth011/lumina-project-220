-- Create roadmaps table if not exists
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    jd_id UUID,
    duration TEXT NOT NULL,
    roadmap_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- Create Policies so users can only manage their own roadmaps
DROP POLICY IF EXISTS "Users can manage their own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can manage their own roadmaps"
    ON public.roadmaps FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
