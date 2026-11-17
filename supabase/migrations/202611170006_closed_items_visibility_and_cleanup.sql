-- =============================================================================
-- FoundDex: Closed/Returned Item Visibility & 30-Day Automatic Cleanup
-- =============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query.
-- =============================================================================

-- 1. Track when an item was resolved (returned or closed)
alter table public.items
  add column if not exists resolved_at timestamptz;

create or replace function public.set_item_resolved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('returned', 'closed') and (old.status is null or old.status not in ('returned', 'closed')) then
    new.resolved_at = coalesce(new.resolved_at, now());
  elsif new.status in ('open', 'matched') then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists items_set_resolved_at on public.items;
create trigger items_set_resolved_at
  before update on public.items
  for each row execute function public.set_item_resolved_at();

-- Backfill any already returned/closed items
update public.items
set resolved_at = coalesce(resolved_at, updated_at, now())
where status in ('returned', 'closed') and resolved_at is null;

-- 2. Restrict visibility of closed/returned items to the poster, involved finder/owner, or admins
-- Uses a SECURITY DEFINER helper to avoid RLS recursion between items <-> claims/found_responses
create or replace function public.can_view_resolved_item(p_item_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and (
      exists (
        select 1 from public.recovery_cases rc
        where rc.item_id = p_item_id
          and (rc.finder_id = p_user_id or rc.owner_id = p_user_id)
      )
      or exists (
        select 1 from public.claims c
        where c.item_id = p_item_id
          and c.claimant_id = p_user_id
      )
      or exists (
        select 1 from public.found_responses fr
        where fr.item_id = p_item_id
          and fr.finder_id = p_user_id
      )
      or exists (
        select 1 from public.profiles p
        where p.id = p_user_id and p.is_admin = true
      )
    );
$$;

drop policy if exists "Items are viewable by everyone" on public.items;
drop policy if exists "Open items are public; resolved items only visible to participants" on public.items;

create policy "Open items are public; resolved items only visible to participants"
  on public.items for select
  using (
    status in ('open', 'matched')
    or auth.uid() = user_id
    or public.can_view_resolved_item(id, auth.uid())
  );

-- 3. Preserve Finder Certificates even after 30-day item cleanup
alter table public.finder_certificates
  add column if not exists item_title_snapshot text,
  alter column item_id drop not null;

alter table public.finder_certificates
  drop constraint if exists finder_certificates_item_id_fkey;

alter table public.finder_certificates
  add constraint finder_certificates_item_id_fkey
  foreign key (item_id) references public.items (id) on delete set null;

-- Backfill snapshot for existing certificates
update public.finder_certificates fc
set item_title_snapshot = i.title
from public.items i
where fc.item_id = i.id and fc.item_title_snapshot is null;

-- 4. Automatic cleanup function for resolved items older than 1 month (30 days)
create or replace function public.cleanup_expired_resolved_items()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  -- Ensure certificate snapshots exist before deleting items
  update public.finder_certificates fc
  set item_title_snapshot = coalesce(fc.item_title_snapshot, i.title)
  from public.items i
  where fc.item_id = i.id and fc.item_title_snapshot is null;

  delete from public.items
  where status in ('returned', 'closed')
    and resolved_at is not null
    and resolved_at < now() - interval '30 days';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Schedule daily cleanup automatically if pg_cron is enabled in Supabase
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'founddex-cleanup-expired-items',
      '0 3 * * *',
      'select public.cleanup_expired_resolved_items();'
    );
  end if;
exception when others then
  -- Ignore if pg_cron is not enabled on the current plan; can be triggered via /api/cron/cleanup
  null;
end $$;

