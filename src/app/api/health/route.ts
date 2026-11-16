import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/env";

/**
 * Basic server health check endpoint.
 * Reports application readiness and whether optional integrations are configured,
 * without exposing any API keys or secrets.
 */
export async function GET() {
  const integrations = getIntegrationStatus();

  return NextResponse.json({
    status: "ok",
    app: "FoundDex",
    phase: "Phase 1 — Initial Foundation",
    integrations: {
      supabase: integrations.supabaseConfigured ? "configured" : "placeholder",
      gemini: integrations.geminiConfigured ? "configured" : "placeholder",
    },
    timestamp: new Date().toISOString(),
  });
}

