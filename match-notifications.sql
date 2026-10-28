-- ALFIK possible-match in-app notifications
-- Run this script in Supabase SQL Editor.
-- Uses the existing public.alfik_in_app_notifications table and keeps alerts in-app.

create or replace function public.alfik_notify_possible_animal_matches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate record;
  new_title text;
  new_body text;
  candidate_title text;
  candidate_body text;
begin
  if new.status is distinct from 'active'
     or new.report_type not in ('lost','found')
     or new.animal_type is null
     or new.location_text is null
     or new.date_seen is null
     or new.owner_id is null then
    return new;
  end if;

  for candidate in
    select r.*
    from public.animal_reports r
    where r.id <> new.id
      and r.status = 'active'
      and r.report_type in ('lost','found')
      and r.report_type <> new.report_type
      and lower(trim(coalesce(r.animal_type,''))) = lower(trim(new.animal_type))
      and r.owner_id is not null
      and r.owner_id <> new.owner_id
      and r.date_seen is not null
      and abs(r.date_seen - new.date_seen) <= 14
      and (
        lower(trim(coalesce(r.location_text,''))) = lower(trim(new.location_text))
        or position(lower(trim(coalesce(r.location_text,''))) in lower(trim(new.location_text))) > 0
        or position(lower(trim(new.location_text)) in lower(trim(coalesce(r.location_text,''))) > 0
        or exists (
          select 1
          from regexp_split_to_table(lower(coalesce(new.description,'')), '[^a-z0-9]+') as w(word)
          where length(w.word) >= 4
            and w.word not in ('with','black','white','brown','found','lost','animal','wearing')
            and position(w.word in lower(coalesce(r.description,''))) > 0
        )
      )
  loop
    new_title := 'Possible animal match';
    new_body := 'A possible ' || new.animal_type || ' match may be worth checking. Report #' ||
      new.id::text || ' (' || new.report_type || ') is near ' ||
      coalesce(new.location_text,'an unspecified location') || ', dated ' ||
      new.date_seen::text || '. Compare the report details and photos carefully.';
    candidate_title := 'Possible animal match';
    candidate_body := 'A possible ' || candidate.animal_type || ' match may be worth checking. Report #' ||
      candidate.id::text || ' (' || candidate.report_type || ') is near ' ||
      coalesce(candidate.location_text,'an unspecified location') || ', dated ' ||
      candidate.date_seen::text || '. Compare the report details and photos carefully.';

    insert into public.alfik_in_app_notifications (user_id, title, body)
    select new.owner_id, new_title, new_body
    where not exists (
      select 1 from public.alfik_in_app_notifications n
      where n.user_id = new.owner_id and n.title = new_title and n.body = new_body
    );

    insert into public.alfik_in_app_notifications (user_id, title, body)
    select candidate.owner_id, candidate_title, candidate_body
    where not exists (
      select 1 from public.alfik_in_app_notifications n
      where n.user_id = candidate.owner_id and n.title = candidate_title and n.body = candidate_body
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists alfik_possible_match_notifications on public.animal_reports;
create trigger alfik_possible_match_notifications
after insert or update of report_type, animal_type, description, location_text, date_seen, status
on public.animal_reports
for each row
execute function public.alfik_notify_possible_animal_matches();

revoke all on function public.alfik_notify_possible_animal_matches() from public, anon, authenticated;
