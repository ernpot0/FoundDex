-- =============================================================================
-- FoundDex Phase 5A: Two-Way Recovery, Claims, Messaging & Case Management
-- =============================================================================
-- Separate database tables for:
--   1. claims
--   2. found_responses
--   3. conversations
--   4. messages
--   5. recovery_cases
--   6. return_confirmations
--   7. notifications
--   8. reports_and_disputes
--   9. recovery_audit_logs
-- Plus private `claim-evidence` storage bucket and public claim count RPC.
-- =============================================================================

-- Clean up Phase 2/5 draft tables if upgrading from an earlier test run
drop table if exists public.messages cascade;
drop table if exists public.claims cascade;

-- 1. Claims (Found Item workflow — private per claimant)
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  claimant_id uuid not null references public.profiles (id) on delete cascade,
  explanation text not null check (char_length(trim(explanation)) between 10 and 2000),
  identifying_features text not null check (char_length(trim(identifying_features)) between 5 and 1500),
  hidden_marks text,
  private_notes text,
  photo_paths text[] not null default '{}',
  document_paths text[] not null default '{}',
  status text not null default 'submitted' check (
    status in (
      'submitted',
      'under_review',
      'more_info_requested',
      'selected_for_verification',
      'rejected',
      'closed',
      'withdrawn',
      'spam'
    )
  ),
  reopened_count integer not null default 0 check (reopened_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, claimant_id)
);

create index claims_item_id_status_idx on public.claims (item_id, status);
create index claims_claimant_id_idx on public.claims (claimant_id);

create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

alter table public.claims enable row level security;

-- Only the claimant or the item's finder can read private claim records
create policy "Claimants and finders can view private claims"
  on public.claims for select
  to authenticated
  using (
    auth.uid() = claimant_id
    or exists (
      select 1 from public.items
      where items.id = claims.item_id
        and items.user_id = auth.uid()
    )
  );

-- Authenticated users can submit claims on found items they do not own
create policy "Users can submit claims on others found items"
  on public.claims for insert
  to authenticated
  with check (
    auth.uid() = claimant_id
    and exists (
      select 1 from public.items
      where items.id = claims.item_id
        and items.report_type = 'found'
        and items.user_id <> auth.uid()
    )
  );

-- Claimants can withdraw/reopen or add info; finders can review/select/reject/close
create policy "Participants can update claims"
  on public.claims for update
  to authenticated
  using (
    auth.uid() = claimant_id
    or exists (
      select 1 from public.items
      where items.id = claims.item_id
        and items.user_id = auth.uid()
    )
  );

-- Public-safe function returning ONLY active claim count (never exposes identities or evidence)
create or replace function public.get_item_claim_counts(p_item_ids uuid[])
returns table (item_id uuid, active_claim_count bigint)
language sql
security definer
set search_path = public
as $$
  select c.item_id, count(*)::bigint as active_claim_count
  from public.claims c
  where c.item_id = any(p_item_ids)
    and c.status in (
      'submitted',
      'under_review',
      'more_info_requested',
      'selected_for_verification'
    )
  group by c.item_id;
$$;

grant execute on function public.get_item_claim_counts(uuid[]) to anon, authenticated;

-- 2. Found Responses (Lost Item "I Found This Item" workflow)
create table public.found_responses (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  finder_id uuid not null references public.profiles (id) on delete cascade,
  description text not null check (char_length(trim(description)) between 10 and 2000),
  location_name text not null check (char_length(trim(location_name)) between 2 and 160),
  latitude double precision,
  longitude double precision,
  photo_paths text[] not null default '{}',
  status text not null default 'submitted' check (
    status in ('submitted', 'under_review', 'selected_for_verification', 'closed', 'withdrawn')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index found_responses_item_id_idx on public.found_responses (item_id);
create index found_responses_finder_id_idx on public.found_responses (finder_id);

create trigger found_responses_set_updated_at
  before update on public.found_responses
  for each row execute function public.set_updated_at();

alter table public.found_responses enable row level security;

create policy "Finders and lost-item owners can view found responses"
  on public.found_responses for select
  to authenticated
  using (
    auth.uid() = finder_id
    or exists (
      select 1 from public.items
      where items.id = found_responses.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "Users can submit found responses on others lost items"
  on public.found_responses for insert
  to authenticated
  with check (
    auth.uid() = finder_id
    and exists (
      select 1 from public.items
      where items.id = found_responses.item_id
        and items.report_type = 'lost'
        and items.user_id <> auth.uid()
    )
  );

create policy "Participants can update found responses"
  on public.found_responses for update
  to authenticated
  using (
    auth.uid() = finder_id
    or exists (
      select 1 from public.items
      where items.id = found_responses.item_id
        and items.user_id = auth.uid()
    )
  );

-- 3. Recovery Cases (Formal verification & return process)
create table public.recovery_cases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete set null,
  found_response_id uuid references public.found_responses (id) on delete set null,
  finder_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'submitted' check (
    status in (
      'submitted',
      'under_review',
      'more_info_requested',
      'selected_for_verification',
      'return_arranged',
      'awaiting_owner_confirmation',
      'completed',
      'disputed',
      'cancelled'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recovery_cases_item_id_idx on public.recovery_cases (item_id);
create index recovery_cases_finder_id_idx on public.recovery_cases (finder_id);
create index recovery_cases_owner_id_idx on public.recovery_cases (owner_id);

create trigger recovery_cases_set_updated_at
  before update on public.recovery_cases
  for each row execute function public.set_updated_at();

alter table public.recovery_cases enable row level security;

create policy "Case participants can view recovery cases"
  on public.recovery_cases for select
  to authenticated
  using (auth.uid() = finder_id or auth.uid() = owner_id);

create policy "Participants can create recovery cases"
  on public.recovery_cases for insert
  to authenticated
  with check (auth.uid() = finder_id or auth.uid() = owner_id);

create policy "Case participants can update recovery cases"
  on public.recovery_cases for update
  to authenticated
  using (auth.uid() = finder_id or auth.uid() = owner_id);

-- 4. Conversations (1-to-1 private chats linked to a listing or recovery case)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  recovery_case_id uuid references public.recovery_cases (id) on delete set null,
  participant_a uuid not null references public.profiles (id) on delete cascade,
  participant_b uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (participant_a <> participant_b),
  unique (item_id, participant_a, participant_b)
);

create index conversations_participant_a_idx on public.conversations (participant_a);
create index conversations_participant_b_idx on public.conversations (participant_b);

alter table public.conversations enable row level security;

create policy "Conversation participants can view conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Authenticated users can create conversations they belong to"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Participants can update conversation metadata"
  on public.conversations for update
  to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b);

-- 5. Messages (WhatsApp-style private messages)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  attachment_paths text[] not null default '{}',
  reply_to_id uuid references public.messages (id) on delete set null,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

alter table public.messages enable row level security;

create policy "Conversation participants can view messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

create policy "Conversation participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

create policy "Recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- 6. Return Confirmations (Dual confirmation: Finder + Owner)
create table public.return_confirmations (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null unique references public.recovery_cases (id) on delete cascade,
  finder_confirmed_at timestamptz,
  finder_note text,
  owner_confirmed_at timestamptz,
  owner_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger return_confirmations_set_updated_at
  before update on public.return_confirmations
  for each row execute function public.set_updated_at();

alter table public.return_confirmations enable row level security;

create policy "Case participants can view return confirmations"
  on public.return_confirmations for select
  to authenticated
  using (
    exists (
      select 1 from public.recovery_cases rc
      where rc.id = return_confirmations.recovery_case_id
        and (rc.finder_id = auth.uid() or rc.owner_id = auth.uid())
    )
  );

create policy "Case participants can insert/update return confirmations"
  on public.return_confirmations for all
  to authenticated
  using (
    exists (
      select 1 from public.recovery_cases rc
      where rc.id = return_confirmations.recovery_case_id
        and (rc.finder_id = auth.uid() or rc.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.recovery_cases rc
      where rc.id = return_confirmations.recovery_case_id
        and (rc.finder_id = auth.uid() or rc.owner_id = auth.uid())
    )
  );

-- 7. Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can create notifications for recipients"
  on public.notifications for insert
  to authenticated
  with check (true);

create policy "Users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- 8. Reports and Disputes (blocks, spam/abuse reports, and recovery disputes)
create table public.reports_and_disputes (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  item_id uuid references public.items (id) on delete set null,
  recovery_case_id uuid references public.recovery_cases (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  kind text not null check (kind in ('block', 'abuse_report', 'dispute')),
  reason text not null check (char_length(trim(reason)) between 3 and 1500),
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index reports_and_disputes_reporter_idx on public.reports_and_disputes (reporter_id);

alter table public.reports_and_disputes enable row level security;

create policy "Users can view reports/blocks they filed"
  on public.reports_and_disputes for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "Users can create reports, blocks, or disputes"
  on public.reports_and_disputes for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- 9. Recovery Audit Logs (immutable history of key recovery actions)
create table public.recovery_audit_logs (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null references public.recovery_cases (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index recovery_audit_logs_case_idx on public.recovery_audit_logs (recovery_case_id, created_at desc);

alter table public.recovery_audit_logs enable row level security;

create policy "Case participants can view audit logs"
  on public.recovery_audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.recovery_cases rc
      where rc.id = recovery_audit_logs.recovery_case_id
        and (rc.finder_id = auth.uid() or rc.owner_id = auth.uid())
    )
  );

create policy "Case participants can append audit logs"
  on public.recovery_audit_logs for insert
  to authenticated
  with check (
    auth.uid() = actor_id
    and exists (
      select 1 from public.recovery_cases rc
      where rc.id = recovery_audit_logs.recovery_case_id
        and (rc.finder_id = auth.uid() or rc.owner_id = auth.uid())
    )
  );

-- 10. Private Storage Bucket for Claim Evidence & Chat Attachments (10 MB max)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'claim-evidence',
  'claim-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can upload evidence into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'claim-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated users can read claim evidence"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'claim-evidence');

create policy "Users can delete their own uploaded evidence"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'claim-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enable Supabase Realtime for live private messaging & notifications
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

