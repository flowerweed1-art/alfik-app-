-- ALFIK nearby animal alerts
-- Run this once in Supabase SQL Editor before enabling the app UI.
-- Coordinates are approximate (rounded by the app) and are saved only when a member opts in.

alter table public.animal_reports
  add column if not exists location_lat double precision,
  add column if not exists location_lon double precision;

create table if not exists public.alfik_nearby_alert_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  area_label text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_miles integer not null default 10 check (radius_miles in (5, 10, 20, 30)),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.alfik_nearby_alert_preferences enable row level security;
grant select, insert, update, delete on public.alfik_nearby_alert_preferences to authenticated;

drop policy if exists "Members read own nearby alert preference" on public.alfik_nearby_alert_preferences;
create policy "Members read own nearby alert preference"
on public.alfik_nearby_alert_preferences for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Members insert own nearby alert preference" on public.alfik_nearby_alert_preferences;
create policy "Members insert own nearby alert preference"
on public.alfik_nearby_alert_preferences for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Members update own nearby alert preference" on public.alfik_nearby_alert_preferences;
create policy "Members update own nearby alert preference"
on public.alfik_nearby_alert_preferences for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Members delete own nearby alert preference" on public.alfik_nearby_alert_preferences;
create policy "Members delete own nearby alert preference"
on public.alfik_nearby_alert_preferences for delete to authenticated
using (auth.uid() = user_id);

create or replace function public.alfik_notify_nearby_animal_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preference record;
  miles double precision;
  alert_title text;
  alert_body text;
begin
  if new.status is distinct from 'active'
     or new.report_type not in ('lost','found')
     or new.owner_id is null
     or new.location_lat is null
     or new.location_lon is null then
    return new;
  end if;

  for preference in
    select p.*
    from public.alfik_nearby_alert_preferences p
    where p.enabled = true
      and p.user_id <> new.owner_id
  loop
    miles := 3958.8 * 2 * asin(least(1, sqrt(
      power(sin(radians(new.location_lat - preference.latitude) / 2), 2)
      + cos(radians(preference.latitude)) * cos(radians(new.location_lat))
      * power(sin(radians(new.location_lon - preference.longitude) / 2), 2)
    )));

    if miles <= preference.radius_miles then
      alert_title := 'New animal report near ' || preference.area_label;
      alert_body := 'A new ' || new.report_type || ' ' || coalesce(new.animal_type, 'animal')
        || ' report is approximately ' || round(miles)::text || ' miles from your saved area. '
        || 'Location: ' || coalesce(new.location_text, 'not specified')
        || '. Date: ' || coalesce(new.date_seen::text, 'not specified')
        || '. Open ALFIK and compare the report details. Report ID: ' || new.id::text || '.';

      insert into public.alfik_in_app_notifications (user_id, title, body)
      select preference.user_id, alert_title, alert_body
      where not exists (
        select 1 from public.alfik_in_app_notifications n
        where n.user_id = preference.user_id
          and n.title = alert_title
          and n.body = alert_body
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists alfik_nearby_animal_report_notifications on public.animal_reports;
create trigger alfik_nearby_animal_report_notifications
after insert or update of report_type, animal_type, location_text, date_seen, status, location_lat, location_lon
on public.animal_reports
for each row
execute function public.alfik_notify_nearby_animal_reports();

revoke all on function public.alfik_notify_nearby_animal_reports() from public, anon, authenticated;
