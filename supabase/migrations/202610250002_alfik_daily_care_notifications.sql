-- Generate private in-app care reminders once per scheduled due date.
begin;

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

commit;
