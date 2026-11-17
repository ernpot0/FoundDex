# Changelog

All notable changes to **FoundDex** are documented in this file.

## [0.4.0] - 2026-11-16 — Phase 4: AI-Assisted Matching (Google Gemini)

### Added
- Server-side matching service (`src/lib/matching.ts`, `src/lib/matching.test.ts`) supporting Google Gemini (`gemini-2.5-flash`) with Zod-validated JSON output and deterministic keyword/location/proximity fallback.
- Secure server-only matching endpoint (`POST /api/matches` in `src/app/api/matches/route.ts`).
- Interactive `MatchSuggestionsPanel` (`src/components/MatchSuggestionsPanel.tsx`) integrated into `/items/[id]`.

## [0.3.0] - 2026-11-16 — Phase 3: Lost & Found Reporting, Search & Maps

### Added
- Zod item report validation, category definitions, and storage URL helper (`src/lib/items.ts`, `src/lib/items.test.ts`).
- OpenStreetMap + Leaflet interactive map components (`src/components/LocationPickerMap.tsx`, `src/components/ItemsMap.tsx`) with privacy-rounded coordinates.
- Lost/Found item reporting flow (`/report`, `src/components/ReportItemForm.tsx`) with Supabase Storage photo upload.
- Search & Browse Listings page (`/items`) with keyword, report-type, and category filters plus map view.
- Item Detail page (`/items/[id]`) and updated FoundDex homepage (`src/app/page.tsx`) with recent reports.

## [0.2.0] - 2026-11-16 — Phase 2: Database Schema, Auth & Storage

### Added
- Initial PostgreSQL schema migration (`supabase/migrations/202611160001_initial_schema.sql`) with `profiles`, `items`, and `claims` tables, Row-Level Security (RLS) policies, automatic `handle_new_user()` profile trigger, and `item-photos` Storage bucket (5 MB max, JPEG/PNG/WebP).
- Strongly typed Supabase `Database` definitions (`src/lib/supabase/types.ts`).
- Next.js 16 session refresh proxy (`src/proxy.ts` and `src/lib/supabase/proxy.ts`).
- Storage photo validation and user-scoped path helpers (`src/lib/storage.ts`, `src/lib/storage.test.ts`).
- Authentication pages and routes: `/login`, `/account`, `/auth/callback`, `/auth/signout`, and shared `Navbar` (`src/components/Navbar.tsx`).

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

