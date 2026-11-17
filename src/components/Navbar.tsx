import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LogIn, LogOut, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LiveMessagesNavLink } from "./LiveMessagesNavLink";

async function NavbarRightSection() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  let unreadCount = 0;
  if (supabase && user) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, participant_a, participant_b, deleted_by_a_at, deleted_by_b_at")
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);
    const convIds = (convs ?? [])
      .filter(
        (c) =>
          !(c.participant_a === user.id && c.deleted_by_a_at) &&
          !(c.participant_b === user.id && c.deleted_by_b_at)
      )
      .map((c) => c.id);
    if (convIds.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .is("read_at", null);
      unreadCount = count ?? 0;
    }
  }

  return (
    <>
      <LiveMessagesNavLink
        userId={user?.id ?? null}
        initialUnreadCount={unreadCount}
      />

      {!user ? (
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <User className="h-4 w-4 text-emerald-600" />
            Account
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export function Navbar() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            F
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight">
              FoundDex
            </span>
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Find. Verify. Return.
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4 flex-wrap">
          <Link
            href="/items"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            Browse Items
          </Link>
          <Link
            href="/report"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            Report Item
          </Link>
          <Link
            href="/recovery"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            Recovery Center
          </Link>
          <Suspense
            fallback={
              <div className="h-9 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            }
          >
            <NavbarRightSection />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
