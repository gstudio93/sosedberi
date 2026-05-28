-- Renter trust rating and typed reviews.
-- Run this in Supabase SQL Editor before testing renter reviews.

alter table public.reviews add column if not exists target_user_id uuid references auth.users(id) on delete cascade;
alter table public.reviews add column if not exists review_type text not null default 'item';

update public.reviews
set review_type = 'item'
where review_type is null;

update public.reviews
set target_user_id = owner_id
where target_user_id is null
  and owner_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_review_type_check'
  ) then
    alter table public.reviews
      add constraint reviews_review_type_check
      check (review_type in ('item', 'renter'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_booking_author_type_unique'
  ) then
    alter table public.reviews
      add constraint reviews_booking_author_type_unique
      unique (booking_id, author_id, review_type);
  end if;
end $$;

create index if not exists reviews_target_user_id_idx
on public.reviews(target_user_id);

create index if not exists reviews_booking_id_review_type_idx
on public.reviews(booking_id, review_type);
