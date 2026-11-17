"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  MessageSquare,
  PackageCheck,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createFoundResponseSchema } from "@/lib/claims";
import { getOrCreateConversation } from "@/lib/conversations";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  buildItemPhotoPath,
  CLAIM_EVIDENCE_BUCKET,
  validateEvidenceFile,
} from "@/lib/storage";
import { LocationPickerMap } from "./LocationPickerMap";

export interface FoundResponseRecord {
  id: string;
  finder_id: string;
  finder_name: string | null;
  description: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  photo_paths: string[];
  status: string;
  created_at: string;
}

interface LostItemActionSectionProps {
  itemId: string;
  itemTitle: string;
  itemStatus: string;
  ownerId: string;
  currentUserId: string | null;
  foundResponses: FoundResponseRecord[];
}

export function LostItemActionSection({
  itemId,
  itemTitle,
  itemStatus,
  ownerId,
  currentUserId,
  foundResponses,
}: LostItemActionSectionProps) {
  const router = useRouter();
  const [showFoundForm, setShowFoundForm] = useState(false);
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserId === ownerId;

  function handlePhotosSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    for (const f of files) {
      const check = validateEvidenceFile({ type: f.type, size: f.size });
      if (!check.valid) {
        setError(check.error ?? "Invalid photo.");
        e.target.value = "";
        return;
      }
    }
    setPhotoFiles(files);
  }

  async function handleChatWithOwner() {
    if (!currentUserId) return;
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    try {
      const conv = await getOrCreateConversation(supabase, {
        itemId,
        userIdA: currentUserId,
        userIdB: ownerId,
      });

      if (!conv.id) {
        setError(conv.error ?? "Could not open conversation.");
        return;
      }

      router.push(`/messages?c=${conv.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitFoundResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;
    setError(null);

    const parsed = createFoundResponseSchema.safeParse({
      description,
      location_name: locationName,
      latitude,
      longitude,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    try {
      const uploadedPaths: string[] = [];
      for (const file of photoFiles) {
        const mimeType =
          file.type as (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number];
        const path = buildItemPhotoPath(currentUserId, mimeType);
        const { error: uploadError } = await supabase.storage
          .from(CLAIM_EVIDENCE_BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          setError(`Photo upload failed: ${uploadError.message}`);
          return;
        }
        uploadedPaths.push(path);
      }

      const { error: insertError } = await supabase
        .from("found_responses")
        .insert({
          item_id: itemId,
          finder_id: currentUserId,
          description: parsed.data.description,
          location_name: parsed.data.location_name,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          photo_paths: uploadedPaths,
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await supabase.from("notifications").insert({
        user_id: ownerId,
        type: "found_response_submitted",
        title: "Someone may have found your item!",
        body: `A finder submitted a Found Response for "${itemTitle}".`,
        link_url: `/items/${itemId}`,
      });

      const conv = await getOrCreateConversation(supabase, {
        itemId,
        userIdA: currentUserId,
        userIdB: ownerId,
      });

      if (conv.id) {
        router.push(`/messages?c=${conv.id}`);
        return;
      }

      setShowFoundForm(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectFoundResponse(resp: FoundResponseRecord) {
    if (!currentUserId) return;
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    try {
      await supabase
        .from("found_responses")
        .update({ status: "selected_for_verification" })
        .eq("id", resp.id);

      let recoveryCaseId: string | null = null;
      const { data: existingCase } = await supabase
        .from("recovery_cases")
        .select("id")
        .eq("found_response_id", resp.id)
        .maybeSingle();

      if (existingCase) {
        recoveryCaseId = existingCase.id;
      } else {
        const { data: createdCase } = await supabase
          .from("recovery_cases")
          .insert({
            item_id: itemId,
            found_response_id: resp.id,
            finder_id: resp.finder_id,
            owner_id: currentUserId,
            status: "selected_for_verification",
          })
          .select("id")
          .single();

        if (createdCase) {
          recoveryCaseId = createdCase.id;
          await supabase.from("recovery_audit_logs").insert({
            recovery_case_id: createdCase.id,
            actor_id: currentUserId,
            action: "found_response_selected",
            metadata: { found_response_id: resp.id },
          });
        }
      }

      const conv = await getOrCreateConversation(supabase, {
        itemId,
        userIdA: currentUserId,
        userIdB: resp.finder_id,
        recoveryCaseId,
      });

      if (conv.id) {
        router.push(`/messages?c=${conv.id}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (itemStatus === "returned" || itemStatus === "closed") {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-5 text-sm text-slate-600 dark:text-slate-400">
        This listing is <strong>{itemStatus}</strong> and is no longer accepting
        new responses.
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Have you seen or found this item? Sign in to chat or submit a Found
          Response:
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            Chat with Owner
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <PackageCheck className="h-4 w-4" />
            I Found This Item
          </Link>
        </div>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-base">
            Found Item Responses Received ({foundResponses.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You posted this Lost Item report. Other signed-in users see{" "}
            <strong>Chat with Owner</strong> and{" "}
            <strong>I Found This Item</strong> here.
          </p>
        </div>
        {foundResponses.length === 0 ? (
          <p className="text-sm text-slate-500">
            No formal Found Responses submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {foundResponses.map((resp) => (
              <div
                key={resp.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">
                    {resp.finder_name || "Finder"}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                    {resp.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {resp.description}
                </p>
                <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  {resp.location_name}
                </p>
                <div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSelectFoundResponse(resp)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Select &amp; Coordinate Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Can you help? Choose whether you want to chat or submit a formal Found
          Response:
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={handleChatWithOwner}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            Chat with Owner
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setShowFoundForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <PackageCheck className="h-4 w-4" />
            I Found This Item
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {showFoundForm && (
        <form
          onSubmit={handleSubmitFoundResponse}
          className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <div className="space-y-1">
            <h3 className="font-semibold text-base">
              Formal Found Item Response
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Describe what you found and where. This notifies the owner and
              opens a private conversation.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Description of Found Item *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the condition and details of the item you found..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Approximate Discovery Location *
            </label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g., Near Clifton Block 4 park entrance"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
          </div>

          <LocationPickerMap
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />

          <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <ImagePlus className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              {photoFiles.length > 0
                ? `${photoFiles.length} photo(s) selected`
                : "Optional photos of the found item (max 3)"}
            </span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotosSelected}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Found Response &amp; Open Chat
            </button>
            <button
              type="button"
              onClick={() => setShowFoundForm(false)}
              className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

