-- =============================================================================
-- FoundDex: Full Admin Panel RLS Policies, User Suspension & Audit Support
-- =============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query.
-- =============================================================================

-- 1. Add user suspension flag to profiles
alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

-- 2. Allow admins to update profiles (suspend/unsuspend, grant/revoke admin)
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- 3. Allow admins to delete spam/abusive items
drop policy if exists "Admins can delete items" on public.items;
create policy "Admins can delete items"
  on public.items for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- 4. Allow admins to view and manage recovery cases (for dispute resolution)
drop policy if exists "Admins can view all recovery cases" on public.recovery_cases;
create policy "Admins can view all recovery cases"
  on public.recovery_cases for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Admins can update recovery cases" on public.recovery_cases;
create policy "Admins can update recovery cases"
  on public.recovery_cases for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- 5. Allow admins to view return confirmations for dispute resolution
drop policy if exists "Admins can view all return confirmations" on public.return_confirmations;
create policy "Admins can view all return confirmations"
  on public.return_confirmations for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- 6. Allow admins to view and moderate spam claims
drop policy if exists "Admins can view all claims" on public.claims;
create policy "Admins can view all claims"
  on public.claims for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Admins can update claims" on public.claims;
create policy "Admins can update claims"
  on public.claims for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

