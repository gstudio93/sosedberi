-- Rental disputes: photos, admin resolution and deposit decision.
-- Run this in Supabase SQL Editor before testing the admin disputes tab.

alter table public.rental_handover_reports add column if not exists dispute_photos text[] not null default '{}';
alter table public.rental_handover_reports add column if not exists resolution text;
alter table public.rental_handover_reports add column if not exists resolution_comment text;
alter table public.rental_handover_reports add column if not exists deposit_refund_amount numeric(12, 2);
alter table public.rental_handover_reports add column if not exists deposit_withheld_amount numeric(12, 2);
alter table public.rental_handover_reports add column if not exists resolved_at timestamptz;
alter table public.rental_handover_reports add column if not exists resolved_by uuid references auth.users(id) on delete set null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'rental_handover_reports_status_check'
  ) then
    alter table public.rental_handover_reports
      drop constraint rental_handover_reports_status_check;
  end if;

  alter table public.rental_handover_reports
    add constraint rental_handover_reports_status_check
    check (status in ('pending', 'confirmed', 'disputed', 'resolved'));

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_handover_reports_resolution_check'
  ) then
    alter table public.rental_handover_reports
      add constraint rental_handover_reports_resolution_check
      check (resolution is null or resolution in ('full_refund', 'partial_refund', 'withhold'));
  end if;
end $$;

drop policy if exists "Admins read handover reports" on public.rental_handover_reports;
create policy "Admins read handover reports"
on public.rental_handover_reports
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

drop policy if exists "Admins update handover reports" on public.rental_handover_reports;
create policy "Admins update handover reports"
on public.rental_handover_reports
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);
