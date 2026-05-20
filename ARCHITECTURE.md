# Lumina AI Career Engine — Technical Architecture Manual

This document details the complete system architecture, folder layouts, core technical mechanisms, data-flow pipelines, and coding standards for the **Lumina AI Career Engine** workspace.

---

## 1. Tech Stack & Dependencies

### Core Frontend Framework
- **React (v18.3.1) & TypeScript**: Modern component library architecture with strong type safety.
- **Vite (v5.4)**: Ultra-fast bundler and development server, utilizing `@vitejs/plugin-react-swc` for fast compiler performance using Rust-based SWC.
- **React Router DOM (v6.30)**: Orchestrates client-side routing, protected dashboards, and fallback navigation paths.

### Styling & Aesthetics
- **Tailwind CSS (v3.4)**: Atomic CSS design tokens.
- **CSS Variables & Custom Tokens**: Mapped inside `@layer base` in `src/index.css` for a custom brand system (Pure White background, Lumina Navy `#1E2A3A`, Lumina Teal `#10B981`, Signal Blue `#2563EB`, Market Amber `#F59E0B`, Risk/Gap Red `#EF4444`).
- **Framer Motion (v12)**: Handles high-fidelity animations, entering/exiting panel transitions, dashboard loading sequences, and bento-card spring micro-interactions.
- **GSAP & @gsap/react (v3)**: Drives complex 3D-like, multi-phase landing page micro-animations and scrolling transitions (e.g., in `JourneyScene.tsx`, `Road.tsx`).
- **Lucide React (v0.462)**: Premium outline icon system.
- **Vanilla Tilt (v1.8)**: Implements responsive 3D card tilt effects on landing page components.

### 3D Graphics & Canvas Engines
- **Three.js & React Three Fiber (R3F) & @react-three/drei**: Powering the advanced 3D visual landscape, interactive roadmaps, city light models, and particles of the landing experience.
- **React Spring (@react-spring/three)**: Spring-physics interpolation in 3D views.
- **@tsparticles/react & @tsparticles/slim**: Render dynamic interactive background particles.

### Core Utilities & Libraries
- **Supabase JS client (@supabase/supabase-js)**: Integrates the frontend client directly with user authentication, RLS-protected database operations, and Supabase Edge Functions.
- **TanStack React Query (@tanstack/react-query v5)**: Standardizes caching, automatic invalidation, and request synchronization of server states.
- **React Hook Form & Zod**: Schema-driven validation and state control for complex forms (such as in `Auth.tsx` and the `MasterVault`).
- **PDF & Document Parsing/Exporting Utilities**:
  - `pdfjs-dist`: High-performance PDF parsing in client environments.
  - `mammoth`: DOCX parser for extracting resumes inside the browser.
  - `jspdf`: Programmatic PDF rendering, formatting, and downloads.
  - `html2canvas`: High-fidelity client-side HTML layout rendering to pixel-perfect image representations.

### Backend Infrastructure
- **Supabase Edge Functions**: Deno-based, low-latency API handlers orchestrating parsing, resume-tailoring, and bullet generation.
- **Vercel Serverless Functions (`/api/analyze.ts`)**: Secure Node.js middleware mapping Groq API requests, securing `GROQ_API_KEY`, and deploying a multi-model fallback chain (`llama-3.3-70b-versatile`, `gemma2-9b-it`, etc.) to guard against rate-limiting failures.

---

## 2. Folder Structure

```
lumina-jd-scanner-main/
├── .github/                       # GitHub workflow and CI/CD settings
├── .husky/                         # Git hooks (Lint-staged, Pre-commit)
├── api/                            # Vercel Serverless Endpoints
│   └── analyze.ts                  # Secure Groq AI fallback proxy
├── app/                            # [UNUSED NEXT.JS ARTIFACTS]
│   ├── layout.tsx                  # Kept for deployment compatibility/relic
│   ├── page.tsx                    
│   └── sitemap.ts                  
├── audit_assets/                   # Performance audit assets
├── components/                     # [UNUSED] Empty root component placeholders
├── dist/                           # Compiled production build directory
├── lib/                            # [UNUSED] Empty root library placeholders
├── public/                         # Static assets (Favicon, sitemap.xml, robots.txt)
├── src/                            # Operational Client Source Code
│   ├── App.css                     # App global layout styles
│   ├── App.tsx                     # React Router, Theme, Context and App wrapper
│   ├── index.css                   # Global Tailwind CSS definitions & Custom Brand Tokens
│   ├── main.tsx                    # DOM rendering mount point
│   ├── components/                 # Core React Component Library
│   │   ├── dashboard/              # Dashboard components (History, Skeletons, Widgets)
│   │   ├── gap-analysis/           # Resume analysis, simulators, and matching views
│   │   ├── jd-decoder/             # Job description decoders and loading screens
│   │   ├── landing/                # High-fidelity landing modules and 3D scenes
│   │   ├── market-insights/        # Competitiveness and market metrics components
│   │   ├── onboarding/             # Onboarding tutorials, tours, and welcome states
│   │   ├── resume-tailor/          # Resume generators, enhancers, and builders
│   │   ├── ui/                     # Reusable Shadcn base UI components (Button, Form, Sonner...)
│   │   └── *                       # Shared components (GlobalNavbar, ScannerView, MasterVault)
│   ├── context/                    # React Context stores
│   │   ├── SessionContext.tsx      # Pre-auth anonymous browser sessions
│   │   └── ToastContext.tsx        # Application global alerts
│   ├── data/                       # Static mock and domain datasets
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useAuth.ts              # Session controls mapping Supabase Auth
│   │   ├── useDecodeJD.ts          # Core hook calling the JD AI pipeline
│   │   └── useApplications.ts      # Active application tracking
│   ├── integrations/               # API integration client setups
│   │   ├── lovable/                # Integration adapters
│   │   └── supabase/               # Supabase JS clients and types
│   ├── lib/                        # Common utility libraries
│   │   ├── deterministicScorer.ts  # STRICT, OFFLINE, DETERMINISTIC matching algorithm
│   │   ├── skillScavenger.ts       # Text parsing skill scavenger heuristics
│   │   ├── pdfExporter.ts          # Unified report PDF generation engine
│   │   ├── jdCache.ts              # Offline local storage JD cache manager
│   │   └── *                       # GSAP, shortcuts, session storage, error handlers
│   ├── pages/                      # Client Pages (React Router Element Mappings)
│   │   ├── Index.tsx               # Root production landing page
│   │   ├── Auth.tsx                # Universal authentication portal
│   │   ├── Dashboard.tsx           # Main workspace dashboard orchestrator
│   │   └── NotFound.tsx            # Fallback router error screen
│   ├── styles/                     # CSS Modules & design token mappings
│   ├── test/                       # Vitest execution files
│   └── types/                      # TypeScript definitions (jd.ts, tabs.ts)
├── supabase/                       # Supabase Local Settings
│   ├── config.toml                 
│   ├── functions/                  # Deno Edge Functions
│   │   ├── decode-jd/              # Extracts structured parameters from raw JD text
│   │   ├── compare-resume/         # Validates resume gaps
│   │   ├── tailor-resume/          # Combines experiences and custom structures
│   │   └── *                       
│   └── migrations/                 # PostgreSQL structural migration schemas
│       ├── 20240419_generated_resumes.sql
│       ├── 20260327044335_profiles.sql
│       └── 20260414_master_vault.sql
├── tailwind.config.ts              # Custom CSS rules mapping the premium brand token system
├── tsconfig.json                   # Base TypeScript config mapping `@/*` to `src/*`
└── vite.config.ts                  # Bundler mapping aliases, R3F optimizers, and ports
```

---

## 3. Core Architecture & Data Flow

### 3.1. Job Description Forensic Extraction
When a user inputs raw JD text in the `ScannerView`, the data undergoes the following routing sequence:

```mermaid
graph TD
    A[Raw JD Text Input] --> B{Length Check}
    B -- >15,000 Chars --> C[Reject & Toast Error]
    B -- Valid Chars --> D[Check offline jdCache]
    D -- Hit found --> E[Instantly hydrate state with cached DecodeResult]
    D -- Miss --> F[Set isScanning = true]
    F --> G[Invoke Supabase Edge Function: decode-jd]
    G -- Success --> H[Hydrate DecodeResult & Update local cache]
    G -- Failure / Timeout --> I[Switch to Local API Proxy: /api/analyze]
    I --> J[Groq API Multi-Model Fallback Chain]
    J -- Success --> H
    J -- Failure --> K[Trigger Forensic Engine Fault Toast]
```

### 3.2. Offline Deterministic Resume Matching
To guarantee stable, verifiable, and instant feedback without database roundtrips, the matching engine (`src/lib/deterministicScorer.ts`) is designed to be **100% deterministic and runs entirely client-side**.

#### Heuristics of the Deterministic Scorer:
1. **Text Normalization**: Strips casing, standardizes smart quotes/hyphens, clears bracketed markers, and cleans whitespaces.
2. **Word-Boundary Matching**: Rejects partial false-positive substrings (e.g., matching `"AI"` will trigger on `"work with AI tools"` but never on `"plain"` or `"email"`).
3. **Advanced Skill Expansion**:
   - **Slash Alternatives**: Parses `"AWS / GCP"` or `"Python/TypeScript"` to check each option separately, while skipping standard compound terms like `"CI/CD"` or `"UI/UX"`.
   - **Parenthetical Alternatives**: Translates `"RAG (Retrieval Augmented Generation)"` into a primary term `"RAG"` and nested alternatives `["Retrieval Augmented Generation"]`. Commas inside brackets like `"LLMs (OpenAI, Anthropic, Llama)"` are converted to array items.
   - **Synonym Expansion**: Applies canonical terms from a local lookup table (e.g., mapping `"js"` and `"ecmascript"` to `"javascript"`).
4. **Weighted Scopes**: Computes an aggregate score out of 100 based on the scavenged skill weight (based on importance attributes). Missing or partial items trigger mathematically scaled score deductions.

### 3.3. Where Does it Generate the Resume From? (Data Sources)
The resume is compiled from two core database entities in Supabase, merged with the active user session metadata:
- **The User Profile (`profiles` table)**: This stores core contact metadata—Full Name, Email, Phone, Location, LinkedIn URL, GitHub URL, Portfolio Website, and Master Summary.
- **The Master Vault (`master_vault` table)**: This acts as a secure career data store. It contains categorized, granular history of professional experience, education, projects, products/ventures, leadership, certifications, and awards.
- **Target Job Details**: Passed down when scanning a new Job Description, which includes the **Target Job Title**, the **Target Company**, and **Target Skills & Keywords** scored by importance.

---

## 4. Synthesizing Pipeline

When clicking **Generate Resume / Synthesize**, the application orchestrates a structured multi-engine prompt that merges the raw inputs:

```mermaid
graph TD
    A[Click Generate Resume / Synthesize] --> B[serializeVaultItems: Compile Candidate Facts]
    B --> C[Construct Tactical Prompt with Tone, Mandates, and Length Rules]
    C --> D{Invoke Edge Function: 'analyze'}
    D -->|Success| G[Receive Tailored JSON Resume]
    D -->|Failure| E[Loop through Fallback Engines & Local API Proxy Fallback]
    E -->|Success| G
    E -->|All Fail| F[Trigger Detailed Toast Failure & Troubleshooting]
    G --> H[Sanitize & Format Output: 'sanitizeGeneratedResume']
    H --> I[Restore Exact Date Formats & Links: 'restoreExactProfileData']
    I --> J[Populate ResumePreview State for Interactive Editing]
```

### 4.1. The Three-Layer Resume Optimization Pipeline
Lumina implements an elite personalization mechanism that tailors resumes using structural alignment:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as Client Dashboard
    participant Vault as Supabase DB: master_vault
    participant AI as Edge Function: analyze
    participant Exporter as Client Exporter: pdfExporter

    User->>App: Paste JD and Resume
    App->>App: Run skillScavenger & deterministicScorer
    App->>User: Display specific skill gaps and red flags
    User->>App: Clicks "Tailor Resume"
    App->>Vault: Retrieve User's Layered Master Profile (Professional, Projects, Education, Certifications)
    Vault-->>App: Return complete Master Experience Set
    App->>AI: Send User Profile + Master Experiences + Target JD Skills
    Note over AI: AI selects the most relevant experience layers,<br/>optimizes bullet points for ATS alignment,<br/>and quantifies achievements.
    AI-->>App: Return Tailored JSON Resume structure
    App->>User: Render Live Tailored Resume preview
    User->>Exporter: Trigger unified export action
    Exporter-->>User: Download pixel-perfect, tailored ATS-friendly PDF
```

### 4.2. Input Serialization
Before calling the LLM, the application runs a serialization step (`serializeVaultItems`) that compiles all vault cards into structured, textual "Candidate Facts". This ensures dates, links, bullets, and titles are presented cleanly to the AI.

### 4.3. The Tactical Prompt Alignment Strategy
A rich, recruiter-vetted system prompt is constructed with five major mandates:
1. **Recruiter Lens & Gap-Alignment (CRITICAL)**: Actively analyze the target Job Description (JD) against the Candidate Facts & Profile Vault. Identify structural gaps (missing keywords, scale limitations, or context variations).
2. **Proactive Bridge & Context Enrichment**: Proactively bridge these alignment gaps by extracting and framing the candidate's existing achievements, projects, or professional experiences to explicitly showcase the skills, stack, and methodologies demanded by the JD. If a particular technology or skill is not directly detailed with descriptions in the profile, but the item contains that technology/skill in its title or tags, highlight its utilization, execution, and integration details within the generated bullet points, bridging the gap completely using professional, concrete context.
3. **Fidelity to Facts & Zero Hallucination**: Do NOT inflate, fabricate, or exaggerate achievements. If the Candidate Profile's experience entries lack specific metrics or scale, do NOT hallucinate or guess them. Instead, craft the narrative focusing on the scope of their responsibility, the technologies utilized, and the qualitative impact of their work as explicitly described in the provided Candidate Profile and Master Vault. Under no circumstances should you invent fake metric percentages (e.g. "increased efficiency by 34%") if they are not explicitly present in the candidate's Master Vault items.
4. **Google "XYZ" Formula**: Experience bullets should follow the Google "XYZ" formula: "Accomplished [X] as measured by [Y], by doing [Z]" where metric details are present. Focus on active verbs, quantifiable impacts, and explicit technical details.
5. **Strict Bullet Point Line Length Mandate (Visual A4 PDF Optimization)**: Every generated bullet point (for Experience, Projects, Products, and Leadership sections) MUST fall strictly into one of the following perfect-line character length ranges (including spaces) so they beautifully and fully fill visual lines on a standard A4 PDF page without creating awkward visual orphans or hanging words:
   - For 1 full line: EXACTLY 110 to 125 characters.
   - For 2 full lines: EXACTLY 220 to 250 characters.
   - For 3 full lines: EXACTLY 330 to 375 characters.
   DO NOT generate any bullet point that falls outside these ranges (e.g., do not generate bullets between 126 and 219 characters, or between 251 and 329 characters, or less than 110 characters). Adjust wording, technical detail, or scope description dynamically to hit these exact target ranges perfectly. Maintain 100% truth/fidelity to facts; do not fabricate fake metrics to pad lengths—instead, describe existing tasks, technologies, or responsibilities with more or less descriptive, precise detail.
6. **Strict Retention of Metadata**: Strictly preserve and use the exact links (GitHub, live links), exact date formats, and organization details from the Candidate facts as provided. Never omit, simplify, or modify links or dates.
7. **Tone Customization**: Compose all generated narrative (including the professional summary, experience bullets, project descriptions, and leadership items) in a highly specialized tone chosen by the user:
   - **Professional**: Write in a balanced, authoritative, and traditional executive voice. Focus on established leadership, industry-standard methodologies, cross-functional collaboration, and robust organizational impact.
   - **Modern**: Write in a forward-looking, tech-forward, and innovative voice. Emphasize modern tech-stack paradigms (cloud-native architectures, AI/ML integrations, microservices, system scaling), engineering velocity, agility, and state-of-the-art developer tools.
   - **Creative (Executive Impact)**: Write in an ultra-impact, hyper-performance, results-first voice. Use exceptionally punchy and strong action verbs, highlighting massive efficiency gains, significant cost savings, engineering velocity, and direct bottom-line optimization. Make every single bullet point feel relentless, ambitious, and competitively elite.

### 4.4. Multi-Engine Cascade (Fallback Pipeline)
To ensure the generator never hangs or fails due to third-party rate limits, it runs a sequential fall-back loop through premium AI models:
1. `llama-3.3-70b-versatile` *(Primary Engine)*
2. `llama-3.1-70b-versatile` *(Secondary Engine)*
3. `mixtral-8x7b-32768` *(Tertiary Engine)*
4. `llama-3.1-8b-instant` *(Quaternary baseline Engine)*

If the Supabase edge function fails, it immediately activates an emergency **Local API Proxy** (`/api/analyze`) to bypass network blocks.

### 4.5. Sanitization and Fact Restoration
Once the JSON is returned from the AI, it passes through two post-processing steps:
1. **`sanitizeGeneratedResume`**: Ensures all bullet prefixes, dashes, or non-breaking spaces are normalized. It restricts summary sentence counts and experience bullet budgets to match your layout settings.
2. **`restoreExactProfileData`**: Re-examines your original master vault items and replaces the AI's output periods, links, and degrees with your exact factual values. This acts as an absolute verification layer, protecting dates and links from AI modifications.

### 4.6. Delivery & Interactive Synchronization
The sanitized and restored resume object is loaded into the **Interactive Resume Preview editor**.
- You can freely edit dates, titles, descriptions, and contact info right on the preview.
- Clicking **Save** triggers the brand-new synchronization engine, instantly updating the underlying `profiles` and `master_vault` tables in Supabase, and calling `loadVault()` to refresh the active generator facts. Your next tailoring instantly builds on top of these edits!

---

## 5. Coding Conventions & Architectural Guidelines

To maintain visual excellence, performance, and structure, all developers must adhere to these patterns:

### 5.1. Visual & Styling Standards (Vercel-Vite Standard)
- **Fluid Layout Tokens**: Use native variables (`var(--primary)`, `var(--secondary)`, etc.) instead of hardcoded hex values to support global theme changes.
- **Glassmorphism & Texture**: Wrap dashboard groups in `.premium-card`, `.glass-panel`, or `.bento-card` classes. Use `.bg-noise` overlays and `.mesh-bg` gradients to preserve the modern visual standard.
- **Tailwind Restrictions**: Do not build unorganized utility classes. Group Tailwind directives inside CSS components using `@apply` if they are repeated more than three times.
- **No Placeholders**: Never use mock icons or grey layout boxes. Generate high-fidelity custom SVGs or apply the visual asset generator.

### 5.2. State Management & Data Fetching
- **Server States**: Use **React Query** (`useQuery`, `useMutation`) for database entities (such as profiles, user applications, and generated resume vaults). Do not store server-fetched data in global React states.
- **Local Persistence States**: Keep operational JD records, scan history, and active session identifiers synchronized with `localStorage` utilizing wrapper methods in `src/lib/sessionStorage.ts` and `src/lib/jdCache.ts`.

### 5.3. Database Integrity & Row Level Security (RLS)
- **RLS Enforcement**: Every table under the `public` schema **MUST** enable RLS and specify explicit security policies.
- **User Segregation**: Enforce user segregation by matching against the user token identifier:
  ```sql
  CREATE POLICY "Users can manage their own records"
      ON public.target_table FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  ```
- **Automated Timestamps**: Hook the custom trigger function `update_updated_at_column()` to the table definition to ensure `updated_at` timestamps are updated correctly on modifications.

---

## 6. AI Agent Rules (Instructions for Future LLM Agents)

> [!IMPORTANT]
> If you are an AI coding agent working on this repository, you **MUST** strictly follow the guidelines below to prevent system degradation, build crashes, or styling regressions.

### Rule 1: No Circular Dependencies (Lazy Load Pages)
- **Issue**: Standard static page routing triggers circular dependency crashes on Vite builds.
- **Rule**: All page structures in `src/App.tsx` and main tab panels in `src/pages/Dashboard.tsx` **MUST** be loaded dynamically using `React.lazy()` and wrapped in `<Suspense fallback={...}>`.

### Rule 2: Respect the Offline Deterministic Scorer
- **Issue**: Modifying matching rules can lead to score drift, rendering user resumes inconsistent.
- **Rule**: Never convert the matching scoring code in `src/lib/deterministicScorer.ts` to call external AI models. All match evaluations must remain pure, side-effect-free, offline functions. Keep the synonyms dictionary updated here as new technologies emerge.

### Rule 3: Do Not Touch Unused Root Assets
- **Issue**: Empty folders `components` and `lib` at the root, along with the `app` folder, might look like clutter.
- **Rule**: Do not delete these structures. They represent relics kept to preserve local system compatibility and Vercel sitemap deployment protocols. All active frontend source code runs strictly inside the `src` folder.

### Rule 4: Edge Function & API Fallback Pattern
- **Issue**: External AI models can experience rate-limiting (status `429`) or network timeouts.
- **Rule**: When adding or editing dashboard components that request AI analysis:
  1. Primary call should route to a Supabase Deno Edge Function.
  2. Implement an immediate, secure fallback wrapper pointing to the `/api/analyze` proxy handler.
  3. Load the target prompts securely, keeping keys sanitized on client views.

### Rule 5: Keep Comments and Types Updated
- **Issue**: Untyped structures cause compiler issues on the automated Vercel test suite.
- **Rule**: Always compile and check code with `tsc --noEmit` before proposing modifications. All JSON models returned from Edge Functions must have explicit TypeScript interface mapping inside `src/types/jd.ts`. Do not use `any` unless absolutely necessary (for instance, in third-party library adapters).
