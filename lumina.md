# Lumina - Architecture & Project Documentation

## 1. Project Overview
**Lumina** is an AI Career Engine designed to deliver "Silicon Valley Standard" AI resume optimization. It decodes job descriptions, performs gap analysis on the user's skill vault, and dynamically engineers high-fidelity, ATS-hardened resume bullet points and summaries in real-time.

## 2. Tech Stack & Technologies
### Frontend
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (with tailwindcss-animate, typography plugins)
- **Component Library:** Radix UI primitives, Lucide React (icons)
- **State/Form Management:** React Hook Form, React Query (@tanstack/react-query)
- **Animations:** Framer Motion, GSAP, React Spring, Vanilla Tilt
- **3D/Graphics:** Three.js (@react-three/fiber, @react-three/drei)
- **Document Rendering:** html2canvas, jspdf, pdfjs-dist
- **Routing:** React Router DOM

### Backend & Cloud
- **BaaS (Backend as a Service):** Supabase (Authentication, PostgreSQL Database, Edge Functions)
- **Edge APIs (Supabase Functions):** Written in Deno/TypeScript, interacting directly with LLM providers to generate personalized resume data.

---

## 3. Core Workflows
1. **Authentication (Supabase Auth)**
   - Managed in `src/pages/Auth.tsx`
   - Highly secure component relying on Supabase's built-in bot protection. Headless browser login attempts (e.g., Puppeteer) are typically blocked.
   
2. **Dashboard & Navigation**
   - The primary entry point post-login is `src/pages/Dashboard.tsx`.
   - Routing branches out into multiple views: Arsenal (Skill Vault), Interview, Pipeline, and Scoring.

3. **Candidacy Synthesizer (Resume Generator)**
   - Located in `src/components/ResumeGenerator.tsx` and related components (`ResumePreview.tsx`).
   - **Process:**
     - User pastes a Job Description (JD).
     - The frontend sends the JD to Supabase edge functions (e.g., `generate-resume`, `generate-bullet`, `tailor-resume`).
     - AI strictly generates bullet points to be exactly 220-260 characters so they perfectly fill two lines visually.
     - Categories are dynamically created (e.g., "Frontend Development", "Backend & Cloud") rather than grouping everything under a flat "Skills" tag.
     - The output is then visually rendered on the frontend and can be exported as a PDF.

---

## 4. Supabase API Edge Functions
The backend utilizes Serverless Edge Functions to decouple heavy AI workloads from the client.
- `analyze`
- `compare-resume`
- `cover-letter`
- `decode-jd`
- `diagnose`
- `dump-models`
- `embed`
- `generate-bullet`
- `generate-resume`
- `generate-roadmap`
- `parse-resume-file`
- `tailor-resume`

---

## 5. Engineering Guardrails & Maintenance
- **No Mock Data for Live Views:** The codebase must never initialize core logic states (like `useState(mockResume)`) with hardcoded fallback data if it masks the absence of real AI execution.
- **Strict Linting:** The project utilizes strict ESLint rules (with `react-hooks/exhaustive-deps`) which must pass (`npm run lint`) before building.
- **Dynamic Updates:** This file (`lumina.md`) and the `mistakes_and_lessons.md` file are updated automatically by the agent via the workspace's `AGENTS.md` rules.

## 6. Access and API Key Requirements
- **Agent Access**: The AI agent has complete administrative access to navigate, debug, and execute bypasses within the UI for testing purposes when explicitly authorized by the user.
- **API Keys**: For live backend generation to work without crashing, the .env file MUST exist locally with valid API keys for the AI provider (e.g., OpenAI/Gemini) and Supabase. Without these keys, the environment must rely on authorized mock data bypasses for visual verification.
