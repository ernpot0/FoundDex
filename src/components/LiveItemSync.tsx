"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface LiveItemSyncProps {
  itemId?: string;
}

/**
 * Subscribes to Supabase Realtime changes for items, claims, and found_responses
 * so item pages and listings update live without manual page refreshes.
 */
export function LiveItemSync({ itemId }: LiveItemSyncProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channelName = itemId ? `live-item:${itemId}` : "live-items-list";
    const filter = itemId ? `item_id=eq.${itemId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          ...(itemId ? { filter: `id=eq.${itemId}` } : {}),
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claims",
          ...(filter ? { filter } : {}),
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "found_responses",
          ...(filter ? { filter } : {}),
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, router]);

  return null;
}

