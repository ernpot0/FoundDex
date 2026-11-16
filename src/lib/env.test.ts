import { describe, expect, it } from "vitest";
import { getIntegrationStatus, getPublicEnv } from "./env";

describe("env configuration", () => {
  it("falls back safely when no environment variables are set", () => {
    const publicEnv = getPublicEnv({});
    expect(publicEnv.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");

    const status = getIntegrationStatus({});
    expect(status.supabaseConfigured).toBe(false);
    expect(status.geminiConfigured).toBe(false);
  });

  it("treats placeholder values as unconfigured", () => {
    const status = getIntegrationStatus({
      NEXT_PUBLIC_SUPABASE_URL: "https://your-project-id.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "your-supabase-anon-key-placeholder",
      GEMINI_API_KEY: "your-gemini-api-key-placeholder",
    });

    expect(status.supabaseConfigured).toBe(false);
    expect(status.geminiConfigured).toBe(false);
  });

  it("reports integrations as configured when real-looking values are provided", () => {
    const status = getIntegrationStatus({
      NEXT_PUBLIC_APP_URL: "https://founddex.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefg.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      GEMINI_API_KEY: "AIzaSyExampleKeyValue12345",
    });

    expect(status.appUrl).toBe("https://founddex.com");
    expect(status.supabaseConfigured).toBe(true);
    expect(status.geminiConfigured).toBe(true);
  });
});

