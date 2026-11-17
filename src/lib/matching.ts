import { z } from "zod";

export interface MatchableItem {
  id: string;
  report_type: "lost" | "found";
  title: string;
  category: string;
  description: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  occurred_at: string | null;
  created_at: string;
}

export interface MatchSuggestion {
  candidateId: string;
  score: number;
  reason: string;
}

const geminiMatchResponseSchema = z.object({
  matches: z
    .array(
      z.object({
        candidateId: z.string().min(1),
        score: z.number().min(0).max(100),
        reason: z.string().min(3).max(300),
      })
    )
    .max(10),
});

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "near",
  "from",
  "that",
  "this",
  "was",
  "were",
  "have",
  "lost",
  "found",
  "item",
]);

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(words);
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/**
 * Deterministic fallback matcher used when GEMINI_API_KEY is not configured
 * or if the AI API is temporarily unreachable.
 */
export function computeFallbackMatches(
  target: MatchableItem,
  candidates: MatchableItem[]
): MatchSuggestion[] {
  const targetTokens = tokenize(`${target.title} ${target.description}`);
  const targetLocTokens = tokenize(target.location_name);

  const scored: MatchSuggestion[] = [];

  for (const candidate of candidates) {
    if (candidate.id === target.id) continue;
    if (candidate.report_type === target.report_type) continue;

    let score = 0;
    const reasons: string[] = [];

    if (candidate.category === target.category) {
      score += 35;
      reasons.push("same category");
    }

    const candTokens = tokenize(`${candidate.title} ${candidate.description}`);
    let sharedKeywords = 0;
    for (const token of targetTokens) {
      if (candTokens.has(token)) sharedKeywords++;
    }
    if (sharedKeywords > 0) {
      const kwPoints = Math.min(40, sharedKeywords * 12);
      score += kwPoints;
      reasons.push(
        `${sharedKeywords} shared keyword${sharedKeywords > 1 ? "s" : ""}`
      );
    }

    const candLocTokens = tokenize(candidate.location_name);
    let sharedLoc = 0;
    for (const token of targetLocTokens) {
      if (candLocTokens.has(token)) sharedLoc++;
    }
    if (sharedLoc > 0) {
      score += 15;
      reasons.push("similar area name");
    }

    if (
      target.latitude !== null &&
      target.longitude !== null &&
      candidate.latitude !== null &&
      candidate.longitude !== null
    ) {
      const distKm = haversineKm(
        target.latitude,
        target.longitude,
        candidate.latitude,
        candidate.longitude
      );
      if (distKm <= 5) {
        score += 10;
        reasons.push(`within ${Math.max(1, Math.round(distKm))} km`);
      } else if (distKm <= 20) {
        score += 5;
        reasons.push(`within ${Math.round(distKm)} km`);
      }
    }

    if (score >= 25) {
      scored.push({
        candidateId: candidate.id,
        score: Math.min(99, score),
        reason:
          reasons.length > 0
            ? `Matched on ${reasons.join(", ")}.`
            : "Potential category/location match.",
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Calls Google Gemini API strictly on the server to rank potential matches
 * between a lost/found report and opposite-type candidates.
 */
export async function findMatchesWithGemini(
  target: MatchableItem,
  candidates: MatchableItem[],
  apiKey: string
): Promise<{ mode: "gemini" | "fallback"; matches: MatchSuggestion[] }> {
  if (candidates.length === 0) {
    return { mode: "gemini", matches: [] };
  }

  const promptPayload = {
    target: {
      id: target.id,
      report_type: target.report_type,
      title: target.title,
      category: target.category,
      description: target.description,
      location_name: target.location_name,
      occurred_at: target.occurred_at,
    },
    candidates: candidates.map((c) => ({
      id: c.id,
      report_type: c.report_type,
      title: c.title,
      category: c.category,
      description: c.description,
      location_name: c.location_name,
      occurred_at: c.occurred_at,
    })),
  };

  const systemInstruction = [
    "You are the FoundDex lost-and-found matching assistant.",
    "Compare the target item against the candidate items of the opposite report_type.",
    "Return JSON with shape: { \"matches\": [{ \"candidateId\": string, \"score\": number (0-100), \"reason\": string }] }.",
    "Only include plausible matches (score >= 30), sorted highest score first, max 5 items.",
    "Keep each reason concise (1 short sentence) and never invent details not present in the reports.",
  ].join(" ");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemInstruction}\n\nData:\n${JSON.stringify(
                    promptPayload
                  )}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      return {
        mode: "fallback",
        matches: computeFallbackMatches(target, candidates),
      };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText =
      payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsedJson = JSON.parse(rawText);
    const validated = geminiMatchResponseSchema.safeParse(parsedJson);

    if (!validated.success) {
      return {
        mode: "fallback",
        matches: computeFallbackMatches(target, candidates),
      };
    }

    const validIds = new Set(candidates.map((c) => c.id));
    const filtered = validated.data.matches
      .filter((m) => validIds.has(m.candidateId) && m.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return { mode: "gemini", matches: filtered };
  } catch {
    return {
      mode: "fallback",
      matches: computeFallbackMatches(target, candidates),
    };
  }
}

