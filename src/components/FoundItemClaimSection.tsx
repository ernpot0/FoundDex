"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  LogIn,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createStructuredClaimSchema,
  formatPublicClaimCount,
  getClaimStatusBadge,
} from "@/lib/claims";
import { getOrCreateConversation } from "@/lib/conversations";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  buildItemPhotoPath,
  CLAIM_EVIDENCE_BUCKET,
  validateEvidenceFile,
} from "@/lib/storage";
import type { ClaimStatus, ItemStatus } from "@/lib/supabase/types";

export interface PrivateClaimRecord {
  id: string;
  claimant_id: string;
  claimant_name: string | null;
  explanation: string;
  identifying_features: string;
  hidden_marks: string | null;
  private_notes: string | null;
  photo_paths: string[];
  document_paths: string[];
  status: ClaimStatus;
  reopened_count: number;
  created_at: string;
}

interface FoundItemClaimSectionProps {
  itemId: string;
  itemTitle: string;
  finderId: string;
  itemStatus: ItemStatus;
  publicClaimCount: number;
  currentUserId: string | null;
  privateClaims: PrivateClaimRecord[];
}

export function FoundItemClaimSection({
  itemId,
  itemTitle,
  finderId,
  itemStatus,
  publicClaimCount,
  currentUserId,
  privateClaims,
}: FoundItemClaimSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [identifyingFeatures, setIdentifyingFeatures] = useState("");
  const [hiddenMarks, setHiddenMarks] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFinder = currentUserId === finderId;
  const myClaim = currentUserId
    ? privateClaims.find((c) => c.claimant_id === currentUserId) ?? null
    : null;

  function handleFilesSelected(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "photo" | "doc"
  ) {
    setError(null);
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    for (const file of files) {
      const check = validateEvidenceFile({ type: file.type, size: file.size });
      if (!check.valid) {
        setError(check.error ?? "Invalid file.");
        e.target.value = "";
        return;
      }
    }
    if (kind === "photo") setPhotoFiles(files);
    else setDocFiles(files);
  }

  async function uploadEvidenceFiles(
    supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
    files: File[]
  ): Promise<string[]> {
    if (!currentUserId || files.length === 0) return [];
    const paths: string[] = [];
    for (const file of files) {
      const mimeType =
        file.type as (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number];
      const path = buildItemPhotoPath(currentUserId, mimeType);
      const { error: uploadError } = await supabase.storage
        .from(CLAIM_EVIDENCE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      paths.push(path);
    }
    return paths;
  }

  async function handleSubmitClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;
    setError(null);

    const parsed = createStructuredClaimSchema.safeParse({
      explanation,
      identifying_features: identifyingFeatures,
      hidden_marks: hiddenMarks || undefined,
      private_notes: privateNotes || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    try {
      const uploadedPhotos = await uploadEvidenceFiles(supabase, photoFiles);
      const uploadedDocs = await uploadEvidenceFiles(supabase, docFiles);

      const { error: insertError } = await supabase.from("claims").insert({
        item_id: itemId,
        claimant_id: currentUserId,
        explanation: parsed.data.explanation,
        identifying_features: parsed.data.identifying_features,
        hidden_marks: parsed.data.hidden_marks ?? null,
        private_notes: parsed.data.private_notes ?? null,
        photo_paths: uploadedPhotos,
        document_paths: uploadedDocs,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await supabase.from("notifications").insert({
        user_id: finderId,
        type: "claim_submitted",
        title: "New ownership claim submitted",
        body: `Someone submitted a private claim for "${itemTitle}".`,
        link_url: `/items/${itemId}`,
      });

      setShowForm(false);
      setExplanation("");
      setIdentifyingFeatures("");
      setHiddenMarks("");
      setPrivateNotes("");
      setPhotoFiles([]);
      setDocFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit claim.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReopenWithdrawnClaim(claim: PrivateClaimRecord) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    try {
      const { error: updateError } = await supabase
        .from("claims")
        .update({
          status: "submitted",
          reopened_count: claim.reopened_count + 1,
        })
        .eq("id", claim.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleFinderAction(
    claim: PrivateClaimRecord,
    nextStatus: ClaimStatus,
    openChat = false
  ) {
    if (!currentUserId) return;
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    try {
      const { error: updateError } = await supabase
        .from("claims")
        .update({ status: nextStatus })
        .eq("id", claim.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      let recoveryCaseId: string | null = null;
      if (nextStatus === "selected_for_verification") {
        const { data: existingCase } = await supabase
          .from("recovery_cases")
          .select("id")
          .eq("claim_id", claim.id)
          .maybeSingle();

        if (existingCase) {
          recoveryCaseId = existingCase.id;
        } else {
          const { data: createdCase } = await supabase
            .from("recovery_cases")
            .insert({
              item_id: itemId,
              claim_id: claim.id,
              finder_id: currentUserId,
              owner_id: claim.claimant_id,
              status: "selected_for_verification",
            })
            .select("id")
            .single();

          if (createdCase) {
            recoveryCaseId = createdCase.id;
            await supabase.from("recovery_audit_logs").insert({
              recovery_case_id: createdCase.id,
              actor_id: currentUserId,
              action: "claim_selected_for_verification",
              metadata: { claim_id: claim.id },
            });
          }
        }

        await supabase.from("notifications").insert({
          user_id: claim.claimant_id,
          type: "claim_selected",
          title: "Claim selected for verification",
          body: `Your claim on "${itemTitle}" was selected for further verification.`,
          link_url: `/recovery`,
        });
      } else if (nextStatus === "more_info_requested") {
        await supabase.from("notifications").insert({
          user_id: claim.claimant_id,
          type: "more_info_requested",
          title: "Finder requested more information",
          body: `Please check your private messages regarding "${itemTitle}".`,
          link_url: `/messages`,
        });
      }

      if (openChat) {
        const conv = await getOrCreateConversation(supabase, {
          itemId,
          userIdA: currentUserId,
          userIdB: claim.claimant_id,
          recoveryCaseId,
        });
        if (conv.id) {
          router.push(`/messages?c=${conv.id}`);
          return;
        }
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenEvidenceFile(path: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { data } = await supabase.storage
      .from(CLAIM_EVIDENCE_BUCKET)
      .createSignedUrl(path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Users className="h-4 w-4 text-emerald-600" />
          <span>{formatPublicClaimCount(publicClaimCount)}</span>
        </div>

        {!isFinder &&
          !myClaim &&
          itemStatus !== "returned" &&
          itemStatus !== "closed" && (
          currentUserId ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              Claim This Item
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Claim This Item
            </Link>
          )
        )}
      </div>

      {!isFinder && showForm && (
        <form
          onSubmit={handleSubmitClaim}
          className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <div className="space-y-1">
            <h3 className="font-semibold text-base">
              Private Ownership Claim Form
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your identity and evidence remain strictly private—only the
              finder can review them.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              1. Claimant&apos;s Explanation *
            </label>
            <textarea
              rows={3}
              required
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain where and when you lost this item..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              2. Unique Item Identifying Features *
            </label>
            <textarea
              rows={2}
              required
              value={identifyingFeatures}
              onChange={(e) => setIdentifyingFeatures(e.target.value)}
              placeholder="Brand, model, contents inside, serial/engraving, wallpaper..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                3. Hidden Marks / Characteristics
              </label>
              <input
                type="text"
                value={hiddenMarks}
                onChange={(e) => setHiddenMarks(e.target.value)}
                placeholder="Scratches, stickers, initials..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                4. Additional Private Information
              </label>
              <input
                type="text"
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Anything else to help verify..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <ImagePlus className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {photoFiles.length > 0
                  ? `${photoFiles.length} photo(s) selected`
                  : "Optional supporting photos (max 3)"}
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFilesSelected(e, "photo")}
                className="hidden"
              />
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {docFiles.length > 0
                  ? `${docFiles.length} document(s) selected`
                  : "Optional receipts / documents (PDF/img)"}
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => handleFilesSelected(e, "doc")}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Private Claim
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!isFinder && myClaim && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-base">Your Private Claim</h3>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                getClaimStatusBadge(myClaim.status).className
              }`}
            >
              {getClaimStatusBadge(myClaim.status).label}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {myClaim.explanation}
          </p>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            {myClaim.status === "withdrawn" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleReopenWithdrawnClaim(myClaim)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen Withdrawn Claim
              </button>
            )}
            {(myClaim.status === "submitted" ||
              myClaim.status === "under_review" ||
              myClaim.status === "more_info_requested") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleFinderAction(myClaim, "withdrawn")}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Withdraw Claim
              </button>
            )}
          </div>
        </div>
      )}

      {isFinder && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-base">
              Private Claims Received ({privateClaims.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You posted this Found Item report (other users see{" "}
              <strong>Claim This Item</strong>). Compare claimant evidence
              privately—selecting a claim starts a Recovery Case without
              automatically establishing ownership.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {privateClaims.length === 0 ? (
            <p className="text-sm text-slate-500">No claims received yet.</p>
          ) : (
            <div className="space-y-4">
              {privateClaims.map((claim) => {
                const badge = getClaimStatusBadge(claim.status);
                return (
                  <div
                    key={claim.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {claim.claimant_name || "Claimant"}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <p>
                        <strong>Explanation:</strong> {claim.explanation}
                      </p>
                      <p>
                        <strong>Identifying features:</strong>{" "}
                        {claim.identifying_features}
                      </p>
                      {claim.hidden_marks && (
                        <p>
                          <strong>Hidden marks:</strong> {claim.hidden_marks}
                        </p>
                      )}
                      {claim.private_notes && (
                        <p>
                          <strong>Private notes:</strong> {claim.private_notes}
                        </p>
                      )}
                    </div>

                    {(claim.photo_paths.length > 0 ||
                      claim.document_paths.length > 0) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {claim.photo_paths.map((p, idx) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleOpenEvidenceFile(p)}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            View Photo #{idx + 1}
                          </button>
                        ))}
                        {claim.document_paths.map((p, idx) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleOpenEvidenceFile(p)}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            View Document #{idx + 1}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleFinderAction(
                            claim,
                            "more_info_requested",
                            true
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Request Info &amp; Message
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleFinderAction(
                            claim,
                            "selected_for_verification",
                            true
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Select for Verification
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleFinderAction(claim, "rejected")}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleFinderAction(claim, "closed")}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

