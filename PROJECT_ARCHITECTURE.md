# FoundDex Project Architecture

## 1. High-Level Overview

FoundDex is built as a **full-stack Next.js (App Router) application**. This means both the user interface (what you see in the browser) and the secure server logic (API endpoints, database queries, AI calls) live cleanly inside one organized codebase, while keeping all secrets strictly on the server.

```
[ Browser / User ]
       │
       ├──► Next.js Frontend (React, TypeScript, Tailwind CSS)
       │         ├── Public pages (Homepage, Search, Item Details)
       │         └── Interactive Maps (OpenStreetMap + Leaflet — Phase 3)
       │
       └──► Next.js Server / API Routes (Backend)
                 ├── Zod Validation (checks all incoming data)
                 ├── Supabase PostgreSQL & Auth (Database & Users — Phase 2)
                 ├── Supabase Storage (Item Photos — Phase 2)
                 └── Google Gemini API (AI Matching, Server-Only — Phase 4)
```

---

## 2. Key Architectural Decisions (in Plain Language)

1. **Next.js App Router + TypeScript:**
   Gives us fast page loads, strong type safety (catches bugs before the code runs), and built-in server routes so we don't have to manage a separate backend server.
2. **Server-Side Secrets Only:**
   Sensitive keys like `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are never prefixed with `NEXT_PUBLIC_`. Next.js guarantees they never get sent to the user's browser.
3. **Graceful Placeholder Mode (Phase 1):**
   The environment loader (`src/lib/env.ts`) validates settings with Zod and detects whether Supabase and Gemini are configured yet. This lets us run and test the app locally right away without needing real cloud accounts on day one.
4. **Supabase for Database, Auth, and Storage:**
   Instead of building login security and file servers from scratch, Supabase provides PostgreSQL (a reliable database), user authentication, and image storage in one place.
5. **OpenStreetMap + Leaflet:**
   Free, open mapping tools that avoid vendor lock-in and allow privacy-friendly approximate location pins.

---

## 3. Current Folder Structure (Phase 1)

```
founddex/
├── .env.example              # Template showing required environment variables (no secrets)
├── .gitignore                # Tells Git which files to ignore (like .env.local and node_modules)
├── CHANGELOG.md              # Record of versioned changes
├── DEVELOPMENT_PLAN.md       # Phased roadmap
├── PROGRESS.md               # Live tracker of completed, pending, errors, and decisions
├── PROJECT_ARCHITECTURE.md   # This architecture document
├── README.md                 # Project overview and local setup guide
├── next.config.ts            # Next.js configuration
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript settings
├── vitest.config.ts          # Unit test runner configuration
├── supabase/
│   ├── README.md             # Guide for upcoming database setup
│   └── migrations/           # Folder for future SQL database migrations
└── src/
    ├── app/
    │   ├── api/
    │   │   └── health/
    │   │       └── route.ts  # Server health check endpoint (/api/health)
    │   ├── globals.css       # Global Tailwind CSS styles
    │   ├── layout.tsx        # Root HTML layout & metadata
    │   └── page.tsx          # FoundDex homepage
    └── lib/
        ├── env.ts            # Zod-validated environment configuration
        ├── env.test.ts       # Unit tests for environment configuration
        ├── utils.ts          # Shared UI class helper (`cn`)
        └── supabase/
            ├── client.ts     # Browser-side Supabase client helper (placeholder-safe)
            ├── server.ts     # Server-side Supabase client helper (placeholder-safe)
            └── types.ts      # Placeholder for generated database types
```

