"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  History,
  Package,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UserX,
  XCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCategoryLabel } from "@/lib/items";
import { getRecoveryCaseStatusLabel } from "@/lib/claims";
import type {
  ItemStatus,
  RecoveryCaseStatus,
  ReportDisputeKind,
  ReportDisputeStatus,
  ReportType,
} from "@/lib/supabase/types";

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

export interface AdminItemRow {
  id: string;
  title: string;
  report_type: ReportType;
  status: ItemStatus;
  category: string;
  location_name: string;
  poster_name: string;
  created_at: string;
}

export interface AdminRecoveryCaseRow {
  id: string;
  item_id: string;
  item_title: string;
  finder_name: string;
  owner_name: string;
  status: RecoveryCaseStatus;
  finder_confirmed_at: string | null;
  owner_confirmed_at: string | null;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  trust_points: number;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface AdminCertificateRow {
  id: string;
  certificate_code: string;
  finder_name: string;
  owner_name: string;
  item_title: string;
  points_awarded: number;
  issued_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  admin_name: string;
  target_type: string;
  target_id: string;
  action: string;
  note: string | null;
  created_at: string;
}

interface AdminModerationClientProps {
  adminId: string;
  reports: AdminReportRow[];
  items: AdminItemRow[];
  recoveryCases: AdminRecoveryCaseRow[];
  users: AdminUserRow[];
  certificates: AdminCertificateRow[];
  auditLogs: AdminAuditLogRow[];
}

type AdminTab =
  | "items"
  | "reports"
  | "cases"
  | "users"
  | "certificates"
  | "audit";

export function AdminModerationClient({
  adminId,
  reports,
  items,
  recoveryCases,
  users,
  certificates,
  auditLogs,
}: AdminModerationClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("items");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`admin-live:${adminId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports_and_disputes" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recovery_cases" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "moderation_audit_logs" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, router]);

  async function logAudit(
    targetType: string,
    targetId: string,
    action: string,
    note?: string
  ) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from("moderation_audit_logs").insert({
      admin_id: adminId,
      target_type: targetType,
      target_id: targetId,
      action,
      note: note ?? null,
    });
  }

  async function handleUpdateReport(
    report: AdminReportRow,
    nextStatus: ReportDisputeStatus
  ) {
    setError(null);
    setNotice(null);
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

      await logAudit(
        "report_dispute",
        report.id,
        `status_${nextStatus}`,
        `Updated ${report.kind} to ${nextStatus}`
      );
      setNotice(`Report marked as ${nextStatus.replaceAll("_", " ")}.`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCloseFlaggedItem(report: AdminReportRow) {
    if (!report.item_id) return;
    setError(null);
    setNotice(null);
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

      await logAudit(
        "item",
        report.item_id,
        "item_closed_by_admin",
        `Closed via report ${report.id}`
      );
      setNotice("Flagged item closed and report resolved.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetItemStatus(item: AdminItemRow, nextStatus: ItemStatus) {
    setError(null);
    setNotice(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyId(item.id);
    try {
      const { error: updateErr } = await supabase
        .from("items")
        .update({ status: nextStatus })
        .eq("id", item.id);

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      await logAudit(
        "item",
        item.id,
        `item_status_${nextStatus}`,
        `Changed "${item.title}" to ${nextStatus}`
      );
      setNotice(`"${item.title}" updated to ${nextStatus}.`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteItem(item: AdminItemRow) {
    const confirmed = window.confirm(
      `Permanently delete "${item.title}"? Use this only for spam or policy violations.`
    );
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyId(item.id);
    try {
      const { error: delErr } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);

      if (delErr) {
        setError(delErr.message);
        return;
      }

      await logAudit(
        "item",
        item.id,
        "item_deleted_by_admin",
        `Deleted "${item.title}"`
      );
      setNotice(`Deleted "${item.title}".`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateCaseStatus(
    rc: AdminRecoveryCaseRow,
    nextStatus: RecoveryCaseStatus
  ) {
    setError(null);
    setNotice(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyId(rc.id);
    try {
      const { error: updateErr } = await supabase
        .from("recovery_cases")
        .update({ status: nextStatus })
        .eq("id", rc.id);

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      await logAudit(
        "recovery_case",
        rc.id,
        `case_status_${nextStatus}`,
        `Admin updated case for "${rc.item_title}" to ${nextStatus}`
      );
      setNotice(`Recovery case updated to ${nextStatus.replaceAll("_", " ")}.`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleUserFlag(
    user: AdminUserRow,
    field: "is_admin" | "is_suspended"
  ) {
    if (user.id === adminId) {
      setError("You cannot modify your own admin or suspension status here.");
      return;
    }

    const nextValue = !user[field];
    const actionLabel =
      field === "is_admin"
        ? nextValue
          ? "Grant Admin Role"
          : "Revoke Admin Role"
        : nextValue
          ? "Suspend User"
          : "Unsuspend User";

    if (
      !window.confirm(`${actionLabel} for "${user.full_name || user.id}"?`)
    ) {
      return;
    }

    setError(null);
    setNotice(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setBusyId(user.id);
    try {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update(
          field === "is_admin"
            ? { is_admin: nextValue }
            : { is_suspended: nextValue }
        )
        .eq("id", user.id);

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      await logAudit(
        "profile",
        user.id,
        `${field}_${nextValue}`,
        `${actionLabel} for ${user.full_name}`
      );
      setNotice(`${actionLabel} applied for ${user.full_name}.`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      q
        ? items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.location_name.toLowerCase().includes(q) ||
              i.poster_name.toLowerCase().includes(q)
          )
        : items,
    [items, q]
  );

  const filteredUsers = useMemo(
    () =>
      q
        ? users.filter(
            (u) =>
              u.full_name.toLowerCase().includes(q) ||
              u.id.toLowerCase().includes(q)
          )
        : users,
    [users, q]
  );

  const openReportsCount = reports.filter(
    (r) => r.status === "open" || r.status === "under_review"
  ).length;
  const openItemsCount = items.filter(
    (i) => i.status === "open" || i.status === "matched"
  ).length;
  const activeCasesCount = recoveryCases.filter(
    (c) => c.status !== "completed" && c.status !== "cancelled"
  ).length;

  const tabs: Array<{ id: AdminTab; label: string; count?: number }> = [
    { id: "items", label: "Items Management", count: items.length },
    { id: "reports", label: "Reports & Disputes", count: reports.length },
    { id: "cases", label: "Recovery Cases", count: recoveryCases.length },
    { id: "users", label: "Users & Roles", count: users.length },
    { id: "certificates", label: "Certificates", count: certificates.length },
    { id: "audit", label: "Audit Log", count: auditLogs.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-emerald-600" />
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage Lost &amp; Found listings, review reports &amp; disputes,
            oversee recovery cases, and manage user roles.
          </p>
        </div>
      </div>

      {/* Live Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Total Users</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Open Listings</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {openItemsCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Total Listings</p>
          <p className="text-2xl font-bold mt-1">{items.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Active Cases</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">
            {activeCasesCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Certificates</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {certificates.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Open Reports</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {openReportsCount}
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
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

        {(activeTab === "items" || activeTab === "users") && (
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "items"
                  ? "Search items, city, user..."
                  : "Search users..."
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/60 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 px-4 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* TAB 1: ITEMS MANAGEMENT */}
      {activeTab === "items" && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No items match your search.
            </div>
          ) : (
            filteredItems.map((item) => {
              const busy = busyId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.report_type === "lost"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.report_type}
                      </span>
                      <span className="text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                    <p className="font-semibold text-sm truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Posted by <strong>{item.poster_name}</strong> •{" "}
                      {item.location_name} •{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/items/${item.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Link>

                    {item.status !== "closed" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSetItemStatus(item, "closed")}
                        className="rounded-lg border border-amber-300 dark:border-amber-900 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                      >
                        Close Listing
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSetItemStatus(item, "open")}
                        className="rounded-lg border border-emerald-300 dark:border-emerald-900 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDeleteItem(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: REPORTS & DISPUTES */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No reports or disputes filed yet.
            </div>
          ) : (
            reports.map((rep) => {
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
                        onClick={() => handleCloseFlaggedItem(rep)}
                        className="rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        Close Flagged Item
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: RECOVERY CASES */}
      {activeTab === "cases" && (
        <div className="space-y-3">
          {recoveryCases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No recovery cases created yet.
            </div>
          ) : (
            recoveryCases.map((rc) => {
              const busy = busyId === rc.id;
              return (
                <div
                  key={rc.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Package className="h-4 w-4 text-emerald-600" />
                      <Link
                        href={`/items/${rc.item_id}`}
                        className="font-semibold text-sm hover:text-emerald-600"
                      >
                        {rc.item_title}
                      </Link>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {getRecoveryCaseStatusLabel(rc.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Finder: <strong>{rc.finder_name}</strong> (
                      {rc.finder_confirmed_at ? "Confirmed" : "Pending"}) •
                      Owner: <strong>{rc.owner_name}</strong> (
                      {rc.owner_confirmed_at ? "Confirmed" : "Pending"})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {rc.status === "disputed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleUpdateCaseStatus(rc, "return_arranged")
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Resolve Dispute → Return Arranged
                      </button>
                    )}
                    {rc.status !== "cancelled" && rc.status !== "completed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleUpdateCaseStatus(rc, "cancelled")}
                        className="rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        Cancel Case
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: USERS & ROLES */}
      {activeTab === "users" && (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const busy = busyId === u.id;
            const isSelf = u.id === adminId;
            return (
              <div
                key={u.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-sm">{u.full_name}</span>
                    {u.is_admin && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        Admin
                      </span>
                    )}
                    {u.is_suspended && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                        Suspended
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[11px] text-slate-400">(You)</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Trust Points: <strong>{u.trust_points}</strong> • Joined{" "}
                    {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>

                {!isSelf && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleUserFlag(u, "is_admin")}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {u.is_admin ? "Revoke Admin" : "Make Admin"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleUserFlag(u, "is_suspended")}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                        u.is_suspended
                          ? "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          : "border border-red-300 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      {u.is_suspended ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          Unsuspend
                        </>
                      ) : (
                        <>
                          <UserX className="h-3.5 w-3.5" />
                          Suspend
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: CERTIFICATES */}
      {activeTab === "certificates" && (
        <div className="space-y-3">
          {certificates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No Finder Certificates issued yet.
            </div>
          ) : (
            certificates.map((cert) => (
              <div
                key={cert.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-600" />
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      {cert.certificate_code}
                    </span>
                    <span className="font-semibold text-sm">
                      {cert.item_title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Finder: <strong>{cert.finder_name}</strong> • Owner:{" "}
                    <strong>{cert.owner_name}</strong> • +{cert.points_awarded}{" "}
                    pts • {new Date(cert.issued_at).toLocaleDateString()}
                  </p>
                </div>

                <Link
                  href={`/certificates/${cert.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Certificate
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 6: AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="space-y-2.5">
          {auditLogs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              No admin moderation actions recorded yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4 flex-wrap text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-bold uppercase text-slate-700 dark:text-slate-200">
                      {log.action.replaceAll("_", " ")}
                    </span>
                    <span className="text-slate-500">
                      ({log.target_type})
                    </span>
                  </div>
                  {log.note && (
                    <p className="text-slate-600 dark:text-slate-400">
                      {log.note}
                    </p>
                  )}
                </div>
                <div className="text-right text-slate-500">
                  <p>By: {log.admin_name}</p>
                  <p>{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
