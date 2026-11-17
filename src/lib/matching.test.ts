import { describe, expect, it } from "vitest";
import { computeFallbackMatches, type MatchableItem } from "./matching";

const BASE_LOST: MatchableItem = {
  id: "lost-1",
  report_type: "lost",
  title: "Black leather wallet",
  category: "wallet-keys",
  description: "Lost a black leather bifold wallet near Central Station.",
  location_name: "Central Station, Karachi",
  latitude: 24.861,
  longitude: 67.001,
  occurred_at: null,
  created_at: "2026-11-16T10:00:00Z",
};

describe("fallback item matching", () => {
  it("ranks a closely matching found item highly", () => {
    const candidates: MatchableItem[] = [
      {
        id: "found-1",
        report_type: "found",
        title: "Found black leather wallet",
        category: "wallet-keys",
        description: "Picked up a black bifold wallet outside Central Station.",
        location_name: "Central Station",
        latitude: 24.862,
        longitude: 67.002,
        occurred_at: null,
        created_at: "2026-11-16T11:00:00Z",
      },
      {
        id: "found-2",
        report_type: "found",
        title: "Blue umbrella",
        category: "other",
        description: "Left on a bus.",
        location_name: "North Nazimabad",
        latitude: 24.94,
        longitude: 67.04,
        occurred_at: null,
        created_at: "2026-11-16T11:00:00Z",
      },
    ];

    const matches = computeFallbackMatches(BASE_LOST, candidates);
    expect(matches).toHaveLength(1);
    expect(matches[0].candidateId).toBe("found-1");
    expect(matches[0].score).toBeGreaterThanOrEqual(70);
  });

  it("ignores items of the same report_type", () => {
    const sameType: MatchableItem[] = [
      {
        ...BASE_LOST,
        id: "lost-2",
      },
    ];

    expect(computeFallbackMatches(BASE_LOST, sameType)).toEqual([]);
  });
});

