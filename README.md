# FoundDex

**Find. Verify. Return.**

FoundDex (`founddex.com`) is a global lost-and-found platform where people can report lost or found items, search listings, receive AI-assisted matching suggestions, verify ownership safely, coordinate returns, and earn recognition and rewards.

> **Important:** FoundDex is strictly a lost-and-found platform. It is **not** an e-commerce website—users cannot buy or sell products.

---

## Current Status

- **Current Phase:** Phase 1 — Fresh Project Initialization & Local Foundation
- **Milestone Goal:** A clean, initialized FoundDex project running locally with core structure, documentation, environment templates, and database integration scaffolding.

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for the full roadmap and [PROGRESS.md](./PROGRESS.md) for completed and pending tasks.

---

## Technology Stack

- **Frontend & Backend:** Next.js (App Router), React, TypeScript
- **Styling & UI:** Tailwind CSS, Lucide Icons, shadcn/ui-ready utility structure
- **Database, Auth & Storage:** Supabase (PostgreSQL, Auth, Storage) *(configured in Phase 2)*
- **AI Integration:** Google Gemini API via secure server-side endpoints *(configured in Phase 4)*
- **Maps:** OpenStreetMap with Leaflet *(configured in Phase 3)*
- **Validation:** Zod
- **Testing:** Vitest (unit tests) and Playwright (end-to-end tests)
- **Deployment Target:** Google Cloud Run *(configured in final deployment phase)*

---

## Prerequisites

- **Node.js** v20+ (currently tested on `v24.22.1`)
- **npm** (currently tested on `12.2.1`)
- **Git** (currently tested on `2.56.0`)

> **Windows PowerShell Note:** If `npm` or `npx` is blocked by PowerShell script execution policy, use `npm.cmd` and `npx.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell.

---

## Local Setup & Running the App

1. **Install dependencies** (if not already installed):
   ```bash
   npm.cmd install
   ```

2. **Environment variables (optional for Phase 1):**
   The app runs safely in placeholder mode without real credentials. When ready to connect Supabase or Gemini in later phases, copy `.env.example` to `.env.local` and fill in your keys:
   ```bash
   copy .env.example .env.local
   ```

3. **Start the development server:**
   ```bash
   npm.cmd run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Run checks & tests:**
   ```bash
   npm.cmd run lint
   npm.cmd run test
   npm.cmd run build
   ```

---

## Project Documentation

- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) — Step-by-step development phases
- [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) — System design and folder structure
- [PROGRESS.md](./PROGRESS.md) — Completed tasks, pending tasks, errors, and decisions
- [CHANGELOG.md](./CHANGELOG.md) — History of changes
- [.env.example](./.env.example) — Environment variable template
