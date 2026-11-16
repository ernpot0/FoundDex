"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, ShieldAlert } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createItemSchema, ITEM_CATEGORIES } from "@/lib/items";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  buildItemPhotoPath,
  ITEM_PHOTOS_BUCKET,
  validateItemPhoto,
} from "@/lib/storage";
import { LocationPickerMap } from "./LocationPickerMap";

interface ReportItemFormProps {
  userId: string;
  initialType?: "lost" | "found";
}

export function ReportItemForm({
  userId,
  initialType = "lost",
}: ReportItemFormProps) {
  const router = useRouter();
  const [reportType, setReportType] = useState<"lost" | "found">(initialType);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("electronics");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const check = validateItemPhoto({ type: file.type, size: file.size });
    if (!check.valid) {
      setError(check.error ?? "Invalid photo.");
      e.target.value = "";
      setPhotoFile(null);
      return;
    }
    setPhotoFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createItemSchema.safeParse({
      report_type: reportType,
      title,
      category,
      description,
      location_name: locationName,
      latitude,
      longitude,
      occurred_at: occurredAt || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      let photoPath: string | null = null;

      if (photoFile) {
        const mimeType =
          photoFile.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number];
        const path = buildItemPhotoPath(userId, mimeType);
        const { error: uploadError } = await supabase.storage
          .from(ITEM_PHOTOS_BUCKET)
          .upload(path, photoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setError(`Photo upload failed: ${uploadError.message}`);
          return;
        }
        photoPath = path;
      }

      const { data, error: insertError } = await supabase
        .from("items")
        .insert({
          user_id: userId,
          report_type: parsed.data.report_type,
          title: parsed.data.title,
          category: parsed.data.category,
          description: parsed.data.description,
          location_name: parsed.data.location_name,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          occurred_at: parsed.data.occurred_at
            ? new Date(parsed.data.occurred_at).toISOString()
            : null,
          photo_path: photoPath,
        })
        .select("id")
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Could not save item report.");
        return;
      }

      router.push(`/items/${data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6"
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium">Report Type</label>
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setReportType("lost")}
            className={`rounded-md py-2 transition-colors cursor-pointer ${reportType === "lost"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400"
              }`}
          >
            I Lost an Item
          </button>
          <button
            type="button"
            onClick={() => setReportType("found")}
            className={`rounded-md py-2 transition-colors cursor-pointer ${reportType === "found"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400"
              }`}
          >
            I Found an Item
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium">
            Item Title
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Black leather wallet with silver zipper"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="category" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {ITEM_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="occurredAt" className="block text-sm font-medium">
            Date {reportType === "lost" ? "Lost" : "Found"} (Optional)
          </label>
          <input
            id="occurredAt"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          required
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe color, brand, distinguishing marks, or context. Avoid sharing private ID numbers publicly."
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
          Tip: Keep one unique detail private if you found an item so the real
          owner can verify it later.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="locationName" className="block text-sm font-medium">
          Area / Landmark / City
        </label>
        <input
          id="locationName"
          type="text"
          required
          maxLength={160}
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="e.g., Clifton Block 4, Karachi"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Approximate Map Location (Optional)
        </label>
        <LocationPickerMap
          latitude={latitude}
          longitude={longitude}
          onChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="photo" className="block text-sm font-medium">
          Item Photo (Optional, JPEG/PNG/WebP up to 5 MB)
        </label>
        <label
          htmlFor="photo"
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-5 text-sm text-slate-600 dark:text-slate-400 hover:border-emerald-500 transition-colors cursor-pointer"
        >
          <ImagePlus className="h-5 w-5 text-emerald-600" />
          <span>{photoFile ? photoFile.name : "Choose an image file"}</span>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/60 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Publish {reportType === "lost" ? "Lost" : "Found"} Item Report
      </button>
    </form>
  );
}
