import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import {
  AdminModerationClient,
  type AdminReportRow,
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

  const { data: rawReports } = await supabase
    .from("reports_and_disputes")
    .select(
      "id, reporter_id, reported_user_id, item_id, recovery_case_id, kind, reason, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const list = rawReports ?? [];
  const profileIds = Array.from(
    new Set(
      list.flatMap((r) =>
        [r.reporter_id, r.reported_user_id].filter((x): x is string =>
          Boolean(x)
        )
      )
    )
  );
  const itemIds = Array.from(
    new Set(list.map((r) => r.item_id).filter((x): x is string => Boolean(x)))
  );

  const nameMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.full_name || "FoundDex Member");
    }
  }

  const itemMap = new Map<string, string>();
  if (itemIds.length > 0) {
    const { data: items } = await supabase
      .from("items")
      .select("id, title")
      .in("id", itemIds);
    for (const i of items ?? []) {
      itemMap.set(i.id, i.title);
    }
  }

  const reports: AdminReportRow[] = list.map((r) => ({
    id: r.id,
    reporter_name: nameMap.get(r.reporter_id) ?? "User",
    reported_user_name: r.reported_user_id
      ? nameMap.get(r.reported_user_id) ?? "User"
      : null,
    item_id: r.item_id,
    item_title: r.item_id ? itemMap.get(r.item_id) ?? null : null,
    recovery_case_id: r.recovery_case_id,
    kind: r.kind,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
  }));

  return <AdminModerationClient adminId={user.id} reports={reports} />;
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-10">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white p-8 h-64 animate-pulse" />
          }
        >
          <AdminContent />
        </Suspense>
      </main>
    </div>
  );
}

