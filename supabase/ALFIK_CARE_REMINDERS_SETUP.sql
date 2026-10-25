begin;

-- ALFIK care reminders setup for Supabase SQL Editor.
-- Run this script once in the ALFIK project's SQL Editor.
-- Creates private medication records, care schedules, in-app care and possible-match notifications, RLS rules and a daily reminder job where pg_cron is available.
-- Combined from migrations 001-005. Transaction markers are consolidated into one transaction.

-- Combined from supabase/migrations/202610250001_alfik_animal_care_reminders.sql
-- ALFIK animal care profiles, medication, reminders and private in-app notifications.

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

-- Combined from supabase/migrations/202610250002_alfik_daily_care_notifications.sql
-- Generate private in-app care reminders once per scheduled due date.

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
    select cs.*
    from public.alfik_care_schedules cs
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
    v_body := coalesce(nullif(s.treatment_name,''), case s.schedule_type when 'flea' then 'Flea treatment' when 'worming' then 'Worming' else 'Medication' end)
      || ' is due today. Follow the product label or your veterinary professional’s instructions.';

    if s.owner_id is not null then
      insert into public.alfik_in_app_notifications(user_id,notification_type,title,body,related_schedule_id,due_date)
      values(s.owner_id,'care_reminder',v_title,v_body,s.id,v_due)
      on conflict (user_id,related_schedule_id,due_date) do nothing;
      if found then v_created := v_created + 1; end if;
    else
      for v_user in
        select m.user_id from public.alfik_org_members m where m.org_id=s.org_id
      loop
        insert into public.alfik_in_app_notifications(user_id,notification_type,title,body,related_schedule_id,due_date)
        values(v_user,'care_reminder',v_title,v_body,s.id,v_due)
        on conflict (user_id,related_schedule_id,due_date) do nothing;
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

do $$
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    if not exists (select 1 from cron.job where jobname='alfik-daily-care-reminders') then
      perform cron.schedule(
        'alfik-daily-care-reminders',
        '0 9 * * *',
        'select public.alfik_process_due_care_reminders();'
      );
    end if;
  end if;
exception when others then
  raise notice 'Care reminder function installed, but daily scheduling was not configured: %', sqlerrm;
end;
$$;

-- Combined from supabase/migrations/202610250003_alfik_rescue_medications_and_plan_gates.sql
-- Rescue medication records and plan-gated care data access.

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

create index if not exists alfik_rescue_meds_animal_idx
  on public.alfik_rescue_animal_medications(rescue_animal_id, active);

alter table public.alfik_rescue_animal_medications enable row level security;
revoke all on public.alfik_rescue_animal_medications from anon, authenticated;
grant select, insert, update, delete on public.alfik_rescue_animal_medications to authenticated;

drop policy if exists "ALFIK rescue members manage animal medications" on public.alfik_rescue_animal_medications;
create policy "ALFIK rescue members manage animal medications"
on public.alfik_rescue_animal_medications for all to authenticated
using (
  public.alfik_my_plan() in ('premium','pro')
  and exists (
    select 1 from public.alfik_org_members m
    where m.org_id=alfik_rescue_animal_medications.org_id and m.user_id=auth.uid()
  )
)
with check (
  public.alfik_my_plan() in ('premium','pro')
  and created_by=auth.uid()
  and exists (
    select 1 from public.alfik_org_members m
    where m.org_id=alfik_rescue_animal_medications.org_id and m.user_id=auth.uid()
  )
);

drop policy if exists "ALFIK owners manage own medication records" on public.alfik_animal_medications;
create policy "ALFIK owners manage own medication records"
on public.alfik_animal_medications for all to authenticated
using (
  public.alfik_my_plan() in ('premium','pro')
  and owner_id = auth.uid()
  and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid())
)
with check (
  public.alfik_my_plan() in ('premium','pro')
  and owner_id = auth.uid()
  and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid())
);

drop policy if exists "ALFIK users access their care schedules" on public.alfik_care_schedules;
create policy "ALFIK users access their care schedules"
on public.alfik_care_schedules for all to authenticated
using (
  public.alfik_my_plan() in ('premium','pro')
  and (
    (pet_id is not null and owner_id = auth.uid()
      and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()))
    or
    (rescue_animal_id is not null and exists (
      select 1 from public.alfik_org_members m
      where m.org_id = alfik_care_schedules.org_id and m.user_id = auth.uid()
    ))
  )
)
with check (
  public.alfik_my_plan() in ('premium','pro')
  and created_by = auth.uid()
  and (
    (pet_id is not null and owner_id = auth.uid()
      and exists (select 1 from public.alfik_pets p where p.id = pet_id and p.owner_id = auth.uid()))
    or
    (rescue_animal_id is not null and exists (
      select 1 from public.alfik_org_members m
      where m.org_id = alfik_care_schedules.org_id and m.user_id = auth.uid()
    ))
  )
);

-- Combined from supabase/migrations/202610250004_alfik_rehoming_and_schedule_permissions.sql
-- Allow explicit rehoming and let authorised rescue teammates switch shared reminders off.

do $$
declare
  c record;
  status_type text;
  status_data_type text;
  status_schema text;
begin
  select udt_name, data_type, udt_schema into status_type, status_data_type, status_schema
  from information_schema.columns
  where table_schema='public' and table_name='alfik_rescue_animals' and column_name='status';

  if status_type = 'text' then
    for c in
      select conname
      from pg_constraint
      where conrelid='public.alfik_rescue_animals'::regclass
        and contype='c'
        and pg_get_constraintdef(oid) ilike '%status%'
    loop
      execute format('alter table public.alfik_rescue_animals drop constraint %I', c.conname);
    end loop;
    alter table public.alfik_rescue_animals
      add constraint alfik_rescue_animals_status_check
      check (status in ('in_care','foster','available','reunited','rehomed','closed'));
  elsif status_data_type = 'USER-DEFINED' then
    execute format('alter type %I.%I add value if not exists %L', status_schema, status_type, 'rehomed');
  end if;
end;
$$;

drop policy if exists "ALFIK rescue members update animal care status" on public.alfik_rescue_animals;
create policy "ALFIK rescue members update animal care status"
on public.alfik_rescue_animals for update to authenticated
using (
  public.alfik_my_plan() in ('premium','pro')
  and exists (
    select 1 from public.alfik_org_members m
    where m.org_id=alfik_rescue_animals.org_id and m.user_id=auth.uid()
  )
)
with check (
  public.alfik_my_plan() in ('premium','pro')
  and exists (
    select 1 from public.alfik_org_members m
    where m.org_id=alfik_rescue_animals.org_id and m.user_id=auth.uid()
  )
);

drop policy if exists "ALFIK users access their care schedules" on public.alfik_care_schedules;

create policy "ALFIK users read their care schedules"
on public.alfik_care_schedules for select to authenticated
using (
  public.alfik_my_plan() in ('premium','pro')
  and (
    (pet_id is not null and owner_id=auth.uid()
      and exists(select 1 from public.alfik_pets p where p.id=pet_id and p.owner_id=auth.uid()))
    or
    (rescue_animal_id is not null and exists(
      select 1 from public.alfik_org_members m
      where m.org_id=alfik_care_schedules.org_id and m.user_id=auth.uid()
    ))
  )
);

create policy "ALFIK users create their care schedules"
on public.alfik_care_schedules for insert to authenticated
with check (
  public.alfik_my_plan() in ('premium','pro')
  and created_by=auth.uid()
  and (
    (pet_id is not null and owner_id=auth.uid()
      and exists(select 1 from public.alfik_pets p where p.id=pet_id and p.owner_id=auth.uid()))
    or
    (rescue_animal_id is not null and exists(
      select 1 from public.alfik_org_members m
      where m.org_id=alfik_care_schedules.org_id and m.user_id=auth.uid()
    ))
  )
);

create policy "ALFIK users update their care schedules"
on public.alfik_care_schedules for update to authenticated
using (
  public.alfik_my_plan() in ('premium','pro')
  and (
    (pet_id is not null and owner_id=auth.uid())
    or
    (rescue_animal_id is not null and exists(
      select 1 from public.alfik_org_members m
      where m.org_id=alfik_care_schedules.org_id and m.user_id=auth.uid()
    ))
  )
)
with check (
  public.alfik_my_plan() in ('premium','pro')
  and (
    (pet_id is not null and owner_id=auth.uid())
    or
    (rescue_animal_id is not null and exists(
      select 1 from public.alfik_org_members m
      where m.org_id=alfik_care_schedules.org_id and m.user_id=auth.uid()
    ))
  )
);

create policy "ALFIK users delete their care schedules"
on public.alfik_care_schedules for delete to authenticated
using (
  public.alfik_my_plan() in ('premium','pro')
  and (
    (pet_id is not null and owner_id=auth.uid())
    or
    (rescue_animal_id is not null and exists(
      select 1 from public.alfik_org_members m
      where m.org_id=alfik_care_schedules.org_id and m.user_id=auth.uid()
    ))
  )
);

-- Combined from supabase/migrations/202610250005_alfik_possible_match_notifications.sql
-- Generate private in-app alerts when a new report may match an existing report.

-- ALFIK in-app possible-match notifications.
-- Safe to rerun. This does not send email.

alter table public.alfik_in_app_notifications
  add column if not exists related_report_id uuid
  references public.animal_reports(id) on delete cascade;

create unique index if not exists alfik_possible_match_notification_once
  on public.alfik_in_app_notifications (user_id, related_report_id)
  where notification_type = 'possible_match' and related_report_id is not null;

create or replace function public.alfik_notify_possible_report_matches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  new_label text;
  old_label text;
  match_location text;
begin
  if new.owner_id is null
     or lower(coalesce(new.report_type::text, '')) not in ('lost','found')
     or lower(coalesce(new.status::text, 'active')) in ('resolved','closed','rehomed','reunited')
     or nullif(btrim(new.location_text), '') is null then
    return new;
  end if;

  new_label := coalesce(nullif(btrim(new.animal_name), ''), 'an animal');
  match_location := btrim(new.location_text);

  for m in
    select r.id, r.owner_id, r.report_type, r.animal_name, r.location_text
    from public.animal_reports r
    where r.id <> new.id
      and r.owner_id is not null
      and r.owner_id <> new.owner_id
      and lower(coalesce(r.report_type::text, '')) in ('lost','found')
      and lower(coalesce(r.report_type::text, '')) <> lower(coalesce(new.report_type::text, ''))
      and lower(coalesce(r.animal_type::text, '')) = lower(coalesce(new.animal_type::text, ''))
      and lower(coalesce(r.status::text, 'active')) not in ('resolved','closed','rehomed','reunited')
      and nullif(btrim(r.location_text), '') is not null
      and (
        lower(btrim(r.location_text)) = lower(btrim(new.location_text))
        or lower(btrim(r.location_text)) like '%' || lower(btrim(new.location_text)) || '%'
        or lower(btrim(new.location_text)) like '%' || lower(btrim(r.location_text)) || '%'
      )
      and (
        r.date_seen is null or new.date_seen is null
        or abs(r.date_seen - new.date_seen) <= 30
      )
  loop
    old_label := coalesce(nullif(btrim(m.animal_name), ''), 'an animal');

    insert into public.alfik_in_app_notifications
      (user_id, notification_type, title, body, related_report_id)
    values
      (m.owner_id, 'possible_match', 'Possible animal match',
       'A new ' || lower(new.report_type::text) || ' report for ' || new_label ||
       ' may match a report you posted near ' || match_location ||
       '. Compare the reports carefully; this is only a suggestion.',
       new.id),
      (new.owner_id, 'possible_match', 'Possible animal match',
       'Your ' || lower(new.report_type::text) || ' report may match a ' ||
       lower(m.report_type::text) || ' report for ' || old_label ||
       ' near ' || coalesce(m.location_text, match_location) ||
       '. Compare the reports carefully; this is only a suggestion.',
       m.id)
    on conflict do nothing;
  end loop;

  return new;
end;
$$;

revoke all on function public.alfik_notify_possible_report_matches() from public, anon, authenticated;

drop trigger if exists alfik_possible_report_match_notifications on public.animal_reports;
create trigger alfik_possible_report_match_notifications
after insert or update of report_type, animal_type, animal_name, location_text, date_seen, status
on public.animal_reports
for each row execute function public.alfik_notify_possible_report_matches();

commit;
