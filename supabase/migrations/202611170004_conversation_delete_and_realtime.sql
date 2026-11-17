-- =============================================================================
-- FoundDex: Conversation Delete Policy & Live Realtime Tables
-- =============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query.
-- =============================================================================

-- 1. Allow conversation participants to delete a conversation thread
drop policy if exists "Participants can delete their conversations" on public.conversations;
create policy "Participants can delete their conversations"
  on public.conversations for delete
  to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b);

-- 2. Enable Supabase Realtime on recovery & claim tables for live UI updates
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.claims;
alter publication supabase_realtime add table public.found_responses;
alter publication supabase_realtime add table public.recovery_cases;
alter publication supabase_realtime add table public.return_confirmations;

