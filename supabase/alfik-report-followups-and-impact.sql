-- ALFIK report follow-ups and public impact counters
-- Run once in the Supabase SQL Editor.

alter table public.animal_reports
  add column if not exists last_status_confirmed_at timestamptz,
  add column if not exists followup_reminder_3d_sent_at timestamptz,
  add column if not exists followup_reminder_7d_sent_at timestamptz;

create index if not exists animal_reports_active_followup_idx
  on public.animal_reports (status, created_at)
  where status = 'active';

-- Aggregate-only public impact counts. No report details or personal data are exposed.
create or replace function public.alfik_public_impact_counts()
returns table(total_reports bigint, reunited_count bigint, found_safe_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status = 'reunited' and report_type in ('lost','found'))::bigint,
    count(*) filter (where status = 'reunited' and report_type = 'found')::bigint
  from public.animal_reports
  where report_type in ('lost','found');
$$;

revoke all on function public.alfik_public_impact_counts() from public;
grant execute on function public.alfik_public_impact_counts() to anon, authenticated;

-- Daily in-app reminders. If pg_cron is not enabled on this project, enable it in
-- Supabase Database > Extensions and run the scheduling block below again.
create or replace function public.alfik_send_report_followup_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  sent_count integer := 0;
  reminder_title text;
  reminder_body text;
begin
  for r in
    select id, owner_id, report_type, animal_name, created_at,
           last_status_confirmed_at, followup_reminder_3d_sent_at,
           followup_reminder_7d_sent_at
    from public.animal_reports
    where status = 'active'
      and report_type in ('lost','found')
      and owner_id is not null
      and coalesce(last_status_confirmed_at, created_at) <= now() - interval '3 days'
      and (
        (followup_reminder_3d_sent_at is null
          and coalesce(last_status_confirmed_at, created_at) <= now() - interval '3 days')
        or
        (followup_reminder_3d_sent_at is not null
          and followup_reminder_7d_sent_at is null
          and coalesce(last_status_confirmed_at, created_at) <= now() - interval '7 days')
      )
  loop
    if r.followup_reminder_3d_sent_at is null then
      reminder_title := 'Please check your ALFIK report';
      reminder_body := case when r.report_type = 'lost'
        then 'Is ' || coalesce(nullif(r.animal_name,''),'your missing animal') || ' still missing? Open My ALFIK and confirm the status, or mark the report reunited if they are home.'
        else 'Is ' || coalesce(nullif(r.animal_name,''),'the found animal') || ' still safe and awaiting their owner? Open My ALFIK and update the report.'
      end;
      update public.animal_reports set followup_reminder_3d_sent_at = now() where id = r.id;
    else
      reminder_title := 'Second check: update your ALFIK report';
      reminder_body := case when r.report_type = 'lost'
        then 'Please confirm whether ' || coalesce(nullif(r.animal_name,''),'your missing animal') || ' is still missing or has been reunited with you.'
        else 'Please confirm whether ' || coalesce(nullif(r.animal_name,''),'the found animal') || ' is still safe, has been reunited, or has been handed to a rescue.'
      end;
      update public.animal_reports set followup_reminder_7d_sent_at = now() where id = r.id;
    end if;

    insert into public.alfik_in_app_notifications (user_id, title, body)
    values (r.owner_id, reminder_title, reminder_body);
    sent_count := sent_count + 1;
  end loop;
  return sent_count;
end;
$$;

revoke all on function public.alfik_send_report_followup_reminders() from public, anon, authenticated;
grant execute on function public.alfik_send_report_followup_reminders() to service_role;

do $schedule$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'alfik-report-followup-reminders') then
      perform cron.unschedule('alfik-report-followup-reminders');
    end if;
    perform cron.schedule(
      'alfik-report-followup-reminders',
      '15 9 * * *',
      'select public.alfik_send_report_followup_reminders();'
    );
    raise notice 'ALFIK report follow-up reminders scheduled daily at 09:15 database time.';
  else
    raise notice 'pg_cron is not enabled. Enable pg_cron in Supabase Database > Extensions, then rerun the scheduling DO block.';
  end if;
end;
$schedule$;
