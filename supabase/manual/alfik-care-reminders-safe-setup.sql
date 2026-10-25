-- ALFIK safe care reminders setup. Keeps existing lost/found notifications intact.
begin;

-- Extend the EXISTING notifications table without replacing it.
alter table public.alfik_in_app_notifications
  add column if not exists related_schedule_id uuid,
  add column if not exists due_date date;

create index if not exists alfik_notifications_schedule_idx
  on public.alfik_in_app_notifications (user_id, related_schedule_id, due_date)
  where related_schedule_id is not null;

-- Pet and rescue care profile fields.
alter table public.alfik_pets
  add column if not exists neutering_status text not null default 'unknown',
  add column if not exists neutered_date date;

alter table public.alfik_rescue_animals
  add column if not exists microchip text,
  add column if not exists neutering_status text not null default 'unknown',
  add column if not exists neutered_date date,
  add column if not exists care_reminders_enabled boolean not null default true;

-- Personal pet medication records.
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

-- Rescue animal medication records.
create table if not exists public.alfik_rescue_animal_medications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.alfik_organisations(id) on delete cascade,
  rescue_animal_id uuid not null references public.alfik_rescue_animals(id) on delete cascade,
  medication_name text not null check (length(btrim(medication_name)) between 1 and 160),
  dose text,
  frequency text,
  start_date date,
  end_date date,
  instructions text,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Care schedules for flea treatment, worming and medication reminders.
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
create index if not exists alfik_rescue_meds_animal_idx
  on public.alfik_rescue_animal_medications (rescue_animal_id, active);

-- Secure the new tables.
alter table public.alfik_animal_medications enable row level security;
alter table public.alfik_rescue_animal_medications enable row level security;
alter table public.alfik_care_schedules enable row level security;
revoke all on public.alfik_animal_medications from anon, authenticated;
revoke all on public.alfik_rescue_animal_medications from anon, authenticated;
revoke all on public.alfik_care_schedules from anon, authenticated;
grant select, insert, update, delete on public.alfik_animal_medications to authenticated;
grant select, insert, update, delete on public.alfik_rescue_animal_medications to authenticated;
grant select, insert, update, delete on public.alfik_care_schedules to authenticated;

drop policy if exists "ALFIK owners manage own medication records" on public.alfik_animal_medications;
create policy "ALFIK owners manage own medication records"
on public.alfik_animal_medications for all to authenticated
using (owner_id = auth.uid() and exists (
  select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()
))
with check (owner_id = auth.uid() and exists (
  select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()
));

drop policy if exists "ALFIK rescue members manage animal medications" on public.alfik_rescue_animal_medications;
create policy "ALFIK rescue members manage animal medications"
on public.alfik_rescue_animal_medications for all to authenticated
using (exists (
  select 1 from public.alfik_org_members m
  where m.org_id = alfik_rescue_animal_medications.org_id and m.user_id = auth.uid()
))
with check (created_by = auth.uid() and exists (
  select 1 from public.alfik_org_members m
  where m.org_id = alfik_rescue_animal_medications.org_id and m.user_id = auth.uid()
));

drop policy if exists "ALFIK users access their care schedules" on public.alfik_care_schedules;
create policy "ALFIK users access their care schedules"
on public.alfik_care_schedules for all to authenticated
using (
  (pet_id is not null and owner_id = auth.uid() and exists (
    select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()
  ))
  or
  (rescue_animal_id is not null and exists (
    select 1 from public.alfik_org_members m
    where m.org_id = alfik_care_schedules.org_id and m.user_id = auth.uid()
  ))
)
with check (
  created_by = auth.uid() and (
    (pet_id is not null and owner_id = auth.uid() and exists (
      select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()
    ))
    or
    (rescue_animal_id is not null and exists (
      select 1 from public.alfik_org_members m
      where m.org_id = alfik_care_schedules.org_id and m.user_id = auth.uid()
    ))
  )
);

-- Daily reminder function. It creates in-app notifications only; no emails.
create or replace function public.alfik_process_due_care_reminders()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  s record;
  v_user uuid;
  v_due date;
  v_created integer := 0;
  v_title text;
  v_body text;
begin
  for s in
    select cs.* from public.alfik_care_schedules cs
    where cs.enabled = true
      and cs.next_due_date <= current_date
      and (cs.last_notified_due_date is null or cs.last_notified_due_date < cs.next_due_date)
    order by cs.next_due_date
    limit 1000
  loop
    if s.pet_id is not null then
      if not exists (select 1 from public.alfik_pets p where p.id=s.pet_id and p.owner_id=s.owner_id) then
        update public.alfik_care_schedules set enabled=false where id=s.id;
        continue;
      end if;
    else
      if not exists (
        select 1 from public.alfik_rescue_animals a
        where a.id=s.rescue_animal_id and a.org_id=s.org_id
          and a.status not in ('rehomed','reunited','closed')
          and coalesce(a.care_reminders_enabled,true)=true
      ) then
        update public.alfik_care_schedules set enabled=false where id=s.id;
        continue;
      end if;
    end if;

    v_due := s.next_due_date;
    v_title := case s.schedule_type
      when 'flea' then 'Flea treatment due'
      when 'worming' then 'Worming due'
      else 'Medication reminder due'
    end;
    v_body := coalesce(nullif(s.treatment_name,''), case s.schedule_type
      when 'flea' then 'Flea treatment' when 'worming' then 'Worming' else 'Medication' end)
      || ' is due. Follow the product label or your veterinary professional’s instructions.';

    if s.owner_id is not null then
      insert into public.alfik_in_app_notifications
        (user_id,notification_type,title,body,related_schedule_id,due_date)
      values (s.owner_id,'care_reminder',v_title,v_body,s.id,v_due);
      if found then v_created := v_created + 1; end if;
    else
      for v_user in select m.user_id from public.alfik_org_members m where m.org_id=s.org_id
      loop
        insert into public.alfik_in_app_notifications
          (user_id,notification_type,title,body,related_schedule_id,due_date)
        values (v_user,'care_reminder',v_title,v_body,s.id,v_due);
        if found then v_created := v_created + 1; end if;
      end loop;
    end if;

    update public.alfik_care_schedules
      set last_notified_due_date=v_due,
          next_due_date=case when interval_days is null then next_due_date else next_due_date + interval_days end,
          updated_at=now()
      where id=s.id;
  end loop;
  return v_created;
end;
$$;

revoke all on function public.alfik_process_due_care_reminders() from public, anon, authenticated;
grant execute on function public.alfik_process_due_care_reminders() to service_role;

commit;

-- Check whether pg_cron is available before setting up the daily 9am run.
select
  to_regclass('public.alfik_care_schedules') as care_schedules,
  to_regclass('public.alfik_in_app_notifications') as notifications,
  to_regprocedure('public.alfik_process_due_care_reminders()') as reminder_function,
  exists(select 1 from pg_extension where extname='pg_cron') as pg_cron_enabled;
