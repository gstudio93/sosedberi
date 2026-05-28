-- Double-confirmation handover and return acts for bookings.
-- Run this in Supabase SQL Editor before testing the new rental flow.

alter type public.booking_status add value if not exists 'handover_pending';
alter type public.booking_status add value if not exists 'return_pending';
alter type public.booking_status add value if not exists 'dispute';

create table if not exists public.rental_handover_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type text not null check (type in ('handover', 'return')),
  created_by uuid not null references auth.users(id) on delete cascade,
  confirmed_by uuid references auth.users(id) on delete set null,
  photos text[] not null default '{}',
  comment text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'disputed')),
  dispute_comment text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (booking_id, type)
);

create index if not exists rental_handover_reports_booking_id_idx
on public.rental_handover_reports(booking_id);

alter table public.rental_handover_reports enable row level security;

drop policy if exists "Booking participants read handover reports" on public.rental_handover_reports;
create policy "Booking participants read handover reports"
on public.rental_handover_reports
for select
using (
  exists (
    select 1
    from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id
      and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
);

drop policy if exists "Booking participants create handover reports" on public.rental_handover_reports;
create policy "Booking participants create handover reports"
on public.rental_handover_reports
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id
      and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
);

drop policy if exists "Booking participants update handover reports" on public.rental_handover_reports;
create policy "Booking participants update handover reports"
on public.rental_handover_reports
for update
using (
  exists (
    select 1
    from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id
      and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id
      and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
);
