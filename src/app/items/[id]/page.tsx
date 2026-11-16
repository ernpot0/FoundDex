import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ShieldCheck,
  Tag,
  User,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ItemsMap } from "@/components/ItemsMap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryLabel, getItemPhotoUrl } from "@/lib/items";

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

async function ItemDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    notFound();
  }

  const { data: item, error } = await supabase
    .from("items")
    .select(
      "id, user_id, report_type, status, title, category, description, location_name, latitude, longitude, occurred_at, photo_path, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !item) {
    notFound();
  }

  const { data: reporter } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", item.user_id)
    .maybeSingle();

  const photoUrl = getItemPhotoUrl(item.photo_path);
  const isLost = item.report_type === "lost";

  return (
    <div className="space-y-6">
      <Link
        href="/items"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Listings
      </Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {photoUrl && (
          <div className="max-h-96 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={item.title}
              className="max-h-96 w-auto object-contain"
            />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${
                isLost
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {item.report_type}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              {getCategoryLabel(item.category)}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
              Status: {item.status}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {item.title}
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-600" />
                {item.location_name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Reported {new Date(item.created_at).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {reporter?.full_name || "FoundDex Member"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Description
            </h2>
            <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {item.description}
            </p>
          </div>

          {item.latitude !== null && item.longitude !== null && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Approximate Location
              </h2>
              <ItemsMap items={[item]} heightClassName="h-64" />
            </div>
          )}

          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-semibold">
                Safe Ownership Verification (Coming in Phase 5)
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                In an upcoming phase, you will be able to submit ownership
                verification answers and coordinate a safe return directly
                through FoundDex without exposing personal contact details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ItemDetailPage(props: ItemDetailPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-10">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 h-96 animate-pulse" />
          }
        >
          <ItemDetailContent params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}

