-- ALFIK in-app possible-match notifications.
-- Safe to rerun. This does not send email.
begin;

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
