-- Adds structured rental condition fields for item cards.
-- Run this in Supabase SQL Editor before deploying code that writes these fields.

alter table public.items add column if not exists equipment text;
alter table public.items add column if not exists handover_terms text;
