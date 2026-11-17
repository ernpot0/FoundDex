-- =============================================================================
-- FoundDex Phase 6: Recognition, Finder Certificates & Admin Moderation
-- =============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query.
-- =============================================================================

-- 1. Add admin flag to profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Finder Certificates (issued ONLY after dual return confirmation)
create table if not exists public.finder_certificates (
  id uuid primary key default gen_random_uuid(),
  recovery_case_id uuid not null unique references public.recovery_cases (id) on delete cascade,
  finder_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  certificate_code text not null unique,
  points_awarded integer not null default 25 check (points_awarded > 0),
  issued_at timestamptz not null default now()
);

create index if not exists finder_certificates_finder_id_idx
  on public.finder_certificates (finder_id, issued_at desc);

alter table public.finder_certificates enable row level security;

drop policy if exists "Certificates are publicly verifiable" on public.finder_certificates;
create policy "Certificates are publicly verifiable"
  on public.finder_certificates for select
  using (true);

-- 3. Trigger: strictly award points & issue certificate ONLY when dual confirmation completes
create or replace function public.issue_finder_reward_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.recovery_cases%rowtype;
  v_code text;
begin
  if new.completed_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.completed_at is not null then
    return new;
  end if;

  select * into v_case
  from public.recovery_cases
  where id = new.recovery_case_id;

  if not found or v_case.finder_id = v_case.owner_id then
    return new;
  end if;

  v_code := 'FDX-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.finder_certificates (
    recovery_case_id,
    finder_id,
    owner_id,
    item_id,
    certificate_code,
    points_awarded
  )
  values (
    v_case.id,
    v_case.finder_id,
    v_case.owner_id,
    v_case.item_id,
    v_code,
    25
  )
  on conflict (recovery_case_id) do nothing;

  if found then
    update public.recovery_cases
    set status = 'completed'
    where id = v_case.id;

    update public.items
    set status = 'returned'
    where id = v_case.item_id;

    update public.profiles
    set trust_points = trust_points + 25
    where id = v_case.finder_id;

    insert into public.notifications (user_id, type, title, body, link_url)
    values (
      v_case.finder_id,
      'certificate_issued',
      'Finder Certificate & +25 Trust Points Earned!',
      'Thank you for completing a verified return. Your Finder Certificate is ready.',
      '/recovery'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_return_confirmation_completed on public.return_confirmations;
create trigger on_return_confirmation_completed
  after insert or update on public.return_confirmations
  for each row execute function public.issue_finder_reward_on_completion();

-- 4. Moderation Audit Logs (for admin actions)
create table if not exists public.moderation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.moderation_audit_logs enable row level security;

drop policy if exists "Admins can view moderation audit logs" on public.moderation_audit_logs;
create policy "Admins can view moderation audit logs"
  on public.moderation_audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Admins can insert moderation audit logs" on public.moderation_audit_logs;
create policy "Admins can insert moderation audit logs"
  on public.moderation_audit_logs for insert
  to authenticated
  with check (
    auth.uid() = admin_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- 5. Admin RLS policies for reports_and_disputes and items moderation
drop policy if exists "Admins can view all reports and disputes" on public.reports_and_disputes;
create policy "Admins can view all reports and disputes"
  on public.reports_and_disputes for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Admins can update reports and disputes" on public.reports_and_disputes;
create policy "Admins can update reports and disputes"
  on public.reports_and_disputes for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Admins can moderate items" on public.items;
create policy "Admins can moderate items"
  on public.items for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

