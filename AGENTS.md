# AGENTS.md — Lumina Architecture Guide

## Project Overview
Lumina is an AI-powered job-search OS: JD decoding, resume tailoring, cover letters, pipeline tracking, interview prep, and job scoring. Built with React + Vite + Supabase.

## Key Commands
```bash
npm run dev          # dev server
npm run build        # production build (must pass before commit)
npm run lint         # lint check
npx tsc --noEmit     # TypeScript check
```

## Architecture

### Monoliths (being split)
| File | Lines | Status |
|------|-------|--------|
| `src/components/MasterVault.tsx` | ~2560 | Extracted: JdSkillsImport → `components/vault/` |
| `src/components/ResumeGenerator.tsx` | ~2755 | Consolidated helpers to `lib/resumeHelpers.ts` |
| `src/components/resume-tailor/ResumePreview.tsx` | ~2251 | Extracted: SubHeaderWithLinks → `resume-tailor/` |

### Shared Library (`src/lib/`)
| File | Purpose |
|------|---------|
| `resumeHelpers.ts` | `restoreExactProfileData`, `sanitizePdfText`, `getModeOrLocation`, `parseProductOrProjectContent`, `measureOrDrawRightSideLinks`, `limitSummarySentences`, `limitBullets`, `sanitizeGeneratedResume` |
| `scoring.ts` | `buildScoringPrompt`, `parseScoreResponse` — A-F rubric engine |
| `featureFlags.ts` | Pro paywall gating: `isFeatureAvailable()`, `getFeatureBlocker()` |
| `skillScanner.ts` | `TECHNICAL_DICTIONARY`, `SKILL_CAPITALIZATION_MAP` |

### Feature Modules (code-split routes)
| Route | Component | Dir |
|-------|-----------|-----|
| `/dashboard/arsenal` | `ResumeArsenal` | `components/arsenal/` |
| `/dashboard/pipeline` | `PipelineDashboard` | `components/pipeline/` |
| `/dashboard/scoring` | `JobScoreCard` | `components/scoring/` |
| `/dashboard/interview` | `InterviewPrep` | `components/interview/` |

### Feature Flags & Paywall
- `ProBlocker` wraps Pro features (Arsenal, Pipeline, Interview) — gated via `featureFlags.ts`
- Dev override: `localStorage.setItem("lumina_pro", "true")`
- Scoring is always free

### State Persistence
- `useDebouncedPersist` hook for localStorage (400ms debounce)
- MasterVault consolidated 6 useEffect blocks → single debounced batch write
- Draft keys follow pattern: `draft_${key}_${userId}`

### Database Migrations
`supabase/migrations/20260601_add_applications_arsenal.sql`:
- `applications` table: Pipeline Kanban data
- `Profiles.resume_arsenal` JSONB column

### Error Handling
- `ErrorBoundary` wraps all routes in `App.tsx`

## Conventions
- No comments unless asked
- Tailwind CSS only, no CSS modules
- TypeScript strict mode
- Path alias: `@/` = `src/`
- No `any` without explicit eslint-disable
