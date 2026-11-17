import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Calendar, MapPin, Tag, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ItemsMap } from "@/components/ItemsMap";
import { LiveItemSync } from "@/components/LiveItemSync";
import { MatchSuggestionsPanel } from "@/components/MatchSuggestionsPanel";
import {
  FoundItemClaimSection,
  type PrivateClaimRecord,
} from "@/components/FoundItemClaimSection";
import {
  LostItemActionSection,
  type FoundResponseRecord,
} from "@/components/LostItemActionSection";
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
  await connection();
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let publicClaimCount = 0;
  let privateClaims: PrivateClaimRecord[] = [];
  let foundResponses: FoundResponseRecord[] = [];

  if (item.report_type === "found") {
    const { data: countsData } = await supabase.rpc("get_item_claim_counts", {
      p_item_ids: [item.id],
    });
    publicClaimCount = Number(countsData?.[0]?.active_claim_count ?? 0);

    if (user) {
      const { data: claimsData } = await supabase
        .from("claims")
        .select(
          "id, claimant_id, explanation, identifying_features, hidden_marks, private_notes, photo_paths, document_paths, status, reopened_count, created_at"
        )
        .eq("item_id", item.id)
        .order("created_at", { ascending: false });

      const claimantIds = Array.from(
        new Set((claimsData ?? []).map((c) => c.claimant_id))
      );
      const nameMap = new Map<string, string | null>();
      if (claimantIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", claimantIds);
        for (const p of profilesData ?? []) {
          nameMap.set(p.id, p.full_name);
        }
      }

      privateClaims = (claimsData ?? []).map((c) => ({
        ...c,
        claimant_name: nameMap.get(c.claimant_id) ?? null,
      }));
    }
  } else if (user) {
    const { data: respData } = await supabase
      .from("found_responses")
      .select(
        "id, finder_id, description, location_name, latitude, longitude, photo_paths, status, created_at"
      )
      .eq("item_id", item.id)
      .order("created_at", { ascending: false });

    const finderIds = Array.from(
      new Set((respData ?? []).map((r) => r.finder_id))
    );
    const nameMap = new Map<string, string | null>();
    if (finderIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", finderIds);
      for (const p of profilesData ?? []) {
        nameMap.set(p.id, p.full_name);
      }
    }

    foundResponses = (respData ?? []).map((r) => ({
      ...r,
      finder_name: nameMap.get(r.finder_id) ?? null,
    }));
  }

  const photoUrl = getItemPhotoUrl(item.photo_path);
  const isLost = item.report_type === "lost";

  return (
    <div className="space-y-6">
      <LiveItemSync itemId={item.id} />
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

          <MatchSuggestionsPanel
            itemId={item.id}
            reportType={item.report_type}
          />

          {item.report_type === "found" ? (
            <FoundItemClaimSection
              itemId={item.id}
              itemTitle={item.title}
              finderId={item.user_id}
              itemStatus={item.status}
              publicClaimCount={publicClaimCount}
              currentUserId={user?.id ?? null}
              privateClaims={privateClaims}
            />
          ) : (
            <LostItemActionSection
              itemId={item.id}
              itemTitle={item.title}
              itemStatus={item.status}
              ownerId={item.user_id}
              currentUserId={user?.id ?? null}
              foundResponses={foundResponses}
            />
          )}
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
