-- Rescue medication records and plan-gated care data access.
begin;

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

commit;
