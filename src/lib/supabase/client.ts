import { createBrowserClient } from "@supabase/ssr";
import { getIntegrationStatus, getPublicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Creates a browser-side Supabase client when Supabase credentials are configured.
 * Returns null in Phase 1 / placeholder mode so the app runs safely without credentials.
 */
export function createSupabaseBrowserClient() {
  const status = getIntegrationStatus();
  if (!status.supabaseConfigured) {
    return null;
  }

  const env = getPublicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

