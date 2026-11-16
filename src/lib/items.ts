import { z } from "zod";
import { getPublicEnv } from "@/lib/env";
import { ITEM_PHOTOS_BUCKET } from "@/lib/storage";

export const ITEM_CATEGORIES = [
  { value: "electronics", label: "Electronics & Phones" },
  { value: "wallet-keys", label: "Wallets, Keys & Cards" },
  { value: "documents", label: "IDs & Documents" },
  { value: "bags-luggage", label: "Bags & Luggage" },
  { value: "jewelry-watches", label: "Jewelry & Watches" },
  { value: "pets", label: "Pets" },
  { value: "clothing", label: "Clothing & Accessories" },
  { value: "other", label: "Other Items" },
] as const;

export const CATEGORY_VALUES = ITEM_CATEGORIES.map((c) => c.value) as [
  (typeof ITEM_CATEGORIES)[number]["value"],
  ...(typeof ITEM_CATEGORIES)[number]["value"][],
];

export const createItemSchema = z.object({
  report_type: z.enum(["lost", "found"], {
    message: "Please choose whether the item was lost or found.",
  }),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(120, "Title must be 120 characters or fewer."),
  category: z.enum(CATEGORY_VALUES, {
    message: "Please select a valid category.",
  }),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(2000, "Description must be 2000 characters or fewer."),
  location_name: z
    .string()
    .trim()
    .min(2, "Please enter a neighborhood, landmark, or city.")
    .max(160, "Location name must be 160 characters or fewer."),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  occurred_at: z.string().trim().optional().nullable(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export function getCategoryLabel(value: string): string {
  return (
    ITEM_CATEGORIES.find((c) => c.value === value)?.label ?? "Other Items"
  );
}

/**
 * Builds the public Supabase Storage URL for an item photo path.
 */
export function getItemPhotoUrl(
  photoPath: string | null | undefined
): string | null {
  if (!photoPath) return null;
  const env = getPublicEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  return `${baseUrl}/storage/v1/object/public/${ITEM_PHOTOS_BUCKET}/${photoPath}`;
}

