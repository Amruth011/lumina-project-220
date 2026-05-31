# Contributing to Lumina

We welcome contributions! Here's how to get started:

## Development Setup

```bash
git clone https://github.com/your-org/lumina
cd lumina
npm install
npm run dev
```

## Project Structure

```
src/
  components/     # UI components (organized by feature)
    arsenal/      # 5-Resume Arsenal
    pipeline/     # Pipeline Dashboard
    scoring/      # Job Scoring
    interview/    # Interview Prep
    vault/        # Master Vault extracted components
    resume-tailor/ # Resume preview & editing
  hooks/          # Custom React hooks
  lib/            # Shared utilities & business logic
  pages/          # Route-level page components
  types/          # TypeScript type definitions
```

## Code Standards

- **TypeScript**: strict mode, no `any` without explicit eslint disable
- **Styling**: Tailwind CSS, utility classes only
- **Components**: co-locate related components. Extract from monoliths into feature dirs.
- **Imports**: use `@/` path alias for src-relative imports
- **State**: use hooks for shared state, Supabase for persistence
- **Error handling**: wrap route components in `<ErrorBoundary>`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run build` to verify
4. Open a PR with a clear description

## Feature Flags

Pro features are gated in `src/lib/featureFlags.ts`. New features should be added there.

## License

MIT
