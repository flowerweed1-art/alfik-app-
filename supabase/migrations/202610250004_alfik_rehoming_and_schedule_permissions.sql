-- Allow explicit rehoming and let authorised rescue teammates switch shared reminders off.
begin;

do $$
declare
  c record;
  status_type text;
begin
  select udt_name into status_type
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
  elsif status_type like '%enum%' then
    execute 'alter type public.' || quote_ident(status_type) || ' add value if not exists ''rehomed''';
  end if;
end;
$$;

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

commit;
