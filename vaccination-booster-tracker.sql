-- ALFIK vaccination and booster tracker
-- Run once in Supabase SQL Editor. Uses the existing in-app notifications inbox.

create table if not exists public.alfik_pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.alfik_pets(id) on delete cascade,
  vaccine_name text not null check (length(trim(vaccine_name)) between 1 and 160),
  date_given date not null,
  next_due_date date,
  vet_name text,
  notes text,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alfik_vaccination_due_after_given check (next_due_date is null or next_due_date >= date_given)
);

create index if not exists alfik_pet_vaccinations_owner_pet_due_idx
  on public.alfik_pet_vaccinations (owner_id, pet_id, next_due_date);

alter table public.alfik_pet_vaccinations enable row level security;
grant select, insert, update, delete on public.alfik_pet_vaccinations to authenticated;

drop policy if exists "Members read own pet vaccinations" on public.alfik_pet_vaccinations;
create policy "Members read own pet vaccinations"
on public.alfik_pet_vaccinations for select to authenticated
using (
  auth.uid() = owner_id
  and exists (
    select 1 from public.alfik_pets p
    where p.id = pet_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Members add own pet vaccinations" on public.alfik_pet_vaccinations;
create policy "Members add own pet vaccinations"
on public.alfik_pet_vaccinations for insert to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.alfik_pets p
    where p.id = pet_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Members update own pet vaccinations" on public.alfik_pet_vaccinations;
create policy "Members update own pet vaccinations"
on public.alfik_pet_vaccinations for update to authenticated
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.alfik_pets p
    where p.id = pet_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Members delete own pet vaccinations" on public.alfik_pet_vaccinations;
create policy "Members delete own pet vaccinations"
on public.alfik_pet_vaccinations for delete to authenticated
using (auth.uid() = owner_id);

create or replace function public.alfik_generate_vaccination_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  made integer := 0;
  alert_title text := 'Vaccination booster reminder';
  alert_body text;
begin
  for v in
    select vaccination.id, vaccination.owner_id, vaccination.vaccine_name,
           vaccination.next_due_date, p.name as pet_name
    from public.alfik_pet_vaccinations vaccination
    join public.alfik_pets p
      on p.id = vaccination.pet_id and p.owner_id = vaccination.owner_id
    where vaccination.reminder_enabled = true
      and vaccination.next_due_date is not null
      and vaccination.next_due_date <= current_date + 30
      and p.life_status is distinct from 'deceased'
  loop
    alert_body := 'Booster due for ' || coalesce(nullif(v.pet_name, ''), 'your pet')
      || ': ' || v.vaccine_name || ' is due on ' || v.next_due_date::text
      || '. Please check with your veterinary practice. Vaccination record: ' || v.id::text || '.';

    insert into public.alfik_in_app_notifications (user_id, title, body, due_date)
    select v.owner_id, alert_title, alert_body, v.next_due_date
    where not exists (
      select 1
      from public.alfik_in_app_notifications n
      where n.user_id = v.owner_id
        and n.title = alert_title
        and n.body = alert_body
    );

    if found then
      made := made + 1;
    end if;
  end loop;

  return made;
end;
$$;

revoke all on function public.alfik_generate_vaccination_reminders() from public, anon, authenticated;

-- If pg_cron is enabled on this Supabase project, run the reminder generator daily.
-- If it is unavailable, the table and tracker still work; the scheduled in-app reminders
-- will need pg_cron (or another scheduler) enabled to run automatically.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'alfik-vaccination-booster-reminders';
    exception when others then
      raise notice 'Could not remove a previous vaccination reminder job; continuing.';
    end;

    begin
      perform cron.schedule(
        'alfik-vaccination-booster-reminders',
        '0 9 * * *',
        'select public.alfik_generate_vaccination_reminders();'
      );
    exception when others then
      raise notice 'Vaccination tracker installed, but daily scheduling was not created. Check pg_cron permissions.';
    end;
  else
    raise notice 'Vaccination tracker installed. pg_cron is not enabled, so automatic daily reminders are not scheduled.';
  end if;
end;
$$;
