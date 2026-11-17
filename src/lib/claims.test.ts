import { describe, expect, it } from "vitest";
import {
  createFoundResponseSchema,
  createMessageSchema,
  createStructuredClaimSchema,
  formatPublicClaimCount,
  getClaimStatusBadge,
  getRecoveryCaseStatusLabel,
  isActiveClaimStatus,
} from "./claims";

describe("claims, found responses, and recovery validation", () => {
  it("accepts a valid structured claim", () => {
    const parsed = createStructuredClaimSchema.safeParse({
      explanation: "I dropped my wallet near the ticket counter on Monday.",
      identifying_features: "Black leather bifold with silver zipper",
      hidden_marks: "Initials M.F. stamped inside the coin pocket",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects short structured claim fields", () => {
    const parsed = createStructuredClaimSchema.safeParse({
      explanation: "Mine",
      identifying_features: "Red",
    });
    expect(parsed.success).toBe(false);
  });

  it("validates found item response form", () => {
    expect(
      createFoundResponseSchema.safeParse({
        description: "Found this blue backpack on bench 3 near the fountain.",
        location_name: "Frere Hall Park",
      }).success
    ).toBe(true);

    expect(
      createFoundResponseSchema.safeParse({
        description: "Found it",
        location_name: "A",
      }).success
    ).toBe(false);
  });

  it("counts only active claim statuses and formats public count", () => {
    expect(isActiveClaimStatus("submitted")).toBe(true);
    expect(isActiveClaimStatus("selected_for_verification")).toBe(true);
    expect(isActiveClaimStatus("withdrawn")).toBe(false);
    expect(isActiveClaimStatus("rejected")).toBe(false);
    expect(isActiveClaimStatus("spam")).toBe(false);

    expect(formatPublicClaimCount(0)).toBe("0 people have claimed this item.");
    expect(formatPublicClaimCount(1)).toBe("1 person has claimed this item.");
    expect(formatPublicClaimCount(4)).toBe("4 people have claimed this item.");
  });

  it("validates messages and returns readable labels", () => {
    expect(createMessageSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(
      createMessageSchema.safeParse({ body: "Let us meet at the main gate." })
        .success
    ).toBe(true);

    expect(getClaimStatusBadge("selected_for_verification").label).toBe(
      "Selected for Verification"
    );
    expect(getRecoveryCaseStatusLabel("awaiting_owner_confirmation")).toBe(
      "Awaiting Owner Confirmation"
    );
  });
});
