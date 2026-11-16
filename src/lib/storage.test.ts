import { describe, expect, it } from "vitest";
import {
  buildItemPhotoPath,
  MAX_PHOTO_BYTES,
  validateItemPhoto,
} from "./storage";

describe("storage photo validation", () => {
  it("accepts valid JPEG, PNG, and WebP files under 5 MB", () => {
    expect(validateItemPhoto({ type: "image/jpeg", size: 1024 })).toEqual({
      valid: true,
    });
    expect(validateItemPhoto({ type: "image/png", size: 2048 })).toEqual({
      valid: true,
    });
    expect(validateItemPhoto({ type: "image/webp", size: MAX_PHOTO_BYTES })).toEqual({
      valid: true,
    });
  });

  it("rejects unsupported file types", () => {
    const result = validateItemPhoto({ type: "application/pdf", size: 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("JPEG, PNG, and WebP");
  });

  it("rejects files larger than 5 MB or empty files", () => {
    const tooBig = validateItemPhoto({
      type: "image/jpeg",
      size: MAX_PHOTO_BYTES + 1,
    });
    expect(tooBig.valid).toBe(false);

    const empty = validateItemPhoto({ type: "image/png", size: 0 });
    expect(empty.valid).toBe(false);
  });

  it("builds user-scoped paths for RLS compliance", () => {
    const path = buildItemPhotoPath("user-123", "image/webp", "abc-999");
    expect(path).toBe("user-123/abc-999.webp");
  });
});

