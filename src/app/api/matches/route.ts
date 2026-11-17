import { NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationStatus, getServerEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  computeFallbackMatches,
  findMatchesWithGemini,
  type MatchableItem,
} from "@/lib/matching";

const requestSchema = z.object({
  itemId: z.string().uuid("Invalid item ID."),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { data: target, error: targetError } = await supabase
    .from("items")
    .select(
      "id, report_type, title, category, description, location_name, latitude, longitude, occurred_at, created_at"
    )
    .eq("id", parsed.data.itemId)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const oppositeType = target.report_type === "lost" ? "found" : "lost";
  const { data: candidates, error: candidatesError } = await supabase
    .from("items")
    .select(
      "id, report_type, title, category, description, location_name, latitude, longitude, occurred_at, created_at"
    )
    .eq("report_type", oppositeType)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(25);

  if (candidatesError) {
    return NextResponse.json(
      { error: "Failed to load candidate items." },
      { status: 500 }
    );
  }

  const candidateList: MatchableItem[] = candidates ?? [];
  const status = getIntegrationStatus();
  const serverEnv = getServerEnv();

  let result: {
    mode: "gemini" | "fallback";
    matches: ReturnType<typeof computeFallbackMatches>;
  };

  if (status.geminiConfigured && serverEnv.GEMINI_API_KEY) {
    result = await findMatchesWithGemini(
      target,
      candidateList,
      serverEnv.GEMINI_API_KEY
    );
  } else {
    result = {
      mode: "fallback",
      matches: computeFallbackMatches(target, candidateList),
    };
  }

  const byId = new Map(candidateList.map((c) => [c.id, c]));
  const enriched = result.matches
    .map((m) => {
      const item = byId.get(m.candidateId);
      if (!item) return null;
      return {
        id: item.id,
        title: item.title,
        report_type: item.report_type,
        category: item.category,
        location_name: item.location_name,
        created_at: item.created_at,
        score: m.score,
        reason: m.reason,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({
    mode: result.mode,
    matches: enriched,
  });
}

