-- Item moderation queue for SosedBeri.
-- Run this in Supabase SQL Editor before deploying code that writes moderation fields.

alter table public.items add column if not exists moderation_status text not null default 'pending';
alter table public.items add column if not exists moderation_comment text;
alter table public.items add column if not exists moderated_at timestamptz;
alter table public.items add column if not exists moderated_by uuid references auth.users(id) on delete set null;

update public.items
set moderation_status = 'pending'
where moderation_status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'items_moderation_status_check'
  ) then
    alter table public.items
      add constraint items_moderation_status_check
      check (moderation_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists items_moderation_status_idx
on public.items(moderation_status);

drop policy if exists "Admins read all items" on public.items;
create policy "Admins read all items"
on public.items
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

drop policy if exists "Admins update all items" on public.items;
create policy "Admins update all items"
on public.items
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
