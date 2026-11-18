import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LogIn, LogOut, PlusCircle, User } from "lucide-react";
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
    <div className="flex items-center gap-3 flex-wrap">
      {user && (
        <>
          <Link
            href="/recovery"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            Recovery Center
          </Link>
          <LiveMessagesNavLink
            userId={user.id}
            initialUnreadCount={unreadCount}
          />
        </>
      )}

      {!user ? (
        <>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            Get Started
          </Link>
        </>
      ) : (
        <div className="flex items-center gap-2.5">
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Report Item
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <User className="h-4 w-4 text-emerald-600" />
            Account
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            F
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-none">
              FoundDex
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide mt-0.5 hidden sm:inline-block">
              Find. Verify. Return.
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/" className="hover:text-emerald-600 transition-colors">
            Home
          </Link>
          <Link
            href="/items"
            className="hover:text-emerald-600 transition-colors"
          >
            Browse Items
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-emerald-600 transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/#success-stories"
            className="hover:text-emerald-600 transition-colors"
          >
            Success Stories
          </Link>
          <Link
            href="/#about-us"
            className="hover:text-emerald-600 transition-colors"
          >
            About Us
          </Link>
        </nav>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/items"
            className="lg:hidden text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600"
          >
            Browse
          </Link>
          <Suspense
            fallback={
              <div className="h-9 w-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            }
          >
            <NavbarRightSection />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
