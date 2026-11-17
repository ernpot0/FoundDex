"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Sparkles } from "lucide-react";
import { getCategoryLabel } from "@/lib/items";

interface EnrichedMatch {
  id: string;
  title: string;
  report_type: "lost" | "found";
  category: string;
  location_name: string;
  created_at: string;
  score: number;
  reason: string;
}

interface MatchSuggestionsPanelProps {
  itemId: string;
  reportType: "lost" | "found";
}

export function MatchSuggestionsPanel({
  itemId,
  reportType,
}: MatchSuggestionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"gemini" | "fallback" | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const oppositeLabel = reportType === "lost" ? "Found" : "Lost";

  async function handleFindMatches() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const data = (await res.json()) as {
        mode?: "gemini" | "fallback";
        matches?: EnrichedMatch[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not check for matches.");
        return;
      }

      setMode(data.mode ?? "fallback");
      setMatches(data.matches ?? []);
    } catch {
      setError("Network error while checking for matches.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="font-semibold text-base inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            AI-Assisted Match Suggestions
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Compare this report against open {oppositeLabel.toLowerCase()} item
            listings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleFindMatches}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Find Potential Matches
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/60 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {matches !== null && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === "gemini"
              ? "Ranked by Google Gemini AI (server-side)."
              : "Ranked by keyword & location matching (add GEMINI_API_KEY in .env.local to enable Gemini AI)."}
          </p>

          {matches.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No strong {oppositeLabel.toLowerCase()} matches found yet. Check
              back as new reports are posted.
            </p>
          ) : (
            <div className="space-y-2.5">
              {matches.map((match) => (
                <Link
                  key={match.id}
                  href={`/items/${match.id}`}
                  className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{match.title}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {Math.round(match.score)}% match
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {match.reason}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{getCategoryLabel(match.category)}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      {match.location_name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

