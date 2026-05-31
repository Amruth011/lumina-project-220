-- Migration: Add technical_skills JSONB column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS technical_skills JSONB DEFAULT '{}'::jsonb;
