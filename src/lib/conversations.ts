import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Finds or creates a 1-to-1 private conversation between two users for a specific item.
 * Orders participant IDs deterministically to prevent duplicate conversations.
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient<Database>,
  params: {
    itemId: string;
    userIdA: string;
    userIdB: string;
    recoveryCaseId?: string | null;
  }
): Promise<{ id: string | null; error?: string }> {
  const [participantA, participantB] =
    params.userIdA < params.userIdB
      ? [params.userIdA, params.userIdB]
      : [params.userIdB, params.userIdA];

  const { data: existing, error: fetchError } = await supabase
    .from("conversations")
    .select("id, recovery_case_id")
    .eq("item_id", params.itemId)
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  if (fetchError) {
    return { id: null, error: fetchError.message };
  }

  if (existing) {
    if (params.recoveryCaseId && !existing.recovery_case_id) {
      await supabase
        .from("conversations")
        .update({ recovery_case_id: params.recoveryCaseId })
        .eq("id", existing.id);
    }
    return { id: existing.id };
  }

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({
      item_id: params.itemId,
      recovery_case_id: params.recoveryCaseId ?? null,
      participant_a: participantA,
      participant_b: participantB,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return {
      id: null,
      error: insertError?.message ?? "Could not create conversation.",
    };
  }

  return { id: created.id };
}

