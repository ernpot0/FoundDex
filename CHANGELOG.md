# Changelog

All notable changes to **FoundDex** are documented in this file.

## [0.1.0] - 2026-11-16 — Phase 1: Fresh Project Initialization

### Added
- Brand-new Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4 project scaffold.
- Core dependencies: `zod`, `lucide-react`, `clsx`, `tailwind-merge`, `@supabase/supabase-js`, `@supabase/ssr`, and `vitest`.
- Required project documentation: `README.md`, `DEVELOPMENT_PLAN.md`, `PROJECT_ARCHITECTURE.md`, `PROGRESS.md`, `CHANGELOG.md`.
- `.env.example` template for application, Supabase, and Gemini API environment variables (without secrets).
- Zod-validated environment helper (`src/lib/env.ts`) with safe placeholder detection.
- Supabase client/server/types scaffolding (`src/lib/supabase/`) and `supabase/` migrations directory.
- Server health endpoint (`src/app/api/health/route.ts`).
- Initial FoundDex homepage (`src/app/page.tsx`) with brand identity ("Find. Verify. Return.").
- Unit tests (`src/lib/env.test.ts`) for environment validation and placeholder detection.

