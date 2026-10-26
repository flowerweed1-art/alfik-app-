-- ALFIK Web Push subscriptions
-- Run this in Supabase SQL Editor for project rrsccsswluacuvymuheo.
-- This creates storage only. It does not send notifications by itself.

create table if not exists public.alfik_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alfik_push_subscriptions enable row level security;

drop policy if exists "Users read their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions;
create policy "Users read their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users add their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions;
create policy "Users add their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions;
create policy "Users update their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions;
create policy "Users delete their own ALFIK push subscriptions"
  on public.alfik_push_subscriptions
  for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists alfik_push_subscriptions_user_id_idx
  on public.alfik_push_subscriptions(user_id);
