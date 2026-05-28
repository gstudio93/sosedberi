-- SosedBeri MVP Supabase schema
-- Run in Supabase SQL editor after reviewing project id and auth settings.

create extension if not exists "pgcrypto";

do $$
begin
  begin
    create type public.item_status as enum ('active', 'paused', 'archived');
  exception when duplicate_object then null;
  end;

  begin
    create type public.booking_status as enum ('pending', 'approved', 'rejected', 'handover_pending', 'active', 'return_pending', 'completed', 'cancelled', 'dispute');
  exception when duplicate_object then null;
  end;

  begin
    create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'refunded', 'failed');
  exception when duplicate_object then null;
  end;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  full_name text,
  bio text,
  avatar text,
  phone text,
  location text,
  verified boolean not null default false,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  deposit numeric(12, 2) not null default 0,
  location text,
  city text,
  category text,
  image text,
  images text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  status public.item_status not null default 'active',
  moderation_status text not null default 'pending',
  moderation_comment text,
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null,
  views integer not null default 0,
  owner_avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user1_id uuid not null references auth.users(id) on delete cascade,
  user2_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_distinct_users check (user1_id <> user2_id),
  unique (item_id, user1_id, user2_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid references auth.users(id) on delete cascade,
  text text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  renter_id uuid not null references auth.users(id) on delete cascade,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  total_price numeric(12, 2),
  deposit_amount numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_dates check (end_date >= start_date)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  review_type text not null default 'item' check (review_type in ('item', 'renter')),
  rating integer not null check (rating between 1 and 5),
  text text,
  created_at timestamptz not null default now()
);

create table if not exists public.rental_handover_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type text not null check (type in ('handover', 'return')),
  created_by uuid not null references auth.users(id) on delete cascade,
  confirmed_by uuid references auth.users(id) on delete set null,
  photos text[] not null default '{}',
  comment text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'disputed', 'resolved')),
  dispute_comment text,
  dispute_photos text[] not null default '{}',
  resolution text check (resolution in ('full_refund', 'partial_refund', 'withhold')),
  resolution_comment text,
  deposit_refund_amount numeric(12, 2),
  deposit_withheld_amount numeric(12, 2),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (booking_id, type)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  text text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Existing-project migrations: create table if not exists does not add columns
-- to tables that were already present in Supabase.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists phone_verified boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.items add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.items add column if not exists name text;
alter table public.items add column if not exists description text;
alter table public.items add column if not exists price numeric(12, 2) not null default 0;
alter table public.items add column if not exists deposit numeric(12, 2) not null default 0;
alter table public.items add column if not exists location text;
alter table public.items add column if not exists city text;
alter table public.items add column if not exists category text;
alter table public.items add column if not exists image text;
alter table public.items add column if not exists images text[] not null default '{}';
alter table public.items add column if not exists latitude double precision;
alter table public.items add column if not exists longitude double precision;
alter table public.items add column if not exists status public.item_status not null default 'active';
alter table public.items add column if not exists moderation_status text not null default 'pending';
alter table public.items add column if not exists moderation_comment text;
alter table public.items add column if not exists moderated_at timestamptz;
alter table public.items add column if not exists moderated_by uuid references auth.users(id) on delete set null;
alter table public.items add column if not exists views integer not null default 0;
alter table public.items add column if not exists owner_avatar text;
alter table public.items add column if not exists created_at timestamptz not null default now();
alter table public.items add column if not exists updated_at timestamptz not null default now();

alter table public.favorites add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.favorites add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.favorites add column if not exists created_at timestamptz not null default now();

alter table public.conversations add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.conversations add column if not exists user1_id uuid references auth.users(id) on delete cascade;
alter table public.conversations add column if not exists user2_id uuid references auth.users(id) on delete cascade;
alter table public.conversations add column if not exists created_at timestamptz not null default now();
alter table public.conversations add column if not exists updated_at timestamptz not null default now();

alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references auth.users(id) on delete cascade;
alter table public.messages add column if not exists receiver_id uuid references auth.users(id) on delete cascade;
alter table public.messages add column if not exists text text;
alter table public.messages add column if not exists is_read boolean not null default false;
alter table public.messages add column if not exists created_at timestamptz not null default now();

alter table public.bookings add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.bookings add column if not exists renter_id uuid references auth.users(id) on delete cascade;
alter table public.bookings add column if not exists start_date timestamptz;
alter table public.bookings add column if not exists end_date timestamptz;
alter table public.bookings add column if not exists status public.booking_status not null default 'pending';
alter table public.bookings add column if not exists payment_status public.payment_status not null default 'unpaid';
alter table public.bookings add column if not exists total_price numeric(12, 2);
alter table public.bookings add column if not exists deposit_amount numeric(12, 2);
alter table public.bookings add column if not exists created_at timestamptz not null default now();
alter table public.bookings add column if not exists updated_at timestamptz not null default now();

alter table public.rental_handover_reports add column if not exists booking_id uuid references public.bookings(id) on delete cascade;
alter table public.rental_handover_reports add column if not exists type text;
alter table public.rental_handover_reports add column if not exists created_by uuid references auth.users(id) on delete cascade;
alter table public.rental_handover_reports add column if not exists confirmed_by uuid references auth.users(id) on delete set null;
alter table public.rental_handover_reports add column if not exists photos text[] not null default '{}';
alter table public.rental_handover_reports add column if not exists comment text;
alter table public.rental_handover_reports add column if not exists status text not null default 'pending';
alter table public.rental_handover_reports add column if not exists dispute_comment text;
alter table public.rental_handover_reports add column if not exists dispute_photos text[] not null default '{}';
alter table public.rental_handover_reports add column if not exists resolution text;
alter table public.rental_handover_reports add column if not exists resolution_comment text;
alter table public.rental_handover_reports add column if not exists deposit_refund_amount numeric(12, 2);
alter table public.rental_handover_reports add column if not exists deposit_withheld_amount numeric(12, 2);
alter table public.rental_handover_reports add column if not exists resolved_at timestamptz;
alter table public.rental_handover_reports add column if not exists resolved_by uuid references auth.users(id) on delete set null;
alter table public.rental_handover_reports add column if not exists created_at timestamptz not null default now();
alter table public.rental_handover_reports add column if not exists confirmed_at timestamptz;

alter table public.reviews add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.reviews add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.reviews add column if not exists author_id uuid references auth.users(id) on delete cascade;
alter table public.reviews add column if not exists target_user_id uuid references auth.users(id) on delete cascade;
alter table public.reviews add column if not exists booking_id uuid references public.bookings(id) on delete set null;
alter table public.reviews add column if not exists review_type text not null default 'item';
alter table public.reviews add column if not exists rating integer;
alter table public.reviews add column if not exists text text;
alter table public.reviews add column if not exists created_at timestamptz not null default now();

alter table public.notifications add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists text text;
alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists created_at timestamptz not null default now();
create index if not exists items_owner_id_idx on public.items(owner_id);
create index if not exists items_city_idx on public.items(city);
create index if not exists items_category_idx on public.items(category);
create index if not exists items_status_idx on public.items(status);
create index if not exists items_moderation_status_idx on public.items(moderation_status);
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists conversations_user1_id_idx on public.conversations(user1_id);
create index if not exists conversations_user2_id_idx on public.conversations(user2_id);
create index if not exists messages_conversation_id_created_at_idx on public.messages(conversation_id, created_at);
create index if not exists messages_receiver_id_is_read_idx on public.messages(receiver_id, is_read);
create index if not exists bookings_item_id_dates_idx on public.bookings(item_id, start_date, end_date);
create index if not exists bookings_renter_id_idx on public.bookings(renter_id);
create index if not exists rental_handover_reports_booking_id_idx on public.rental_handover_reports(booking_id);
create index if not exists reviews_target_user_id_idx on public.reviews(target_user_id);
create index if not exists reviews_booking_id_review_type_idx on public.reviews(booking_id, review_type);
create index if not exists notifications_user_id_created_at_idx on public.notifications(user_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.bookings enable row level security;
alter table public.rental_handover_reports enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Active items are public" on public.items for select using (status = 'active' or owner_id = auth.uid());
create policy "Owners insert items" on public.items for insert with check (owner_id = auth.uid());
create policy "Owners update items" on public.items for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete items" on public.items for delete using (owner_id = auth.uid());
create policy "Admins read all items" on public.items for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);
create policy "Admins update all items" on public.items for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

create policy "Users manage own favorites" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Conversation participants can read" on public.conversations for select using (auth.uid() in (user1_id, user2_id));
create policy "Users create own conversations" on public.conversations for insert with check (auth.uid() in (user1_id, user2_id));
create policy "Conversation participants update" on public.conversations for update using (auth.uid() in (user1_id, user2_id));

create policy "Message participants can read" on public.messages for select using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.user1_id, c.user2_id)
  )
);
create policy "Send messages as self" on public.messages for insert with check (sender_id = auth.uid());
create policy "Receivers mark messages read" on public.messages for update using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

create policy "Booking participants can read" on public.bookings for select using (
  renter_id = auth.uid() or exists (
    select 1 from public.items i
    where i.id = item_id and i.owner_id = auth.uid()
  )
);
create policy "Renters create bookings" on public.bookings for insert with check (renter_id = auth.uid());
create policy "Booking participants update" on public.bookings for update using (
  renter_id = auth.uid() or exists (
    select 1 from public.items i
    where i.id = item_id and i.owner_id = auth.uid()
  )
);

create policy "Booking participants read handover reports" on public.rental_handover_reports for select using (
  exists (
    select 1 from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
);
create policy "Booking participants create handover reports" on public.rental_handover_reports for insert with check (
  created_by = auth.uid() and exists (
    select 1 from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
);
create policy "Booking participants update handover reports" on public.rental_handover_reports for update using (
  exists (
    select 1 from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.bookings b
    join public.items i on i.id = b.item_id
    where b.id = booking_id and (b.renter_id = auth.uid() or i.owner_id = auth.uid())
  )
);
create policy "Admins read handover reports" on public.rental_handover_reports for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);
create policy "Admins update handover reports" on public.rental_handover_reports for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

create policy "Reviews are public" on public.reviews for select using (true);
create policy "Users create own reviews" on public.reviews for insert with check (author_id = auth.uid());
create policy "Authors update own reviews" on public.reviews for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete own reviews" on public.reviews for delete using (author_id = auth.uid());

create policy "Users read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "Users create notifications" on public.notifications for insert with check (auth.uid() is not null);
create policy "Users update own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
begin
  begin
    create policy "Avatar files are public" on storage.objects
    for select using (bucket_id = 'avatars');
  exception when duplicate_object then null;
  end;

  begin
    create policy "Users upload own avatar files" on storage.objects
    for insert with check (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    );
  exception when duplicate_object then null;
  end;

  begin
    create policy "Users update own avatar files" on storage.objects
    for update using (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    ) with check (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    );
  exception when duplicate_object then null;
  end;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
