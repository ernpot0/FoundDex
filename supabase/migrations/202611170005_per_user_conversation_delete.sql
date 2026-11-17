-- =============================================================================
-- FoundDex: Per-User Conversation Deletion (hides only for the deleting user)
-- =============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query.
-- =============================================================================

alter table public.conversations
  add column if not exists deleted_by_a_at timestamptz,
  add column if not exists deleted_by_b_at timestamptz;

