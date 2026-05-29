-- Restrict review creation to completed rentals.
-- Item review: only the renter can review the rented item after completed return.
-- Renter review: only the owner can review the renter after completed return.

drop policy if exists "Users create own reviews" on public.reviews;
drop policy if exists "Renters review completed item bookings" on public.reviews;
drop policy if exists "Owners review completed renters" on public.reviews;

create policy "Renters review completed item bookings"
on public.reviews
for insert
with check (
  author_id = auth.uid()
  and review_type = 'item'
  and booking_id is not null
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.item_id = reviews.item_id
      and b.renter_id = auth.uid()
      and b.status = 'completed'
  )
);

create policy "Owners review completed renters"
on public.reviews
for insert
with check (
  author_id = auth.uid()
  and review_type = 'renter'
  and booking_id is not null
  and exists (
    select 1
    from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id
      and b.item_id = reviews.item_id
      and i.owner_id = auth.uid()
      and b.renter_id = reviews.target_user_id
      and b.status = 'completed'
  )
);
