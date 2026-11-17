import { z } from "zod";

export const ITEM_PHOTOS_BUCKET = "item-photos";
export const CLAIM_EVIDENCE_BUCKET = "claim-evidence";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ALLOWED_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const MIME_TO_EXT: Record<(typeof ALLOWED_EVIDENCE_MIME_TYPES)[number], string> =
  {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

const photoValidationSchema = z.object({
  type: z.enum(ALLOWED_PHOTO_MIME_TYPES, {
    message: "Only JPEG, PNG, and WebP images are allowed.",
  }),
  size: z
    .number()
    .positive("Photo file cannot be empty.")
    .max(MAX_PHOTO_BYTES, "Photo must be 5 MB or smaller."),
});

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an image file's MIME type and size before uploading to Supabase Storage.
 */
export function validateItemPhoto(file: {
  type: string;
  size: number;
}): PhotoValidationResult {
  const parsed = photoValidationSchema.safeParse(file);
  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues[0]?.message ?? "Invalid photo file.",
    };
  }
  return { valid: true };
}

/**
 * Validates an evidence or chat attachment file (JPEG, PNG, WebP, or PDF up to 10 MB).
 */
export function validateEvidenceFile(file: {
  type: string;
  size: number;
}): PhotoValidationResult {
  const schema = z.object({
    type: z.enum(ALLOWED_EVIDENCE_MIME_TYPES, {
      message: "Only JPEG, PNG, WebP images or PDF documents are allowed.",
    }),
    size: z
      .number()
      .positive("File cannot be empty.")
      .max(MAX_EVIDENCE_BYTES, "File must be 10 MB or smaller."),
  });
  const parsed = schema.safeParse(file);
  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues[0]?.message ?? "Invalid file.",
    };
  }
  return { valid: true };
}

/**
 * Builds a user-scoped storage object path matching Supabase Storage RLS:
 * `<userId>/<uniqueId>.<ext>`
 */
export function buildItemPhotoPath(
  userId: string,
  mimeType: (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number],
  uniqueId: string = crypto.randomUUID()
): string {
  const ext = MIME_TO_EXT[mimeType];
  return `${userId}/${uniqueId}.${ext}`;
}

