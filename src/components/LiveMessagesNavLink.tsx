"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface LiveMessagesNavLinkProps {
  userId: string | null;
  initialUnreadCount: number;
}

export function LiveMessagesNavLink({
  userId,
  initialUnreadCount,
}: LiveMessagesNavLinkProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    async function refreshUnread() {
      const { data: convs } = await supabase!
        .from("conversations")
        .select(
          "id, participant_a, participant_b, deleted_by_a_at, deleted_by_b_at"
        )
        .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);
      const convIds = (convs ?? [])
        .filter(
          (c) =>
            !(c.participant_a === userId && c.deleted_by_a_at) &&
            !(c.participant_b === userId && c.deleted_by_b_at)
        )
        .map((c) => c.id);
      if (convIds.length === 0) {
        setUnreadCount(0);
        return;
      }
      const { count } = await supabase!
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", userId!)
        .is("read_at", null);
      setUnreadCount(count ?? 0);
    }

    const channel = supabase
      .channel(`nav-unread:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          refreshUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href="/messages"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
    >
      <span>Messages</span>
      {unreadCount > 0 && (
        <span className="rounded-full bg-emerald-600 text-white text-[11px] font-bold px-1.5 py-0.5 leading-none">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
