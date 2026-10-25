-- ALFIK animal care profiles, medication, reminders and private in-app notifications.
begin;

alter table public.alfik_pets
  add column if not exists neutering_status text not null default 'unknown'
    check (neutering_status in ('unknown','neutered','not_neutered')),
  add column if not exists neutered_date date;

alter table public.alfik_rescue_animals
  add column if not exists microchip text,
  add column if not exists neutering_status text not null default 'unknown'
    check (neutering_status in ('unknown','neutered','not_neutered')),
  add column if not exists neutered_date date,
  add column if not exists care_reminders_enabled boolean not null default true;

create table if not exists public.alfik_animal_medications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.alfik_pets(id) on delete cascade,
  medication_name text not null check (length(btrim(medication_name)) between 1 and 160),
  dose text,
  frequency text,
  start_date date,
  end_date date,
  instructions text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alfik_care_schedules (
  id uuid primary key default gen_random_uuid(),
  schedule_type text not null check (schedule_type in ('flea','worming','medication')),
  owner_id uuid references auth.users(id) on delete cascade,
  pet_id uuid references public.alfik_pets(id) on delete cascade,
  org_id uuid references public.alfik_organisations(id) on delete cascade,
  rescue_animal_id uuid references public.alfik_rescue_animals(id) on delete cascade,
  treatment_name text,
  interval_days integer check (interval_days between 1 and 730),
  next_due_date date not null,
  enabled boolean not null default true,
  advance_notice_days integer not null default 0 check (advance_notice_days between 0 and 30),
  last_notified_due_date date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alfik_care_schedule_one_target check (
    ((pet_id is not null)::integer + (rescue_animal_id is not null)::integer) = 1
  ),
  constraint alfik_care_schedule_owner_target check (
    (pet_id is not null and owner_id is not null and org_id is null)
    or (rescue_animal_id is not null and org_id is not null and owner_id is null)
  )
);

create index if not exists alfik_care_schedules_due_idx
  on public.alfik_care_schedules (next_due_date) where enabled;
create index if not exists alfik_medications_pet_idx
  on public.alfik_animal_medications (pet_id, active);

create table if not exists public.alfik_in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  related_schedule_id uuid references public.alfik_care_schedules(id) on delete cascade,
  due_date date,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint alfik_notification_dedupe unique (user_id, related_schedule_id, due_date)
);

alter table public.alfik_animal_medications enable row level security;
alter table public.alfik_care_schedules enable row level security;
alter table public.alfik_in_app_notifications enable row level security;

revoke all on public.alfik_animal_medications from anon, authenticated;
revoke all on public.alfik_care_schedules from anon, authenticated;
revoke all on public.alfik_in_app_notifications from anon, authenticated;
grant select, insert, update, delete on public.alfik_animal_medications to authenticated;
grant select, insert, update, delete on public.alfik_care_schedules to authenticated;
grant select, update on public.alfik_in_app_notifications to authenticated;

drop policy if exists "ALFIK owners manage own medication records" on public.alfik_animal_medications;
create policy "ALFIK owners manage own medication records"
on public.alfik_animal_medications for all to authenticated
using (owner_id = auth.uid() and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()))
with check (owner_id = auth.uid() and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()));

drop policy if exists "ALFIK users access their care schedules" on public.alfik_care_schedules;
create policy "ALFIK users access their care schedules"
on public.alfik_care_schedules for all to authenticated
using (
  (pet_id is not null and owner_id = auth.uid()
    and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()))
  or
  (rescue_animal_id is not null and exists (
    select 1 from public.alfik_org_members m
    where m.org_id = alfik_care_schedules.org_id and m.user_id = auth.uid()
  ))
)
with check (
  created_by = auth.uid() and (
    (pet_id is not null and owner_id = auth.uid()
      and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()))
    or
    (rescue_animal_id is not null and exists (
      select 1 from public.alfik_org_members m
      where m.org_id = alfik_care_schedules.org_id and m.user_id = auth.uid()
    ))
  )
);

drop policy if exists "ALFIK users read their notifications" on public.alfik_in_app_notifications;
create policy "ALFIK users read their notifications"
on public.alfik_in_app_notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists "ALFIK users mark their notifications read" on public.alfik_in_app_notifications;
create policy "ALFIK users mark their notifications read"
on public.alfik_in_app_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
