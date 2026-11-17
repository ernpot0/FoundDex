# Deploying FoundDex to Google Cloud Run

This guide deploys **FoundDex** as a brand-new Google Cloud Run service (completely separate from any legacy prototype).

---

## Prerequisites

1. **Google Cloud SDK (`gcloud`)** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_NEW_GCP_PROJECT_ID
   ```
2. Enable required Google Cloud APIs:
   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

---

## Step 1: Build & Push Container Image

`NEXT_PUBLIC_*` variables are baked into the browser bundle at build time, while `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are injected at runtime on the server.

```bash
gcloud builds submit \
  --tag gcr.io/YOUR_NEW_GCP_PROJECT_ID/founddex:latest \
  --build-arg NEXT_PUBLIC_APP_URL=https://founddex.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```
*(Or create a `cloudbuild.yaml` / Artifact Registry repository for CI/CD.)*

---

## Step 2: Deploy to Cloud Run

```bash
gcloud run deploy founddex \
  --image gcr.io/YOUR_NEW_GCP_PROJECT_ID/founddex:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NEXT_PUBLIC_APP_URL=https://founddex.com,NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co,NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY" \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=founddex-supabase-service-role:latest,GEMINI_API_KEY=founddex-gemini-api-key:latest"
```

> **Tip:** Store `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` in Google Secret Manager rather than plain environment variables.

---

## Step 3: Custom Domain (`founddex.com`) & Supabase Auth Redirects

1. Map `founddex.com` in **Cloud Run → Manage Custom Domains** (or Cloud Load Balancing) and update your DNS records as instructed.
2. In **Supabase Dashboard → Authentication → URL Configuration**:
   - Set **Site URL** to `https://founddex.com`.
   - Add `https://founddex.com/auth/callback` to **Redirect URLs**.

