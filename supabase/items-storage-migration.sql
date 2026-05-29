-- Storage for item photos and rental report photos.
-- Run this in Supabase SQL editor if item photo upload fails.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'items',
  'items',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Item photos are public'
  ) then
    create policy "Item photos are public" on storage.objects
    for select using (bucket_id = 'items');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload own item photos'
  ) then
    create policy "Users upload own item photos" on storage.objects
    for insert with check (
      bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users update own item photos'
  ) then
    create policy "Users update own item photos" on storage.objects
    for update using (
      bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1]
    ) with check (
      bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users delete own item photos'
  ) then
    create policy "Users delete own item photos" on storage.objects
    for delete using (
      bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end $$;
