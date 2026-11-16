import { describe, expect, it } from "vitest";
import { createItemSchema, getCategoryLabel } from "./items";

describe("item report validation", () => {
  it("accepts a valid lost item report", () => {
    const parsed = createItemSchema.safeParse({
      report_type: "lost",
      title: "Black leather wallet",
      category: "wallet-keys",
      description: "Lost near the central station ticket counter around 5pm.",
      location_name: "Central Station",
      latitude: 24.8607,
      longitude: 67.0011,
      occurred_at: "2026-11-16",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects short title or description", () => {
    const parsed = createItemSchema.safeParse({
      report_type: "found",
      title: "Hi",
      category: "electronics",
      description: "Too short",
      location_name: "Park",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    const parsed = createItemSchema.safeParse({
      report_type: "found",
      title: "Silver wristwatch",
      category: "jewelry-watches",
      description: "Found on a bench near the north fountain.",
      location_name: "City Park",
      latitude: 120,
      longitude: 67,
    });

    expect(parsed.success).toBe(false);
  });

  it("maps category values to human-readable labels", () => {
    expect(getCategoryLabel("electronics")).toBe("Electronics & Phones");
    expect(getCategoryLabel("unknown")).toBe("Other Items");
  });
});

