import { describe, expect, it } from "vitest";
import { getRecognitionTier } from "./recognition";

describe("recognition tiers", () => {
  it("assigns New Helper for 0 points", () => {
    expect(getRecognitionTier(0).name).toBe("New Helper");
  });

  it("assigns Trusted Finder at 25+ points", () => {
    expect(getRecognitionTier(25).name).toBe("Trusted Finder");
  });

  it("assigns Community Guardian at 75+ points", () => {
    expect(getRecognitionTier(100).name).toBe("Community Guardian");
  });

  it("assigns FoundDex Ambassador at 200+ points", () => {
    expect(getRecognitionTier(250).name).toBe("FoundDex Ambassador");
  });
});

