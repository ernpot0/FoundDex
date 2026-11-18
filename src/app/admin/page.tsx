import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import {
  AdminModerationClient,
  type AdminAuditLogRow,
  type AdminCertificateRow,
  type AdminItemRow,
  type AdminRecoveryCaseRow,
  type AdminReportRow,
  type AdminUserRow,
} from "@/components/AdminModerationClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function AdminContent() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-8 space-y-3">
        <div className="inline-flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
          <ShieldAlert className="h-5 w-5" />
          Administrator Access Required
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          This moderation dashboard is restricted to FoundDex administrators. If
          you are the project owner, you can grant yourself admin access in
          Supabase SQL Editor:
        </p>
        <pre className="rounded-lg bg-slate-900 text-slate-100 p-3 text-xs overflow-x-auto">
          {`update public.profiles set is_admin = true where id = '${user.id}';`}
        </pre>
      </div>
    );
  }

  const [
    { data: rawReports },
    { data: rawItems },
    { data: rawCases },
    { data: rawConfirmations },
    { data: rawProfiles },
    { data: rawCerts },
    { data: rawLogs },
  ] = await Promise.all([
    supabase
      .from("reports_and_disputes")
      .select(
        "id, reporter_id, reported_user_id, item_id, recovery_case_id, kind, reason, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("items")
      .select(
        "id, user_id, title, report_type, status, category, location_name, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("recovery_cases")
      .select("id, item_id, finder_id, owner_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("return_confirmations")
      .select("recovery_case_id, finder_confirmed_at, owner_confirmed_at"),
    supabase
      .from("profiles")
      .select("id, full_name, trust_points, is_admin, is_suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("finder_certificates")
      .select(
        "id, certificate_code, finder_id, owner_id, item_id, points_awarded, issued_at"
      )
      .order("issued_at", { ascending: false })
      .limit(100),
    supabase
      .from("moderation_audit_logs")
      .select("id, admin_id, target_type, target_id, action, note, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const nameMap = new Map<string, string>();
  for (const p of rawProfiles ?? []) {
    nameMap.set(p.id, p.full_name || "FoundDex Member");
  }

  const itemTitleMap = new Map<string, string>();
  for (const i of rawItems ?? []) {
    itemTitleMap.set(i.id, i.title);
  }

  const confirmationMap = new Map(
    (rawConfirmations ?? []).map((c) => [c.recovery_case_id, c])
  );

  const reports: AdminReportRow[] = (rawReports ?? []).map((r) => ({
    id: r.id,
    reporter_name: nameMap.get(r.reporter_id) ?? "User",
    reported_user_name: r.reported_user_id
      ? nameMap.get(r.reported_user_id) ?? "User"
      : null,
    item_id: r.item_id,
    item_title: r.item_id ? itemTitleMap.get(r.item_id) ?? null : null,
    recovery_case_id: r.recovery_case_id,
    kind: r.kind,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
  }));

  const items: AdminItemRow[] = (rawItems ?? []).map((i) => ({
    id: i.id,
    title: i.title,
    report_type: i.report_type,
    status: i.status,
    category: i.category,
    location_name: i.location_name,
    poster_name: nameMap.get(i.user_id) ?? "FoundDex Member",
    created_at: i.created_at,
  }));

  const recoveryCases: AdminRecoveryCaseRow[] = (rawCases ?? []).map((rc) => {
    const conf = confirmationMap.get(rc.id);
    return {
      id: rc.id,
      item_id: rc.item_id,
      item_title: itemTitleMap.get(rc.item_id) ?? "Item",
      finder_name: nameMap.get(rc.finder_id) ?? "Finder",
      owner_name: nameMap.get(rc.owner_id) ?? "Owner",
      status: rc.status,
      finder_confirmed_at: conf?.finder_confirmed_at ?? null,
      owner_confirmed_at: conf?.owner_confirmed_at ?? null,
      created_at: rc.created_at,
    };
  });

  const users: AdminUserRow[] = (rawProfiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name || "FoundDex Member",
    trust_points: p.trust_points,
    is_admin: p.is_admin,
    is_suspended: p.is_suspended,
    created_at: p.created_at,
  }));

  const certificates: AdminCertificateRow[] = (rawCerts ?? []).map((c) => ({
    id: c.id,
    certificate_code: c.certificate_code,
    finder_name: nameMap.get(c.finder_id) ?? "Finder",
    owner_name: nameMap.get(c.owner_id) ?? "Owner",
    item_title: c.item_id
      ? itemTitleMap.get(c.item_id) ?? "Verified Return"
      : "Verified Return",
    points_awarded: c.points_awarded,
    issued_at: c.issued_at,
  }));

  const auditLogs: AdminAuditLogRow[] = (rawLogs ?? []).map((l) => ({
    id: l.id,
    admin_name: nameMap.get(l.admin_id) ?? "Admin",
    target_type: l.target_type,
    target_id: l.target_id,
    action: l.action,
    note: l.note,
    created_at: l.created_at,
  }));

  return (
    <AdminModerationClient
      adminId={user.id}
      reports={reports}
      items={items}
      recoveryCases={recoveryCases}
      users={users}
      certificates={certificates}
      auditLogs={auditLogs}
    />
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 h-64 animate-pulse" />
          }
        >
          <AdminContent />
        </Suspense>
      </main>
    </div>
  );
}
