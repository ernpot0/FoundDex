"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReportDisputeKind, ReportDisputeStatus } from "@/lib/supabase/types";

export interface AdminReportRow {
  id: string;
  reporter_name: string;
  reported_user_name: string | null;
  item_id: string | null;
  item_title: string | null;
  recovery_case_id: string | null;
  kind: ReportDisputeKind;
  reason: string;
  status: ReportDisputeStatus;
  created_at: string;
}

interface AdminModerationClientProps {
  adminId: string;
  reports: AdminReportRow[];
}

export function AdminModerationClient({
  adminId,
  reports,
}: AdminModerationClientProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdateReport(
    report: AdminReportRow,
    nextStatus: ReportDisputeStatus
  ) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyId(report.id);
    try {
      const { error: updateErr } = await supabase
        .from("reports_and_disputes")
        .update({ status: nextStatus })
        .eq("id", report.id);

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      await supabase.from("moderation_audit_logs").insert({
        admin_id: adminId,
        target_type: "report_dispute",
        target_id: report.id,
        action: `status_${nextStatus}`,
        note: `Updated ${report.kind} status to ${nextStatus}`,
      });

      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCloseItem(report: AdminReportRow) {
    if (!report.item_id) return;
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyId(report.id);
    try {
      const { error: itemErr } = await supabase
        .from("items")
        .update({ status: "closed" })
        .eq("id", report.item_id);

      if (itemErr) {
        setError(itemErr.message);
        return;
      }

      await supabase
        .from("reports_and_disputes")
        .update({ status: "resolved" })
        .eq("id", report.id);

      await supabase.from("moderation_audit_logs").insert({
        admin_id: adminId,
        target_type: "item",
        target_id: report.item_id,
        action: "item_closed_by_admin",
        note: `Closed via report ${report.id}`,
      });

      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-emerald-600" />
          Admin Moderation &amp; Disputes
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Review abuse reports, user blocks, and recovery disputes. Every action
          is recorded in the moderation audit log.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          No reports or disputes filed yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => {
            const busy = busyId === rep.id;
            return (
              <div
                key={rep.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {rep.kind.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs text-slate-500">
                      By: <strong>{rep.reporter_name}</strong>
                      {rep.reported_user_name
                        ? ` • Against: ${rep.reported_user_name}`
                        : ""}
                    </span>
                  </div>
                  <span className="text-xs font-semibold capitalize px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    {rep.status.replaceAll("_", " ")}
                  </span>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {rep.reason}
                </p>

                {rep.item_id && (
                  <p className="text-xs text-slate-500">
                    Related item:{" "}
                    <Link
                      href={`/items/${rep.item_id}`}
                      className="text-emerald-600 underline"
                    >
                      {rep.item_title || rep.item_id}
                    </Link>
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleUpdateReport(rep, "under_review")}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Mark Under Review
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleUpdateReport(rep, "resolved")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleUpdateReport(rep, "dismissed")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Dismiss
                  </button>
                  {rep.item_id && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCloseItem(rep)}
                      className="rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                    >
                      Close Flagged Item
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

