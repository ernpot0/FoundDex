import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Award, Mail, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecognitionTier } from "@/lib/recognition";

async function AccountContent() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, trust_points, is_admin, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const trustPoints = profile?.trust_points ?? 0;
  const tier = getRecognitionTier(trustPoints);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xs space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
              Signed In
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile?.full_name || "FoundDex Member"}
            </h1>
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-3 text-center">
            <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <Award className="h-3.5 w-3.5" />
              Trust Points
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {trustPoints}
            </div>
            <span
              className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${tier.badgeClassName}`}
            >
              {tier.name}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Protected by Supabase Auth &amp; Row-Level Security
            </div>
            {profile?.is_admin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                <ShieldAlert className="h-4 w-4" />
                Admin Moderation
              </Link>
            )}
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 animate-pulse h-48" />
          }
        >
          <AccountContent />
        </Suspense>
      </main>
    </div>
  );
}

