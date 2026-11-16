-- =============================================================================
-- FoundDex Phase 2: Initial Database Schema, RLS Policies, and Storage Bucket
-- =============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query.
-- =============================================================================

-- 1. Helper function to automatically update `updated_at` timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Profiles table (linked 1-to-1 with Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  trust_points integer not null default 0 check (trust_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Items table (Lost & Found reports)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_type text not null check (report_type in ('lost', 'found')),
  status text not null default 'open' check (status in ('open', 'matched', 'returned', 'closed')),
  title text not null check (char_length(trim(title)) between 3 and 120),
  category text not null,
  description text not null check (char_length(trim(description)) between 10 and 2000),
  location_name text not null,
  latitude double precision,
  longitude double precision,
  occurred_at timestamptz,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_id_idx on public.items (user_id);
create index if not exists items_report_type_status_idx on public.items (report_type, status);
create index if not exists items_created_at_idx on public.items (created_at desc);

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;

create policy "Items are viewable by everyone"
  on public.items for select
  using (true);

create policy "Authenticated users can create their own items"
  on public.items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Owners can update their own items"
  on public.items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owners can delete their own items"
  on public.items for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Claims table (Ownership verification requests)
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  claimant_id uuid not null references public.profiles (id) on delete cascade,
  verification_note text not null check (char_length(trim(verification_note)) between 10 and 1500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, claimant_id)
);

create index if not exists claims_item_id_idx on public.claims (item_id);
create index if not exists claims_claimant_id_idx on public.claims (claimant_id);

drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

alter table public.claims enable row level security;

create policy "Claimants and item owners can view claims"
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

create policy "Authenticated users can submit claims on others' items"
  on public.claims for insert
  to authenticated
  with check (
    auth.uid() = claimant_id
    and exists (
      select 1 from public.items
      where items.id = claims.item_id
        and items.user_id <> auth.uid()
    )
  );

create policy "Item owners can review claims or claimants can withdraw"
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

-- 5. Storage bucket for item photos (5 MB max, JPEG/PNG/WebP only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Item photos are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'item-photos');

create policy "Authenticated users can upload photos into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own uploaded photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

