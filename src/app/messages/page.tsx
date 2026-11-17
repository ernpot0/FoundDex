import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Navbar } from "@/components/Navbar";
import {
  MessagesClient,
  type ConversationItem,
} from "@/components/MessagesClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getItemPhotoUrl } from "@/lib/items";

interface MessagesPageProps {
  searchParams: Promise<{ c?: string }>;
}

async function MessagesContent({ searchParams }: MessagesPageProps) {
  await connection();
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: convRows } = await supabase
    .from("conversations")
    .select(
      "id, item_id, recovery_case_id, participant_a, participant_b, last_message_at"
    )
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  const convs = convRows ?? [];
  const itemIds = Array.from(new Set(convs.map((c) => c.item_id)));
  const otherIds = Array.from(
    new Set(
      convs.map((c) =>
        c.participant_a === user.id ? c.participant_b : c.participant_a
      )
    )
  );

  const itemMap = new Map<
    string,
    {
      title: string;
      report_type: "lost" | "found";
      location_name: string;
      photo_path: string | null;
    }
  >();
  if (itemIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("items")
      .select("id, title, report_type, location_name, photo_path")
      .in("id", itemIds);
    for (const item of itemsData ?? []) {
      itemMap.set(item.id, {
        title: item.title,
        report_type: item.report_type,
        location_name: item.location_name,
        photo_path: item.photo_path,
      });
    }
  }

  const profileMap = new Map<string, string>();
  if (otherIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherIds);
    for (const p of profilesData ?? []) {
      profileMap.set(p.id, p.full_name || "FoundDex Member");
    }
  }

  const unreadMap = new Map<string, number>();
  if (convs.length > 0) {
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("conversation_id")
      .in(
        "conversation_id",
        convs.map((c) => c.id)
      )
      .neq("sender_id", user.id)
      .is("read_at", null);
    for (const row of unreadRows ?? []) {
      unreadMap.set(
        row.conversation_id,
        (unreadMap.get(row.conversation_id) ?? 0) + 1
      );
    }
  }

  const initialConversations: ConversationItem[] = convs.map((c) => {
    const otherId =
      c.participant_a === user.id ? c.participant_b : c.participant_a;
    const item = itemMap.get(c.item_id);
    return {
      id: c.id,
      item_id: c.item_id,
      item_title: item?.title ?? "Item Report",
      item_type: item?.report_type ?? "lost",
      item_location: item?.location_name ?? "",
      item_photo_url: getItemPhotoUrl(item?.photo_path),
      recovery_case_id: c.recovery_case_id,
      other_user_id: otherId,
      other_user_name: profileMap.get(otherId) ?? "FoundDex Member",
      last_message_at: c.last_message_at,
      unread_count: unreadMap.get(c.id) ?? 0,
    };
  });

  return (
    <MessagesClient
      currentUserId={user.id}
      initialConversations={initialConversations}
      initialConversationId={params.c ?? null}
    />
  );
}

export default function MessagesPage(props: MessagesPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-[620px] animate-pulse" />
          }
        >
          <MessagesContent searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

