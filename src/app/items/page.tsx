import { Suspense } from "react";
import Link from "next/link";
import { Calendar, MapPin, PlusCircle, Search, Tag } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ItemsMap } from "@/components/ItemsMap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCategoryLabel,
  getItemPhotoUrl,
  ITEM_CATEGORIES,
} from "@/lib/items";

interface ItemsPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    category?: string;
  }>;
}

async function ItemsResults({ searchParams }: ItemsPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type =
    params.type === "lost" || params.type === "found" ? params.type : "all";
  const category = params.category?.trim() ?? "all";

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Supabase is not configured yet.
      </div>
    );
  }

  let query = supabase
    .from("items")
    .select(
      "id, report_type, status, title, category, description, location_name, latitude, longitude, occurred_at, photo_path, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (type !== "all") {
    query = query.eq("report_type", type);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (q) {
    const safeQ = q.replaceAll("%", "").replaceAll(",", " ");
    query = query.or(
      `title.ilike.%${safeQ}%,description.ilike.%${safeQ}%,location_name.ilike.%${safeQ}%`
    );
  }

  const { data: items, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Could not load items: {error.message}
      </div>
    );
  }

  const list = items ?? [];

  return (
    <div className="space-y-8">
      <form
        method="get"
        action="/items"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs grid gap-3 sm:grid-cols-12"
      >
        <div className="sm:col-span-5 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search keyword, brand, or location..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            name="type"
            defaultValue={type}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">Lost &amp; Found</option>
            <option value="lost">Lost Only</option>
            <option value="found">Found Only</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            name="category"
            defaultValue={category}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">All Categories</option>
            {ITEM_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="sm:col-span-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          Filter
        </button>
      </form>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Map View ({list.filter((i) => i.latitude !== null).length} pinned)
          </h2>
          <span className="text-xs text-slate-500">
            Amber = Lost • Green = Found
          </span>
        </div>
        <ItemsMap items={list} />
      </section>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
          <p className="text-base font-medium">No matching reports yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Try clearing your filters or be the first to post a lost or found
            item report.
          </p>
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Report an Item
          </Link>
        </div>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => {
            const photoUrl = getItemPhotoUrl(item.photo_path);
            const isLost = item.report_type === "lost";
            return (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-emerald-500 transition-colors flex flex-col"
              >
                {photoUrl ? (
                  <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={item.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center text-xs text-slate-400">
                    No photo provided
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                        isLost
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {item.report_type}
                    </span>
                    <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-base line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-1">
                    {item.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-2">
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {item.location_name}
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default function ItemsPage(props: ItemsPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Browse Lost &amp; Found Items
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Search community reports or explore approximate pins on the map.
            </p>
          </div>
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Report an Item
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 h-96 animate-pulse" />
          }
        >
          <ItemsResults searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

