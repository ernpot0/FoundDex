# FoundDex Development Plan

This plan breaks FoundDex into small, testable phases. Each phase must be tested and approved before moving to the next one.

---

## Phase 1: Fresh Project Initialization & Local Foundation *(Current)*
**Goal:** A clean, initialized FoundDex project running locally.
- Verify local tools (Node.js, npm, Git) and identify any missing prerequisites.
- Scaffold Next.js (TypeScript, Tailwind CSS, App Router) from scratch.
- Initialize Git version control.
- Set up environment variable template (`.env.example`) and safe Zod-based configuration loader (no real secrets required yet).
- Prepare the Supabase integration folder structure (`src/lib/supabase/`, `supabase/migrations/`).
- Build a clean FoundDex homepage and a `/api/health` endpoint.
- Add initial project documentation and verify with unit tests, lint, production build, and local server check.

---

## Phase 2: Database Schema, Authentication & Storage Setup
**Goal:** Connect FoundDex to a real Supabase project so users can sign in and data can be stored securely.
- Add real Supabase credentials to `.env.local`.
- Design PostgreSQL tables (user profiles, lost/found item reports, verification claims) with Row-Level Security (RLS) so users can only modify their own data.
- Set up Supabase Auth (sign up, sign in, sign out, session handling).
- Set up Supabase Storage bucket for item photos with size and file-type validation.

---

## Phase 3: Core Lost & Found Reporting, Search & Maps
**Goal:** Users can report lost or found items and browse/search listings on a list and map.
- Create "Report Lost Item" and "Report Found Item" forms with Zod validation.
- Upload item photos securely to Supabase Storage.
- Build search and filterable listings (category, status, date, location).
- Integrate OpenStreetMap + Leaflet for privacy-conscious location picking and map browsing.

---

## Phase 4: AI-Assisted Matching (Google Gemini)
**Goal:** Suggest potential matches between lost and found reports using secure server-side AI.
- Build server-side API route calling Google Gemini API (keeping `GEMINI_API_KEY` strictly on the server).
- Compare item descriptions, categories, locations, and dates to surface match suggestions.
- Allow users to review suggested matches.

---

## Phase 5: Ownership Verification, Safe Return & Messaging
**Goal:** Help rightful owners prove ownership and coordinate safe returns.
- Verification question/evidence workflow before sharing contact details.
- In-app messaging between finder and owner without exposing personal phone numbers/emails prematurely.
- Mark items as returned and record return confirmation.

---

## Phase 6: Recognition, Rewards, Certificates & Admin Moderation
**Goal:** Reward helpful finders and keep the platform safe.
- Recognition badges, reward points, and return certificates.
- Moderation and reporting tools for suspicious or invalid listings.

---

## Phase 7: End-to-End Testing & Google Cloud Run Deployment
**Goal:** Production readiness and deployment to `founddex.com`.
- Full Playwright end-to-end test suite covering critical user journeys.
- Containerize the Next.js app (Docker) and deploy to Google Cloud Run.
- Configure custom domain (`founddex.com`), production secrets, and monitoring.

