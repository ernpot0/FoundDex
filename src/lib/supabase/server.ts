import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getIntegrationStatus, getPublicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Creates a server-side Supabase client using Next.js cookies when configured.
 * Returns null in Phase 1 / placeholder mode so the app runs safely without credentials.
 */
export async function createSupabaseServerClient() {
  const status = getIntegrationStatus();
  if (!status.supabaseConfigured) {
    return null;
  }

  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component where setting cookies is not permitted.
          }
        },
      },
    }
  );
}

