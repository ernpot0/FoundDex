"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getClaimStatusBadge,
  getRecoveryCaseStatusLabel,
} from "@/lib/claims";
import { getRecognitionTier } from "@/lib/recognition";
import type { ClaimStatus, RecoveryCaseStatus } from "@/lib/supabase/types";

export interface SimpleItemSummary {
  id: string;
  title: string;
  report_type: "lost" | "found";
  status: string;
  location_name: string;
  created_at: string;
}

export interface RecoveryClaimRow {
  id: string;
  item_id: string;
  item_title: string;
  other_party_name: string;
  status: ClaimStatus;
  explanation: string;
  created_at: string;
}

export interface RecoveryFoundResponseRow {
  id: string;
  item_id: string;
  item_title: string;
  location_name: string;
  status: string;
  created_at: string;
}

export interface RecoveryCaseRow {
  id: string;
  item_id: string;
  item_title: string;
  finder_id: string;
  owner_id: string;
  finder_name: string;
  owner_name: string;
  status: RecoveryCaseStatus;
  finder_confirmed_at: string | null;
  owner_confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface FinderCertificateSummary {
  id: string;
  certificate_code: string;
  item_title: string;
  points_awarded: number;
  issued_at: string;
}

interface RecoveryCenterClientProps {
  currentUserId: string;
  trustPoints: number;
  certificates: FinderCertificateSummary[];
  myLostReports: SimpleItemSummary[];
  myFoundReports: SimpleItemSummary[];
  claimsReceived: RecoveryClaimRow[];
  claimsSubmitted: RecoveryClaimRow[];
  myFoundResponses: RecoveryFoundResponseRow[];
  recoveryCases: RecoveryCaseRow[];
  conversationCount: number;
  unreadMessagesCount: number;
}

type TabId =
  | "cases"
  | "lost"
  | "found"
  | "claims_received"
  | "claims_submitted"
  | "found_responses"
  | "completed"
  | "rewards";

export function RecoveryCenterClient({
  currentUserId,
  trustPoints,
  certificates,
  myLostReports,
  myFoundReports,
  claimsReceived,
  claimsSubmitted,
  myFoundResponses,
  recoveryCases,
  unreadMessagesCount,
}: RecoveryCenterClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("cases");
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCases = recoveryCases.filter((c) => c.status !== "completed");
  const completedCases = recoveryCases.filter((c) => c.status === "completed");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`recovery-live:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recovery_cases" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "return_confirmations" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "found_responses" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, router]);

  async function handleMarkReturnArranged(rc: RecoveryCaseRow) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyCaseId(rc.id);
    try {
      await supabase
        .from("recovery_cases")
        .update({ status: "return_arranged" })
        .eq("id", rc.id);

      await supabase.from("recovery_audit_logs").insert({
        recovery_case_id: rc.id,
        actor_id: currentUserId,
        action: "return_arranged",
      });
      router.refresh();
    } finally {
      setBusyCaseId(null);
    }
  }

  async function handleDualConfirm(
    rc: RecoveryCaseRow,
    role: "finder" | "owner"
  ) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyCaseId(rc.id);
    try {
      const now = new Date().toISOString();
      const finderConfirmed =
        role === "finder" ? now : rc.finder_confirmed_at;
      const ownerConfirmed = role === "owner" ? now : rc.owner_confirmed_at;
      const bothConfirmed = Boolean(finderConfirmed && ownerConfirmed);

      const { error: upsertErr } = await supabase
        .from("return_confirmations")
        .upsert(
          {
            recovery_case_id: rc.id,
            finder_confirmed_at: finderConfirmed,
            owner_confirmed_at: ownerConfirmed,
            completed_at: bothConfirmed ? now : null,
          },
          { onConflict: "recovery_case_id" }
        );

      if (upsertErr) {
        setError(upsertErr.message);
        return;
      }

      const nextCaseStatus: RecoveryCaseStatus = bothConfirmed
        ? "completed"
        : role === "finder"
          ? "awaiting_owner_confirmation"
          : "return_arranged";

      const { error: caseErr } = await supabase
        .from("recovery_cases")
        .update({ status: nextCaseStatus })
        .eq("id", rc.id);

      if (caseErr) {
        setError(caseErr.message);
        return;
      }

      if (bothConfirmed && rc.owner_id === currentUserId) {
        await supabase
          .from("items")
          .update({ status: "returned" })
          .eq("id", rc.item_id);
      }

      await supabase.from("recovery_audit_logs").insert({
        recovery_case_id: rc.id,
        actor_id: currentUserId,
        action:
          role === "finder"
            ? "finder_confirmed_handover"
            : "owner_confirmed_receipt",
        metadata: { both_confirmed: bothConfirmed },
      });

      const otherUserId = role === "finder" ? rc.owner_id : rc.finder_id;
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: bothConfirmed ? "recovery_completed" : "confirmation_updated",
        title: bothConfirmed
          ? "Recovery Completed!"
          : "Return confirmation updated",
        body: bothConfirmed
          ? `Both parties confirmed the return of "${rc.item_title}".`
          : `The other party confirmed their step for "${rc.item_title}". Please confirm yours in Recovery Center.`,
        link_url: "/recovery",
      });

      router.refresh();
    } finally {
      setBusyCaseId(null);
    }
  }

  async function handleOpenDispute(rc: RecoveryCaseRow) {
    const reason = window.prompt(
      "Briefly describe the disagreement or issue for administrator review:"
    );
    if (!reason || reason.trim().length < 3) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyCaseId(rc.id);
    try {
      await supabase.from("reports_and_disputes").insert({
        reporter_id: currentUserId,
        reported_user_id:
          currentUserId === rc.finder_id ? rc.owner_id : rc.finder_id,
        item_id: rc.item_id,
        recovery_case_id: rc.id,
        kind: "dispute",
        reason: reason.trim(),
      });

      await supabase
        .from("recovery_cases")
        .update({ status: "disputed" })
        .eq("id", rc.id);

      await supabase.from("recovery_audit_logs").insert({
        recovery_case_id: rc.id,
        actor_id: currentUserId,
        action: "dispute_opened",
        metadata: { reason: reason.trim() },
      });

      router.refresh();
    } finally {
      setBusyCaseId(null);
    }
  }

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: "cases", label: "Recovery Cases", count: activeCases.length },
    { id: "lost", label: "My Lost Reports", count: myLostReports.length },
    { id: "found", label: "My Found Reports", count: myFoundReports.length },
    {
      id: "claims_received",
      label: "Claims Received",
      count: claimsReceived.length,
    },
    {
      id: "claims_submitted",
      label: "Claims Submitted",
      count: claimsSubmitted.length,
    },
    {
      id: "found_responses",
      label: "My Found Responses",
      count: myFoundResponses.length,
    },
    {
      id: "completed",
      label: "Completed Recoveries",
      count: completedCases.length,
    },
    { id: "rewards", label: "Rewards & Certificates" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recovery Center</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your lost &amp; found reports, claims, recovery cases, and
            dual return confirmations.
          </p>
        </div>

        <Link
          href="/messages"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <MessageSquare className="h-4 w-4 text-emerald-600" />
          Messages
          {unreadMessagesCount > 0 && (
            <span className="rounded-full bg-emerald-600 text-white text-xs px-2 py-0.5">
              {unreadMessagesCount} new
            </span>
          )}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" ? ` (${tab.count})` : ""}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Recovery Cases */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          {activeCases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No active recovery cases yet.
            </div>
          ) : (
            activeCases.map((rc) => {
              const isFinder = rc.finder_id === currentUserId;
              const busy = busyCaseId === rc.id;
              return (
                <div
                  key={rc.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <Link
                        href={`/items/${rc.item_id}`}
                        className="font-semibold text-base hover:text-emerald-600 inline-flex items-center gap-1"
                      >
                        {rc.item_title}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <p className="text-xs text-slate-500">
                        Role: <strong>{isFinder ? "Finder" : "Owner"}</strong> •
                        Finder: {rc.finder_name} • Owner: {rc.owner_name}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {getRecoveryCaseStatusLabel(rc.status)}
                    </span>
                  </div>

                  {/* Dual Confirmation Status */}
                  <div className="grid gap-3 sm:grid-cols-2 rounded-lg bg-slate-50 dark:bg-slate-950 p-3.5 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          rc.finder_confirmed_at
                            ? "text-emerald-600"
                            : "text-slate-300"
                        }`}
                      />
                      <span>
                        Finder Handover:{" "}
                        <strong>
                          {rc.finder_confirmed_at ? "Confirmed" : "Pending"}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          rc.owner_confirmed_at
                            ? "text-emerald-600"
                            : "text-slate-300"
                        }`}
                      />
                      <span>
                        Owner Receipt:{" "}
                        <strong>
                          {rc.owner_confirmed_at ? "Confirmed" : "Pending"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {rc.status === "selected_for_verification" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleMarkReturnArranged(rc)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Mark Return Arranged
                      </button>
                    )}

                    {isFinder && !rc.finder_confirmed_at && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDualConfirm(rc, "finder")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        Confirm Item Handed Over
                      </button>
                    )}

                    {!isFinder && !rc.owner_confirmed_at && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDualConfirm(rc, "owner")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Confirm Item Received
                      </button>
                    )}

                    {rc.status !== "disputed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleOpenDispute(rc)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Report Dispute
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* My Lost / Found Reports */}
      {(activeTab === "lost" || activeTab === "found") && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(activeTab === "lost" ? myLostReports : myFoundReports).map(
            (item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{item.title}</span>
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{item.location_name}</p>
              </Link>
            )
          )}
        </div>
      )}

      {/* Claims Received / Submitted */}
      {(activeTab === "claims_received" || activeTab === "claims_submitted") && (
        <div className="space-y-3">
          {(activeTab === "claims_received"
            ? claimsReceived
            : claimsSubmitted
          ).map((c) => {
            const badge = getClaimStatusBadge(c.status);
            return (
              <Link
                key={c.id}
                href={`/items/${c.item_id}`}
                className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{c.item_title}</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {c.explanation}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* My Found Responses */}
      {activeTab === "found_responses" && (
        <div className="space-y-3">
          {myFoundResponses.map((r) => (
            <Link
              key={r.id}
              href={`/items/${r.item_id}`}
              className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500 transition-colors space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{r.item_title}</span>
                <span className="text-xs capitalize px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {r.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500">{r.location_name}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Completed Recoveries */}
      {activeTab === "completed" && (
        <div className="space-y-3">
          {completedCases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No completed recoveries yet. Recoveries appear here once both
              finder and owner confirm the return.
            </div>
          ) : (
            completedCases.map((rc) => (
              <div
                key={rc.id}
                className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-sm">{rc.item_title}</p>
                  <p className="text-xs text-slate-500">
                    Dual confirmation completed{" "}
                    {rc.completed_at
                      ? new Date(rc.completed_at).toLocaleDateString()
                      : ""}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Completed
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rewards & Certificates (strictly unlocked after dual confirmation) */}
      {activeTab === "rewards" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="inline-flex items-center gap-2 font-semibold text-base">
                <Award className="h-5 w-5 text-emerald-600" />
                Rewards &amp; Finder Certificates
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  getRecognitionTier(trustPoints).badgeClassName
                }`}
              >
                {getRecognitionTier(trustPoints).name} • {trustPoints} pts
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {getRecognitionTier(trustPoints).description} Rewards and
              certificates are strictly issued only after both finder and owner
              confirm a return.
            </p>
          </div>

          {certificates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No Finder Certificates earned yet. Complete a dual-confirmed
              return as a finder to earn your first certificate!
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {certificates.map((cert) => (
                <Link
                  key={cert.id}
                  href={`/certificates/${cert.id}`}
                  className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/30 p-5 hover:border-emerald-500 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {cert.certificate_code}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      +{cert.points_awarded} pts
                    </span>
                  </div>
                  <p className="font-semibold text-sm">{cert.item_title}</p>
                  <p className="text-xs text-slate-500">
                    Issued {new Date(cert.issued_at).toLocaleDateString()} •
                    Click to view &amp; print
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

