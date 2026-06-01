-- Pipeline Dashboard: applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jd_id TEXT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','applied','interviewing','offered','rejected','ghosted')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  applied_at TIMESTAMPTZ,
  interview_date TIMESTAMPTZ,
  compensation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own applications"
  ON applications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5-Resume Arsenal: add metadata column to profiles
ALTER TABLE public.Profiles ADD COLUMN IF NOT EXISTS resume_arsenal JSONB DEFAULT '[]'::jsonb;

-- Interview: STAR vault item type support
-- (type 'star' already handled by VaultItemType in code; no migration needed)
