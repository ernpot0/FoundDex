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
    .select("id, recovery_case_id, deleted_by_a_at, deleted_by_b_at")
    .eq("item_id", params.itemId)
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  if (fetchError) {
    return { id: null, error: fetchError.message };
  }

  if (existing) {
    const needsCaseLink =
      Boolean(params.recoveryCaseId) && !existing.recovery_case_id;
    const isDeletedForA =
      params.userIdA === participantA && Boolean(existing.deleted_by_a_at);
    const isDeletedForB =
      params.userIdA === participantB && Boolean(existing.deleted_by_b_at);

    if (needsCaseLink || isDeletedForA || isDeletedForB) {
      await supabase
        .from("conversations")
        .update({
          ...(needsCaseLink ? { recovery_case_id: params.recoveryCaseId } : {}),
          ...(isDeletedForA ? { deleted_by_a_at: null } : {}),
          ...(isDeletedForB ? { deleted_by_b_at: null } : {}),
        })
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

