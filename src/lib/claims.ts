import { z } from "zod";
import type {
  ClaimStatus,
  RecoveryCaseStatus,
} from "@/lib/supabase/types";

export const ACTIVE_CLAIM_STATUSES = new Set<ClaimStatus>([
  "submitted",
  "under_review",
  "more_info_requested",
  "selected_for_verification",
]);

export function isActiveClaimStatus(status: ClaimStatus): boolean {
  return ACTIVE_CLAIM_STATUSES.has(status);
}

export function formatPublicClaimCount(count: number): string {
  if (count <= 0) return "0 people have claimed this item.";
  if (count === 1) return "1 person has claimed this item.";
  return `${count} people have claimed this item.`;
}

export const createStructuredClaimSchema = z.object({
  explanation: z
    .string()
    .trim()
    .min(10, "Please explain why this item belongs to you (min 10 chars).")
    .max(2000, "Explanation must be 2000 characters or fewer."),
  identifying_features: z
    .string()
    .trim()
    .min(5, "Please describe unique identifying features (min 5 chars).")
    .max(1500, "Identifying features must be 1500 characters or fewer."),
  hidden_marks: z
    .string()
    .trim()
    .max(1000, "Hidden marks must be 1000 characters or fewer.")
    .optional(),
  private_notes: z
    .string()
    .trim()
    .max(1000, "Additional private info must be 1000 characters or fewer.")
    .optional(),
});

export const createFoundResponseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Please describe the item you found (min 10 chars).")
    .max(2000, "Description must be 2000 characters or fewer."),
  location_name: z
    .string()
    .trim()
    .min(2, "Please enter the approximate discovery location.")
    .max(160, "Location name must be 160 characters or fewer."),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const createMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be 2000 characters or fewer."),
});

export function getClaimStatusBadge(status: ClaimStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "submitted":
      return {
        label: "Submitted",
        className:
          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      };
    case "under_review":
      return {
        label: "Under Review",
        className:
          "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
      };
    case "more_info_requested":
      return {
        label: "More Info Requested",
        className:
          "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
      };
    case "selected_for_verification":
      return {
        label: "Selected for Verification",
        className:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    case "rejected":
      return {
        label: "Rejected",
        className:
          "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      };
    case "closed":
      return {
        label: "Closed",
        className:
          "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };
    case "withdrawn":
      return {
        label: "Withdrawn",
        className:
          "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };
    case "spam":
      return {
        label: "Flagged Spam",
        className:
          "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      };
  }
}

export function getRecoveryCaseStatusLabel(status: RecoveryCaseStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under Review";
    case "more_info_requested":
      return "More Information Requested";
    case "selected_for_verification":
      return "Selected for Verification";
    case "return_arranged":
      return "Return Arranged";
    case "awaiting_owner_confirmation":
      return "Awaiting Owner Confirmation";
    case "completed":
      return "Completed";
    case "disputed":
      return "Disputed";
    case "cancelled":
      return "Cancelled";
  }
}
