import { z } from "zod";

const PLACEHOLDER_MARKERS = ["your-project-id", "placeholder", "your-"];

function isPlaceholder(value: string | undefined): boolean {
  if (!value || value.trim() === "") return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

export interface IntegrationStatus {
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
  appUrl: string;
}

/**
 * Reads and validates public environment variables with safe defaults.
 * Never throws when optional Phase 2+ credentials are not yet configured.
 */
export function getPublicEnv(
  source: Record<string, string | undefined> = process.env
) {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    return {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    };
  }

  return parsed.data;
}

/**
 * Reads and validates server-only + public environment variables.
 * Must only be called on the server.
 */
export function getServerEnv(
  source: Record<string, string | undefined> = process.env
) {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: source.GEMINI_API_KEY,
  });

  if (!parsed.success) {
    return {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      GEMINI_API_KEY: undefined,
    };
  }

  return parsed.data;
}

/**
 * Returns boolean integration readiness without exposing any secrets.
 */
export function getIntegrationStatus(
  source: Record<string, string | undefined> = process.env
): IntegrationStatus {
  const env = getServerEnv(source);
  const supabaseConfigured =
    !isPlaceholder(env.NEXT_PUBLIC_SUPABASE_URL) &&
    !isPlaceholder(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const geminiConfigured = !isPlaceholder(env.GEMINI_API_KEY);

  return {
    supabaseConfigured,
    geminiConfigured,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  };
}

