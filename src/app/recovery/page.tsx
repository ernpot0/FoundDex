import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Navbar } from "@/components/Navbar";
import {
  RecoveryCenterClient,
  type RecoveryCaseRow,
  type RecoveryClaimRow,
  type RecoveryFoundResponseRow,
  type SimpleItemSummary,
} from "@/components/RecoveryCenterClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function RecoveryCenterContent() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myItems } = await supabase
    .from("items")
    .select("id, title, report_type, status, location_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allMyItems: SimpleItemSummary[] = myItems ?? [];
  const myLostReports = allMyItems.filter((i) => i.report_type === "lost");
  const myFoundReports = allMyItems.filter((i) => i.report_type === "found");
  const myFoundIds = myFoundReports.map((i) => i.id);

  // Claims submitted by me
  const { data: submittedClaimsData } = await supabase
    .from("claims")
    .select("id, item_id, status, explanation, created_at")
    .eq("claimant_id", user.id)
    .order("created_at", { ascending: false });

  // Claims received on my found items
  const receivedClaimsData =
    myFoundIds.length > 0
      ? (
          await supabase
            .from("claims")
            .select("id, item_id, claimant_id, status, explanation, created_at")
            .in("item_id", myFoundIds)
            .order("created_at", { ascending: false })
        ).data ?? []
      : [];

  // Found responses submitted by me
  const { data: myResponsesData } = await supabase
    .from("found_responses")
    .select("id, item_id, location_name, status, created_at")
    .eq("finder_id", user.id)
    .order("created_at", { ascending: false });

  // Recovery cases where I am finder or owner
  const { data: casesData } = await supabase
    .from("recovery_cases")
    .select("id, item_id, finder_id, owner_id, status, created_at")
    .or(`finder_id.eq.${user.id},owner_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const caseIds = (casesData ?? []).map((c) => c.id);
  const { data: confirmationsData } =
    caseIds.length > 0
      ? await supabase
          .from("return_confirmations")
          .select(
            "recovery_case_id, finder_confirmed_at, owner_confirmed_at, completed_at"
          )
          .in("recovery_case_id", caseIds)
      : { data: [] };

  const confirmationMap = new Map(
    (confirmationsData ?? []).map((rc) => [rc.recovery_case_id, rc])
  );

  // Resolve item titles and profile names
  const relatedItemIds = Array.from(
    new Set([
      ...(submittedClaimsData ?? []).map((c) => c.item_id),
      ...(myResponsesData ?? []).map((r) => r.item_id),
      ...(casesData ?? []).map((c) => c.item_id),
    ])
  );
  const itemTitleMap = new Map<string, string>(
    allMyItems.map((i) => [i.id, i.title])
  );
  if (relatedItemIds.length > 0) {
    const { data: relItems } = await supabase
      .from("items")
      .select("id, title")
      .in("id", relatedItemIds);
    for (const ri of relItems ?? []) {
      itemTitleMap.set(ri.id, ri.title);
    }
  }

  const profileIds = Array.from(
    new Set([
      ...receivedClaimsData.map((c) => c.claimant_id),
      ...(casesData ?? []).flatMap((c) => [c.finder_id, c.owner_id]),
    ])
  );
  const profileMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.full_name || "FoundDex Member");
    }
  }

  // Conversations & unread count
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);
  const convIds = (convs ?? []).map((c) => c.id);
  let unreadMessagesCount = 0;
  if (convIds.length > 0) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .is("read_at", null);
    unreadMessagesCount = count ?? 0;
  }

  const claimsReceived: RecoveryClaimRow[] = receivedClaimsData.map((c) => ({
    id: c.id,
    item_id: c.item_id,
    item_title: itemTitleMap.get(c.item_id) ?? "Found Item",
    other_party_name: profileMap.get(c.claimant_id) ?? "Claimant",
    status: c.status,
    explanation: c.explanation,
    created_at: c.created_at,
  }));

  const claimsSubmitted: RecoveryClaimRow[] = (submittedClaimsData ?? []).map(
    (c) => ({
      id: c.id,
      item_id: c.item_id,
      item_title: itemTitleMap.get(c.item_id) ?? "Found Item",
      other_party_name: "Finder",
      status: c.status,
      explanation: c.explanation,
      created_at: c.created_at,
    })
  );

  const myFoundResponses: RecoveryFoundResponseRow[] = (
    myResponsesData ?? []
  ).map((r) => ({
    id: r.id,
    item_id: r.item_id,
    item_title: itemTitleMap.get(r.item_id) ?? "Lost Item",
    location_name: r.location_name,
    status: r.status,
    created_at: r.created_at,
  }));

  const recoveryCases: RecoveryCaseRow[] = (casesData ?? []).map((rc) => {
    const conf = confirmationMap.get(rc.id);
    return {
      id: rc.id,
      item_id: rc.item_id,
      item_title: itemTitleMap.get(rc.item_id) ?? "Item",
      finder_id: rc.finder_id,
      owner_id: rc.owner_id,
      finder_name: profileMap.get(rc.finder_id) ?? "Finder",
      owner_name: profileMap.get(rc.owner_id) ?? "Owner",
      status: rc.status,
      finder_confirmed_at: conf?.finder_confirmed_at ?? null,
      owner_confirmed_at: conf?.owner_confirmed_at ?? null,
      completed_at: conf?.completed_at ?? null,
      created_at: rc.created_at,
    };
  });

  return (
    <RecoveryCenterClient
      currentUserId={user.id}
      myLostReports={myLostReports}
      myFoundReports={myFoundReports}
      claimsReceived={claimsReceived}
      claimsSubmitted={claimsSubmitted}
      myFoundResponses={myFoundResponses}
      recoveryCases={recoveryCases}
      conversationCount={convIds.length}
      unreadMessagesCount={unreadMessagesCount}
    />
  );
}

export default function RecoveryPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-96 animate-pulse" />
          }
        >
          <RecoveryCenterContent />
        </Suspense>
      </main>
    </div>
  );
}

