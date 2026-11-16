import { Suspense } from "react";
import Link from "next/link";
import {
  Compass,
  MapPin,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryLabel } from "@/lib/items";

const PILLARS = [
  {
    title: "Find",
    description:
      "Report lost or found items with clear descriptions, photos, and privacy-friendly map pins.",
    icon: Compass,
  },
  {
    title: "Verify",
    description:
      "Protect rightful owners with structured ownership verification before sharing personal contact details.",
    icon: ShieldCheck,
  },
  {
    title: "Return",
    description:
      "Coordinate safe returns and recognize helpful community members—never a marketplace, never for buying or selling.",
    icon: Sparkles,
  },
];

async function RecentReportsSection() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: items } = await supabase
    .from("items")
    .select("id, report_type, title, category, location_name, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const list = items ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight">Recent Reports</h2>
        <Link
          href="/items"
          className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          View all listings →
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400">
          No lost or found reports yet. Click{" "}
          <Link
            href="/report"
            className="font-medium text-emerald-700 dark:text-emerald-400 underline"
          >
            Report an Item
          </Link>{" "}
          to post the first one!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => {
            const isLost = item.report_type === "lost";
            return (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-500 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      isLost
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {item.report_type}
                  </span>
                  <span className="text-xs text-slate-500">
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
                <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  {item.location_name}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-14 flex flex-col gap-14">
        <section className="max-w-3xl space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            Find. Verify. Return.
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>FoundDex</strong> is a global lost-and-found platform built
            to help people report lost or found items, match them intelligently,
            verify rightful ownership, and coordinate safe returns.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/report?type=lost"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Report Lost Item
            </Link>
            <Link
              href="/report?type=found"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Report Found Item
            </Link>
            <Link
              href="/items"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Search className="h-4 w-4" />
              Browse &amp; Search Map
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            FoundDex is strictly a community lost-and-found service—not an
            e-commerce marketplace. Users cannot buy or sell products here.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-lg">{pillar.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </section>

        <Suspense
          fallback={
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-32 animate-pulse" />
          }
        >
          <RecentReportsSection />
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        FoundDex (founddex.com) — Find. Verify. Return.
      </footer>
    </div>
  );
}
